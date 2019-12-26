const hotAndReadyFuncs = require('./easyCanvasHotAndReady.js');
const helpers = require('./helpers.js');

let {defaultColors, zip, defaultVal, defaultVals, dist, getTimeLabel} = helpers;

    
// d for domain, r for range...
function linearScale(d1, d2, r1, r2){
    function scale(x){
        let z = (x-d1)/(d2-d1)
        return z*(r2-r1) + r1;
    }
    return scale;
}

class EasyCanvas extends HTMLElement {
    static get observedAttributes(){ return ["xmin", "xmax", "ymin", "ymax", "framerate", "paddingX", "paddingY", "default-axes-on","controls"];}
    
    constructor() {
        // Always call super first in constructor
        super();
        
        // Set up canvas 
        this.shadow = this.attachShadow({mode: 'open'});
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("style","border:1px solid black;width:100%;height:100%;");

        // update this.mouseDown boolean
        this.canvas.addEventListener("mousedown",function(e){this.mouseDown = true;}.bind(this))
        this.canvas.addEventListener("mouseup",function(e){this.mouseDown = false;}.bind(this))
       
        // update mouseX and mouseY locations
        this.canvas.addEventListener("mousemove",function(e){
            // get size of padding in data units.
            let padXPixels = (this.paddingX/100)*this.canvas.width;
            let padYPixels = (this.paddingY/100)*this.canvas.height;
            let px = Math.abs(this.scaleXInverse(padXPixels) - this.scaleXInverse(0));
            let py = Math.abs(this.scaleYInverse(padYPixels) - this.scaleYInverse(0));

            // make scales which are slightly different from this.scaleXInverse and this.scaleYInverse
            let sx = linearScale(0, this.canvas.width, this.xmin-px, this.xmax+px)
            let sy = linearScale(0, this.canvas.height, this.ymax+py, this.ymin-py)

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
                this.renderPlot();
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
            this.renderPlot();
        }.bind(this)



        // panning controls
        this.canvas.addEventListener("mousemove",this.panningControl);

        // zooming controls
        this.canvas.addEventListener("wheel",this.zoomingControl);



        this.shadow.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
        
        // Constantly adjust DPI with possibly changing screen size
        this.DPIHasBeenSet = false;
        this.dpiInterval = setInterval(this.fixDPI.bind(this), 500);
        window.addEventListener("load", this.fixDPI.bind(this));
        
        // config
        this.framerate = 30;
        this.paddingX = 10;
        this.paddingY = 16;

        this.xmin = -100;
        this.xmax = 100;        
        this.ymin = -100;
        this.ymax = 100;

        this.dpr = 2.0; // device pixel ratio.
        
        this.defaultAxesOn = true;
        this.mouseDown = false; // left mouse button is not clicked in when the webpage loads...
        
        this.updateScales();

        // bind all methods from easyCanvasHotAndReady
        this.hotAndReady = {}
        for(let key of Object.keys(hotAndReadyFuncs)){
            this.hotAndReady[key] = hotAndReadyFuncs[key].bind(this);
        }
        this.hotAndReadyEventListeners = {};


        // Constantly be redrawing the plot at this.framerate
        this.renderPlotLoop();

    }


    attributeChangedCallback(name, oldValue, newValue) {
        if(this.debug)
            console.log(`custom element attribute "${name}" has changed from "${oldValue}" to "${newValue}"`);
        
        // simple numeric
        if(["xmin", "xmax", "ymin", "ymax", "paddingX", "paddingY", "framerate"].includes(name)){
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
                this.canvas.addEventListener("mousemove",this.panningControl);
                this.canvas.addEventListener("wheel",this.zoomingControl);
            }
        }
    }

    updateScales(){
        let w = this.canvas.width;
        let h = this.canvas.height;
        let padXPixels = (this.paddingX/100)*w;
        let padYPixels = (this.paddingY/100)*h;

        this.scaleX = linearScale(this.xmin, this.xmax, padXPixels, w - padXPixels);
        this.scaleY = linearScale(this.ymin, this.ymax, h - padYPixels, padYPixels);
        this.scaleXInverse = linearScale(padXPixels, w - padXPixels, this.xmin, this.xmax);
        this.scaleYInverse = linearScale(h - padYPixels, padYPixels, this.ymin, this.ymax);
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

        this.fontSizeScalar = (this.canvas.width+this.canvas.height) / 1500;

        this.renderPlot();
    }


    linkInfo(keys, link){
        this.linkedKeys = keys;
        this.link = link;
    }


    renderPlotLoop(){
        // will be true if this.lastFrame is undefined
        let ready = (new Date() - this.lastFrame > 1000/this.framerate)
        ready = (ready || this.lastFrame === undefined)

        try {
            if(ready){
                this.renderPlot();
            }
        }
        finally {
            requestAnimationFrame(this.renderPlotLoop.bind(this));
        }
    }

    renderPlot(){
        // linked axes and other info maybe...
        if(this.DPIHasBeenSet){
            if(this.link !== undefined){
                for(let key of this.linkedKeys){
                    if(this.link[key] !== undefined && this.mouseX === undefined){
                        this.setAttribute(key,this.link[key]);
                    }
                }
            }
            
            this.updateScales();
            this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
            this.ctx.beginPath(); // clears any old path they may have made.
            
            if(this.drawingLoop){
                this.drawingLoop();
            }
            this.drawLabel({text:`${this.canvas.width} x ${this.canvas.height}`, x:0, y:30});


            // this needs to be below the drawing loop because 
            // your drawing loop may disable the default axes. (hotAndReady does)
            if(this.defaultAxesOn){
                this.drawDefaultAxes();
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
    }


    drawLabel(settings){
        settings["theta"] = defaultVal(settings["theta"], 0);
        settings["font"] = defaultVal(settings["font"], "20px Lato");
        settings["textAlign"] = defaultVal(settings["textAlign"], "left");
        settings["textBaseline"] = defaultVal(settings["textBaseline"], "alphabetic")

        this.ctx.save();

        this.ctx.textBaseline = settings.textBaseline;
        this.ctx.textAlign = settings.textAlign;
        this.ctx.font = settings.font;
        this.ctx.translate(settings.x, settings.y);
        this.ctx.rotate(-settings.theta);
        this.ctx.fillText(settings.text,0,0);

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
            let labelSettings = {
                x: labelX, 
                y: labelY, 
                theta: labelTheta, 
                textAlign: "center",
                font: `${this.fontSizeScalar*20}px Lato`
            };
            if(labels){
                labelSettings.text = labels[i-1];
                this.drawLabel(labelSettings);
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
                labelSettings.text = label;
                this.drawLabel(labelSettings);
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
        let labelYOffset = this.scaleYInverse(30*this.fontSizeScalar)-this.scaleYInverse(0);
        this.drawAxis({
            x1:this.xmin,
            y1: this.ymin,
            x2:this.xmax,
            y2:this.ymin, 
            labelXOffset:0,
            labelYOffset:labelYOffset,
            labelTheta: Math.PI/8,
            nTicks: xTicks,
            labels: undefined,
            scaleStart: this.xmin,
            scaleEnd: this.xmax,
            isDatetime: xAxisIsTime
        })
    
        // y-axis
        let labelXOffset = this.scaleXInverse(-20*this.fontSizeScalar)-this.scaleXInverse(0);
        this.drawAxis({
            x1:this.xmin,
            y1: this.ymin,
            x2:this.xmin,
            y2:this.ymax, 
            labelXOffset:labelXOffset,
            labelYOffset:0,
            labelTheta: Math.PI/3,
            nTicks: yTicks,
            labels: undefined,
            scaleStart: this.ymin,
            scaleEnd: this.ymax,
            isDatetime: yAxisIsTime
        })
    }

    drawLine(data, lineWidth=2){
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
    mouseInCircle(cx, cy, r){
        if(this.mouseX === undefined || this.mouseY === undefined){
            return undefined;
        }
        let dist = (x1,y1,x2,y2) => Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2))
        return (dist(this.mouseX,this.mouseY,cx,cy) < r)
    }

    // opposite corners of a rectangle.
    mouseInRect(x1, y1, x2, y2){
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

    rect(x, y, w, h){
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


// hack to dynamically load css for easy-canvas...
var link = document.createElement('link');
link.setAttribute('rel', 'stylesheet');
link.setAttribute('type', 'text/css');
link.setAttribute('href', 'https://fonts.googleapis.com/css?family=Lato:100,200,300,400,500,600');
document.head.appendChild(link);