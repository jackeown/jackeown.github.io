var hotAndReadyFuncs = require('./easyCanvasHotAndReady.js');

    
// d for domain, r for range...
function linearScale(d1,d2, r1, r2){
    function scale(x){
        let z = (x-d1)/(d2-d1)
        return z*(r2-r1) + r1;
    }
    return scale;
}

class EasyCanvas extends HTMLElement {
    static observedAttributes = ["xmin", "xmax", "ymin", "ymax", "framerate", "padding", "default-axes-on"];
    
    constructor() {
        // Always call super first in constructor
        super();
        
        // Set up canvas 
        this.shadow = this.attachShadow({mode: 'open'});
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("style","border:1px solid black;width:100%;height:100%;");

        this.canvas.addEventListener("mousedown",function(e){this.mouseDown = true;}.bind(this))
        this.canvas.addEventListener("mouseup",function(e){this.mouseDown = false;}.bind(this))
        this.canvas.addEventListener("mousemove",function(e){
            // get size of padding in data units.
            let px = Math.abs(this.scaleXInverse(this.padding) - this.scaleXInverse(0));
            let py = Math.abs(this.scaleYInverse(this.padding) - this.scaleYInverse(0));

            // make scales which are slightly different from this.scaleXInverse and this.scaleYInverse
            let sx = linearScale(0,this.canvas.width, this.xmin-px, this.xmax+px)
            let sy = linearScale(0,this.canvas.height, this.ymax+py, this.ymin-py)

            this.mouseX = sx(e.offsetX*window.devicePixelRatio)
            this.mouseY = sy(e.offsetY*window.devicePixelRatio)

            if(this.mouseDown){
                let dx = this.scaleXInverse(e.movementX)-this.scaleXInverse(0);
                let dy = this.scaleYInverse(e.movementY)-this.scaleYInverse(0);

                this.xmin -= dx;
                this.xmax -= dx;
                this.ymin -= dy;
                this.ymax -= dy;
            }

        }.bind(this));

        this.shadow.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
        
        // Constantly adjust DPI with possibly changing screen size
        this.DPIHasBeenSet = false;
        this.dpiInterval = setInterval(this.fixDPI.bind(this), 200);
        setTimeout(this.fixDPI.bind(this), 20);
        
        // config
        this.framerate = 24;
        this.padding = 70;
        this.xmin = -100;
        this.xmax = 100;
        
        this.ymin = -100;
        this.ymax = 100;
        
        this.defaultAxesOn = true;
        this.mouseDown = false; // left mouse button is not clicked in when the webpage loads...
        
        // Constantly be redrawing the plot:
        // this.plotInterval = setInterval(this.renderPlot.bind(this), 1000/this.framerate);
        setTimeout(this.renderPlot.bind(this), 100);

        // bind all methods from easyCanvasHotAndReady
        this.hotAndReady = {}
        for(let key of Object.keys(hotAndReadyFuncs)){
            this.hotAndReady[key] = hotAndReadyFuncs[key].bind(this);
        }
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        console.log(`custom element attribute "${name}" has changed from "${oldValue}" to "${newValue}"`);
        
        if(["xmin", "xmax", "ymin", "ymax", "padding", "framerate"].includes(name)){
            this[name] = +newValue;
        }
        
        else if(name === "default-axes-on"){
            this.defaultAxesOn = (newValue == "true");
        }
    }


    fixDPI() {
        //the + prefix casts it to an integer
        //the slice method gets rid of "px"
        let s = getComputedStyle(this.canvas)
        let style_height = +s.getPropertyValue("height").slice(0, -2);
        let style_width = +s.getPropertyValue("width").slice(0, -2);

        //scale the canvas
        if(this.canvas.height != style_height*window.devicePixelRatio ||
            this.canvas.width  != style_width*window.devicePixelRatio ){

            this.canvas.height = style_height * window.devicePixelRatio;
            this.canvas.width = style_width * window.devicePixelRatio;
            this.DPIHasBeenSet = true;
        }
    }


    renderPlot(){
        setTimeout(function(){
            requestAnimationFrame(this.renderPlot.bind(this))
        }.bind(this),1000/this.framerate);

        this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
        if(this.DPIHasBeenSet){
            this.scaleX = linearScale(this.xmin, this.xmax, this.padding, this.canvas.width-this.padding);
            this.scaleY = linearScale(this.ymin, this.ymax, this.canvas.height-this.padding, this.padding);
            this.scaleXInverse = linearScale(this.padding, this.canvas.width-this.padding, this.xmin, this.xmax);
            this.scaleYInverse = linearScale(this.canvas.height-this.padding, this.padding, this.ymin, this.ymax);

            if(this.defaultAxesOn){
                this.drawDefaultAxes();
            }

            if(this.drawingLoop){
                this.drawingLoop();
            }
        }
    }


    drawLabel(text, x, y, theta, font=undefined){
        let oldFont = this.ctx.font;
        if(font == undefined){
            this.ctx.font = "11pt arial"
        }
        else{
            this.ctx.font = font;
        }
        this.ctx.translate(x,y);
        this.ctx.rotate(-theta);
        this.ctx.fillText(text,0,0);
        this.ctx.rotate(theta);
        this.ctx.translate(-x,-y);
        this.ctx.font = oldFont;
    }


    drawAxis(x1,y1, x2,y2, labelXOffset, labelYOffset, labelTheta, nTicks, 
                labels=undefined, scaleStart=undefined, scaleEnd=undefined){
        let r = Math.sqrt(Math.pow(y2-y1,2) + Math.pow(x2-x1,2));
        let theta = Math.asin((y2-y1)/r);

        this.ctx.beginPath();
        this.ctx.moveTo(this.scaleX(x1), this.scaleY(y1));
        this.ctx.lineTo(this.scaleX(x2), this.scaleY(y2));
        this.ctx.stroke();
        for(let i=1; i<=nTicks; i++){
            let x = this.scaleX(x1 + (x2-x1)*(i/nTicks));
            let y = this.scaleY(y1 + (y2-y1)*(i/nTicks));

            this.ctx.beginPath();
            this.ctx.moveTo(x-5*Math.cos(theta-Math.PI/2), y+5*Math.sin(theta-Math.PI/2));
            this.ctx.lineTo(x+5*Math.cos(theta-Math.PI/2), y-5*Math.sin(theta-Math.PI/2));
            this.ctx.stroke();

            // labelXOffset and labelYOffset are in user coordinates (not canvas coordinates)
            let labelX = this.scaleX(this.scaleXInverse(x)+labelXOffset);
            let labelY = this.scaleY(this.scaleYInverse(y)+labelYOffset);
            if(labels){
                this.drawLabel(labels[i-1],labelX, labelY, labelTheta);
            }
            else if(!isNaN(scaleStart) && !isNaN(scaleEnd)){
                let label = scaleStart + (scaleEnd-scaleStart)*(i/nTicks);
                this.drawLabel(label.toFixed(2),labelX, labelY, labelTheta);
            }
            else{
                console.error("drawAxis method of EasyCanvas object must be called with 'labels' or both 'scaleStart' and 'scaleEnd'");
            }
        }
    }

    drawDefaultAxes(){
        let xTicks = 10;
        let yTicks = 5;

        // x-axis
        let labelYOffset = this.scaleYInverse(40)-this.scaleYInverse(0);
        this.drawAxis(this.xmin,this.ymin,
                        this.xmax,this.ymin, 
                        0, labelYOffset,
                        Math.PI/4,
                        xTicks,
                        undefined,
                        this.xmin,
                        this.xmax)
    
        // y-axis
        let labelXOffset = this.scaleXInverse(-30)-this.scaleXInverse(0);
        this.drawAxis(this.xmin,this.ymin,
                        this.xmin,this.ymax, 
                        labelXOffset,0,
                        Math.PI/4,
                        yTicks,
                        undefined,
                        this.ymin,
                        this.ymax)
    }

    drawLine(data){
        this.ctx.beginPath();
        this.ctx.moveTo(this.scaleX(data.xs[0]), this.scaleY(data.ys[0]));
        for(let i=1; i<data.xs.length; i++){
            let x = this.scaleX(data.xs[i])
            let y = this.scaleY(data.ys[i])
            this.ctx.lineTo(x,y);
        }
        this.ctx.stroke();
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

// add stuff from easyCanvasHotAndReady!
customElements.define('easy-canvas', EasyCanvas);
