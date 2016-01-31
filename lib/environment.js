var fs = require('fs');
var path = require('path');
var dotenv = require('dotenv');
var bunyan = require('bunyan');

var log = bunyan.createLogger({
  name: "environment"
});

module.exports = function() {
  dotenv.load();

  var missing = fs.readFileSync(path.resolve(__dirname, "..", ".env.example"), "utf-8")
    .match(/^(\w+)/gm)
    .filter(function(x) {
      return !process.env[x];
    });

  if (missing.length) {
    log.error("Missing: " + missing.join(", "));
    log.error("Check your .env");
    process.exit(1);
  }
}
