function createChart() {
  var svg = d3.select("svg#columnChart"),
      margin = {top: 10, right: 80, bottom: 30, left: 40},
      width = +svg.attr("width") - margin.left - margin.right,
      height = +svg.attr("height") - margin.top - margin.bottom,
      g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
console.log(svg)
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

  userInputsArea.unshift(["Layer Name","Area","Thickness","%Area","CPID"])
  userInputsVolume.unshift(["Layer Name","Volume","%Volume","CPID"])
  var data = calculateImpacts(quartzDB, calculateMasses(quartzDensities,userInputsArea,userInputsVolume))
  console.log(data)
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

  function type(d, i, columns) {
    for (i = 1, t = 0; i < columns.length; ++i) t += d[columns[i]] = +d[columns[i]];
    d.total = t;
    return d;
  }

};

function createQuartzTable() {
  
  // Set the dimensions of the canvas / graph
  var margin = {top: 30, right: 20, bottom: 30, left: 50},
      width = 600 - margin.left - margin.right,
      height = 270 - margin.top - margin.bottom;
  
  // Adds the svg canvas
  var svg = d3.select("svg#quartzTable")
      .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
      .append("g")
          .attr("transform", 
                "translate(" + margin.left + "," + margin.top + ")");


  // Get the data
  d3.csv("../quartzdbTable.csv", function(error, data) {
      data.forEach(function(d) {
          d.close = +d.close;
      });

      // Scale the range of the data
    x.domain(d3.extent(data, function(d) { return d.CPID; }));//<=date1
      y.domain([0, d3.max(data, function(d) { return d.close; })]);

      // Add the valueline path.
      svg.append("path")
          .attr("class", "line")
          .attr("d", valueline(data));

      // Add the X Axis
      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      // Add the Y Axis
      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis);

  // The table generation function
  function tabulate(data, columns) {
      var table = d3.select("svg#quartzTable").append("table")
              .attr("style", "margin-left: 250px"),
          thead = table.append("thead"),
          tbody = table.append("tbody");

      // append the header row
      thead.append("tr")
          .selectAll("th")
          .data(columns)
          .enter()
          .append("th")
              .text(function(column) { return column; });

      // create a row for each object in the data
      var rows = tbody.selectAll("tr")
          .data(data)
          .enter()
          .append("tr");

      // create a cell in each row for each column
      var cells = rows.selectAll("td")
          .data(function(row) {
              return columns.map(function(column) {
                  return {column: column, value: row[column]};
              });
          })
          .enter()
          .append("td")
          .attr("style", "font-family: Courier") // sets the font style
              .html(function(d) { return d.value; });
      
      return table;
  }

  // render the table
   var peopleTable = tabulate(data, ["CPID", "Name"]);
   

  });
}