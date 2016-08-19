var viewport, projects, selectedProject, projectCells, selectedOutputCell, layerNames, layerNamesArea = [], layerNamesVolume = [], needsVolume, userInputsArea=[[],[],[]], userInputsVolume=[[],[],[]];

/**
 * Hide the login page and attach events to the logout button.
 */
function hideLogin() {
  // hide the login button
  $('#login').hide()
  $('#logout').show()
  // attach the event handler to the logout button
  $('#logout').click(showLogin)
}

/**
 * Show the login page and attach events to the login button.
 */
function showLogin() {
  // ensure that the user is logged out and no longer stored on the page
  helpers.logout()
  // show the login button
  $('#login').show()
  $('#logout').hide()
  // attach event handler to the login button
  $('#login').click(function() { helpers.redirectToFluxLogin() })
}

/**
 * Fetch the user's projects from Flux.
 */
function fetchProjects() {
  // get the user's projects from flux (returns a promise)
  getProjects().then(function(data) {
    projects = data.entities
    // for each project, create an option for the select box with
    // the project.id as the value and the project.name as the label
    var options = projects.map(function(project) {
      return $('<div data-value="' + project.id + '" class="item">' + project.name + '</div>')
    })
    // make sure the select box is empty and then insert the new options
    $('.menu.projects').empty().append(options)
    // empty out the project cell (key) select boxes
    $('.menu.keys').empty()
    // attach a function to the select box change event
    $('.menu.projects').on('change', function(e) {
      // find the project that was clicked on, and assign it to the global
      // variable 'selectedProject'
      selectedProject = projects.filter(function(p) { return p.id === e.target.value })[0]
      var c = $('#console')
      c.val('')
      var notificationHandler = function(msg) {
        //write all events to the app console
        c.val(c.val() + msg.type + ': \'' + msg.body.label + '\'\n')
        if (msg.type === "CELL_MODIFIED") {
          //only render when the modification involves the selected output
          if(selectedOutputCell && (selectedOutputCell.id === msg.body.id)) {
            getValue(selectedProject, selectedOutputCell).then(render)
          }
        }
      }
      //listens and responds to changes on flux using our handler
      createWebSocket(selectedProject, notificationHandler)
      // now go fetch the project's cells (keys)
      fetchCells()
    })
  })
}

/**
 * Call fetchCells when project changes.
 */
function onChangeProject(value, text, $e) {
  // find the project that was clicked on, and assign it to the global
  // variable 'selectedProject'
  selectedProject = projects.filter(function(p) { return p.id === value })[0]
  var c = $('#console')
  c.val('')
  var notificationHandler = function(msg) {
  //write all events to the app console
    c.val(c.val() + msg.type + ': \'' + msg.body.label + '\'\n')
    if (msg.type === "CELL_MODIFIED") {
      //only render when the modification involves the selected output
      if(selectedOutputCell && (selectedOutputCell.id === msg.body.id)) {
        getValue(selectedProject, selectedOutputCell).then(render)
      }
    }
  }
  //listens and responds to changes on flux using our handler
  createWebSocket(selectedProject, notificationHandler)
  // now go fetch the project's cells (keys)
  fetchCells()
}

/**
 * Fetch the cells (keys) of the currently selected project from Flux.
 */
function fetchCells() {
  // get the project's cells (keys) from flux (returns a promise)
  getCells(selectedProject).then(function(data) {
    // assign the cells to the global variable 'projectCells'
    projectCells = data.entities
    // for each project, create an option for the select box with
    // the cell.id as the value and the cell.label as the label
    var options = projectCells.map(function(cell) {
      return $('<div data-value="' + cell.id + '" class="item">' + cell.label + '</div>')
    })
    // make sure the select box is empty and then insert the new options
    $('.menu.keys').empty().append(options)
    //clear the display by rendering with null data
    render(null)
  })
}

/**
 * Call render when key changes.
 */
function onChangeKeys(value, text) {
  // find the cell that was clicked on
  selectedOutputCell = projectCells.filter(function(k) { return k.id === value })[0]
  
  if (selectedProject && selectedOutputCell) {
    // get the value of the cell (returns a promise)
    getValue(selectedProject, selectedOutputCell).then(function(data) {
      // and render it
      render(data)
    })
    // get the value of a different data key
    getLayerNames(value)
  }
}

function render(data) {
  //check to see if data is available to render
  if (!data) {
    //empty the display and hide the geometry viewport
    $('#display .content').empty()
    $('#display').show()
    $('#geometry').hide()
  }
  //check to see if the data is a known type of geometry
  else if (FluxViewport.isKnownGeom(data.value)) {
    //add it to the viewport
    viewport.setGeometryEntity(data.value)
    //swap the display types
    $('#geometry').show()
    $('#display').hide()
  } else {
    // not geometry, so figure out how to best render the type
    // check if the value is a number
    var d = parseFloat(data.value)
    // otherwise make it into a string
    if (isNaN(d)) d = JSON.stringify(data.value)
    else d = d + ''
    // calculate the approximate display size for the text
    // based on the ammount of content (length)
    var size = Math.max((1/Math.ceil(d.length/20)) * 3, 0.8)
    // apply the new text size to the content
    $('#display .content').html(d).css('font-size', size+'em')
    // if the content is json
    if (d[0] === '[' || d[0] === '{') {
      // align left
      $('#display .content').css('text-align', 'left')
    } else {
      // align center
      $('#display .content').css('text-align', 'center')
    }
    //swap the display types
    $('#geometry').hide()
    $('#display').show()
  }
}

/**
 * Grab layer names, split by area vs. volume, and use them to populate the "Select Layer" selection boxes.
 */
function getLayerNames(value) {
  // check to see which other key has client name = grasshopper
  var layerKey = projectCells.filter(function(k) { return k.clientName === "grasshopper" && k.id !== value })[0]
  var needsVolumeKey = projectCells.filter(function(k) { return k.label === "FLW_needs volume" })[0]
  // get value of key
  if (selectedProject && layerKey) {
    // get the value of the layerKey (returns a promise)
    getValue(selectedProject, layerKey).then(
      function(response) {
        // attach value of key to variable
        layerNames = response.value

        // get the value of the needsVolume
        getValue(selectedProject, needsVolumeKey).then(function(response) {
          needsVolume = response.value


          //if needsVolume, layerName gets added to layerNamesArea
          for (i=0; i<layerNames.length; i++) {
            if (needsVolume[i]) {
              layerNamesArea.push(layerNames[i])
            }
            else { //else layerName gets added to layerNamesVolume
              layerNamesVolume.push(layerNames[i])
            }
          }

          // attach each value as div within selection drop down
          var optionsArea = layerNamesArea.map(function(name) {
            return $('<div class="item">' + name + '</div>')
          })
          // make sure the select box is empty and then insert the new options
          $('.menu.layers.area').empty().append(optionsArea)

          var optionsVolume = layerNamesVolume.map(function(name) {
            return $('<div class="item">' + name + '</div>')
          })
          // make sure the select box is empty and then insert the new options
          $('.menu.layers.volume').empty().append(optionsVolume)

        })

    })
  }
}

/**
 * Call getAreaVolume when layer changes.
 */
function onChangeLayer(value, name) {
  if (selectedProject && name) {
    // find the parent row
    var parentRow = $(this).closest("tr");
    var td = $(this).closest("td")
    var colIndex = td.parent().children().index(td)
    var rowIndex = td.closest("tbody").children().index(td.parent())

    // find and populate childCell
    getAreaVolume(name).then(function(areaOrVolume) {
      parentRow.find("td.val").text(Math.round(areaOrVolume*100)/100);

      // figure out which table its in
      // and if its in area table, add to area variable
      if (td.closest('table').attr('id')=='areaTable') {
        userInputsArea[rowIndex][colIndex]=name;
        userInputsArea[rowIndex][colIndex+1]=areaOrVolume;
      } else {   // else store in volume variable
        userInputsVolume[rowIndex][colIndex]=name;
        userInputsVolume[rowIndex][colIndex+1]=areaOrVolume;
      }
    });
  }
}

/**
 * Populate the "Area"/"Volume" box.
 */
function getAreaVolume(layerName) {
  //find the index of layerName in layerNames and get the layer of geometry at the same index
  var i = layerNames.indexOf(layerName);
  var areaKey = projectCells.filter(function(k) { return k.label === "FLW_layer surface areas"})[0]
  var volumeKey = projectCells.filter(function(k) { return k.label === "FLW_layer volumes"})[0]  
  // if geometry needs volume, 
  if (selectedProject && layerName) {
    // get the value of the areaKey (returns a promise)
    if (needsVolume[i]) {
      return getValue(selectedProject, areaKey).then(function(response) {
        // attach value of key to variable
        var areas = response.value
        return areas[i];
      });
    } else {
      return getValue(selectedProject, volumeKey).then(function(response) {
        var volumes = response.value
        return volumes[i];
      });
    }
    
  }
}

/**
 * Add CPIDs to dropdown menu
 */
function getCPIDs() {
  var options = CPIDs.map(function(id) {
    return $('<div class="item">' + id + '</div>')
  })
  // make sure the select box is empty and then insert the new options
  $('.menu.ids').empty().append(options)
}

function onChangeCPIDs(value, name) {
  var td = $(this).closest("td")
  var colIndex = td.parent().children().index(td)
  var rowIndex = td.closest("tbody").children().index(td.parent())
  // figure out which table its in
  // and if its in area table, add to area variable
  if ($(this).closest('table').attr('id')=='areaTable') {
    userInputsArea[rowIndex][colIndex]=name;
  } else {   // else store in volume variable
    userInputsVolume[rowIndex][colIndex]=name;
  }
}

/**
 * Add CPIDs to dropdown menu
 */
function onInput(e) {
  var userInput = e.target.value;

  var td = $(this).closest("td")
  var colIndex = td.parent().children().index(td)
  var rowIndex = td.closest("tbody").children().index(td.parent())
  // figure out which table its in
  // and if its in area table, add to area variable
  if ($(this).closest('table').attr('id')=='areaTable') {
    userInputsArea[rowIndex][colIndex]=userInput;
  } else {   // else store in volume variable
    userInputsVolume[rowIndex][colIndex]=userInput;
  }
}

/**
 * Add row when + button is pushed
 */
function addRowArea() {
  userInputsArea.push([]);
  $('#areaTable > tbody:last').append('\
    <tr>\
      <td> <!-- select layer -->\
        <div class="select">\
          <div class="ui fluid search selection dropdown layers">\
            <input type="hidden">\
            <div class="default text">Select Layer</div>\
            <div class="menu layers area"></div>\
            <i class="dropdown icon"></i>\
          </div>\
        </div>\
      </td>\
      <td class="val"></td>\
      <td> <!-- enter thickness -->\
        <div class="ui transparent input">\
          <input type="text" placeholder="Enter Thickness">\
        </div>\
      </td>\
      <td> <!-- enter %area -->\
        <div class="ui transparent input">\
          <input type="text" placeholder="Enter % Area">\
        </div>\
      </td>\
      <td> <!-- select cpid -->\
        <div class="select">\
          <div class="ui fluid search selection dropdown ids">\
            <input type="hidden">\
            <div class="default text">Select CPID</div>\
            <div class="menu ids"></div>\
            <i class="dropdown icon"></i>\
          </div>\
        </div>\
      </td>\
    </tr>');

    // add layernames to dropdown
    var optionsArea = layerNamesArea.map(function(name) {
      return $('<div class="item">' + name + '</div>')
    })
    // make sure the select box is empty and then insert the new options
    $('#areaTable tr:nth-last-child(1) td:first-child .menu.layers.area').empty().append(optionsArea)

    // add CPIDs to dropdown
    var options = CPIDs.map(function(id) {
      return $('<div class="item">' + id + '</div>')
    })
    $('#areaTable tr:nth-last-child(1) td:last-child .menu.ids').empty().append(options)
    
    // refresh dropdown menus
    $('.ui.dropdown.layers').dropdown({onChange: onChangeLayer});
    $('.ui.dropdown.ids').dropdown({onChange: onChangeCPIDs});

    // refresh inputs
    $('#areaTable tr:nth-last-child(1) td .ui.input').on('input', onInput)

}

function addRowVolume() {
  userInputsVolume.push([]);
  $('#volumeTable > tbody:last').append('\
    <tr>\
      <td> <!-- select layer -->\
        <div class="select">\
          <div class="ui fluid search selection dropdown layers">\
            <input type="hidden">\
            <div class="default text">Select Layer</div>\
            <div class="menu layers volume"></div>\
            <i class="dropdown icon"></i>\
          </div>\
        </div>\
      </td>\
      <td class="val"></td>\
      <td> <!-- enter %volume -->\
        <div class="ui transparent input">\
          <input type="text" placeholder="Enter % Volume">\
        </div>\
      </td>\
      <td> <!-- select cpid -->\
        <div class="select">\
          <div class="ui fluid search selection dropdown ids">\
            <input type="hidden">\
            <div class="default text">Select CPID</div>\
            <div class="menu ids"></div>\
            <i class="dropdown icon"></i>\
          </div>\
        </div>\
      </td>\
    </tr>');

    // add layernames to dropdown
    var optionsVolume = layerNamesVolume.map(function(name) {
      return $('<div class="item">' + name + '</div>')
    })
    // make sure the select box is empty and then insert the new options
    $('#volumeTable tr:nth-last-child(1) td:first-child .menu.layers.volume').empty().append(optionsVolume)

    // add CPIDs to dropdown
    var options = CPIDs.map(function(id) {
      return $('<div class="item">' + id + '</div>')
    })
    $('#volumeTable tr:nth-last-child(1) td:last-child .menu.ids').empty().append(options)
    
    // refresh dropdown menus
    $('.ui.dropdown.layers').dropdown({onChange: onChangeLayer});
    $('.ui.dropdown.ids').dropdown({onChange: onChangeCPIDs});

    // refresh inputs
    $('#volumeTable tr:nth-last-child(1) td .ui.input').on('input', onInput)
}

/**
 * Delete row when - button is pushed
 */
function deleteRowArea() {
  userInputsArea.pop();
  $('#areaTable tbody tr:nth-last-child(1)').remove();
}

function deleteRowVolume() {
  userInputsVolume.pop();
  $('#volumeTable tbody tr:nth-last-child(1)').remove();
}


/**
 * Initialize the create cell (key) input + button.
 */
function initCreate() {
  $('#create button').on('click', function(e) {
    // get the input field
    var input = $(e.target).parent().find('input')
    // get the input field value
    var value = input.val()
    // check we have a name
    if (value === '') return
    // check we have a project selected
    if (!selectedProject) return
    // create the cell (key)
    var user = getUser()
    var project = user.getProject(selectedProject.id)

    var dt = project.getDataTable();
    dt.createCell(value, {description: "", value: {"userInputsArea": userInputsArea, "userInputsVolume": userInputsVolume}});
  })
}


/**
 * Initialize the 3D viewport.
 */
function initViewport() {
  // hide the error screen
  $('#view-error').hide()
  // attach the viewport to the #div view
  viewport = new FluxViewport(document.querySelector("#view"))
  // set up default lighting for the viewport
  viewport.setupDefaultLighting()
  // set the viewport background to white
  viewport.setClearColor(0xffffff)
  viewport._renderer._helpersScene.remove(viewport._renderer._helpers)
}


/**
 * Calculate Impacts.
 */
var test1 = [
  [
    "Name",
    "Area",
    "Thickness",
    "Area%",
    "CPID"
  ],
  [
    "Floor",
    127491.2714163956,
    0.3937007874015748,
    0.03280839895013123,
    "CP133"
  ],
  [
    "Floor",
    254982.5428327912,
    4,
    0.3333333333333333,
    "CP036"
  ],
  [
    "Glass",
    390.0506264307599,
    0.12,
    0.01,
    "CP044"
  ],
  [
    "Glass",
    39005.06264307599,
    0.5,
    0.041666666666666664,
    "CP178"
  ]
]
var test2 =[
  [
    "Name",
    "Volume",
    "Volume%",
    "CPID"
  ],
  [
    "Floor",
    127491.2714163956,
    0.3937007874015748,
    "CP133"
  ],
  [
    "Floor",
    254982.5428327912,
    0.3333333333333333,
    "CP036"
  ]
]  


function calculateVolumes(materialAssignmentsWithAreas, materialAssignmentsWithVolumes) {
  // where materialAssignments is a 2D array w/ header
  materialAssignmentsWithAreas[0].push("calculatedVolume");
  materialAssignmentsWithVolumes[0].push("calculatedVolume");
  // calculate volumes for table materials assignments w/o volumes
  for(var m = 1; m < materialAssignmentsWithAreas.length; m++){
      
      // Add (Area * %Area * Thickness) to end of list
      materialAssignmentsWithAreas[m].push(
        materialAssignmentsWithAreas[m][1] * materialAssignmentsWithAreas[m][2] * materialAssignmentsWithAreas[m][3]
      );
  }
  // calculate volumes for table materials assignments w/ volumes
  for(var n = 1; n < materialAssignmentsWithVolumes.length; n++){
    
    // Add (Volume * %Volume) to end of list
    materialAssignmentsWithVolumes[n].push(
      materialAssignmentsWithVolumes[n][1] * materialAssignmentsWithVolumes[n][2]
    );
  }
  var result = [materialAssignmentsWithAreas, materialAssignmentsWithVolumes];
  
  return result;  
};


function calculateMasses(densities, m1, m2)  { // m1 and m2 are the materialAssignments for calculateVolumes
  
  var list1 = calculateVolumes(m1, m2)[0]     // list of material assignments (areas) with calculated volumes appended 
  var list2 = calculateVolumes(m1, m2)[1]     // list of material assignments (volumes) with calculated volumes appended
  var densitiesDict = {};
  for (var i = 1; i < densities.length; i++){
    densitiesDict[densities[i][0]]= densities[i];
  }
  
  // Compile master list of materials with Layer Name, CPID, Volume, Mass
  var result = [ ["Layer Name", "CPID", "Volume", "Mass"] ];
  for (var j = 1; j < list1.length; j++){
    var CPID = list1[j][4];
    var calculatedVolume =  list1[j][5];
    var mass = calculatedVolume * densitiesDict[CPID][3];
    result.push(
      [ list1[j][0], CPID, calculatedVolume, mass ] 
    )
  }
  for (var k = 1; k < list2.length; k++){
    var CPID = list2[k][3];
    var calculatedVolume =  list2[k][4];
    var mass = calculatedVolume * densitiesDict[CPID][3];
    result.push(
      [list2[k][0], CPID, calculatedVolume, mass ] 
    )
  }
  return result;  //  [ [Layer Name, CPID, Volume, Mass ],...]
};


function calculateImpacts(quartzDB, materialsWithMasses) {   // materialsWithMasses is the output of calculateMasses()
 
  var QuartzDBDict = {};
  var LbsInKg =  2.20462;
  
  // turn QuartzDB into dictionaries to allow for better referencing
  for (var y = 1; y < quartzDB.length; y++){
    QuartzDBDict[ quartzDB[y][0] ] = quartzDB[y];
  }
  
  // for every CP in QuartzDB
  for (var i = 1; i < quartzDB.length; i++){
    
    // iterating through LCA data for every CP, converting string values to numbers
    for (var j=0; j < ListLCAImpacts.length; j++) {
      var indexOfImpact = ( quartzDB[0] ).indexOf( ListLCAImpacts[j] ) 
      var value = quartzDB[i][ indexOfImpact ];
      if ( value !== undefined) {  
        // convert all metrics from kg to lbs except for PED, which is measured in MJ
        if (ListLCAImpacts[j] === "Primary Energy Demand (MJ c2g)" || ListLCAImpacts[j] === "Primary Energy Demand IU (MJ c2g)" ||  ListLCAImpacts[j] === "Primary Energy Demand EoL (MJ c2g)" ) {
          quartzDB[i][ indexOfImpact ] = Number(value);
        }
        else if ( value !== undefined) {
          quartzDB[i][ indexOfImpact ] = Number(value) * LbsInKg;
        }

      }  
    }
  }; 
  
  var result = materialsWithMasses;

  for (var d = 0; d < ListLCAImpacts_Imperial.length; d++) {
    result[0].push( ListLCAImpacts_Imperial[d] );   // adding LCA Impacts (Imperial) to the results header
  }
  
  for (var e = 0; e < ListHealthHazards.length; e++) {
    result[0].push( ListHealthHazards[e] );   // adding Health Hazards to the results header
  }

  // iterating through every material assignment
  for (var k = 1; k < result.length; k++) {
      
      var CP = QuartzDBDict[ result[k][1] ] ; // grab the assigned CP from QuartzDB

      for (var z = 0; z < ListLCAImpacts_Imperial.length; z++) {

        var impact = result[0].indexOf( ListLCAImpacts_Imperial[z] )  // grabs the impact index of choice

        // putting n/a in for blank properties
        result[k][ impact ] = "n/a";

        if (result[k][1] !== undefined) { 
        //multiply material mass by LCA data of corresponding CP, divide by lbs in a kg (LCA data is given as kg of impact per kg of product)
          result[k][ impact ] = CP[ quartzDB[0].indexOf( ListLCAImpacts[z] ) ] * result[k][3] / LbsInKg;
        } 
      }
  
      //multiply material by health data for corresponding CP
  
      for (var p = 0; p < ListHealthHazards.length; p++) {

        var hazard = result[0].indexOf( ListHealthHazards[p] )  // grabs the hazard figure of choice
        result[k][ hazard ] = "n/a";

        // creating new columns in the Masses data to append scaled values
        if (result[k][1] !== undefined) { 
          result[k][ hazard ] = CP[ hazard ] * result[k][3];     
        }
      }
  } 

  // Replacing all NaN values as string values  
  for (var a = 1; a < result.length; a++) {
    for (var b = 0; b < result[a].length; b++ ) {
      if ( isNaN( result[a][b] ) === true ) {
        result[a][b].toString();
        // if (result[a][b] === "NaN") {
        //   result[a][b] = "n/a";
        // }
      }
    }
  };

  return result;

}; 

function createChart() {
  var chart = new CanvasJS.Chart("columnChart",
    {
      title:{
      text: "Number of Students in Each Room"   
      },
      animationEnabled: true,
      axisX:{
        title: "Rooms"
      },
      axisY:{
        title: "percentage"
      },
      data: [
      {        
        type: "stackedColumn100",
        name: "Boys",
        showInLegend: "true",
        dataPoints: [
        {  y: 40, label: "Cafeteria"},
        {  y: 10, label: "Lounge" },
        {  y: 72, label: "Games Room" },
        {  y: 30, label: "Lecture Hall" },
        {  y: 21, label: "Library"}                
        ]
      }, {        
        type: "stackedColumn100",        
        name: "Girls",
        showInLegend: "true",
        dataPoints: [
        {  y: 20, label: "Cafeteria"},
        {  y: 14, label: "Lounge" },
        {  y: 40, label: "Games Room" },
        {  y: 43, label: "Lecture Hall" },
        {  y: 17, label: "Library"}                
        ]
      }
      ]
    });

    chart.render();
  };




/**
 * Start the application.
 */
function init() {
  // Check if we're coming back from Flux with the login credentials.
  helpers.storeFluxUser()
  // check that the user is logged in, otherwise show the login page
    .then(function() { return helpers.isLoggedIn() })
    .then(function(isLoggedIn) {
      if (isLoggedIn) {
        // if logged in, make sure the login page is hidden
        hideLogin()
        // initiate dropdown styling from semantic
        $('.ui.dropdown.projects').dropdown({
          onChange: onChangeProject
        });        
        $('.ui.dropdown.keys').dropdown({
          onChange: onChangeKeys
        });
        $('.ui.dropdown.layers').dropdown({
          onChange: onChangeLayer
        });
        $('.ui.dropdown.ids').dropdown({
          onChange: onChangeCPIDs
        });
        $('table .ui.input').on('input', onInput)

        $('button.button.area.plus').click(addRowArea);
        $('button.button.volume.plus').click(addRowVolume);

        $('button.button.area.minus').click(deleteRowArea);
        $('button.button.volume.minus').click(deleteRowVolume);

        $('#bar .item.button').click(function(e) {
          var $e = $(e.target)
          var hasClass = $e.hasClass('active')
          
          // remove all active classes from items
          $('#bar .item.button').removeClass('active')

          // remove all active classes from tabs
          $('#content .tab').removeClass('active')
          
          if (!hasClass) {
            $e.addClass('active')
            var type = $e.data('id')
            $('#content .tab.'+type).addClass('active')
          }

        })
        // hide display by default
        $('#display').hide()
        // init key creation
        initCreate()
        // create the viewport
        initViewport()
        // get the user's projects from Flux
        fetchProjects()
        // populate CPIDs dropdown
        getCPIDs()
        // create column chart
        createChart()

      } else {
        showLogin();
      }
    })
}

// When the window is done loading, start the application.
window.onload = init
