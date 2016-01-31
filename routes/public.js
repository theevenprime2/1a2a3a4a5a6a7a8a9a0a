module.exports = [
  {
    path: "/",
    method: "GET",
    config: {
      auth: false
    },
    handler: function(request, reply) {
      reply('Hello!');
    }
  }
]
