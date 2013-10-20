var _ = require('underscore');

module.exports = {
  dest: function(memonic){
    var bits = [0,0,0];
    if (_.contains(memonic, "A")) {
      bits[0] = 1;
    }
    if (_.contains(memonic, "D")) {
      bits[1] = 1;
    }
    if (_.contains(memonic, "M")) {
      bits[2] = 1;
    }
    return bits.join("");
  },
  comp: function(memonic){
    switch (memonic) {
    case "0":
      return "0101010";
    case "1":
      return "0111111";
    case "-1":
      return "0111010";
    case "D":
      return "0001100";
    case "A":
      return "0110000";
    case "!D":
      return "0001101";
    case "!A":
      return "0110001";
    case "-D":
      return "0001111";
    case "-A":
      return "0110011";
    case "D+1":
      return "0011111";
    case "A+1":
      return "0110111";
    case "D-1":
      return "0001110";
    case "A-1":
      return "0110010";
    case "D+A":
      return "0000010";
    case "D-A":
      return "0010011";
    case "A-D":
      return "0010011";
    case "D&A":
      return "0000000";
    case "D|A":
      return "0010101";
    case "M":
      return "1110000";
    case "!M":
      return "1110001";
    case "-M":
      return "1110011";
    case "M+1":
      return "1110111";
    case "M-1":
      return "1110010";
    case "D+M":
      return "1000010";
    case "D-M":
      return "1010011";
    case "M-D":
      return "1000111";
    case "D&M":
      return "1000000";
    case "D|M":
      return "1010101";
    default:
      return "0000000";
    }
  },
  jump: function(memonic){
    switch (memonic) {
    case "JGT":
      return "001";
    case "JGQ":
      return "010";
    case "JGE":
      return "011";
    case "JLT":
      return "100";
    case "JNE":
      return "101";
    case "JLE":
      return "110";
    case "JMP":
      return "111";
    default:
      return "000";
    }
  }
};
