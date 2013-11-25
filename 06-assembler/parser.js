var _ = require('underscore');

module.exports = Parser;

function Parser(fileContents) {
  var parser = this;

  // get only lines the commands from the fileContents
  this.commands = _.chain(fileContents.split('\n')).map(function(line){
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

Parser.getParsedCommands = function(commands) {
  var currentOutputLineNumber = 0;
  return _.map(commands, function(command, index){
    var parsed = Parser.parseCommand(command);
    parsed.lineNumber = index + 1;
    if (parsed.type !== "L_COMMAND") {
      currentOutputLineNumber++;
    }
    parsed.outputLineNumber = currentOutputLineNumber;
    return parsed;
  });
};

Parser.parseCommand = function(command) {
  var commandObject = {
    command: command
  };

  if (_.first(command) == "@") {
    // address commands start with an @
    commandObject.type = "A_COMMAND";
    commandObject.symbol = Parser.symbol(command);
    if (!isNaN(commandObject.symbol)) {
      commandObject.address = Number(commandObject.symbol);
    }
  } else if (_.first(command) == "(" && _.last(command) == ")") {
    // label commands are enclosed by parens
    commandObject.type = "L_COMMAND";
    commandObject.symbol = Parser.symbol(command);
    if (!isNaN(commandObject.symbol)) {
      commandObject.address = Number(commandObject.symbol);
    }
  } else {
    // otherwise it's a command that assigns a register a value
    commandObject.type = "C_COMMAND";
    commandObject.dest = Parser.dest(command);
    commandObject.comp = Parser.comp(command);
    commandObject.jump = Parser.jump(command);
  }

  return commandObject;
};

Parser.symbol = function(command){
  return command.replace(/[()@]/g, '');
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

Parser.isLabelCommand = function(command) {
  return command.type === "L_COMMAND";
};
