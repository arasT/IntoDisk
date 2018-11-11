// Global variable
var allExtensionsList = [];   // Holds all extension to avoid redundance
var allType = {};             // Holds all file type, their colors and extensions to avoid redundance

/*
  * Create dynamically legends for each file extension
*/
function createLegend(legendContainer, extensionConfig) {
  $(legendContainer).empty();

  for (var fType in extensionConfig) {
    var panelTitle = document.createElement('div');
    $(panelTitle).attr('class', 'panel-title');
      var legendColor = document.createElement('div');
      $(legendColor).attr({
        'class' : 'legendColor',
        'style' : [ 'background : ', extensionConfig[fType].color ].join('')
      });
      var legendType = document.createElement('div');
      $(legendType).attr('class', 'legendType');
      //$(legendType).html(fType);
        var legendTypeLink = document.createElement('a');
        $(legendTypeLink).attr({
          'style'       : 'font-size:12px',
          'data-toggle' : 'collapse',
          'data-parent' : legendContainer,
          'href'        : ['#legend_', fType].join('')
        });
        $(legendTypeLink).html(fType);
        $(legendType).append(legendTypeLink);
    $(panelTitle).append(legendColor).append(legendType);

    var panelBodyContainer = document.createElement('div');
    $(panelBodyContainer).attr({'id': ['legend_', fType].join(''), 'class' : 'panel-collapse collapse'});
      var panelBody = document.createElement('div');
      $(panelBody).attr({'class' : 'text-muted', 'style' : 'font-size:10px;text-align:justify;'});
      $(panelBody).html(extensionConfig[fType].ext.join(', '));
      $(panelBodyContainer).append(panelBody);

    $(legendContainer).append(panelTitle).append(panelBodyContainer);
  }

}

// Check if a type already exist
function fileTypePresent(newType) {
  return allType[newType] ? true : false;
}

/*
  * Display dynamically files type and extension from configuration into 'Options' page
*/
function displayExtensionsConfiguration(containerId, extensionConfig) {
  $(containerId).empty();

  // Create accordion container
  var accordionContainer = document.createElement('div');
  $(accordionContainer).attr('id','accordionContainer');

    // For each type, create corresponding card
    for (var fType in extensionConfig) {

      // Local function to append a file type list into a specified DOM container
      createFileType($(accordionContainer), fType, extensionConfig[fType].color, extensionConfig[fType].ext, null);
    }

    //Finally append the accordion to DOM
    $(containerId).append(accordionContainer);
}

/*
  * Create a container for type of file without extension by default
  * domContainer is the DOM representation of the div where to put the extension
  * fType : the type of file
  * fTypeColor : color for the type of file
  * fileTypeExtensionList : list of extension for the type of file
  * containerId : ID of the container where to put the extension
  * Note :
    * we use domContainer (and set containerId to null) at creation
    * and use containerId (and set domContainer to null) when user want to add a new type of file
*/
function createFileType(domContainer, fType, fTypeColor, fileTypeExtensionList, containerId) {

  // Put each type into global list
  allType[fType] = {};
  allType[fType].ext = [];
  allType[fType].color = fTypeColor;

  var crtCard = document.createElement('div');
  $(crtCard).attr({
    'class' : 'card crtCard',
    'id'    : ['card-', fType].join('')
  });

    // Card header
    var crtCardHeader = document.createElement('div');
    $(crtCardHeader).attr({
      'class'   : 'card-header crtCardHeader',
      'style'   : ['background:', fTypeColor].join(''),
      'id'      : [fType, '-header'].join('')
    });
      var crtDivHeader = document.createElement('div');
      $(crtDivHeader).attr({
        'class'         : 'collapsed',
        'data-toggle'   : 'collapse',
        'aria-expanded' : 'false',
        'data-target'   : ['#', fType, '-controls'].join(''),
        'aria-controls' : [fType, '-controls'].join('')
      });
        var fTypeInput = document.createElement('div');
        $(fTypeInput).attr({ 'class' : 'fTypeDiv' }).html(fType);
        var fTypeInputColor = document.createElement('input');
        $(fTypeInputColor).attr({
          'class' : 'fTypeInputColor',
          'value' : fTypeColor.substring(1,fTypeColor.length)         // Remove '#'
        });
        $(fTypeInputColor).ColorPicker({
          color       : fTypeColor.substring(1,fTypeColor.length),   // Remove '#'
          onChange    : function(hsb, hex, rgb, el) {
            $(crtCardHeader).css('background', ['#', hex].join(''));  // Update header color
          },
          onHide      : function() {
            $(crtCardHeader).css('background', allType[fType].color);  // Return to previous color if change not submitted
            $(fTypeInputColor).val(fTypeColor.substring(1,fTypeColor.length));
          },
    			onSubmit    : function(hsb, hex, rgb, el) {
    				$(el).val(hex);
    				$(el).ColorPickerHide();
            allType[fType].color = ['#', hex].join('');               // Update color into memory
    			},
    			onBeforeShow : function () {
    				$(this).ColorPickerSetColor(this.value);
    			}
    		})
    		.bind('keyup', function(){
    			$(this).ColorPickerSetColor(this.value);
    		});

        // Delete button
        var fTypedeleteTypeButton = document.createElement('div');
        $(fTypedeleteTypeButton).attr({
          'class' : 'btn-xs btn-danger deleteTypeButton pointerOnHover',
          'title' : 'Delete this type',
          'id'    : ['delButton-', fType].join('')
        });
        $(fTypedeleteTypeButton).html('X').click(function(){
          if (fType == 'Directory' || fType == 'Others') {
            displayMessage('cannot delete \'Directory\' type or \'Others\' type', 'error', '');
          } else {
            var title = ['<div class="text-danger">',
                          '<span class="glyphicon glyphicon-warning-sign"></span> Confirm deletion.</div>'].join('');
            var message = ['Do you want to delete \'', fType, '\' type?'].join('');
            var callback = function (result) {
              if (result) {   // If user confirm the action

                // Update all types and extensions list
                var extensionToDelIndex = 0;
                for (var i=0; i<allType[fType].ext.length; i++) {
                  extensionToDelIndex = allExtensionsList.indexOf(allType[fType].ext[i]);
                  allExtensionsList.splice(extensionToDelIndex, 1);
                }
                delete allType[fType];

                // Remove the card from the DOM
                $(['#', 'card-', fType].join('')).remove();
              }
            };

            // Create the confirm bootbox after all parameters are ready
            displayConfirm(title, message, callback);
          }
        });

      $(crtDivHeader).append(fTypeInput).append(fTypeInputColor).append(fTypedeleteTypeButton);
    $(crtCardHeader).append(crtDivHeader);

    // Card body
    var crtCollapseBody = document.createElement('div');
    $(crtCollapseBody).attr({
      'id'              : [fType, '-controls'].join(''),
      'class'           : 'collapse',
      'aria-labelledby' : [fType, '-header'].join(''),
      'data-parent'     : 'accordionContainer'
    });
      var crtCardBody = document.createElement('div');
      $(crtCardBody).attr('class', 'card-body');

        // Create a container where to put extension list
        var crtExtensionCont = document.createElement('div');
        var crtExtensionId = ['crtExtCont-', fType].join('');
        $(crtExtensionCont).attr('id', crtExtensionId);

        for (var i=0; i<fileTypeExtensionList.length; i++) {

          // Local function to append a extension list into a specified DOM container
          createExtension($(crtExtensionCont), fType, fileTypeExtensionList[i], null);

          // Popularize all extensions list
          allExtensionsList.push(fileTypeExtensionList[i]);
          allType[fType].ext.push(fileTypeExtensionList[i]);
        }

        // Create 'Add' extension button if type different of 'Directory' and 'Others'
        if (fType != 'Directory' && fType != 'Others') {
          var crtAddButton = document.createElement('div');
          $(crtAddButton).attr({
            'class' : 'btn btn-primary crtAddButton',
            'title' : 'Add Extension',
            'id'    : ['addButton-', fType].join('')
          });
          $(crtAddButton).html('Add Extension');
        }

        $(crtCardBody).append(crtExtensionCont).append(crtAddButton);

        // Add new empty extension on click on add button
        $(crtAddButton).click(function() {
          var clickedButtonId = $(this).context.id;
          var extensionContToUpdate = clickedButtonId.replace('addButton', 'crtExtCont');
          bootbox.prompt({
            title       : ['<div class="text-info">',
                            '<span class="glyphicon glyphicon-edit"></span> Enter new extension:</div>'].join(''),
            callback  : function(newExtension) {
              if (newExtension) {

                // Check if the new extension is valid
                if (/\W/g.test(newExtension)) {
                  displayMessage('New extension cannot contains special character!', 'error', '');
                } else {

                  // Check if the new extension is not yet present
                  // strIsInArray(array, string) is defined into script.js
                  if (strIsInArray(allExtensionsList, newExtension)) {
                    displayMessage(['\'', newExtension, '\' extension already exist, please enter a new extension!'].join(''),
                                      'error', '');
                  } else {
                    createExtension(null, fType, newExtension, ['#', extensionContToUpdate].join(''));
                    allExtensionsList.push(newExtension);
                    allType[fType].ext.push(newExtension);
                  }
                }
              }

            }             // End callback
          });             // End prompt
        });

      $(crtCollapseBody).append(crtCardBody);

    // Finish current card DOM creation
    $(crtCard).append(crtCardHeader).append(crtCollapseBody);

  // Append each card to accordion
  domContainer ? domContainer.append(crtCard) : $(containerId).append(crtCard);
}

/*
  * Create a container for file extension for one type
  * domContainer : the DOM representation of the div where to put the extension
  * fileType : type where corresponding of the extension
  * extensionValue : value of the extension to add
  * containerId : ID of the container where to put the extension
  * Note :
    * we use domContainer (and set containerId to null) at creation
    * and use containerId (and set domContainer to null) when user want to add a new extension
*/
function createExtension(domContainer, fileType, extensionValue, containerId) {
  var crtExtCont = document.createElement('div');
    $(crtExtCont).attr({
      'class' : 'crtExtCont',
      'id'    : ['contExt-', extensionValue].join('')
    });

    var crtExt = document.createElement('div');
    $(crtExt).attr('class', 'crtExt').html(extensionValue);
    //$(crtExt).attr('value', extensionValue);

    var crtExtDel = document.createElement('div');
    $(crtExtDel).attr({
      'class' : 'btn-xs btn-danger deleteExtButton pointerOnHover',
      'title' : 'Delete',
    }).html('x');

  $(crtExtCont).append(crtExt).append(crtExtDel);

  // Remove the extension container on click on delete button
  $(crtExtDel).click(function() {
    var crtExtContId = ['#', $(this).context.parentNode.id].join('');

    // Remove extension from extensions list
    var extensionToDel = crtExtContId.split('contExt-')[1];
    var extensionToDelIndex = allExtensionsList.indexOf(extensionToDel);
    allExtensionsList.splice(extensionToDelIndex, 1);

    // Remove extension from allType
    extensionToDelIndex = allType[fileType].ext.indexOf(extensionToDel);
    allType[fileType].ext.splice(extensionToDelIndex, 1);

    // Delete the DOM
    $(crtExtContId).remove();
  });

  domContainer ? domContainer.append(crtExtCont) : $(containerId).append(crtExtCont);
}

/*
  * Return files types and their extensions returns them as json object
*/
function getTypeAndExtension() {
  return allType;
}

/*
  * Check if the extensions files configuration is valid before export or save
  * Note: used on client and server side
*/
function checkExtensionFiles(extensionConfig) {

  // First check if 'Others' and 'Directory' is present
  if (extensionConfig['Directory'] == undefined || extensionConfig['Others'] == undefined) {
    return {'error':true, 'message':'\'Directory\' and \'Others\' types must be present!'};
  }

  // Then check if all types is not void, check color format and extensions list
  var extColor = '', allExtensionList = [];
  for (var fType in extensionConfig) {
    extColor = extensionConfig[fType].color;

    if (fType.length == 0) {
      return {'error':true, 'message':'Each type must be at least one character!'};
    }

    // Check if color format is valid ('#[0-9][a-f][A-F]')
    if (extColor.length != 4 && extColor.length != 7) {   // Test if length is 4 or 7
      return {'error':true, 'message':['Invalid hexadecimal color for: \'', fType, '\'!'].join('')};
    }

    if (/^#\w/.test(extColor)) {    // Test if color is a correct hexadecimal

    	// Test if color contains char not include in hexadecimal, excluding '#'
    	if ( /[g-z]/gi.test(extColor) || /\W/g.test(extColor.substring(1,extColor.length)) ) {
        return {'error':true, 'message':['Invalid hexadecimal color for: \'', fType, '\'!'].join('')};
    	}
    } else {
      return {'error':true, 'message':['Invalid hexadecimal color for: \'', fType, '\'!'].join('')};
    }

    // Finally check each extensions in list
    if (fType != 'Others' && fType != 'Directory') {    // Other type must have extensions list
      if (extensionConfig[fType].ext.length == 0) {
        return {'error':true, 'message':['Extensions list cannot be empty for: \'', fType, '\'!'].join('')};
      }
    } else {    // 'Directory' and 'Others' extensions list must be empty
        if (extensionConfig[fType].ext.length > 0) {
            return {'error':true, 'message':['Extensions list must be empty for: \'', fType, '\'!'].join('')};
        }
    }

    // Check each extension
    var crtExt = '', toCheckExt = '';
    for (var i=0; i<extensionConfig[fType].ext.length; i++) {
      crtExt = extensionConfig[fType].ext[i];
      if (crtExt.length == 0) {
        return {'error':true, 'message':['Each extension must be at least one character for: \'', fType, '\'!'].join('')};
      }
      if (/\W/g.test(crtExt)) {  // Extension cannot have special character
        return {'error':true, 'message':['Extension cannot have special character for: \'', fType, '\'!'].join('')};
      }

      // Check redundance in the same type
      var occur = 0;
      for (var j=0; j<extensionConfig[fType].ext.length; j++) {
        toCheckExt = extensionConfig[fType].ext[j];
        if (toCheckExt == crtExt) {
          occur++;
        }
        if (occur > 1) {
          return {'error':true, 'message':['\'', toCheckExt, '\' occurs more than once for: \'', fType, '\'!'].join('')};
        }
      }

      allExtensionList.push(crtExt);
    } // End file extension loop

  }   // End file type loop

  // Check redundance into all types
  var redundance = 0;
  for(var i=0; i<allExtensionList.length; i++) {
    redundance = 0;
    for (var j=0; j<allExtensionList.length; j++) {
      if (allExtensionList[i] == allExtensionList[j]) {
        redundance++;
      }
      if (redundance > 1) {
        return {'error':true, 'message':['\'', allExtensionList[i], '\' occurs more than once into different types!'].join('')};
      }
    }
  }

  return {'success':true, 'message':'Files extension checked successfully!'};
}
