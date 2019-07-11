/* this file contains functions for making very common plots using easyCanvas */
/* they will be made accessable via EasyCanvas.hotAndReady */

// helpers:

let defaultColors = ["red", "green", "blue", "purple", "orange"];

function zip(xs,ys){
    return xs.map((v,i)=>[v,ys[i]])
}



function defaultVal(original,def){
    if(original === undefined){
        return def;
    }
    return original;
}

function drawLegend(labels, settings){
    let padding = 10;
    let lineHeight = 10;
    let letterWidth = 7;
    let patchSize = 10;

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
    drawLegend.bind(this)(legendLabels);

    // draw title
    let titleX = this.canvas.width/2 - (title.length/2)*16;
    let titleY = 30;
    this.drawLabel(title, titleX,titleY, 0, "24pt arial");

    // draw x-axis label
    let xLabelX = this.canvas.width/2 - (xLabel.length/2)*10;
    let xLabelY = this.canvas.height-10;
    this.drawLabel(xLabel, xLabelX, xLabelY,0, "bold 12pt arial");

    // draw y-axis label
    let yLabelX = 20;
    let yLabelY = this.canvas.height/2 + (yLabel.length/2)*10;
    this.drawLabel(yLabel, yLabelX, yLabelY,Math.PI/2, "bold 12pt arial");
}




function rescaleAxes(xmin,xmax,ymin,ymax){
        let ga = this.getAttribute.bind(this);
        let sa = this.setAttribute.bind(this);
        if(this.xmin != xmin || this.xmax != xmax || this.ymin != ymin || this.ymax != ymax){
                sa("xmin",xmin);sa("xmax",xmax);sa("ymin",ymin);sa("ymax",ymax);
        }
}







// Actual exported functions

function linePlot(data, settings){
    let inputs = defaultVal(settings.inputs, ["xs"]);
    let outputs = defaultVal(settings.outputs, ["ys"]);
    let autoScale = defaultVal(settings.autoScale,true);
    let colors = defaultVal(settings.colors, defaultColors);

    let zipped = zip(inputs,outputs);
    
    // draw lines and find extend of data.
    let xmin = ymin = Infinity;
    let xmax = ymax = -Infinity;
    for(let [i,[x,y]] of zipped.entries()){
        // lines
        this.ctx.strokeStyle = colors[i%colors.length];
        line = {xs: data[x], ys: data[y]};
        this.drawLine(line);

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

    this.setAttribute("default-axes-on","false");
    this.drawDefaultAxes();
    drawLegendAxesLabelsAndTitle.bind(this)(settings);
}






function barPlot(data, settings){
    let autoScale = defaultVal(settings.autoScale,true)
    let colors = defaultVal(settings.colors, defaultColors);

    if(autoScale){
        rescaleAxes.bind(this)(0,1,0,Math.max(...data.heights))
    }

    // y-axis
    this.drawAxis(0,0,
        0,this.ymax,
        -.06,-this.ymax/20,
        Math.PI/8,
        5,
        undefined,
        0,this.ymax)

    // x-axis
    this.drawAxis(0,0,
        this.xmax,0,
        -0.03,-this.ymax/10,
        0,
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
    "histogram": histogram
}

// module.exports = [
//     ["linePlot",linePlot],
//     ["barPlot", barPlot],
//     ["histogram", barPlot]
// ];