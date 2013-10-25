var _ = require('underscore');

module.exports = Tokenizer;

var BLOCK_COMMENT_START = "/*";
var BLOCK_COMMENT_END = "*/";
var INLINE_COMMENT = "//";
var SYMBOLS = "{}()[].,;+-*/&|<>=~";
var keywords = [
  "class", "constructor", "function", "method", "field", "static",
  "var", "method", "field", "static", "var", "int", "char",
  "boolean", "void", "true", "false", "null", "this",
  "let", "do", "if", "else", "while", "return"
];

function Tokenizer(fileContents) {
  this.fileContents = fileContents;

  this.currentCharacter = 0;
  this.currentLine = 0;
  this.nameStack = [];
  this.stack = [];

  /*
   * All inline comments and blank lines removed and joined into a string
   */
  this.text = Tokenizer.cleanUp(fileContents.split('\n')).join(" ");
  this.textIndex = 0;

  /**
   * The current token, can become the next token by calling 'advance'
   */
  this.currentToken;

  this.test = [];

  this.isStartOfBlockComment = function() {
    return this.text.slice(this.textIndex, this.textIndex + 2) === BLOCK_COMMENT_START;
  };

  this.isInBlockComment = function() {
    return this.hasMoreText() && this.text.slice(this.textIndex, this.textIndex + 2) !== BLOCK_COMMENT_END;
  };

  this.isStartOfWord = function() {
    return this.hasMoreText() && this.text[this.textIndex].match(/[a-zA-Z_]/);
  };

  this.isInWord = function() {
    return this.hasMoreText() && this.text[this.textIndex].match(/[a-zA-Z0-9_]/);
  };

  this.isIntegerPart = function() {
    return this.hasMoreText() && this.text[this.textIndex].match(/[0-9]/);
  };

  this.isSymbol = function() {
    return _.contains(SYMBOLS, this.text[this.textIndex]);
  };

  this.isStartOfString = function() {
    return this.hasMoreText() && this.text[this.textIndex] === '"';
  };

  this.isInString = function() {
    return this.hasMoreText() && this.text[this.textIndex].match(/[^"]/) !== null;
  };
}

Tokenizer.cleanUp = function(lines) {
  return Tokenizer.removeEmptyLines(Tokenizer.removeInlineComments(lines));
};

Tokenizer.removeInlineComments = function(lines) {
  return _.chain(lines).map(function(line){
    // deal with the special case of block comments like /* *//* */
    var indexOf = line.indexOf(BLOCK_COMMENT_END + BLOCK_COMMENT_START);
    if (indexOf > -1) {
      line = line.replace(BLOCK_COMMENT_END + BLOCK_COMMENT_START, '');
    }

    // remove inline comments
    indexOf = line.indexOf(INLINE_COMMENT);
    if (indexOf > -1) {
      line = line.slice(0, indexOf);
    }

    // trim whitespace from the line
    return line.replace(/^\s+|\s+$/g, '');
  }).value();
};

Tokenizer.removeEmptyLines = function(lines) {
  return _.reject(lines, function(line){
    return line.length === 0;
  });
};

/**
 * Returns true if there are more tokens in the stream
 */
Tokenizer.prototype.hasMoreTokens = function() {
  return this.hasMoreText();
};

/**
 * Returns true if there is more text to parse
 */
Tokenizer.prototype.hasMoreText = function() {
  return this.textIndex < this.text.length;
};

/**
 * Gets the next token from the input and makes it the current token
 */
Tokenizer.prototype.advance = function() {
  // no more tokens
  if (!this.hasMoreText()) {
    this.currentToken = undefined;
    return;
  }

  // ignore any whitespace
  if (this.text[this.textIndex] === " ") {
    this.textIndex++;
    this.advance();
    return;
  }

  // save the current index as it is the start of our token
  var tokenStartIndex = this.textIndex;

  // ignore block comments
  if (this.isStartOfBlockComment()) {
    while (this.isInBlockComment()) {
      this.textIndex++;
    }
    this.textIndex = this.textIndex + BLOCK_COMMENT_END.length;
    this.advance();
    return;
  }

  // if we are in a string go to the end of it then return it
  if (this.isIntegerPart()) {
    this.textIndex++;
    while (this.isIntegerPart()) {
      this.textIndex++;
    }

    this.currentToken = new IntegerConstant(this.text.slice(tokenStartIndex, this.textIndex));
    return;
  }

  // if we are in a string go to the end of it then return it
  if (this.isStartOfString()) {
    this.textIndex++;
    while (this.isInString()) {
      this.textIndex++;
    }
    this.textIndex++;

    // return the string without the quotes
    this.currentToken = new StringConstant(this.text.slice(tokenStartIndex + 1, this.textIndex - 1));
    return;
  }

  // if we are in a word go to the end of it then return it
  while (this.isStartOfWord()) {
    this.textIndex++;

    while (this.isInWord()) {
      this.textIndex++;
    }

    // A word can be a keyword or an indentifier
    var word = this.text.slice(tokenStartIndex, this.textIndex);
    if (_.contains(keywords, word)) {
      this.currentToken = new Keyword(word);
    } else {
      this.currentToken = new Identifier(word);
    }
    return;
  }

  // if it is a symbol
  if (this.isSymbol()) {
    this.textIndex++;

    this.currentToken = new Symbol(this.text.slice(tokenStartIndex, this.textIndex));
    return;
  }
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
