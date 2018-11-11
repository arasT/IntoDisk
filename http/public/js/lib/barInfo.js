/* Create DOM to display informations about file system */
function barFileSystemInfo(containerId, informations, os) {
  var osInfo = os;
  $(containerId).empty();

  // For each file system create its container
  informations.forEach(function(fsInfo) {

    var fsPercent = fsInfo.use.toFixed(2) + '%';
    var barColorClass = '';
    if (fsInfo.use < 25) {
      barColorClass = 'success';
    } else if (fsInfo.use >= 25 && fsInfo.use < 50) {
      barColorClass = 'info';
    } else if (fsInfo.use >= 50 && fsInfo.use < 75) {
      barColorClass = 'warning';
    } else {
        barColorClass = 'danger';
    }
    var fsUsed = normalizeSize(fsInfo.used);
    var fsSize = normalizeSize(fsInfo.size);


    // Container for the current instance: wrap 'details', 'progress bar' and 'action'
    var biContainer = document.createElement('div');
    $(biContainer).attr('class', 'bi-container');

      // Container for 'details' about the current instance
      var biDetailsContainer = document.createElement('div');
      $(biDetailsContainer).attr('class', 'bi-details-container text-muted');
        var fsName = document.createElement('b');
        $(fsName).html(fsInfo.fs);
        //$(fsName).html(fsInfo.mount);
        var fsPercentSpan = document.createElement('span');
        $(fsPercentSpan).html([' ', fsPercent].join(''));
        var iType = document.createElement('i');
        $(iType).html([' (', fsInfo.type, ')'].join('')).attr('style','font-size:10px');
      $(biDetailsContainer).append(fsName).append(fsPercentSpan).append(iType);

      // Container for 'progress bar'
      var biPercentContainer = document.createElement('div');
      $(biPercentContainer).attr('class', 'bi-percent-container');
        var fsProgress = document.createElement('div');   // Div to create progress bar
        $(fsProgress).attr({'class' : 'progress', 'style' : 'margin-bottom:5px'});
          var percent = document.createElement('div');    // Text into the progress bar
          var percentHtml = [fsUsed.size.toFixed(2), ' ', fsUsed.unit,
                                                          ' / ',
                                                          fsSize.size.toFixed(2), ' ', fsSize.unit].join('');
          $(percent).attr({'class':'bi-bar-percent', 'style':'font-size:9px;'}).html(percentHtml);
          var progressBar = document.createElement('div');
          $(progressBar).attr({
            'class'         : ['progress-bar progress-bar-', barColorClass, ' fsBar'].join(''),
            'role'          : 'progressbar',
            'aria-valuemin' : '0',
            'aria-valuemax' : '100',
            'style'         : ['width : ', fsPercent].join('')
          });
        $(fsProgress).append(percent).append(progressBar);
      $(biPercentContainer).append(fsProgress);

      // Container for 'action' button
      var biActionContainer = document.createElement('div');
      $(biActionContainer).attr('class', 'bi-action-container');
        var buttonGroup = document.createElement('div');
        $(buttonGroup).attr('class', 'btn-group btn-group-justified');
          var scanLink = document.createElement('a');
          $(scanLink).attr('class', 'btn-xs btn-default pointerOnHover');
            var scanIcon = document.createElement('span');
            $(scanIcon).attr({
              'class' : 'glyphicon glyphicon-zoom-in',
              'style' : 'title:Scan'
            });
          $(scanLink).append(scanIcon);
          var viewLink = document.createElement('a');
          $(viewLink).attr('class', 'btn-xs btn-default pointerOnHover');
            var viewIcon = document.createElement('span');
            $(viewIcon).attr({
              'class' : 'glyphicon glyphicon-eye-open',
              'style' : 'title:Scan'
            });
          $(viewLink).append(viewIcon);

          /* Action on click on button action */

          // Add a slash for Windows, the path will be normalize in routes
          //		we cannot scan 'C:', we have to scan 'C:\'
          //var partition = fsInfo.fs;
          var partition = fsInfo.mount;
          if (osInfo == 'Windows') {
            //partition += '/';
            partition = [partition, '/'].join('');
          }

          // Scan the corresponding partition on click
          $(scanLink).click(function() {

            // First check if the partition was already scanned
            var checkStream = new EventSource(['/scan/checkScan/', partition].join(''));
            checkStream.onmessage = function(event) {
              var resCheck = JSON.parse(event.data);
              checkStream.close();

              // If so, display a confirm message
              if (resCheck == 'scanned') {
                var title = ['<div class="text-info">',
                              '<span class="glyphicon glyphicon-exclamation-sign"></span> Confirm scan.</div>'].join('');
                var message = ['\'<b> ', fsInfo.fs, ' </b>\' was already scanned! Do you want to rescan it?',
                                '<br>Click on <span class="glyphicon glyphicon-eye-open"></span> to view chart.'].join('');
                /*var message = ['\'<b> ', fsInfo.mount, ' </b>\' was already scanned! Do you want to rescan it?',
                                '<br>Click on <span class="glyphicon glyphicon-eye-open"></span> to view chart.'].join('');*/
                var callback = function (result) {

                  // If user confirm the action, rescan the partition
                  if (result) {
                    //scanAndDisplayStatus([fsInfo.fs], partitionList); // Function defined into script.js
                    scanAndDisplayStatus([fsInfo.mount], partitionList); // Function defined into script.js
                  }
                };

                // Create the confirm bootbox after all parameters are ready
                displayConfirm(title, message, callback);         // Function defined into script.js
              } else {  // If parition was not yet scanned, scan it
                //scanAndDisplayStatus([fsInfo.fs], partitionList);
                scanAndDisplayStatus([fsInfo.mount], partitionList);
              }
            };

          });

          // Display sunburst chart about the corresponding partition on click
          $(viewLink).click(function(){

            // First check if the partition was already scanned
            var checkStream = new EventSource(['/scan/checkScan/', partition].join(''));
            checkStream.onmessage = function(event) {
              var resCheck = JSON.parse(event.data);
              checkStream.close();
              if (resCheck == 'scanned') {
                location.href = ['/scan/displaySunburst/', partition].join('');
              } else {
                var message = ['Please scan this partition first!',
                                '<br>Click on <span class="glyphicon glyphicon-zoom-in"></span> .'].join('');
                displayMessage(message, 'error', '');   // Function defined into script.js
              }
            };

          });

        /* Append defined button */
        $(buttonGroup).append(scanLink).append(viewLink);
      $(biActionContainer).append(buttonGroup);

    $(biContainer).append(biDetailsContainer).append(biPercentContainer).append(biActionContainer);

    // Append the DOM containing informations about the current file system
    $(containerId).append(biContainer);
  });
}

// Update a div displaying informations of scanned partitions
//    scanInfo holds data about scan status and partDetails holds data about the scanned partitions
function updateScanPartInfo(containerId, scanInfo, partDetails) {
  $(containerId).empty();

  var scanPercent = ( (scanInfo.totalFileSize * 100) / partDetails.used ).toFixed(0);
  scanPercent = scanPercent > 100 ? 100 : scanPercent;   // Avoid percentage above 100%
  var totalFileSize = normalizeSize(scanInfo.totalFileSize);

  // Container for description
  var biTitleContainer = document.createElement('div');
  $(biTitleContainer).attr('class', 'text-muted');
    var fsMessageSpan = document.createElement('span');
    $(fsMessageSpan).html('Scanning ');
    var fsName = document.createElement('b');
    $(fsName).html(scanInfo.id);
    var fsPercentSpan = document.createElement('span');
    $(fsPercentSpan).html([' ', scanPercent, '%'].join(''));
  $(biTitleContainer).append(fsMessageSpan).append(fsName).append(fsPercentSpan);

  // Container for 'progress bar'
  var biPercentContainer = document.createElement('div');
    var fsProgress = document.createElement('div');   // Div to create progress bar
    $(fsProgress).attr({'class' : 'progress progress-striped'});
      var percent = document.createElement('div');    // Text on the progress bar
      var nbScannedElts = normalizeNumber(scanInfo.nbScannedElts); // normalizeNumber(nb) is defined into script.js
      var percentHtml = ['Total file size : ', totalFileSize.size.toFixed(2), ' ', totalFileSize.unit,
                          ' / ', ' Scanned Elements : ', nbScannedElts].join('');
      $(percent).attr('class','bi-bar-percent-stream').html(percentHtml);
      var progressBar = document.createElement('div');
      $(progressBar).attr({
        'class'         : 'progress-bar progress-bar-info fsBar',
        'role'          : 'progressbar',
        'aria-valuemin' : '0',
        'aria-valuemax' : '100',
        'style'         : ['width : ', scanPercent, '%'].join('')
      });
    $(fsProgress).append(percent).append(progressBar);
  $(biPercentContainer).append(fsProgress);

  $(containerId).append(biTitleContainer).append(biPercentContainer);
}
