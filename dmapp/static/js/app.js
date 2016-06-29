/* global $, _, crossfilter, d3  */
(function(ouranos,  _) {

/* When a window is created, it inherits fields from the composer: 
 *  - activeData
 *  - options
 *  - fields
 * 
 * The .init arguments are stored in params, which usually has a field 
 * attribute, which can be confusing. 
 * 
 * 
 * 
 * 
 * 
 */
 


// minipubsub from https://github.com/daniellmb/MinPubSub
(function(b){var a={},e=b.c_||{};a.publish=function(f,c){for(var a=e[f],d=a?a.length:0;d--;)a[d].apply(b,c||[])};a.subscribe=function(a,c){e[a]||(e[a]=[]);e[a].push(c);return[a,c]};a.unsubscribe=function(a,c){var b=e[c?a:a[0]];c=c||a[1];for(var d=b?b.length:0;d--;)b[d]===c&&b.splice(d,1)};"object"===typeof module&&module.exports?module.exports=exports=a:"function"===typeof define&&define.amd?define(function(){return a}):"object"===typeof b&&(b.publish=a.publish,b.subscribe=a.subscribe,b.unsubscribe=a.unsubscribe)})(this.window.PubSub = {});
    
    'use strict';
    var makeAPIMethod = function(chart, params, method) {
        return function(_){
            if(!arguments.length){
                return params[method];
            }
            params[method] = _;
            return chart;
        };
    };
        
    ouranos.App = {};
    ouranos.App.init = function(_params){
        var data = {},
            windows = [],
            frames = [],
            fidToWindow = {},
            
            params = {
                height:false, width:false, margin: 'auto', padding:false, position:'relative', filteredData:[], store:{}
            };
        
        // these are extended  (???)
        for(var p in _params){
            params[p] = params[p];
        }

        var composer = function(selection){
            selection.each(function(config){
                var ad = composer.activeData;
                if(config.data){
                    ad.mraw = config.data;
                    ad.filtered = config.data;
                    if(window.crossfilter){
                        composer.mdata = crossfilter(ad.mraw);
                        composer.mdims = {};
                        composer.mstats = undefined;
                        
                        composer.edata = crossfilter([]);
                        composer.edim = undefined;
                        composer.estats = undefined; 
                        
                        composer.emdata = crossfilter([]);
                        composer.emdims = {};
                        
                    }
                }
                ad.params = (config.params)?config.params:{};
                // run first data-change op
                windows.forEach(function(w) {
                    w.onDataChange();
                    w.onExpertDataChange();
                });
                composer.init();
            });
        };

        composer.onDataChange = function() {
            var urlHash;
            // alert all windows to data change
            windows.forEach(function(w) {
                w.onDataChange();
            });
            // callback if specialized
            composer.cbk();
            // update URL hash with serialized params
            urlHash = decodeURIComponent( $.param( this.activeData.params ) ); 
            //location.hash = urlHash; Exceeds size limit on IE
        };
        
        composer.onExpertDataChange = function() {
            windows.forEach(function(w) {
                w.onExpertDataChange();
            });
        };
        
        
        composer.get_slider_fields = function(obj) {
        // Return an array of slider fields.
        // Assumes that obj has options and fields attributes
            var out = [];
            _.forEach(obj.options, function(v,k) {
                if(k.slice(0,6) === 'slider') {
                    out.push(obj.fields[v]);
                }
            })
            return out;
        };
    
        composer.apply_field_filters = function() {
        };
        
        
        composer.activeData = {};
        composer.init = function() {};
        composer.cbk = function() {};
        
        composer.addWindow = function(window, frameId){
            var frame = d3.select('#' + frameId);
            window.setFrame({composer:this, frame:frame});
            windows.push(window);
            fidToWindow[frameId] = window;
            if(composer.activeData){
                window.onDataChange();
            }
        };

        composer.getWindow = function(fid){
            return fidToWindow[fid];
        };

        return composer;
            
    };
    // Is there a reason you are using both "this" and "win" here ?
    ouranos.Window = {
        type: 'window',
        // Why not use this.params = $.extend({}, this.defaultParams, params) ?
        init: function(params) {
            var win = this;
            if(this.defaultParams){
                this.params = $.extend({}, this.defaultParams);
            }
            else{
                this.params = {};
            }
            if(params){
                _.forEach(params, function(v, k) {
                    win.params[k] = v;
                });
            }
            console.log('Initializing ' + this.type);
            this.postInit(params);
            return this;
        },
        postInit: function() {},
        onDataChange: function() {
           // placeholder 
        },
        onExpertDataChange: function() {
           // placeholder 
        },
        setFrame: function(params){
            if(params.composer){
                this.composer = params.composer;
                this.activeData = this.composer.activeData;
                this.options = this.activeData.params.options;
                this.fields = this.activeData.params.fields;
            }
            // this.frame = params.frame.append('div').classed('window-wrapper', true);
            this.frame = params.frame;
            this.elements = [this.frame];
            this.build();
        },
        build: function() {},
        hide: function() {
            this.elements.forEach(function(el) {
                el.style('display', 'none');
            });
        },
        show: function() {
            this.elements.forEach(function(el) {
                el.style('display', 'block'); // Before: Display 'initial'
            });
        },
        dataChanged: function() {
            this.composer.onDataChange();
        },
        expertDataChanged: function() {
            this.composer.onExpertDataChange();
        },
        paramChanged: function() {
            /* Called by child windows to alert the composer that one
             * parameter has changed. 
             * 
             * onParamChange essentially filters the data. 
             * */
            this.composer.onParamChange(this.param);
        },
        pub: PubSub.Pub,
        sub: PubSub.Sub
    };

    
    ouranos.DebugDataWindow = Object.create(ouranos.Window);
    $.extend(ouranos.DebugDataWindow, {
        type: 'debug data window',
        build: function(){
            this.paramsLog = this.frame.append('div')
                .style('background', '#ccc')
                .append('pre');
            this.dataLog = this.frame.append('div')
                .style('background', '#eee')
                .append('pre');
            this.elements = [this.paramsLog, this.dataLog];
        },
        onDataChange: function() {
            this.paramsLog.html(JSON.stringify(this.activeData.params, undefined, 2));
            this.dataLog.html(JSON.stringify(this.activeData.filtered, undefined, 2));
        },
    });
    
    
    ouranos.SliderWindow = Object.create(ouranos.Window);
    $.extend(ouranos.SliderWindow, {
        type: 'slider window',
        
        hide: function() {
            console.log("Hiding slider ", this.params.param.key);
            // Reset filters when inactive
            this.composer.mdims[this.param.key].filterAll(); 
            this.composer.emdims[this.param.key].filterAll(); 
           
            // Hide DOM elements
            this.elements.forEach(function(el) {
                el.style('display', 'none');
            });
        },
        show: function() {
            console.log("Showing slider ", this.params.param.key);
            
            // Set filters back
            this.paramChanged();
            
            // Show DOM elements
            this.elements.forEach(function(el) {
                el.style('display', 'block'); // Before: Display 'initial'
            });
        },
        
        build: function(params) {
            // if new params, clear dimension-filter, remove old slider and rebuild
            if(params){
                this.params = $.extend(this.params, params);
            }
            console.log('Building slider with params ' + JSON.stringify(this.params));
            
                
            var win = this, ps = this.params, p = this.param = this.params.param, values;
            
            // Handle scale for config-defined extra UVs
            if (this.fields[p.key].domain !== undefined) {
                values = d3.range(this.fields[p.key].domain[0], this.fields[p.key].domain[1], this.fields[p.key].step);
            }
            else{
                values = this.composer.mdims[p.key].group().all().map(function(o) {
                    return o.value?+o.key:null;
                }).sort(function(a, b) {return a-b;});
            }    
            
            // -DOM- : SLIDER
            // See also app.chart.js for the expert data drawing. 
            this.frame.style('padding', '2px');
            this.frame.append('div')
                .attr('id', p.key)
                //.style('width', parseInt(this.frame.style('width')) - 2*this.params.padding + 'px');
            
            this.sliderparams = {
                orientation: ps.orientation?ps.orientation:'horizontal',
                // values:values,
                value:p.default,
                // note we assume regular step-sizes for our dimensions
                min:values[0],
                max:values[values.length-1],
                step:Math.abs(values[1]-values[0]),
                range:p.range?p.range:false, 
                slide: function(event, ui) {
                    console.log('Slider', this.id, ':', ui.value);
                    win.param.value = ui.value;
                    win.cbk(ui.value);
                }
            }
            this.slider = $('#' + p.key).labeledslider(this.sliderparams);
            this.frame.select('.ui-slider-wrapper')
                .style('width', null)
                .style('font-size', null);
            
            
            // display label
            this.frame.append('div').attr('class', 'slider-label')
                //.style('top', parseInt(this.frame.style('height'))/2 + 'px')
                .html(p.name + ' [' + p.unit + ']');
                
            // Expert data visualization
            this.chart = new ouranos.SliderViz();
            
            this.svg = d3.select('#'+p.key).append('svg')
                .style('height', '100%')
                .style('width', '100%')//parseInt(this.frame.style('width')) - 2*this.params.padding + 'px')
                .attr('class', 'inner')
                //.attr('viewbox', "0 0 100 100");
                //.attr('preserveAspectRatio', 'xMid,yMid')
                


            // trigger callback to apply data-filters
            //this.cbk(p.value);
            
        },
        
        onDataChange: function(){
            
            this.chart.width(this.frame.style('width'));
            this.data = {}; //this.filterExpertData(this.param.key);
            
            this.data = $.extend(this.data, this.sliderparams);
            
            this.svg.datum(this.data)
                //.transition().duration(1200)
                .call(this.chart);
            },
        
        onExpertDataChange: function(){
            // React to new expert data 
            var opt=this.param.key;
                
            this.data = $.extend(this.data, this.filterExpertData(opt));
            this.svg.datum(this.data)
                //.transition().duration(1200)
                .call(this.chart.expertchart);
        },
        
        
        cbk: function(value) {
            this.paramChanged();
            //var opt = _.invert(this.options)[this.param.key];
            //if (opt === undefined) {this.hide();}
        },
        
        filterExpertData: function(opt) {
            // Prepare points for plotting
            var ds=this.options.expert.value,
                data = {},
                p = this.param;
                
                        
            // Get all expert data
            data.points = this.composer.edim.top(Infinity).filter(function(d) {return (d[opt] !== undefined)});
            
            // Get filtered data
            var subset = this.composer.emdims[opt].top(Infinity);
            
            data.points.forEach(function(o){
                o.z = o[opt]; 
                o.meta="coucou";
                o.selected = _.contains(subset, o)
                });
                
            
            // TODO: Include meta data for hover tips. 
            
            return data;
            
            }
        
    });

    // -DOM- : Uncertain variable selector
    Selector = function() {
        var sel = function(selection) {
            selection.each(function(data) {
                
                var slct = sel.slct = d3.select(this);
                sel.slct.append('label')
                    .attr('class', 'control-label')
                    .attr('for', function(d) {return 'fginput' + d.key;})
                    .text(data.txt);
                
                slct = sel.slct
                    .append('select')
                        .on('change', sel.cbk)
                        .attr('class', 'form-control input-sm');

                slct.selectAll('option').data(data.options).enter()
                    .append('option').attr('value', function(d) {return d.value;})
                    .html(function(d) {
                        return d.label;
                    })
                    .filter(function(o) {
                        return o.checked;
                    })
                    .attr('selected', 'selected')
                ;
                // slct.property('value', data.value);
            });
        };
        
        sel.setOption = function(_opt) {
            sel.slct.selectAll('option').each(function(opt) {
                if(_opt === opt.value){
                    return d3.select(this).attr('selected', 'selected');
                }
            });
        };
                
        sel.cbk = function() {};

        return sel;
    };

    // Chart Selector
    ouranos.SelectWindow = Object.create(ouranos.Window);
    $.extend(ouranos.SelectWindow, {
        
        type: 'select window',
        
        // -DOM- : Chart type selector
        build: function(params) {
            // if new params, clear dimension-filter, remove old slider and rebuild
            if(params){
                this.params = $.extend(this.params, params);
                this.frame.select('#select_'+this.params.key).remove();
            }
            
            var win = this, ps = this.params;
            this.options = this.activeData.params.options;
            this.div = this.frame
                .append('div')
                    .attr('class', 'form-group form-group-sm')
                    .attr('id', 'select_' + ps.key)
                    //.style('display', this.options[ps.value] ? 'block':'none');
                
            
            this.sel = new Selector();
            
            // selector's callback 
            this.sel.cbk = function(s) {
                var opt = $(this).val();
                // console.log('called cbk:', opts);
                // win.activeData.params.options[ps.key] = opts;
                // win.composer.onDataChange();
                win.cbk(opt);
            };
            
            // bind params data to the selector 
            this.div.datum({
                txt:ps.txt,
                key:ps.key,
                options: ps.options,
                value:ps.value,
            }).call(this.sel);

        },

        onDataChange: function() {
            // mirror the values in activeData.options
            var opt = _.invert(this.options)[this.params.key];
            this.sel.setOption(opt);
        },

        cbk: function(opt) {
            console.log('called cbk:', opt);
        },
        
        drawExpertData: function() {}
    });

    
    ouranos.FieldFilterWindow = Object.create(ouranos.Window);
    $.extend(ouranos.FieldFilterWindow, {
        type: 'field filter window',
        
        // -DOM- : Lever selector & expert data selector
        // See specialized methods `build_spec` for levers and `build_filter` for expert data.
        build: function() {
            var win = this;
            var sel;
            this.field = this.param = this.params.field;
            // form to hold checkboxes
            this.form = this.frame.append('form')
                 .attr('id', this.field.key);
            
            // div
            var row = this.form.selectAll('div')
                .data(this.params.config).enter()
                .append('div')
                .attr("class", "row form-group")
                .classed('active', function(o) {return o.checked===true})
                .classed('no-detail', true);
                
            row.append('div')
               .classed(win.params.kind, true)
               .classed('chart-dep', true)
               .append('label')
               .html(function(o) {return '<strong class="caret"></strong>' + o.name})
               .append('input')
               .attr({
                     'type': win.params.kind,
                     'value': function(o) {return o.key;},
                     'name': win.field.key})
               .property('checked', function(o) {return o.checked===true})
               .on('change', function(o) {
                    sel = d3.select(this.parentNode.parentNode.parentNode);
                    if (win.params.kind === 'radio') {
                        row.classed('active', false);
                    }
                    sel.classed('active', this.checked);
                    win.cbk(this.__data__.key, this.checked);
                    set_left_panel_height()

                });
                        
            this.paramChanged();
        },

        // -DOM- : Build form for the Lever options
        build_spec: function() {
            // Add specification details
            var win = this;
            var row = this.form.selectAll('div.row');
            row.classed('no-detail', false);
            row.classed('detail', true);
            row.selectAll('button').style('display', 'inline'); // ?
            
            row.each(function(o, i) {
                var item = d3.select(this);      
                
                var form = item
                    .append("form")
                        .attr("class", "form-horizontal details")
                        .attr("id", o.key + "_details");
                
                
                // Additional specifications //
                var opts = Object.keys(o).filter(function(d) {return o[d].key !== undefined});
                var div = form.selectAll('div.form-group')
                    .data(opts)
                .enter().append("div")
                    .attr("class", "form-group form-group-sm")
                    .style("display", function(d) {return (o[d].show === true)?'inline':'none'});
                    
                    
                div.append("label")
                    .attr("class", 'control-label')
                    .attr("for", function(d) {return o.key+"_"+d})
                    .text(function(d) {return o[d].key;});
                    
                div.append("input")
                    .attr({
                        "class": "form-control input-sm",
                        "id": function(d) {return o.key + "_" + d},
                        "opt": o.key,
                        "type": "number",
                        "value": function(d) {return o[d].value;},
                        "min": function(d) {return o[d].min},
                        "max": function(d) {return o[d].max}})
                    .on("change", function(d) {win.cbk_specs(this.attributes.getNamedItem('opt').value, d, +this.value);});
                    
                div.selectAll('input').each(function(){this.__onchange();}); // Get the config data into the specs.
            });
            
            //$('.details').hide();
            this.paramChanged();
        },

        // -DOM- : Build form for the expert data filter
        build_filter: function() {
            // Add subset selection filter details
            var win = this;
            var row = this.form.selectAll('div.row');
            row.classed('no-detail', false);
            row.classed('detail', true);
            
            var form = row.append('div')
                .append("form")
                    .attr("class", "form-horizontal details")
                    .attr("id", function(o) {return o.key + "_details"})
                    .attr("name", function(o) {return o.name})
                .selectAll('div')
                .data(function(o) {return o.filters || []})
                .enter()
                .append("div")
                    .attr("class", "form-group form-group-sm");
            
            
            row.selectAll('button').style('display', function(d){return (d.filters)?'inline':'none'});
    
            form.append('h3')
                .html(function(d) {return d.name})
                        
            form.selectAll('div.checkbox')
                .data(function(d) {
                    if (d.value === '_all_') {
                        return _.map(win.composer.emdims[d.key].group().all().filter(function(d) {
                            return d.key !== ""}), function(l){                            
                                return l.key;})}
                    else {
                        return d.value
                        }})
                .enter().append('div')
                .attr('class', 'checkbox')
                .append('label')
                .text(function(i) {return i})
                .append('input')
                    .attr({
                    'type': 'checkbox',
                    'value': function(i) {return i;}}
                    )
                    .property('checked', true)
                    .on('change', function() {
                    win.cbk_filter(this.__data__, this.checked, d3.select(this.parentNode.parentNode.parentNode).datum().key);
                });
                                       
            form.selectAll('input').each(function(){this.__onchange();}); // Get the config data into the specs.
                
                
            //$('.details').hide();
            //this.paramChanged();
            
        },

        cbk_specs: function(opt, key, value) {
            console.log("Callback specs:", opt, key, value);
            if (this.field.specs === undefined) {this.field.specs = {};}
            if (this.field.specs[opt] === undefined) {this.field.specs[opt] = {};}
            this.field.specs[opt][key] = value;
            this.dataChanged();
            
            },
            
        cbk_filter: function(opt, checked, parent) {
            console.log('Callback filter'); 
            var that = this;
            if (this.field.filters === undefined) {this.field.filters = {};}
            if (this.field.filters[parent] === undefined) {this.field.filters[parent] = [""];}
            if (checked) {
                if (this.field.filters[parent].indexOf(opt) < 0) {
                    this.field.filters[parent].push(opt);            
                }
            }
            else {
                this.field.filters[parent] = _.without(this.field.filters[parent], opt);
            }
            this.composer.emdims[parent].filter(function(o) {return (o === undefined || _.contains(that.field.filters[parent], o))});
            this.expertDataChanged();   
            
        },
        
        cbk: function(opt, checked) {
            
            if (this.params.kind === 'checkbox' || this.params.kind === undefined){
                if(checked){
                    // change value of field-options 
                    // sanity check if opt in value shouldn't be nec
                    if(this.field.value.indexOf(opt) < 0){
                        this.field.value.push(opt);
                    }
                }
                else{
                    this.field.value = _.without(this.field.value, opt);
                }
            }
            else if (this.params.kind === 'radio') {
                this.field.value = [opt];
            }
            // alert other windows to data-change
            this.paramChanged();
        },
        
        onExpertDataChange: function() {
            }
    });

    
    ouranos.RadioBox = Object.create(ouranos.Window);
    $.extend(ouranos.RadioBox, {
        type: 'radio box',
        
        // -DOM- : Metric selector
        build: function() {
            var win = this, data = this.params.config;
            this.param = this.params.field;
            // form to hold checkboxes
            this.controls = this.frame.insert('div', 'div')
                .attr('class', 'btn-group-horizontal')
                .attr('data-toggle', 'buttons');
            this.cbs = this.controls.selectAll('radio')
                .data(data).enter();
            this.cbs.append('button').attr('class', 'btn btn-default')
                .attr('type', 'button')
                .style('display', 'inline-block') // Before: Display 'initial'
                .classed('leverdependent', function(o) {
                    return o.levers === 'checkbox'})
                .classed('active', function(o) {
                    return o.checked===true;
                })
                .on('click', function() {
                    win.cbk(this.__data__.value);
                })
                // .append('label')
                .text(function(o) {
                    return o.label;
                })
                .append('input').attr('type', 'radio')
                .property('checked', function(o) {
                    return o.checked;
                })
                .attr('value', function(o) {
                    return o.value;
                })
            ;
            this.dataChanged();
        },

        cbk: function(opt) {
            this.param.value = opt;
            }
    });
        

    var nvFilterOld = function(data, xCol, cols) {
        
        series = {};
        cols.forEach(function(d) {
            series[d] = [];
        });
        series.equity = [];
        data.forEach(function(d) {
            cols.forEach(function(c) {
                series[c].push({x:d[xCol], y:d[c]});
            });
        });
        
        lineData = cols.map(function(c) {
            return {values: series[c], key: c}; 
        });
        return lineData;
    };

    

    ouranos.LineChartWindow = Object.create(ouranos.Window);
    $.extend(ouranos.LineChartWindow,{
        build: function() {
            this.chart = nv.models.lineChart()
                .margin({left:67, bottom:52, right:30, top:40})  //Adjust chart margins to give the x-axis some breathing room.
                // .useInteractiveGuideline(true)  //tooltips and a guideline!
                //.transitionDuration(350)  //time for lines to transition?
                .showLegend(true)       //Show the legend.
                .showYAxis(true)        //Show the y-axis
                .showXAxis(true)        //Show the x-axis
                // .width(400)
                // .height(400)
            ;
            this.chart.legend.margin({'top':10})
            // -DOM- : Line chart window. 
            // See app.chart.js for the content creation. 
            
            this.chart.xAxis.axisLabelDistance(12);
            this.chart.yAxis.axisLabelDistance(5);
            
            this.svg = this.frame.append('svg')
                .style('width', '100%')
                .style('height', '100%');
            // elements to show/hide
            this.elements = [this.svg];
            
            this.params.X = this.params.axes[0];
            
            this.post_build();
        },

        post_build: function() {
            this.svg.attr('id', 'leverlines'); 
        },

        onDataChange: function() {
            // temp hack to stop nvd3's confusion with updating a hidden element
            if(this.svg.style('display') === 'none'){
                return;
            }
            
            var xopt=this.options[this.params.X], yopt=this.options.metric;
            console.log('Line chart using params: ' + 'X:' + xopt + ' Y:' + yopt);
            
            this.chart.xAxis     //Chart x-axis settings
                .axisLabel(this.fields[xopt].name + ' [' + this.fields[xopt].unit + ']')
                .tickFormat(d3.format('.02f'));
            this.chart.yAxis     //Chart y-axis settings
                .axisLabel('Value')
                .tickFormat(d3.format('.02f'));
            
            //this.chart.forceY([0, 600]);
            this.data = this.filterData(this.composer.mdims['lever'], yopt, xopt, this.composer);
            console.log('charting ' + this.data.length + ' values');
            
            this.svg
                .datum(this.data).call(this.chart);
                
            this.cbk(xopt, yopt);
        },
        
        cbk: function(xopt, yopt) {
            var lm = {'top':6, 'bottom':6, 'left':8, 'right':8}, bbox;
            var al = this.svg.selectAll('g.nv-axis g text.nv-axislabel');
            var rect, parent; 
            
            al.each(function(d, i) {
                bbox = this.getBBox();
                parent = d3.select(this.parentElement); 
                
                parent.selectAll('rect')
                    .data([true])
                    .enter()
                    .insert('rect', '.nv-axislabel')
                    .attr('class', 'label-background')
                    .attr('transform', d3.select(this).attr("transform"))
                    .attr({'x':bbox.x - lm.left, 'y':bbox.y-lm.top, 'width':bbox.width+lm.left + lm.right, 'height':bbox.height+lm.top + lm.bottom});
                
            })
            },


    /* ---------------------------------------------------------------*/
    /*                   ### Line Data Filter ###                     */
    /* ---------------------------------------------------------------*/
    filterData: function(zDim, ykey, xKey) {
    
        var metric = this.composer.activeData.params.options.metric,
                uvs = this.activeData.params.metrics[metric].dims,
                fn = this.composer.metricFunctions[metric],
            series = {}, 
            zGroups, data;
           
        data = zDim.top(Infinity);
    
        // Create x values if not in original data. 
        for (i in uvs) {
            opt = uvs[i];
            if (this.fields[opt].domain != undefined) {
                if (opt === xKey) {
                    var tmpdata = data;
                    data = [];        
                    var ra = d3.range(this.fields[opt].domain[0], this.fields[opt].domain[1], this.fields[opt].step);
                    for (p in tmpdata) {
                        for (var x in ra){
                            var np = {}; np[opt] = ra[x];
                            data.push($.extend({}, tmpdata[p], np));
                            }
                        }
                }
                else {
                    val = this.fields[opt].value;
                    data.forEach(function(o) {o[opt] = val ;});
                }
            }
        }
        
        // Line grouping on levers
        zGroups = this.fields.lever.value;
        zGroups.forEach(function(d) {
            series[d] = [];
        });
        
        zGroups.forEach(function(key) {
            // apply filter for all the key groups in yDim
            var objs = _.filter(data, {'lever': key}).slice();
            
            objs.forEach(function(obj) {
                series[key].push({x:+obj[xKey], y:fn(obj)});
            });
            series[key] = _.sortBy(series[key], 'x');
        });
        
        var lineData = zGroups.map(function(key) {
            return {values: series[key], key: _.pluck(_.filter(ouranos.config.levers, {'key': key}), 'name')[0]}; 
        });
        return lineData;
    },
    

    });

    ouranos.HeatMapWindow = Object.create(ouranos.Window);
    $.extend(ouranos.HeatMapWindow, {
        build: function() {
            
            this.chart = new ouranos.HeatMap();
            this.chart.getDomain = function() {
                var tb = this.bounds,
                    minv = this.minVal() !== false?this.minVal(): tb[0],
                    maxv = this.maxVal() !== false?this.maxVal(): tb[1];
                
                return [minv, (maxv+minv)/2, maxv];
            };
//            this.chart.minVal(0);
            
            // -DOM- : Heatmap window. 
            // See app.chart.js for the content creation. 
            this.svg = this.frame.append('svg')
                .style('width', '100%')
                .style('height', '100%')
                .style('display', 'none');
            
            this.elements = [this.svg];
            
            this.data = {};
            this.params.X = this.params.axes[0];
            this.params.Y = this.params.axes[1];
            
            this.post_build();
        },

        post_build: function() {
            this.svg.attr('id', 'heatmap'); 
        },

        onDataChange: function() {
            if(this.svg.style('display') === 'none'){
                return;
            }
            
            var xopt=this.options[this.params.X], 
                yopt=this.options[this.params.Y];
                
            var minmax = ouranos.keysToMetrics[this.composer.activeData.params.options.metric].bounds;
            
            this.chart
                .title(ouranos.keysToMetrics[this.composer.activeData.params.options.metric].name)
                .xKey(this.fields[xopt].name + ' [' + this.fields[xopt].unit + ']')
                .yKey(this.fields[yopt].name + ' [' + this.fields[yopt].unit + ']')
                .units(ouranos.keysToMetrics[this.composer.activeData.params.options.metric].unit)
                .countKey(ouranos.keysToMetrics[this.composer.activeData.params.options.metric].name)
                // .countKeyColor(...)
                .height(this.frame.style('height'))
                .margins({'top':30, 'bottom':60, 'left':60, 'right':100})
                
            if (minmax !== null) {
                this.chart
                    .minVal(minmax[0])
                    .maxVal(minmax[1])
            }
            else {
                this.chart
                    .minVal(false)
                    .maxVal(false)
            }
            
                // .activeAxes(...)
                //.colorBarPosition({x:-})
            ;
            
            // the chart expects data in the form:
            // {points:[{x:30, y:20, value:1000}...],
            //  xValues:[10, 20, 30...], yValues:[0, 20, 40...]
            this.preprocess(xopt, yopt); 
            this.data.metric = this.filterData(xopt, yopt);
            this.postprocess(xopt, yopt);
        },

        preprocess: function(xopt, yopt) {},
        
        postprocess: function(xopt, yopt){
            
            this.data.value = this.data.metric;
            
            this.svg.datum(this.data)
                //.transition().duration(1200)
                .call(this.chart);
                this.cbk(xopt, yopt);
        },
        

        onExpertDataChange: function() {
            if(this.svg.style('display') === 'none'){
                return;
            }
            var xopt=this.options[this.params.X], 
                yopt=this.options[this.params.Y];
                
            this.data.expert = this.filterExpertData(xopt, yopt);
            this.svg.datum(this.data)
                //.transition().duration(1200)
                .call(this.chart.expertchart);
            },
            
        filterData: function(xopt, yopt) {
            // this.data = nvFilter(this.composer.mdims[yopt], xopt, this.composer);
            var metric = this.composer.activeData.params.options.metric,
                uvs = this.activeData.params.metrics[metric].dims,
                fn = this.composer.metricFunctions[metric],
                val, 
                data = {};
                
            // map the cross-filtered data to x, y, value objects
            // If needed, create new objects for the extra-dimensions
            data.points = this.composer.mdims['metric'].top(Infinity);
            
            for (i in uvs) {
                opt = uvs[i];
            
                if (this.fields[opt].domain != undefined) {
                    if ((opt === xopt) || (opt === yopt)) {
                        var tmpdata = data.points;
                        data.points = [];        
                        var ra = d3.range(this.fields[opt].domain[0], this.fields[opt].domain[1], this.fields[opt].step);
                        for (p in tmpdata) {
                            for (var x in ra){
                                var np = {}; np[opt] = ra[x];
                                data.points.push($.extend({}, tmpdata[p], np));
                                }
                            }
                        }
                    else {
                        val = this.fields[opt].value;
                        data.points.forEach(function(o) {o[opt] = val ;});
                        }
                    }
                }
            
            data.xValues = _.unique(data.points.map(function(d) {return +d[xopt];})).sort(function(a, b) {
                        return a-b;
                });
            data.yValues = _.unique(data.points.map(function(d) {return +d[yopt];})).sort(function(a, b) {
                        return a-b;
                });
            
                
            // we will sort on the two dimensions to maintain location of
            // data-points and make for smooth transitions
            data.points = data.points.map(function(o) {
                return {x:o[xopt], y:o[yopt], value:fn(o), lever:(o.lever!==undefined)?o.lever:"", info:o.info};
            }).sort(function(a, b) {
                if(a.x === b.x){
                    return a.y < b.y?-1:1;
                }
                return a.x < b.x?1:-1;
            });
            
            return data;
        },
        
        filterExpertData: function(xopt, yopt) {
            
            var data = {};
            var ds = this.options.expert.value; 
            var win = this;
            
            
            // We only want to plot values that are defined on the x or y axes. 
            data.points = this.composer.emdims[xopt].top(Infinity)
                .filter(function(o) {
                    return (o[xopt] !== undefined) || (o[yopt] !== undefined);
                });
//            console.log(data.points);

            data.points.forEach(function(o) {
                o.x = o[xopt]; 
                o.y = o[yopt]; 
                o.meta = [];
                win.params.config[o.expert].metaDims.forEach(function(d) {
                    o.meta.push({key:d, value:o[d]});
                });
                o.coord = [];
                win.params.config[o.expert].dims.forEach(function(d) {
                    o.coord.push({key:d, value:o[d]});
                });
            });
            
            return data;
            },
        
        cbk: function(xopt, yopt) {},
    });
       
    ouranos.RegretMapWindow = Object.create(ouranos.HeatMapWindow); 
    
     $.extend(ouranos.RegretMapWindow, {
        
        post_build: function() {
            this.svg.attr('id', 'regretmap'); 
        },
                
        preprocess: function(xopt, yopt) {
            this.update_lever_selector();
        },    
        
        postprocess: function(xopt, yopt){
        // Compute regret from metric.
        // opt: selected lever
        console.log("Regret Post-processing"); 
        var m, subset, out,
            that=this, 
            metric = this.data.metric; 
            
        out = {}
        out.points = [];
        out.xValues = metric.xValues;
        out.yValues = metric.yValues;
        
        
        
        // Find maximum value
        metric.xValues.forEach(function(x) {
            metric.yValues.forEach(function(y) {
                // Subset of values for x and y (multiple levers)
                subset = _.filter(metric.points, {'x':x, 'y':y});
                
                // Object maximizing metric
                m = _.max(subset, 'value');
                
                out.points.push({'x':x, 'y':y, 'lever':m.lever, 'value': m.value - _.filter(subset, {'lever':that.options.lever})[0].value});
        })}); 
        
        this.data.value = out; 
        this.svg.datum(this.data)
            //.transition().duration(1200)
            .call(this.chart);
            this.cbk(xopt, yopt);

        },
        
                
        update_lever_selector: function() {
        
            var lev; 
            
            var options = _.sortBy(this.fields.lever.value).map(function(d) {
                lev = _.filter(ouranos.config.levers, {'key':d})[0];
                return {"label":lev.name , "value":d}});
                
            if (!_.includes(this.fields.lever.value, this.options.lever)) {
                this.options.lever = _.first(this.fields.lever.value);
            }
            this.composer.getWindow("select-options").build({options:options, value:this.options.lever}); 
        },
        
             
         }
         )
     
     
     
}(window.ouranos = window.ouranos || {}, _));






/*******************************************************************************
/* Global vars
/******************************************************************************/
var
    vw, vh,                                             // Vars to stock viewport height and width
    $panels = $('#app .panels-wrapper'),                // Panels DOM
    $uncertainties = $panels.find('#uncertainties'),    // Uncertainties DOM
    $levers = $panels.find('#levers'),                  // Levers DOM
    $metrics = $panels.find('#metrics'),                // Metrics DOM
    $experts = $panels.find('#experts'),                // Experts DOM
    $main_graph = $('#main'),							// Main zone that show graph
    $sliders = $('#slider-body'),						// Sliders zone
	$main_graph_btns = $('#main-select');				// Graph selection buttons

var
	spacing_between_graph_and_sliders = 30;				// The spacing between the graph zone and the sliders zone


/*******************************************************************************
/* Viewport size
/******************************************************************************/
// Init viewport size vars
init_viewport_size_vars();

function init_viewport_size_vars() {
    set_viewport_size_vars();

    $(window).on('resize', function () {
        set_viewport_size_vars();
    });
}

// Set viewport size vars
function set_viewport_size_vars() {
    vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    set_left_panel_height();
	set_graph_height();
}


/*******************************************************************************
/* Adjust left panel height to fill the viewport height.
/******************************************************************************/

function set_left_panel_height() {
    // Calculate available spacing
    console.log("Set panel height");
    var panel_position = $panels.position();

    var spacing_available = vh - panel_position.top - 1;
	
    spacing_available = spacing_available -
        $uncertainties.find('.panel-body').outerHeight() -
        $levers.find('.panel-body').outerHeight() -
        $metrics.find('.panel-body').outerHeight() - 
        $experts.find('.panel-body').outerHeight();
	
	// If the spacing_available is under 0, this means that there is no spacing to add.
	// Reset to 0.
	if (spacing_available <= 0) {
		spacing_available = 0;
	}
	
	var spacing_available_leftover = spacing_available % 4;
    spacing_available = parseInt(spacing_available / 4);
	
    // Add the spacing to the panels
    $uncertainties.css('height', $uncertainties.find('.panel-body').outerHeight() + spacing_available + spacing_available_leftover);
    $levers.css('height', $levers.find('.panel-body').outerHeight() + spacing_available);
    $metrics.css('height', $metrics.find('.panel-body').outerHeight() + spacing_available);
    $experts.css('height', $experts.find('.panel-body').outerHeight() + spacing_available);
}



/*******************************************************************************
/* Set the height to the main graph to fill the viewport size.
/******************************************************************************/

function set_graph_height() {
    // Calculate available spacing
    console.log("Set graph height");
    
	// Calculate available height
	var graph_position = $main_graph.position();
    var new_height = vh - graph_position.top - $sliders.outerHeight() - spacing_between_graph_and_sliders;
	
	// Set new height
	$main_graph.css('height', new_height);
}



/*******************************************************************************
/* Points of interests.
/******************************************************************************/
jQuery(document).ready(function($){
	// Show the interest point.
	$('#start-points-interest').on('click', function(evt) {
		evt.preventDefault();
		var $this = $(this);
		
		if ($this.parent().hasClass('active')) {
			$('#cd-points-interest').fadeOut();
			$(window).unbind('resize', set_points_interest_position);
			
			$this.parent().removeClass('active');
			
		} else {
			set_points_interest_position();
			$(window).bind('resize', set_points_interest_position);
			
			$('#cd-points-interest').fadeIn();
			$(this).parent().addClass('active');
		}
	});
	
	// Open interest point description.
	$('.cd-single-point').children('a').on('click', function(){
		var selectedPoint = $(this).parent('li');
		if( selectedPoint.hasClass('is-open') ) {
			//selectedPoint.removeClass('is-open').addClass('visited');
			selectedPoint.removeClass('is-open');
		} else {
			//selectedPoint.addClass('is-open').siblings('.cd-single-point.is-open').removeClass('is-open').addClass('visited');
			selectedPoint.addClass('is-open').siblings('.cd-single-point.is-open').removeClass('is-open');
		}
	});
	
	// Close interest point description.
	$('.cd-close-info').on('click', function(event){
		event.preventDefault();
		//$(this).parents('.cd-single-point').eq(0).removeClass('is-open').addClass('visited');
		$(this).parents('.cd-single-point').eq(0).removeClass('is-open');
	});
});

// Adjust the position of the points of interest
function set_points_interest_position() {
	var
		$cd_menu_left = $('#cd-menu-left'),
		$cd_sliders = $('#cd-sliders'),
		$cd_graph = $('#cd-graph'),
		$cd_graphbuttons = $('#cd-graphbuttons'),
		point_half_height = 22,
		point_half_width = 22;
	
	// Point #1: Menu at left
	var panels_offset = $panels.offset();
	
	$cd_menu_left.css('left', ($panels.width() / 2) - (point_half_width) );
	$cd_menu_left.css('top', panels_offset.top - 36 + ($panels.height() / 2) - (point_half_height) );
	
	// Point #2: Sliders
	var sliders_offset = $sliders.offset();
	
	$cd_sliders.css('left', parseInt($sliders.css("padding-left")) + ($sliders.width() / 2) - (point_half_width) );
	$cd_sliders.css('top', sliders_offset.top - 36 + ($sliders.outerHeight() / 2) - (point_half_height) );
	
	// Point #3: Main Graph
	var main_graph_position = $main_graph.position();
	
	$cd_graph.css('left', parseInt($main_graph.css("padding-left")) + ($main_graph.width() / 2) - (point_half_width) );
	$cd_graph.css('top', main_graph_position.top - 36 + ($main_graph.outerHeight() / 2) - (point_half_height) );
	
	// Point #4: Graph Selection Buttons
	var main_graph_btns_offset = $main_graph_btns.offset();
	
	$cd_graphbuttons.css('left', main_graph_btns_offset.left - (point_half_width));
	$cd_graphbuttons.css('top', main_graph_btns_offset.top - 36 + ($main_graph_btns.outerHeight() / 2) -  (point_half_height));
}
