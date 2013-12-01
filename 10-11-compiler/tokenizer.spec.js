var _ = require('underscore');
var Tokenizer = require('./tokenizer');

describe("Comments", function() {

  it("are a type of token", function() {
    var tokens = getAllTokens("/* comment */");
    expect(_.first(tokens).content).toBe("/* comment */");
  });

  it("can be inline", function() {
    var tokens = getAllTokens("// inline comment\nreturn;// another inline comment");
    tokens = _.reject(tokens, isTokenComment);
    expect(_.first(tokens).content).toBe("return");
  });

  it("can be block", function() {
    var tokens = getAllTokens("/* block comment \n with newline */return;/* another block */");
    tokens = _.reject(tokens, isTokenComment);
    expect(_.first(tokens).content).toBe("return");
  });

  it("block comments can come directly after another block comment", function() {
    var tokens = getAllTokens("/* block comment \n with newline *//* another block */return;");
    tokens = _.reject(tokens, isTokenComment);
    expect(_.first(tokens).content).toBe("return");
  });

  it("block comments end must end before EOF", function() {
    var brokenBlockComment = "/* block comment";
    expect(getAllTokens, brokenBlockComment).toThrow();
  });

  it("block comments can contain double quotes", function() {
    var tokens = getAllTokens('/* "comment" */');
    expect(tokens[0].content).toBe('/* "comment" */');
  });

  it("block comments can contain //", function() {
    var tokens = getAllTokens('/* //comment */return;');
    tokens = _.reject(tokens, isTokenComment);
    expect(_.first(tokens).content).toBe("return");
  });

  it("can end in a comment", function() {
    var tokens = getAllTokens("return;// comment");
    tokens = _.reject(tokens, isTokenComment);
    expect(_.first(tokens).content).toBe("return");
  });

  it("inline comments never include the newline", function() {
    var tokens = getAllTokens("// comment\n");
    var token = tokens[0];
    expect(token.content.match('\n')).toBe(null);
  });

});

describe("Identifiers", function() {

  it("may contain digits", function() {
    var token = getAllTokens('x1;')[0];
    expect(_.pick(token, ['tag', 'content'])).toEqual({tag: "identifier", content: "x1"});
  });

  it("may not start with a digit", function() {
    var token = getAllTokens('1x;')[0];
    expect(token.tag).not.toEqual("identifier");
  });

  it("may start with and contain underscores", function() {
    var token = getAllTokens('_x_')[0];
    expect(_.pick(token, ['tag', 'content'])).toEqual({tag: "identifier", content: "_x_"});
  });

});

describe("Strings", function() {

  it("are double quoted", function() {
    var tokens = getAllTokens('let string = "A double quoted string";');
    expect(tokens[3].content).toBe("A double quoted string");
  });

  it("may not contain newlines", function() {
    var tokenizer = new Tokenizer('"this string has\ntwo lines";');
    expect(tokenizer.advance).toThrow();
  });

  it("must terminate", function() {
    var tokenizer = new Tokenizer('"this string');
    expect(tokenizer.advance).toThrow();
  });

});

describe("Integers", function() {

  it("are made of digits", function() {
    var token = getAllTokens('1234')[0];
    expect(token.content).toBe('1234');
  });

  it("cannot be negative", function() {
    var token = getAllTokens('-1234')[0];
    expect(token.tag).not.toBe('integerConstant');
  });

});

describe("Statements", function() {

  it("Tokenizes a let statement", function() {
    var tokens = getAllTokens('let x = y;');
    tokens = _.map(tokens, getTokenContent);
    expect(tokens).toEqual(['let', 'x', '=', 'y', ';']);
  });

  it("whitespace is not required around symbols", function() {
    var tokens = getAllTokens('let x=y;');
    tokens = _.map(tokens, getTokenContent);
    expect(tokens).toEqual(['let', 'x', '=', 'y', ';']);
  });

});

describe("Metadata", function() {

  it("contains the line of the source file where the token came from", function() {
    var tokens = getAllTokens('1\n2\n//comment\n4', {include_line_numbers: true});
    expect(tokens[0].line).toEqual(1);
    expect(_.last(tokens).line).toEqual(4);
  });

});

// Helper method to that gets all tokens from a string
function getAllTokens(string, options) {
  var tokenizer = new Tokenizer(string, options);

  var tokens = [];
  while (tokenizer.hasMoreText()) {
    tokenizer.advance();
    tokens.push(tokenizer.currentToken);
  }
  return tokens;
}

// Helper method to that gets all non comment tokens
function getAllNonCommentTokens(tokens) {
  return _.reject(tokens, isTokenComment);
}

function getTokenContent(token) {
  return token.content;
}

function isTokenComment(token) {
  return token.tag === "comment";
}
