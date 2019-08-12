(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const hotAndReadyFuncs = require('./easyCanvasHotAndReady.js');
const helpers = require('./helpers.js');

defaultColors = helpers.defaultColors;
zip = helpers.zip;
defaultVal = helpers.defaultVal;
defaultVals = helpers.defaultVals;
dist = helpers.dist;
getTimeLabel = helpers.getTimeLabel;

    
// d for domain, r for range...
function linearScale(d1,d2, r1, r2){
    function scale(x){
        let z = (x-d1)/(d2-d1)
        return z*(r2-r1) + r1;
    }
    return scale;
}

class EasyCanvas extends HTMLElement {
    static get observedAttributes(){ return ["xmin", "xmax", "ymin", "ymax", "framerate", "padding", "default-axes-on","controls"];}
    
    constructor() {
        // Always call super first in constructor
        super();
        
        // Set up canvas 
        this.shadow = this.attachShadow({mode: 'open'});
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("style","border:1px solid black;width:100%;height:100%;touch-action:none");

        // update this.mouseDown boolean
        this.canvas.addEventListener("mousedown",function(e){this.mouseDown = true;}.bind(this))
        this.canvas.addEventListener("mouseup",function(e){this.mouseDown = false;}.bind(this))
       
        // update mouseX and mouseY locations
        this.canvas.addEventListener("mousemove",function(e){
            // get size of padding in data units.
            let px = Math.abs(this.scaleXInverse(this.padding) - this.scaleXInverse(0));
            let py = Math.abs(this.scaleYInverse(this.padding) - this.scaleYInverse(0));

            // make scales which are slightly different from this.scaleXInverse and this.scaleYInverse
            let sx = linearScale(0,this.canvas.width, this.xmin-px, this.xmax+px)
            let sy = linearScale(0,this.canvas.height, this.ymax+py, this.ymin-py)

            this.mouseX = sx(e.offsetX*this.dpr)
            this.mouseY = sy(e.offsetY*this.dpr)
            
        }.bind(this));

        this.canvas.addEventListener("mouseleave",function(e){
            this.mouseDown = false;
            this.mouseX = undefined;
            this.mouseY = undefined;
        }.bind(this));


        // panningControl and zoomingControl can't be actual methods because they need
        // to be bound to the object for event handling.
        this.panningControl = function(e){
            if(this.mouseDown){
                let dx = this.scaleXInverse(e.movementX)-this.scaleXInverse(0);
                let dy = this.scaleYInverse(e.movementY)-this.scaleYInverse(0);

                dx *= 2;
                dy *= 2;
    
                this.xmin -= dx;
                this.xmax -= dx;
                this.ymin -= dy;
                this.ymax -= dy;
            }
        }.bind(this)
    
        this.zoomingControl = function(e){
            let xdist = this.xmax - this.xmin;
            let ydist = this.ymax - this.ymin;
          
            let sensitivity = 0.001
            let zoomAmount = (e.deltaY*sensitivity);
    
            let px = (this.mouseX - this.xmin) / xdist
            let py = (this.mouseY - this.ymin) / ydist
    
            // make sure the zoom makes sense and there aren't weird numerical issues.
            // also make sure we don't zoom in too far...
            if(isNaN(px) || isNaN(py) || isNaN(zoomAmount) || 
                (zoomAmount<0 && Math.abs(zoomAmount) < 0.000001)){
                return
            }
    
            let aspectRatio = xdist / ydist;
            if(this.mouseX > this.xmin && this.mouseY > this.ymin){
                zoomAmount *= Math.max(xdist,ydist);
                this.xmin -= px*zoomAmount;
                this.xmax += (1-px)*zoomAmount;
                this.ymin -= py*zoomAmount/aspectRatio;
                this.ymax += (1-py)*zoomAmount/aspectRatio;
            }
            else if(this.mouseY < this.ymin){
                zoomAmount *= xdist;
                this.xmin -= px*zoomAmount;
                this.xmax += (1-px)*zoomAmount;
            }
            else if(this.mouseX < this.xmin){
                zoomAmount *= ydist;
                this.ymin -= py*zoomAmount;
                this.ymax += (1-py)*zoomAmount;
            }
    
            e.preventDefault();
        }.bind(this)



        // panning controls
        this.canvas.addEventListener("mousemove",this.panningControl);

        // zooming controls
        this.canvas.addEventListener("wheel",this.zoomingControl);



        this.shadow.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
        
        // Constantly adjust DPI with possibly changing screen size
        this.DPIHasBeenSet = false;
        this.dpiInterval = setInterval(this.fixDPI.bind(this), 200);
        setTimeout(this.fixDPI.bind(this), 20);
        
        // config
        this.framerate = 24;
        this.padding = 120;
        this.xmin = -100;
        this.xmax = 100;
        
        this.ymin = -100;
        this.ymax = 100;

        this.dpr = 2.0;
        
        this.defaultAxesOn = true;
        this.mouseDown = false; // left mouse button is not clicked in when the webpage loads...
        
        // Constantly be redrawing the plot:
        // this.plotInterval = setInterval(this.renderPlot.bind(this), 1000/this.framerate);
        this.updateScales();
        this.renderPlot();
        setInterval(function(){
            if(new Date() - this.lastFrame > 1000 || this.lastFrame === undefined){
                this.renderPlot();
            }
        }.bind(this),200);

        // bind all methods from easyCanvasHotAndReady
        this.hotAndReady = {}
        for(let key of Object.keys(hotAndReadyFuncs)){
            this.hotAndReady[key] = hotAndReadyFuncs[key].bind(this);
        }
    }


    attributeChangedCallback(name, oldValue, newValue) {
        if(this.debug)
            console.log(`custom element attribute "${name}" has changed from "${oldValue}" to "${newValue}"`);
        
        // simple numeric
        if(["xmin", "xmax", "ymin", "ymax", "padding", "framerate"].includes(name)){
            this[name] = +newValue;
            this.updateScales();
        }
        
        // simple boolean
        else if(["default-axes-on"].includes(name)){
            this.defaultAxesOn = (newValue == "true");
        }

        else if(name === "controls"){
            this.canvas.removeEventListener("mousemove",this.panningControl);
            this.canvas.removeEventListener("wheel",this.zoomingControl);

            if(newValue.toLowerCase() === "true"){

            }
        }
    }

    updateScales(){
        this.scaleX = linearScale(this.xmin, this.xmax, this.padding, this.canvas.width-this.padding);
        this.scaleY = linearScale(this.ymin, this.ymax, this.canvas.height-this.padding, this.padding);
        this.scaleXInverse = linearScale(this.padding, this.canvas.width-this.padding, this.xmin, this.xmax);
        this.scaleYInverse = linearScale(this.canvas.height-this.padding, this.padding, this.ymin, this.ymax);
    }


    fixDPI() {
        //the + prefix casts it to an integer
        //the slice method gets rid of "px"
        let s = getComputedStyle(this.canvas)
        let style_height = +s.getPropertyValue("height").slice(0, -2);
        let style_width = +s.getPropertyValue("width").slice(0, -2);

        //scale the canvas
        let heightDiff = Math.abs(this.canvas.height - style_height*this.dpr)
        let widthDiff = Math.abs(this.canvas.width - style_width*this.dpr)
        if(Math.max(heightDiff, widthDiff) > 10){
            this.canvas.height = style_height*this.dpr;
            this.canvas.width = style_width*this.dpr;
            this.DPIHasBeenSet = true;
        }
    }


    linkInfo(keys, link){
        this.linkedKeys = keys;
        this.link = link;
    }

    renderPlot(){
        // will be false if this.lastFrame is undefined
        let ready = (new Date() - this.lastFrame > 1000/this.framerate)
        ready = (ready || this.lastFrame === undefined)

        
        if(this.DPIHasBeenSet && ready){
            // linked axes and other info maybe...
            if(this.link !== undefined){
                for(let key of this.linkedKeys){
                    if(this.link[key] !== undefined && this.mouseX === undefined){
                        this.setAttribute(key,this.link[key]);
                    }
                }
            }
            
            this.updateScales();
            this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
            if(this.defaultAxesOn){
                this.drawDefaultAxes();
            }
            if(this.drawingLoop){
                this.drawingLoop();
            }

            // linked axes and other info maybe...
            if(this.link !== undefined){
                for(let key of this.linkedKeys){
                    if(this.mouseX !== undefined){
                        this.link[key] = this[key];
                    }
                }
            }

            this.lastFrame = new Date();
        }


        requestAnimationFrame(this.renderPlot.bind(this));
    }


    drawLabel(text, x, y, theta, font=undefined){
        this.ctx.save();
        if(font == undefined){
            this.ctx.font = "20pt arial"
        }
        else{
            this.ctx.font = font;
        }
        this.ctx.translate(x,y);
        this.ctx.rotate(-theta);
        this.ctx.fillText(text,0,0);
        this.ctx.restore();
    }


    drawAxis(settings){
        let {x1,y1,x2,y2} = settings
        let {labelXOffset,labelYOffset,labelTheta,nTicks} = settings
        let {labels,scaleStart,scaleEnd} = settings
        let {isDatetime} = settings
    
        let r = Math.sqrt(Math.pow(y2-y1,2) + Math.pow(x2-x1,2));
        let theta = Math.asin((y2-y1)/r);

        this.ctx.save();
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(parseInt(this.scaleX(x1)), parseInt(this.scaleY(y1)));
        this.ctx.lineTo(parseInt(this.scaleX(x2)), parseInt(this.scaleY(y2)));
        this.ctx.stroke();
        for(let i=1; i<=nTicks; i++){
            let x = this.scaleX(x1 + (x2-x1)*(i/nTicks));
            let y = this.scaleY(y1 + (y2-y1)*(i/nTicks));

            this.ctx.beginPath();
            this.ctx.moveTo(x-10*Math.cos(theta-Math.PI/2), y+10*Math.sin(theta-Math.PI/2));
            this.ctx.lineTo(x+10*Math.cos(theta-Math.PI/2), y-10*Math.sin(theta-Math.PI/2));
            this.ctx.stroke();

            // labelXOffset and labelYOffset are in user coordinates (not canvas coordinates)
            let labelX = this.scaleX(this.scaleXInverse(x)+labelXOffset);
            let labelY = this.scaleY(this.scaleYInverse(y)+labelYOffset);
            if(labels){
                this.drawLabel(labels[i-1],labelX, labelY, labelTheta);
            }
            else if(!isNaN(scaleStart) && !isNaN(scaleEnd)){
                let label;
                if(isDatetime){
                    label = helpers.getTimeLabel(i,nTicks,scaleStart,scaleEnd);
                }
                else{
                    label = scaleStart + (scaleEnd-scaleStart)*(i/nTicks);
                    label = label.toFixed(2);
                }
                this.drawLabel(label,labelX, labelY, labelTheta);
            }
            else{
                console.error("drawAxis method of EasyCanvas object must be called with 'labels' or both 'scaleStart' and 'scaleEnd'");
            }
        }
        this.ctx.restore();
    }



    drawDefaultAxes(settings){
        settings = defaultVal(settings,{});
        let [xTicks,yTicks] = defaultVals(settings,["xTicks","yTicks"],[10,5]);
        let [xAxisIsTime,yAxisIsTime] = defaultVals(settings,["xAxisIsTime","yAxisIsTime"],[false,false]);

        // x-axis
        let labelXOffset = this.scaleXInverse(-20)-this.scaleXInverse(0);
        let labelYOffset = this.scaleYInverse(60)-this.scaleYInverse(0);
        this.drawAxis({x1:this.xmin,
                        y1: this.ymin,
                        x2:this.xmax,
                        y2:this.ymin, 
                        labelXOffset:labelXOffset,
                        labelYOffset:labelYOffset,
                        labelTheta: Math.PI/8,
                        nTicks: xTicks,
                        labels: undefined,
                        scaleStart: this.xmin,
                        scaleEnd: this.xmax,
                        isDatetime: xAxisIsTime
                    })
    
        // y-axis
        labelXOffset = this.scaleXInverse(-40)-this.scaleXInverse(0);
        labelYOffset = this.scaleYInverse(30)-this.scaleYInverse(0);
        this.drawAxis({x1:this.xmin,
                        y1: this.ymin,
                        x2:this.xmin,
                        y2:this.ymax, 
                        labelXOffset:labelXOffset,
                        labelYOffset:labelYOffset,
                        labelTheta: Math.PI/3,
                        nTicks: yTicks,
                        labels: undefined,
                        scaleStart: this.ymin,
                        scaleEnd: this.ymax,
                        isDatetime: yAxisIsTime
                    })
    }

    drawLine(data,lineWidth=2){
        let xs = data.xs.map(x => this.scaleX(x));
        let ys = data.ys.map(y => this.scaleY(y));

        let oldLineWidth = this.ctx.lineWidth;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(xs[0],ys[0]);
        for(let i=1; i<xs.length; i++){
            this.ctx.lineTo(xs[i],ys[i]);
        }
        this.ctx.stroke();
        this.ctx.lineWidth = oldLineWidth;
    }

    // in custom coordinates, not canvas coordinates
    mouseInCircle(cx,cy,r){
        if(this.mouseX === undefined || this.mouseY === undefined){
            return undefined;
        }
        let dist = (x1,y1,x2,y2) => Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2))
        return (dist(this.mouseX,this.mouseY,cx,cy) < r)
    }

    // opposite corners of a rectangle.
    mouseInRect(x1,y1,x2,y2){
        if(this.mouseX === undefined || this.mouseY === undefined){
            return undefined;
        }

        // helper function to tell if x is between a and b.
        function between(x,a,b){
            return (a <= x && x <= b) || (b <= x && x <= a);
        }
        return (between(this.mouseX,x1,x2) && between(this.mouseY,y1,y2))
    }    


    // standard canvas stuff wrapped or reimplemented!!
    arc(cx, cy, r, sAngle, eAngle, counterclockwise=false){
        let delta = 0.05;

        if(!counterclockwise){
            let tmp = sAngle;
            sAngle = eAngle;
            eAngle = tmp + 2*Math.PI;
        }

        let x = this.scaleX(cx + Math.cos(sAngle)*r);
        let y = this.scaleY(cy + Math.sin(sAngle)*r);
        this.ctx.moveTo(x,y);
        for(let angle=sAngle; angle<eAngle-delta; angle += delta){
                let x = this.scaleX(cx + Math.cos(angle)*r);
                let y = this.scaleY(cy + Math.sin(angle)*r);
                this.ctx.lineTo(x,y);
        }
    }

    rect(x,y,w,h){
        x = this.scaleX(x);
        y = this.scaleY(y);
        w = this.scaleX(w) - this.scaleX(0);
        h = this.scaleY(h) - this.scaleY(0);
        this.ctx.moveTo(x,y);
        this.ctx.lineTo(x,y+h);
        this.ctx.lineTo(x+w,y+h);
        this.ctx.lineTo(x+w,y);
        this.ctx.lineTo(x,y);
    }
}

customElements.define('easy-canvas', EasyCanvas);

var link = document.createElement('link');
link.setAttribute('rel', 'stylesheet');
link.setAttribute('type', 'text/css');
link.setAttribute('href', 'https://fonts.googleapis.com/css?family=Lato:100,200,300,400,500,600');
document.head.appendChild(link);
},{"./easyCanvasHotAndReady.js":2,"./helpers.js":3}],2:[function(require,module,exports){
/* this file contains functions for making very common plots using easyCanvas */
/* they will be made accessable via EasyCanvas.hotAndReady */

// helpers:
const helpers = require('./helpers.js')
defaultColors = helpers.defaultColors;
zip = helpers.zip;
defaultVal = helpers.defaultVal;
defaultVals = helpers.defaultVals;
dist = helpers.dist;
getTimeLabel = helpers.getTimeLabel;


// tools
function drawTooltip(x,y,info){
    let padding = 20;
    let lineHeight = 20;
    let letterWidth = 12;

    let keys = Object.keys(info);
    let values = Object.values(info);
    let labels = zip(keys,values).map(pair => [`${pair[0]}: `,`${pair[1]}`])

    x = this.scaleX(x);
    y = this.scaleY(y);

    // find height and width
    let h = labels.length * lineHeight;
    h += padding * (labels.length+1);
    let w = Math.max(...labels.map(pair => pair[0].length + pair[1].length))*letterWidth + 2*padding;

    // move tooltip up and left if necessary.
    if(x+w > this.canvas.width){
       x = this.canvas.width - w; 
    }
    if(y+h > this.canvas.height){
        y = this.canvas.height - h;
    }

    // Draw Rectangle 
    let oldFillStyle = this.ctx.fillStyle;
    this.ctx.fillStyle="rgba(255,255,255,0.75)";
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.fillStyle=oldFillStyle;

    // draw text for individual labels
    for(let [i, label] of labels.entries()){
        let x1 = x + padding;
        let y1 = y + padding*(i+1) + lineHeight*(i+1);
        this.drawLabel(label[0], x1, y1,0,"bold 18pt arial");
        
        x1 += (letterWidth*label[0].length);
        this.drawLabel(label[1],x1,y1,0,"18pt arial");
    }
}

function drawLegend(labels, settings){
    let padding = 20;
    let lineHeight = 20;
    let letterWidth = 12;
    let patchSize = 20;

    // Rectangle 
    let h = labels.length * lineHeight;
    h += padding * (labels.length+1);
    let w = Math.max(...labels.map(v => v.text.length))*letterWidth + 3*padding + patchSize;

    let x = this.canvas.width - padding - w;
    let y = padding;

    this.ctx.fillStyle="rgba(255,255,255,0.7)";
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.fillStyle="black";

    // Individual labels
    for(let [i, label] of labels.entries()){
        // draw patch
        this.ctx.fillStyle=label.color;
        let x1 = x + padding;
        let y1 = y + padding*(i+1) + lineHeight*i;
        this.ctx.beginPath();
        this.ctx.rect(x1, y1, patchSize, patchSize);
        this.ctx.stroke();
        this.ctx.fill();
        this.ctx.fillStyle="black";

        // draw text
        x1 += (patchSize + padding);
        y1 += lineHeight;
        this.drawLabel(label.text, x1, y1,0,"300 20pt Lato");
    }
}

function drawLegendAxesLabelsAndTitle(settings){
    let title = defaultVal(settings.title, "Untitled");
    let xLabel = defaultVal(settings.xLabel, "x");
    let yLabel = defaultVal(settings.yLabel, "y");
    let legendLabels = defaultVal(settings.legendLabels, ["y"]);
    let colors = defaultVal(settings.colors, defaultColors);

    // draw legend
    legendLabels = legendLabels.map((field,i) => {
        return {text: field, color: colors[i%colors.length]};
    })
    legendLabels = legendLabels.filter(x => x.text != "")
    drawLegend.bind(this)(legendLabels);

    // draw title
    this.ctx.save();
    this.ctx.textAlign = "center";

    let titleX = this.canvas.width/2;
    let titleY = 60;
    this.drawLabel(title, titleX,titleY, 0, "300 45pt Lato");

    // draw x-axis label
    let xLabelX = this.canvas.width/2;
    let xLabelY = this.canvas.height-20;
    this.drawLabel(xLabel, xLabelX, xLabelY, 0, "500 24pt Lato");

    // draw y-axis label
    let yLabelX = 40;
    let yLabelY = this.canvas.height/2;
    this.drawLabel(yLabel, yLabelX, yLabelY,Math.PI/2, "500 24pt Lato");

    this.ctx.restore();
}



function rescaleAxes(xmin,xmax,ymin,ymax){
        let ga = this.getAttribute.bind(this);
        let sa = this.setAttribute.bind(this);
        if(this.xmin != xmin || this.xmax != xmax || this.ymin != ymin || this.ymax != ymax){
                sa("xmin",xmin);sa("xmax",xmax);sa("ymin",ymin);sa("ymax",ymax);
        }
}



function linePlotTooltip(data, inputs, outputs, tooltips, epsilon=100){
    // make sure inputs has exactly one unique element.
    if(new Set(inputs).size != 1){
        console.log("in order to have tooltips on a line plot, all inputs must be the same.");
        return false;
    } 

    let xs = data[inputs[0]];
    
    // get closest point to mouse.
    let mx = this.mouseX;
    let my = this.mouseY;
    // binary search over x
    let low = 0;
    let high = xs.length-1;
    let guess = Math.round((high+low)/2);
    while(high - low > 1){
        if(xs[guess] > mx){
            high = guess;
        }
        else{
            low = guess;
        }
        guess = Math.round((high+low)/2);
    }

    let index = low;
    if(Math.abs(xs[high] - mx) < Math.abs(xs[low] - mx)){
        index = high;
    }


    // find closest y-coordinate
    let output = undefined;
    let smallestDist = Infinity;
    for(let out of outputs){
        let d = dist(xs[index],data[out][index],mx,my)
        if(d < smallestDist){
            output = out;
            smallestDist = d;
        }
    }


    // ensure it is within epsilon of mouse in canvas (c) coordinates.
    let cPointX = this.scaleX(xs[index]);
    let cPointY = this.scaleY(data[output][index]);
    let cMouseX = this.scaleX(mx);
    let cMouseY = this.scaleY(my);
    if(dist(cPointX,cPointY,cMouseX, cMouseY) > epsilon){
        return false;
    }

    // draw tooltip info at that point.
    let x = xs[index];
    let y = data[output][index];
    let info = {};
    for(let tooltip of tooltips){
        let text = String(data[tooltip][index]);
        if(isNaN(text)){
            info[tooltip] = text.slice(0,8) + "...";
        }
        else{
            info[tooltip] = parseFloat(text).toFixed(3);
        }
    }
    drawTooltip.bind(this)(x,y,info);
}



// Actual exported functions
function linePlot(data, settings){
    let inputs = defaultVal(settings.inputs, ["xs"]);
    let outputs = defaultVal(settings.outputs, ["ys"]);
    let autoScale = defaultVal(settings.autoScale, true);
    let colors = defaultVal(settings.colors, defaultColors);
    let lineWidth = defaultVal(settings.lineWidth, 2);
    let tooltips = defaultVal(settings.tooltips, []);
    let xTicks = defaultVal(settings.xTicks, 10);
    let yTicks = defaultVal(settings.yTicks, 5);
    let xAxisIsTime = defaultVal(settings.xAxisIsTime, false);
    let yAxisIsTime = defaultVal(settings.yAxisIsTime, false);
    
    let zipped = zip(inputs,outputs);
    
    // draw lines and find extend of data.
    let xmin = ymin = Infinity;
    let xmax = ymax = -Infinity;
    for(let [i,[x,y]] of zipped.entries()){
        this.ctx.strokeStyle = colors[i%colors.length];
        line = {xs: data[x], ys: data[y]};
        this.drawLine(line, lineWidth);

        // find extent of data
        xmin = Math.min(Math.min(...data[x]),xmin);
        xmax = Math.max(Math.max(...data[x]),xmax);
        ymin = Math.min(Math.min(...data[y]),ymin);
        ymax = Math.max(Math.max(...data[y]),ymax);
    }
    this.ctx.strokeStyle="black";

    // rescale canvas if desired
    // find a better way...
    if(autoScale && !this.alreadyAutoScaledLinePlot){
        xmin = defaultVal(settings.xmin, xmin);
        xmax = defaultVal(settings.xmax, xmax);
        ymin = defaultVal(settings.ymin, ymin);
        ymax = defaultVal(settings.ymax, ymax);
        this.alreadyAutoScaledLinePlot = true;
        rescaleAxes.bind(this)(xmin,xmax,ymin,ymax);
    }

    this.setAttribute("default-axes-on","false");
    this.drawDefaultAxes({
        xTicks: xTicks,
        yTicks: yTicks,
        xAxisIsTime: xAxisIsTime,
        yAxisIsTime: yAxisIsTime
    });



    // legend, plot title, and axes labels.
    drawLegendAxesLabelsAndTitle.bind(this)(settings);


    // draw tooltips
    if(tooltips.length != 0 && this.mouseX !== undefined){
        linePlotTooltip.bind(this)(data, inputs,outputs,tooltips);
    }
}




function barPlot(data, settings){
    let autoScale = defaultVal(settings.autoScale,true)
    let colors = defaultVal(settings.colors, defaultColors);

    if(autoScale){
        rescaleAxes.bind(this)(0,1,0,Math.max(...data.heights))
    }

    // y-axis
    let labelXOffset = this.scaleXInverse(-50) - this.scaleXInverse(0)
    let labelYOffset = this.scaleYInverse(40) - this.scaleYInverse(0)
    this.drawAxis({x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: this.ymax, 
                    labelXOffset: labelXOffset,
                    labelYOffset: labelYOffset,
                    labelTheta: Math.PI/3,
                    nTicks: 5,
                    labels: undefined,
                    scaleStart: 0,
                    scaleEnd: this.ymax})


    // x-axis
    labelXOffset = this.scaleXInverse(-45) - this.scaleXInverse(0)
    labelYOffset = this.scaleYInverse(65) - this.scaleYInverse(0)

    this.drawAxis({x1: 0,
                    y1: 0,
                    x2: this.xmax,
                    y2: 0, 
                    labelXOffset: labelXOffset,
                    labelYOffset: labelYOffset,
                    labelTheta: Math.PI/10,
                    nTicks: data.bars.length+1,
                    labels: data.bars.concat("")})


    for(let i=0; i<data.heights.length; i++){
        let w = 1/(data.heights.length+2);
        let pos = ((i+1)/(data.heights.length+1)) - (w/2);
        this.ctx.beginPath();
        this.ctx.fillStyle = colors[i%colors.length];
        this.rect(pos,0,w,data.heights[i]);
        if(this.mouseInRect(pos,0,pos+w,0+data.heights[i])){
            this.ctx.lineWidth=3;
            this.ctx.stroke();
        }
        this.ctx.fill();
    }
    this.ctx.lineWidth=1;
    this.ctx.fillStyle = "black";
    
    this.setAttribute("default-axes-on","false");
    this.setAttribute("controls","false");
    drawLegendAxesLabelsAndTitle.bind(this)(settings);
}



function histogram(data){
    this.setAttribute("default-axes-on","false");

}

module.exports = {
    "linePlot": linePlot,
    "barPlot": barPlot,
    "histogram": histogram,
    "drawTooltip": drawTooltip
}

// module.exports = [
//     ["linePlot",linePlot],
//     ["barPlot", barPlot],
//     ["histogram", barPlot]
// ];
},{"./helpers.js":3}],3:[function(require,module,exports){
let defaultColors = ["red", "green","orange", "blue", "purple", "yellow"];

function zip(xs,ys){
    return xs.map((v,i)=>[v,ys[i]])
}

function defaultVal(original,def){
    if(original === undefined){
        return def;
    }
    return original;
}

function defaultVals(obj,keys,defs){
    return keys.map((k,i) => defaultVal(obj[k],defs[i]));
}

function dist(x1,y1,x2,y2){
    return Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2));
}

function getTimeLabel(i,nTicks, scaleStart, scaleEnd){
    let start = new Date(scaleStart);
    let now = new Date(scaleStart + (scaleEnd-scaleStart)*(i/nTicks));
    let end = new Date(scaleEnd);

    let label = now.getFullYear();

    let secondLength = 1000;
    let minuteLength = secondLength*60;
    let hourLength = minuteLength*60;
    let dayLength = hourLength*24;
    let monthLength = dayLength*30;
    let yearLength = dayLength*365;

    // years
    if(end - start > yearLength){
        label = `${now.getFullYear()}`;
    }

    // months
    else if(end - start > monthLength){
        label = `${now.getMonth()}/${now.getFullYear()}`;
    }

    // days
    else if(end - start > dayLength){
        label = `${now.getMonth()}/${now.getDate()}`;
    }

    // hours
    else if(end - start > hourLength){
        label = `${now.getHours()}h`;
    }

    // minutes
    else if(end - start > minuteLength){
        label = `${now.getMinutes()}m`;
    }

    // seconds
    else if(end - start > secondLength){
        label = `${now.getSeconds()}s`;
    }

    // milliseconds
    else{
        label = `${now.getMilliseconds()}ms`;
    }

    return label;
}



module.exports = {
    "defaultColors": defaultColors,
    "zip":zip,
    "defaultVal": defaultVal,
    "defaultVals": defaultVals,
    "dist": dist,
    "getTimeLabel": getTimeLabel
}



},{}]},{},[1]);
