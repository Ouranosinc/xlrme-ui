/* global $, _, crossfilter, d3  */
(function(ouranos,  _) {
    
    /* global _, d3, ouranos */
    // Data of the form (EnergyMetric.csv):
    // lever,dP,dPs,dT,values
    // NoUp,-20,-30,-1,312.8

    'use strict';
    
    // -------------------- UTILITY FUNCTIONS ----------------------- //
    
    // Server name: '' if same as HTML serving site. 
    var apiserver = '';
    
    var build_queryargs = function() {
        var queryargs = {};
        params.metrics[params.options.metric].dims
        .forEach(function(k){
            if (!(k === params.options.X) && !(k === params.options.Y)) {
                queryargs[k] = params.fields[k].value;
                if (k === 'lever') {
                    queryargs[k] = _.sortBy(queryargs[k].slice());
                }
            }
        })
        return queryargs; 
    }
        
    var loadJSON = function( api, queryparams, cbk) {
        
        var url = [apiserver, 'api', api, config.site, config.lang].join('/'); 
        
        if (!_.isEmpty(queryparams)) {
            url = url + '?' + $.param(queryparams, true); // True is for "traditional". It flattens arrays.
            }
        
        console.log("Fetching data: ", url);
        
        d3.json(url)
            //.header("Authorization", "Basic " + btoa('admin:aaa'))
            .get(function(error, data) {
                if (error) {
                    console.log("ERROR: ", error);
                    }
                else {
                    cbk(data);
                }
            });        
    };
    
    ouranos.textFadeIn = function(el, text, duration) {
        duration = typeof duration !== 'undefined'? duration: 500;

        el.transition().duration(duration)
            .style("opacity", 0)
            .transition().duration(duration)
            .style("opacity", 1);
        
    };
    
    /// ------------------------------------------------------------- //
    /// ----------------- CONFIGURATION ----------------------------- //
    /// ------------------------------------------------------------- //
    
    d3.select('#start-points-interest').style('display', 'block');
    
    // ------------------------- CHART TYPES -------------------------//
    var params = {fields:{}, options:{}, metrics:{}};
    var config = {
        "UVOptions": [
            {"label":"x-axis", "value":"X"},
            {"label":"y-axis", "value":"Y"},
            {"label":"Slider 1", "value":"slider1"},
            {"label":"Slider 2", "value":"slider2"},
            {"label":"Slider 3", "value":"slider3"},
            {"label":"Slider 4", "value":"slider4"},
            {"label":"Slider 5", "value":"slider5"}
        ],
    };
    
    config.site = site;
    config.lang = lang;
    
    d3.select("#"+site).classed("active", true); 
    
    
    // -------------------- SIGN-IN --------------------------------- //
    d3.select("#sign-in")
        .on('click', function() {
            ouranos.username = d3.select('#username')[0][0].value;
            ouranos.password = d3.select('#password')[0][0].value;
                        
            // Remember me ?
     
            });
    
    // ------------- Fetch config from API -------------------------- //
    d3.json('/api/config/' + config.site + '/' + config.lang)
    // This is now hard-coded but eventually it will be based on stored variables from the login function.
        //.header("Authorization", "Basic " + btoa('admin:aaa'))
        .get(function(error, apiconfig){
            if (error) {console.log(error)}
            
            config = $.extend(config, apiconfig);
            
            var keysToExpert = ouranos.keysToExpert = {};
            config.expert.forEach(function(m) {
                keysToExpert[m.key] = m;
            });

    // ------- params.fields store the filter fields {key, value} ----//

    params.fields.lever = {key: 'lever', value: config.levers.filter(function (o) {return o.checked;}).map(function(o) {return o.key;})};    

    config.uncertainVariables.forEach(function(uv) {
        params.fields[uv.key] = uv;
        params.fields[uv.key].value = uv.default;
    });

    // --- params.options store the non-filering display options ---- //    
    params.options.chartType = _.pluck(_.filter(config.chartTypes, {'checked':true}), 'key')[0];
          
    params.options.metric = config.metrics.filter(function(o) {return o.checked===true;})[0].key;
    
    params.options.expert = {'key':'expert', 'value':[]};

    // --- params.metrics store the metrics by key --- //
    config.metrics.forEach(function(m) {
        params.metrics[m.key] = m;
    });
    

    ouranos.params = params;
    ouranos.config = config;
    
    /// ------------------------------------------------------------- //
    /// -------------------- END CONFIG ----------------------------- //
    /// ------------------------------------------------------------- //    

    //---------------------- CREATE WINDOWS --------------------------//
    var chart, main, uvs, levers, metrics, expert, chartSelect;  
    
    var uvaxes = function(metric, ct) {
        // Return an array of axes (X, Y, slider1, etc) reflecting the 
        // number of metric dimensions and the axes displayed 
        // by the chart. 
        var axes = _.pluck(_.filter(config.chartTypes, {'key': ct}), 'axes')[0].slice();
        var uvs = _.without(params.metrics[metric].dims, 'lever');
        var n = uvs.length - axes.length;
        
        for (var i=0; i<n; i++) {
            axes.push('slider'+(i+1))
        }
        return axes
    };
    
    var uvdefaults = function(metric, ct) {
        // Return correspondance between axes and uvs. 
        var ax = uvaxes(metric, ct);
        return _.object(_.zip(ax, config.UVOrder.slice(0, ax.length)));
        };
    
    var refresh = function(opt) {
        var win;
        var uvs = params.metrics[opt].dims;
    
        // Current chart type
        var CT = params.options.chartType;
    
        // Build the list of visible axes (X, Y?, sliders)
        var axes = uvaxes(opt, CT);    
        
        // Update visibility of sliders
        sliders.forEach(function(w, i) {
            //var win = app.getWindow(w.frame[0][0].id);
            var o = _.invert(params.options)[w.params.param.key];
            if ((o !== undefined) && (o.slice(0,6) === 'slider')){
                w.show();
                }
            else{
                w.hide();
                }
        });
    
        
        var UVOptions = config.UVOptions.filter(function(d) {return _.includes(axes, d.value)}); 
    
        // Update visibility of select windows
        UVSelects.forEach(function(w, i) {
            w.build({options: UVOptions});
            //w.onDataChange();
            if (_.contains(uvs, w.params.key)===false) {
                w.frame.select('#select_'+w.params.key).style('display', 'none'); //w.hide() hides the entire uncertainty-body.  
            }
        });
        
        set_left_panel_height();
    }
    
    //------------------------- METRICS ------------------------------//
    metrics = Object.create(ouranos.FieldFilterWindow)
        .init({field:{key:'metric', value:params.options.metric}, config:config.metrics, kind:'radio' }); // TODO : base kind on chart type. 
    
    metrics.cbk = function(opt, checked) {
        console.log('Metric callback: ' + opt);
        var met = params.metrics[opt];
        var oldopt = this.param.value; 
                
        var olduvs = _.without(params.metrics[oldopt].dims, 'lever');
        var uvs = _.without(params.metrics[opt].dims, 'lever');
        
        var UVDefaults = uvdefaults(opt, params.options.chartType);
        
        var invopts = _.invert(params.options);
        
        // Remove extra uvs
        _.forEach(_.difference(olduvs, uvs), function(k) {
            delete params.options[_.invert(params.options)[k]];
        });
        
        // Add new uvs
        axes = _.keys(UVDefaults); 
        _.forEach(_.difference(uvs, olduvs), function(k, i) {
            params.options[axes[olduvs.length+i]] = k;
        });
        
        this.param.value = opt;
        params.options.metric = opt;
        
        refresh(opt)
        
        // Recompute graph height and adjust
        set_graph_height();

        this.paramChanged();
        
        var sel = d3.select('#main-title');
        //sel.transition().duration(500).style("opacity", 0);
        sel.text(met.label)
           .append('span')
           .classed('note', true)
           .text(' [' + met.unit + ']');
           
        //sel.transition().duration(500).style("opacity", 1);
            
        // Hide or show chart types depending on whether the metric is lever dependent.
        sel = d3.selectAll('#main-select .leverdependent');
        sel.style('display', (_.include(params.metrics[opt].dims, 'lever'))?'inline-block':'none');    
            
    };
    
    /*---------------------------- LEVERS ----------------------------*/
    levers = Object.create(ouranos.FieldFilterWindow)
        .init({field:params.fields.lever, config:config.levers, kind:'radio'});

    /*----------------------------------------------------------------*/
        
    // UV-SELECTOR options
    // convenience dict
    var keysToUV = ouranos.keysToUV = {};
    config.uncertainVariables.forEach(function(uv) {
        keysToUV[uv.key] = uv;
    });

    // --------------------- SLIDERS -------------------------------- //
    /* There is one slider per UV and we control the visibility
     * of each one instead of creating/destroying them. 
     * */
    var sliders = [];var sel = d3.select("#slider-body");
    _.forEach(config.uncertainVariables, function(uv) {
        sel.append("div")
            .attr("id", "slider_"+uv.key)
            .classed('slider', true);
        
        sliders.push(Object.create(ouranos.SliderWindow).init({param:params.fields[uv.key]}))
    }); 

    var sliderUpdate = function(key) {
        // key is the field key (dP, dT, etc). 
        // if we're switching to slider, rebuild that element
        var w = app.getWindow('slider_'+key);
        var opt = _.invert(params.options)[key];
        if ((opt !== undefined) && (opt.slice(0,6) === 'slider')){
            w.show();
        }
        else {
            w.hide();
        }
    };
    
    var sliderOrder = function() {
        // Order the sliders so that slider_1 is on top. 
        // This screws the internal content of the sliders ...  
        
        var $divs = $("#slider-body div.slider"), fa, fb, sa, sb; 
        
        var OrderedDivs = $divs.sort(function (a, b) {
            fa = a.id.slice(7);
            fb = b.id.slice(7);
            sa = _.invert(params.options)[fa] || 'slide10';
            sb = _.invert(params.options)[fb] || 'slide10';
            return   sa < sb;
        });
        
        $("#slider-body").html(OrderedDivs); 

    };
    /*----------------------------------------------------------------*/
    
    // --------------------- UV SELECTORS --------------------------- //
    var UVSelects = []
    var axes = uvaxes(params.options.metric, params.options.chartType);
    var UVOptions = config.UVOptions.filter(function(d) {return _.includes(axes, d.value)}); 
    
    _.forEach(config.UVOrder, function(k, i) {
        var uv = keysToUV[k];
        var axis = axes[i];
        // If UV is in active metric dimensions, assign axis.
        if (_.includes(params.metrics[params.options.metric].dims, k)){
            params.options[axis] = k;
            }
        
        var win = Object.create(ouranos.SelectWindow).init({
            key:uv.key,
            txt: uv.label,
            options:UVOptions,
            value:axis
        });
                
        // callback for the selector boxes (opt is the axis name, X, Y, slider1)
        win.cbk = function(opt) {
            var opts = params.options;
            console.log('UV callback for ', opt);
            var that = this,
            oldOpt = _.invert(opts)[this.params.key];
            
            // swap this params UI-element with that chosen
            opts[oldOpt] = opts[opt];
            opts[opt] = this.params.key;
            
            // No effect on non-slider window. 
            sliderUpdate(opts[opt]);
            sliderUpdate(opts[oldOpt]);
            
            this.paramChanged();
          
          
            // TODO-Francis: cette function modifie le contenu des divs. Je veux juste les classer en ordre de leur numéro de slider. 
            //sliderOrder(); 
        };
        
        UVSelects.push(win);
    });
    /*----------------------------------------------------------------*/
    
    //------------------------ EXPERT --------------------------------//
    // TODO: Conditional on active metric
    // Check that obj.dims in config.expert is within the metric variables.
    expert = Object.create(ouranos.FieldFilterWindow)
        .init({field:params.options.expert, config:config.expert, kind:'checkbox'});
    
        
//    $.extend(keysToExpert, _.object(_.pluck(apiconfig.expert, 'key'), apiconfig.expert));


    var keysToMetrics = ouranos.keysToMetrics = {};
    config.metrics.forEach(function(m) {
        keysToMetrics[m.key] = m;
    });
    
    
    
    // ----------------------- CHART-TYPE ----------------------------//
    
    // the main chart window
    if(window.debugFlag){
        params.options.chartType = 'DB';
    }

    // DEFINING OUR CHARTS
    // store our chart-types
    /*
     * switch (_.pluck(_.filter(config.chartTypes, {'key':params.options.chartType}), 'levers')[0]) {
        case 'radio':
             params.options.lever = params.fields.lever.value[0];
        case 'checkbox':
             params.options.lever = params.fields.lever.value.slice();
    }
    */
    
    ouranos.charts = {};
    config.chartTypes.forEach(function(o) {
        ouranos.charts[o.key] = ouranos[o.constructor].init(
            _.extend(o, {config:keysToExpert}));
    });
    
 
    chartSelect = Object.create(ouranos.RadioBox).init({
        field: {key:'chartType', value: params.options.chartType},
        config:config.chartTypes,
    });

    // callback from the selector to change display settings of charts
    // The chart selector can destroy and create Y axes. 
    chartSelect.cbk = function(opt) {
        console.log('Chart Selector callback :' + opt);
    
        
        var uvs = _.without(params.metrics[this.options.metric].dims, 'lever');
        
        // Current array of axes
        var oldaxes = uvaxes(params.options.metric, this.param.value);    
        
        // Future array of axes
        var axes = uvaxes(params.options.metric, opt);    
        
        // Find transfer function    
        var next = _.difference(axes, oldaxes); 
        var from = _.difference(oldaxes, axes); 
        
        // Update options
        for (var i=0; i < next.length; i++) {
            params.options[next[i]] = params.options[from[i]];
                        
            // Hide old slider
            sliderUpdate(params.options[from[i]]); 
            delete params.options[from[i]];
            
            // Build new slider
            sliderUpdate(params.options[next[i]]); 
            
        }
        
        
        // TODO: Can the following be replaced by refresh ?
        // Update UVSelector
        var UVOptions = config.UVOptions.filter(function(d) {return _.includes(axes, d.value)}); 
    
        // Update visibility of select windows
        UVSelects.forEach(function(w, i) {
            w.build({options: UVOptions});
            w.onDataChange();
            if (_.contains(uvs, w.params.key)===false) {
                w.frame.select('#select_'+w.params.key).style('display', 'none'); //w.hide() hides the entire uncertainty-body.  
            }
        });    
      

        // Modify the lever kind (radio vs checkbox)
        var kind = _.pluck(_.filter(this.params.config, {'key':opt}), 'levers')[0];
        if (levers.params.kind !== kind ) {
            var sel = d3.selectAll('#lever div.chart-dep')
                .classed(kind, true)
                .classed(levers.params.kind, false);
            sel.selectAll('input')
                .attr('type', kind);
                
            levers.params.kind = kind;
            
            if (kind == 'radio') {
                // If going from checkbox to radio, set the value to the last lever checked. 
                levers.frame.selectAll('div.active').classed('active', false);
                
                levers.frame.select('input[value="'+_.last(levers.field.value)+'"]').node().__onchange(); 
            }
        } 
        // Recompute graph height and adjust
        set_graph_height();
        
        this.paramChanged()
        
        // hide all but selected chart
        _.forEach(ouranos.charts, function(v, k) {
            if(opt === k){
                v.show();
                v.onDataChange();
                v.onExpertDataChange();
            }
            else{
                v.hide();
            }
        });

        
        d3.select('#main-title')
            .text(keysToMetrics[params.options.metric].label)
            .append('span')
            .classed('note', true)
            .text(' [' + keysToMetrics[params.options.metric].unit + ']');
        
        ouranos.textFadeIn(d3.select('#main-title'));

        // any chart-specific changes that need to be made, e.g. the main-title
        var ls = app.getWindow("select-options");
        switch(opt){
            case 'HM':
                ls.hide();
                break;
            case 'LC':
                ls.hide();
                break;
            case 'RG':
                ls.show();
                break;
            }
        
        this.param.value = opt;
        params.options.chartType = opt; 
    };
    
    var lever_selector = Object.create(ouranos.SelectWindow).init({
        key:'lever',
        txt: 'Lever',
        options:{},
        value:""
    });
    
    lever_selector.cbk = function(opt) {
        params.options.lever = +opt;
        ouranos.charts.RG.postprocess();
    }; 
    
    //------ FINISH CREATING WINDOWS


    // MAIN APP/COMPOSER - contains and handles windows

    var app = Object.create(ouranos.App).init({});

    app.init = function() {
        // we create crossfilter dimensions on each field
        console.log("Create crossfilter dimensions"); 
        
        _.forEach(params.fields, function(v, k) {
                app.mdims[k] = app.mdata.dimension(function(o) {return (o.hasOwnProperty(k))?o[k]:'void';});
                if (k !== 'lever') {
                    app.emdims[k] = app.emdata.dimension(function(o) {return o[k];});
                }
        });
        
        app.mdims['metric'] = app.mdata.dimension(function(o) { return o['metric'];});
        app.emdims['expert'] = app.emdata.dimension(function(o) { return o['expert'];});
        
        console.log("Create expert filter dimensions");
        _.forEach(config.expert, function(v,k) {
            if (v.filters !== undefined) {
                v.filters.forEach(function(d) {
                    app.emdims[d.key] = app.emdata.dimension(function(o) {return o[d.key];});
                })
            }
        });
        
        app.edim = app.edata.dimension(function(o) { return o['expert'];});
        
        
        app.mstats = app.mdims['metric'].group();
        app.estats = app.edim.group();
        
        
        
    };



        
    /*----------------------------------------------------------------*/
    /*                    ### DATA FILTER ###                         */
    /*----------------------------------------------------------------*/
    app.onParamChange = function(p) {
        /* Apply filters on data
         * ---------------------
         * Do not abuse this function. It is only meaningful for fields
         * that are common to all datasets. 
         * Also this is meant as a persistent filter. Do not use this 
         * for temporary filtering. 
         * This needs to handle all api data, that is offline data for
         * metric computations and expert advice. 
        */ 
        
        if (p) {console.log("onParamChange for parameter ", p.key, " : ", p.value); }
        
        var that = this;
        /// ----------------- FILTER UPDATE ------------------------- //
        
        if (p && p.key === 'metric'){
            this.mdims[p.key].filter(p.value);
        }
            
        if (p && p.key === 'expert') {
            this.emdims[p.key].filter(function(d){
                return _.contains(p.value, d);});
                
            this.edim.filter(function(d){
                return _.contains(p.value, d);});
        }
            
        else if(p && _.contains(Object.keys(params.fields), p.key)){ 
            
            if(p.key === 'lever'){
                this.mdims[p.key].filter(function(o) {
                    return ((o==='void') || (o === p.value) || (_.contains(p.value, o)));
                });
            }
                
            else {
                this.mdims[p.key].filter(function(o) {
                    return (o==='void') || (+o === p.value) ; //>= p.value - p.dx && +o < p.value + p.dx);
                });
                
                // Expert
                this.emdims[p.key].filter(function(o) {return  o === undefined || ((+o>= p.value - p.dx) && (+o < p.value + p.dx))});
            }
        }
        
        if (p && p.key === 'expert') {
            app.onExpertDataChange();
            return}
        /// --------------------------------------------------------- //
        
        
        if (p) {
            this.activeData.filtered = this.mdims['metric'].top(Infinity);          
            console.log("Filtered: ", p.key, "at", p.value, '->', this.activeData.filtered.length);
        }
        
        
        var n = this.activeData.filtered.length;    // This won't work if its not unique values... 
        var P = this.activeData.params; // Abbrev.
        var metric = P.options.metric;
                
        // Build query argument
        var queryargs = build_queryargs(); 
        
        if (_.endsWith(P.metrics[metric].api, 'slice')) {
            // Request the size of the expected data set
            queryargs.size=true;
            loadJSON(P.metrics[metric].api, queryargs, function(datasize) {
                if (datasize > n) {
                    queryargs.size = false;
                    
                    if (p && p.key === 'lever') {
                            queryargs['lever'] = _.last(P.fields['lever'].value);
                    }
                    
                    // --- Get new metric data ---//        
                    loadJSON(P.metrics[metric].api, queryargs, function(data) {
                        if (data !== undefined && data.length > 0) {
                            //this.fields.source.value = api;
                            data.forEach(function(d) {
                                d['metric'] = metric
                            });
                        }
                        console.log("Size of downloaded data: ", data.length);                    
                        // --- Remove data matching the filter. By definition, it will be replaced by new data --- //
                        // --- This would be true except for the fact that we get one lever at a time ------------ //
                        
                        //console.log("1 - Size of local metric data :", app.mdata.size());
                        if (p && p.key === 'lever') {
                            that.mdims[p.key].filter(function(o) {
                                return ((o===undefined) || (o === queryargs.lever) );
                            });
                        }
                        
                        app.mdata.remove();
                        
                        if(p && p.key === 'lever'){
                            that.mdims[p.key].filter(function(o) {
                                return ((o===undefined) || (o === p.value) || (_.contains(p.value, o)));
                            });
                        }
                        //console.log("2 - Size of local metric data :", app.mdata.size());
                        app.mdata.add(data);
                        console.log("3 - Size of local metric data :", app.mdata.size());
                        app.activeData.filtered = app.mdims['metric'].top(Infinity);    
                        if (p) {
                            console.log("Filtered: ", p.key, "at", p.value, '->', app.activeData.filtered.length);
                        }
                        
                        app.onDataChange();
                    })
                }
                else {
                    app.onDataChange();
                }
            });
        }
        else if (n == 0) {
            loadJSON(P.metrics[metric].api, queryargs, 
                function(data) {
                        if (data !== undefined && data.length > 0) {
                            //this.fields.source.value = api;
                            data.forEach(function(d) {
                                d['metric'] = metric
                            });
                        }
                    app.mdata.add(data);
                    app.activeData.filtered = app.mdims['metric'].top(Infinity); 
                    app.onDataChange();
                })
        }
        else {
            app.onDataChange();
        }
        
        app.onExpertDataChange();
        
    };
    
     
    
    /*----------------------------------------------------------------*/
    /*                     ### METRICS ###                            */
    /*----------------------------------------------------------------*/
    app.metricFunctions = {};
    
    // Climatological Mean Flow Metric
    app.metricFunctions.F = function(obj) {
        if(obj.F){return obj.F;}
        obj.F = 1.0 * obj.values;
        return obj.F;
    };
    
    // Climatological Mean Regulated Flow Metric
    app.metricFunctions.RF = function(obj) {
        if(obj.RF){return obj.RF;}
        switch (obj.values) {
            case -88: 
                obj.info = "Over 10,600 cms more than once";
                obj.RF = NaN;
                break;
            case -77: 
                obj.info = "Under 670 cms for five months";
                obj.RF = NaN;
                break;
            default:
                obj.RF = 1.0 * obj.values;
        }
        
        return obj.RF;
    };
    
    // Mean flow from annual flow
    app.metricFunctions.AF = function(obj) {
        if(obj.AF){return obj.AF;}
        obj.AF = obj.values.reduce(function(a, b) {
            return a + +b;
        },0)/obj.values.length;
        return obj.AF;
    };
    
    // Climatological Mean spill flow 
    app.metricFunctions.S = function(obj) {
        if (obj.S) {return obj.S;}
        obj.S = 1.0 * obj.values;
        return obj.S;
    }
    
    // Climatological Mean Energy Metric
    app.metricFunctions.E = function(obj) {
        if(obj.E){return obj.E;}
        obj.E = obj.values;
        return obj.E;
    };
    
    // Firm Energy
    app.metricFunctions.FE = function(obj) {
        if(obj.FE){return obj.FE;}
        obj.FE = obj.values;
        return obj.FE;
    };
    
    // Spill
    app.metricFunctions.S = function(obj) {
        if(obj.S){return obj.S;}
        obj.S = obj.values;
        return obj.S;
    };
    
    // Drawdown
    app.metricFunctions.DD = function(obj) {
        if(obj.DD){return obj.DD;}
        obj.DD = obj.values;
        return obj.DD;
    };
    
    // Flooded Area
    app.metricFunctions.Area = function(obj) {
        if(obj.Area){return obj.Area;}
        obj.Area = obj.values;
        return obj.Area;
    };
    
    
    // NPV Metric
    // TODO: Compute over transient CC
    function npv(values, ref_values, constr, inservice, amortizement, price_init, lmp, cost, rate) {
        // Net present  value in 2015 M$
        // Parameters
        // ----------
        // values : series of annual energy volumes [GWh]
        // price_init : electricity price in 2015 [$/MWh]
        // price_trend : electricity price trend [%]
        // cost : initial capital cost [$]
        // rate : discount rate [%]
        // amortizement : number of years over which the investment is amortized
        
        // output : net present value [M$]
        
        var Y = _.range(constr, inservice+amortizement);
        
        //--------------------------------------------------------------
        // ------------------------  Energy  ---------------------------
        //--------------------------------------------------------------
        // Construct energy series by appending the historical series 
        // with the future series and filling the hole in between with historical data. 
        var energy = _.takeRight(ref_values, 12*7) // 2004-2010
        energy = energy.concat(_.takeRight(ref_values, 12*7)) // 2004-2010 repeated -> 2011-2017
        energy = energy.concat(values.slice(12*7)) // 2025-2031 repeated -> 2018-2024
        energy = energy.concat(values) //2025-2075
        energy = energy.concat(_.takeRight(values, 12*10)) //2066-2075 -> 2076-2085

        // Energy [GWh]
        var E = energy.slice((constr-2004)*12, (inservice + amortizement - 2004)*12)
        
        //--------------------------------------------------------------
        // ------------------------  Prices  ---------------------------
        //--------------------------------------------------------------
        // Construct the monthly LMP series
        // Years
        var Ylmp = _.keys(config.mon_lmp_series).map(function (d) {return +d});
        Ylmp.push(2015);
        Ylmp.push(2085);
        
        // Monthly LMPs
        var trend = (lmp - 61)/(2050-2015);
        var mon_lmps = _.map(config.mon_lmp_series, function(o) {return _.map(o);});
        mon_lmps.push(config.mon_lmp_factor.map(function(d) {return 61*d}));
        mon_lmps.push(config.mon_lmp_factor.map(function(d) {return (61+trend*70)*d}));
        
        // Interpolator
        var Ilmp = d3.scale
            .linear()
            .domain(Ylmp)
            .range(mon_lmps)
            .interpolate(d3.interpolateArray);
        
        // Create LMP series [$/MWh]
        var LMP = [];
        _.map(Y, function(y) {LMP = LMP.concat( Ilmp(y) )
        });
        //--------------------------------------------------------------
        
        //--------------------  Revenues & Costs  ----------------------
        // Compute cash-flow revenues 
        // exchange rate is set to 1.16
        // 1E3 factor to convert GWh to MWh
        var CF = [];
        for (var i=0; i < E.length; i++) {
            CF.push(E[i] * LMP[i] * 1.16 * 1000);
        }
        for (var i=0; i < (inservice-constr)*12; i++) {
            CF[i] -= cost/(inservice-constr)/12;
        }
                
        // ----------------------  Discount  ---------------------------
        // Monthly discount rate
        var mrate = Math.pow(1+rate/100., 1./12) - 1;
        var net = CF.map(function(d,i) { return d / Math.pow(1.0 + mrate, i)}).reduce(function(a,b){return a + +b;});        
        return net/1E6
        };

    function npv_fms(fut, ref, fut_sq, ref_sq, init, constr, inservice, lmp, cost, rate, amortizement) {
        // Net present  value in 2015 M$
        // Parameters
        // ----------
        // fut : mean monthly energy volumes in the future period [MWh]
        // ref : mean monthly energy volumes in the reference period [MWh]
        // fut_sq : mean monthly energy volumes in the future period under status quo [MWh]
        // ref_sq : mean monthly energy volumes in the referece period under status quo [MWh]
        // init: Start date of the NPV evaluation
        // constr: Construction start date (no revenue until in-service date)
        // inservice: In-service start date
        // lmp : electricity price [$/MWh] in 2015$
        // cost : capital cost at construction date [$]
        // rate : discount rate [%]
        // amortizement : number of years over which the investment is amortized
        
        // output : net present value [M$]
         
        var years = _.range(init, inservice+amortizement);
        
        // Ref-Fut energy interpolator with status quo
        var Isq = d3.scale.linear()
            .domain([1995, 2055])
            .range([ref_sq, fut_sq])
            .interpolate(d3.interpolateArray);
        
        // Ref-Fut energy interpolator with investment
        var Iwi = d3.scale.linear()
            .domain([1995, 2055])
            .range([ref, fut])
            .interpolate(d3.interpolateArray);
        
        // LMP interpolator
        // Observed from 2006 to 2014, then linearly interpolate to UncertainVariable LMP
        // Constant before 2006 at 2006 value. 
        var year_lmp = _.keys(config.mon_lmp_series).map(function (d) {return +d});
        year_lmp.push(2055);
        year_lmp.splice(0, 0, 2000); 
        
        var mon_lmps = _.map(config.mon_lmp_series, function(o) {return _.map(o);});
        mon_lmps.push(config.mon_lmp_factor.map(function(d) {return d*lmp}));
        mon_lmps.splice(0, 0, _.map(config.mon_lmp_series[2006])); 
        
        
        var Ilmp = d3.scale
            .linear()
            .domain(year_lmp)
            .range(mon_lmps)
            .interpolate(d3.interpolateArray);
        
        // Revenue (E in MWh, LMP in $/MWh) - convert US dollars into CAD (1.16)
        function revenue(mon_e, mon_lmp) {
            return _.sum(_.range(12).map(function(i) {return mon_e[i] * mon_lmp[i] * 1.16}));
            }
        
        // Cash flow with status quo and with investment
        var cf_sq = _.map(years, function(y){return revenue(Isq(y), Ilmp(y))});
        var cf_wi = _.map(years, function(y){return revenue(Iwi(y), Ilmp(y))});
        
        var s = constr - init;
        var cf = [];
        years.map(function(y, i) {
            if (y < constr) {cf.push(cf_sq[i])}
            else if (y < inservice) {cf.push(0)}
            else {cf.push(cf_wi[i])}
        })
        cf[s] -= cost; 
        
        // Discount
        var net = cf.map(function(d,i) { return d / Math.pow(1.0 + rate/100., i)}).reduce(function(a,b){return a + +b;});        
        return net/1E6
        
        
    }
        
    loadJSON('mon_lmp_series', {}, function(data){
        // Original data for reference
        config.mon_lmp_series = data;
        
        // Compute the monthly mean
        var mon_mean = [];
        for (var i=1; i <= 12; i++) {
            mon_mean.push( _.reduce(data, function(sum, o) {return sum+o[i];}, 0)/_.size(data));
        }
            
        // Monthly factor: divide each value by the mean and store the resulting array.
        var mean = _.sum(mon_mean) / 12;
        config.mon_lmp_factor = _.map(mon_mean, function(x){return x/mean});
    });
    
    app.metricFunctions.NPV = function(obj) {
        
        var cost = params.fields.lever.specs[obj.lever].cost;
        var constr = params.fields.lever.specs[obj.lever].constr;
        var inservice = params.fields.lever.specs[obj.lever].inservice;
        var amortizement = params.fields.lever.specs[obj.lever].amortizement;
        
        obj.NPV = npv(obj.values, config.mon_ref_energy[obj.lever-1].values, constr, inservice, amortizement, 61, obj.lmp, cost*1E6, obj.rate); 
        return obj.NPV;
        };
        
    app.metricFunctions.IRR = function(obj) {
        
        var cost = params.fields.lever.specs[obj.lever].cost;
        var constr = params.fields.lever.specs[obj.lever].constr;
        var inservice = params.fields.lever.specs[obj.lever].inservice;
        var amortizement = params.fields.lever.specs[obj.lever].amortizement;
        
        var opt_func = function (x) {
            return npv(obj.values, config.mon_ref_energy[obj.lever-1].values, constr, inservice, amortizement, 61, obj.lmp, cost*1E6, x); 
        }
        try {
            obj.IRR = Newton.Solve(opt_func, 0, {"acc":0.001, "start":[3]});
        }
        catch(err) {
            obj.IRR = -99;
        }
        return obj.IRR;
        };
    
        
        
    /*----------------------------------------------------------------*/
    
    
    

    // MAKE THE DATA-CALL AND ADD THE WINDOWS
    // TODO: Change the logic to trigger the data call when the metric is 
    // created. Does this work ? Can the app be created before the data
    // is available ?
    
    loadJSON(keysToMetrics[params.options.metric].api, {dP:0, dT:0, lever:params.fields.lever.value[0]}, function(data){
        
        data.forEach(function(d) {
            d['metric'] = params.options.metric;
        });
        
        console.log("Create app");
        // APP, applying parameters and data
        d3.select('#app').datum({params:params, data:data}).call(app);
        
        // ADD X Uncertainties
        UVSelects.forEach(function(w) {
            app.addWindow(w, 'uncertainties-body');
        });
        
        // ADD L Levers
        app.addWindow(levers, 'levers-body');
        levers.build_spec();
        
        // ADD M Metrics
        app.addWindow(metrics, 'metrics-body');
        
        
        // ADD E Expert Advice
        app.addWindow(expert, 'expert-body');
        // Load all expert data
        config.expert.forEach(function(o) {
            loadJSON(o.api, o.args, function(data) {
                data.forEach(function(d) {
                 d['expert'] = o.key;
                });
            
                app.emdata.add(data);
                app.edata.add(data);
                console.log("Loaded expert data", o.key, '->', app.edata.size());
        
                if (o === config.expert[config.expert.length-1]) { 
                    expert.build_filter();
                }
            })
        });
        
        // ADD C Chart-types
        app.addWindow(chartSelect, 'main-select');
        app.addWindow(lever_selector, 'select-options'); 
        
        // ADD SLIDERS
        _.forEach(sliders, function(w) {
            app.addWindow(w, "slider_"+w.params.param.key);
        });
                
        // ADD MAIN WINDOW to main frame (div with 'main' id)
        // NOTE - add last to let filters take effect
        _.forEach(ouranos.charts, function(v,k) {
            app.addWindow(v, 'main');
        });
        
        // manually trigger callback to change display settings on charts
        chartSelect.cbk(params.options.chartType);
        metrics.cbk(params.options.metric);
       
        set_left_panel_height() 
    });
    
    // Get the monthly DA-LMP values over the reference period.
    // This is only to find the annual cycle. 
    if (_.has(params.metrics, 'NPV_FSP')) {
        // Get the monthly reference values for the energy production.
        _.defer(function() {
                loadJSON(keysToMetrics['NPV_FSP'].api, {dT:0, dP:0, dPs:0}, function(data){
                config.mon_ref_energy = data;}
            )});
        // Load energy for the no upgrade option. 
        _.defer(function() {
                loadJSON(keysToMetrics['NPV_FSP'].api, {lever:0}, function(data){
                config.NPV_FSP_sq = data;}
            )});
    }
    else if (_.has(params.metrics, 'NPV')) {
        // Get the monthly reference values for the energy production.
        _.defer(function() {
                loadJSON(keysToMetrics['NPV'].api, {dT:0, dP:0, dPs:0, dTs:0, dQ:0}, function(data){
                config.mon_ref_energy = data;}
            )});
    };
    
});

}(window.ouranos = window.ouranos || {}, _));


