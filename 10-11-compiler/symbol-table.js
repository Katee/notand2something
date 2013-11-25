var _ = require('underscore');

module.exports = SymbolTable;

var KINDS = ['argument', 'local', 'field', 'static'];
var SCOPES = ['subroutine', 'class'];
var kind_to_scope = {
  'static': 'class',
  'field': 'class',
  'local': 'subroutine',
  'argument': 'subroutine'
};

function SymbolTable() {
  this.tables = _.reduce(SCOPES, function(memo, scope){memo[scope] = {}; return memo;}, {});
  this.counts = _.reduce(KINDS, function(memo, kind){memo[kind] = 0; return memo;}, {});
}

SymbolTable.prototype.add = function(name, kind, type) {
  var scope = kind_to_scope[kind];
  if (!this.contains(name, scope)) {
    var index = this.counts[kind]++;
    this.tables[scope][name] = {type: type, index: index, kind: kind};
  }
};

SymbolTable.prototype.contains = function(name, scope) {
  if (scope === undefined) {
    for (i in KINDS) {
      kind = KINDS[i];
      scope = kind_to_scope[kind];
      if (_.contains(_.keys(this.tables[scope]), name)) {
        return true;
      }
    }
  } else {
    if (_.contains(_.keys(this.tables[scope]), name)) {
      return true;
    }
  }

  return false;
};

SymbolTable.prototype.get = function(name, scope) {
  if (scope === undefined) {
    for (i in SCOPES) {
      scope = SCOPES[i];
      if (this.contains(name, scope)) {
        break;
      }
    }
  }
  return this.tables[scope][name];
};

SymbolTable.prototype.clearSubroutine = function() {
  this.tables['subroutine'] = {};
  this.counts['local'] = 0;
  this.counts['var'] = 0;
  this.counts['argument'] = 0;
};
