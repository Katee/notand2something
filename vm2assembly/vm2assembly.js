var _ = require('underscore');
var Q = require('q');
Q.longStackSupport = true;
var fs = require('fs');

var Parser = require('./parser');
var CodeWriter = require('./code-writer');

if (process.argv.length > 2) {
  var args = process.argv.slice(2);
  var inFilename = args[0];

  // if no outfile name is passed use the infilename but change the extension to be .asm
  var outFilename = args[1] || inFilename.replace(/\.vm$/, '.asm');
  // deal with case where the inFilename is not a .vm
  if (inFilename == outFilename) {
    throw {name: "NoOutFile", message: "Please provide a filename to write out to."};
  }
} else {
  console.log("Please provide a filename to read from.");
  process.exit();
}

var options = {
  tempStart: 5,
  staticStart: 16,
  stackStart: 256,
  heapStart: 2048,
  debug: true
};

fs.readFile(inFilename, 'utf8', function(err, data){
  var parser = new Parser(data);
  var codeWriter = new CodeWriter(outFilename, options);

  codeWriter.writeInit();

  _.each(parser.commands, function(command){
    var parsedCommand = Parser.parseCommand(command);
    codeWriter.write(parsedCommand);
  });

  codeWriter.writeExit();
});
