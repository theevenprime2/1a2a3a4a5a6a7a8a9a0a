var _ = require("lodash");
var pub = require("./public");
var auth = require("./authenticated");

var routes = pub.concat(auth).reduce(function(routes, route) {
	if (route.paths) {
		route.paths.forEach(function(path) {
			var r = _.cloneDeep(route);
			delete r.paths;
			r.path = path;
			routes.push(r);
		})
	} else {
		routes.push(route);
	}

	return routes;
}, []);

module.exports = routes;