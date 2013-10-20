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

Q.nfcall(fs.readFile, filename, 'utf8').then(function(data){
  var parser = new Parser(data);
  var symbolTable = new SymbolTable();
  var currentAddress = 0;

  // first pass, build up symbol table
  _.each(parser.commands, function(command){
    var commandType = Parser.commandType(command);
    var symbol = Parser.symbol(command);
    var number = Number(symbol);

    if (commandType === "L_COMMAND" && symbol != undefined) {
      if (isNaN(number) && !symbolTable.contains(symbol)) {
        symbolTable.addEntry(symbol, currentAddress);
      }
    } else {
      currentAddress++;
    }
  });

  var currentRAMAddress = 16;
  // second pass
  _.each(parser.commands, function(command){
    var commandType = Parser.commandType(command);
    var symbol = Parser.symbol(command);
    var number = Number(symbol);

    if (commandType === "A_COMMAND" && symbol != undefined) {
      var address = number;
      if (isNaN(address)) {
        if (symbolTable.contains(symbol)) {
          address = symbolTable.getAddress(symbol);
        } else {
          address = currentRAMAddress;
          symbolTable.addEntry(symbol, address);
          currentRAMAddress++;
        }
      }
      output(to16BitBinary(address));
    } else if (commandType === "C_COMMAND") {
      var dest = Parser.dest(command);
      var comp = Parser.comp(command);
      var jump = Parser.jump(command);
      output(["111", Code.comp(comp), Code.dest(dest), Code.jump(jump)].join(""));
    }
  });
}).done();

function output(machineCommand) {
  console.log(machineCommand);
}

function to16BitBinary(number) {
  var str = number.toString(2);
  while (str.length < 16) {
    str = '0' + str;
  }
  return str;
}
