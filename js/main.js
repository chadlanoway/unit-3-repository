(function () { //<-- this is a neat trick!

    //pseudo-global variables
    var colorScale, healthByCounty, map, projection, path;
    var expressed = "ypll_rate";

    /**
     * Set up choropleth map
     *
     * Creates an SVG element for the map inside a container, sets up the 
     * geographic projection using d3.geoAlbers with specified parameters, and loads the
     * required CSV and TopoJSON data files. Once all data is loaded, it calls the 
     * `callback` function to further process the data and render the map.
     */
    function setMap() {
        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 460;

        //map size
        map = d3.select(".container")
            .append("svg")
            .attr("class", "map")
            .attr("viewBox", `0 0 ${width} ${height}`);

        //had to really crank the second parallel value to get the botton of wi horizontal. is this ok? 
        projection = d3.geoAlbers()
            .rotate([90, 0, 0])
            .center([0, 44.5])
            .parallels([42, 195])
            .scale(5500)
            .translate([width / 2, height / 2]);

        path = d3.geoPath().projection(projection);
        //get data
        var promises = [
            d3.csv("data/2025_county_health_rankings_wi.csv"),
            d3.json("data/gz_2010_us_outline.topojson"),
            d3.json("data/gz_2010_us_states.topojson"),
            d3.json("data/gz_2010_wi_counties.topojson")
        ];
        Promise.all(promises).then(callback);
    }

    /**
     * Create coordinated bar chart
     * 
     * Sets up an SVG element using a margin, scales the data,
     * draws sorted bars with a color scale, appends a dynamic title, and adds a vertical axis
     * 
     * @param {*} csvData 
     * @param {*} colorScale 
     */
    function setChart(csvData, colorScale) {
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.6,
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        //define margins
        var margin = { top: 40, right: 40, bottom: 40, left: 60 };

        //total SVG dimensions
        var svgWidth = window.innerWidth * 0.6,
            svgHeight = 473;

        //inner dimensions for the chart area
        var chartWidth = svgWidth - margin.left - margin.right,
            chartHeight = svgHeight - margin.top - margin.bottom;

        //make SVG and a group element shifted by the margin values
        var chart = d3.select(".container")
            .append("svg")
            .attr("class", "chart")
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


        //make a rectangle for chart background fill
        chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        csvData.forEach(function (d) {
            //remove commas if needed
            d[expressed] = +d[expressed].replace(/,/g, '');
        });
        var maxVal = d3.max(csvData, function (d) {
            return d[expressed];
        });

        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, maxVal]);

        //draw the bars
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .attr("class", function (d) {
                return "bar " + d.adm1_code;
            })
            //place each bar horizontally
            .attr("x", function (d, i) {
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            //position the bar top edge based on yScale
            .attr("y", function (d) {
                return yScale(+d[expressed]) + topBottomPadding;
            })
            //bar height is the difference between the chart bottom and yScale
            .attr("height", function (d) {
                return chartInnerHeight - yScale(+d[expressed]);
            })
            .style("fill", function (d) {
                return colorScale(+d[expressed]);
            });

        //text element for the chart title
        var titleText = expressed === "ypll_rate" ? "Preventable Loss of Life Rate" : expressed;

        chart.append("text")
            .attr("class", "chartTitle")
            .attr("x", chartInnerWidth / 2)
            .attr("y", 45)
            .attr("text-anchor", "middle")
            .text(titleText + " in each county");


        //vertical axis generator
        var yAxis = d3.axisLeft(yScale)
            .ticks(5)
            .tickFormat(function (d) { return d + " yrs"; });

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //frame for chart border
        chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    }

    /**
     * Processes the loaded CSV and TopoJSON data to render the map and chart.
     *
     * Callback function to convert TopoJSON data into GeoJSON features,
     * generate a graticule, and make a color scale using Jenks
     * classification on the "Years of Potential Life Lost Rate" field from the CSV.
     * It then draws the map elements (graticule, state boundaries, counties, and outline)
     * and finally calls the setChart function to render the coordinated bar chart.
     *
     * @param {Array} data - An array containing the following:
     *   [0]: CSV data,
     *   [1]: TopoJSON for the outline,
     *   [2]: TopoJSON for states,
     *   [3]: TopoJSON for counties.
     */
    function callback(data) {
        //separate data, turn topojson to geojson, make a graticule
        var csvData = data[0],
            outlineTopo = data[1],
            statesTopo = data[2],
            countiesTopo = data[3],
            outlineGeo = topojson.feature(outlineTopo, outlineTopo.objects.gz_2010_us_outline_500k),
            statesGeo = topojson.feature(statesTopo, statesTopo.objects.gz_2010_us_040_00_500k),
            countiesGeo = topojson.feature(countiesTopo, countiesTopo.objects.gz_2010_us_out_counties),
            graticule = d3.geoGraticule().step([5, 5]);
        //generate and append the graticule outline as a background path
        setGraticule(map, path, graticule);
        //get the csv stuff
        healthByCounty = {};
        csvData.forEach(function (d) {
            healthByCounty[d.county] = d;
        });
        //choropleth, using "Years of Potential Life Lost Rate" field
        var ypllValues = csvData.map(function (d) { return +d.ypll_rate; });
        //make 9 classes using Jenks
        var breaks = ss.jenks(ypllValues, 9);

        // make a threshold scale using the breaks
        colorScale = d3.scaleThreshold()
            .domain(breaks.slice(1))
            .range(d3.schemeReds[9]);

        //append graticule (removing later, looks bad)
        map.selectAll(".gratLines")
            .data(graticule.lines())
            .enter()
            .append("path")
            .attr("class", "gratLines")
            .attr("d", path);
        //generate path for state boundaries
        map.append("path")
            .datum(statesGeo)
            .attr("class", "states")
            .attr("d", path)
            .style("stroke", "#333")
            .style("stroke-width", 1);
        //draw counties
        setCounties(countiesGeo.features, map, path);
        //adds the country outline, saving in case i need to zoom out for some reason
        map.append("path")
            .datum(outlineGeo)
            .attr("class", "outline")
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "#000")
            .style("stroke-width", 0);

        setChart(csvData, colorScale);
    }

    /**
     * Generate and append the graticule outline as a background path
     * 
     * @param {*} map 
     * @param {*} path 
     * @param {*} graticule 
     */
    function setGraticule(map, path, graticule) {
        map.append("path")
            .datum(graticule.outline())
            .attr("class", "gratBackground")
            .attr("d", path);
    }

    /**
     * Draw counties
     * 
     * @param {*} countiesFeatures 
     * @param {*} map 
     * @param {*} path 
     */
    function setCounties(countiesFeatures, map, path) {
        map.selectAll(".county")
            .data(countiesFeatures)
            .enter()
            .append("path")
            .attr("class", "county")
            .attr("d", path)
            .each(function (d) {
                var countyName = d.properties.NAME;
            })
            .style("fill", function (d) {
                var countyName = d.properties.NAME;
                var record = healthByCounty[countyName];
                return record ? colorScale(+record.ypll_rate) : "#ccc"; //default color
            })
            .style("stroke", "#333")
            .style("stroke-width", 0.5);
    }

    //run it
    window.onload = setMap;

})(); //end of self-executing anonymous function
