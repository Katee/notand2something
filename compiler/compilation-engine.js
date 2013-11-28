var _ = require('underscore');
var util = require('util');
var SymbolTable = require('./symbol-table');

module.exports = CompilationEngine;

var options = {
  debug_comments: true
};

var currentClassName;
var currentClass;
var output = [];
var symbolTable = new SymbolTable();
var labelNonces = {
  'if': 0,
  'while': 0
};

function CompilationEngine() {}

CompilationEngine.compileClass = function(klass) {
  currentClassName = klass.name.content;
  currentClass = klass;
  _.each(klass.classVarDecs, CompilationEngine.compileClassVarDec);
  _.each(klass.subroutineDecs, CompilationEngine.compileSubroutine);
};

function countVarDecs(varDecs) {
  return _.reduce(varDecs, function(memo, varDec){
    return memo + varDec.varNames.length;
  }, 0);
}

CompilationEngine.compileClassVarDec = function(classVarDec) {
  _.each(classVarDec.varNames, function(varName) {
    symbolTable.add(varName.content, classVarDec.decorator.content, classVarDec.type.content);
  });
};

CompilationEngine.compileSubroutine = function(subroutineDec) {
  currentSubroutine = subroutineDec;

  // the symbol table should be clean for each subroutine
  symbolTable.clearSubroutine();
  labelNonces = {
    'if': 0,
    'while': 0
  };

  CompilationEngine.compileParameterList(subroutineDec.parameters);

  var numLocalVariables = countVarDecs(subroutineDec.body.varDecs);
  addOutput(util.format("function %s.%s %s", currentClassName, subroutineDec.name.content, numLocalVariables));

  if (subroutineDec.kind.content === 'constructor') {
    var numFields = _.chain(currentClass.classVarDecs).filter(function(a){
      return a.decorator.content === 'field';
    }).reduce(function(memo, varDec){
      return memo + varDec.varNames.length;
    }, 0).value();

    if (numFields > 0) {
      addOutput('push constant ' + numFields);
      addOutput('call Memory.alloc 1');
    }
    addOutput('pop pointer 0');
  } else if (subroutineDec.kind.content === 'method') {
    addOutput('push argument 0');
    addOutput('pop pointer 0');
  }

  _.each(subroutineDec.body.varDecs, CompilationEngine.compileVarDec);

  CompilationEngine.compileStatements(subroutineDec.body.statements);
};

CompilationEngine.compileParameterList = function(parameterList) {
  if (_.contains(['method'], currentSubroutine.kind.content)) {
    symbolTable.add('__increment-counter__', 'argument', 'boolean');
  }

  _.each(parameterList, function(parameter){
    symbolTable.add(parameter.varName.content, 'argument', parameter.type.content);
  });
};

CompilationEngine.compileVarDec = function(varDec) {
  _.each(varDec.varNames, function(varName) {
    symbolTable.add(varName.content, 'local', varDec.type.content);
  });
};

CompilationEngine.compileStatements = function(statements) {
  _.each(statements, CompilationEngine.compileStatement);
};

CompilationEngine.compileStatement = function(statement) {
  var compilerMethod = getMethodFromTag(statement.tag);
  if (CompilationEngine[compilerMethod]) {
    return CompilationEngine[compilerMethod](statement);
  }
};

CompilationEngine.compileDoStatement = function(doStatement) {
  var subroutineCall = doStatement.subroutineCall;
  CompilationEngine.compileSubroutineCall(subroutineCall);
  addOutput('pop temp 0');
};

CompilationEngine.compileSubroutineCall = function(subroutineCall) {
  var numLocalVariables = subroutineCall.expressions.length;
  var symbol;

  // get the subroutine call as a string
  if (_.contains(['method', 'constructor'], currentSubroutine.kind.content)) {
    if (subroutineCall.object !== undefined) {
      symbol = symbolTable.get(subroutineCall.object.content);
      if (symbol !== undefined) {
        addOutput(util.format('push this %s', symbol.index));
        numLocalVariables++;
      }
    } else {
      addOutput('push pointer 0');
      numLocalVariables++;
    }
  } else {
    symbol = symbolTable.get(subroutineCall.object.content);
    if (symbol != undefined) {
      pushPopSymbol(subroutineCall.object.content, 'push');
      numLocalVariables++;
    }
  }

  if (subroutineCall.expressions.length > 0) {
    _.each(subroutineCall.expressions, CompilationEngine.compileExpression);
  }

  var s = _.chain([(symbol ? {content: symbol.type} : subroutineCall.object) || {content: currentClassName}, subroutineCall.subroutine]).pluck('content').value().join('.');
  addOutput(util.format("call %s %s", s, numLocalVariables));
};

CompilationEngine.compileLetStatement = function(letStatement) {
  if (letStatement.varName.tag === "arrayExpression") {
    CompilationEngine.compileArrayExpression(letStatement.varName);
    CompilationEngine.compileExpression(letStatement.expression);

    addOutput("pop temp 0");
    addOutput("pop pointer 1");
    addOutput("push temp 0");
    addOutput("pop that 0");
  }

  if (letStatement.varName.tag === "identifier") {
    CompilationEngine.compileExpression(letStatement.expression);

    pushPopSymbol(letStatement.varName.content, 'pop');
  }
};

CompilationEngine.compileArrayExpression = function(arrayExpression) {
  CompilationEngine.compileExpression(arrayExpression.expression);
  pushPopSymbol(arrayExpression.varName.content, 'push');
  addOutput("add");
};

CompilationEngine.compileWhileStatement = function(whileStatement) {
  var localLabelNonce = "" + labelNonces['while'];
  labelNonces['while']++;

  addOutput("label WHILE_EXP" + localLabelNonce);
  CompilationEngine.compileExpression(whileStatement.predicate);
  addOutput("not");
  addOutput("if-goto WHILE_END" + localLabelNonce);
  CompilationEngine.compileStatements(whileStatement.statements);
  addOutput("goto WHILE_EXP" + localLabelNonce);
  addOutput("label WHILE_END" + localLabelNonce);
};

CompilationEngine.compileReturnStatement = function(returnStatement) {
  if (returnStatement.expression) {
    CompilationEngine.compileExpression(returnStatement.expression);
  } else {
    addOutput("push constant 0");
  }
  addOutput("return");
};

CompilationEngine.compileIfStatement = function(ifStatement) {
  var localLabelNonce = "" + labelNonces['if'];
  labelNonces['if']++;

  var hasElse = ifStatement.elseStatements !== undefined;

  CompilationEngine.compileExpression(ifStatement.predicate);

  addOutput('if-goto IF_TRUE' + localLabelNonce);
  addOutput('goto IF_FALSE' + localLabelNonce);
  addOutput('label IF_TRUE' + localLabelNonce);

  CompilationEngine.compileStatements(ifStatement.statements);

  if (hasElse) {
    addOutput('goto IF_END' + localLabelNonce);
  }

  addOutput('label IF_FALSE' + localLabelNonce);

  if (hasElse) {
    CompilationEngine.compileStatements(ifStatement.elseStatements);
    addOutput('label IF_END' + localLabelNonce);
  }
};

CompilationEngine.compileExpression = function(expression) {
  if (expression.tag !== 'expression') {
    CompilationEngine.compileTerm(expression);
    return;
  }

  var terms = expression.terms;

  // TODO this is pretty ugly
  if (terms.length == 1) {
    CompilationEngine.compileTerm(terms[0]);
  } else if (terms.length == 2) {
    CompilationEngine.compileTerm(terms[1]);
    CompilationEngine.compileTerm(terms[0]);
  } else if (terms.length >= 3) {
    CompilationEngine.compileExpression(terms[0]);
    CompilationEngine.compileExpression(terms[2]);
    CompilationEngine.compileExpression(terms[1]);
    var newTerms = [{tag: 'empty'}];
    newTerms.push(terms.slice(3));
    newTerms = _.flatten(newTerms, true);
    var subExpression = {tag: 'expression', terms: newTerms};
    CompilationEngine.compileExpression(subExpression);
  }
};

CompilationEngine.compileTerm = function(term) {
  if (term === undefined || term.tag == 'empty') {
    return;
  }

  if (term.content.tag === 'integerConstant') {
    addOutput(util.format("push constant %s", term.content.content));
  } else if (term.content.tag === 'expression') {
    CompilationEngine.compileExpression(term.content);
  } else if (term.tag === 'symbol') {
    addOutput(symbolToVM(term.content));
  } else if (term.content.tag === 'stringConstant') {
    var string = term.content.content;
    addOutput(util.format("push constant %s", string.length));
    addOutput("call String.new 1");
    for (i in string) {
      addOutput(util.format("push constant %s", string.charCodeAt(i)));
      addOutput("call String.appendChar 2");
    }
  } else if (term.content.tag === "subroutineCall") {
    var subroutineCall = term.content;
    CompilationEngine.compileSubroutineCall(subroutineCall);
  } else if (term.content.tag === "identifier") {
    pushPopSymbol(term.content.content, 'push');
  } else if (term.content.tag === "arrayExpression") {
    CompilationEngine.compileArrayExpression(term.content);
    addOutput("pop pointer 1");
    addOutput("push that 0");
  } else if (term.content.tag === "unaryOpTerm") {
    CompilationEngine.compileExpression(term.content.content[1]);
    var s = symbolToVM(term.content.content[0].content);
    if (s === 'sub') {
      addOutput('neg');
    } else {
      addOutput(s);
    }
  } else if (term.content.tag === "keyword") {
    if (_.contains(['true', 'null', 'false'], term.content.content)) {
      addOutput('push constant 0');
    } else {
      // the other option is it is 'this'
      addOutput('push pointer 0');
    }

    if (term.content.content === 'true') {
      // true needs to be negated
      addOutput('not');
    }
  } else {
    throw {message: util.format("not sure what to do with term '%s'", symbol)};
  }
};

CompilationEngine.compileExpressionList = function(expressions) {
  _.each(expressions, CompilationEngine.compileExpression);
};

function addOutput(text) {
  output.push(text);
  console.log(text);
}

function getMethodFromTag(tag) {
  return 'compile' + tag[0].toUpperCase() + tag.slice(1);
}

function symbolToVM(symbol) {
  if (symbol === "*") {
    return "call Math.multiply 2";
  } else if (symbol === "/") {
    return "call Math.divide 2";
  } else if (symbol === "+") {
    return "add";
  } else if (symbol === "-") {
    return "sub";
  } else if (symbol === "<") {
    return "lt";
  } else if (symbol === ">") {
    return "gt";
  } else if (symbol === "~") {
    return "not";
  } else if (symbol === "&") {
    return "and";
  } else if (symbol === "|") {
    return "or";
  } else if (symbol === "=") {
    return "eq";
  } else {
    throw {message: util.format("symbol '%s' not defined", symbol)};
  }
}

function pushPopSymbol(symbolName, popOrPush, offset) {
  var symbol = symbolTable.get(symbolName);
  if (offset) {
    symbol.index = symbol.index + offset;
  }
  var kind = symbol.kind;
  if (kind == 'field') {
    kind = 'this';
  }
  addOutput(util.format("%s %s %s", popOrPush, kind, symbol.index));
}
