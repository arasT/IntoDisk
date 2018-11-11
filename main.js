const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

//--------------------------------------------------------update-----------------------------------------------------------
//app.on('ready', createWindow)
var express = require('./http/app.js'); //your express app

var fs = require('fs');
//var jsonfile = require('jsonfile');

// For development process use the code bellow
var configPath = './http/public/config/options.json';

// For production use the code bellow and don't forget to copy config files
//var configPath = path.join(path.dirname(process.execPath), 'config/options.json');

//var configContent = jsonfile.readFileSync(configPath);

var configContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    useContentSize: true,
    resizable: true,
  });
  //mainWindow.loadURL('http://localhost:3456/');
  mainWindow.loadURL('http://localhost:' + configContent.port);
  mainWindow.focus();

});
//--------------------------------------------------------update-----------------------------------------------------------



// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
