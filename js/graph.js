function createChart() {
  var svg = d3.select("svg"),
      margin = {top: 10, right: 80, bottom: 30, left: 40},
      width = +svg.attr("width") - margin.left - margin.right,
      height = +svg.attr("height") - margin.top - margin.bottom,
      g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scaleBand()
      .rangeRound([0, width])
      .padding(0.1)
      .align(0.1);

  var y = d3.scaleLinear()
      .rangeRound([height, 0]);

  var z = d3.scaleOrdinal()
      .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

  var stack = d3.stack()
      .offset(d3.stackOffsetExpand);     

  
  // var data = [
  //   {
  //     "Door": "134276",
  //     "Floor": "3372569",
  //     "Glass": "513",
  //     "Impact": "Impact2",
  //     "Roof": "6434",
  //     "Wall": "10000"
  //   },
  //   {
  //     "Door": "543962",
  //     "Floor": "135990",
  //     "Glass": "78",
  //     "Impact": "GWP",
  //     "Roof": "118640",
  //     "Wall": "4296556"
  //   },
  //   {
  //     "Door": "13490276",
  //     "Floor": "3372569",
  //     "Glass": "513",
  //     "Impact": "PED",
  //     "Roof": "6434",
  //     "Wall": "10000"
  //   },
  //   {
  //     "Door": "10000",
  //     "Floor": "10000",
  //     "Glass": "10000",
  //     "Impact": "Cancer",
  //     "Roof": "10607",
  //     "Wall": "854200"
  //   },
  //   {
  //     "Door": "1349076",
  //     "Floor": "3372569",
  //     "Glass": "513",
  //     "Impact": "Impact3",
  //     "Roof": "6434",
  //     "Wall": "10000"
  //   }
  // ]


  d3.csv("../data3.csv", type, function(error, data) {
    if (error) throw error;

    data.sort(function(a, b) { return b[data.columns[1]] / b.total - a[data.columns[1]] / a.total; });

    x.domain(data.map(function(d) { return d.Impact; }));
    z.domain(data.columns.slice(1));

    var serie = g.selectAll(".serie")
      .data(stack.keys(data.columns.slice(1))(data))
      .enter().append("g")
        .attr("class", "serie")
        .attr("fill", function(d) { return z(d.key); });

    serie.selectAll("rect")
      .data(function(d) { return d; })
      .enter().append("rect")
        .attr("x", function(d) { return x(d.data.Impact); })
        .attr("y", function(d) { return y(d[1]); })
        .attr("height", function(d) { return y(d[0]) - y(d[1]); })
        .attr("width", x.bandwidth());

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y).ticks(10, "%"));

    var legend = serie.append("g")
        .attr("class", "legend")
        .attr("transform", function(d) { var d = d[d.length - 1]; return "translate(" + (x(d.data.Impact) + x.bandwidth()) + "," + ((y(d[0]) + y(d[1])) / 2) + ")"; });

    legend.append("line")
        .attr("x1", -6)
        .attr("x2", 6)
        .attr("stroke", "#000");

    legend.append("text")
        .attr("x", 9)
        .attr("dy", "0.35em")
        .attr("fill", "#000")
        .style("font", "10px sans-serif")
        .text(function(d) { return d.key; });
  });

  function type(d, i, columns) {
    for (i = 1, t = 0; i < columns.length; ++i) t += d[columns[i]] = +d[columns[i]];
    d.total = t;
    return d;
  }

};