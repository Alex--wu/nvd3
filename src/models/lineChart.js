nv.models.lineChart = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var lines = nv.models.line()
        , xAxis = nv.models.axis()
        , yAxis = nv.models.axis()
        , legend = nv.models.legend()
        , interactiveLayer = nv.interactiveGuideline()
        , distX = nv.models.distribution()
        , distY = nv.models.distribution()
        , tooltip = nv.models.tooltip()
        , tooltipX = nv.models.tooltip()
        , tooltipY = nv.models.tooltip()
        ;

    var margin = {top: 30, right: 20, bottom: 50, left: 60}
        , color = nv.utils.defaultColor()
        , width = null
        , height = null
        , container = null
        , showLegend = true
        , showXAxis = true
        , showYAxis = true
        , rightAlignYAxis = false
        , useInteractiveGuideline = false
        , showDistX = false
        , showDistY = false
        , showXTooltip = false
        , showYTooltip = false
        , showMainTooltip = true
        , x
        , y
        , state = nv.utils.state()
        , defaultState = null
        , noData = null
        , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'renderEnd')
        , duration = 250
        ;

    // set options on sub-objects for this chart
    xAxis.orient('bottom').tickPadding(7);
    yAxis.orient('left');
    distX.axis('x').size(3);
    distY.axis('y').size(3);
    tooltip.valueFormatter(function(d, i) {
        return yAxis.tickFormat()(d, i);
    }).headerFormatter(function(d, i) {
        return xAxis.tickFormat()(d, i);
    });
    tooltipX.distance(0).gravity('n').classes('x-nvtooltip').contentGenerator(function (d) {
        if (d === null) {
            return '';
        }
        var span = d3.select(document.createElement("span"));
        span.classed("value", true)
            .html(d.point.x);

        var html = span.node().outerHTML;
        return html;
    });
    tooltipY.distance(0).gravity('e').classes('y-nvtooltip').contentGenerator(function (d) {
        if (d === null) {
            return '';
        }
        var span = d3.select(document.createElement("span"));
        span.classed("value", true)
            .html(d.point.y);

        var html = span.node().outerHTML;
        return html;
    });

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch, duration);

    var stateGetter = function(data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled })
            };
        }
    };

    var stateSetter = function(data) {
        return function(state) {
            if (state.active !== undefined)
                data.forEach(function(series,i) {
                    series.disabled = !state.active[i];
                });
        }
    };

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(lines);
        if (showXAxis) renderWatch.models(xAxis);
        if (showYAxis) renderWatch.models(yAxis);
        if (showDistX) renderWatch.models(distX);
        if (showDistY) renderWatch.models(distY);

        selection.each(function(data) {
            var that = this;

            container = d3.select(this);
            nv.utils.initSVG(container);

            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            chart.update = function() {
                if (duration === 0)
                    container.call(chart);
                else
                    container.transition().duration(duration).call(chart)
            };
            chart.container = this;

            state
                .setter(stateSetter(data), chart.update)
                .getter(stateGetter(data))
                .update();

            // DEPRECATED set state.disableddisabled
            state.disabled = data.map(function(d) { return !!d.disabled });

            if (!defaultState) {
                var key;
                defaultState = {};
                for (key in state) {
                    if (state[key] instanceof Array)
                        defaultState[key] = state[key].slice(0);
                    else
                        defaultState[key] = state[key];
                }
            }

            // Display noData message if there's nothing to show.
            if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }


            // Setup Scales
            x = lines.xScale();
            y = lines.yScale();

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-lineChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-lineChart nv-chart-' + lines.id()).append('g');
            var g = wrap.select('g');

            gEnter.append("rect").style("opacity",0);
            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y nv-axis');
            gEnter.append('g').attr('class', 'nv-linesWrap');
            gEnter.append('g').attr('class', 'nv-distWrap');
            gEnter.append('g').attr('class', 'nv-legendWrap');
            gEnter.append('g').attr('class', 'nv-interactive');

            g.select("rect")
                .attr("width",availableWidth)
                .attr("height",(availableHeight > 0) ? availableHeight : 0);

            // Legend
            if (showLegend) {
                legend.width(availableWidth);

                g.select('.nv-legendWrap')
                    .datum(data)
                    .call(legend);

                if ( margin.top != legend.height()) {
                    margin.top = legend.height();
                    availableHeight = nv.utils.availableHeight(height, container, margin);
                }

                wrap.select('.nv-legendWrap')
                    .attr('transform', 'translate(0,' + (-margin.top) +')')
            }

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            if (rightAlignYAxis) {
                g.select(".nv-y.nv-axis")
                    .attr("transform", "translate(" + availableWidth + ",0)");
            }

            //Set up interactive layer
            if (useInteractiveGuideline) {
                interactiveLayer
                    .width(availableWidth)
                    .height(availableHeight)
                    .margin({left:margin.left, top:margin.top})
                    .svgContainer(container)
                    .xScale(x);
                wrap.select(".nv-interactive").call(interactiveLayer);
            }

            lines
                .width(availableWidth)
                .height(availableHeight)
                .color(data.map(function(d,i) {
                    return d.color || color(d, i);
                }).filter(function(d,i) { return !data[i].disabled }));


            var linesWrap = g.select('.nv-linesWrap')
                .datum(data.filter(function(d) { return !d.disabled }));

            linesWrap.call(lines);

            // Setup Axes
            if (showXAxis) {
                xAxis
                    .scale(x)
                    ._ticks(nv.utils.calcTicksX(availableWidth/100, data) )
                    .tickSize(-availableHeight, 0);

                g.select('.nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + y.range()[0] + ')');
                g.select('.nv-x.nv-axis')
                    .call(xAxis);
            }

            if (showYAxis) {
                yAxis
                    .scale(y)
                    ._ticks(nv.utils.calcTicksY(availableHeight/36, data) )
                    .tickSize( -availableWidth, 0);

                g.select('.nv-y.nv-axis')
                    .call(yAxis);
            }

            //Setup Distribution
            if (showDistX) {
                distX
                    .getData(lines.x())
                    .scale(x)
                    .width(availableWidth)
                    .color(data.map(function (d, i) {
                        return d.color || color(d, i);
                    }).filter(function (d, i) { return !data[i].disabled }));
                gEnter.select('.nv-distWrap').append('g')
                    .attr('class', 'nv-distributionX');
                g.select('.nv-distributionX')
                    .attr('transform', 'translate(0,' + y.range()[0] + ')')
                    .datum(data.filter(function (d) { return !d.disabled }))
                    .call(distX);
            }

            if (showDistY) {
                distY
                    .getData(lines.y())
                    .scale(y)
                    .width(availableHeight)
                    .color(data.map(function (d, i) {
                        return d.color || color(d, i);
                    }).filter(function (d, i) { return !data[i].disabled }));
                gEnter.select('.nv-distWrap').append('g')
                    .attr('class', 'nv-distributionY');
                g.select('.nv-distributionY')
                    .attr('transform', 'translate(' + (rightAlignYAxis ? availableWidth : -distY.size() ) + ',0)')
                    .datum(data.filter(function (d) { return !d.disabled }))
                    .call(distY);
            }

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            legend.dispatch.on('stateChange', function(newState) {
                for (var key in newState)
                    state[key] = newState[key];
                dispatch.stateChange(state);
                chart.update();
            });

            interactiveLayer.dispatch.on('elementMousemove', function(e) {
                lines.clearHighlights();
                var singlePoint, pointIndex, pointXLocation, allData = [];
                data
                    .filter(function(series, i) {
                        series.seriesIndex = i;
                        return !series.disabled;
                    })
                    .forEach(function(series,i) {
                        pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
                        var point = series.values[pointIndex];
                        var pointYValue = chart.y()(point, pointIndex);
                        if (pointYValue != null) {
                            lines.highlightPoint(i, pointIndex, true);
                        }
                        if (point === undefined) return;
                        if (singlePoint === undefined) singlePoint = point;
                        if (pointXLocation === undefined) pointXLocation = chart.xScale()(chart.x()(point,pointIndex));
                        allData.push({
                            key: series.key,
                            value: pointYValue,
                            color: color(series,series.seriesIndex)
                        });
                    });
                //Highlight the tooltip entry based on which point the mouse is closest to.
                if (allData.length > 2) {
                    var yValue = chart.yScale().invert(e.mouseY);
                    var domainExtent = Math.abs(chart.yScale().domain()[0] - chart.yScale().domain()[1]);
                    var threshold = 0.03 * domainExtent;
                    var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value}),yValue,threshold);
                    if (indexToHighlight !== null)
                        allData[indexToHighlight].highlight = true;
                }

                var xValue = xAxis.tickFormat()(chart.x()(singlePoint,pointIndex));
                interactiveLayer.tooltip
                    .position({left: e.mouseX + margin.left, top: e.mouseY + margin.top})
                    .chartContainer(that.parentNode)
                    .valueFormatter(function(d,i) {
                        return d == null ? "N/A" : yAxis.tickFormat()(d);
                    })
                    .data({
                        value: xValue,
                        index: pointIndex,
                        series: allData
                    })();

                interactiveLayer.renderGuideLine(pointXLocation);

                //This is for showing dist
                if(showDistY){
                    container.selectAll('.nv-distributionY .nv-disty')
                        .attr('x2', distY.size());//Clean first
                    if (rightAlignYAxis) {
                        container.selectAll('.nv-distributionY .nv-disty-' + pointIndex)
                            .attr('x2', pointXLocation + distX.size() - availableWidth);
                    } else {
                        container.selectAll('.nv-distributionY .nv-disty-' + pointIndex)
                            .attr('x2', pointXLocation + distX.size());
                    }
                }
                //End of showing dist
            });

            interactiveLayer.dispatch.on('elementClick', function(e) {
                var pointXLocation, allData = [];

                data.filter(function(series, i) {
                    series.seriesIndex = i;
                    return !series.disabled;
                }).forEach(function(series) {
                    var pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
                    var point = series.values[pointIndex];
                    if (typeof point === 'undefined') return;
                    if (typeof pointXLocation === 'undefined') pointXLocation = chart.xScale()(chart.x()(point,pointIndex));
                    var yPos = chart.yScale()(chart.y()(point,pointIndex));
                    allData.push({
                        point: point,
                        pointIndex: pointIndex,
                        pos: [pointXLocation, yPos],
                        seriesIndex: series.seriesIndex,
                        series: series
                    });
                });

                lines.dispatch.elementClick(allData);
            });

            interactiveLayer.dispatch.on("elementMouseout",function(e) {
                lines.clearHighlights();

                if(showDistY){
                    container.selectAll('.nv-distributionY .nv-disty')
                        .attr('x2', distY.size());
                }
            });

            dispatch.on('changeState', function(e) {
                if (typeof e.disabled !== 'undefined' && data.length === e.disabled.length) {
                    data.forEach(function(series,i) {
                        series.disabled = e.disabled[i];
                    });

                    state.disabled = e.disabled;
                }

                chart.update();
            });

            // mouseover needs availableHeight so we just keep scatter mouse events inside the chart block
            lines.dispatch.on('elementMouseover.tooltip', function(evt) {
                if (showMainTooltip)tooltip.data(evt).position(evt.pos).hidden(false);
                if (showXTooltip) {
                    var posX = {
                        left: evt.pos['left'],
                        top: evt.pos['top'] - y(evt.point['y']) + availableHeight
                    };
                    //evt.point.x = xAxis.tickFormat()(lines.x()(evt.point, evt.pointIndex));
                    tooltipX.data(evt).position(posX).hidden(false);
                }
                if (showYTooltip) {
                    var posY = {
                        left: evt.pos['left'] - x(evt.point['x']),
                        top: evt.pos['top']
                    };
                    if (rightAlignYAxis) posY.left = evt.pos['left'] - x(evt.point['x']) + availableWidth;
                    //evt.point.y = yAxis.tickFormat()(lines.y()(evt.point, evt.pointIndex));
                    tooltipY.data(evt).position(posY).hidden(false);
                }
                
                if(showDistX){
                    container.select('.nv-distributionX .nv-series-' + evt.seriesIndex + ' .nv-distx-' + evt.pointIndex)
                        .attr('y1', evt.relativePos[1] - availableHeight);
                }
                if (showDistY) {
                    if (rightAlignYAxis) {
                        container.select('.nv-distributionY .nv-series-' + evt.seriesIndex + ' .nv-disty-' + evt.pointIndex)
                            .attr('x2', evt.relativePos[0] + distX.size() - availableWidth);
                    } else {
                        container.select('.nv-distributionY .nv-series-' + evt.seriesIndex + ' .nv-disty-' + evt.pointIndex)
                            .attr('x2', evt.relativePos[0] + distX.size());
                    }
                }
            });

        });

        renderWatch.renderEnd('lineChart immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    lines.dispatch.on('elementMouseout.tooltip', function(evt) {
        if (showMainTooltip)tooltip.hidden(true);
        if (showXTooltip)tooltipX.hidden(true);
        if (showYTooltip)tooltipY.hidden(true);
        
        if(showDistX){
            container.select('.nv-distributionX .nv-series-' + evt.seriesIndex + ' .nv-distx-' + evt.pointIndex)
                .attr('y1', 0);
        }
        if(showDistY){
            container.select('.nv-distributionY .nv-series-' + evt.seriesIndex + ' .nv-disty-' + evt.pointIndex)
                .attr('x2', distY.size());
        }
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.lines = lines;
    chart.legend = legend;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.distX = distX;
    chart.distY = distY;
    chart.interactiveLayer = interactiveLayer;
    chart.tooltip = tooltip;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        container:  {get: function(){return container;}, set: function(_){container=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        showXAxis:      {get: function(){return showXAxis;}, set: function(_){showXAxis=_;}},
        showYAxis:    {get: function(){return showYAxis;}, set: function(_){showYAxis=_;}},
        showXTooltip:      {get: function(){return showXTooltip;}, set: function(_){showXTooltip=_;}},
        showYTooltip:    {get: function(){return showYTooltip;}, set: function(_){showYTooltip=_;}},
        showMainTooltip:    {get: function(){return showMainTooltip;}, set: function(_){showMainTooltip=_;}},
        showDistX:      {get: function(){return showDistX;}, set: function(_){showDistX=_;}},
        showDistY:    {get: function(){return showDistY;}, set: function(_){showDistY=_;}},
        defaultState:    {get: function(){return defaultState;}, set: function(_){defaultState=_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},

        // deprecated options
        tooltips:    {get: function(){return tooltip.enabled();}, set: function(_){
            // deprecated after 1.7.1
            nv.deprecated('tooltips', 'use chart.tooltip.enabled() instead');
            tooltip.enabled(!!_);
        }},
        tooltipContent:    {get: function(){return tooltip.contentGenerator();}, set: function(_){
            // deprecated after 1.7.1
            nv.deprecated('tooltipContent', 'use chart.tooltip.contentGenerator() instead');
            tooltip.contentGenerator(_);
        }},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        duration: {get: function(){return duration;}, set: function(_){
            duration = _;
            renderWatch.reset(duration);
            lines.duration(duration);
            xAxis.duration(duration);
            yAxis.duration(duration);
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
            legend.color(color);
            lines.color(color);
        }},
        rightAlignYAxis: {get: function(){return rightAlignYAxis;}, set: function(_){
            rightAlignYAxis = _;
            yAxis.orient( rightAlignYAxis ? 'right' : 'left');
            tooltipY.gravity(rightAlignYAxis ? 'w' : 'e');
        }},
        useInteractiveGuideline: {get: function(){return useInteractiveGuideline;}, set: function(_){
            useInteractiveGuideline = _;
            if (useInteractiveGuideline) {
                lines.interactive(false);
                lines.useVoronoi(false);
            }
        }}
    });

    nv.utils.inheritOptions(chart, lines);
    nv.utils.initOptions(chart);

    return chart;
};
