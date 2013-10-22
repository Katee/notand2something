var _ = require('underscore');
var Q = require('q');
var fs = require('fs');

var Parser = require('./parser');
var CodeWriter = require('./code-writer');

if (process.argv.length > 2) {
  var args = process.argv.slice(2);
  var inFilename = args[0];
  var outFilename = args[1];
} else {
  console.log("No file given");
}

var options = {
  tempStart: 5,
  staticStart: 16,
  stackStart: 256,
  heapStart: 2048,
  debug: true
};

Q.nfcall(fs.readFile, inFilename, 'utf8').then(function(data){
  var parser = new Parser(data);
  var codeWriter = new CodeWriter(outFilename, options);

  // set the SP to point to the stack
  codeWriter.writeCommands(["@"+options.stackStart, "D=A", "@SP", "M=D"]);

  _.each(parser.commands, function(command){
    var parsedCommand = Parser.parseCommand(command);
    codeWriter.write(parsedCommand);
  });

  // end program in an endless loop
  codeWriter.writeCommands(["(END)", "@END", "0;JMP"]);
}).catch(function(err){
  throw err;
}).done();
