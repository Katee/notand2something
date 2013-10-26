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
  this.index = 0;

  /**
   * The current token, can become the next token by calling 'advance'
   */
  this.currentToken;
}

/**
 * Returns true if there is more text to parse
 */
Tokenizer.prototype.hasMoreText = function() {
  return this.index < this.text.length;
};

/**
 * set the current token and advance over any whitespace
 */
Tokenizer.prototype.setToken = function(token) {
  this.currentToken = token;
  this.consumeWhitespace();
  return token;
};

// advances until something that isn't whitespace
Tokenizer.prototype.consumeWhitespace = function() {
  while (this.hasMoreText() && isWhitespace(this.text, this.index)) {
    this.index++;
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
  this.consumeWhitespace();

  // save the current index as it is the start of our token
  var tokenStartIndex = this.index;

  if (isIntegerPart(this.text, this.index)) {
    // integer parts and start are the same
    return this.consumeInteger(tokenStartIndex);
  } else if (isInlineCommentStart(this.text, this.index)) {
    return this.consumeInlineComment(tokenStartIndex);
  } else if (isBlockCommentStart(this.text, this.index)) {
    return this.consumeBlockComment(tokenStartIndex);
  } else if (isStringStart(this.text, this.index)) {
    return this.consumeString(tokenStartIndex);
  } else if (isWordStart(this.text, this.index)) {
    return this.consumeWord(tokenStartIndex);
  } else if (isSymbol(this.text, this.index)) {
    return this.consumeSymbol(tokenStartIndex);
  } else {
    throw {name: "SyntaxError", message: "Not sure what happened"};
  }
};

Tokenizer.prototype.consumeInteger = function(tokenStartIndex) {
  do {
    this.index++;
  } while (this.hasMoreText() && isIntegerPart(this.text, this.index));

  var integer = this.text.slice(tokenStartIndex, this.index);
  if (Number(integer) <= MAX_INTEGER && Number(integer) >= MIN_INTEGER) {
    return this.setToken(new IntegerConstant(integer));
  } else {
    throw {name: "IntegerOutOfBounds", message: integer + ' is not in the range ' + MIN_INTEGER + '..' + MAX_INTEGER};
  }
};

Tokenizer.prototype.consumeInlineComment = function(tokenStartIndex) {
  this.index = this.index + INLINE_COMMENT.length;

  while (this.hasMoreText() && isAllowedInInlineComments(this.text, this.index)) {
    this.index++;
  }

  // offset by one to ignore the newline if not at end of string
  var tokenEnd = this.index - (this.index < this.text.length ? 1 : 0);
  return this.setToken(new Comment(this.text.slice(tokenStartIndex, tokenEnd)));
};

Tokenizer.prototype.consumeBlockComment = function(tokenStartIndex) {
  while (this.hasMoreText() && isBlockCommentPart(this.text, this.index)) {
    this.index++;
  }
  this.index = this.index + BLOCK_COMMENT_END.length;
  return this.setToken(new Comment(this.text.slice(tokenStartIndex, this.index)));
};

Tokenizer.prototype.consumeString = function(tokenStartIndex) {
  do {
    this.index++;
  } while (this.hasMoreText() && isStringPart(this.text, this.index))

  this.index++;// consume closing quote

  // return the string without the quotes
  return this.setToken(new StringConstant(this.text.slice(tokenStartIndex + 1, this.index - 1)));
};

Tokenizer.prototype.consumeWord = function(tokenStartIndex) {
  do {
    this.index++;
  } while (this.hasMoreText() && isAllowedInWord(this.text, this.index))

  // A word can be a keyword or an indentifier
  var word = this.text.slice(tokenStartIndex, this.index);
  if (_.contains(KEYWORDS, word)) {
    return this.setToken(new Keyword(word));
  } else {
    return this.setToken(new Identifier(word));
  }
};

Tokenizer.prototype.consumeSymbol = function(tokenStartIndex) {
  this.index++;
  return this.setToken(new Symbol(this.text.slice(tokenStartIndex, this.index)));
};

function isBlockCommentStart(text, index) {
  return text.slice(index, index + BLOCK_COMMENT_START.length) === BLOCK_COMMENT_START;
}

function isBlockCommentPart(text, index) {
  return text.slice(index, index + 2) !== BLOCK_COMMENT_END;
}

function isInlineCommentStart(text, index) {
  return text.slice(index, index + INLINE_COMMENT.length) === INLINE_COMMENT;
}

function isAllowedInInlineComments(text, index) {
  return text[index].match(LINE_ENDING) === null;
}

function isWordStart(text, index) {
  return text[index].match(/[a-zA-Z_]/);
}

function isAllowedInWord(text, index) {
  return text[index].match(/[a-zA-Z0-9_]/);
}

function isIntegerPart(text, index) {
  return text[index].match(/[0-9]/);
}

function isSymbol(text, index) {
  return _.contains(SYMBOLS, text[index]);
}

function isStringStart(text, index) {
  return text[index] === '"';
}

function isStringPart(text, index) {
  if (text[index].match('\n')) {
    throw {name: 'SyntaxError', message: 'String does not end before end of line.'};
  }
  return text[index].match(/[^"]/) !== null;
}

function isWhitespace(text, index) {
  return text[index].match(/\s/) !== null;
}

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
