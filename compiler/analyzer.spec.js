var _ = require('underscore');
var Tokenizer = require('./tokenizer');
var AnalyzerModule = require('./analyzer');
AnalyzerModule.debug = false;

var Term = AnalyzerModule.Term;
var Expression = AnalyzerModule.Expression;
var ExpressionList = AnalyzerModule.ExpressionList;
var SubroutineCall = AnalyzerModule.SubroutineCall;
var Statement = AnalyzerModule.Statement;

describe('Integer Constants', function() {

  it("have a minimum value", function() {
    var tokens = getAllTokens('-1');
    expect(Term.consume, tokens).toThrow();
  });

  it("have a maximum value", function() {
    var tokens = getAllTokens('32768');
    expect(Term.consume, tokens).toThrow();
  });

});

describe('Terms', function() {

  it('can be an integerConstant', function() {
    var tokens = getAllTokens('5');
    var term = Term.consume(tokens)[0];
    expect(term.content.content).toBe('5');
  });

  it('can be an stringConstant', function() {
    var tokens = getAllTokens('"string!"');
    var term = Term.consume(tokens)[0];
    expect(term.content.content).toBe('string!');
  });

  it('can be be some keywordConstants', function() {
    var tokens = getAllTokens('true');
    var term = Term.consume(tokens)[0];
    expect(term.content.content).toBe('true');
  });

  it('can be any identifier', function() {
    var tokens = getAllTokens('foo');
    var term = Term.consume(tokens)[0];
    expect(term.content.content).toBe('foo');
  });

  it('can be a subroutine call', function() {
    var tokens = getAllTokens('foo()');
    var term = Term.consume(tokens)[0];
    expect(term.content.subroutine.content).toBe('foo');
  });

  it('can unaryOp and then a term', function() {
    var tokens = getAllTokens('-5');
    var term = Term.consume(tokens)[0];
    expect(term.content[0].content).toBe('-');
    expect(term.content.length).toBe(2);
  });

  it('can be an expression in parens', function() {
    var tokens = getAllTokens('(5 * 2)');
    var term = Term.consume(tokens)[0];
    expect(term.content.terms.length).toBe(3);
  });

});

describe("Expressions", function() {

  it("expressions are terms followed by operators paired with a term", function() {
    var tokens = getAllTokens('7 + 5');
    var expression = Expression.consume(tokens)[0];
    expect(expression.terms.length).toBe(3);
  });

  it("trailing ops are not part of the expression", function() {
    var tokens = getAllTokens('7 + 5 -');
    var expression = Expression.consume(tokens)[0];
    expect(expression.terms.length).toBe(3);
  });

});

describe("Expression lists", function() {

  it("can contain any expression split by commas", function() {
    var tokens = getAllTokens('"string", 7, true, false, this, null, foo(), 5 * 5');
    var expressionList = ExpressionList.consume(tokens)[0];
    expect(expressionList.expressions.length).toBe(8);
  });

});

describe('SubroutineCall', function() {

  it('can be called without a class or var', function() {
    var tokens = getAllTokens('foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall.subroutine.content).toBe('foo');
  });

  it('can be called on this', function() {
    var tokens = getAllTokens('this.foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall.object.content).toBe('this');
    expect(subroutineCall.subroutine.content).toBe('foo');
  });

  it('cannot be called on most keywords', function() {
    var tokens = getAllTokens('true.foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall).toBe(null);
  });

  it("except for this", function() {
    var tokens = getAllTokens('this.foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall).not.toBe(null);
  });

  it('cant be called on classes', function() {
    var tokens = getAllTokens('ClassName.foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall).not.toBe(null);
  });

  it('can be called on variables', function() {
    var tokens = getAllTokens('bar.foo()');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall).not.toBe(null);
  });

  it('subroutine calls can have paramaters', function() {
    var tokens = getAllTokens('foo(5)');
    var subroutineCall = SubroutineCall.consume(tokens)[0];
    expect(subroutineCall).not.toBe(null);
    expect(subroutineCall.expressionList.expressions.length).toBe(1);
  });

});

describe("Statements:", function() {

  describe("Do statements", function() {

    it("are just a call to a subroutine wrapped in 'do' and ';'", function() {
      var tokens = getAllTokens("do foo.bar();");
      var doStatement = Statement.DoStatement.consume(tokens)[0];
      expect(doStatement.tag).toBe('doStatement');
    });

  });

});

// Helper method to that gets all tokens from a string
function getAllTokens(string) {
  var tokenizer = new Tokenizer(string);

  var tokens = [];
  while (tokenizer.hasMoreText()) {
    tokenizer.advance();
    tokens.push(tokenizer.currentToken);
  }
  return tokens;
}
