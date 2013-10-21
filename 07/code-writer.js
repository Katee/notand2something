var _ = require('underscore');
var fs = require('fs');

module.exports = CodeWriter;

// for eq, lt and gt 0 is true, -1 is false

function CodeWriter(filename, options) {
  this.filename = filename;
  this.options = options;
  this.labelprefex = 0;

  this.pushToOutput = function(array, output) {
    _.each(array, function(el){
      output.push(el);
    });
  };

  // pop back in the stack
  this.pop = function(output) {
    this.pushToOutput(["@SP", "M=M-1", "A=M"], output);
  };

  // push the value in the D register
  this.push = function(output) {
    this.pushToOutput(["@SP", "A=M", "M=D"], output);
  };

  // increment stack
  this.inc = function(output) {
    this.pushToOutput(["@SP", "M=M+1"], output);
  };

  this.finishPush = function(output) {
    this.pushToOutput(["D=M", "@SP", "A=M", "M=D"], output);
    this.inc(output);
  };

  this.write = function(parsedCommand) {
    var output = [];
    var label;

    if (parsedCommand.type == "C_PUSH") {
      if (parsedCommand.args[0] == "constant") {
        if (options.debug) output.push('// push constant '+parsedCommand.args[1]);
        output.push("@" + parsedCommand.args[1]);
        output.push("D=A");
        this.push(output);
        this.inc(output);
      } else if (parsedCommand.args[0] == "pointer") {
        label = CodeWriter.getLabelForPointer(parsedCommand.args[1]);
        if (options.debug) output.push('// push '+label+' '+parsedCommand.args[1]);
        output.push("@"+label);
        this.finishPush(output);
      } else if (_.contains(["this", "that", "local", "argument"], parsedCommand.args[0])) {
        label = CodeWriter.getLabelFromCommand(parsedCommand.args[0]);
        if (options.debug) output.push('// push '+label+' '+parsedCommand.args[1]);

        output.push("@" + label);
        output.push("D=M");
        output.push("@"+parsedCommand.args[1]);
        output.push("D=D+A"); // data now has the address of the static var we need
        output.push("A=D"); // our temp variable now has the address we should pop from
        output.push("D=M"); // actually get content for register

        // put content onto the stack
        this.push(output);
        this.inc(output);
      } else if (_.contains(["static", "temp"], parsedCommand.args[0])) {
        if (options.debug) output.push('// push '+parsedCommand.args[0]+' '+parsedCommand.args[1]);
        output.push("@"+this.options[parsedCommand.args[0]+"Start"]);
        output.push("D=A");
        output.push("@"+parsedCommand.args[1]);
        output.push("D=D+A"); // data now has the address of the static var we need

        output.push("A=D");

        this.finishPush(output);
      } else {
        throw {name: 'UnknownPushLocation', message: 'Unknown push location: "'+parsedCommand.args[0]+'"'};
      }
    } else if (parsedCommand.type == "C_POP") {
      this.pop(output);
      output.push("D=M");
      if (parsedCommand.args[0] == "pointer") {
        label = CodeWriter.getLabelForPointer(parsedCommand.args[1]);
        if (options.debug) output.push('// pop pointer '+label);
        output.push("@"+label);
        output.push("M=D");
      } else if (_.contains(["this", "that", "local", "argument", "static", "temp"], parsedCommand.args[0])) {
        if (_.contains(["static", "temp"], parsedCommand.args[0])) {
          if (options.debug) output.push('// pop '+parsedCommand.args[0]+ ' ' + parsedCommand.args[1]);
          output.push("@"+this.options[parsedCommand.args[0]+"Start"]);
          output.push("D=A");
          output.push("@"+parsedCommand.args[1]);
        } else {
          label = CodeWriter.getLabelFromCommand(parsedCommand.args[0]);
          if (options.debug) output.push('// pop '+label + ' ' + parsedCommand.args[1]);
          output.push("@" + label);
          output.push("D=M");
          output.push("@"+parsedCommand.args[1]);
        }

        output.push("D=D+A"); // data now has the address of the static var we need
        output.push("@R13");
        output.push("M=D"); // store for later

        output.push("@SP");
        output.push("A=M");
        output.push("D=M");

        output.push("@R13");
        output.push("A=M");
        output.push("M=D");

        // clear temp
        output.push("@R13");
        output.push("M=0");
      } else {
        throw {name: 'UnknownPushLocation', message: 'Unknown pop location: "'+parsedCommand.args[0]+'"'};
      }
    } else if (parsedCommand.type == 'C_IF') {
      if (options.debug) output.push('// '+parsedCommand.command);
      this.pop(output);

      // store this value for later
      output.push("D=M");

      this.pop(output);

      if (parsedCommand.command == "eq") {
        output.push("D=D-M");
        output.push("@EQ"+this.labelprefex);
        output.push("D;JEQ");

        output.push("@SP");
        output.push("A=M");
        output.push("M=0");
        output.push("@ENDEQ"+this.labelprefex);
        output.push("0;JMP");
        output.push("(EQ"+this.labelprefex+")");
        output.push("@SP");
        output.push("A=M");
        output.push("M=-1");
        output.push("(ENDEQ"+this.labelprefex+")");
      } else if (_.contains(["lt", "gt"], parsedCommand.command)) {
        label = parsedCommand.command.toUpperCase().replace('T','E');

        output.push("D=D-M");
        output.push("@"+label+this.labelprefex);
        output.push("D;J"+label);

        output.push("@SP");
        output.push("A=M");
        output.push("M=-1");
        output.push("@END"+label+this.labelprefex);
        output.push("0;JMP");
        output.push("("+label+this.labelprefex+")");
        output.push("@SP");
        output.push("A=M");
        output.push("M=0");
        output.push("(END"+label+this.labelprefex+")");
      }

      this.inc(output);

      this.labelprefex++;
    } else if (parsedCommand.type == 'C_ARITHMETIC') {
      if (options.debug) output.push('// '+parsedCommand.command);

      // these commands only have one arg and work a little differently
      if (_.contains(["neg", "not"], parsedCommand.command)) {
        output.push("@SP");
        output.push("M=M-1");
        output.push("A=M");
        if (parsedCommand.command == "not") {
          output.push("M=!M");
        } else {
          output.push("M=-M");
        }
        output.push("@SP");
        output.push("M=M+1");
      } else {
        this.pop(output);

        // store this value for later
        output.push("D=M");

        this.pop(output);

        if (parsedCommand.command == "add") {
          output.push("D=M+D");
        } else if (parsedCommand.command == "sub") {
          output.push("D=M-D");
        } else if (parsedCommand.command == "and") {
          output.push("A=M");
          output.push("D=D&A");
        } else if (parsedCommand.command == "or") {
          output.push("A=M");
          output.push("D=D|A");
        }

        this.push(output);
        this.inc(output);
      }
    }

    fs.appendFileSync(filename, output.join('\n') + '\n');
  };

  this.writeCommands = function(commands) {
    fs.appendFileSync(filename, commands.join('\n') + '\n');
  };
}

CodeWriter.getLabelFromCommand = function(command) {
  var label = command.toUpperCase();
  if (command === "argument") {
    label = "ARG";
  } else if (command == "local") {
    label = "LCL";
  }
  return label;
};

CodeWriter.getLabelForPointer = function(command) {
  switch (command) {
    case "0":
      return "THIS";
    case "1":
      return "THAT";
    default:
      throw {name: 'UnknownPointerLocation', message: 'Unknown location for pointer: "'+parsedCommand.args[1]+'"'};
  }
};
