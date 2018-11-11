var express = require('express');
var router = express.Router();
var path = require('path'),
      jsonfile = require('jsonfile');

var HEADER_STREAM = {
  'Connection'    : 'keep-alive',
  'Content-Type'  : 'text/event-stream',
  'Cache-Control' : 'no-cache'
};
var port = 3456;  //Avoid using 3000 because it's common use
var exportExt = 'json';


// For development process use the code bellow
var defaultConfigPath = path.join(__dirname, '../public/config/default_options.json');
var configPath = path.join(__dirname, '../public/config/options.json');

var diExtensionPath = path.join(__dirname, '../public/config/diExtension.json');
var default_diExtensionPath = path.join(__dirname, '../public/config/default_diExtension.json');

/*
// For production use the code bellow and don't forget to copy config files
var defaultConfigPath = path.join(path.dirname(process.execPath), 'config/default_options.json');
var configPath = path.join(path.dirname(process.execPath), 'config/options.json');
var diExtensionPath = path.join(path.dirname(process.execPath), 'config/diExtension.json');
var default_diExtensionPath = path.join(path.dirname(process.execPath), 'config/default_diExtension.json');
*/

var configFileContent = {}, extensionConfig = {};

// Then try to use configuration file
try {
  configFileContent = jsonfile.readFileSync(configPath);
  port = configFileContent.port;
} catch (e) {}

/* GET options page. */
router.get('/', function(req, res, next) {
  try {
    extensionConfig = jsonfile.readFileSync(diExtensionPath);
  } catch (e) {}

  res.render('options', { title: 'Options' , port : port, extensionConfig : JSON.stringify(extensionConfig) });
});

/* Update port into configuration file */
router.get(/\/updatePort\/(.*)/, function(req, res, next) {
  var newPort = parseInt(req.params[0]);
  configFileContent.port = parseInt(newPort);
  res.writeHead(200, HEADER_STREAM);

  try {
    jsonfile.writeFileSync(configPath, configFileContent);
    var successMessage =  ['Port successfully updated! <br>Current Port : ', newPort,
                '<br><br> <strong>Please restart IntoDisk to apply change.</strong>'].join('');
    res.write(['data:', JSON.stringify({success :'true', message : successMessage}), '\n\n'].join(''));
  } catch (e) {
    configFileContent.port = port;
    var errorMessage = ['An error occured when updated port to : ', newPort,
                          '<br> Current Port : ', port, '.'].join('');
    res.write(['data:', JSON.stringify({error   :'true', message :errorMessage}), '\n\n'].join(''));
  }
});

/* Reset port to default port from configuration file */
router.get('/resetPort', function(req, res, next) {
  res.writeHead(200, HEADER_STREAM);

  try {
    var defaultPort = jsonfile.readFileSync(defaultConfigPath);
    jsonfile.writeFileSync(configPath, defaultPort);
    var successMessage = ['Port reset to default successfully!',
                          '<br><br> <strong>Please restart IntoDisk to apply change.</strong>'].join('');
    res.write(['data:', JSON.stringify({success :'true', message :successMessage}), '\n\n'].join(''));
  } catch (e) {
    var errorMessage = 'An error occurs when resetting port to default!';
    res.write(['data:', JSON.stringify({error:'true', message:errorMessage}), '\n\n'].join(''));
  }
});

/* Import a file configuration for files types colors and extensions then save them to configuration file */
router.get(/\/fileToImport\/(.+)/, function(req,res,next) {
  var filePath = path.normalize(req.params[0]);
  var fileContent = {};
  res.writeHead(200, HEADER_STREAM);

  try {
    fileContent = jsonfile.readFileSync(filePath);
    var warning = false;
    var successMessage = ['\'', filePath, '\'', ' imported successfully!'].join('');

    var checkResult = checkExtensionFiles(fileContent);
    if (checkResult.error) {
      successMessage = ['\'', filePath, '\'', ' found but there is a format error.',
                              '<br>', checkResult.message].join('');
      warning = true;
    }

    if (warning) {
      res.write(['data:', JSON.stringify({error:'error', message:successMessage}), '\n\n'].join(''));
    } else {
      jsonfile.writeFileSync(diExtensionPath, fileContent);   // Update configuration file
      res.write(['data:', JSON.stringify({success:'success', message:successMessage}), '\n\n'].join(''));
    }
  } catch(e) {
    var errorMessage = ['An error appears while importing ', '\'', filePath, '\'!',
                            '<br/> Please select a correct file.'].join('');
    res.write(['data:', JSON.stringify({error:'error', message:errorMessage}), '\n\n'].join(''));
  }
});

/*
router.post('/exportFileType', function(req, res){
  console.log(JSON.parse(req.body.extensionList));
  res.send("recieved your request!");
});
*/

/* Export a file (use AJAX)*/
router.get(/\/exportOrSave\/(.*)/, function(req,res,next) {
  //console.log(req.query);
  var fileExtensionStr = req.query.fileTypeExtension;

  // If a path is given in parameter: do an to export specified file; else save to extension configuration file
  var filePath = req.params[0].length > 0 ? req.params[0] : diExtensionPath;
  //var filePath = '../public/config/test.json';

  // First check if the given path have an extension and adjust it with extension for this app
  var pathPart = filePath.split('.');
  if (pathPart[pathPart.length - 1] != exportExt) {
    filePath += '.' + exportExt;
  }

  //var fileContent = {"main": "index.html","dependencies": { "mime": "^1.5.0" }};
  var fileContent = {}, exportResult = {};
  var successMessage = '';
  //res.writeHead(200, HEADER_STREAM);
  try {
    //fileContent = jsonfile.readFileSync(diExtensionPath);
    fileContent = JSON.parse(fileExtensionStr);

    // First check if the configuration file is correct
    var checkResult = checkExtensionFiles(fileContent);
    if (checkResult.error) {
      successMessage = ['Files Types and Extensions configuration contains error.',
                          '<br>', checkResult.message].join('');
      //res.write(['data:', JSON.stringify({error:true, message:successMessage}), '\n\n'].join(''));
      successMessage = ['Files Types and Extensions configuration contains error.',
                          '<br>', checkResult.message].join('');
      exportResult = { error:true, message:successMessage };
    } else {
      jsonfile.writeFileSync(filePath, fileContent);

      // Success message depend of action: export (file path given in parameter) or save
      if (req.params[0].length) {
        successMessage = ['\'', filePath, '\' ', ' exported successfully!'].join('');
      } else {
        successMessage = 'Files types and Extensions saved successfully!';
      }
      //res.write(['data:', JSON.stringify({success:true, message:successMessage}), '\n\n'].join(''));
      exportResult = {success:true, message:successMessage};
    }
  } catch(e) {
    var errorMessage = ['An error appears while ', action,'ing ', '\'', filePath, '\'!'].join('');
    //res.write(['data:', JSON.stringify({error:true, message:errorMessage}), '\n\n'].join(''));
    exportResult = { error:true, message:errorMessage };
  }

  res.json(exportResult);

});

/* Reset Files Types and Extensions to default from default configuration file */
router.get('/resetFilesExtensions', function(req, res, next) {
  res.writeHead(200, HEADER_STREAM);

  try {
    var defaultTypesExtensions = jsonfile.readFileSync(default_diExtensionPath);
    jsonfile.writeFileSync(diExtensionPath, defaultTypesExtensions);
    var successMessage = 'Files Types and Extensions reset to default successfully!';
    res.write(['data:', JSON.stringify({success :'true', message :successMessage}), '\n\n'].join(''));
  } catch (e) {
    var errorMessage = 'An error occurs when resetting Files Types and Extensions to default!';
    res.write(['data:', JSON.stringify({error:'true', message:errorMessage}), '\n\n'].join(''));
  }
});

// Local function to check if the extensions files configuration is valid
function checkExtensionFiles(extensionConfig) {

  // First check if 'Others' and 'Directory' is present
  if (extensionConfig.Directory == undefined || extensionConfig.Others == undefined) {
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
  for(var li=0; li<allExtensionList.length; li++) {
    redundance = 0;
    for (var cj=0; cj<allExtensionList.length; cj++) {
      if (allExtensionList[li] == allExtensionList[cj]) {
        redundance++;
      }
      if (redundance > 1) {
        return {'error':true, 'message':['\'', allExtensionList[li], '\' occurs more than once into different types!'].join('')};
      }
    }
  }

  return {'success':true, 'message':'Files extension checked successfully!'};
}

module.exports = router;
