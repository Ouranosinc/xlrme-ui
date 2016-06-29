/* global $, _, crossfilter, d3, ouranos  */
(function(ouranos,  _) {

    var COLS = {'blue': '#4575b4', 'yellow': '#ffffbf', 'red': '#a50026'};
    
    ouranos.makeAPIMethod = function(chart, that, method) {
        return function(_){
            if(!arguments.length){
                return that.params[method];
            }
            that.params[method] = _;
            return chart;
        };
        
    };
    // quick'n'dirty random string, 6-7 chars long
    ouranos.makeRandomStringQAD = function() {
        return Math.random().toString().slice(2); 
    };
    
    ouranos.titleizeString = function(s) {
        var title = s.charAt(0).toUpperCase() + s.slice(1);
        return title.replace(/_/g, '-');
    };
    
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    // Draw axes label
    ouranos.adjust_axes_label_background = function(parent) {
        
        var lm = {'top':6, 'bottom':6, 'left':8, 'right':8};
        
        var bbox = parent.select('text').node().getBBox();
         
        parent.select('rect')
            .attr({'x':bbox.x - lm.left, 'y':bbox.y-lm.top, 'width':bbox.width+lm.left + lm.right, 'height':bbox.height+lm.top + lm.bottom});
    };
      
    
    // -DOM- : SVG axes and labels
    ouranos.drawAxes = function(params) {
        var chart = this;
        // basic x and y, with decoration and callback if chart.activeAxes() is true
        var padX = chart.padX || 0,
        padY = chart.padY || 0,
        // LABEL_PADDING_X=15;
        // LABEL_PADDING_Y=5;
        LABEL_PARAMS = {'WX':15, 'WY':5, 'FFX':3, 'FFY':6};
        // var gEnter = chart.svg.enter().append('g');
        
        chart.gEnter.append("g")
            .attr("class", "x axis");
        chart.gEnter.append("g")
            .attr("class", "y axis");

        console.log("chart.h", chart.h);
        console.log("chart.w", chart.w);
        
        chart.svg.select('.x.axis') 
            .attr("transform", "translate(0," + (chart.h + chart.axispadding().bottom) + ")")
            .call(chart.xAxis)
            .selectAll("text")  
            //.style("text-anchor", "end")
            .attr("dx", "0.6em")
            .attr("dy", "0.7em");

        chart.svg.select('.y.axis')
            .attr("transform", "translate("+ (-chart.axispadding().left) + ", 0)")
            .call(chart.yAxis);

        if(chart.displaylabels()){
            
            // Label margins for the background rectangle
            var lm = {'top':6, 'bottom':6, 'left':8, 'right':8};
            
            // X-AXIS
            var el, tEnter, text, al, bbox, text, nx, g;

            g = chart.gEnter.append("g").attr("class", 'x axis-label');
            g.append('rect').attr('class', 'label-background'); g.append('text');
            
            g = chart.gEnter.append("g").attr("class", 'yLeft y axis-label');
            g.append('rect').attr('class', 'label-background'); g.append('text');

            al = chart.svg.select('.x.axis-label')
                .attr("transform", "translate(" + chart.w/2 + "," + (chart.h + chart.margins().bottom -5) + ")");
            al.selectAll('text')
                .data([chart.xName() || chart.xKey()])
                .text(function(d) {return d});
                
            al.selectAll('rect')
                
            ouranos.adjust_axes_label_background(al);
            
            // Y-AXIS
            al = chart.svg.select('.y.axis-label')
                .attr("transform", "rotate(-90) translate(" + (0-chart.h/2) + "," + (-chart.margins().left+12) + ")");
            al.selectAll('text')
                .data([chart.yName() || chart.yKey()])
                .text(function(d) {return d});
    
            ouranos.adjust_axes_label_background(al);
            
        } 
    };
    ouranos.defaultSVG = function(data) {
        // shared SVG defaults
        var chart = this;
        var margins = chart.margins();
        var w = chart.width();
        var h = chart.height();
        
        if (!w || w === 'auto') {w = parseInt(chart.container.style('width'),10);} 
        if (!h || h === 'auto') {h = parseInt(chart.container.style('height'),10);}
        
        
        aw = chart.w = parseInt(w) - margins.left - margins.right,
        ah = chart.h = parseInt(h) - margins.top - margins.bottom;
        
        chart.svg = chart.container
            //.attr("width", w)
            //.attr("height", h)
            .selectAll('g').data([true]);
        chart.gEnter = chart.svg.enter().append('g');
        
        chart.svg.attr("transform", "translate(" + margins.left + "," + margins.top + ")");
        
        chart.gEnter.append("defs").append("clipPath")
            .attr("id", "clip-" + chart.id())
            .append("rect")
            .attr("width", aw)
            .attr("height", ah);
    };

    ouranos.SliderViz = function() {
        //console.log("Entering SliderViz creation.");
        var that=this, params = this.params = {};
        params.id = ouranos.makeRandomStringQAD();
        params.height = null;
        params.width = null;
        params.margins = { top: 0, right: 0, bottom: 0, left: 0 };
        
        var chart = function (selection) {
            selection.each(function(data) {
                chart.container = d3.select(this);
                chart.setScales()
                chart.SVG();
            });
        },
        
        method;
        for(method in params){
            chart[method] = ouranos.makeAPIMethod(chart, this, method);
        }
        
        chart.expertchart = function (selection) {
            selection.each(function(data) {
                chart.container = d3.select(this);
                chart.parseExpertData(data);
                chart.drawExpertData();
                });
        };
        
        chart.SVG = function() {
            ouranos.defaultSVG.call(chart);
        };
        
        var z = d3.scale.linear();
        
        chart.parseExpertData = function(data){
            chart.expertdata = data;
        };
        
        chart.setScales = function(){
            chart.padY = 0;
            chart.padX = 0;
            
        };
                // -DOM- : Hover title for the expert data

        
        // -DOM- : SLIDER expert data
        chart.drawExpertData = function() {
            if (chart.svg === undefined) {return}
            var markers = chart.svg.selectAll('.expert.datapoint')
                .data(chart.expertdata.points);
            
            var w = chart.container[0][0].parentNode.getBoundingClientRect().width;
            z.domain([chart.expertdata.min, chart.expertdata.max]).range([0, w]);
            
            //chart.container.call(expert_tip);
            
            markers.enter()
                .append("circle")
                .attr("class", "cirle expert datapoint")
                //.on('mouseover', expert_tip.show)
                //.on('mouseout', expert_tip.hide)
                .attr("r", 0);
                
                
            markers.exit()//.transition(1000)
                .attr("r", 0)
                .remove();
            
            markers//.transition().duration(1000)
                .attr("cy", 2)
                .attr("cx", function (d) { if (isNaN(parseInt(z(d.z),10))) {
                    console.log('shit')};
                     return parseInt(z(d.z),10); })
                .attr("fill", function(d) {return (d.selected)?"k":"gray"})
                .attr("r", 2);
                
            };
          
        return chart; 
    },
    
    // -DOM- : Heatmap SVG creation
    ouranos.HeatMap = function() {
        
        var that=this, params = this.params = {};
        params.id = ouranos.makeRandomStringQAD();
        // params.name = "hist2D";
        params.title = "";
        params.yName = null;
        params.xName = null;
        params.height = null;
        params.width = null;
        params.margins = { top: 50, right: 30, bottom: 50, left: 20 };
        params.axispadding = {left: 5, bottom: 5};
        params.timeFormat = "%d/%m/%Y";
        params.displaylabels = true;
        params.axes = {};
        params.scales = {};
        params.xKey = '';
        params.yKey = '';
        params.units = '';
        params.fmt = '-,.3r';
        params.countKey = 'values';
        params.countKeyColor = false;
        params.activeAxes = false;
        params.colorBarPosition = {};
        params.colorBar = 'BYR';
        params.minVal = false;
        params.maxVal = false;

        var chart = function (selection) {
            selection.each(function(data) {
                chart.container = d3.select(this);
                chart.parseData(data);
                chart.SVG();
                chart.setScales();
                chart.drawAxes();
                chart.drawData('rect');
            });
        };
        

        var method;
        for(method in params){
            chart[method] = ouranos.makeAPIMethod(chart, this, method);
        }
        
        chart.expertchart = function (selection) {
            selection.each(function(data) {
                chart.container = d3.select(this);
                chart.setScales();
                chart.parseExpertData(data);
                chart.drawExpertData();
                });
        };
        
        chart.margins = function(_) {
            if(!arguments.length){
                return that.params.margins;
            }
            $.extend(that.params.margins, _);
            return chart;
        };
        
        // SETUP SCALES AND AXES
        var x = d3.scale.ordinal(),
            y = d3.scale.ordinal(),
            xl = d3.scale.linear(),
            yl = d3.scale.linear(),
            xAxis = chart.xAxis = d3.svg.axis().scale(xl).orient("bottom")
                .tickFormat(function (d, i) {
                    return d;
                }),
            yAxis = chart.yAxis = d3.svg.axis().scale(yl).orient("left")
                .tickFormat(function (d, i) {
                    return d;
                });
        
        chart.rScale = d3.scale.linear();
        
        chart.cScale = d3.scale.linear()
            .interpolate(d3.interpolateHcl);
        
        chart.cbscale = d3.scale.linear();
        
        chart.SVG = function() {
            ouranos.defaultSVG.call(chart);
            chart.gEnter.append('g').attr('id', 'metric');
            chart.gEnter.append("g").attr("id", "colorbar");
            chart.gEnter.append("g").attr("id", "colorbar-unit");
            chart.gEnter.append("g").attr("id", "colorbar-title");
            chart.gEnter.append('g').attr('id', 'expert');
            
        };

        chart.parseData = function(data) {
            chart.data = data.value.points;
            chart.xValues = data.value.xValues;
            chart.yValues = data.value.yValues;
        };
        
        chart.parseExpertData = function(data) {
            chart.expertData = data.expert.points;
        };

        chart.setScales = function() {
            console.log("heatmap chart: set scales"); 
            chart.padX = chart.w / (2*chart.xValues.length);
            chart.padY = chart.h / (2*chart.yValues.length);
            
            x.domain(chart.xValues).rangePoints([chart.padX, chart.w-chart.padX]);
            y.domain(chart.yValues).rangePoints([chart.h - chart.padY, chart.padY]);
            
            xl.domain(d3.extent(chart.xValues)).range([chart.padX, chart.w-chart.padX]);
            yl.domain(d3.extent(chart.yValues)).range([chart.h - chart.padY, chart.padY]);
        }; 

        chart.drawAxes = function() {
            xAxis.ticks(chart.xValues.length);
            yAxis.ticks(chart.yValues.length);
            ouranos.drawAxes.call(chart);
        };

        // -DOM- : Colorbar
        chart.updateColorBar = function() {

            var bars, cEnter, domain, 
                bx = typeof params.colorBarPosition.x !== 'undefined'? params.colorBarPosition.x: chart.w + params.margins.right/5,
                by = typeof params.colorBarPosition.y !== 'undefined'? params.colorBarPosition.y: chart.h-10,
            COLOR_BAR_WIDTH = 25, COLOR_BAR_HEIGHT = 6;

            chart.COLOR_BARS = 50;
            domain = [0, chart.COLOR_BARS];
            if(chart.getDomain().length === 3){
                domain = [0, chart.COLOR_BARS/2, chart.COLOR_BARS];
            }
            chart.cbscale = chart.cbscale.domain(domain).range(chart.getDomain());
            
            chart.colorbar = chart.svg.select('#colorbar')
                .attr("transform", "translate(" + bx + "," + by + ")")
                .attr('class', 'colorbar')
                .selectAll('.colorbar')
                .data(d3.range(chart.COLOR_BARS));
            
            cEnter =  chart.colorbar.enter().append('g');

            // Colorbar rectangles
            cEnter.append('rect')
                .attr('class', 'bar')
                .attr('width', COLOR_BAR_WIDTH)
                .attr('height', COLOR_BAR_HEIGHT)
                .attr('x', 0)
                .attr('y', function(d, i) {
                    return -i*COLOR_BAR_HEIGHT;
                });
            
            // Colorbar tick labels
            cEnter.append('text')
                // .text(chart.colorbarText)
                 .attr("x", COLOR_BAR_WIDTH + 5)
                .attr("y", function(d, i) { return -i * COLOR_BAR_HEIGHT;})
                .attr("dy", '.3em')
                .attr('class', 'cb-text');

            // Colorbar units
            chart.svg.select('#colorbar-unit')
            .attr("transform", "translate(" + bx + "," + (chart.h + chart.axispadding().bottom) + ")")
            .selectAll('text').data([true])
            .enter()
            .append('text')
            //.style('text-anchor', 'middle')
            .attr('x', COLOR_BAR_WIDTH/2)
            .attr('y', 0)
            .attr("dy", ".6em");


            // Colorbar title
            var title = chart.svg.select('#colorbar-title')
                .attr("transform", "translate(" + (bx + 3) + "," + (by - (chart.COLOR_BARS*COLOR_BAR_HEIGHT) - 10) + ") rotate(-90) ")
                .selectAll('g').data([true])
                .enter()
                .append('g');
                
            var rect = title.append('rect');
            
            title.append('text')
                .attr('y', COLOR_BAR_WIDTH/2)
                .attr('x', 0);
            
            
            // Update content
            chart.svg.selectAll('.colorbar .bar').attr('fill', function(d) {
                    return chart.cScale(chart.cbscale(d));
                });
                
            chart.svg.selectAll('.colorbar .cb-text').text(chart.colorbarText);
            
            chart.svg.select('#colorbar-unit text').text(chart.units());   
            
            chart.svg.select("#colorbar-title text").text(chart.title());   
            
            var lm = {'top':6, 'bottom':6, 'left':8, 'right':8};
            
            if (chart.title() !== "") {
                var bbox = chart.svg.select("#colorbar-title text")[0][0].getBBox();
                chart.svg.select("#colorbar-title rect")
                    .attr('class', 'label-background')
                    .attr({'x':bbox.x - lm.left, 'y':bbox.y-lm.top, 'width':bbox.width+lm.left + lm.right, 'height':COLOR_BAR_WIDTH});
            }

            
        };

        chart.colorbarText = function(d, i) {
            var CB_LABEL_INDICES=[0, 25, 49];
            if(_.contains(CB_LABEL_INDICES, i)){
                // kgd - changing to a 0-1 ratio
                return numberWithCommas(parseInt(chart.bounds[0] + (chart.bounds[1]-chart.bounds[0]) * (i*1.0/chart.COLOR_BARS), 10)); 
                //return parseFloat(i*1.0/chart.COLOR_BARS, 10).toFixed(1);
            }
        };

        var addInfoLine = function(type, value) {
            var val; 
            if (typeof(value) === "string") {
                val = value;}
            else if (typeof(value) === "number") {
                val = parseFloat(value, 10);}
            else {val="";}
                
            return "<p><strong>" + ouranos.titleizeString(type) +":</strong> <span>" + val + "</span></p>";
        };
        
        // -DOM- : Hover title for the heat map
        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                var fmt = d3.format(chart.fmt());
                var s = addInfoLine(chart.xKey(), d.x);
                s += addInfoLine(chart.yKey(), d.y);
                if (d.lever !== undefined && d.lever !== "") {
                    s += addInfoLine("Lever", _.filter(ouranos.config.levers, {'key':d.lever})[0].name);
                }
                s += addInfoLine(chart.countKey() + ' [' + chart.units() + ']', fmt(d.value));
                if (d.info) { s += addInfoLine("Info", d.info);}
                if(chart.countKeyColor()){
                    s += addInfoLine('Total ' + chart.countKeyColor(), d.valueColor);
                }
                // s += addInfoLine(chart.countKey() + '_captive', d.valueCaptive);
                return s;
            });
        
        fmt = d3.format(' .1f');
        
        // -DOM- : Hover title for the expert data
        var expert_tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(o) {
                var s=""; 
                
                o.meta.forEach(function(d) {
                    s=s + "<p><strong>" + d.key + ": </strong>" + d.value + "</p>";
                    });
                    
                o.coord.forEach(function(d) {
                    s=s + "<p><strong>" + d.key + ": </strong>" + fmt(d.value) + "</p>";
                    });

                return s;
            });
       
        chart.drawData = function(k) {
            // we have radius and color dimensions to play with.
            // counts proportional to circle area seems sensible
            // colors blue through yellow to red
            var bounds = chart.bounds = d3.extent(chart.data.map(function(d) {
                // return Math.sqrt(d.value/3.14);
                return d.value;
            }));
     
            // adjust for clamping of minimal value
            if(chart.minVal() !== false){
                bounds[0] = chart.minVal();
            }
            
            var boundsColor = chart.boundsColor = d3.extent(chart.data.map(function(d) {
                // return Math.sqrt(d.value/3.14);
                return d.valueColor;
            })),
            
            min = chart.min = Math.sqrt(bounds[0]/3.14),
            max = chart.max = Math.sqrt(bounds[1]/3.14);
            
            chart.rScale.range([0, 0.5*d3.min([chart.w/chart.xValues.length, chart.h/chart.yValues.length])])
                .domain(chart.getRadiusDomain());
             
            chart.cScale 
                .domain(chart.getDomain())
                .range(chart.getRange())
                .interpolate(d3.interpolateHcl);

            chart.container.call(tip);

            // -DOM- : Draw the heatmap rectangles (or circles).  
            if (k==='circle') {
            var circles = chart.svg.select("g#metric").selectAll("circle.datapoint")
                .data(chart.data);
            
            circles.enter()
                .append("circle")
                .attr("class", "circle datapoint")
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide);
            
            circles.exit().remove();
            circles//.transition().duration(1000)
                .attr("cx", function (d) { return parseInt(x(d.x),10); })
                .attr("cy", function (d) { return parseInt(y(d.y),10); })
                .attr("fill", chart.fillCircle)
                .attr("r", chart.circleRadius); }
            
            else if(k==='rect') {
                var width = (chart.w - 2*chart.padX)/chart.xValues.length;
                var height = (chart.h - 2*chart.padY)/chart.yValues.length;

                var rect = chart.svg.select("g#metric").selectAll("rect.datapoint")
                    .data(chart.data);
                
                rect.enter()    
                    .append("rect")
                    .attr("class", "rect datapoint")
                    .on('mouseover', tip.show)
                    .on('mouseout', tip.hide);
                
                
                rect.exit().remove();
                
                rect//.transition().duration(1000)
                    .attr("x", function (d) { return xl(d.x) - width/2; })
                    .attr("y", function (d) { return yl(d.y) - height/2; })
                    .attr("width", width)
                    .attr("height", height)
                    .attr("fill", chart.fillCircle); 
            }
            
            chart.updateColorBar();
        };

        // -DOM- : Draw the expert data over the heat map
        chart.drawExpertData = function() {
            console.log("Draw heatmap expert data"); 
            var markers = chart.svg.select('g#expert').selectAll('.expert.datapoint')
                .data(chart.expertData);
                
            chart.container.call(expert_tip);
            
            markers.enter()
                .append("circle")
                .attr("class", "cirle expert datapoint")
                .on('mouseover', expert_tip.show)
                .on('mouseout', expert_tip.hide)
                .attr("r", 0);
                
                
            markers.exit()//.transition(1000)
                .attr("r", 0)
                .remove();
            
            markers//.transition().duration(1000)
                .attr("cx", function (d) { 
                    if (d.x) {
                        return parseInt(xl(d.x),10);
                    }
                    else {
                        return -chart.axispadding().left/2;
                        //return -2;
                    }
                 })
                .attr("cy", function (d) { 
                    if (d.y) {
                        return parseInt(yl(d.y),10);
                    }
                    else {
                        return chart.h + chart.axispadding().bottom/2;
                        }
                    })
                .attr("fill", 'k')
                .attr("r", 5);
                
                
            };


        chart.getRadiusDomain = function() {
            return [chart.min, chart.max];
        };
        
        // This is overridden in app.js using the real data bounds. 
        chart.getDomain = function() {
            return [0, 0.5, 1.0];
        };

        chart.getRange = function() {
            return [COLS.blue, COLS.yellow, COLS.red];
        };
        
        chart.fillCircle = function(d) {
            if (isNaN(d.value)) {
                return "#E8E8E8";
            }
                    
            if(!chart.countkeycolor){// possible negatives
                // return chart.c(0.5 - 0.5*d.value/chart.absMax);
                // return chart.c(-d.value);
                return chart.cScale(d.value);
            }
            return chart.cScale(d.valueColor);
            // return chart.c(d.value);
        };

        chart.circleRadius = function(d) {
            var x = parseInt(chart.rScale(Math.sqrt(d.value/3.14)), 10);
            if(isNaN(x)){
                console.log(d);
                return 1;
            }
            return 1 + x;
        };

        chart.onXAxisClick = function(d) {
            console.log('x-axis clicked');
        };

        chart.onYAxisClick = function(d) {
            console.log('x-axis clicked');
        };
        
        return chart;
    }; 
    
    
})(window.ouranos = window.ouranos || {}, _);
