import { createRouter, addRoute, findRoute, findAllRoutes } from "rou3";

const router = createRouter(/* options */);

addRoute(router, "GET", "/path", { payload: "this path" });
addRoute(router, "POST", "/path/:name", { payload: "named route" });
addRoute(router, "GET", "/path/foo/**", { payload: "wildcard route" });
addRoute(router, "GET", "/path/foo/**:name", {
  payload: "named wildcard route",
});

// Returns { payload: 'this path' }
const route1 = findRoute(router, "GET", "/path");
console.log('-----', 'route1', route1);

// Returns { payload: 'named route', params: { name: 'fooval' } }
const route2 = findRoute(router, "POST", "/path/fooval");
console.log('-----', 'route2', route2);

// Returns { payload: 'wildcard route' }
const route3 = findRoute(router, "GET", "/path/foo/bar/baz");
console.log('-----', 'route3', route3);

// Returns undefined (no route matched for/)
const route4 = findRoute(router, "GET", "/**");
console.log('-----', 'route4', route4);

// const route5 = findAllRoutes(router, 'GET', '/path/abc')
// console.log('-----', 'route5', route5);
