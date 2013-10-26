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
  "let", "do", "if", "else", "while", "return"
];

var MIN_INTEGER = 0;
var MAX_INTEGER = 32767;

var LINE_ENDING = '\n';

function Tokenizer(fileContents) {
  // normalize line endings
  this.text = fileContents.split('\n').join(LINE_ENDING);
  this.textIndex = 0;

  /**
   * The current token, can become the next token by calling 'advance'
   */
  this.currentToken;
}

/**
 * Returns true if there is more text to parse
 */
Tokenizer.prototype.hasMoreText = function() {
  return this.textIndex < this.text.length;
};

/**
 * set the current token and advance over any whitespace
 */
Tokenizer.prototype.setToken = function(token) {
  this.currentToken = token;
  this.advanceOverWhitespace();
};

// advances until something that isn't whitespace
Tokenizer.prototype.advanceOverWhitespace = function() {
  while (this.isWhitespace()) {
    this.textIndex++;
  }
};

/**
 * Gets the next token from the input and makes it the current token
 */
Tokenizer.prototype.advance = function() {
  // no more tokens
  if (!this.hasMoreText()) {
    return this.setToken(undefined);
  }

  // ignore any whitespace
  this.advanceOverWhitespace();

  // save the current index as it is the start of our token
  var tokenStartIndex = this.textIndex;

  // ignore inline comments
  if (this.isInlineCommentStart()) {
    this.textIndex = this.textIndex + INLINE_COMMENT.length;
    while (this.isInlineCommentPart()) {
      this.textIndex++;
    }
    // offset by one to ignore the newline if not at end of string
    var tokenEnd = this.textIndex - (this.textIndex < this.text.length ? 1 : 0);
    return this.setToken(new Comment(this.text.slice(tokenStartIndex, tokenEnd)));
  }

  // ignore block comments
  if (this.isBlockCommentStart()) {
    while (this.isBlockCommentPart()) {
      this.textIndex++;
    }
    this.textIndex = this.textIndex + BLOCK_COMMENT_END.length;
    return this.setToken(new Comment(this.text.slice(tokenStartIndex, this.textIndex)));
  }

  // if we are in a string go to the end of it then return it
  if (this.isIntegerPart()) {
    this.textIndex++;
    while (this.isIntegerPart()) {
      this.textIndex++;
    }

    var integer = this.text.slice(tokenStartIndex, this.textIndex);
    if (Number(integer) <= MAX_INTEGER && Number(integer) >= MIN_INTEGER) {
      return this.setToken(new IntegerConstant(integer));
    } else {
      throw {name: "IntegerOutOfBounds", message: integer + ' is not in the range ' + MIN_INTEGER + '..' + MAX_INTEGER};
    }
  }

  // if we are in a string go to the end of it then return it
  if (this.isStringStart()) {
    this.textIndex++;
    while (this.isStringPart()) {
      this.textIndex++;
    }
    this.textIndex++;

    // return the string without the quotes
    return this.setToken(new StringConstant(this.text.slice(tokenStartIndex + 1, this.textIndex - 1)));
  }

  // if we are in a word go to the end of it then return it
  while (this.isWordStart()) {
    this.textIndex++;

    while (this.isWordPart()) {
      this.textIndex++;
    }

    // A word can be a keyword or an indentifier
    var word = this.text.slice(tokenStartIndex, this.textIndex);
    if (_.contains(KEYWORDS, word)) {
      return this.setToken(new Keyword(word));
    } else {
      return this.setToken(new Identifier(word));
    }
  }

  // if it is a symbol
  if (this.isSymbol()) {
    this.textIndex++;
    return this.setToken(new Symbol(this.text.slice(tokenStartIndex, this.textIndex)));
  }
};

Tokenizer.prototype.isBlockCommentStart = function() {
  return this.hasMoreText() && this.text.slice(this.textIndex, this.textIndex + BLOCK_COMMENT_START.length) === BLOCK_COMMENT_START;
};

Tokenizer.prototype.isBlockCommentPart = function() {
  return this.hasMoreText() && this.text.slice(this.textIndex, this.textIndex + 2) !== BLOCK_COMMENT_END;
};

Tokenizer.prototype.isInlineCommentStart = function() {
  return this.hasMoreText() && (this.text.slice(this.textIndex, this.textIndex + INLINE_COMMENT.length) === INLINE_COMMENT);
};

Tokenizer.prototype.isInlineCommentPart = function() {
  return this.hasMoreText() && this.text[this.textIndex].match(LINE_ENDING) === null;
};

Tokenizer.prototype.isWordStart = function() {
  return this.hasMoreText() && this.text[this.textIndex].match(/[a-zA-Z_]/);
};

Tokenizer.prototype.isWordPart = function() {
  return this.hasMoreText() && this.text[this.textIndex].match(/[a-zA-Z0-9_]/);
};

Tokenizer.prototype.isIntegerPart = function() {
  return this.hasMoreText() && this.text[this.textIndex].match(/[0-9]/);
};

Tokenizer.prototype.isSymbol = function() {
  return _.contains(SYMBOLS, this.text[this.textIndex]);
};

Tokenizer.prototype.isStringStart = function() {
  return this.hasMoreText() && this.text[this.textIndex] === '"';
};

Tokenizer.prototype.isStringPart = function() {
  return this.hasMoreText() && this.text[this.textIndex].match(/[^"]/) !== null;
};

Tokenizer.prototype.isWhitespace = function() {
  return this.hasMoreText() && this.text[this.textIndex].match(/\s/) !== null;
};

function StringConstant(content) {
  this.type = "stringConstant";
  this.content = content;
}

function IntegerConstant(content) {
  this.type = "integerConstant";
  this.content = content;
}

function Keyword(content) {
  this.type = "keyword";
  this.content = content;
}

function Identifier(content) {
  this.type = "identifier";
  this.content = content;
}

function Symbol(content) {
  this.type = "symbol";
  this.content = content;
}

function Comment(content) {
  this.type = "comment";
  this.content = content;
}
