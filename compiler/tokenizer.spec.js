var _ = require('underscore');
var Tokenizer = require('./tokenizer');

describe("Comments", function() {

  it("are a type of token", function() {
    var tokenizer = new Tokenizer("// comment");
    var tokens = getAllTokens(tokenizer);
    expect(_.first(tokens).content).toBe("// comment");
  });

  it("can be inline", function() {
    var tokenizer = new Tokenizer("// inline comment\nreturn;// another inline comment");
    var tokens = getAllNonCommentTokens(tokenizer);
    expect(_.first(tokens).content).toBe("return");
  });

  it("can be block", function() {
    var tokenizer = new Tokenizer("/* block comment \n with newline */return;/* another block */");
    var tokens = getAllNonCommentTokens(tokenizer);
    expect(_.first(tokens).content).toBe("return");
  });

  it("block comments can come directly after another block comment", function() {
    var tokenizer = new Tokenizer("/* block comment \n with newline *//* another block */return;");
    var tokens = getAllNonCommentTokens(tokenizer);
    expect(_.first(tokens).content).toBe("return");
  });

  it("block comments can contain double quotes", function() {
    var tokenizer = new Tokenizer('/* "comment" */');
    expect((tokenizer.advance()).content).toBe('/* "comment" */');
  });

  it("block comments can contain //", function() {
    var tokenizer = new Tokenizer('/* //comment */return;');
    var tokens = getAllNonCommentTokens(tokenizer);
    expect(_.first(tokens).content).toBe("return");
  });

  it("can end in a comment", function() {
    var tokenizer = new Tokenizer("return;// comment");
    var tokens = getAllNonCommentTokens(tokenizer);
    expect(_.first(tokens).content).toBe("return");
  });

});

describe("Identifiers", function() {

  it("may contain digits", function() {
    var tokenizer = new Tokenizer('x1;');
    tokenizer.advance();
    expect(tokenizer.currentToken).toEqual({type: "identifier", content: "x1"});
  });

  it("may not start with a digit", function() {
    var tokenizer = new Tokenizer('1x;');
    tokenizer.advance();
    expect(tokenizer.currentToken.type).not.toEqual("identifier");
  });

  it("may start with and contain underscores", function() {
    var tokenizer = new Tokenizer('_x_');
    tokenizer.advance();
    expect(tokenizer.currentToken).toEqual({type: "identifier", content: "_x_"});
  });

});

describe("Strings", function() {

  it("are double quoted", function() {
    var tokenizer = new Tokenizer('let string = "A double quoted string";');
    var tokens = getAllTokens(tokenizer);
    expect(tokens[3].content).toBe("A double quoted string");
  });

  it("may not contain newlines", function() {
    var tokenizer = new Tokenizer('"this string has\ntwo lines";');
    expect(tokenizer.advance).toThrow();
  });

});

describe("Integers", function() {

  it("are made of digits", function() {
    var tokenizer = new Tokenizer('1234');
    expect((tokenizer.advance()).content).toBe('1234');
  });

  it("cannot be negative", function() {
    var tokenizer = new Tokenizer('-1234');
    expect((tokenizer.advance()).type).not.toBe('integerConstant');
  });

  it("have a maximum value", function() {
    var tokenizer = new Tokenizer('32768');
    expect(tokenizer.advance).toThrow();
  });

});

describe("Statements", function() {

  it("Tokenizes a let statement", function() {
    var tokenizer = new Tokenizer('let x = y;');
    var tokens = _.map(getAllTokens(tokenizer), getTokenContent);
    expect(tokens).toEqual(['let', 'x', '=', 'y', ';']);
  });

  it("whitespace is not required around symbols", function() {
    var tokenizer = new Tokenizer('let x=y;');
    var tokens = _.map(getAllTokens(tokenizer), getTokenContent);
    expect(tokens).toEqual(['let', 'x', '=', 'y', ';']);
  });

});

// Helper method to that gets all tokens from an initialized tokenizer
function getAllTokens(tokenizer) {
  var tokens = [];
  while (tokenizer.hasMoreText()) {
    tokenizer.advance();
    tokens.push(tokenizer.currentToken);
  }
  return tokens;
}

// Helper method to that gets all non comment tokens
function getAllNonCommentTokens(tokenizer) {
  var tokens = getAllTokens(tokenizer);
  return _.reject(tokens, isTokenComment);
}

function getTokenContent(token) {
  return token.content;
}

function isTokenComment(token) {
  return token.type === "comment";
}
