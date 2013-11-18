var SymbolTable = require('./symbol-table');

describe('Symbol Table', function () {
  var symbolTable;

  beforeEach(function () {
    symbolTable = new SymbolTable();
  });

  it('can add items', function () {
    symbolTable.add('account', 'static', 'int');
    expect(symbolTable.contains('account')).toEqual(true);
  });

  it("adding the same item twice doesn't affect the index", function () {
    symbolTable.add('account', 'static', 'int');
    symbolTable.add('account', 'static', 'int');
    var account = symbolTable.get('account');
    expect(account.index).toEqual(0);
  });

  it("lookup will take the most specific variable in scope", function () {
    symbolTable.add('x', 'var', 'int');
    symbolTable.add('x', 'static', 'boolean');
    var account = symbolTable.get('x');
    expect(account.type).toEqual('int');
  });

});
