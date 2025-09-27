// @bun
// src/radix/node.ts
class Node {
  segment;
  handlers = {};
  children = [];
  wildParent = false;
  parent;
  constructor({ segment, parent }) {
    this.segment = segment;
    this.parent = parent;
  }
}
var addNodeToChildren = (parent, node) => {
  const children = parent.children;
  if (children.length === 0) {
    children.push(node);
    return;
  }
  if (node.segment === "**") {
    children.push(node);
    return;
  } else if (node.segment[0] === ":") {
    for (let i = children.length - 1;i >= 0; i--) {
      const compareNode = children[i];
      if (compareNode.segment === "**") {
        continue;
      }
      children.splice(i + 1, 0, node);
      return;
    }
    children.unshift(node);
  } else {
    for (let i = children.length - 1;i >= 0; i--) {
      const compareNode = children[i];
      if (compareNode.segment === "**" || compareNode.segment[0] === ":") {
        continue;
      }
      children.splice(i + 1, 0, node);
      return;
    }
    children.unshift(node);
  }
};

// src/radix/radix.ts
class Radix {
  root = new Node({ segment: "" });
  find(path, method = "GET") {
    const segments = path.split("/");
    const params = {};
    let currentNode = this.root;
    let lastWild = undefined;
    outer:
      for (let i = 0;i < segments.length; i++) {
        const segment = segments[i];
        if (currentNode.wildParent === true) {
          const wild = currentNode.children[currentNode.children.length - 1];
          const wildHandlerContainer = wild.handlers[method];
          if (wildHandlerContainer) {
            lastWild = {
              node: wild,
              handlerEnt: wildHandlerContainer,
              params: { ...params, wild: segments.slice(i).join("/") }
            };
          }
        }
        if (currentNode.segment[0] === ":") {
          params[currentNode.segment.slice(1)] = segment;
        }
        const isLastSegment = i + 1 === segments.length;
        if (isLastSegment) {
          break;
        }
        if (currentNode.children.length === 0) {
          return lastWild;
        }
        for (const child of currentNode.children) {
          const nextSegment = segments[i + 1];
          if (child.segment === nextSegment) {
            currentNode = child;
            continue outer;
          }
          if (child.segment[0] === ":" && nextSegment !== "") {
            currentNode = child;
            continue outer;
          }
        }
        return lastWild;
      }
    const handlerContainer = currentNode.handlers[method];
    if (!handlerContainer) {
      return lastWild;
    }
    return {
      node: currentNode,
      params,
      handlerEnt: handlerContainer
    };
  }
  add(pattern, method = "GET", handler) {
    const patternSegments = pattern.slice(1).split("/");
    let currentNode = this.root;
    outer:
      for (let i = 0;i < patternSegments.length; i++) {
        const segment = patternSegments[i];
        for (const child of currentNode.children) {
          if (child.segment === segment) {
            currentNode = child;
            continue outer;
          }
        }
        const newNode = new Node({ segment, parent: currentNode });
        addNodeToChildren(currentNode, newNode);
        if (segment === "**") {
          currentNode.wildParent = true;
        }
        currentNode = newNode;
      }
    currentNode.handlers[method] = handler;
    return currentNode;
  }
}

// src/core.ts
var defaultOnNotFound = (req) => {
  console.log(`h11: Not found ${req.url}`);
  return new Response("Not Found", {
    status: 404,
    statusText: "Not Found 404",
    headers: {
      "Content-Type": "text/plain"
    }
  });
};
var defaultOnError = ({ req, error }) => {
  console.error(`h11: Error ${req.url} - ${error.message}`);
  return new Response(error.message || "Error 500", {
    status: 500,
    statusText: "System error 500",
    headers: {
      "Content-Type": "text/plain"
    }
  });
};

class H11 {
  types;
  radix = new Radix;
  fsApi;
  onNotFound = defaultOnNotFound;
  onError = defaultOnError;
  addRoute(pattern, method, handlers) {
    const preparedHandler = { handlers };
    this.radix.add(pattern, method, preparedHandler);
  }
  get(pattern, ...handlers) {
    this.addRoute(pattern, "GET", handlers);
    return this;
  }
  post(pattern, ...handlers) {
    this.addRoute(pattern, "POST", handlers);
    return this;
  }
  async exec({ req, data, providers }) {
    const url = new URL(req.url);
    const findResult = this.radix.find(url.pathname, req.method);
    if (!findResult) {
      return this.onNotFound(req);
    }
    const props = {
      req,
      params: findResult.params,
      data,
      providers
    };
    try {
      for (const handler of findResult.handlerEnt.handlers) {
        const response = await handler(props);
        if (response) {
          return response;
        }
      }
      return defaultOnNotFound(req);
    } catch (error) {
      return this.onError({ ...props, error });
    }
  }
}

// src/utils/join.ts
var joinUserPath = (basePath, userPath) => {
  if (userPath[0] === "/") {
    return "";
  }
  const segments = userPath.split("/");
  const resolved = [];
  for (const segment of segments) {
    if (segment === "") {
      continue;
    }
    if (segment === "..") {
      return "";
    } else if (segment !== ".") {
      resolved.push(segment);
    }
  }
  let result = basePath;
  if (!basePath.endsWith("/")) {
    result += "/";
  }
  result += resolved.join("/");
  return result;
};

// src/utils/req.ts
var copyReq = (req, body) => {
  const newReq = new Request(req.url, {
    ...req,
    body: body ?? undefined
  });
  return newReq;
};
export {
  joinUserPath,
  copyReq,
  H11
};
