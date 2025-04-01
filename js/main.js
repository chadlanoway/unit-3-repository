(function(){ //<-- this is a neat trick!

    //pseudo-global variables
    var width = 860,
        height = 560;
    var colorScale, healthByCounty, map, projection, path;
    
    //set up choropleth map
    function setMap(){
        //map size
        map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
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
    
    function callback(data) {
        //separate data, turn topojson to geojson, make a graticule
        var csvData     = data[0],
            outlineTopo = data[1],
            statesTopo  = data[2],
            countiesTopo= data[3],
            outlineGeo = topojson.feature(outlineTopo, outlineTopo.objects.gz_2010_us_outline_500k),
            statesGeo  = topojson.feature(statesTopo, statesTopo.objects.gz_2010_us_040_00_500k),
            countiesGeo= topojson.feature(countiesTopo, countiesTopo.objects.gz_2010_us_out_counties),
            graticule = d3.geoGraticule().step([5, 5]);
        //generate and append the graticule outline as a background path
        setGraticule(map, path, graticule);
        //get the csv stuff
        healthByCounty = {};
        csvData.forEach(function(d){
            healthByCounty[d.county] = d;
        });
        //choropleth, using "Years of Potential Life Lost Rate" 
        var ypllValues = csvData.map(function(d) { return +d.ypll_rate; });
        //make 9 classes using Jenks
        var breaks = ss.jenks(ypllValues, 9);

        // make a threshold scale using the breaks
        // had to remove the first break [0] since thats the minimum value
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
    }
    
    function setGraticule(map, path, graticule) {
        //generate and append the graticule outline as a background path
        map.append("path")
            .datum(graticule.outline())
            .attr("class", "gratBackground")
            .attr("d", path);
    }
    
    function setCounties(countiesFeatures, map, path) {
        //draw counties
        map.selectAll(".county")
            .data(countiesFeatures)
            .enter()
            .append("path")
            .attr("class", "county")
            .attr("d", path)
            .each(function(d) {
                var countyName = d.properties.NAME;
                console.log("GeoJSON properties:", d.properties); //second guessing the join
                console.log("CSV data:", healthByCounty[countyName]);
            })
            .style("fill", function(d){
                var countyName = d.properties.NAME;
                var record = healthByCounty[countyName];
                return record ? colorScale(+record.ypll_rate) : "#ccc"; //default
            })
            .style("stroke", "#333")
            .style("stroke-width", 0.5);
    }
    
    //run it
    window.onload = setMap;
    
    })(); //end of self-executing anonymous function
    