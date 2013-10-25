var _ = require('underscore');
var Q = require('q');
Q.longStackSupport = true;
var fs = require('fs');

var Tokenizer = require('./tokenizer');
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
    var tokenizer = new Tokenizer(file.content);
    while (tokenizer.hasMoreTokens()) {
      tokenizer.advance();
      console.log("'%s'", tokenizer.currentToken);
    }
  });
}).done();
