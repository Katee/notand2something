describe("Tokenizer tests", function() {

  var Tokenizer = require('./tokenizer');

  it("Ignores inline comments", function() {
    var tokenizer = new Tokenizer("// inline comment\nnull // another inline comment");
    expect(tokenizer.text).toBe("null");
  });

  it("Ignores block comments", function() {
    var tokenizer = new Tokenizer("/* block comment \n with newline */null/* another block */");
    tokenizer.advance();
    expect(tokenizer.currentToken).toBe("null");
  });

  it("Tokenizes a let statement", function() {
    var tokenizer = new Tokenizer('let x = y;');
    var tokens = getAllTokens(tokenizer);
    expect(tokens).toEqual(['let', 'x', '=', 'y', ';']);
  });

  it("Can deal with missing spaces", function() {
    var tokenizer = new Tokenizer('let x=y;');
    var tokens = getAllTokens(tokenizer);
    expect(tokens).toEqual(['let', 'x', '=', 'y', ';']);
  });

  it("Can have numbers in variable names", function() {
    var tokenizer = new Tokenizer('let x1=y;');
    var tokens = getAllTokens(tokenizer);
    expect(tokens).toEqual(['let', 'x1', '=', 'y', ';']);
  });

  it("Tokenizes double quoted strings.", function() {
    var tokenizer = new Tokenizer('let string = "A double quoted string.";');
    var tokens = getAllTokens(tokenizer);
    expect(tokens[3]).toBe("A double quoted string.");
  });

  // Helper method to that gets all tokens from an initialized tokenizer
  function getAllTokens(tokenizer) {
    var tokens = [];
    while (tokenizer.hasMoreTokens()) {
      tokenizer.advance();
      tokens.push(tokenizer.currentToken);
    }
    return tokens;
  }

});
