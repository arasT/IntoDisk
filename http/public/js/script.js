/*
  * Contains custom script for this app
*/

// Disable context menu
window.oncontextmenu = function() {
        return false;
};

// Prevent default behavior from changing page on dropped file
window.ondragover = function(e) { e.preventDefault(); return false; };
// NOTE: ondrop events WILL NOT WORK if you do not "preventDefault" in the ondragover event!!
window.ondrop = function(e) { e.preventDefault(); return false; };

// Streams informations from server about file/directory
function getInfoStream(url) {
  var infoStream = new EventSource(url);
  infoStream.onmessage = function(event) {
    var info = JSON.parse(event.data);
    infoStream.close();
    if (info.error) {
      displayMessage(info.error, 'error');
      return false;
    }
    //console.log(info);

    var propertiesTable = createTableInfo(info.properties);
    //console.log(propertiesTable);

    // If the gotten information is about a directory, add button to view corresponding chart
    var propertiesTitle = ['<div class="text-info">',
                    '<span class="glyphicon glyphicon-list"></span> Properties </div>'].join('');
    var propertiesMessage = ["", propertiesTable].join("");
    if (info.properties.type == 'directory') {
      bootbox.dialog({
        title		: propertiesTitle,
        message	:	propertiesMessage,
        buttons : {
          /*showChart : {
            label       : 'Chart',
            className   : 'btn-success button_100px',
            callback    : function() {
              //location.href = '/scan/partialScan/' + info.properties.fullPath;
              location.href = ['/scan/displaySunburst/', info.properties.fullPath].join('');
            }
          },*/
          openLocation : {
            label       : 'Open',
            className   : 'btn-default button_100px',
            callback    : function() {
              /*var url = ['/scan/open/', info.properties.fullPath].join('');
              //location.href = url;
              var openStream = new EventSource(url);
              openStream.onmessage = function(event) {
                var openRes = JSON.parse(event.data);
                openStream.close();
                if (openRes.error) {
                  displayMessage(openRes.error, 'error', '');
                } else {
                  // Do nothing
                }
              };*/

              $.ajax({
          			url					: ['/scan/open/', info.properties.fullPath].join(''),
          			data				: {},
          			success			: function(datas) {
          				if (datas.error) {
          					displayMessage(datas.message, 'error', '');
          				}
          			},
          			dataType		: 'json',
          			timeout 		: 4000,
          			error  			: function() {
          				displayMessage('An unknown error occur!', 'error', '');
          			}
          		});
            }
          }
          /*close    : {
            label       : 'Ok',
            className : 'btn-primary button_100px'
          }*/
        }
      });
    } else {
      bootbox.dialog({
        title		: propertiesTitle,
        message	:	propertiesMessage,
        buttons : {
          openLocation : {
            label       : 'Open',
            className   : 'btn-default button_100px',
            callback    : function() {
              $.ajax({
          			url					: ['/scan/open/', info.properties.fullPath].join(''),
          			data				: {},
          			success			: function(datas) {
          				if (datas.error) {
          					displayMessage(datas.message, 'error', '');
          				}
          			},
          			dataType		: 'json',
          			timeout 		: 4000,
          			error  			: function() {
          				displayMessage('An unknown error occur!', 'error', '');
          			}
          		});
            }
          }
          /*close : {
            label       : 'Ok',
            className : 'btn-primary button_100px'
          }*/
        }
      });
    }
  };
  return true;
}

// Create dialog box with statistic chart
function createChartStat(fullPath, datas) {
  //console.log(datas);

  // Calculate total size
  var totalSize = 0;
  for (var fType in datas) {
    totalSize += datas[fType];
  }

  // Push in list each label and corresponding percentage
  var labelList = [], percentList = [];
  for (var fileType in datas) {
    if (fileType != 'Directory') {
      labelList.push(fileType);
      percentList.push( ((datas[fileType] * 100) / totalSize).toFixed(2) );
    }
  }

  // Create the canvas where to display chart
  var canvasDiv = document.createElement('div');
  var canvas = document.createElement('canvas');
  $(canvas).attr('id', 'canvas');
  $(canvasDiv).append(canvas);

  // Format data to be compatible with the chart
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	var hStatChartData = {
			labels: labelList,
			datasets: [{
				label: 'Stat in %',
				backgroundColor: 'rgba(54, 162, 235, 0.5)',
				borderColor: 'rgb(54, 162, 235)',
				borderWidth: 1,
				data: percentList
			}]
    };

  // Create dialog box where to put the chart
  var propertiesTitle = ['<div class="text-info">',
                  '<span class="glyphicon glyphicon-list"></span> Statistic </div>'].join('');
  bootbox.dialog({
    title		: propertiesTitle,
    message	:	$(canvasDiv)
  });

  // Draw chart
  var ctx = document.getElementById('canvas').getContext('2d');
  window.myHorizontalBar = new Chart(ctx, {
    type: 'horizontalBar',
    data: hStatChartData,
    options: {
      responsive: true,
      legend: {
        display: 'false',
      },
      title: {
        display: true,
        text: fullPath
      }
    }
  });

}

//Get list of full path from server after user was typing at least two characters
function search(inputId, containerResultId, containerloadingImageId) {
  $(inputId).keyup(function(){

    //Set a timeout to make sure that all operations are be done
    setTimeout(function(){
      if ($(inputId).val().length >= 1) {
        var criteria = $(inputId).val();
        //console.log(criteria);

        var dirFileAutoComplete = new autoComplete({
            selector: inputId,
            cache: false,
            minChars: 2,

            //Modify the AJAX function to have an waitting message or animation
            /*source: function(term, response) {
              $.getJSON('/search?criteria=' + term, { q: term },
                  function(data) {response(data);});
            },*/
            source: function(term, response) {
              $.ajax({
                url					: ['/scan/search/', term].join(''),
                //data				: { q: term },
                data				: {},
                beforeSend 	: function(){
                  // Display waiting image before sending the request
                  $(containerloadingImageId).attr('style', 'display:block');
                },
                success			: function(datas) {
                  //Hide the waiting image on success
                  $(containerloadingImageId).attr('style', 'display:none');
                  //response(datas);
                  updateSearchSuggestion(containerResultId, datas, inputId);
                },
                dataType		: 'json',
                timeout 		: 10000,
                error  			: function() {
                  displayMessage('An error occurs, the search make too long time.', 'error', '');
                }
              });
            }

            //Then we update the template to render the autoComplete
            //	Refer to documentation about "Advanced suggestion and custom layout"
            /*renderItem: function (item, search){
                search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
                return ['<div class="autocomplete-suggestion" data-name="', item[0],
                                    '" data-fullPath="', item[1], '" style="height:34px">',
                                    '<span style="width:100%; display:block;" title="', item[1], '">',
                                    item[0].replace(re, "<b>$1</b>"),
                            '<div class="search_fullPath">', item[1], '</div>',
                          '</span>',
                        '</div>'].join('');
            },

            //Redirect to the file details after a selection
            onSelect: function(e, term, item){
                //console.log(item);
                //console.log(item.getAttribute('data-fullPath'));
                var infoUrl = ['/scan/getInfo/', item.getAttribute('data-fullPath')].join('');
                getInfoStream(infoUrl);
            }*/
          });   // End autoComplete
      }
    }, 25);		  // End setTimeout()
  });           // End keyUp()

  //Remove the div suggestion when user click where ever to avoid a lot of div to appears
  $(document).click(function(){
    $('.autocomplete-suggestions').remove();
  });
  //Also remove the div suggestion on "Escape" pressed
  $(document).keyup(function(e) {
   if (e.keyCode == 27) {
      //$('.autocomplete-suggestions').remove();
      $(containerResultId).empty();
    }
  });

}

// Streams path to server and delete the corresponding file/directory
function delFileDirStream(url, confirmPath) {
  var title = ['<div class="text-danger">',
                '<span class="glyphicon glyphicon-warning-sign"></span> Confirm deletion.</div>'].join('');
  var message = ['Do you want to delete \'', confirmPath, '\' ? This cannot be undone!'].join('');
  var callback = function (result) {
    // If user confirm the action
    if (result) {
      var delStream = new EventSource(url);
      delStream.onmessage = function(event) {
        var delRes = JSON.parse(event.data);
        delStream.close();
        if (delRes.error) {
          displayMessage(delRes.error, 'error', '');
        }

        // Display chart for latest scanned path / or default scan page if it was deleted
        displayMessage(delRes.success, 'success', '/scan/displaySunburst/');
      };
    }
  };    //End callback

  // Create the confirm bootbox after all parameters are ready
  displayConfirm(title, message, callback);
}

// Streams path to server and rename the  corresponding file/directory
function renameFileDir(url) {
  bootbox.prompt({
    title       : ['<div class="text-info">',
                    '<span class="glyphicon glyphicon-edit"></span> Enter new name:</div>'].join(''),
    callback  : function(newName) {
      if (newName) {
        if (newName.length > 0) {

          // First check if an file/directory with the same name already exist
          var oldFullPath = url.split('/scan/renameFileDir/')[1];
          var checkNameStream = new EventSource(['/stream/checkFileDir/', oldFullPath, '<>', newName].join(''));
          checkNameStream.onmessage = function(checkRes) {
            var newFileDir = JSON.parse(checkRes.data);
            checkNameStream.close();
            if (newFileDir.isExist == true) {
              displayMessage(['This file/directory "', newName, '" already exist!'].join(''), 'error', '');
            } else {  // Only rename if user gave a non existing name
              var renameStream = new EventSource([url, '<>', newName].join(''));
              renameStream.onmessage = function(event) {
                var renameRes = JSON.parse(event.data);
                renameStream.close();
                if (renameRes.error) {
                  displayMessage(renameRes.error, 'error', '');
                }

                // If the renamed object is a directory, redirect to its chart
                if (newFileDir.type == 'directory') {
                  displayMessage(renameRes.success, 'success', ['/scan/displaySunburst/', newFileDir.path].join(''));
                } else { // Display chart for latest scanned path
                  displayMessage(renameRes.success, 'success', '/scan/displaySunburst/');
                }
              };  // End renameStream
            }
          };      // End checkNameStream
        }         // End newName.length > 0
      }
    }             // End callback
  });             // End prompt

}

/* Streams and display scan status of selected partition to scan
  * partitionToScanList is a list of partition ID
  * partitionsInfoList is a list of object holding information about partition : id, used, total size
  * fileStatContainerId is the id of div where the statistic chart will be displayed
*/
function scanAndDisplayStatus(partitionToScanList, partitionsInfoList, fileStatContainerId) {
  var divIdScannedPart = 0;
  var latestScanState = {}, latestScannedPartInfo = {};

  // Join each item in list with '<>', it will be separated into routes
  var allPartString = partitionToScanList.join('<>');
  var fullScanStream = new EventSource(['/scan/fullScan/', allPartString].join(''));
  //var fullScanStream = new EventSource('/scan/fullScan/' + 'U:');

  // Show dialog box to display status scan
  var scanDialog = bootbox.dialog({
    message: '<div id="scanDialogModal"></div>',
    animate: false,
    closeButton: false
  });

  // Before a scan, refresh the modal content
  $('#scanDialogModal').empty();

  fullScanStream.onmessage = function(event) {
    var fullScanDetails = JSON.parse(event.data);
    //console.log(fullScanDetails);

    // At the begining of each scan, create a container to display status of the scanned partition
    if (fullScanDetails == 'begin') {
      divIdScannedPart += 1;
      var crtStatListasDiv = document.createElement('div');
      var scanPartId = ['scannedPart', divIdScannedPart].join('');
      $(crtStatListasDiv).attr('id', scanPartId);
      $('#scanDialogModal').append(crtStatListasDiv);
    }

    // Get informations about the current scanned partition
    var crtScannedPartInfo = {};
    for (var i=0; i<partitionsInfoList.length; i++) {
      //if (partitionsInfoList[i].fs == fullScanDetails.id) {
      if (partitionsInfoList[i].mount == fullScanDetails.id) {
        crtScannedPartInfo = partitionsInfoList[i];
        break;
      }
    }

    // When one partition is totaly scanned, set the percent to 100%
    //		This workaround is needed because there is sometimes files that cannot be scanned
    //		because of permission reason, so without this workaround the bar will not be 100%
    if (fullScanDetails == 'finish') {
      latestScanState.totalFileSize =  latestScannedPartInfo.used;

      // updateScanPartInfo is defined into barInfo.js
      updateScanPartInfo('#scannedPart' + divIdScannedPart, latestScanState, latestScannedPartInfo);
    }

    // Update informations about the current scanned partition
    // Note: if message is 'end', 'finish', 'begin', 'crtScannedPartInfo.fs' is not defined
    //if(crtScannedPartInfo.fs) {
    if(crtScannedPartInfo.mount) {
      var scanPartInfoId = ['#scannedPart', divIdScannedPart].join('');
      updateScanPartInfo(scanPartInfoId, fullScanDetails, crtScannedPartInfo);
      latestScanState = fullScanDetails;
      latestScannedPartInfo = crtScannedPartInfo;
    }

    // Close dialog status and the stream when all scan are done
    // Then display or update file statistic about scanned partitions
    if (fullScanDetails == 'end') {
      scanDialog.modal('hide');
      fullScanStream.close();

      //displayUpdateFileStat(fileStatContainerId, partitionsInfoList);

      // Refresh the page: the function above don't immediately display the chart for UNKNOWN yet reason
      location.href = '/scan';
    }
  };	// End 'onmessage' event function
}

// Show dialog box that display folder (or partial) scan state
function partialScanDialogBox(pathToScan) {

  // Show dialog box to display status scan
  var scanDialog = bootbox.dialog({
    message: '<div id="scanDialogBox"></div>',
    animate: false,
    closeButton: false
  });

  var streamScanState = new EventSource(['/scan/partialScan/', pathToScan].join(''));
  streamScanState.onmessage = function(event) {
    var scanState = JSON.parse(event.data);

    // Immediately redirect to default page if incorrect path given
    if (scanState == 'incorrect_path') {
      streamScanState.close();
      //location.href = '/scan';

      // Display error message for an incorrect path
      displayMessage(['Incorrect path "', pathToScan, '" !'].join(''), 'error', '');
      scanDialog.modal('hide');
    }

    // Update dialog box content until the end of scan (scanState.state == 'end' or undefined)
    if (!scanState.state) {
    $('#scanDialogBox').empty();
      var pPath = document.createElement('p');
      $(pPath).html(['<b>Path: </b>', scanState.id].join(''));
      var pState = document.createElement('p');
      var totalSize = normalizeSize(scanState.totalFileSize);
      totalSize = ['<b>Total File Size: </b>', totalSize.size.toFixed(2), ' ', totalSize.unit].join('');
      var nbElements = ['<b>Scanned Elements: </b>', normalizeNumber(scanState.nbScannedElts)].join('');
      var stateHtml = [totalSize, ' / ', nbElements].join('');
      $(pState).html(stateHtml);
    $('#scanDialogBox').append(pPath).append(pState);

    } else {

      scanDialog.modal('hide');
      streamScanState.close();
      location.href = ['/scan/displaySunburst/', scanState.scannedPath].join('');
    }
  };
}


// Streams data from server and display or update file statistic into the given container
function displayUpdateFileStat(containerId, partitionsInfo, extensionConfig) {
  $(containerId).empty();

  // Update and get file statistic for each partition
  var fileExtSource = new EventSource('/scan/fileStat');
  fileExtSource.onmessage = function(event) {
    var fileExtStat = JSON.parse(event.data);
    fileExtSource.close();
    //console.log(fileExtStat);

    // Create chart statistic for all scanned partition
    createFileExtChart(fileExtStat, containerId, partitionsInfo, extensionConfig);

  };
}

/* Create chart statistc for partition given into parameter
  * partStat : statistic about all files in partitions (video, document, image, ...)
  * partStatContainerId : Id of the div which will contains all chart
  * partInfo : informations about all partitions (Id, free, total size, used, ...)
  * extensionConfig : informations about files extension and color
*/
function createFileExtChart(partStat, partStatContainerId, partInfo, extensionConfig) {
  //console.log(partInfo);
  //console.log(partStat);
  for (var part in partStat) {

    // Transfrom the stat object to list to make it works with piechart plugin
    var crtStatList = [['xxx', '...']];   // Note: the first items is not used yet
    var crtStatObj = partStat[part];
    //console.log(crtStatObj);
    for (var fileType in crtStatObj) {
      crtStatList.push([fileType, crtStatObj[fileType]]);
    }

    // Transform partition info object to list
    var crtPartInfo = [];
    for (var i=0; i< partInfo.length; i++) {

      // If OS is a Windows, adjust part
      if (part[0] != '/') {
        part = part.substring(0,2);
      }

      //if (part.substring(0,2) == partInfo[i].fs) {
      if (part == partInfo[i].mount) {
        var totalMem = parseInt(partInfo[i].size);
        var freeMem = totalMem - partInfo[i].used;
        var freeMemPercent = (freeMem * 100) / totalMem;
        freeMem = normalizeSize(freeMem);
        freeMem = [freeMem.size.toFixed(2), ' ', freeMem.unit].join('');
        freeMemPercent = normalizeSize(freeMemPercent);
        freeMemPercent = ['Free: ', freeMemPercent.size.toFixed(1), "%"].join('');
        crtPartInfo = [partInfo[i].fs, freeMemPercent, freeMem];
        //crtPartInfo = [partInfo[i].mount, freeMemPercent, freeMem];   // Too long for Linux and Mac
        break;
      }
    }

    // Create div to display chart for the current partition (if it is yet here; ex. USB)
    if (crtPartInfo.length != 0) {
      //console.log(part);
      var crtPartDiv = document.createElement('div');
      //$(crtPartDiv).attr({'id':'piechart'+part.substring(0, 1), 'class':'piechart-container'});
      $(crtPartDiv).attr({'class':'piechart-container'});
      $(partStatContainerId).append(crtPartDiv);

      // Create button to see horizontal chart for the corresponding partition
  		var statIcon = document.createElement("span");
  		$(statIcon).attr({
        "class":"glyphicon glyphicon-list text-info pointerOnHover",
        "style":"float:right; z-index:2;",
        "title":part
      });
      $(statIcon).on('mouseover', function(){
        $(this).attr('style', 'float:right; z-index:2; opacity:0.5;');
      }).on('mouseout', function() {
        $(this).attr('style', 'float:right; z-index:2; opacity:1;');
      }).click(function(e){
        //console.log(e.currentTarget.title);
        var mountedPart = e.currentTarget.title;

        // Display statistic into dialog box;
  			calculStat(mountedPart);
      });
      $(crtPartDiv).append(statIcon);

      // Create pie chart for the current partition
      //$('#piechart'+part.substring(0, 1)).piechart(crtStatList, ['Part U:', 'Used:25.00%', '100.21Gb']);
      //$(crtPartDiv).piechart(crtStatList, ['Part U:', 'Used:25.00%', '100.21Gb']);
      $(crtPartDiv).piechart(crtStatList, crtPartInfo, extensionConfig);


    }

  }

  // Finally define mouse action
  $(".piechart-flatmin").on('mouseenter','.sector-s',hoverState);
	$(".piechart-flatmin").on('mouseleave','.sector-s',hoverState);
	$(".piechart-flatmin").on('click','.sector-s',clickState);
	$(".piechart-flatmin").on('dblclick','.piehole',updateLabel);
}

/*	Create context menu when user right click on an element
  * fullPath : full path of the element
  * type : type of the element ('directory' or undefined for file)
  * tooltipMenu : ID of a hidden div with z-index 10 where to put the contextual menu
*/
function createMenu(fullPath, type, tooltipMenu) {

	$(tooltipMenu).empty();

	var openButton = document.createElement("button");
	$(openButton).attr({"class":"btn btn-default", "style":"text-align:left"});
	var openIcon = document.createElement("span");
	$(openIcon).attr({"class":"glyphicon glyphicon-folder-open"});
	var openText = document.createElement("span");
	$(openText).html("Open").attr("style", "padding-left : 5px");
	$(openButton).append(openIcon).append(openText);
	$(openButton).click(function() {

    // First check if the directory exist yet in HDD (not reference in RAM)
    var checkNameStream = new EventSource(['/stream/checkExist/', fullPath].join(''));
    checkNameStream.onmessage = function(checkRes) {
      var fileDirExist = JSON.parse(checkRes.data);
      checkNameStream.close();
      if (fileDirExist.isExist != true) {
        displayMessage(['\'', fullPath, '\' not found!'].join(''), 'error', '');
      } else {  // Only do action if the file/directory exist

        // Open location
    		$.ajax({
    			url					: ['/scan/open/', fullPath].join(''),
    			data				: {},
    			success			: function(datas) {
    				if (datas.error) {
    					displayMessage(datas.message, 'error', '');
    				}
    			},
    			dataType		: 'json',
    			timeout 		: 4000,
    			error  			: function() {
    				displayMessage('An unknown error occur!', 'error', '');
    			}
    		});
      }
    };          // End checkNameStream

		/*var url = ['/scan/open/', fullPath].join('');
		//location.href = url;
		var openStream = new EventSource(url);
		openStream.onmessage = function(event) {
			var openRes = JSON.parse(event.data);
			openStream.close();
			if (openRes.error) {
				displayMessage(openRes.error, 'error', '');
			} else {
				// Do nothing
			}
		};*/

	});

	var renameButton = document.createElement("button");
	$(renameButton).attr({"class":"btn btn-default", "style":"text-align:left"});
	var renameIcon = document.createElement("span");
	$(renameIcon).attr({"class":"glyphicon glyphicon-edit text-success"});
	var renameText = document.createElement("span");
	$(renameText).html("Rename").attr("style", "padding-left : 5px");
	$(renameButton).append(renameIcon).append(renameText);
	$(renameButton).click(function(){

    // First check if the directory exist yet in HDD (not reference in RAM)
    var checkNameStream = new EventSource(['/stream/checkExist/', fullPath].join(''));
    checkNameStream.onmessage = function(checkRes) {
      var fileDirExist = JSON.parse(checkRes.data);
      checkNameStream.close();
      if (fileDirExist.isExist != true) {
        displayMessage(['\'', fullPath, '\' not found!'].join(''), 'error', '');
      } else {  // Only do action if the file/directory exist

        // Stream path of file/directory to rename, renameFileDir() is defined into script.js
    		renameFileDir(["/scan/renameFileDir/" + fullPath].join(""));
      }
    };          // End checkNameStream
	});

	var deleteButton = document.createElement("button");
	$(deleteButton).attr({"class":"btn btn-default", "style":"text-align:left"});
	var deleteIcon = document.createElement("span");
	$(deleteIcon).attr({"class":"glyphicon glyphicon-remove text-danger"});
	var deleteText = document.createElement("span");
	$(deleteText).html("Delete").attr("style", "padding-left : 5px");
	$(deleteButton).append(deleteIcon).append(deleteText);
	$(deleteButton).click(function() {

		// Streams information to server to delete the file/directory according the clicked arc
		//		Note: delFileDirStream(url, confirmPath) is defined into script.js; redirect to url in 2nd param if succeed
		var delFilePath = ["/scan/delFileDir/", fullPath].join("");

		delFileDirStream(delFilePath, fullPath);
	});

	$(tooltipMenu).append(openButton).append(renameButton).append(deleteButton);

	// If the arc is a 'directory', add 'Chart' and 'Statistic' buttons;
	if (type == 'directory') {
		var chartButton = document.createElement("button");
		$(chartButton).attr({"class":"btn btn-default", "style":"text-align:left"});
		var chartIcon = document.createElement("span");
		$(chartIcon).attr({"class":"glyphicon glyphicon-dashboard text-info"});
		var chartText = document.createElement("span");
		$(chartText).html("Chart").attr("style", "padding-left : 5px");
		$(chartButton).append(chartIcon).append(chartText);
		$(chartButton).click(function() {

      // First check if the directory exist yet in HDD (not reference in RAM)
      var checkNameStream = new EventSource(['/stream/checkExist/', fullPath].join(''));
      checkNameStream.onmessage = function(checkRes) {
        var fileDirExist = JSON.parse(checkRes.data);
        checkNameStream.close();
        if (fileDirExist.isExist != true) {
          displayMessage(['\'', fullPath, '\' not found!'].join(''), 'error', '');
        } else {  // Only display chart if the directory exist
          location.href = ['/scan/displaySunburst/', fullPath].join('');
        }
      };          // End checkNameStream
		});

		var statButton = document.createElement("button");
		$(statButton).attr({"class":"btn btn-default", "style":"text-align:left"});
		var statIcon = document.createElement("span");
		$(statIcon).attr({"class":"glyphicon glyphicon-list text-info"});
		var statText = document.createElement("span");
		$(statText).html("Statistic").attr("style", "padding-left : 5px");
		$(statButton).append(statIcon).append(statText);
		$(statButton).click(function() {

      // First check if the directory exist yet in HDD (not reference in RAM)
      var checkNameStream = new EventSource(['/stream/checkExist/', fullPath].join(''));
      checkNameStream.onmessage = function(checkRes) {
        var fileDirExist = JSON.parse(checkRes.data);
        checkNameStream.close();
        if (fileDirExist.isExist != true) {
          displayMessage(['\'', fullPath, '\' not found!'].join(''), 'error', '');
        } else {  // Only display statistic if the directory exist
          calculStat(fullPath);
        }
      };          // End checkNameStream
		});
		$(tooltipMenu).append(chartButton).append(statButton);
	}

	var propertiesButton = document.createElement("button");
	$(propertiesButton).attr({"class":"btn btn-default", "style":"text-align:left"});
	var propertiesIcon = document.createElement("span");
	$(propertiesIcon).attr({"class":"glyphicon glyphicon-plus text-info"});
	var propertiesText = document.createElement("span");
	$(propertiesText).html("Properties").attr("style", "padding-left : 5px");
	$(propertiesButton).append(propertiesIcon).append(propertiesText);
	$(propertiesButton).click(function() {

		// Streams informations about the file/directory according to the clicked arc
		//		Note: getInfoStream(url) is defined into script.js; returns true if succed, else false
		var getInfoResult = getInfoStream(["/scan/getInfo/" + fullPath].join(""));
		//if (getInfoResult) {console.log('Success!');}
	});
	$(tooltipMenu).append(propertiesButton);

}

// Calculate statistic about directory from server, streams response and display it into dialog box
function calculStat(fullPath) {
  $.ajax({
    url					: ["/scan/getStat/" + fullPath].join(""),
    data				: {},
    success			: function(datas) {
      if (datas.error) {
        displayMessage(datas.message, 'error', '');
      } else {
        createChartStat(fullPath, datas);
      }
    },
    dataType		: 'json',
    timeout 		: 10000,
    error  			: function() {
      displayMessage('Statistic calculation take too long!', 'error', '');
    }
  });
}

// Create a confirm bootbox according to given parameter
function displayConfirm(title, message, callback) {
  bootbox.confirm({
    title: title,
    message: message,
    buttons: {
        cancel: {
            label: 'Cancel',
            className: 'btn-success button_100px'
        },
        confirm: {
            label: 'Confirm',
            className: 'btn-danger button_100px'
        }
    },
    callback: callback
  });
}

// Displays error or success dialogue box according to parameter
function displayMessage(msg, status, urlRedirect) {
  var dialogTitle = ['<div class="text-success">',
                      '<span class="glyphicon glyphicon-ok-circle"></span> Success</div>'].join('');
  if (status == 'error') {
    dialogTitle = ['<div class="text-danger">',
                        '<span class="glyphicon glyphicon-remove-circle"></span> Error</div>'].join('');
  }
  bootbox.alert({
    title		: dialogTitle,
    message	:	msg,
    callback: function() {

      // Redirect if a url to redirect was given
      if (urlRedirect && urlRedirect.length > 0) {
        location.href = urlRedirect;
      }
    }
  });
}

// Display a waiting message
function displayWaitingMessage(message) {
  var dialog = bootbox.dialog({
    message: ['<p class="text-center">', message, '</p>'].join(''),
    animate: false,
    closeButton: false
  });
}

// Returns table about file/directory properties according to object giving in parameter
function createTableInfo(properties) {
  var table = document.createElement('table');
  $(table).attr('class', 'table table-condensed');
    var caption = document.createElement('caption');
    $(caption).html(properties.fullPath);
    var tbody = document.createElement('tbody');

      var trName = document.createElement('tr');
        var tdNameLabel = document.createElement('td');
        $(tdNameLabel).html('<b>Name</b>');
        var tdNameValue = document.createElement('td');
        $(tdNameValue).html([': ', properties.name].join(''));
      $(trName).append(tdNameLabel).append(tdNameValue);
      /*var trFullPath = document.createElement('tr');
        var tdFullPathLabel = document.createElement('td');
        $(tdFullPathLabel).html('Full path');
        var tdFullPathValue = document.createElement('td');
        var fullPathHtml = [': ', properties.fullPath].join('');
        $(tdFullPathValue).html(fullPathHtml);
      $(trFullPath).append(tdFullPathLabel).append(tdFullPathValue);*/
      var trSize = document.createElement('tr');
        var tdSizeLabel = document.createElement('td');
        $(tdSizeLabel).html('<b>Size</b>');
        var tdSizeValue = document.createElement('td');
        var normalSize = normalizeSize(properties.size);
        $(tdSizeValue).html([': ', normalSize.size.toFixed(2), ' ', normalSize.unit].join(''));
      $(trSize).append(tdSizeLabel).append(tdSizeValue);
      var trCreateDate = document.createElement('tr');
        var tdCreateDateLabel = document.createElement('td');
        $(tdCreateDateLabel).html('<b>Creation date</b>');
        var tdCreateDateValue = document.createElement('td');
        var creationDate = moment(['', properties.creationDate].join('')).format('LLLL');
        $(tdCreateDateValue).html([': ', creationDate].join(''));
      $(trCreateDate).append(tdCreateDateLabel).append(tdCreateDateValue);
      var trModifDate = document.createElement('tr');
        var tdModifDateLabel = document.createElement('td');
        $(tdModifDateLabel).html('<b>Modification date</b>');
        var tdModifDateValue = document.createElement('td');
        var modificationDate = moment(['', properties.modificationDate].join('')).format('LLLL');
        $(tdModifDateValue).html([': ', modificationDate].join(''));
      $(trModifDate).append(tdModifDateLabel).append(tdModifDateValue);
      var trLastAccessDate = document.createElement('tr');
        var tdLastAccessDateLabel = document.createElement('td');
        $(tdLastAccessDateLabel).html('<b>Last access date</b>');
        var tdLastAccessDateValue = document.createElement('td');
        var lastAccessDate = moment(['', properties.lastAccessDate].join('')).format('LLLL');
        $(tdLastAccessDateValue).html([': ', lastAccessDate].join(''));
      $(trLastAccessDate).append(tdLastAccessDateLabel).append(tdLastAccessDateValue);

    $(tbody).append(trName)
            //.append(trFullPath)
            .append(trSize).append(trCreateDate).append(trModifDate).append(trLastAccessDate);
  $(table).append(caption).append(tbody);

  var divTable = document.createElement('div');
  $(divTable).append(table);

  return $(divTable).html();
}

// Convert size to TB, GB, MB, KB, B
function normalizeSize(size) {
  var normalizedSize = {'size' : 0, 'unit' : 'B'};

  if (size > 1024 * 1024 * 1024 * 1024) {
    normalizedSize.size = size / (1024 * 1024 * 1024 * 1024);
    normalizedSize.unit = "TB";
  }
  else if (size > 1024 * 1024 * 1024) {
    normalizedSize.size = size / (1024 * 1024 * 1024);
    normalizedSize.unit = "GB";
  }
  else if (size > 1024 * 1024) {
    normalizedSize.size = size / (1024 * 1024);
    normalizedSize.unit = "MB";
  }
  else if (size > 1024) {
    normalizedSize.size = size / 1024 ;
    normalizedSize.unit = "KB";
  }
  else {
    normalizedSize.size = size;
    normalizedSize.unit = "B";
  }

  return normalizedSize;
}

/* Improve readability of number above 1000
  * ex: var res = normalizeInteger(12345.678);            => 12'345.678
  * ex: var res = normalizeInteger(12345.678, " ", ",");	=> 12 345,678
*/
function normalizeNumber(number, separator, floatSeparator) {
	var strNumber = '' + number;	  // Cast the number to string to simplify operation
	var chunkNumberList = [];		    // Chunk the number per three figures and save into list
	var strResult = '';
	var sep = '\'', floatSep = '.';	// Specify the default separator and floatSeparator
	var floatPart = '';

	if (separator != undefined) {
		sep = separator;
	}
	if (floatSeparator != undefined) {
		floatSep = floatSeparator;
	}

	// First check if the number is a float, if so separate the float part
	if (strNumber.indexOf(floatSep) != -1) {
		floatPart = strNumber.split(floatSep)[1];
		strNumber = strNumber.split(floatSep)[0];
	}

	if (strNumber.length > 3) {
		while (strNumber > 3) {
			chunkNumberList.push(strNumber.substring(strNumber.length - 3, strNumber.length));
			strNumber = strNumber.substring(0, strNumber.length - 3);
		}
	}
	chunkNumberList.push(strNumber);

	// Assemble each chunk into the list from latest to newest to get the result
	for (var i=(chunkNumberList.length - 1); i >= 0; i--) {
		if (chunkNumberList.length > 0) {
			strResult += chunkNumberList[i];
			if (i > 0 && i < (chunkNumberList.length - 1)) {
				strResult += sep;
			}
		}
	}

	// Finally append the float separator and the float part if the given number is a float
	if (floatPart.length > 0) {
		strResult += floatSep + floatPart;
	}

	return strResult;
}

// Searchs presence of string into an array
function strIsInArray (arrayToCheck, str) {
  for (var i=0; i<arrayToCheck.length; i++) {
    if (arrayToCheck[i] == str) {
      return true;
    }
  }
  return false;
}

/* Display search result into a container
  * containerId : container's Id where to place results list
  * dataList : list of data according to criteria
  * inputId : input field containing criteria of search
*/
function updateSearchSuggestion(containerId, dataList, inputId) {
  $(containerId).empty();

  var criteria = $(inputId).val();
  criteria = criteria.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  var re = new RegExp("(" + criteria.split(' ').join('|') + ")", "gi");

  for (var i=0; i<dataList.length; i++) {

    var resultContainer = document.createElement('div');
      $(resultContainer).attr({
        'class' : 'resultList',
        'style' : ['border-bottom : solid 2px ', dataList[i].Color, ';'].join(''),
      });
      var name = document.createElement('div');
      $(name).attr({'fullPath' : dataList[i].FullPath });
      //$(name).html(dataList[i].Name);
      $(name).html(dataList[i].Name.replace(re, "<b style=\"color:#00BFFF;\">$1</b>"));
      var fullPath = document.createElement('div');
      $(fullPath).attr({
        'class' : 'text-muted',
        'style': 'font-size:10px;'
      }).html(dataList[i].FullPath);
    $(resultContainer).append(name).append(fullPath);

    // Display context menu with 'Chart' ans 'Statistic' for 'directory' type
    if (dataList[i].Type == 'directory') {
      $(resultContainer).on('contextmenu', function(e) {
        $('#searchTooltipMenu').empty();
        var crtFullPath = null;
        try {
          crtFullPath = e.toElement.nextSibling.innerText;

          //createMenu() is defined into script.js; #searchTooltipMenu is created into view (search.pug)
					createMenu(crtFullPath, 'directory', '#searchTooltipMenu');
        } catch(err) {
          crtFullPath = e.toElement.innerText;
          createMenu(crtFullPath, 'directory', '#searchTooltipMenu');
        }

        var topStyle = [(e.pageY-30), "px"].join("");
        var leftStyle = [(e.pageX-180), "px"].join("");
        $('#searchTooltipMenu').attr('style', ['visibility:visible; top: ', topStyle, '; left:', leftStyle, ';'].join(''));
      });
    } else {  // Else display simple context menu
      $('#searchTooltipMenu').empty();
      var crtFullPath = null;
      $(resultContainer).on('contextmenu', function(e) {
        try {
          crtFullPath = e.toElement.nextSibling.innerText;
					createMenu(e.toElement.nextSibling.innerText, 'File', '#searchTooltipMenu');
        } catch(err) {
          crtFullPath = e.toElement.innerText;
          createMenu(e.toElement.innerText, 'File', '#searchTooltipMenu');
        }

        var topStyle = [(e.pageY-30), "px"].join("");
        var leftStyle = [(e.pageX-180), "px"].join("");
        $('#searchTooltipMenu').attr('style', ['visibility:visible; top: ', topStyle, '; left:', leftStyle, ';'].join(''));
      });
    }   // End adding context menu

    $(containerId).append(resultContainer);
  }     // End for loop dataList

}
