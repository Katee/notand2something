var _ = require('underscore');
var fs = require('fs');

module.exports = CodeWriter;

// for eq, lt and gt 0 is true, -1 is false

function CodeWriter(outFilename, options) {
  /**
   * The stack frame is 5 words long: return-address, local, args, this, that
   */
  var STACK_FRAME_LENGTH = 5;
  var INIT_FUNCTION = "Sys.init";
  // segments where the value is a pointer
  var INDIRECT_SEGMENTS = ["this", "that", "local", "argument"];
  var labelPrefixOutside = "_";

  this.outFilename = outFilename;
  this.options = options;
  this.labelprefex = 0;
  this.currentFunction;

  this.pushToOutput = function(array, output) {
    _.each(array, function(el){
      output.push(el);
    });
  };

  this.writeInit = function() {
    // set the SP to point to the stack
    this.writeCommands(["@"+this.options.stackStart, "D=A", "@SP", "M=D"]);
  };

  this.writeSysInit = function() {
    // if we are running a progrom with a Sys.init jump to it
    var output = [];
    this.writeCall(INIT_FUNCTION, 0, output);
    this.writeCommands(output);
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

  this.write = function(command) {
    var output = [];

    // output a debug statement, messes up line numbers but can be useful
    if (options.debug) output.push('// '+command.command);

    switch (command.type) {
    case "C_PUSH":
        this.writePush(command.segment, command.index, output);
        break;
      case "C_POP":
        this.writePop(command.segment, command.index, output);
        break;
      case "C_ARITHMETIC":
        this.writeArithmetic(command.command, output);
        break;
      case "C_LABEL":
        output.push("("+(this.currentFunction||labelPrefixOutside)+"$"+command.label+")");
        break;
      case "C_GOTO":
        output.push("@"+(this.currentFunction||labelPrefixOutside)+"$"+command.label);
        output.push("0;JMP");
        break;
      case "C_IF":
        output.push("@SP");
        output.push("A=M-1");

        output.push("D=M");
        output.push("@"+(this.currentFunction||labelPrefixOutside)+"$"+command.label);
        output.push("D;JNE");
        break;
      case "C_FUNCTION":
        // store this function name for use by its return
        this.currentFunction = command.label;
        this.currentFile = command.label.split('.')[0];
        this.writeFunction(command.label, command.numLocalVariables, output);
        break;
      case "C_CALL":
        this.writeCall(command.label, command.numParamaters, output);
        break;
      case "C_RETURN":
        this.writeReturn(output);
        break;
      default:
        throw new CodeWriterException('Unknown command: "'+command.command+'"');
    }

    this.writeCommands(output);
  };

  this.writePush = function(segment, index, output) {
    if (segment == "constant") {
      output.push("@" + index);
      output.push("D=A");
      this.push(output);
      this.inc(output);
    } else if (segment === "temp") {
      output.push("@"+(this.options[segment+"Start"] + index));
      output.push("D=M");
      this.push(output);
      this.inc(output);
    } else if (segment == "pointer") {
      label = CodeWriter.getLabelForPointer(index);
      output.push("@"+label);
      this.finishPush(output);
    } else if (_.contains(INDIRECT_SEGMENTS, segment)) {
      label = CodeWriter.getLabelFromCommand(segment);

      output.push("@" + label);

      // only add the index if it isn't zero
      if (index !== 0) {
        output.push("D=M");
        output.push("@"+index);
        output.push("D=D+A"); // data now has the address of the static var we need
        output.push("A=D"); // our temp variable now has the address we should pop from
      } else {
        output.push("A=M"); // our temp variable now has the address we should pop from
      }

      output.push("D=M"); // actually get content for register

      // put content onto the stack
      this.push(output);
      this.inc(output);
    } else if (segment === "static") {
      output.push("@" + this.currentFile + "." + index);
      output.push("D=M");
      this.push(output);
      this.inc(output);
    } else {
      throw new CodeWriterException('Unknown push location: "'+segment+'"');
    }
  };

  this.writePop = function(segment, index, output) {

    this.pop(output);
    output.push("D=M");

    // pointer segments are direct
    if (segment == "pointer") {
      label = CodeWriter.getLabelForPointer(index);
      output.push("@"+label);
      output.push("M=D");
    } else if (segment === "temp") {
      output.push("@"+(this.options[segment+"Start"] + index));
      output.push("M=D");

      output.push("@SP");
      output.push("A=M");
      output.push("D=M");
    } else if (_.contains(INDIRECT_SEGMENTS, segment)) {
      label = CodeWriter.getLabelFromCommand(segment);
      output.push("@" + label);
      output.push("D=M");
      output.push("@"+index);

      output.push("D=D+A"); // data now has the address of the static var we need
      output.push("@R13");
      output.push("M=D"); // store for later

      output.push("@SP");
      output.push("A=M");
      output.push("D=M");

      output.push("@R13");
      output.push("A=M");
      output.push("M=D");
    } else if (segment === "static") {
      output.push("@" + this.currentFile + "." + index);
      output.push("M=D");
    } else {
      throw new CodeWriterException('Unknown pop location: "'+segment+'"');
    }
  };

  this.writeArithmetic = function(command, output) {
    if(_.contains(["eq", "lt", "gt"], command)){
      label = command.toUpperCase().replace('T','E');

      if (command == "eq") {
        label = "NE";
      }

      // store this value for later
      this.pop(output);
      output.push("D=M");
      this.pop(output);
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

  this.writeFunction = function(functionName, numLocalVariables, output) {
    // add label so we can jump here
    output.push("("+functionName+")");

    // set all our local variables to 0
    for (var i = 0; i < numLocalVariables; i++) {
      this.writePush("constant", 0, output);
    }
  };

  this.writeCall = function(functionName, numParamaters, output) {
    // push return address
    output.push("@RETURN"+this.labelprefex);
    output.push("D=A");
    this.push(output);
    this.inc(output);

    // push LCL, ARG, THIS and THAT to our stack frame
    var codeWriter = this;
    _.each(["LCL", "ARG", "THIS", "THAT"], function(label){
      output.push("@"+label);
      output.push("D=M");
      codeWriter.push(output);
      codeWriter.inc(output);
    });

    // set LCL to current SP
    output.push("@SP");
    output.push("D=M");
    output.push("@LCL");
    output.push("M=D");

    // set ARG to SP - numParamaters - STACK_FRAME_LENGTH
    output.push("@"+(numParamaters + STACK_FRAME_LENGTH));
    output.push("D=D-A");
    output.push("@ARG");
    output.push("M=D");

    // jump to the function body
    output.push("@"+functionName);
    output.push("0;JMP");

    output.push("(RETURN"+this.labelprefex+")");
    this.labelprefex++;
  };

  this.writeReturn = function(output) {
    // save the return address in R15
    output.push("@LCL");
    output.push("D=M");
    output.push("@"+STACK_FRAME_LENGTH);
    output.push("D=D-A");
    output.push("A=D");
    output.push("D=M");
    output.push("@R15");
    output.push("M=D");

    // put this functions return value as the first thing on the stack
    output.push("@SP");
    output.push("A=M-1");
    output.push("D=M");
    output.push("@ARG");
    output.push("A=M");
    output.push("M=D");

    // makes SP point to 1 before the old ARG postion
    output.push("@ARG");
    output.push("D=M");
    output.push("@SP");
    output.push("M=D+1");

    // make LCL, ARG, THIS and THAT equal their old values
    var labels = ["THAT", "THIS", "ARG", "LCL"];
    _.each(labels, function(label) {
      output.push("@LCL");
      output.push("M=M-1");
      output.push("A=M");

      output.push("D=M");
      output.push("@"+label);
      output.push("M=D");
    });

    // jump to the return value
    output.push("@R15");
    output.push("A=M");
    output.push("0;JMP");
  };

  this.writeCommands = function(commands) {
    fs.appendFileSync(outFilename, commands.join('\n') + '\n');
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
    case 0:
      return "THIS";
    case 1:
      return "THAT";
    default:
      throw new CodeWriterException('Unknown location for pointer: "'+command+'"');
  }
};

function CodeWriterException(message) {
  this.name = "CodeWriterException";
  this.message = message;
}
