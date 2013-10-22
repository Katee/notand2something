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

Parser.parseCommand = function(command){
  var commandParts = command.split(" ");
  var commandObject = {command: command};

  switch (commandParts[0]) {
  case "push":
    commandObject.type = "C_PUSH";
    commandObject.args = commandParts.slice(1);
    break;
  case "pop":
    commandObject.type = "C_POP";
    commandObject.args = commandParts.slice(1);
    break;
  case "neg":
  case "add":
  case "sub":
  case "or":
  case "and":
  case "not":
  case "eq":
  case "gt":
  case "lt":
    commandObject.type = "C_ARITHMETIC";
    break;
  case "label":
    commandObject.type = "C_LABEL";
    commandObject.args = commandParts.slice(1);
    break;
  case "goto":
    commandObject.type = "C_GOTO";
    commandObject.args = commandParts.slice(1);
    break;
  case "if-goto":
    commandObject.type = "C_IF";
    commandObject.args = commandParts.slice(1);
    break;
  default:
    throw new ParserException('Unknown command type: "' + commandParts[0] + '" in command: "' + command + '"');
  }

  return commandObject;
};

function ParserException(message) {
  this.name = "ParserException";
  this.message = message;
}
