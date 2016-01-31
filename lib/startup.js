var P = require('bluebird');
var Hapi = require('hapi');
var path = require('path');
var redisConfig = require('url').parse(process.env.REDIS_URL);
var bunyan = require('bunyan');

var log = bunyan.createLogger({
  name: "startup"
});

var TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
var THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function makeServer(config) {
  return P.resolve().then(function() {
    var server = new Hapi.Server({
      cache: {
        engine: require('catbox-redis'),
        host: redisConfig.hostname,
        port: redisConfig.port,
        password: redisConfig.auth ? redisConfig.auth.split(':')[1] : null
      },
      connections: {
        router: {
          stripTrailingSlash: true
        },
        routes: {
          security: {
            hsts: {
              maxAge: THIRTY_DAYS,
              includeSubdomains: true
            },
            xframe: false
          }
        }
      }
    });

    server.connection(config.connection);

    return P.promisify(server.register, {context: server})(require('hapi-auth-jwt2')).then(function(err) {
      if (err) {
        log.error(err);
      }

      if (typeof process.env.JWT_SECRET == 'undefined') {
        process.env.JWT_SECRET = 'not-secret';
        log.warn('JWT secret is default and insecure.');
      }

      server.auth.strategy('jwt', 'jwt', 'required', {
        key: process.env.JWT_SECRET,
        validateFunc: require('./auth-jwt-validate.js'),
        verifyOptions: {
          algorithms: ['HS256']
        }
      });

      server.auth.default('jwt');
    }).then(function() {
      return P.promisify(server.register, {context: server})(require('./../plugins/index')).then(function() {
        server.views({
          engines: {
            hbs: require('handlebars')
          },
          relativeTo: __dirname,
          path: '../views',
          helpersPath: '../views/helpers',
          layoutPath: '../views/layouts',
          partialsPath: '../views/partials',
          isCached: process.env.NODE_END != 'dev',
          layout: 'default'
        });

        server.route(require('./../routes/index'));
      }).then(function() {
        return P.promisify(server.start, server)();
      }).then(function() {
        return server;
      });
    });
  });
}

module.exports = makeServer;
