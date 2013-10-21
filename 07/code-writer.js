var _ = require('underscore');
var fs = require('fs');

module.exports = CodeWriter;

// for eq, lt and gt 0 is true, -1 is false

function CodeWriter(filename) {
  this.filename = filename;
  this.labelprefex = 0;

  // pop back in the stack
  this.pop = function(output) {
    output.push("@SP");
    output.push("M=M-1");
    output.push("A=M");
  };

  // push the value in the D register
  this.push = function(output) {
    output.push("@SP");
    output.push("A=M");
    output.push("M=D");
  };

  // increment stack
  this.inc = function(output) {
    output.push("@SP");
    output.push("M=M+1");
  };

  this.write = function(parsedCommand) {
    var output = [];
    console.log(parsedCommand);

    if (parsedCommand.type == "C_PUSH") {
      if (parsedCommand.args[0] == "constant") {
        output.push("@" + parsedCommand.args[1]);
        output.push("D=A");
        this.push(output);
        this.inc(output);
      } else {
        throw {name: 'UnknownPushLocation', message: 'Unknown push location: "'+parsedCommand.args[0]+'"'};
      }
    } else if (parsedCommand.type == 'C_IF') {
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
        var label = parsedCommand.command.toUpperCase().replace('T','E');
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

      output.push("@0");
      output.push("M=M+1");

      this.labelprefex++;
    } else if (parsedCommand.type == 'C_ARITHMETIC') {
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

    fs.appendFileSync(filename, output.join('\n') + '\n\n');
  };

  this.writeCommands = function(commands) {
    fs.appendFileSync(filename, commands.join('\n') + '\n');
  };
}
