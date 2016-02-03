var Bcrypt = require('bcrypt');
var Thinky = require('../lib/db');
var Validator = require('validator');
var Bcrypt = require('bcrypt');

var r = Thinky.r;
var type = Thinky.type;

// function toLower(v) {
//   return v.toLowerCase();
// }

// function hashPassword(v) {
//   var salt = Bcrypt.genSaltSync(Config.get('/saltRounds'));
//   return Bcrypt.hashSync(v, salt);
// }

var User = Thinky.createModel("Users", {
  username: type.string().required().allowNull(false).validator(function(nickname) {
    return (
      nickname === null
      || (
        typeof nickname == "string"
        && nickname.length >= 3
      )
    );
  }),
  email: type.string().min(5).required().allowNull(false).validator(function(email) {
    return (
      email === null
      || Validator.isEmail(email)
    )
  }),
  password: type.string().min(8).max(24).required().allowNull(false),
  createdAt: type.date().default(r.now())
}, {
  "pk": "username"
})

User.ensureIndex("createdAt");

User.defineStatic("getView", function() {
  return this.without('password');
});

User.pre('save', function(next) {
  var user = this;

  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      console.log('Errors while generating salt: ' + err);
    }

    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) {
          return console.log('Errors while hashing password: ' + err);
      } else {
          user.password = hash;
          next();
      }
    });
  });
});

// UserSchema.methods.checkPassword = function(password, cb) {
//   return Bcrypt.compare(password, this.password, cb);
// }

// var user = mongoose.model('user', UserSchema);

module.exports = User;
