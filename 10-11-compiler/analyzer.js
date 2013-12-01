var _ = require('underscore');

module.exports.Term = Term;
module.exports.Expression = Expression;
module.exports.SubroutineCall = SubroutineCall;
module.exports.ArrayExpression = ArrayExpression;
module.exports.ExpressionList = ExpressionList;
module.exports.Statement = Statement;
module.exports.ClassVarDec = ClassVarDec;
module.exports.VarDec = VarDec;
module.exports.Type = Type;
module.exports.Parameter = Parameter;
module.exports.ParameterList = ParameterList;
module.exports.SubroutineBody = SubroutineBody;
module.exports.SubroutineDec = SubroutineDec;
module.exports.Class = Class;

var debug = module.exports.debug = true;

var KEYWORDS_CONSTANTS = ['this', 'true', 'false', 'null'];
var TYPES = ['int', 'char', 'boolean'];
var SUBROUTINE_TYPES = ['constructor', 'function', 'method'];
var OPERATORS = ['+', '-', '*', '/', '&', '|', '<', '>', '='];
var UNARY_OPERATORS = ['-', '~'];
var MIN_INTEGER = 0;
var MAX_INTEGER = 32767;

function matchPatternToTokens(pattern, tokens) {
  var remainingTokens = tokens;
  var results = [];

  for (i in pattern) {
    var pattern_token = pattern[i];
    var required = true;
    var parser;

    if (typeof(pattern_token) === 'string') {
      parser = {
        consume: function(t) {
          return Literal.consume(pattern[i], t);
        }
      };
    } else if (typeof(pattern_token) === "function") {
      parser = pattern_token;
    } else if (typeof(pattern_token) === "object") {
      if (pattern_token.info === "optional") {
        required = false;
      }
      parser = pattern_token.parser;
    }

    var thing = parser.consume(remainingTokens);

    if (required && thing[0] === null) {
      return [null, tokens];
    }

    remainingTokens = thing[1];
    results.push(thing[0]);
  }

  return [results, remainingTokens];
}

function eitherConsumer(parsers) {
  var t = function(){};
  t.consume = function(tokens) {
    for (i in parsers) {
      var parser = parsers[i];
      var thing = parser.consume(tokens);
      if (thing[0] !== null) {
        return [thing[0], thing[1]];
      }
    }
    return [null, tokens];
  };
  return t;
}

var Literal = {
  consume: function(literal, tokens) {
    if (tokens !== undefined && tokens[0] !== undefined && tokens[0].content === literal) {
      return [tokens[0], tokens.slice(1)];
    }
    return [null, tokens];
  }
};

function SingleToken(matchFn) {
  this.matchFn = matchFn;
};

SingleToken.prototype.consume = function(tokens) {
  if (tokens === undefined || tokens[0] === undefined) {
    return [null, tokens];
  }
  var token = tokens[0];
  if (this.matchFn(token)) {
    return [token, tokens.slice(1)];
  } else {
    return [null, tokens];
  }
}

function Term() {
  this.tag = 'term';
  this.content;
}

Term.consume = function(tokens) {
  var term = new Term();
  var token = tokens[0];

  var result = eitherConsumer([IntegerConstant, StringConstant, SubroutineCall,
    KeywordConstant, ArrayExpression, VarName, UnaryOpTerm]).consume(tokens);

  if (result[0] !== null) {
    term.content = result[0];
    return [term, result[1]];
  }

  var literal = Literal.consume('(', tokens);
  if (literal[0] !== null) {
    expression = Expression.consume(literal[1]);
    if (expression[0] !== null) {
      if (expression[1][0] !== undefined && expression[1][0].content === ')') {
        term.content = expression[0];
        return [term, expression[1].slice(1)];
      }
    }
  }

  var unaryOp = UnaryOp.consume(tokens);
  if (unaryOp[0] !== null) {
    var remainingTokens = unaryOp[1];
    var nextTerm = Term.consume(remainingTokens);
    if (nextTerm) {
      term.content = [unaryOp[0], nextTerm[0].content];
      return [term, tokens.slice(1)];
    }
  }

  // this is not a term
  return [null, tokens];
};

var IntegerConstant = new SingleToken(function(token) {
  if (token.tag !== 'integerConstant') {
    return false;
  }
  var integer = token.content;
  if (Number(integer) <= MAX_INTEGER && Number(integer) >= MIN_INTEGER) {
    return true;
  } else {
    throw {name: "IntegerOutOfBounds", message: integer + ' is not in the range ' + MIN_INTEGER + '..' + MAX_INTEGER};
  }
});

var StringConstant = new SingleToken(function(token) {
  return token.tag == 'stringConstant';
});

var KeywordConstant = new SingleToken(function(token) {
  return token.tag === 'keyword' && _.contains(KEYWORDS_CONSTANTS, token.content);
});

var VarName = new SingleToken(function(token) {
  return (token.tag === 'keyword' && token.content === 'this')
        || token.tag === 'identifier';
});

var ClassName = new SingleToken(function(token) {
  return token.tag === 'identifier';
});

var SubroutineName = new SingleToken(function(token) {
  return token.tag === 'identifier';
});

var UnaryOp = new SingleToken(function(token) {
  return token.tag === 'symbol'
      && _.contains(UNARY_OPERATORS, token.content);
});

var Op = new SingleToken(function(token) {
  return token.tag === 'symbol'
      && _.contains(OPERATORS, token.content);
});

function Type(){}
Type.consume = function(tokens){
  var token = tokens[0];

  if (token === undefined) {
    return [null, tokens];
  }

  if (_.contains(TYPES, token.content)) {
    return [token, tokens.slice(1)];
  }

  var className = ClassName.consume(tokens);
  if (className[0] !== null) {
    return [className[0], className[1]];
  }

  return [null, tokens];
};

/**
 * An Expression is a term (op term)*
 */
function Expression() {
  this.tag = "expression";
  this.terms = [];
}

Expression.consume = function(tokens) {
  var expression = new Expression();
  var remainingTokens = tokens;

  term = Term.consume(remainingTokens);
  if (term[0] !== null) {
    expression.terms.push(term[0]);
    remainingTokens = term[1];
  } else {
    return [null, tokens];
  }

  // keep adding (op term) pairs
  while (true) {
    var op = Op.consume(remainingTokens);
    var term = Term.consume(remainingTokens.slice(1));
    if (op[0] !== null && term[0] !== null) {
      expression.terms.push(op[0]);
      expression.terms.push(term[0]);
      remainingTokens= term[1];
    } else {
      break;
    }
  }

  if (expression.terms.length > 0) {
    return [expression, remainingTokens];
  }
};

function ArrayExpression() {
  this.tag = "arrayExpression";
  this.varName;
  this.expression;
}

ArrayExpression.consume = function(tokens) {
  var arrayExpression = new ArrayExpression();
  var remainingTokens = tokens;
  var subroutineName;

  var varName = VarName.consume(remainingTokens);
  if (varName[0] !== null) {
    var openBracket = Literal.consume("[", varName[1]);
    if (openBracket[0] !== null) {
      var expression = Expression.consume(openBracket[1]);
      var closeBracket = Literal.consume("]", expression[1]);
      if (expression[0] !== null && closeBracket[0] !== null) {
        arrayExpression.expression = expression[0];
        arrayExpression.varName = varName[0];
        return [arrayExpression, closeBracket[1]];
      }
    }
  }

  return [null, tokens];
};

function UnaryOpTerm() {
  this.tag = "unaryOpTerm";
  this.content = [];
}

UnaryOpTerm.consume = function(tokens) {
  var unaryOpTerm = new UnaryOpTerm();

  var unop = UnaryOp.consume(tokens);
  if (unop[0] !== null) {
    term = Term.consume(unop[1]);
    if (term[0] !== null) {
      unaryOpTerm.content.push(unop[0]);
      unaryOpTerm.content.push(term[0]);
      return [unaryOpTerm, term[1]];
    }
  }

  return [null, tokens];
};

function SubroutineCall() {
  this.tag = "subroutineCall";
  this.object;
  this.subroutine;
  this.expressions = [];
}

SubroutineCall.consume = function(tokens) {
  var subroutineCall = new SubroutineCall();
  var remainingTokens = tokens;
  var subroutineName;

  if (tokens[1] !== undefined && tokens[1].content === '.') {
    // it's a object.foo() call
    var varName = VarName.consume(tokens);
    var className = ClassName.consume(tokens);
    var varOrClassName = varName[0] || className[0];

    if (varOrClassName !== null) {
      subroutineCall.object = varOrClassName;
      remainingTokens = tokens.slice(2);
    } else {
      return [null, tokens];
    }

    subroutineName = SubroutineName.consume(tokens.slice(2));
    if (subroutineName[0] !== null) {
      subroutineCall.subroutine = subroutineName[0];
      remainingTokens = subroutineName[1];
    } else {
      return [null, tokens];
    }
  } else {
    // it's just a foo() call
    subroutineName = SubroutineName.consume(tokens);
    if (subroutineName[0] !== null) {
      subroutineCall.subroutine = subroutineName[0];
      remainingTokens = subroutineName[1];
    } else {
      return [null, tokens];
    }
  }

  // consume the expression list
  if (remainingTokens[0] != undefined && remainingTokens[0].content === '(') {
    remainingTokens = remainingTokens.slice(1);
    var expressionList = ExpressionList.consume(remainingTokens);
    if (expressionList[0] !== null) {
      subroutineCall.expressions = expressionList[0].expressions;
    }
    if (expressionList[1][0].content === ')') {
      return [subroutineCall, expressionList[1].slice(1)];
    }
  }

  return [null, tokens];
};

function ExpressionList() {
  this.tag = "expressionList";
  this.expressions = [];
}

ExpressionList.consume = function(tokens) {
  var expressionList = new ExpressionList();
  var remainingTokens = tokens;

  var expression = Expression.consume(remainingTokens);
  if (expression[0] !== null) {
    expressionList.expressions.push(expression[0]);
    remainingTokens = expression[1];
  } else {
    return [null, tokens];
  }

  while (true) {
    var comma = Literal.consume(',', remainingTokens);
    expression = Expression.consume(comma[1]);
    if (comma[0] !== null && expression[0] !== null) {
      expressionList.expressions.push(expression[0]);
      remainingTokens = expression[1];
    } else {
      break;
    }
  }

  return [expressionList, remainingTokens];
};

function Statement() {}

Statement.consume = function(tokens) {
  var parsers = ['LetStatement', 'IfStatement', 'WhileStatement', 'DoStatement', 'ReturnStatement'];
  parsers = _.map(parsers, function(parser){return Statement[parser];});
  var result = eitherConsumer(parsers).consume(tokens);

  if (result[0] !== null) {
    return [result[0], result[1]];
  }

  return [null, tokens];
};

Statement.DoStatement = function(subroutineCall) {
  this.tag = "doStatement";
  this.subroutineCall = subroutineCall;
};

Statement.DoStatement.consume = function(tokens) {
  var pattern = ['do', SubroutineCall, ';'];
  var results = matchPatternToTokens(pattern, tokens);

  if (results[0] === null) {
    return [null, tokens];
  } else {
    return [{tag: 'doStatement', subroutineCall: results[0][1]}, results[1]];
  }
};

Statement.LetStatement = function () {
  this.tag = 'letStatement';
  this.varName;
  this.expression;
};

Statement.LetStatement.consume = function(tokens) {
  var letStatement = new Statement.LetStatement();
  var remainingTokens = tokens;

  var literal = Literal.consume('let', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  var varName = VarName.consume(remainingTokens);
  var arrayExpression = ArrayExpression.consume(remainingTokens);

  if (arrayExpression[0] !== null) {
    letStatement.varName = arrayExpression[0];
    remainingTokens = arrayExpression[1];
  } else if (varName[0] !== null) {
    letStatement.varName = varName[0];
    remainingTokens = varName[1];
  } else {
    return [null, tokens];
  }

  literal = Literal.consume('=', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  var expression = Expression.consume(remainingTokens);
  if (expression[0] === null) {
    return [null, tokens];
  }
  remainingTokens = expression[1];
  letStatement.expression = expression[0];

  literal = Literal.consume(';', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  return [letStatement, remainingTokens];
};

Statement.ReturnStatement = function () {
  this.tag = 'returnStatement';
  this.expression;
};

Statement.ReturnStatement.consume = function(tokens) {
  var pattern = ['return', {parser: Expression, info: 'optional'}, ';'];
  var results = matchPatternToTokens(pattern, tokens);

  if (results[0] === null) {
    return [null, tokens];
  } else {
    var returnStatement = new Statement.ReturnStatement();
    returnStatement.expression = results[0][1];
    return [returnStatement, results[1]];
  }
};

Statement.IfStatement = function (predicate, statements, elseStatements) {
  this.tag = 'ifStatement';
  this.predicate = predicate;
  this.statements = statements;
  this.elseStatements = elseStatements;
};

Statement.IfStatement.consume = function(tokens) {
  var remainingTokens = tokens;

  var literal = Literal.consume('if', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  literal = Literal.consume('(', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  var expression = Expression.consume(remainingTokens);
  if (expression[0] === null) {
    return [null, tokens];
  }
  remainingTokens = expression[1];

  literal = Literal.consume(')', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  literal = Literal.consume('{', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  var statements = [];
  while (true) {
    var statement = Statement.consume(remainingTokens);
    if (statement[0] !== null) {
      statements.push(statement[0]);
    } else {
      break;
    }
    remainingTokens = statement[1];
  }
  if (statements.length === 0) {
    return [null, tokens];
  }

  literal = Literal.consume('}', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  literal = Literal.consume('else', remainingTokens);
  if (literal[0] === null) {
    return [new Statement.IfStatement(expression[0], statements), remainingTokens];
  } else {
    remainingTokens = literal[1];

    if (remainingTokens[0].content !== '{') {
      return [null, tokens];
    }
    remainingTokens = remainingTokens.slice(1);

    var elseStatements = [];
    while (true) {
      statement = Statement.consume(remainingTokens);
      if (statement[0] !== null) {
        elseStatements.push(statement[0]);
      } else {
        break;
      }
      remainingTokens = statement[1];
    }
    if (statements.length === 0) {
      return [null, tokens];
    }

    literal = Literal.consume('}', remainingTokens);
    if (literal[0] === null) {
      return [null, tokens];
    }
    remainingTokens = literal[1];

    return [new Statement.IfStatement(expression[0], statements, elseStatements), remainingTokens];
  }

};

Statement.WhileStatement = function (predicate, statements) {
  this.tag = 'whileStatement';
  this.predicate = predicate;
  this.statements = statements;
};

Statement.WhileStatement.consume = function(tokens) {
  var remainingTokens  = tokens;

  var literal = Literal.consume('while', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  literal = Literal.consume('(', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  var expression = Expression.consume(remainingTokens);
  if (expression[0] === null) {
    return [null, tokens];
  }
  remainingTokens = expression[1];

  literal = Literal.consume(')', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  literal = Literal.consume('{', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  var statements = [];
  while (true) {
    var statement = Statement.consume(remainingTokens);
    if (statement[0] !== null) {
      statements.push(statement[0]);
    } else {
      break;
    }
    remainingTokens = statement[1];
  }
  if (statements.length === 0) {
    return [null, tokens];
  }

  literal = Literal.consume('}', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  return [new Statement.WhileStatement(expression[0], statements), remainingTokens];
};

function ClassVarDec() {
  this.tag = 'classVarDec';
  this.decorator;
  this.type;
  this.varNames = [];
}

ClassVarDec.consume = function(tokens) {
  var classVarDecTypes = ['static', 'field'];

  var classVarDec = new ClassVarDec();
  var remainingTokens = tokens;

  if (remainingTokens[0] === undefined || !_.contains(classVarDecTypes, tokens[0].content)) {
    return [null, tokens];
  }
  remainingTokens = remainingTokens.slice(1);
  classVarDec.decorator = tokens[0];

  var type = Type.consume(remainingTokens);
  if (type[0] === null) {
    return [null, tokens];
  }
  remainingTokens = type[1];
  classVarDec.type = type[0];

  var varName = VarName.consume(remainingTokens);
  if (varName[0] === null) {
    return [null, tokens];
  }
  remainingTokens = varName[1];
  classVarDec.varNames.push(varName[0]);

  while (true) {
    var comma = Literal.consume(',', remainingTokens);
    varName = VarName.consume(comma[1]);
    if (comma[0] !== null && varName[0] !== null) {
      classVarDec.varNames.push(varName[0]);
      remainingTokens = varName[1];
    } else {
      break;
    }
  }

  var literal = Literal.consume(';', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  return [classVarDec, remainingTokens];
};

function VarDec() {
  this.tag = 'varDec';
  this.type;
  this.varNames = [];
}

VarDec.consume = function(tokens) {
  var classVarDecTypes = ['var'];
  var remainingTokens = tokens;
  var varDec = new VarDec();

  if (!_.contains(classVarDecTypes, tokens[0].content)) {
    return [null, tokens];
  }
  remainingTokens = tokens.slice(1);

  var type = Type.consume(remainingTokens);
  if (type[0] === null) {
    return [null, tokens];
  }
  remainingTokens = type[1];
  varDec.type = type[0];

  var varName = VarName.consume(remainingTokens);
  if (varName[0] === null) {
    return [null, tokens];
  }
  remainingTokens = varName[1];
  varDec.varNames.push(varName[0]);

  while (true) {
    var comma = Literal.consume(',', remainingTokens);
    varName = VarName.consume(comma[1]);
    if (comma[0] !== null && varName[0] !== null) {
      varDec.varNames.push(varName[0]);
      remainingTokens = varName[1];
    } else {
      break;
    }
  }

  var literal = Literal.consume(';', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  return [varDec, remainingTokens];
};

function SubroutineBody() {
  this.tag = "subroutineBody";
  this.varDecs = [];
  this.statements = [];
}

SubroutineBody.consume = function(tokens) {
  var subroutineBody = new SubroutineBody();
  var remainingTokens = tokens;

  var literal = Literal.consume('{', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  while (true) {
    var varDec = VarDec.consume(remainingTokens);
    if (varDec[0] !== null) {
      subroutineBody.varDecs.push(varDec[0]);
      remainingTokens = varDec[1];
    } else {
      break;
    }
  }

  while (true) {
    var statement = Statement.consume(remainingTokens);
    if (statement[0] !== null) {
      subroutineBody.statements.push(statement[0]);
      remainingTokens = statement[1];
    } else {
      break;
    }
  }

  literal = Literal.consume('}', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  return [subroutineBody, remainingTokens];
};

function Parameter(type, varName) {
  this.tag = "parameter";
  this.type = type;
  this.varName = varName;
}

Parameter.consume = function(tokens) {
  var parameter = new Parameter();
  var remainingTokens = tokens;

  var type = Type.consume(remainingTokens);
  if (type[0] === null) {
    return [null, tokens];
  }
  remainingTokens = type[1];

  var varName = VarName.consume(remainingTokens);
  if (varName[0] === null) {
    return [null, tokens];
  }
  remainingTokens = varName[1];

  return [new Parameter(type[0], varName[0]), remainingTokens];
};

function ParameterList() {
  this.tag = "parameterList";
  this.parameters = [];
}

ParameterList.consume = function(tokens) {
  var parameterList = new ParameterList();
  var remainingTokens = tokens;

  var parameter = Parameter.consume(remainingTokens);
  if (parameter[0] !== null) {
    parameterList.parameters.push(parameter[0]);
    remainingTokens = parameter[1];
  } else {
    return [null, tokens];
  }

  while (true) {
    var comma = Literal.consume(',', remainingTokens);
    parameter = Parameter.consume(comma[1]);
    if (comma[0] !== null && parameter[0] !== null) {
      parameterList.parameters.push(parameter[0]);
      remainingTokens = parameter[1];
    } else {
      break;
    }
  }

  return [parameterList, remainingTokens];
};

function SubroutineDec() {
  this.tag = "subroutineDec";
  this.kind;
  this.type;
  this.name;
  this.parameters = [];
  this.body;
}

SubroutineDec.consume = function(tokens) {
  var subroutineDec = new SubroutineDec();
  var remainingTokens = tokens;
  var token = remainingTokens[0];

  if (token === undefined || !_.contains(SUBROUTINE_TYPES, token.content)) {
    return [null, tokens];
  }
  remainingTokens = remainingTokens.slice(1);
  subroutineDec.kind = token;

  var type = Type.consume(remainingTokens);
  token = remainingTokens[0];
  if (token.content === 'void') {
    subroutineDec.type = token;
    remainingTokens = remainingTokens.slice(1);
  } else if (type[0] !== null) {
    subroutineDec.type = type[0];
    remainingTokens = type[1];
  } else {
    return [null, tokens];
  }

  var subroutineName = SubroutineName.consume(remainingTokens);
  if (subroutineName[0] === null) {
    return [null, tokens];
  }
  remainingTokens = subroutineName[1];
  subroutineDec.name = subroutineName[0];

  var literal = Literal.consume('(', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  literal = Literal.consume(')', remainingTokens);
  if (literal[0] === null) {
    var parameterList = ParameterList.consume(remainingTokens);
    if (parameterList[0] === null) {
      return [null, tokens];
    }
    remainingTokens = parameterList[1];
    subroutineDec.parameters = parameterList[0].parameters;

    literal = Literal.consume(')', remainingTokens);
    if (literal[0] === null) {
      return [null, tokens];
    }
    remainingTokens = literal[1];
  } else {
    remainingTokens = literal[1];
  }

  var subroutineBody = SubroutineBody.consume(remainingTokens);
  if (subroutineBody[0] === null) {
    return [null, tokens];
  }
  subroutineDec.body = subroutineBody[0];
  remainingTokens = subroutineBody[1];

  return [subroutineDec, remainingTokens];
};

function Class() {
  this.tag = "class";
  this.name = null;
  this.classVarDecs = [];
  this.subroutineDecs = [];
}

Class.consume = function(tokens) {
  var klass = new Class();
  var remainingTokens = tokens;

  var literal = Literal.consume('class', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  var className = ClassName.consume(remainingTokens);
  if (className[0] === null) {
    return [null, tokens];
  }
  remainingTokens = className[1];
  klass.name = className[0];

  literal = Literal.consume('{', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  while (true) {
    var classVarDec = ClassVarDec.consume(remainingTokens);
    if (classVarDec[0] !== null) {
      klass.classVarDecs.push(classVarDec[0]);
      remainingTokens = classVarDec[1];
    } else {
      break;
    }
  }

  while (true) {
    var subroutineDec = SubroutineDec.consume(remainingTokens);
    if (subroutineDec[0] !== null) {
      klass.subroutineDecs.push(subroutineDec[0]);
      remainingTokens = subroutineDec[1];
    } else {
      break;
    }
  }

  literal = Literal.consume('}', remainingTokens);
  if (literal[0] === null) {
    return [null, tokens];
  }
  remainingTokens = literal[1];

  return [klass, remainingTokens];
};
