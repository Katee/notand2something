var _ = require('underscore');

module.exports = Tokenizer;

var BLOCK_COMMENT_START = "/*";
var BLOCK_COMMENT_END = "*/";
var INLINE_COMMENT = "//";
var SYMBOLS = "{}()[].,;+-*/&|<>=~";
var KEYWORDS = [
  "class", "constructor", "function", "method", "field", "static",
  "var", "method", "field", "static", "var", "int", "char",
  "boolean", "void", "true", "false", "null", "this",
  "let", "do", "if", "else", "while", "return" ];
var STRING_QUOTE = '"';
var DIGIT = /[0-9]/;
var LINE_ENDING = '\n';

var default_options = {
  include_line_numbers: false
};

function Token(tag, content) {
  this.tag = tag;
  this.content = content;
}

function Tokenizer(fileContents, options) {
  // normalize line endings
  this.text = fileContents.split('\n').join(LINE_ENDING);
  this.options = _.extend(default_options, options);

  /**
   * The current token, can become the next token by calling 'advance'
   */
  this.currentToken;
  this.index = 0;
  this.line = 1;

  // clear any whitespace at the beginning of the file
  this.consumeWhitespace();
}

Tokenizer.prototype.hasMoreText = function() {
  return this.curChar() !== undefined;
};

Tokenizer.prototype.curChar = function() {
  return this.text[this.index];
};

/**
 * set the current token and advance over any whitespace
 */
Tokenizer.prototype.setToken = function(token) {
  // keep the line number for use in error messages
  if (this.options.include_line_numbers) {
    token.line = this.line;
  }
  this.currentToken = token;

  // clear any whitespace, this saves us from having
  // a undefined token when a file ends in whitespace
  this.consumeWhitespace();

  return token;
};

/**
 * Gets the next token from the input and makes it the current token
 */
Tokenizer.prototype.advance = function() {
  // no more tokens
  if (!this.hasMoreText()) {
    return this.setToken(undefined);
  }

  // save the current index as it is the start of our token
  var tokenStartIndex = this.index;

  var parsers = ['consumeInteger', 'consumeInlineComment',
    'consumeBlockComment', 'consumeString', 'consumeWord', 'consumeSymbol'];

  for (i in parsers) {
    var parser = parsers[i];
    var token = this[parser](tokenStartIndex);
    if (token !== null) {
      return this.setToken(token);
    }
  }

  throw {name: "SyntaxError", message: "Not sure what happened on line " + this.line};
};

Tokenizer.prototype.consumeInteger = function(tokenStartIndex) {
  if (!this.curChar().match(DIGIT)) return null;

  do {
    this.index++;
  } while (this.hasMoreText() && this.curChar().match(DIGIT));

  return new Token('integerConstant', this.text.slice(tokenStartIndex, this.index));
};

Tokenizer.prototype.consumeInlineComment = function(tokenStartIndex) {
  if (!(this.text.substr(this.index, INLINE_COMMENT.length) === INLINE_COMMENT)) return null;

  this.index = this.index + INLINE_COMMENT.length;

  while (this.hasMoreText() && !this.curChar().match(LINE_ENDING)) {
    this.index++;
  }

  return new Token('comment', this.text.slice(tokenStartIndex, this.index));
};

Tokenizer.prototype.consumeBlockComment = function(tokenStartIndex) {
  if (!(this.text.substr(this.index, BLOCK_COMMENT_START.length) === BLOCK_COMMENT_START)) return null;

  while (this.hasMoreText() && this.text.substr(this.index, BLOCK_COMMENT_END.length) !== BLOCK_COMMENT_END) {
    this.index++;
  }
  this.index = this.index + BLOCK_COMMENT_END.length;
  return new Token('comment', this.text.slice(tokenStartIndex, this.index));
};

Tokenizer.prototype.consumeString = function(tokenStartIndex) {
  if (!(this.curChar() === STRING_QUOTE)) return null;

  do {
    this.index++;
    if (!this.hasMoreText() || this.curChar().match(LINE_ENDING)) {
      throw {name: 'SyntaxError', message: 'Expected end of string on line ' + this.line};
    }
  } while (!(this.curChar() === STRING_QUOTE))

  // consume closing quote
  this.index++;

  // get the string without quotes
  var string = this.text.slice(tokenStartIndex + 1, this.index - 1);
  return new Token('stringConstant', string);
};

Tokenizer.prototype.consumeWord = function(tokenStartIndex) {
  if (!this.curChar().match(/[a-zA-Z_]/)) return null;

  do {
    this.index++;
  } while (this.hasMoreText() && this.curChar().match(/[a-zA-Z0-9_]/))

  // A word can be a keyword or an indentifier
  var word = this.text.slice(tokenStartIndex, this.index);
  var tag = _.contains(KEYWORDS, word) ? 'keyword' : 'identifier';
  return new Token(tag, word);
};

Tokenizer.prototype.consumeSymbol = function(tokenStartIndex) {
  if (!_.contains(SYMBOLS, this.curChar())) return null;
  this.index++;
  return new Token('symbol', this.text.substr(tokenStartIndex, 1));
};

// advances until something that isn't whitespace
Tokenizer.prototype.consumeWhitespace = function() {
  while (this.hasMoreText() && this.curChar().match(/\s/)) {
    if (this.curChar().match(LINE_ENDING)) {
      this.line++;
    }
    this.index++;
  }
};
