//begin script when window loads
window.onload = setMap;

//set up choropleth map
function setMap(){
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/2025_county_health_rankings_wi.csv"),                    
                    d3.json("data/gz_2010_us_outline.topojson"),                    
                    d3.json("data/gz_2010_us_states.topojson"),
                    d3.json("data/gz_2010_wi_counties.topojson")                   
                    ];    
    Promise.all(promises).then(callback);
};

//Example 1.3 line 4...set up choropleth map
function setMap() {
    // Load TopoJSON files in parallel
    var promises = [
        d3.csv("data/2025_county_health_rankings_wi.csv"),// data[0]
        d3.json("data/gz_2010_us_outline.topojson"), // data[1]
        d3.json("data/gz_2010_us_states.topojson"),  // data[2]
        d3.json("data/gz_2010_wi_counties.topojson") // data[3]
    ];

    Promise.all(promises).then(callback);

    function callback(data) {
        var csvData = data[0],
            outline = data[1],
            states = data[2],
            counties = data[3];

        console.log("outline.objects:", outline.objects);
        console.log("states.objects:", states.objects);
        console.log("counties.objects:", counties.objects);

        // Convert each TopoJSON to GeoJSON.
        outline = topojson.feature(outline, outline.objects.gz_2010_us_outline_500k);
        states = topojson.feature(states, states.objects.gz_2010_us_040_00_500k);
        counties = topojson.feature(counties, counties.objects.gz_2010_us_out_counties);

        // Now each variable is GeoJSON and can be used in a D3 map
        console.log("CSV:", csvData);
        console.log("Converted Outline:", outline);
        console.log("Converted States:", states);
        console.log("Converted Counties:", counties);

    
    }
}
