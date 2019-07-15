/* this file contains functions for making very common plots using easyCanvas */
/* they will be made accessable via EasyCanvas.hotAndReady */

// helpers:

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

function dist(x1,y1,x2,y2){
    return Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2));
}


function drawTooltip(x,y,info){
    let padding = 20;
    let lineHeight = 20;
    let letterWidth = 12;

    let keys = Object.keys(info);
    let values = Object.values(info);
    let labels = zip(keys,values).map(pair => [`${pair[0]}: `,`${pair[1]}`])

    x = this.scaleX(x);
    y = this.scaleY(y);

    // Draw Rectangle 
    let h = labels.length * lineHeight;
    h += padding * (labels.length+1);
    let w = Math.max(...labels.map(pair => pair[0].length + pair[1].length))*letterWidth + 2*padding;

    let oldFillStyle = this.ctx.fillStyle;
    this.ctx.fillStyle="rgba(255,255,255,0.7)";
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.fillStyle=oldFillStyle;

    // draw text for individual labels
    for(let [i, label] of labels.entries()){
        let x1 = x + padding;
        let y1 = y + padding*(i+1) + lineHeight*(i+1);
        this.drawLabel(label[0], x1, y1,undefined,font="bold 18pt arial");
        
        x1 += (letterWidth*label[0].length);
        this.drawLabel(label[1],x1,y1,undefined,font="18pt arial");
    }
}

function drawLegend(labels, settings){
    let padding = 20;
    let lineHeight = 20;
    let letterWidth = 14;
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
        this.drawLabel(label.text, x1, y1);
    }
}

function drawLegendAxesLabelsAndTitle(settings){
    let title = defaultVal(settings.title, "Untitled");
    let xLabel = defaultVal(settings.xLabel, "input");
    let yLabel = defaultVal(settings.yLabel, "output");
    let legendLabels = defaultVal(settings.legendLabels, ["ys"]);
    let colors = defaultVal(settings.colors, defaultColors);

    // draw legend
    legendLabels = legendLabels.map((field,i) => {
        return {text: field, color: colors[i%colors.length]};
    })
    legendLabels = legendLabels.filter(x => x.text != "")
    drawLegend.bind(this)(legendLabels);

    // draw title
    let titleX = this.canvas.width/2 - (title.length/2)*32;
    let titleY = 60;
    this.drawLabel(title, titleX,titleY, 0, "48pt arial");

    // draw x-axis label
    let xLabelX = this.canvas.width/2 - (xLabel.length/2)*16;
    let xLabelY = this.canvas.height-20;
    this.drawLabel(xLabel, xLabelX, xLabelY,0, "bold 24pt arial");

    // draw y-axis label
    let yLabelX = 40;
    let yLabelY = this.canvas.height/2 + (yLabel.length/2)*16;
    this.drawLabel(yLabel, yLabelX, yLabelY,Math.PI/2, "bold 24pt arial");
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

    let index;
    if(Math.abs(xs[high] - mx) < Math.abs(xs[low] - mx)){
        index = high;
    }
    else{
        index = low;
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

//     console.log(`
// mx: ${mx},
// my: ${my},
// index: ${index},
// xs[index]: ${xs[index]},
// output: ${output},
// data[output]: ${data[output]}
// ###################################
// `);

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
        if(isNaN(data[tooltip][index])){
            info[tooltip] = data[tooltip][index].toString().slice(0,8) + "...";
        }
        else{
            info[tooltip] = data[tooltip][index].toFixed(3);
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
        this.alreadyAutoScaledLinePlot = true;
        rescaleAxes.bind(this)(xmin,xmax,ymin,ymax);
    }

    if(tooltips.length != 0 && this.mouseX !== undefined){
        linePlotTooltip.bind(this)(data, inputs,outputs,tooltips);
    }

    // legend, plot title, and axes labels.
    drawLegendAxesLabelsAndTitle.bind(this)(settings);
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
    this.drawAxis(0,0,
        0,this.ymax,
        labelXOffset,labelYOffset,
        Math.PI/3,
        5,
        undefined,
        0,this.ymax)

    // x-axis
    labelXOffset = this.scaleXInverse(-45) - this.scaleXInverse(0)
    labelYOffset = this.scaleYInverse(65) - this.scaleYInverse(0)
    this.drawAxis(0,0,
        this.xmax,0,
        labelXOffset,labelYOffset,
        Math.PI/10,
        data.bars.length+1,
        data.bars.concat(""))


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