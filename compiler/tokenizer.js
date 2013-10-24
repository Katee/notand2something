var _ = require('underscore');

module.exports = Tokenizer;

function Tokenizer(fileContents) {
  this.fileContents = fileContents;

  /**
   * The current token, can become the next token by calling 'advance'
   */
  this.currentToken;
}

/**
 * Returns true if there are more tokns in the stream
 */
Tokenizer.prototype.hasMoreTokens = function() {
};

/**
 * Gets the next token from the input and makes it the current token
 */
Tokenizer.prototype.advance = function() {
};

/**
 * Returns the type of a token
 */
Tokenizer.tokenType = function(token) {
  // keyword, symbol, indentifier, int_const, string_const
};

/**
 * Returns the keybord of a "keyword" type token
 */
Tokenizer.tokenType = function(token) {
  // class, method, function, constructor
  // int, boolean, char, void
  // var, static, field, let, do, if, else, while, return, true, false, null, this
};

/**
 * Returns the symbol for a token
 */
Tokenizer.symbol = function(token) {
};

/**
 * Returns the identifier for a token
 */
Tokenizer.identifier = function(token) {
};

/**
 * Returns the integer value for a token
 */
Tokenizer.intVal = function(token) {
};

/**
 * Returns the string value for a token
 */
Tokenizer.stringVal = function(token) {
};
