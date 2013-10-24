var _ = require('underscore');

module.exports = CompilationEngine;

function CompilationEngine(stream) {
  this.stream = stream;

  /**
   * The current token, can become the next token by calling 'advance'
   */
  this.currentToken;
}

/**
 * Complies a complete class
 */
CompilationEngine.compileClass = function() {
};

/**
 * Complies a static or field declaration
 */
CompilationEngine.compileClassVarDec = function() {
};

/**
 * Complies a complete method or constructor
 */
CompilationEngine.compileSubroutine = function() {
};

/**
 * Complies a parameter list not including enclosing "()"
 */
CompilationEngine.compileParameterList = function() {
};

/**
 * Compiles a var declaration
 */
CompilationEngine.compileVarDec = function() {
};

/**
 * Compiles sequence of statements not including enclosing "{}"
 */
CompilationEngine.compileStatements = function() {
};

CompilationEngine.compileDo = function() {
};

CompilationEngine.compileLet = function() {
};

CompilationEngine.compileWhile = function() {
};

CompilationEngine.compileReturn = function() {
};

CompilationEngine.compileIf = function() {
};

CompilationEngine.compileExpression = function() {
};

/**
 * Compiles a term, this requires look ahead to distinguish between
 * variable, array entry and subroutine calls.
 */
CompilationEngine.compileTerm = function() {
};

CompilationEngine.compileExpressionList = function() {
};
