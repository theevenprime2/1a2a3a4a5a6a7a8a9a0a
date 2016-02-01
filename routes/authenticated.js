module.exports = [
  {
    path: "/login",
    method: "POST",
    config: {
      auth: 'jwt'
    },
    handler: require('./handlers/login')
  },
  {
    path: "/logout",
    method: "GET",
    config: {
      auth: 'jwt'
    },
    handler: function(request, reply) {
      request.auth.session.clear();
      reply().redirect('/');
    }
  },
  {
    path: "/register",
    method: "POST",
    config: {
      auth: 'jwt'
    },
    validate: {
      payload: {
        email: Joi.string().email().required(),
        password: Joi.string().required()
      }
    }
    handler: function(request, reply) {
      var newUser = new User({
        email: request.payload.email
      });

      User.register(newUser, request.payload.password, function(err, user) {
        if (err) {
          return reply(err);
        }

        console.log(newUser.email + ' has registered!');
        return reply.redirect('/login');
      });
    }
  }
]
