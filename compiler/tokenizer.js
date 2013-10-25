var _ = require('underscore');

module.exports = Tokenizer;

var BLOCK_COMMENT_START = "/*";
var BLOCK_COMMENT_END = "*/";
var INLINE_COMMENT = "//";
var symbols = "{}()[].,;+-*/&|<>=~";

function Tokenizer(fileContents) {
  this.fileContents = fileContents;
  this.lines = Tokenizer.removeInlineComments(fileContents.split('\n'));
  this.totalLines = this.lines.length;

  this.currentCharacter = 0;
  this.currentLine = 0;
  this.nameStack = [];
  this.stack = [];

  /*
   * All code with inline comments removed joined into a string
   */
  this.text = Tokenizer.removeInlineComments(fileContents.split('\n')).join(" ");
  this.textIndex = 0;

  /**
   * The current token, can become the next token by calling 'advance'
   */
  this.currentToken;

  this.test = [];

  this.isStartOfBlockComment = function() {
    return this.text.slice(this.textIndex, this.textIndex + 2) === BLOCK_COMMENT_START;
  };

  // If we enter a block comment keep scanning until the comment block ends
  this.advanceUntilEndOfBlockComment = function() {
    return this.advanceUntil(BLOCK_COMMENT_END, 2);
  };

  // Got to the end of a string and return the string
  this.advanceUntilEndString = function() {
    return this.advanceUntil('"', 1);
  };

  this.advanceUntilEndOfWord = function() {
    var length = 1;
    var endWordIndex = this.textIndex;
    while (true) {
      endWordIndex = endWordIndex + length;
      if (!_.contains(symbols+" ", this.text[endWordIndex])) {
        break;
      }
    }
    this.textIndex = endWordIndex;
    return endWordIndex;
  };

  this.isStartOfWord = function() {
    return this.text.slice(this.textIndex).match(/[a-zA-Z]/);
  };

  this.isInWord = function() {
    return this.textIndex < this.text.length && this.text[this.textIndex].match(/[a-zA-Z0-9\$]/);
  };

  this.isSymbol = function() {
    return _.contains(symbols, this.text[this.textIndex]);
  };

  this.isStartOfString = function() {
    return this.textIndex < this.text.length && this.text[this.textIndex] === '"';
  };

  this.isInString = function() {
    return this.textIndex < this.text.length && this.text[this.textIndex].match(/[^"]/) !== null;
  };

  this.advanceUntil = function(string, length) {
    while (this.textIndex < this.text.length - length) {
      if (this.text.slice(this.textIndex, this.textIndex + length) === string) {
        this.textIndex = this.textIndex + length;
        tokenStartIndex = this.textIndex;
        break;
      }
      this.textIndex += 1;
    }
    return this.textIndex;
  };
}

Tokenizer.removeInlineComments = function(lines) {
  return _.chain(lines).map(function(line){
    var indexOf = line.indexOf(INLINE_COMMENT);
    if (indexOf > -1) {
      line = line.slice(0, indexOf);
    }
    return line.replace(/^\s+|\s+$/g, '');
  }).reject(function(line){
    return line.length === 0;
  }).value();
};

/**
 * Returns true if there are more tokns in the stream
 */
Tokenizer.prototype.hasMoreTokens = function() {
  return this.textIndex < this.text.length;
};

/**
 * Gets the next token from the input and makes it the current token
 */
// Strings
// Whitespace
// etc
Tokenizer.prototype.advance = function() {
  if (this.textIndex >= this.text.length) return;
  var tokenStartIndex = this.textIndex;
  var wasInWord = false;
  var wasInSymbol = false;
  var wasInString = false;

  // ignore any whitespace
  while (this.text[this.textIndex] === " ") {
    this.textIndex++;
    tokenStartIndex++;
  }

  // ignore block comments
  if (this.isStartOfBlockComment()) {
    this.advanceUntilEndOfBlockComment();
    tokenStartIndex = this.textIndex;
  }

  // ignore any whitespace
  while (this.text[this.textIndex] === " ") {
    this.textIndex++;
    tokenStartIndex++;
  }

  // if we are in a string go to the end of it then return it
  if (this.isStartOfString()) {
    wasInString = true;
    this.textIndex++;
    while (this.isInString()) {
      this.textIndex++;
    }
    this.textIndex++;
  }
  if (wasInString) {
    // return the string without the quotes
    this.currentToken = this.text.slice(tokenStartIndex + 1, this.textIndex - 1);
    return;
  }

  // if we are in a word go to the end of it then return it
  while (this.isInWord()) {
    wasInWord = true;
    this.textIndex++;
  }
  if (wasInWord) {
    this.currentToken = this.text.slice(tokenStartIndex, this.textIndex);
    return;
  }

  // if it is a symbol
  if (this.isSymbol()) {
    wasInSymbol = true;
    this.textIndex++;
  }
  if (wasInSymbol) {
    this.currentToken = this.text.slice(tokenStartIndex, this.textIndex);
    return;
  }
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

function Expression() {
  this.terminated = terminated;
  this.children = children;
  this.value = value;
  this.type;
}
