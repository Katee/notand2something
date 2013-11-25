var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var Q = require('q');

module.exports = getFilesOfExtension;

function getFilesOfExtension(inPath, inputExtension, outputExtension) {
  var deferred = Q.defer();

  // stating a path that doesn't exist throws an exception
  Q.nfcall(fs.stat, inPath).then(function(pathStats){
    var files = [];

    // if it is a file and has the extension we are looking for
    if (pathStats.isFile()) {
      if (path.extname(inPath) === inputExtension) {
        // return the file with the output extension
        files.push({
            inPath: inPath,
            outPath: changeExtension(inPath, inputExtension, outputExtension)
        });
      } else {
        deferred.reject({name: "FileReading", message: "Please run on a " + inputExtension + " file."});
      }
    } else if (pathStats.isDirectory()) {
      files = _.chain(fs.readdirSync(inPath))// using non sync readdir was not working
        .filter(function(filename){return path.extname(filename) === inputExtension;})
        .map(function(filename){
          return {
            inPath: path.join(inPath, filename),
            outPath: path.join(inPath, changeExtension(inPath, inputExtension, outputExtension))
          };
        }).value();
      if (files.length === 0) {
        deferred.reject({name: "FileReading", message: "No " + inputExtension + " files found in folder '" + inPath + "'."});
      }
    }

    deferred.resolve(files);
  }).done();

  return deferred.promise;
}

function changeExtension(filename, from, to) {
  return [path.basename(filename, from), to].join('');
}
