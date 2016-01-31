module.exports = [
  {
    path: "/auth",
    method: "GET",
    config: {
      auth: 'jwt'
    },
    handler: function(request, reply) {
      reply('Welcome!')
      .header("Authorization", request.headers.authorization);
    }
  }
]
