////////////////////////////////////////////////////////////////////////////////
//Airbrush Project                                                            //
////////////////////////////////////////////////////////////////////////////////

// holds functions that initialize the various controls below the image
var controls = Object.create(null);
// associates the names of the tools with the function that should be called
// when they are selected and the canvas is clicked
var tools = Object.create(null);
var paintFlowRate = 0.5;  // stores the paint flow rate

// creates an element with the given name and attributes and appends all
// further arguments it gets as child nodes
function elt(name, attributes) {
  var node = document.createElement(name);
  if (attributes) {
    for (var attr in attributes)
      if (attributes.hasOwnProperty(attr))
        node.setAttribute(attr, attributes[attr]);
  }
  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i];
    if (typeof child == "string")
      child = document.createTextNode(child);
    node.appendChild(child);
  }
  return node;
}

// appends the paint interface to the DOM element it is given as an argument
function createPaint(parent) {
  var canvas = elt("canvas", {width: 640, height: 480});
  var cx = canvas.getContext("2d");
  var toolbar = elt("div", {class: "toolbar"});
  for (var name in controls)
    toolbar.appendChild(controls[name](cx));

  var panel = elt("div", {class: "picturepanel"}, canvas);
  parent.appendChild(elt("div", null, panel, toolbar));
}

// populates the tool field with <option> elements for all tools that have been
// defined, and a "mousedown" handler takes care of calling the function for
// the current tool
controls.tool = function(cx) {
  var select = elt("select");
  for (var name in tools)
    select.appendChild(elt("option", null, name));

  cx.canvas.addEventListener("mousedown", function(event) {
    if (event.which == 1) {
      tools[select.value](event, cx);
      event.preventDefault();
    }
  });

  return elt("span", null, "Tool: ", select);
};

// finds the canvas-relative coordinates
function relativePos(event, element) {
  var rect = element.getBoundingClientRect();
  return {x: Math.floor(event.clientX - rect.left),
          y: Math.floor(event.clientY - rect.top)};
}

// registers and unregisters events for drawing tools
function trackDrag(onMove, onEnd) {
  function end(event) {
    removeEventListener("mousemove", onMove);
    removeEventListener("mouseup", end);
    if (onEnd)
      onEnd(event);
  }
  addEventListener("mousemove", onMove);
  addEventListener("mouseup", end);
}

// color picker -- updates fillStyle and strokeStyle with the selected color
controls.color = function(cx) {
  var input = elt("input", {type: "color"});
  input.addEventListener("change", function() {
    cx.fillStyle = input.value;
    cx.strokeStyle = input.value;
  });
  return elt("span", null, "Color: ", input);
};

// brush size selector -- updates lineWidth with the selected size
controls.brushSize = function(cx) {
  var select = elt("select");
  var sizes = [1, 2, 3, 5, 8, 12, 25, 35, 50, 75, 100];
  sizes.forEach(function(size) {
    select.appendChild(elt("option", {value: size},
                           size + " pixels"));
  });
  select.selectedIndex = 3;
  cx.lineWidth = 5;
  select.addEventListener("change", function() {
    cx.lineWidth = select.value;
  });
  return elt("span", null, "Brush size: ", select);
};


// paint flow rate selector
controls.paintFlow = function(cx) {
  var select = elt("select");
  var sizes = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  sizes.forEach(function(size) {
    select.appendChild(elt("option", {value: size},
                           size + ""));
  });
  select.selectedIndex = 5;
  select.addEventListener("change", function() {
    paintFlowRate = select.value;
  });
  return elt("span", null, "Paint flow: ", select);
};

// save link -- generates a data url
controls.save = function(cx) {
  var link = elt("a", {href: "/"}, "Save");
  function update() {
    try {
      link.href = cx.canvas.toDataURL();
    } catch (e) {
      if (e instanceof SecurityError)
        link.href = "javascript:alert(" +
          JSON.stringify("Can't save: " + e.toString()) + ")";
      else
        throw e;
    }
  }
  link.addEventListener("mouseover", update);
  link.addEventListener("focus", update);
  return link;
};

// tries to load an image file from a URL
function loadImageURL(cx, url) {
  var image = document.createElement("img");
  image.addEventListener("load", function() {
    var color = cx.fillStyle, size = cx.lineWidth;
    cx.canvas.width = image.width;
    cx.canvas.height = image.height;
    cx.drawImage(image, 0, 0);
    cx.fillStyle = color;
    cx.strokeStyle = color;
    cx.lineWidth = size;
  });
  image.src = url;
}

// file chooser to load a local file
controls.openFile = function(cx) {
  var input = elt("input", {type: "file"});
  input.addEventListener("change", function() {
    if (input.files.length == 0) return;
    var reader = new FileReader();
    reader.addEventListener("load", function() {
      loadImageURL(cx, reader.result);
    });
    reader.readAsDataURL(input.files[0]);
  });
  return elt("div", null, "Open file: ", input);
};

// text field form for loading a file from a URL
controls.openURL = function(cx) {
  var input = elt("input", {type: "text"});
  var form = elt("form", null,
                 "Open URL: ", input,
                 elt("button", {type: "submit"}, "load"));
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    loadImageURL(cx, input.value);
  });
  return form;
};

// appends the paint interface to the DOM element it is given as an argument
function createPaint(parent) {
    var canvas = elt("canvas", {width: 640, height: 480});
    var cx = canvas.getContext("2d");
    cx.fillStyle = 'black';
    cx.fillRect(0,0,canvas.width, canvas.height);
    var toolbar = elt("div", {class: "toolbar"});
    for (var name in controls)
      toolbar.appendChild(controls[name](cx));
  
    var panel = elt("div", {class: "picturepanel"}, canvas);
    parent.appendChild(elt("div", null, panel, toolbar));
  }

// constant brush -- places an equal amount of paint at each pixel within the
// airbrush's radius
tools.Constant = function(event, cx) {
    var radius = cx.lineWidth/2;
    var r = parseInt(cx.fillStyle.substring(1,3), 16);
    var g = parseInt(cx.fillStyle.substring(3,5), 16);
    var b = parseInt(cx.fillStyle.substring(5), 16);
    trackDrag(function(event) {
        var currentPos = relativePos(event, cx.canvas);
        const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
        const data = imageData.data;

        var d,dx = 0; dy = 0;

        var size = 2 * radius;
        const mask = [];
        var index = 0;
        for(var i = 0; i < size; i++){
          for(var j = 0; j < size; j++){
    
            dx = Math.abs(radius - (index % size));
            dy = Math.abs (radius - (index/size) );
            d = Math.sqrt(dx * dx + dy * dy)
            mask[index]=1;
            if(d > radius){
              mask[index] = 0;
            }
            index++;
          }
        }

        for (var i = 0; i < data.length; i += 4) {
            if(mask[i/4]===0){

            }else{
            data[i]     = r ; // red
            data[i + 1] = g ; // green
            data[i + 2] = b ; // blue
            data[i + 3] = 255; // alpha
            }
            
        }
        cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);
    });
};

//Adds a linearly decaying brush
tools.Linear = function(event, cx) {
var radius = cx.lineWidth/2;
var r = parseInt(cx.fillStyle.substring(1,3), 16);
var g = parseInt(cx.fillStyle.substring(3,5), 16);
var b = parseInt(cx.fillStyle.substring(5), 16);

//on first click
var clickpos = relativePos( event, cx.canvas);

    const imageData = cx.getImageData(clickpos.x - radius, clickpos.y - radius, 2*radius, 2*radius);
    const data = imageData.data;
    
    var d,dx = 0; dy = 0;

    var size = 2 * radius;
    const mask = [];
    var index = 0;
    for(var i = 0; i < size; i++){
      for(var j = 0; j < size; j++){

        dx = Math.abs(radius - (index % size));
        dy = Math.abs (radius - (index/size) );
        d = Math.sqrt(dx * dx + dy * dy);

        if(d>radius){
          mask[index]=-1;
        }else{
          mask[index] = (1-d/radius);
        }
        index++;
      }
    }
    // i in 1D = width * y + x 
    // i, x = i % width, y = i/width


    for (var i = 0; i < data.length; i += 4) {
      if(mask[i/4]===-1){} else {
      data[i]     = r * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i]; // red
      data[i + 1] = g * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 1]; // green
      data[i + 2] = b * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 2]; // blue
      data[i + 3] = 255; // alpha
      }
    }
    cx.putImageData(imageData, clickpos.x - radius, clickpos.y - radius);


trackDrag(function(event) {
    var currentPos = relativePos( event, cx.canvas);

    //temptative scan line code
    var Dx = (currentPos.x + radius) - (currentPos.x - radius); 
    var Dy = (currentPos.y + radius) - (clickpos.y - radius);
    var D =  Dy - (Dx/2);
 
    var x_coordinate = currentPos.x - radius;
    var y_coordinate = currentPos.y - radius;
     

    while(x_coordinate < currentPos.x){
      x_coordinate++;

      if (D < 0){
        D = D + Dy;
      }else{
        D = D + (Dy - Dx);
        y_coordinate++;
      }
    

     const imageData = cx.getImageData(x_coordinate - radius, y_coordinate - radius, 2*radius, 2*radius);
    const data = imageData.data;
    
    //creating the mask array
    var d,dx = 0; dy = 0;
    var size = 2 * radius;
    const mask = [];
    var index = 0;
    for(var i = 0; i < size; i++){
      for(var j = 0; j < size; j++){

        dx = Math.abs(radius - (index % size));
        dy = Math.abs (radius - (index/size) );
        d = Math.sqrt(dx * dx + dy * dy);

        if(d>radius){
          mask[index]=-1;
        }else{
          mask[index] = (1-d/radius);
        }
        index++;
      }
    }
    // i in 1D = width * y + x 
    // i, x = i % width, y = i/width


    for (var i = 0; i < data.length; i += 4) {
      if(mask[i/4]===-1){} else {
      data[i]     = r * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i]; // red
      data[i + 1] = g * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 1]; // green
      data[i + 2] = b * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 2]; // blue
      data[i + 3] = 255; // alpha
      }
    }
    cx.putImageData(imageData, x_coordinate - radius, y_coordinate - radius);

    }

    

});
}

//Adds a quadratic decaying brush
tools.Quadratic = function(event, cx) {
var radius = cx.lineWidth/2;
var r = parseInt(cx.fillStyle.substring(1,3), 16);
var g = parseInt(cx.fillStyle.substring(3,5), 16);
var b = parseInt(cx.fillStyle.substring(5), 16);

var currentPos = relativePos(event, cx.canvas);
const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
const data = imageData.data;

var d,dx = 0; dy = 0;

var size = 2 * radius;
const mask = [];
var index = 0;
for(var i = 0; i < size; i++){
  for(var j = 0; j < size; j++){

    dx = Math.abs(radius - (index % size));
    dy = Math.abs (radius - (index/size) );
    d = Math.sqrt(dx * dx + dy * dy);

    if(d>radius){
      mask[index]=-1;
    }else{
      mask[index] = (1-d/radius * d/radius);
    }
    index++;
  }
}
// i in 1D = width * y + x 
// i, x = i % width, y = i/width


for (var i = 0; i < data.length; i += 4) {
  if(mask[i/4]===-1){} else {
  data[i]     = r * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i]; // red
  data[i + 1] = g * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 1]; // green
  data[i + 2] = b * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 2]; // blue
  data[i + 3] = 255; // alpha
  }
}
cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);

trackDrag(function(event) {
    var currentPos = relativePos(event, cx.canvas);
    const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
    const data = imageData.data;
    
    var d,dx = 0; dy = 0;

    var size = 2 * radius;
    const mask = [];
    var index = 0;
    for(var i = 0; i < size; i++){
      for(var j = 0; j < size; j++){

        dx = Math.abs(radius - (index % size));
        dy = Math.abs (radius - (index/size) );
        d = Math.sqrt(dx * dx + dy * dy);

        if(d>radius){
          mask[index]=-1;
        }else{
          mask[index] = (1-d/radius * d/radius);
        }
        index++;
      }
    }
    // i in 1D = width * y + x 
    // i, x = i % width, y = i/width


    for (var i = 0; i < data.length; i += 4) {
      if(mask[i/4]===-1){} else {
      data[i]     = r * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i]; // red
      data[i + 1] = g * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 1]; // green
      data[i + 2] = b * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 2]; // blue
      data[i + 3] = 255; // alpha
      }
    }
    cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);
});
};

//Adds a decaying brush following the normal curve
tools.Gaussian = function(event, cx){
  var radius = cx.lineWidth/2;
var r = parseInt(cx.fillStyle.substring(1,3), 16);
var g = parseInt(cx.fillStyle.substring(3,5), 16);
var b = parseInt(cx.fillStyle.substring(5), 16);

var currentPos = relativePos(event, cx.canvas);
    const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
    const data = imageData.data;
    
    var d,dx = 0; dy = 0;

    var size = 2 * radius;
    const mask = [];
    var index = 0;
    for(var i = 0; i < size; i++){
      for(var j = 0; j < size; j++){

        dx = Math.abs(radius - (index % size));
        dy = Math.abs (radius - (index/size) );
        d = Math.sqrt(dx * dx + dy * dy);

        if(d>radius){
          mask[index]=-1;
        }else{
          mask[index] = Math.E ** (-1 * (2 * d/radius) *  (2 * d/radius)); //representing gaussian as e^(-2d/r)
        }
        index++;
      }
    }
    // i in 1D = width * y + x 
    // i, x = i % width, y = i/width


    for (var i = 0; i < data.length; i += 4) {
      if(mask[i/4]===-1){} else {
      data[i]     = r * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i]; // red
      data[i + 1] = g * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 1]; // green
      data[i + 2] = b * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 2]; // blue
      data[i + 3] = 255; // alpha
      }
    }
    cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);

trackDrag(function(event) {
    var currentPos = relativePos(event, cx.canvas);
    const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
    const data = imageData.data;
    
    var d,dx = 0; dy = 0;

    var size = 2 * radius;
    const mask = [];
    var index = 0;
    for(var i = 0; i < size; i++){
      for(var j = 0; j < size; j++){

        dx = Math.abs(radius - (index % size));
        dy = Math.abs (radius - (index/size) );
        d = Math.sqrt(dx * dx + dy * dy);

        if(d>radius){
          mask[index]=-1;
        }else{
          mask[index] = Math.E ** (-1 * (2 * d/radius) *  (2 * d/radius)); //representing gaussian as e^(-2d/r)
        }
        index++;
      }
    }
    // i in 1D = width * y + x 
    // i, x = i % width, y = i/width


    for (var i = 0; i < data.length; i += 4) {
      if(mask[i/4]===-1){} else {
      data[i]     = r * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i]; // red
      data[i + 1] = g * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 1]; // green
      data[i + 2] = b * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 2]; // blue
      data[i + 3] = 255; // alpha
      }
    }
    cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);
});
}

//Brush is in ripples
tools.Ripple = function(event, cx){
  var radius = cx.lineWidth/2;
  var r = parseInt(cx.fillStyle.substring(1,3), 16);
  var g = parseInt(cx.fillStyle.substring(3,5), 16);
  var b = parseInt(cx.fillStyle.substring(5), 16);

  var currentPos = relativePos(event, cx.canvas);
  const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
  const data = imageData.data;
  
  var d,dx = 0; dy = 0;

  var size = 2 * radius;
  const mask = [];
  var index = 0;
  for(var i = 0; i < size; i++){
    for(var j = 0; j < size; j++){

      dx = Math.abs(radius - (index % size));
      dy = Math.abs (radius - (index/size) );
      d = Math.sqrt(dx * dx + dy * dy);

      if(d>radius){
        mask[index]=-1;
      }else{
        mask[index] =Math.cos(d); //making nice curcular ripples in the polar plane
      }
      index++;
    }
  }
  // i in 1D = width * y + x 
  // i, x = i % width, y = i/width


  for (var i = 0; i < data.length; i += 4) {
    if(mask[i/4]===-1){} else {
    data[i]     = r * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i]; // red
    data[i + 1] = g * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 1]; // green
    data[i + 2] = b * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 2]; // blue
    data[i + 3] = 255; // alpha
    }
  }
  cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);

  trackDrag(function(event) {
      var currentPos = relativePos(event, cx.canvas);
      const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
      const data = imageData.data;
      
      var d,dx = 0; dy = 0;
  
      var size = 2 * radius;
      const mask = [];
      var index = 0;
      for(var i = 0; i < size; i++){
        for(var j = 0; j < size; j++){
  
          dx = Math.abs(radius - (index % size));
          dy = Math.abs (radius - (index/size) );
          d = Math.sqrt(dx * dx + dy * dy);
  
          if(d>radius){
            mask[index]=-1;
          }else{
            mask[index] =Math.cos(d); //making nice curcular ripples in the polar plane
          }
          index++;
        }
      }
      // i in 1D = width * y + x 
      // i, x = i % width, y = i/width
  
  
      for (var i = 0; i < data.length; i += 4) {
        if(mask[i/4]===-1){} else {
        data[i]     = r * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i]; // red
        data[i + 1] = g * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 1]; // green
        data[i + 2] = b * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i + 2]; // blue
        data[i + 3] = 255; // alpha
        }
      }
      cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);
    });
}

//Modifies the brush color, tending towards purple
tools.TrippyBrush = function(event, cx){
  var radius = cx.lineWidth/2;
  var r = parseInt(cx.fillStyle.substring(1,3), 16);
  var g = parseInt(cx.fillStyle.substring(3,5), 16);
  var b = parseInt(cx.fillStyle.substring(5), 16);

  var currentPos = relativePos(event, cx.canvas);
  const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
  const data = imageData.data;
  
  var d,dx = 0; dy = 0;

  var size = 2 * radius;
  const mask = [];
  var index = 0;
  for(var i = 0; i < size; i++){
    for(var j = 0; j < size; j++){

      dx = Math.abs(radius - (index % size));
      dy = Math.abs (radius - (index/size) );
      d = Math.sqrt(dx * dx + dy * dy);

      if(d>radius){
        mask[index]=-1;
      }else{
        //tan gives us a good spacing of lines, and composition of multiple tans give 
        //multiple "spikes" with a hole in the middle like a black hole
        mask[index] =Math.tan(Math.tan(Math.tan(Math.tan(Math.tan(Math.tan(d/radius)))))); 
      }
      index++;
    }
  }
  // i in 1D = width * y + x 
  // i, x = i % width, y = i/width


  for (var i = 0; i < data.length; i += 4) {
    if(mask[i/4]===-1){} else {
      //blended in with different colors of the position
    data[i]     = r * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i +2]; // 
    data[i + 1] = g * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) ; // green
    data[i + 2] = b * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i]; // blue
    data[i + 3] = 255; // alpha
    }
  }
  cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);

  trackDrag(function(event) {
      var currentPos = relativePos(event, cx.canvas);
      const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
      const data = imageData.data;
      
      var d,dx = 0; dy = 0;
  
      var size = 2 * radius;
      const mask = [];
      var index = 0;
      for(var i = 0; i < size; i++){
        for(var j = 0; j < size; j++){
  
          dx = Math.abs(radius - (index % size));
          dy = Math.abs (radius - (index/size) );
          d = Math.sqrt(dx * dx + dy * dy);
  
          if(d>radius){
            mask[index]=-1;
          }else{
            //tan gives us a good spacing of lines, and composition of multiple tans give 
            //multiple "spikes" with a hole in the middle like a black hole
            mask[index] =Math.tan(Math.tan(Math.tan(Math.tan(Math.tan(Math.tan(d/radius)))))); 
          }
          index++;
        }
      }
      // i in 1D = width * y + x 
      // i, x = i % width, y = i/width
  
  
      for (var i = 0; i < data.length; i += 4) {
        if(mask[i/4]===-1){} else {
              //blended in with different colors of the position
        data[i]     = r * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i +2]; // red
        data[i + 1] = g * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) ; // green
        data[i + 2] = b * mask[i/4] * paintFlowRate + (1 - mask[i/4] * paintFlowRate) * data[i]; // blue
        data[i + 3] = 255; // alpha
        }
      }
      cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);
    });
}
