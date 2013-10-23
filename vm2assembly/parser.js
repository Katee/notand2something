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
  var commandObject = {
    command: command
  };
  var args = commandParts.slice(1);

  switch (commandParts[0]) {
  case "push":
    commandObject.type = "C_PUSH";
    commandObject.segment = args[0];
    commandObject.index = Number(args[1]);
    break;
  case "pop":
    commandObject.type = "C_POP";
    commandObject.segment = args[0];
    commandObject.index = Number(args[1]);
    break;
  case "add":
  case "sub":
  case "or":
  case "and":
  case "eq":
  case "gt":
  case "lt":
    commandObject.arg2 = Number(args[1]);
    // don't break here, still need to set the first arg
  case "neg":
  case "not":
    commandObject.arg1 = Number(args[0]);
    commandObject.type = "C_ARITHMETIC";
    break;
  case "label":
    commandObject.type = "C_LABEL";
    commandObject.label = args[0];
    break;
  case "goto":
    commandObject.type = "C_GOTO";
    commandObject.label = args[0];
    break;
  case "if-goto":
    commandObject.type = "C_IF";
    commandObject.label = args[0];
    break;
  case "function":
    commandObject.type = "C_FUNCTION";
    commandObject.label = args[0];
    commandObject.numLocalVariables = Number(args[1]);
    break;
  case "return":
    commandObject.type = "C_RETURN";
    break;
  case "call":
    commandObject.type = "C_CALL";
    commandObject.label = args[0];
    commandObject.numParamaters = Number(args[1]);
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
