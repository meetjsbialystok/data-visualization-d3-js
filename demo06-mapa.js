var width = 960,
    height = 1160;

// var projection = d3.geo.albersUsa()
// var projection = d3.geo.azimuthalEqualArea()
// var projection = d3.geo.azimuthalEquidistant()
// var projection = d3.geo.conicEqualArea()
// var projection = d3.geo.conicConformal()
// var projection = d3.geo.conicEquidistant()
// var projection = d3.geo.equirectangular()
// var projection = d3.geo.gnomonic()
   var projection = d3.geo.mercator()
// var projection = d3.geo.orthographic()
// var projection = d3.geo.stereographic()
// var projection = d3.geo.transverseMercator()

projection.center([20, 52])
          .scale(3000)
          .translate([400, 350]);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var tooltip = d3.select("#tooltip");

var TRANSITION_TIME = 400;


function place_id (d) {
  return d.poczta + ", woj. " + d.wojewodztwo;
}


var peoples_to_cities = function (peoples) {
  var dict = {};
  var d, county_city;
  for (var i = 0; i < peoples.length; i++) {
    d = peoples[i];
    county_city = place_id(d);
    if (county_city in dict) {
      dict[county_city].peoples_count += 1;
    } else {
      dict[county_city] = {peoples_count: 1, lng: +d.lng, lat: +d.lat};
    }
  }
  var res = [];
  for (var k in dict) {
    d = dict[k];
    res.push({county_city: k, peoples_count: d.peoples_count, lng: d.lng, lat: d.lat})
  };
  return res.sort(function (a, b) {
    return b.peoples_count - a.peoples_count;
  });
}


var peoples_to_cities_count = function (peoples) {
  var dict = {};
  var d, county_city;
  for (var i = 0; i < peoples.length; i++) {
    d = peoples[i];
    county_city = place_id(d);
    if (county_city in dict) {
      dict[county_city] += 1;
    } else {
      dict[county_city] = 1;
    }
  }
  return dict;
}


var peoples_in_domain = function (peoples) {
  var dict = {};
  var d;
  for (var i = 0; i < peoples.length; i++) {
    d = peoples[i];
    dziedzina = d.dziedzina;
    if (dziedzina in dict) {
      dict[dziedzina].peoples_count += 1;
    } else {
      dict[dziedzina] = {peoples_count: 1};
    }
  }
  var res = [];
  for (var k in dict) {
    d = dict[k];
    res.push({dziedzina: k, peoples_count: d.peoples_count})
  };
  return res.sort(function (a, b) {
    return b.peoples_count - a.peoples_count;
  });
}


var peoples_in_domain_count = function (peoples) {
  var dict = {};
  var d;
  for (var i = 0; i < peoples.length; i++) {
    d = peoples[i];
    dziedzina = d.dziedzina;
    if (dziedzina in dict) {
      dict[dziedzina] += 1;
    } else {
      dict[dziedzina] = 1;
    }
  }
  return dict;
}


d3.json("demo06-poland_woj.topo.json", function(error_poland, poland_data) {
  d3.csv("demo06-data.csv", function(error_dem, people_data) {
    begin_viz(poland_data, people_data);
  })
});


function begin_viz (poland_data, people_data) {

  svg.append("g").attr("id", "polska")
    .selectAll("path")
      .data(topojson.feature(poland_data, poland_data.objects.poland_woj).features)
      .enter()
        .append("path")
        .attr("id", function(d) { return d.id; })
          .attr("d", path)
          .attr("class", "county");

  var lata = [];
  for (var rok = 1999; rok < 2016; rok++) lata.push(String(rok)); 
  lata.push("ALL");

  var lata = svg.append("g").attr("id","lata").selectAll(".year")
        .data(lata)

  lata.enter()
          .append("text")
            .attr("class", "year")
            .on("mouseover", function (d) {
              lata
                .attr("y", function (c) {
                  return c == d ? 65 : 50;
                })
                .classed("selected", function (c) {
                  return c == d;
                })
              if (d === "ALL") 
                refresh_year(people_data);
              else
                refresh_year(people_data.filter(function (c) { return c.rok === d; }));
            })
            .attr("x", function (d, i) { return 30 + 45 * i; })
            .attr("y", function (d) {
              return d === "2004" ? 65 : 50;
            })
            .text(function (d) { return d; });

  refresh_year(people_data.filter(function (d) { return d.rok === "2004"; }));

}

function refresh_year (people_data_rok) {

  var miasta = svg.selectAll('.city')
    .data(peoples_to_cities(people_data_rok), function(d) {return d.county_city; });

  miasta.enter()
    .append("circle")
      .attr("class", "city")
      .attr("cx", function (d) { return projection([d.lng, d.lat])[0]; })
      .attr("cy", function (d) { return projection([d.lng, d.lat])[1]; })
      .attr("r", 0)
      .append("title");

  miasta
    .on("mouseover", function (d) {
      show_domains_in_city(dziedziny, people_data_rok, d);
      var pos = projection([d.lng, d.lat]);
      var r = 3 * Math.sqrt(d.peoples_count);
      tooltipShow(
        [d.peoples_count, "w", d.county_city].join(" "),
        pos[0] + 8 - r,
        pos[1] + 16 + r
      );
    })
    .on("mouseout", function (d) {
      show_all_domains(dziedziny);
      tooltipOut();
    });

  miasta.exit()
    .transition().duration(TRANSITION_TIME)
      .attr("r", 0)
      .remove();

  show_all_cities(miasta);

  var dziedziny = svg.selectAll('.group')
    .data(peoples_in_domain(people_data_rok), function (d) { return d.dziedzina; });

  var dziedziny_g = dziedziny.enter()
    .append("g")
      .attr("class", "group")
      .attr("transform", function (d, i) {
        return "translate(700," + (170 + 20 * i) + ")";
       });

  dziedziny_g.append("rect")
    .attr("x", -30)
    .attr("y", -15)
    .attr("width", 180)
    .attr("height", 20)
    .attr("fill", "#888");

  dziedziny_g.append("text")
    .attr("class", "dziedzina_tekst")
    .attr("x", 15);


  dziedziny_g.append("text")
    .attr("class", "dziedzina_licznik")
    .attr("text-anchor", "end");

  dziedziny
    .on("mouseover", function (d) { show_cities_in_domain(miasta, people_data_rok, d); })
    .on("mouseout", function (d) { show_all_cities(miasta); });

  dziedziny.exit()
    .remove();

  show_all_domains(dziedziny);

  dziedziny.transition().duration(TRANSITION_TIME)
    .attr("transform", function (d, i) {
      return "translate(700," + (170 + 20 * i) + ")";
    });

}


function show_all_domains (dziedziny) {

  dziedziny.select(".dziedzina_tekst") //.transition().duration(TRANSITION_TIME)
    .style("opacity", 1)
    .text(function (d) { return d.dziedzina; });

  dziedziny.select(".dziedzina_licznik") //.transition().duration(TRANSITION_TIME)
    .style("opacity", 1)
    .text(function (d) { return d.peoples_count; });

}


function show_domains_in_city (dziedziny, people_data_rok, d) {

  var peoples_part = people_data_rok.filter(function (c) { return place_id(c) == d.county_city; });

  var domains_in_city = peoples_in_domain_count(peoples_part);

  dziedziny.select(".dziedzina_tekst") //.transition().duration(TRANSITION_TIME)
    .style("opacity", function (d) {
      return domains_in_city[d.dziedzina] ? 1 : 0.4;
    });

  dziedziny.select(".dziedzina_licznik") //.transition().duration(TRANSITION_TIME)
    .style("opacity", function (d) {
      return domains_in_city[d.dziedzina] ? 1 : 0.4;
    })
    .text(function (d) {
      return domains_in_city[d.dziedzina] || "";
    });

}


function show_all_cities (miasta) {

  miasta.transition()
    .duration(TRANSITION_TIME)
      .style("opacity", 0.5)
      .attr("r", function (d) { return 3 * Math.sqrt(d.peoples_count); });

}


function show_cities_in_domain (miasta, people_data_rok, d) {

  var peoples_part = people_data_rok.filter(function (c) { return c.dziedzina == d.dziedzina; });

  var cities_in_domain = peoples_to_cities_count(peoples_part);

  miasta.transition()
    .duration(TRANSITION_TIME)
      .style("opacity", 1)
      .attr("r", function (d) { return 3 * Math.sqrt(cities_in_domain[d.county_city] || 0); });

}

function tooltipShow (html, x, y) {
  tooltip
    .style("display", "inline")
    .style("left", x + "px")
    .style("top", y + "px")
    .html(html);
}

function tooltipOut () {
  tooltip
    .style("display", "none");
}