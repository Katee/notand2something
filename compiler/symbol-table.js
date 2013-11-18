var _ = require('underscore');

module.exports = SymbolTable;

var KINDS = ['arg', 'var', 'field', 'static'];
var SCOPES = ['subroutine', 'class'];
var kind_to_scope = {
  'static': 'class',
  'field': 'class',
  'var': 'subroutine',
  'arg': 'subroutine'
};

function SymbolTable() {
  this.tables = _.reduce(SCOPES, function(memo, kind){memo[kind] = {}; return memo;}, {});
  this.counts = _.reduce(KINDS, function(memo, kind){memo[kind] = 0; return memo;}, {});
}

SymbolTable.prototype.add = function(name, kind, type) {
  var scope = kind_to_scope[kind];
  if (!this.contains(name, scope)) {
    var index = this.counts[kind]++;
    this.tables[scope][name] = {type: type, index: index};
  }
};

SymbolTable.prototype.contains = function(name, scope) {
  if (scope === undefined) {
    for (i in SCOPES) {
      scope = SCOPES[i];
      if (this.contains(name, scope)) {
        break;
      }
    }
  }
  return _.contains(_.keys(this.tables[scope]), name);
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
