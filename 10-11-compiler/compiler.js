var _ = require('underscore');
var Q = require('q');
Q.longStackSupport = true;
var fs = require('fs');

var Tokenizer = require('./tokenizer');
var AnalyzerModule = require('./analyzer');
var CompilationEngine = require('./compilation-engine');
var getFilesOfExtension = require('./file-finder');

var options = {
  debug: true,
  inputExtension: ".jack",
  outputExtension: ".vm",
  fileEncoding: 'utf8'
};

if (process.argv.length > 2) {
  var args = process.argv.slice(2);
  var inPath = args[0];
} else {
  console.log("Please provide a file or folder to read from.");
  process.exit();
}

getFilesOfExtension(inPath, options.inputExtension, options.outputExtension).then(function(files){
  // read the contents of each file
  _.each(files, function(file){
    // TODO using streams would be better
    file.content = fs.readFileSync(file.inPath, options.fileEncoding);
  });

  _.each(files, function(file){
    file.tokens = getAllTokens(file.content);
  });

  var asts = _.reduce(files, function(memo, file){
    memo[file.inPath] = AnalyzerModule.Class.consume(file.tokens)[0];
    return memo;
  }, {});

  var ast = asts[files[0].inPath];
  CompilationEngine.compileClass(ast);
}).done();

function getAllTokens(string) {
  var tokenizer = new Tokenizer(string);

  var tokens = [];
  while (tokenizer.hasMoreText()) {
    tokenizer.advance();
    tokens.push(tokenizer.currentToken);
  }

  return _.reject(tokens, function(t) {
    return t.tag === "comment";
  });
}
