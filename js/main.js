function setMap(){
    //map size
    var width = 860,
        height = 560;
    //map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    //had to really crank the second parallel value to get the botton of wi horizontal. is this ok? 
    var projection = d3.geoAlbers()
        .rotate([90, 0, 0])
        .center([0, 44.5])
        .parallels([42, 195]) 
        .scale(5500)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath().projection(projection);
    //get data
    var promises = [
        d3.csv("data/2025_county_health_rankings_wi.csv"),
        d3.json("data/gz_2010_us_outline.topojson"),
        d3.json("data/gz_2010_us_states.topojson"),
        d3.json("data/gz_2010_wi_counties.topojson")
    ];
    Promise.all(promises).then(callback);

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
        map.append("path")
            .datum(graticule.outline())
            .attr("class", "gratBackground")
            .attr("d", path);
        //get the csv stuff
        var healthByCounty = {};
        csvData.forEach(function(d){
            healthByCounty[d.county] = d;
        });
        //choropleth, using "Years of Potential Life Lost Rate" as a place holder
        var colorScale = d3.scaleQuantize()
            .domain([0, d3.max(csvData, function(d){ return +d.ypll_rate; })])
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
        map.selectAll(".county")
            .data(countiesGeo.features)
            .enter()
            .append("path")
            .attr("class", "county")
            .attr("d", path)
            .style("fill", function(d){
                var countyName = d.properties.NAME;
                var record = healthByCounty[countyName];
                //had issues with name matches
                if (!record) {
                    console.log("No CSV record for GeoJSON county:", countyName);
                }
                return record ? colorScale(+record.ypll_rate) : "#ccc";
            })
            .style("stroke", "#333")
            .style("stroke-width", 0.5);
        //adds the country outline, saving in case i need to zoom out for some reason
        map.append("path")
            .datum(outlineGeo)
            .attr("class", "outline")
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "#000")
            .style("stroke-width", 0);
    }
}
//run it
window.onload = setMap;
