var _ = require('underscore');
var Q = require('q');
Q.longStackSupport = true;
var fs = require('fs');
var path = require('path');

var Parser = require('./parser');
var CodeWriter = require('./code-writer');

var options = {
  tempStart: 5,
  staticStart: 16,
  stackStart: 256,
  heapStart: 2048,
  debug: true,
  writeInit: true
};

if (process.argv.length > 2) {
  var args = process.argv.slice(2);
  var inFilename = args[0];
} else {
  console.log("Please provide a filename to read from.");
  process.exit();
}

Q.nfcall(fs.stat, inFilename).then(function(inFileStats){
  var outFilename = args[1];
  var ends_in_vm = /\.vm$/;

  if (inFileStats.isFile() && inFilename.match(ends_in_vm)) {
    // if no outfile name is passed use the infilename but change the extension to be .asm
    outFilename = outFilename || inFilename.replace(ends_in_vm, '.asm');
  } else if (inFileStats.isDirectory()) {
    // name it the folder name but with a .asm extension
    outFilename = outFilename || path.join(inFilename, inFilename + '.asm');
  } else {
    throw {name: "UnknownInFile", message: "Please provide a .vm file or a directory with one or more .vm files."};
  }

  return [outFilename, inFileStats];
}).spread(function(outFilename, inFileStats){
  // if the outFile exists, delete it
  fs.exists(outFilename, function (exists) {
    if (exists) fs.unlinkSync(outFilename);
  });

  var filenames;
  if (inFileStats.isDirectory()) {
    // get all .vm files in the inFilename directory
    filenames = _.chain(fs.readdirSync(inFilename))
                .filter(function(name){return name.match(/\.vm$/);})
                .map(function(filename){return path.join(inFilename, filename);})
                .value();
  } else {
    filenames = [outFilename];
  }

  if (filenames.length < 1) {
    throw {name: "NoSource", message: "No .vm files found in " + inFilename};
  }

  return [filenames, outFilename];
}).spread(function(filenames, outFilename){
  return [Q.all(filenames.map(function(filename){
    return Q.nfcall(fs.readFile, filename, 'utf8');
  })), outFilename];
}).spread(function(filesContent, outFilename){
  startParsing(filesContent.join('\n'), outFilename);
}).done();

function startParsing(data, outFilename) {
  var parser = new Parser(data);
  var codeWriter = new CodeWriter(outFilename, options);

  if (options.writeInit) codeWriter.writeInit();
  // start the Sys.init method if it exists
  if (_.contains(parser.commands, 'function Sys.init 0')) codeWriter.writeSysInit();

  _.each(parser.commands, function(command){
    var parsedCommand = Parser.parseCommand(command);
    codeWriter.write(parsedCommand);
  });
}
