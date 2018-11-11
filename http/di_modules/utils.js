var fs = require('fs'), path = require('path');
var walk = require('walkdir');

/*
	* Rename a file or directory by given the old and new path
	* Returns error or success
*/
exports.diRename = function(oldPath, newPath) {
	if (fs.existsSync(oldPath)) {
		var objType = fs.lstatSync(oldPath).isDirectory() ? 'directory' : 'file';
		try {
			fs.rename(oldPath, newPath);
			return {
				'success':['\'', oldPath, '\' renamed to \'', newPath, '\''].join(''),
				'type': objType
			};
		} catch(e) {
			return {
				'error':['An unknown error occured when renaming \'', oldPath, '\'!'].join('')
			};
		}
	} else {
		return {'error':['\'', oldPath, '\' not found!'].join('')};
	}

};

/*
	* Delete a file or directory (and subdirectories) by given its path
	* Returns error or success
*/
exports.diDelete = function(pathToDel) {
	var objType = 'file';
	if (fs.existsSync(pathToDel)) {
		if (fs.lstatSync(pathToDel).isDirectory()) {
			objType = 'directory';
			try {
				var dirList = [];
				var fileList = [];

				// First save all files children and directories children path into list
				// 		Note: cannot walk thought and delete files/directories at the same time
				walk.sync(pathToDel, function(paths) {
					if (fs.statSync(paths).isFile()) {
						//fs.unlinkSync(paths);
						fileList.push(paths);
					}
					if (fs.statSync(paths).isDirectory()) {
						dirList.push(paths);
					}
				});

				// Then remove saved files
				while (fileList.length > 0) {
					fs.unlinkSync(fileList.pop());
				}

				// And remove saved directories by deepest to avoid non empty directory error
				while (dirList.length > 0) {
					//console.log(dirList.pop());
					fs.rmdirSync(dirList.pop());
				}

				// Finally delete the directory
				fs.rmdirSync(pathToDel);

				return {'success':['Directory : \'' + pathToDel + '\' deleted!'].join(''), 'type':objType};
			} catch (e) {
				return {
					'error':['An unknown error occured when deleting directory \'', pathToDel, ' \'!'].join('')
				};
			}

		} else {
			try {
				fs.unlinkSync(pathToDel);
				return {'success':['File : \'', pathToDel, '\' deleted!'].join(''), 'type':objType};
			} catch(e) {
				return {
					'error':['An unknown error occured when deleting file \'', pathToDel, ' \'!'].join('')
				};
			}
		}
	} else {
		return {'error':['\'', pathToDel, '\' not found!'].join('')};
	}
};

/*
	* Get properties of a file or directory by given its path and size
	*	Note: directory size cannot be got by fs.stat() or fs.statSync() modules
	* Returns error or the properties
*/
exports.diProperties = function (fileDirPath, size) {
	if (fs.existsSync(fileDirPath)) {
		try {
			var st = fs.statSync(fileDirPath);
			var type = fs.statSync(fileDirPath).isDirectory() ? 'directory' : 'file';
			//console.log(st);
			var properties = {
				'fullPath' 					: path.normalize(fileDirPath).replace(/\\/g, '/'), // Avoid display problem at views
				'name'							: path.basename(fileDirPath) >= 0 ? fileDirPath : path.basename(fileDirPath),
				'size'							: size,
				'creationDate'			: st.ctime,
				'modificationDate'	: st.mtime,
				'lastAccessDate'	 	: st.atime,
				'type'							: type
			};

			return {'properties':properties};
		} catch (e) {
			return {
					'error':['An unknown error occured when getting properties for \'', fileDirPath, ' "!'].join('')
			};
		}
	} else {
		return {'error':['\'', fileDirPath, '\' not found!'].join('')};
	}
};

/* Read a file according to path given into parameters */
exports.diReadFile = function(filePath) {
	try {
		return {data: fs.readFileSync(filePath, 'utf8')};
	} catch (e) {
		return {'error' : ['There was an error while reading file configuration \'', filePath, '\''].join('')};
	}
};
