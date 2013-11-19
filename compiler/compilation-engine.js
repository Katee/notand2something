var _ = require('underscore');
var util = require('util');

module.exports = CompilationEngine;

function getMethodFromTag(tag) {
  return 'compile' + tag[0].toUpperCase() + tag.slice(1);
}

function CompilationEngine() {}

var currentClassName;
var output = [];

function addOutput(text) {
  output.push(text);
  console.log(text);
}

CompilationEngine.compileClass = function(klass) {
  currentClassName = klass.name.content;
  _.each(klass.subroutineDecs, CompilationEngine.compileSubroutine);
};

CompilationEngine.compileClassVarDec = function() {
};

CompilationEngine.compileSubroutine = function(subroutineDec) {
  addOutput(util.format("function %s.%s %s", currentClassName, subroutineDec.name.content, subroutineDec.parameters.length));
  _.each(subroutineDec.body.statements, CompilationEngine.compileStatements);
};

CompilationEngine.compileParameterList = function() {
};

CompilationEngine.compileVarDec = function() {
};

CompilationEngine.compileStatements = function(statement) {
  var compilerMethod = getMethodFromTag(statement.tag);
  if (CompilationEngine[compilerMethod]) {
    return CompilationEngine[compilerMethod](statement);
  }
};

CompilationEngine.compileDoStatement = function(doStatement) {
  var subroutineCall = doStatement.subroutineCall;
  _.each(subroutineCall.expressionList.expressions, CompilationEngine.compileExpression);
  addOutput(util.format("call %s 1", _.compact([subroutineCall.object.content, subroutineCall.subroutine.content]).join('.')));
};

CompilationEngine.compileLetStatement = function() {
};

CompilationEngine.compileWhileStatement = function() {
};

CompilationEngine.compileReturnStatement = function(returnStatement) {
  addOutput("pop temp 0"); // hack
  if (returnStatement.expression) {
    CompilationEngine.compileExpression(returnStatement.expression);
  } else {
    addOutput("push constant 0");
  }
  addOutput("return");
};

CompilationEngine.compileIfStatement = function() {
};

CompilationEngine.compileExpression = function(expression) {
  if (expression.tag === "expression") {
    if (expression.terms.length === 3) {
      // a bit of a hack
      CompilationEngine.compileTerm(expression.terms[0]);
      CompilationEngine.compileTerm(expression.terms[2]);
      CompilationEngine.compileTerm(expression.terms[1]);
    } else {
      CompilationEngine.compileExpression(expression.terms[0]);
    }
  } else if (expression.tag === "term") {
    CompilationEngine.compileTerm(expression);
  }
};

CompilationEngine.compileTerm = function(term) {
  if (term.content.tag === 'integerConstant') {
    addOutput(util.format("push constant %s", term.content.content));
  } else if (term.content.tag === 'expression') {
    CompilationEngine.compileExpression(term.content);
  } else if (term.tag === 'symbol') {
    addOutput(symbolToVM(term.content));
  } else {
    // TODO
  }
};

CompilationEngine.compileExpressionList = function(expressions) {
  _.each(expressions, CompilationEngine.compileExpression);
};

function symbolToVM(symbol) {
  if (symbol === "*") {
    return "call Math.multiply 2";
  } else if (symbol === "+") {
    return "add";
  }
}
