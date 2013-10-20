var _ = require('underscore');

module.exports = Parser;

function Parser(fileContents) {
  var parser = this;

  var lines = fileContents.split('\n');
  this.commands = _.chain(lines).map(function(line){
    // remove comments
    var indexOf = line.indexOf('//');
    if (indexOf > -1) {
      line = line.slice(0, indexOf);
    }
    // strip whitespace on either end
    return line.replace(/^\s+|\s+$/g, '');
  }).reject(function(line){
    return line.length === 0;
  }).value();
}

Parser.commandType = function(command){
  if (_.first(command) == "@") {
    return "A_COMMAND";
  } else if (_.first(command) == "(" && _.last(command) == ")") {
    return "L_COMMAND";
  } else {
    return "C_COMMAND";
  }
};

Parser.symbol = function(command){
  if (_.contains(["A_COMMAND", "L_COMMAND"], Parser.commandType(command))) {
    return command.replace(/[()@]/g, '');
  }
};

Parser.dest = function(command){
  if (command.indexOf('=') > -1) {
    return command.split("=")[0];
  }
  return undefined;
};

Parser.comp = function(command){
  return command.split("=")[1] || command.split(";")[0];
};

Parser.jump = function(command){
  return command.split(";")[1];
};
