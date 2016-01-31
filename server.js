require("./lib/environment")();

var bunyan = require('bunyan');

var log = bunyan.createLogger({
  name: "server"
});

var connection = {
  host: process.env.HOST || "localhost",
  port: process.env.PORT || "3000"
};

require('./lib/startup.js')({
  connection: connection
}).then(function(server) {
  log.info('Hapi server started @ ' + server.info.uri);
}).catch(function(err) {
  process.nextTick(function() {
    throw err;
  })
});
