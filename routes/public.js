module.exports = [
  {
    path: "/",
    method: "GET",
    handler: function (request, reply) {
      reply('Hello!');
    }
  }
]
