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

  // set the SP to point to the stack
  this.writeInit = function() {
    this.writeCommands(["@"+this.options.stackStart, "D=A", "@SP", "M=D"]);
  };

  // end program in an endless loop
  this.writeExit = function() {
    this.writeCommands(["(END)", "@END", "0;JMP"]);
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
    if (options.debug) output.push('// '+parsedCommand.command);

    if (parsedCommand.type == "C_PUSH") {
      this.writePush(parsedCommand.args[0], parsedCommand.args[1], output);
    } else if (parsedCommand.type == "C_POP") {
      this.writePop(parsedCommand.args[0], parsedCommand.args[1], output);
    } else if (parsedCommand.type == 'C_ARITHMETIC') {
      this.writeArithmetic(parsedCommand.command, output);
    } else if (parsedCommand.type == 'C_LABEL') {
      output.push("(LABEL"+parsedCommand.args[0]+")");
    } else if (parsedCommand.type == 'C_GOTO') {
      label = parsedCommand.args[0];
      output.push("@LABEL"+label);
      output.push("0;JMP");
    } else if (parsedCommand.type == 'C_IF') {
      label = parsedCommand.args[0];

      this.pop(output);
      output.push("D=M");
      output.push("@LABEL"+label);
      output.push("D;JNE");
    } else {
      throw new CodeWriterException('Unknown command: "'+parsedCommand.command+'"');
    }

    this.writeCommands(output);
  };

  this.writePush = function(segment, index, output) {
    if (segment == "constant") {
      output.push("@" + index);
      output.push("D=A");
      this.push(output);
      this.inc(output);
    } else if (segment == "pointer") {
      label = CodeWriter.getLabelForPointer(index);
      output.push("@"+label);
      this.finishPush(output);
    } else if (_.contains(["this", "that", "local", "argument"], segment)) {
      label = CodeWriter.getLabelFromCommand(segment);

      output.push("@" + label);
      output.push("D=M");
      output.push("@"+index);
      output.push("D=D+A"); // data now has the address of the static var we need
      output.push("A=D"); // our temp variable now has the address we should pop from
      output.push("D=M"); // actually get content for register

      // put content onto the stack
      this.push(output);
      this.inc(output);
    } else if (_.contains(["static", "temp"], segment)) {
      output.push("@"+this.options[segment+"Start"]);
      output.push("D=A");
      output.push("@"+index);
      output.push("D=D+A"); // data now has the address of the static var we need

      output.push("A=D");

      this.finishPush(output);
    } else {
      throw new CodeWriterException('Unknown push location: "'+segment+'"');
    }
  };

  this.writePop = function(segment, index, output) {
    this.pop(output);
    output.push("D=M");
    if (segment == "pointer") {
      label = CodeWriter.getLabelForPointer(index);
      output.push("@"+label);
      output.push("M=D");
    } else if (_.contains(["this", "that", "local", "argument", "static", "temp"], segment)) {
      if (_.contains(["static", "temp"], segment)) {
        output.push("@"+this.options[segment+"Start"]);
        output.push("D=A");
        output.push("@"+index);
      } else {
        label = CodeWriter.getLabelFromCommand(segment);
        output.push("@" + label);
        output.push("D=M");
        output.push("@"+index);
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
      throw new CodeWriterException('Unknown pop location: "'+segment+'"');
    }
  };

  this.writeArithmetic = function(command, output) {
    if(_.contains(["eq", "lt", "gt"])){
      this.pop(output);

      // store this value for later
      output.push("D=M");

      this.pop(output);

      label = command.toUpperCase().replace('T','E');

      if (parsedCommand.command == "eq") {
        label = "NE";
      }

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

      this.inc(output);

      this.labelprefex++;
    } else if (_.contains(["neg", "not"], command)) {
      // these commands only have one arg and work a little differently
      output.push("@SP");
      output.push("M=M-1");
      output.push("A=M");
      if (command == "not") {
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

      if (command == "add") {
        output.push("D=M+D");
      } else if (command == "sub") {
        output.push("D=M-D");
      } else if (command == "and") {
        output.push("A=M");
        output.push("D=D&A");
      } else if (command == "or") {
        output.push("A=M");
        output.push("D=D|A");
      }

      this.push(output);
      this.inc(output);
    }
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
      throw new CodeWriterException('Unknown location for pointer: "'+parsedCommand.args[1]+'"');
  }
};

function CodeWriterException(message) {
  this.name = "CodeWriterException";
  this.message = message;
}
