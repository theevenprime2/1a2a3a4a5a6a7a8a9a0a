var Boom = require('boom'),
  url = require('url'),
  fmt = require("util").format,
  redis = require("../adapters/redis-sessions"),
  avatar = require("../lib/avatar"),
  User = require('../agents/user'),
  tips = require('npm-tips'),
  marky = require('marky-markdown');

var isInvalidUsername = require('npm-user-validate').username;

var lockoutInterval = 60; // seconds
var maxAttemptsBeforeLockout = 5;

module.exports = function login(request, reply) {
  var setSession = request.server.methods.user.setSession(request);

  if (request.auth.isAuthenticated) {
    request.timing.page = 'login-redirect-to-home';
    return reply().redirect(getDonePath(request.loggedInUser));
  }

  var opts = { };

  if (request.method === 'post') {

    if (!request.payload.name || !request.payload.password) {
      opts.error = "Username and password are required";
    } else if (isInvalidUsername(request.payload.name)) {
      opts.error = "That is not a valid username";
    } else {
      var loginAttemptsKey = "login-attempts-" + request.payload.name;
      redis.get(loginAttemptsKey, function(err, attempts) {
        if (err) {
          request.logger.error("redis: unable to get " + loginAttemptsKey);
        }
        // Lock 'em out...
        attempts = Number(attempts);
        if (attempts >= maxAttemptsBeforeLockout) {
          opts.errors = [
            {
              message: fmt("Login has been disabled for %d seconds to protect your account from attacks. Consider resetting your password.", lockoutInterval)
            }
          ];
          return reply.view('user/login', opts).code(403);
        }

        // User is not above the login attempt threshold, so try to log in...
        new User(request.loggedInUser)
          .login({
            name: request.payload.name,
            password: request.payload.password
          }, function(er, user) {

            if (er || !user) {

              request.logger.error(Boom.badRequest('Invalid username or password'), request.payload.name);
              request.logger.error(er);
              opts.error = 'Invalid username or password';

              // Temporarily lock users out after several failed login attempts
              redis.incr(loginAttemptsKey, function(err, attempts) {
                if (err) {
                  request.logger.error("redis: unable to increment " + loginAttemptsKey);
                }

                // Set expiry after key is created
                attempts = Number(attempts);
                if (attempts === 1) {
                  redis.expire(loginAttemptsKey, lockoutInterval, function(err) {
                    if (err) {
                      request.logger.error("redis: unable to set expiry of " + loginAttemptsKey);
                    }
                  });
                }

                request.timing.page = 'login-error';
                request.metrics.metric({
                  name: 'login-error'
                });
                return reply.view('user/login', opts).code(400);
              });
              return;
            }

            // request.logger.info("Login received, user available, setting session")
            // request.logger.info("User is",user)

            user.avatar = avatar(user.email);

            setSession(user, function(err) {
              if (err) {
                request.logger.error('could not set session for ' + user.name);
                request.logger.error(err);
                return reply.view('errors/internal', opts).code(500);
              }

              if (user && user.resource.mustChangePass) {
                request.timing.page = 'login-must-change-pass';

                request.metrics.metric({
                  name: 'login-must-change-pass'
                });
                return reply.redirect('/password');
              }

              var donePath = getDonePath(user);

              request.timing.page = 'login-complete';
              request.metrics.metric({
                name: 'login-complete'
              });
              // request.logger.warn("Sending logged-in user to " + donePath)
              return reply.redirect(donePath);
            });
          });

      });

    }
  }

  if (request.method === 'get' || opts.error) {
    request.timing.page = 'login';
    request.metrics.metric({
      name: 'login'
    });
    opts.tip = marky(tips()).html();
    opts.donePath = getDonePath();
    return reply.view('user/login', opts).code(opts.error ? 400 : 200);
  }

  function getDonePath(user) {
    var donePath = request.query.done || (request.payload && request.payload.done);

    if (donePath) {
      // Make sure that we don't ever leave this domain after login
      // resolve against a fqdn, and take the resulting pathname
      var done = url.resolveObject('https://example.com/login', donePath.replace(/\\/g, '/'));
      return done.pathname + (done.search || "");
    } else if (user) {
      return '/~' + user.name;
    } else {
      return '';
    }
  }
};
