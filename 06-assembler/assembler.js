var _ = require('underscore');
var Q = require('q');
var fs = require('fs');

var Parser = require('./parser');
var Code = require('./code');
var SymbolTable = require('./symbol-table');

if (process.argv.length > 2) {
  var filename = process.argv.slice(2).join(' ');
} else {
  console.log("No file given");
}

Q.nfcall(fs.readFile, filename, 'utf8')
.then(assemble)
.then(function(assembled){
  console.log(assembled.join('\n'));
}).done();

function assemble(data) {
  var RAM_OFFSET = 16;

  var parser = new Parser(data);
  var symbolTable = new SymbolTable();

  var commands = Parser.getParsedCommands(parser.commands);

  // first pass, build up symbol table
  _.chain(commands)
    .filter(Parser.isLabelCommand)
    .filter(function(command){
      // ignore symbol commands that are a number as those are literals
      return isNaN(command.symbol);
    })
    .each(function(command){
      // add to the symbol table
      symbolTable.addEntry(command.symbol, command.outputLineNumber);
    });

  var currentAddress = 0;
  return _.chain(commands)
    // ignore label commands
    .reject(Parser.isLabelCommand)
    .map(function(command){
      if (command.type === "A_COMMAND") {
        if (command.address === undefined) {
          if (symbolTable.contains(command.symbol)) {
            command.address = symbolTable.getAddress(command.symbol);
          } else {
            command.address = RAM_OFFSET + currentAddress;
            symbolTable.addEntry(command.symbol, command.address);
            currentAddress++;
          }
        }
      }
      return Code.output(command);
    }).value();
}
