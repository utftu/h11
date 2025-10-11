// @bun
// ../../node_modules/logw/dist/logw.js
var formatToJson = (logEnt) => {
  const objToJson = {
    level: logEnt.level,
    prefix: logEnt.prefix,
    time: new Date().toISOString(),
    msg: logEnt.message,
    ...logEnt.props
  };
  if ("error" in logEnt.props) {
    objToJson.error = {
      messgae: logEnt.props.error.message,
      stack: logEnt.props.error.stack
    };
  }
  if (objToJson.msg === "") {
    delete objToJson.msg;
  }
  if (objToJson.prefix === "") {
    delete objToJson.prefix;
  }
  const json = JSON.stringify(objToJson);
  return json;
};
var formatMessage = (logEnt) => {
  if (logEnt.prefix === "") {
    return logEnt.message;
  }
  return `${logEnt.prefix}: ${logEnt.message}`;
};
var checkObjEmpty = (obj) => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
};

class ConsoleProviderDev {
  writer = new WritableStream({
    write(logEnt) {
      const formattedMessage = formatMessage(logEnt);
      const props = { ...logEnt.props };
      if (logEnt.level === "info") {
        console.log(formattedMessage);
      } else if (logEnt.level === "debug") {
        console.debug(formattedMessage);
      } else if (logEnt.level === "warn") {
        console.warn(formattedMessage);
      } else if (logEnt.level === "error") {
        console.error(formattedMessage);
        if ("error" in props) {
          console.error(logEnt.props.error);
          delete props.error;
        }
      }
      if (!checkObjEmpty(props)) {
        console.dir(logEnt.props);
      }
    }
  });
}

class ConsoleProviderProd {
  writer = new WritableStream({
    write(logEnt) {
      const json = formatToJson(logEnt);
      if (logEnt.level === "info") {
        console.log(json);
      } else if (logEnt.level === "debug") {
        console.debug(json);
      } else if (logEnt.level === "warn") {
        console.warn(json);
      } else if (logEnt.level === "error") {
        console.error(json);
      }
    }
  });
}
var NODE_ENV = "development";
var getConsoleProvider = () => {
  if (NODE_ENV === "production") {
    return new ConsoleProviderProd;
  }
  return new ConsoleProviderDev;
};
var defaultProviders = [getConsoleProvider()];

class LoggerCore {
  loggerStreams = new TransformStream;
  providers;
  constructor(providers = defaultProviders) {
    this.providers = providers;
  }
  addProvider(provider) {
    this.providers.push(provider);
  }
  write(logEnt) {
    for (const provider of this.providers) {
      const writer = provider.writer.getWriter();
      writer.write(logEnt);
      writer.releaseLock();
    }
  }
}
var defaultLevelConfig = {
  info: true,
  debug: true,
  warn: true,
  error: true
};

class Logger {
  core;
  prefix;
  showTime = false;
  levelConfig;
  props = {};
  constructor({ prefix = "", core, levelConfig }) {
    this.core = core ?? new LoggerCore;
    this.prefix = prefix;
    this.levelConfig = { ...defaultLevelConfig, ...levelConfig };
  }
  log(text) {
    if (this.levelConfig.info === false) {
      return;
    }
    this.core.write({
      level: "info",
      message: text,
      prefix: this.prefix,
      props: this.props
    });
  }
  debug(text) {
    if (this.levelConfig.debug === false) {
      return;
    }
    this.core.write({
      level: "debug",
      message: text,
      props: this.props,
      prefix: this.prefix
    });
  }
  warn(text) {
    if (this.levelConfig.warn === false) {
      return;
    }
    this.core.write({
      level: "warn",
      message: text,
      prefix: this.prefix,
      props: this.props
    });
  }
  error(text, error) {
    if (this.levelConfig.error === false) {
      return;
    }
    this.core.write({
      level: "error",
      message: text,
      prefix: this.prefix,
      props: {
        ...this.props,
        error
      }
    });
  }
  child({ prefix, props }) {
    const newLogger = copyLogger(this);
    if (typeof prefix === "string") {
      newLogger.prefix = prefix;
    }
    newLogger.props = {
      ...this.props,
      ...props
    };
    return newLogger;
  }
}
var copyLogger = (logger) => {
  const newLogger = new Logger({
    prefix: logger.prefix,
    core: logger.core
  });
  newLogger.levelConfig = { ...logger.levelConfig };
  return newLogger;
};
function assertPath(path) {
  if (typeof path !== "string")
    throw new TypeError("Path must be a string. Received " + JSON.stringify(path));
}
function normalizeStringPosix(path, allowAboveRoot) {
  var res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, code;
  for (var i = 0;i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47)
      break;
    else
      code = 47;
    if (code === 47) {
      if (lastSlash === i - 1 || dots === 1)
        ;
      else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1)
                res = "", lastSegmentLength = 0;
              else
                res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
              lastSlash = i, dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = "", lastSegmentLength = 0, lastSlash = i, dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += "/..";
          else
            res = "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += "/" + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i, dots = 0;
    } else if (code === 46 && dots !== -1)
      ++dots;
    else
      dots = -1;
  }
  return res;
}
function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root, base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
  if (!dir)
    return base;
  if (dir === pathObject.root)
    return dir + base;
  return dir + sep + base;
}
function resolve() {
  var resolvedPath = "", resolvedAbsolute = false, cwd;
  for (var i = arguments.length - 1;i >= -1 && !resolvedAbsolute; i--) {
    var path;
    if (i >= 0)
      path = arguments[i];
    else {
      if (cwd === undefined)
        cwd = process.cwd();
      path = cwd;
    }
    if (assertPath(path), path.length === 0)
      continue;
    resolvedPath = path + "/" + resolvedPath, resolvedAbsolute = path.charCodeAt(0) === 47;
  }
  if (resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute), resolvedAbsolute)
    if (resolvedPath.length > 0)
      return "/" + resolvedPath;
    else
      return "/";
  else if (resolvedPath.length > 0)
    return resolvedPath;
  else
    return ".";
}
function normalize(path) {
  if (assertPath(path), path.length === 0)
    return ".";
  var isAbsolute = path.charCodeAt(0) === 47, trailingSeparator = path.charCodeAt(path.length - 1) === 47;
  if (path = normalizeStringPosix(path, !isAbsolute), path.length === 0 && !isAbsolute)
    path = ".";
  if (path.length > 0 && trailingSeparator)
    path += "/";
  if (isAbsolute)
    return "/" + path;
  return path;
}
function isAbsolute(path) {
  return assertPath(path), path.length > 0 && path.charCodeAt(0) === 47;
}
function join() {
  if (arguments.length === 0)
    return ".";
  var joined;
  for (var i = 0;i < arguments.length; ++i) {
    var arg = arguments[i];
    if (assertPath(arg), arg.length > 0)
      if (joined === undefined)
        joined = arg;
      else
        joined += "/" + arg;
  }
  if (joined === undefined)
    return ".";
  return normalize(joined);
}
function relative(from, to) {
  if (assertPath(from), assertPath(to), from === to)
    return "";
  if (from = resolve(from), to = resolve(to), from === to)
    return "";
  var fromStart = 1;
  for (;fromStart < from.length; ++fromStart)
    if (from.charCodeAt(fromStart) !== 47)
      break;
  var fromEnd = from.length, fromLen = fromEnd - fromStart, toStart = 1;
  for (;toStart < to.length; ++toStart)
    if (to.charCodeAt(toStart) !== 47)
      break;
  var toEnd = to.length, toLen = toEnd - toStart, length = fromLen < toLen ? fromLen : toLen, lastCommonSep = -1, i = 0;
  for (;i <= length; ++i) {
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === 47)
          return to.slice(toStart + i + 1);
        else if (i === 0)
          return to.slice(toStart + i);
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === 47)
          lastCommonSep = i;
        else if (i === 0)
          lastCommonSep = 0;
      }
      break;
    }
    var fromCode = from.charCodeAt(fromStart + i), toCode = to.charCodeAt(toStart + i);
    if (fromCode !== toCode)
      break;
    else if (fromCode === 47)
      lastCommonSep = i;
  }
  var out = "";
  for (i = fromStart + lastCommonSep + 1;i <= fromEnd; ++i)
    if (i === fromEnd || from.charCodeAt(i) === 47)
      if (out.length === 0)
        out += "..";
      else
        out += "/..";
  if (out.length > 0)
    return out + to.slice(toStart + lastCommonSep);
  else {
    if (toStart += lastCommonSep, to.charCodeAt(toStart) === 47)
      ++toStart;
    return to.slice(toStart);
  }
}
function _makeLong(path) {
  return path;
}
function dirname(path) {
  if (assertPath(path), path.length === 0)
    return ".";
  var code = path.charCodeAt(0), hasRoot = code === 47, end = -1, matchedSlash = true;
  for (var i = path.length - 1;i >= 1; --i)
    if (code = path.charCodeAt(i), code === 47) {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else
      matchedSlash = false;
  if (end === -1)
    return hasRoot ? "/" : ".";
  if (hasRoot && end === 1)
    return "//";
  return path.slice(0, end);
}
function basename(path, ext) {
  if (ext !== undefined && typeof ext !== "string")
    throw new TypeError('"ext" argument must be a string');
  assertPath(path);
  var start = 0, end = -1, matchedSlash = true, i;
  if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
    if (ext.length === path.length && ext === path)
      return "";
    var extIdx = ext.length - 1, firstNonSlashEnd = -1;
    for (i = path.length - 1;i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else {
        if (firstNonSlashEnd === -1)
          matchedSlash = false, firstNonSlashEnd = i + 1;
        if (extIdx >= 0)
          if (code === ext.charCodeAt(extIdx)) {
            if (--extIdx === -1)
              end = i;
          } else
            extIdx = -1, end = firstNonSlashEnd;
      }
    }
    if (start === end)
      end = firstNonSlashEnd;
    else if (end === -1)
      end = path.length;
    return path.slice(start, end);
  } else {
    for (i = path.length - 1;i >= 0; --i)
      if (path.charCodeAt(i) === 47) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1)
        matchedSlash = false, end = i + 1;
    if (end === -1)
      return "";
    return path.slice(start, end);
  }
}
function extname(path) {
  assertPath(path);
  var startDot = -1, startPart = 0, end = -1, matchedSlash = true, preDotState = 0;
  for (var i = path.length - 1;i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1)
      matchedSlash = false, end = i + 1;
    if (code === 46) {
      if (startDot === -1)
        startDot = i;
      else if (preDotState !== 1)
        preDotState = 1;
    } else if (startDot !== -1)
      preDotState = -1;
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
    return "";
  return path.slice(startDot, end);
}
function format(pathObject) {
  if (pathObject === null || typeof pathObject !== "object")
    throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
  return _format("/", pathObject);
}
function parse(path) {
  assertPath(path);
  var ret = { root: "", dir: "", base: "", ext: "", name: "" };
  if (path.length === 0)
    return ret;
  var code = path.charCodeAt(0), isAbsolute2 = code === 47, start;
  if (isAbsolute2)
    ret.root = "/", start = 1;
  else
    start = 0;
  var startDot = -1, startPart = 0, end = -1, matchedSlash = true, i = path.length - 1, preDotState = 0;
  for (;i >= start; --i) {
    if (code = path.charCodeAt(i), code === 47) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1)
      matchedSlash = false, end = i + 1;
    if (code === 46) {
      if (startDot === -1)
        startDot = i;
      else if (preDotState !== 1)
        preDotState = 1;
    } else if (startDot !== -1)
      preDotState = -1;
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    if (end !== -1)
      if (startPart === 0 && isAbsolute2)
        ret.base = ret.name = path.slice(1, end);
      else
        ret.base = ret.name = path.slice(startPart, end);
  } else {
    if (startPart === 0 && isAbsolute2)
      ret.name = path.slice(1, startDot), ret.base = path.slice(1, end);
    else
      ret.name = path.slice(startPart, startDot), ret.base = path.slice(startPart, end);
    ret.ext = path.slice(startDot, end);
  }
  if (startPart > 0)
    ret.dir = path.slice(0, startPart - 1);
  else if (isAbsolute2)
    ret.dir = "/";
  return ret;
}
var sep = "/";
var delimiter = ":";
var posix = ((p) => (p.posix = p, p))({ resolve, normalize, isAbsolute, join, relative, _makeLong, dirname, basename, extname, format, parse, sep, delimiter, win32: null, posix: null });
var createLogger = (props = {}) => {
  return new Logger(props);
};

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

// ../../node_modules/utftu/dist/utftu.js
class c {
  events = /* @__PURE__ */ new Map;
  on(t, s) {
    return this.events.has(t) ? this.events.get(t).push(s) : this.events.set(t, [s]), () => this.off(t, s);
  }
  off(t, s) {
    this.events.has(t) && this.events.set(t, this.events.get(t).filter((e) => e !== s));
  }
  emit(t, s) {
    this.events.has(t) && this.events.get(t).forEach((e) => e(s)), t !== "*" && this.events.has("*") && this.events.get("*").forEach((e) => e({ name: t, value: s }));
  }
}
function a() {
  return new c;
}

// src/core.ts
var defaultOnNotFound = ({ req, h11 }) => {
  h11.ee.emit("code", {
    code: 404,
    text: `Not found 123 ${req.url}`
  });
  return new Response("Not Found", {
    status: 404,
    statusText: "Not Found 404",
    headers: {
      "Content-Type": "text/plain"
    }
  });
};
var defaultOnError = ({ req, error, h11 }) => {
  h11.ee.emit("code", {
    code: 500,
    text: `h11: Error ${req.url} - ${error.message}`
  });
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
  ee = a();
  data = {};
  startLogger() {
    const logger = createLogger({ prefix: "h11" });
    const stopListen = this.ee.on("code", ({ code, text }) => {
      const message = `${code} ${text}`;
      if (code >= 500) {
        logger.error(message);
        return;
      }
      if (code < 500 && code >= 400) {
        logger.warn(message);
        return;
      }
      logger.log(message);
    });
    return stopListen;
  }
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
      return this.onNotFound({
        req,
        params: {},
        data,
        providers,
        h11: this
      });
    }
    const props = {
      req,
      params: findResult.params,
      data,
      providers,
      h11: this
    };
    try {
      for (const handler of findResult.handlerEnt.handlers) {
        const response = await handler(props);
        if (response) {
          return response;
        }
      }
      return defaultOnNotFound(props);
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
