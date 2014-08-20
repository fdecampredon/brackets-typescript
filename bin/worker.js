(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("tWU75n"))
},{"tWU75n":2}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, Promise$_CreatePromiseArray, PromiseArray) {

var SomePromiseArray = require("./some_promise_array.js")(PromiseArray);
function Promise$_Any(promises, useBound) {
    var ret = Promise$_CreatePromiseArray(
        promises,
        SomePromiseArray,
        useBound === true && promises._isBound()
            ? promises._boundTo
            : void 0
   );
    var promise = ret.promise();
    if (promise.isRejected()) {
        return promise;
    }
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function Promise$Any(promises) {
    return Promise$_Any(promises, false);
};

Promise.prototype.any = function Promise$any() {
    return Promise$_Any(this, true);
};

};

},{"./some_promise_array.js":35}],4:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var schedule = require("./schedule.js");
var Queue = require("./queue.js");
var errorObj = require("./util.js").errorObj;
var tryCatch1 = require("./util.js").tryCatch1;
var process = require("./global.js").process;

function Async() {
    this._isTickUsed = false;
    this._length = 0;
    this._lateBuffer = new Queue();
    this._functionBuffer = new Queue(25000 * 3);
    var self = this;
    this.consumeFunctionBuffer = function Async$consumeFunctionBuffer() {
        self._consumeFunctionBuffer();
    };
}

Async.prototype.haveItemsQueued = function Async$haveItemsQueued() {
    return this._length > 0;
};

Async.prototype.invokeLater = function Async$invokeLater(fn, receiver, arg) {
    if (process !== void 0 &&
        process.domain != null &&
        !fn.domain) {
        fn = process.domain.bind(fn);
    }
    this._lateBuffer.push(fn, receiver, arg);
    this._queueTick();
};

Async.prototype.invoke = function Async$invoke(fn, receiver, arg) {
    if (process !== void 0 &&
        process.domain != null &&
        !fn.domain) {
        fn = process.domain.bind(fn);
    }
    var functionBuffer = this._functionBuffer;
    functionBuffer.push(fn, receiver, arg);
    this._length = functionBuffer.length();
    this._queueTick();
};

Async.prototype._consumeFunctionBuffer =
function Async$_consumeFunctionBuffer() {
    var functionBuffer = this._functionBuffer;
    while(functionBuffer.length() > 0) {
        var fn = functionBuffer.shift();
        var receiver = functionBuffer.shift();
        var arg = functionBuffer.shift();
        fn.call(receiver, arg);
    }
    this._reset();
    this._consumeLateBuffer();
};

Async.prototype._consumeLateBuffer = function Async$_consumeLateBuffer() {
    var buffer = this._lateBuffer;
    while(buffer.length() > 0) {
        var fn = buffer.shift();
        var receiver = buffer.shift();
        var arg = buffer.shift();
        var res = tryCatch1(fn, receiver, arg);
        if (res === errorObj) {
            this._queueTick();
            if (fn.domain != null) {
                fn.domain.emit("error", res.e);
            }
            else {
                throw res.e;
            }
        }
    }
};

Async.prototype._queueTick = function Async$_queue() {
    if (!this._isTickUsed) {
        schedule(this.consumeFunctionBuffer);
        this._isTickUsed = true;
    }
};

Async.prototype._reset = function Async$_reset() {
    this._isTickUsed = false;
    this._length = 0;
};

module.exports = new Async();

},{"./global.js":17,"./queue.js":28,"./schedule.js":31,"./util.js":39}],5:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var Promise = require("./promise.js")();
module.exports = Promise;
},{"./promise.js":21}],6:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise) {
Promise.prototype.call = function Promise$call(propertyName) {
    var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}

    return this._then(function(obj) {
            return obj[propertyName].apply(obj, args);
        },
        void 0,
        void 0,
        void 0,
        void 0
   );
};

function Promise$getter(obj) {
    var prop = typeof this === "string"
        ? this
        : ("" + this);
    return obj[prop];
}
Promise.prototype.get = function Promise$get(propertyName) {
    return this._then(
        Promise$getter,
        void 0,
        void 0,
        propertyName,
        void 0
   );
};
};

},{}],7:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var errors = require("./errors.js");
var async = require("./async.js");
var CancellationError = errors.CancellationError;

Promise.prototype._cancel = function Promise$_cancel() {
    if (!this.isCancellable()) return this;
    var parent;
    var promiseToReject = this;
    while ((parent = promiseToReject._cancellationParent) !== void 0 &&
        parent.isCancellable()) {
        promiseToReject = parent;
    }
    var err = new CancellationError();
    promiseToReject._attachExtraTrace(err);
    promiseToReject._rejectUnchecked(err);
};

Promise.prototype.cancel = function Promise$cancel() {
    if (!this.isCancellable()) return this;
    async.invokeLater(this._cancel, this, void 0);
    return this;
};

Promise.prototype.cancellable = function Promise$cancellable() {
    if (this._cancellable()) return this;
    this._setCancellable();
    this._cancellationParent = void 0;
    return this;
};

Promise.prototype.uncancellable = function Promise$uncancellable() {
    var ret = new Promise(INTERNAL);
    ret._setTrace(this);
    ret._follow(this);
    ret._unsetCancellable();
    if (this._isBound()) ret._setBoundTo(this._boundTo);
    return ret;
};

Promise.prototype.fork =
function Promise$fork(didFulfill, didReject, didProgress) {
    var ret = this._then(didFulfill, didReject, didProgress,
                         void 0, void 0);

    ret._setCancellable();
    ret._cancellationParent = void 0;
    return ret;
};
};

},{"./async.js":4,"./errors.js":11}],8:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function() {
var inherits = require("./util.js").inherits;
var defineProperty = require("./es5.js").defineProperty;

var rignore = new RegExp(
    "\\b(?:[a-zA-Z0-9.]+\\$_\\w+|" +
    "tryCatch(?:1|2|Apply)|new \\w*PromiseArray|" +
    "\\w*PromiseArray\\.\\w*PromiseArray|" +
    "setTimeout|CatchFilter\\$_\\w+|makeNodePromisified|processImmediate|" +
    "process._tickCallback|nextTick|Async\\$\\w+)\\b"
);

var rtraceline = null;
var formatStack = null;

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    }
    else {
        str = obj.toString();
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function CapturedTrace(ignoreUntil, isTopLevel) {
    this.captureStackTrace(CapturedTrace, isTopLevel);

}
inherits(CapturedTrace, Error);

CapturedTrace.prototype.captureStackTrace =
function CapturedTrace$captureStackTrace(ignoreUntil, isTopLevel) {
    captureStackTrace(this, ignoreUntil, isTopLevel);
};

CapturedTrace.possiblyUnhandledRejection =
function CapturedTrace$PossiblyUnhandledRejection(reason) {
    if (typeof console === "object") {
        var message;
        if (typeof reason === "object" || typeof reason === "function") {
            var stack = reason.stack;
            message = "Possibly unhandled " + formatStack(stack, reason);
        }
        else {
            message = "Possibly unhandled " + String(reason);
        }
        if (typeof console.error === "function" ||
            typeof console.error === "object") {
            console.error(message);
        }
        else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
};

CapturedTrace.combine = function CapturedTrace$Combine(current, prev) {
    var curLast = current.length - 1;
    for (var i = prev.length - 1; i >= 0; --i) {
        var line = prev[i];
        if (current[curLast] === line) {
            current.pop();
            curLast--;
        }
        else {
            break;
        }
    }

    current.push("From previous event:");
    var lines = current.concat(prev);

    var ret = [];

    for (var i = 0, len = lines.length; i < len; ++i) {

        if ((rignore.test(lines[i]) ||
            (i > 0 && !rtraceline.test(lines[i])) &&
            lines[i] !== "From previous event:")
       ) {
            continue;
        }
        ret.push(lines[i]);
    }
    return ret;
};

CapturedTrace.isSupported = function CapturedTrace$IsSupported() {
    return typeof captureStackTrace === "function";
};

var captureStackTrace = (function stackDetection() {
    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        rtraceline = /^\s*at\s*/;
        formatStack = function(stack, error) {
            if (typeof stack === "string") return stack;

            if (error.name !== void 0 &&
                error.message !== void 0) {
                return error.name + ". " + error.message;
            }
            return formatNonError(error);


        };
        var captureStackTrace = Error.captureStackTrace;
        return function CapturedTrace$_captureStackTrace(
            receiver, ignoreUntil) {
            captureStackTrace(receiver, ignoreUntil);
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        typeof "".startsWith === "function" &&
        (err.stack.startsWith("stackDetection@")) &&
        stackDetection.name === "stackDetection") {

        defineProperty(Error, "stackTraceLimit", {
            writable: true,
            enumerable: false,
            configurable: false,
            value: 25
        });
        rtraceline = /@/;
        var rline = /[@\n]/;

        formatStack = function(stack, error) {
            if (typeof stack === "string") {
                return (error.name + ". " + error.message + "\n" + stack);
            }

            if (error.name !== void 0 &&
                error.message !== void 0) {
                return error.name + ". " + error.message;
            }
            return formatNonError(error);
        };

        return function captureStackTrace(o) {
            var stack = new Error().stack;
            var split = stack.split(rline);
            var len = split.length;
            var ret = "";
            for (var i = 0; i < len; i += 2) {
                ret += split[i];
                ret += "@";
                ret += split[i + 1];
                ret += "\n";
            }
            o.stack = ret;
        };
    }
    else {
        formatStack = function(stack, error) {
            if (typeof stack === "string") return stack;

            if ((typeof error === "object" ||
                typeof error === "function") &&
                error.name !== void 0 &&
                error.message !== void 0) {
                return error.name + ". " + error.message;
            }
            return formatNonError(error);
        };

        return null;
    }
})();

return CapturedTrace;
};

},{"./es5.js":13,"./util.js":39}],9:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(NEXT_FILTER) {
var util = require("./util.js");
var errors = require("./errors.js");
var tryCatch1 = util.tryCatch1;
var errorObj = util.errorObj;
var keys = require("./es5.js").keys;
var TypeError = errors.TypeError;

function CatchFilter(instances, callback, promise) {
    this._instances = instances;
    this._callback = callback;
    this._promise = promise;
}

function CatchFilter$_safePredicate(predicate, e) {
    var safeObject = {};
    var retfilter = tryCatch1(predicate, safeObject, e);

    if (retfilter === errorObj) return retfilter;

    var safeKeys = keys(safeObject);
    if (safeKeys.length) {
        errorObj.e = new TypeError(
            "Catch filter must inherit from Error "
          + "or be a simple predicate function");
        return errorObj;
    }
    return retfilter;
}

CatchFilter.prototype.doFilter = function CatchFilter$_doFilter(e) {
    var cb = this._callback;
    var promise = this._promise;
    var boundTo = promise._isBound() ? promise._boundTo : void 0;
    for (var i = 0, len = this._instances.length; i < len; ++i) {
        var item = this._instances[i];
        var itemIsErrorType = item === Error ||
            (item != null && item.prototype instanceof Error);

        if (itemIsErrorType && e instanceof item) {
            var ret = tryCatch1(cb, boundTo, e);
            if (ret === errorObj) {
                NEXT_FILTER.e = ret.e;
                return NEXT_FILTER;
            }
            return ret;
        } else if (typeof item === "function" && !itemIsErrorType) {
            var shouldHandle = CatchFilter$_safePredicate(item, e);
            if (shouldHandle === errorObj) {
                var trace = errors.canAttach(errorObj.e)
                    ? errorObj.e
                    : new Error(errorObj.e + "");
                this._promise._attachExtraTrace(trace);
                e = errorObj.e;
                break;
            } else if (shouldHandle) {
                var ret = tryCatch1(cb, boundTo, e);
                if (ret === errorObj) {
                    NEXT_FILTER.e = ret.e;
                    return NEXT_FILTER;
                }
                return ret;
            }
        }
    }
    NEXT_FILTER.e = e;
    return NEXT_FILTER;
};

return CatchFilter;
};

},{"./errors.js":11,"./es5.js":13,"./util.js":39}],10:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var util = require("./util.js");
var isPrimitive = util.isPrimitive;
var wrapsPrimitiveReceiver = util.wrapsPrimitiveReceiver;

module.exports = function(Promise) {
var returner = function Promise$_returner() {
    return this;
};
var thrower = function Promise$_thrower() {
    throw this;
};

var wrapper = function Promise$_wrapper(value, action) {
    if (action === 1) {
        return function Promise$_thrower() {
            throw value;
        };
    }
    else if (action === 2) {
        return function Promise$_returner() {
            return value;
        };
    }
};


Promise.prototype["return"] =
Promise.prototype.thenReturn =
function Promise$thenReturn(value) {
    if (wrapsPrimitiveReceiver && isPrimitive(value)) {
        return this._then(
            wrapper(value, 2),
            void 0,
            void 0,
            void 0,
            void 0
       );
    }
    return this._then(returner, void 0, void 0, value, void 0);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow =
function Promise$thenThrow(reason) {
    if (wrapsPrimitiveReceiver && isPrimitive(reason)) {
        return this._then(
            wrapper(reason, 1),
            void 0,
            void 0,
            void 0,
            void 0
       );
    }
    return this._then(thrower, void 0, void 0, reason, void 0);
};
};

},{"./util.js":39}],11:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var global = require("./global.js");
var Objectfreeze = require("./es5.js").freeze;
var util = require("./util.js");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;
var Error = global.Error;

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isAsync", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof RejectionError) ||
        e["isAsync"] === true);
}

function isError(obj) {
    return obj instanceof Error;
}

function canAttach(obj) {
    return isError(obj);
}

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        this.message = typeof message === "string" ? message : defaultMessage;
        this.name = nameProperty;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var TypeError = global.TypeError;
if (typeof TypeError !== "function") {
    TypeError = subError("TypeError", "type error");
}
var RangeError = global.RangeError;
if (typeof RangeError !== "function") {
    RangeError = subError("RangeError", "range error");
}
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");

function RejectionError(message) {
    this.name = "RejectionError";
    this.message = message;
    this.cause = message;
    this.isAsync = true;

    if (message instanceof Error) {
        this.message = message.message;
        this.stack = message.stack;
    }
    else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(RejectionError, Error);

var key = "__BluebirdErrorTypes__";
var errorTypes = global[key];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        RejectionError: RejectionError
    });
    notEnumerableProp(global, key, errorTypes);
}

module.exports = {
    Error: Error,
    TypeError: TypeError,
    RangeError: RangeError,
    CancellationError: errorTypes.CancellationError,
    RejectionError: errorTypes.RejectionError,
    TimeoutError: errorTypes.TimeoutError,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    canAttach: canAttach
};

},{"./es5.js":13,"./global.js":17,"./util.js":39}],12:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise) {
var TypeError = require('./errors.js').TypeError;

function apiRejection(msg) {
    var error = new TypeError(msg);
    var ret = Promise.rejected(error);
    var parent = ret._peekContext();
    if (parent != null) {
        parent._attachExtraTrace(error);
    }
    return ret;
}

return apiRejection;
};

},{"./errors.js":11}],13:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
var isES5 = (function(){
    "use strict";
    return this === void 0;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        keys: Object.keys,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5
    };
}

else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function ObjectKeys(o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    }

    var ObjectDefineProperty = function ObjectDefineProperty(o, key, desc) {
        o[key] = desc.value;
        return o;
    }

    var ObjectFreeze = function ObjectFreeze(obj) {
        return obj;
    }

    var ObjectGetPrototypeOf = function ObjectGetPrototypeOf(obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    }

    var ArrayIsArray = function ArrayIsArray(obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    }

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5
    };
}

},{}],14:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise) {
var isArray = require("./util.js").isArray;

function Promise$_filter(booleans) {
    var values = this instanceof Promise ? this._settledValue : this;
    var len = values.length;
    var ret = new Array(len);
    var j = 0;

    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];

    }
    ret.length = j;
    return ret;
}

var ref = {ref: null};
Promise.filter = function Promise$Filter(promises, fn) {
    return Promise.map(promises, fn, ref)
                  ._then(Promise$_filter, void 0, void 0, ref.ref, void 0);
};

Promise.prototype.filter = function Promise$filter(fn) {
    return this.map(fn, ref)
               ._then(Promise$_filter, void 0, void 0, ref.ref, void 0);
};
};

},{"./util.js":39}],15:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, NEXT_FILTER) {
var util = require("./util.js");
var wrapsPrimitiveReceiver = util.wrapsPrimitiveReceiver;
var isPrimitive = util.isPrimitive;
var thrower = util.thrower;


function returnThis() {
    return this;
}
function throwThis() {
    throw this;
}
function return$(r) {
    return function Promise$_returner() {
        return r;
    };
}
function throw$(r) {
    return function Promise$_thrower() {
        throw r;
    };
}
function promisedFinally(ret, reasonOrValue, isFulfilled) {
    var then;
    if (wrapsPrimitiveReceiver && isPrimitive(reasonOrValue)) {
        then = isFulfilled ? return$(reasonOrValue) : throw$(reasonOrValue);
    }
    else {
        then = isFulfilled ? returnThis : throwThis;
    }
    return ret._then(then, thrower, void 0, reasonOrValue, void 0);
}

function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundTo)
                    : handler();

    if (ret !== void 0) {
        var maybePromise = Promise._cast(ret, void 0);
        if (maybePromise instanceof Promise) {
            return promisedFinally(maybePromise, reasonOrValue,
                                    promise.isFulfilled());
        }
    }

    if (promise.isRejected()) {
        NEXT_FILTER.e = reasonOrValue;
        return NEXT_FILTER;
    }
    else {
        return reasonOrValue;
    }
}

function tapHandler(value) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundTo, value)
                    : handler(value);

    if (ret !== void 0) {
        var maybePromise = Promise._cast(ret, void 0);
        if (maybePromise instanceof Promise) {
            return promisedFinally(maybePromise, value, true);
        }
    }
    return value;
}

Promise.prototype._passThroughHandler =
function Promise$_passThroughHandler(handler, isFinally) {
    if (typeof handler !== "function") return this.then();

    var promiseAndHandler = {
        promise: this,
        handler: handler
    };

    return this._then(
            isFinally ? finallyHandler : tapHandler,
            isFinally ? finallyHandler : void 0, void 0,
            promiseAndHandler, void 0);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function Promise$finally(handler) {
    return this._passThroughHandler(handler, true);
};

Promise.prototype.tap = function Promise$tap(handler) {
    return this._passThroughHandler(handler, false);
};
};

},{"./util.js":39}],16:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, apiRejection, INTERNAL) {
var PromiseSpawn = require("./promise_spawn.js")(Promise, INTERNAL);
var errors = require("./errors.js");
var TypeError = errors.TypeError;
var deprecated = require("./util.js").deprecated;

Promise.coroutine = function Promise$Coroutine(generatorFunction) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function");
    }
    var PromiseSpawn$ = PromiseSpawn;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(void 0, void 0);
        spawn._generator = generator;
        spawn._next(void 0);
        return spawn.promise();
    };
};

Promise.coroutine.addYieldHandler = PromiseSpawn.addYieldHandler;

Promise.spawn = function Promise$Spawn(generatorFunction) {
    deprecated("Promise.spawn is deprecated. Use Promise.coroutine instead.");
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors.js":11,"./promise_spawn.js":24,"./util.js":39}],17:[function(require,module,exports){
(function (global){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
module.exports = (function() {
    if (this !== void 0) return this;
    try {return global;}
    catch(e) {}
    try {return window;}
    catch(e) {}
    try {return self;}
    catch(e) {}
})();

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],18:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, PromiseArray, INTERNAL, apiRejection) {

var all = Promise.all;
var util = require("./util.js");
var canAttach = require("./errors.js").canAttach;
var isArray = util.isArray;
var _cast = Promise._cast;

function unpack(values) {
    return Promise$_Map(values, this[0], this[1], this[2]);
}

function Promise$_Map(promises, fn, useBound, ref) {
    if (typeof fn !== "function") {
        return apiRejection("fn must be a function");
    }

    var receiver = void 0;
    if (useBound === true) {
        if (promises._isBound()) {
            receiver = promises._boundTo;
        }
    }
    else if (useBound !== false) {
        receiver = useBound;
    }

    var shouldUnwrapItems = ref !== void 0;
    if (shouldUnwrapItems) ref.ref = promises;

    if (promises instanceof Promise) {
        var pack = [fn, receiver, ref];
        return promises._then(unpack, void 0, void 0, pack, void 0);
    }
    else if (!isArray(promises)) {
        return apiRejection("expecting an array, a promise or a thenable");
    }

    var promise = new Promise(INTERNAL);
    if (receiver !== void 0) promise._setBoundTo(receiver);
    promise._setTrace(void 0);

    var mapping = new Mapping(promise,
                                fn,
                                promises,
                                receiver,
                                shouldUnwrapItems);
    mapping.init();
    return promise;
}

var pending = {};
function Mapping(promise, callback, items, receiver, shouldUnwrapItems) {
    this.shouldUnwrapItems = shouldUnwrapItems;
    this.index = 0;
    this.items = items;
    this.callback = callback;
    this.receiver = receiver;
    this.promise = promise;
    this.result = new Array(items.length);
}
util.inherits(Mapping, PromiseArray);

Mapping.prototype.init = function Mapping$init() {
    var items = this.items;
    var len = items.length;
    var result = this.result;
    var isRejected = false;
    for (var i = 0; i < len; ++i) {
        var maybePromise = _cast(items[i], void 0);
        if (maybePromise instanceof Promise) {
            if (maybePromise.isPending()) {
                result[i] = pending;
                maybePromise._proxyPromiseArray(this, i);
            }
            else if (maybePromise.isFulfilled()) {
                result[i] = maybePromise.value();
            }
            else {
                maybePromise._unsetRejectionIsUnhandled();
                if (!isRejected) {
                    this.reject(maybePromise.reason());
                    isRejected = true;
                }
            }
        }
        else {
            result[i] = maybePromise;
        }
    }
    if (!isRejected) this.iterate();
};

Mapping.prototype.isResolved = function Mapping$isResolved() {
    return this.promise === null;
};

Mapping.prototype._promiseProgressed =
function Mapping$_promiseProgressed(value) {
    if (this.isResolved()) return;
    this.promise._progress(value);
};

Mapping.prototype._promiseFulfilled =
function Mapping$_promiseFulfilled(value, index) {
    if (this.isResolved()) return;
    this.result[index] = value;
    if (this.shouldUnwrapItems) this.items[index] = value;
    if (this.index === index) this.iterate();
};

Mapping.prototype._promiseRejected =
function Mapping$_promiseRejected(reason) {
    this.reject(reason);
};

Mapping.prototype.reject = function Mapping$reject(reason) {
    if (this.isResolved()) return;
    var trace = canAttach(reason) ? reason : new Error(reason + "");
    this.promise._attachExtraTrace(trace);
    this.promise._reject(reason, trace);
};

Mapping.prototype.iterate = function Mapping$iterate() {
    var i = this.index;
    var items = this.items;
    var result = this.result;
    var len = items.length;
    var result = this.result;
    var receiver = this.receiver;
    var callback = this.callback;

    for (; i < len; ++i) {
        var value = result[i];
        if (value === pending) {
            this.index = i;
            return;
        }
        try { result[i] = callback.call(receiver, value, i, len); }
        catch (e) { return this.reject(e); }
    }
    this.promise._follow(all(result));
    this.items = this.result = this.callback = this.promise = null;
};

Promise.prototype.map = function Promise$map(fn, ref) {
    return Promise$_Map(this, fn, true, ref);
};

Promise.map = function Promise$Map(promises, fn, ref) {
    return Promise$_Map(promises, fn, false, ref);
};
};

},{"./errors.js":11,"./util.js":39}],19:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise) {
var util = require("./util.js");
var async = require("./async.js");
var tryCatch2 = util.tryCatch2;
var tryCatch1 = util.tryCatch1;
var errorObj = util.errorObj;

function thrower(r) {
    throw r;
}

function Promise$_successAdapter(val, receiver) {
    var nodeback = this;
    var ret = val === void 0
        ? tryCatch1(nodeback, receiver, null)
        : tryCatch2(nodeback, receiver, null, val);
    if (ret === errorObj) {
        async.invokeLater(thrower, void 0, ret.e);
    }
}
function Promise$_errorAdapter(reason, receiver) {
    var nodeback = this;
    var ret = tryCatch1(nodeback, receiver, reason);
    if (ret === errorObj) {
        async.invokeLater(thrower, void 0, ret.e);
    }
}

Promise.prototype.nodeify = function Promise$nodeify(nodeback) {
    if (typeof nodeback == "function") {
        this._then(
            Promise$_successAdapter,
            Promise$_errorAdapter,
            void 0,
            nodeback,
            this._isBound() ? this._boundTo : null
        );
    }
    return this;
};
};

},{"./async.js":4,"./util.js":39}],20:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, isPromiseArrayProxy) {
var util = require("./util.js");
var async = require("./async.js");
var errors = require("./errors.js");
var tryCatch1 = util.tryCatch1;
var errorObj = util.errorObj;

Promise.prototype.progressed = function Promise$progressed(handler) {
    return this._then(void 0, void 0, handler, void 0, void 0);
};

Promise.prototype._progress = function Promise$_progress(progressValue) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._progressUnchecked(progressValue);

};

Promise.prototype._progressHandlerAt =
function Promise$_progressHandlerAt(index) {
    if (index === 0) return this._progressHandler0;
    return this[index + 2 - 5];
};

Promise.prototype._doProgressWith =
function Promise$_doProgressWith(progression) {
    var progressValue = progression.value;
    var handler = progression.handler;
    var promise = progression.promise;
    var receiver = progression.receiver;

    this._pushContext();
    var ret = tryCatch1(handler, receiver, progressValue);
    this._popContext();

    if (ret === errorObj) {
        if (ret.e != null &&
            ret.e.name !== "StopProgressPropagation") {
            var trace = errors.canAttach(ret.e)
                ? ret.e : new Error(ret.e + "");
            promise._attachExtraTrace(trace);
            promise._progress(ret.e);
        }
    }
    else if (ret instanceof Promise) {
        ret._then(promise._progress, null, null, promise, void 0);
    }
    else {
        promise._progress(ret);
    }
};


Promise.prototype._progressUnchecked =
function Promise$_progressUnchecked(progressValue) {
    if (!this.isPending()) return;
    var len = this._length();
    var progress = this._progress;
    for (var i = 0; i < len; i += 5) {
        var handler = this._progressHandlerAt(i);
        var promise = this._promiseAt(i);
        if (!(promise instanceof Promise)) {
            var receiver = this._receiverAt(i);
            if (typeof handler === "function") {
                handler.call(receiver, progressValue, promise);
            }
            else if (receiver instanceof Promise && receiver._isProxied()) {
                receiver._progressUnchecked(progressValue);
            }
            else if (isPromiseArrayProxy(receiver, promise)) {
                receiver._promiseProgressed(progressValue, promise);
            }
            continue;
        }

        if (typeof handler === "function") {
            async.invoke(this._doProgressWith, this, {
                handler: handler,
                promise: promise,
                receiver: this._receiverAt(i),
                value: progressValue
            });
        }
        else {
            async.invoke(progress, promise, progressValue);
        }
    }
};
};

},{"./async.js":4,"./errors.js":11,"./util.js":39}],21:[function(require,module,exports){
(function (process){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function() {
var global = require("./global.js");
var util = require("./util.js");
var async = require("./async.js");
var errors = require("./errors.js");

var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {e: null};

var PromiseArray = require("./promise_array.js")(Promise, INTERNAL);
var CapturedTrace = require("./captured_trace.js")();
var CatchFilter = require("./catch_filter.js")(NEXT_FILTER);
var PromiseResolver = require("./promise_resolver.js");

var isArray = util.isArray;

var errorObj = util.errorObj;
var tryCatch1 = util.tryCatch1;
var tryCatch2 = util.tryCatch2;
var tryCatchApply = util.tryCatchApply;
var RangeError = errors.RangeError;
var TypeError = errors.TypeError;
var CancellationError = errors.CancellationError;
var TimeoutError = errors.TimeoutError;
var RejectionError = errors.RejectionError;
var originatesFromRejection = errors.originatesFromRejection;
var markAsOriginatingFromRejection = errors.markAsOriginatingFromRejection;
var canAttach = errors.canAttach;
var thrower = util.thrower;
var apiRejection = require("./errors_api_rejection")(Promise);


var makeSelfResolutionError = function Promise$_makeSelfResolutionError() {
    return new TypeError("circular promise resolution chain");
};

function isPromise(obj) {
    if (obj === void 0) return false;
    return obj instanceof Promise;
}

function isPromiseArrayProxy(receiver, promiseSlotValue) {
    if (receiver instanceof PromiseArray) {
        return promiseSlotValue >= 0;
    }
    return false;
}

function Promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("the promise constructor requires a resolver function");
    }
    if (this.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly");
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = void 0;
    this._rejectionHandler0 = void 0;
    this._promise0 = void 0;
    this._receiver0 = void 0;
    this._settledValue = void 0;
    this._boundTo = void 0;
    if (resolver !== INTERNAL) this._resolveFromResolver(resolver);
}

Promise.prototype.bind = function Promise$bind(thisArg) {
    var ret = new Promise(INTERNAL);
    ret._setTrace(this);
    ret._follow(this);
    ret._setBoundTo(thisArg);
    if (this._cancellable()) {
        ret._setCancellable();
        ret._cancellationParent = this;
    }
    return ret;
};

Promise.prototype.toString = function Promise$toString() {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] =
function Promise$catch(fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (typeof item === "function") {
                catchInstances[j++] = item;
            }
            else {
                var catchFilterTypeError =
                    new TypeError(
                        "A catch filter must be an error constructor "
                        + "or a filter function");

                this._attachExtraTrace(catchFilterTypeError);
                async.invoke(this._reject, this, catchFilterTypeError);
                return;
            }
        }
        catchInstances.length = j;
        fn = arguments[i];

        this._resetTrace();
        var catchFilter = new CatchFilter(catchInstances, fn, this);
        return this._then(void 0, catchFilter.doFilter, void 0,
            catchFilter, void 0);
    }
    return this._then(void 0, fn, void 0, void 0, void 0);
};

Promise.prototype.then =
function Promise$then(didFulfill, didReject, didProgress) {
    return this._then(didFulfill, didReject, didProgress,
        void 0, void 0);
};


Promise.prototype.done =
function Promise$done(didFulfill, didReject, didProgress) {
    var promise = this._then(didFulfill, didReject, didProgress,
        void 0, void 0);
    promise._setIsFinal();
};

Promise.prototype.spread = function Promise$spread(didFulfill, didReject) {
    return this._then(didFulfill, didReject, void 0,
        APPLY, void 0);
};

Promise.prototype.isCancellable = function Promise$isCancellable() {
    return !this.isResolved() &&
        this._cancellable();
};

Promise.prototype.toJSON = function Promise$toJSON() {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: void 0,
        rejectionReason: void 0
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this._settledValue;
        ret.isFulfilled = true;
    }
    else if (this.isRejected()) {
        ret.rejectionReason = this._settledValue;
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function Promise$all() {
    return Promise$_all(this, true);
};


Promise.is = isPromise;

function Promise$_all(promises, useBound) {
    return Promise$_CreatePromiseArray(
        promises,
        PromiseArray,
        useBound === true && promises._isBound()
            ? promises._boundTo
            : void 0
   ).promise();
}
Promise.all = function Promise$All(promises) {
    return Promise$_all(promises, false);
};

Promise.join = function Promise$Join() {
    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
    return Promise$_CreatePromiseArray(args, PromiseArray, void 0).promise();
};

Promise.resolve = Promise.fulfilled =
function Promise$Resolve(value) {
    var ret = new Promise(INTERNAL);
    ret._setTrace(void 0);
    if (ret._tryFollow(value)) {
        return ret;
    }
    ret._cleanValues();
    ret._setFulfilled();
    ret._settledValue = value;
    return ret;
};

Promise.reject = Promise.rejected = function Promise$Reject(reason) {
    var ret = new Promise(INTERNAL);
    ret._setTrace(void 0);
    markAsOriginatingFromRejection(reason);
    ret._cleanValues();
    ret._setRejected();
    ret._settledValue = reason;
    if (!canAttach(reason)) {
        var trace = new Error(reason + "");
        ret._setCarriedStackTrace(trace);
    }
    ret._ensurePossibleRejectionHandled();
    return ret;
};

Promise.prototype.error = function Promise$_error(fn) {
    return this.caught(originatesFromRejection, fn);
};

Promise.prototype._resolveFromSyncValue =
function Promise$_resolveFromSyncValue(value) {
    if (value === errorObj) {
        this._cleanValues();
        this._setRejected();
        this._settledValue = value.e;
        this._ensurePossibleRejectionHandled();
    }
    else {
        var maybePromise = Promise._cast(value, void 0);
        if (maybePromise instanceof Promise) {
            this._follow(maybePromise);
        }
        else {
            this._cleanValues();
            this._setFulfilled();
            this._settledValue = value;
        }
    }
};

Promise.method = function Promise$_Method(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("fn must be a function");
    }
    return function Promise$_method() {
        var value;
        switch(arguments.length) {
        case 0: value = tryCatch1(fn, this, void 0); break;
        case 1: value = tryCatch1(fn, this, arguments[0]); break;
        case 2: value = tryCatch2(fn, this, arguments[0], arguments[1]); break;
        default:
            var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
            value = tryCatchApply(fn, args, this); break;
        }
        var ret = new Promise(INTERNAL);
        ret._setTrace(void 0);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function Promise$_Try(fn, args, ctx) {
    if (typeof fn !== "function") {
        return apiRejection("fn must be a function");
    }
    var value = isArray(args)
        ? tryCatchApply(fn, args, ctx)
        : tryCatch1(fn, ctx, args);

    var ret = new Promise(INTERNAL);
    ret._setTrace(void 0);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.defer = Promise.pending = function Promise$Defer() {
    var promise = new Promise(INTERNAL);
    promise._setTrace(void 0);
    return new PromiseResolver(promise);
};

Promise.bind = function Promise$Bind(thisArg) {
    var ret = new Promise(INTERNAL);
    ret._setTrace(void 0);
    ret._setFulfilled();
    ret._setBoundTo(thisArg);
    return ret;
};

Promise.cast = function Promise$_Cast(obj) {
    var ret = Promise._cast(obj, void 0);
    if (!(ret instanceof Promise)) {
        return Promise.resolve(ret);
    }
    return ret;
};

Promise.onPossiblyUnhandledRejection =
function Promise$OnPossiblyUnhandledRejection(fn) {
        CapturedTrace.possiblyUnhandledRejection = typeof fn === "function"
                                                    ? fn : void 0;
};

var unhandledRejectionHandled;
Promise.onUnhandledRejectionHandled =
function Promise$onUnhandledRejectionHandled(fn) {
    unhandledRejectionHandled = typeof fn === "function" ? fn : void 0;
};

var debugging = false || !!(
    typeof process !== "undefined" &&
    typeof process.execPath === "string" &&
    typeof process.env === "object" &&
    (process.env["BLUEBIRD_DEBUG"] ||
        process.env["NODE_ENV"] === "development")
);


Promise.longStackTraces = function Promise$LongStackTraces() {
    if (async.haveItemsQueued() &&
        debugging === false
   ) {
        throw new Error("cannot enable long stack traces after promises have been created");
    }
    debugging = CapturedTrace.isSupported();
};

Promise.hasLongStackTraces = function Promise$HasLongStackTraces() {
    return debugging && CapturedTrace.isSupported();
};

Promise.prototype._setProxyHandlers =
function Promise$_setProxyHandlers(receiver, promiseSlotValue) {
    var index = this._length();

    if (index >= 524287 - 5) {
        index = 0;
        this._setLength(0);
    }
    if (index === 0) {
        this._promise0 = promiseSlotValue;
        this._receiver0 = receiver;
    }
    else {
        var i = index - 5;
        this[i + 3] = promiseSlotValue;
        this[i + 4] = receiver;
        this[i + 0] =
        this[i + 1] =
        this[i + 2] = void 0;
    }
    this._setLength(index + 5);
};

Promise.prototype._proxyPromiseArray =
function Promise$_proxyPromiseArray(promiseArray, index) {
    this._setProxyHandlers(promiseArray, index);
};

Promise.prototype._proxyPromise = function Promise$_proxyPromise(promise) {
    promise._setProxied();
    this._setProxyHandlers(promise, -1);
};

Promise.prototype._then =
function Promise$_then(
    didFulfill,
    didReject,
    didProgress,
    receiver,
    internalData
) {
    var haveInternalData = internalData !== void 0;
    var ret = haveInternalData ? internalData : new Promise(INTERNAL);

    if (debugging && !haveInternalData) {
        var haveSameContext = this._peekContext() === this._traceParent;
        ret._traceParent = haveSameContext ? this._traceParent : this;
        ret._setTrace(this);
    }

    if (!haveInternalData && this._isBound()) {
        ret._setBoundTo(this._boundTo);
    }

    var callbackIndex =
        this._addCallbacks(didFulfill, didReject, didProgress, ret, receiver);

    if (!haveInternalData && this._cancellable()) {
        ret._setCancellable();
        ret._cancellationParent = this;
    }

    if (this.isResolved()) {
        async.invoke(this._queueSettleAt, this, callbackIndex);
    }

    return ret;
};

Promise.prototype._length = function Promise$_length() {
    return this._bitField & 524287;
};

Promise.prototype._isFollowingOrFulfilledOrRejected =
function Promise$_isFollowingOrFulfilledOrRejected() {
    return (this._bitField & 939524096) > 0;
};

Promise.prototype._isFollowing = function Promise$_isFollowing() {
    return (this._bitField & 536870912) === 536870912;
};

Promise.prototype._setLength = function Promise$_setLength(len) {
    this._bitField = (this._bitField & -524288) |
        (len & 524287);
};

Promise.prototype._setFulfilled = function Promise$_setFulfilled() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._setRejected = function Promise$_setRejected() {
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._setFollowing = function Promise$_setFollowing() {
    this._bitField = this._bitField | 536870912;
};

Promise.prototype._setIsFinal = function Promise$_setIsFinal() {
    this._bitField = this._bitField | 33554432;
};

Promise.prototype._isFinal = function Promise$_isFinal() {
    return (this._bitField & 33554432) > 0;
};

Promise.prototype._cancellable = function Promise$_cancellable() {
    return (this._bitField & 67108864) > 0;
};

Promise.prototype._setCancellable = function Promise$_setCancellable() {
    this._bitField = this._bitField | 67108864;
};

Promise.prototype._unsetCancellable = function Promise$_unsetCancellable() {
    this._bitField = this._bitField & (~67108864);
};

Promise.prototype._setRejectionIsUnhandled =
function Promise$_setRejectionIsUnhandled() {
    this._bitField = this._bitField | 2097152;
};

Promise.prototype._unsetRejectionIsUnhandled =
function Promise$_unsetRejectionIsUnhandled() {
    this._bitField = this._bitField & (~2097152);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled =
function Promise$_isRejectionUnhandled() {
    return (this._bitField & 2097152) > 0;
};

Promise.prototype._setUnhandledRejectionIsNotified =
function Promise$_setUnhandledRejectionIsNotified() {
    this._bitField = this._bitField | 524288;
};

Promise.prototype._unsetUnhandledRejectionIsNotified =
function Promise$_unsetUnhandledRejectionIsNotified() {
    this._bitField = this._bitField & (~524288);
};

Promise.prototype._isUnhandledRejectionNotified =
function Promise$_isUnhandledRejectionNotified() {
    return (this._bitField & 524288) > 0;
};

Promise.prototype._setCarriedStackTrace =
function Promise$_setCarriedStackTrace(capturedTrace) {
    this._bitField = this._bitField | 1048576;
    this._fulfillmentHandler0 = capturedTrace;
};

Promise.prototype._unsetCarriedStackTrace =
function Promise$_unsetCarriedStackTrace() {
    this._bitField = this._bitField & (~1048576);
    this._fulfillmentHandler0 = void 0;
};

Promise.prototype._isCarryingStackTrace =
function Promise$_isCarryingStackTrace() {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._getCarriedStackTrace =
function Promise$_getCarriedStackTrace() {
    return this._isCarryingStackTrace()
        ? this._fulfillmentHandler0
        : void 0;
};

Promise.prototype._receiverAt = function Promise$_receiverAt(index) {
    var ret;
    if (index === 0) {
        ret = this._receiver0;
    }
    else {
        ret = this[index + 4 - 5];
    }
    if (this._isBound() && ret === void 0) {
        return this._boundTo;
    }
    return ret;
};

Promise.prototype._promiseAt = function Promise$_promiseAt(index) {
    if (index === 0) return this._promise0;
    return this[index + 3 - 5];
};

Promise.prototype._fulfillmentHandlerAt =
function Promise$_fulfillmentHandlerAt(index) {
    if (index === 0) return this._fulfillmentHandler0;
    return this[index + 0 - 5];
};

Promise.prototype._rejectionHandlerAt =
function Promise$_rejectionHandlerAt(index) {
    if (index === 0) return this._rejectionHandler0;
    return this[index + 1 - 5];
};

Promise.prototype._unsetAt = function Promise$_unsetAt(index) {
     if (index === 0) {
        this._rejectionHandler0 =
        this._progressHandler0 =
        this._promise0 =
        this._receiver0 = void 0;
        if (!this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 = void 0;
        }
    }
    else {
        this[index - 5 + 0] =
        this[index - 5 + 1] =
        this[index - 5 + 2] =
        this[index - 5 + 3] =
        this[index - 5 + 4] = void 0;
    }
};

Promise.prototype._resolveFromResolver =
function Promise$_resolveFromResolver(resolver) {
    var promise = this;
    this._setTrace(void 0);
    this._pushContext();

    function Promise$_resolver(val) {
        if (promise._tryFollow(val)) {
            return;
        }
        promise._fulfill(val);
    }
    function Promise$_rejecter(val) {
        var trace = canAttach(val) ? val : new Error(val + "");
        promise._attachExtraTrace(trace);
        markAsOriginatingFromRejection(val);
        promise._reject(val, trace === val ? void 0 : trace);
    }
    var r = tryCatch2(resolver, void 0, Promise$_resolver, Promise$_rejecter);
    this._popContext();

    if (r !== void 0 && r === errorObj) {
        var e = r.e;
        var trace = canAttach(e) ? e : new Error(e + "");
        promise._reject(e, trace);
    }
};

Promise.prototype._addCallbacks = function Promise$_addCallbacks(
    fulfill,
    reject,
    progress,
    promise,
    receiver
) {
    var index = this._length();

    if (index >= 524287 - 5) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        if (receiver !== void 0) this._receiver0 = receiver;
        if (typeof fulfill === "function" && !this._isCarryingStackTrace())
            this._fulfillmentHandler0 = fulfill;
        if (typeof reject === "function") this._rejectionHandler0 = reject;
        if (typeof progress === "function") this._progressHandler0 = progress;
    }
    else {
        var i = index - 5;
        this[i + 3] = promise;
        this[i + 4] = receiver;
        this[i + 0] = typeof fulfill === "function"
                                            ? fulfill : void 0;
        this[i + 1] = typeof reject === "function"
                                            ? reject : void 0;
        this[i + 2] = typeof progress === "function"
                                            ? progress : void 0;
    }
    this._setLength(index + 5);
    return index;
};



Promise.prototype._setBoundTo = function Promise$_setBoundTo(obj) {
    if (obj !== void 0) {
        this._bitField = this._bitField | 8388608;
        this._boundTo = obj;
    }
    else {
        this._bitField = this._bitField & (~8388608);
    }
};

Promise.prototype._isBound = function Promise$_isBound() {
    return (this._bitField & 8388608) === 8388608;
};

Promise.prototype._spreadSlowCase =
function Promise$_spreadSlowCase(targetFn, promise, values, boundTo) {
    var promiseForAll =
            Promise$_CreatePromiseArray
                (values, PromiseArray, boundTo)
            .promise()
            ._then(function() {
                return targetFn.apply(boundTo, arguments);
            }, void 0, void 0, APPLY, void 0);

    promise._follow(promiseForAll);
};

Promise.prototype._callSpread =
function Promise$_callSpread(handler, promise, value, localDebugging) {
    var boundTo = this._isBound() ? this._boundTo : void 0;
    if (isArray(value)) {
        for (var i = 0, len = value.length; i < len; ++i) {
            if (isPromise(Promise._cast(value[i], void 0))) {
                this._spreadSlowCase(handler, promise, value, boundTo);
                return;
            }
        }
    }
    if (localDebugging) promise._pushContext();
    return tryCatchApply(handler, value, boundTo);
};

Promise.prototype._callHandler =
function Promise$_callHandler(
    handler, receiver, promise, value, localDebugging) {
    var x;
    if (receiver === APPLY && !this.isRejected()) {
        x = this._callSpread(handler, promise, value, localDebugging);
    }
    else {
        if (localDebugging) promise._pushContext();
        x = tryCatch1(handler, receiver, value);
    }
    if (localDebugging) promise._popContext();
    return x;
};

Promise.prototype._settlePromiseFromHandler =
function Promise$_settlePromiseFromHandler(
    handler, receiver, value, promise
) {
    if (!isPromise(promise)) {
        handler.call(receiver, value, promise);
        return;
    }

    var localDebugging = debugging;
    var x = this._callHandler(handler, receiver,
                                promise, value, localDebugging);

    if (promise._isFollowing()) return;

    if (x === errorObj || x === promise || x === NEXT_FILTER) {
        var err = x === promise
                    ? makeSelfResolutionError()
                    : x.e;
        var trace = canAttach(err) ? err : new Error(err + "");
        if (x !== NEXT_FILTER) promise._attachExtraTrace(trace);
        promise._rejectUnchecked(err, trace);
    }
    else {
        var castValue = Promise._cast(x, promise);
        if (isPromise(castValue)) {
            if (castValue.isRejected() &&
                !castValue._isCarryingStackTrace() &&
                !canAttach(castValue._settledValue)) {
                var trace = new Error(castValue._settledValue + "");
                promise._attachExtraTrace(trace);
                castValue._setCarriedStackTrace(trace);
            }
            promise._follow(castValue);
            if (castValue._cancellable()) {
                promise._cancellationParent = castValue;
                promise._setCancellable();
            }
        }
        else {
            promise._fulfillUnchecked(x);
        }
    }
};

Promise.prototype._follow =
function Promise$_follow(promise) {
    this._setFollowing();

    if (promise.isPending()) {
        if (promise._cancellable() ) {
            this._cancellationParent = promise;
            this._setCancellable();
        }
        promise._proxyPromise(this);
    }
    else if (promise.isFulfilled()) {
        this._fulfillUnchecked(promise._settledValue);
    }
    else {
        this._rejectUnchecked(promise._settledValue,
            promise._getCarriedStackTrace());
    }

    if (promise._isRejectionUnhandled()) promise._unsetRejectionIsUnhandled();

    if (debugging &&
        promise._traceParent == null) {
        promise._traceParent = this;
    }
};

Promise.prototype._tryFollow =
function Promise$_tryFollow(value) {
    if (this._isFollowingOrFulfilledOrRejected() ||
        value === this) {
        return false;
    }
    var maybePromise = Promise._cast(value, void 0);
    if (!isPromise(maybePromise)) {
        return false;
    }
    this._follow(maybePromise);
    return true;
};

Promise.prototype._resetTrace = function Promise$_resetTrace() {
    if (debugging) {
        this._trace = new CapturedTrace(this._peekContext() === void 0);
    }
};

Promise.prototype._setTrace = function Promise$_setTrace(parent) {
    if (debugging) {
        var context = this._peekContext();
        this._traceParent = context;
        var isTopLevel = context === void 0;
        if (parent !== void 0 &&
            parent._traceParent === context) {
            this._trace = parent._trace;
        }
        else {
            this._trace = new CapturedTrace(isTopLevel);
        }
    }
    return this;
};

Promise.prototype._attachExtraTrace =
function Promise$_attachExtraTrace(error) {
    if (debugging) {
        var promise = this;
        var stack = error.stack;
        stack = typeof stack === "string"
            ? stack.split("\n") : [];
        var headerLineCount = 1;

        while(promise != null &&
            promise._trace != null) {
            stack = CapturedTrace.combine(
                stack,
                promise._trace.stack.split("\n")
           );
            promise = promise._traceParent;
        }

        var max = Error.stackTraceLimit + headerLineCount;
        var len = stack.length;
        if (len  > max) {
            stack.length = max;
        }
        if (stack.length <= headerLineCount) {
            error.stack = "(No stack trace)";
        }
        else {
            error.stack = stack.join("\n");
        }
    }
};

Promise.prototype._cleanValues = function Promise$_cleanValues() {
    if (this._cancellable()) {
        this._cancellationParent = void 0;
    }
};

Promise.prototype._fulfill = function Promise$_fulfill(value) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._fulfillUnchecked(value);
};

Promise.prototype._reject =
function Promise$_reject(reason, carriedStackTrace) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._rejectUnchecked(reason, carriedStackTrace);
};

Promise.prototype._settlePromiseAt = function Promise$_settlePromiseAt(index) {
    var handler = this.isFulfilled()
        ? this._fulfillmentHandlerAt(index)
        : this._rejectionHandlerAt(index);

    var value = this._settledValue;
    var receiver = this._receiverAt(index);
    var promise = this._promiseAt(index);

    if (typeof handler === "function") {
        this._settlePromiseFromHandler(handler, receiver, value, promise);
    }
    else {
        var done = false;
        var isFulfilled = this.isFulfilled();
        if (receiver !== void 0) {
            if (receiver instanceof Promise &&
                receiver._isProxied()) {
                receiver._unsetProxied();

                if (isFulfilled) receiver._fulfillUnchecked(value);
                else receiver._rejectUnchecked(value,
                    this._getCarriedStackTrace());
                done = true;
            }
            else if (isPromiseArrayProxy(receiver, promise)) {
                if (isFulfilled) receiver._promiseFulfilled(value, promise);
                else receiver._promiseRejected(value, promise);
                done = true;
            }
        }

        if (!done) {
            if (isFulfilled) promise._fulfill(value);
            else promise._reject(value, this._getCarriedStackTrace());
        }
    }

    if (index >= 256) {
        this._queueGC();
    }
};

Promise.prototype._isProxied = function Promise$_isProxied() {
    return (this._bitField & 4194304) === 4194304;
};

Promise.prototype._setProxied = function Promise$_setProxied() {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._unsetProxied = function Promise$_unsetProxied() {
    this._bitField = this._bitField & (~4194304);
};

Promise.prototype._isGcQueued = function Promise$_isGcQueued() {
    return (this._bitField & -1073741824) === -1073741824;
};

Promise.prototype._setGcQueued = function Promise$_setGcQueued() {
    this._bitField = this._bitField | -1073741824;
};

Promise.prototype._unsetGcQueued = function Promise$_unsetGcQueued() {
    this._bitField = this._bitField & (~-1073741824);
};

Promise.prototype._queueGC = function Promise$_queueGC() {
    if (this._isGcQueued()) return;
    this._setGcQueued();
    async.invokeLater(this._gc, this, void 0);
};

Promise.prototype._gc = function Promise$gc() {
    var len = this._length();
    this._unsetAt(0);
    for (var i = 0; i < len; i++) {
        delete this[i];
    }
    this._setLength(0);
    this._unsetGcQueued();
};

Promise.prototype._queueSettleAt = function Promise$_queueSettleAt(index) {
    if (this._isRejectionUnhandled()) this._unsetRejectionIsUnhandled();
    async.invoke(this._settlePromiseAt, this, index);
};

Promise.prototype._fulfillUnchecked =
function Promise$_fulfillUnchecked(value) {
    if (!this.isPending()) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err, void 0);
    }
    this._cleanValues();
    this._setFulfilled();
    this._settledValue = value;
    var len = this._length();

    if (len > 0) {
        async.invoke(this._settlePromises, this, len);
    }
};

Promise.prototype._rejectUncheckedCheckError =
function Promise$_rejectUncheckedCheckError(reason) {
    var trace = canAttach(reason) ? reason : new Error(reason + "");
    this._rejectUnchecked(reason, trace === reason ? void 0 : trace);
};

Promise.prototype._rejectUnchecked =
function Promise$_rejectUnchecked(reason, trace) {
    if (!this.isPending()) return;
    if (reason === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err);
    }
    this._cleanValues();
    this._setRejected();
    this._settledValue = reason;

    if (this._isFinal()) {
        async.invokeLater(thrower, void 0, trace === void 0 ? reason : trace);
        return;
    }
    var len = this._length();

    if (trace !== void 0) this._setCarriedStackTrace(trace);

    if (len > 0) {
        async.invoke(this._rejectPromises, this, null);
    }
    else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._rejectPromises = function Promise$_rejectPromises() {
    this._settlePromises();
    this._unsetCarriedStackTrace();
};

Promise.prototype._settlePromises = function Promise$_settlePromises() {
    var len = this._length();
    for (var i = 0; i < len; i+= 5) {
        this._settlePromiseAt(i);
    }
};

Promise.prototype._ensurePossibleRejectionHandled =
function Promise$_ensurePossibleRejectionHandled() {
    this._setRejectionIsUnhandled();
    if (CapturedTrace.possiblyUnhandledRejection !== void 0) {
        async.invokeLater(this._notifyUnhandledRejection, this, void 0);
    }
};

Promise.prototype._notifyUnhandledRejectionIsHandled =
function Promise$_notifyUnhandledRejectionIsHandled() {
    if (typeof unhandledRejectionHandled === "function") {
        async.invokeLater(unhandledRejectionHandled, void 0, this);
    }
};

Promise.prototype._notifyUnhandledRejection =
function Promise$_notifyUnhandledRejection() {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue;
        var trace = this._getCarriedStackTrace();

        this._setUnhandledRejectionIsNotified();

        if (trace !== void 0) {
            this._unsetCarriedStackTrace();
            reason = trace;
        }
        if (typeof CapturedTrace.possiblyUnhandledRejection === "function") {
            CapturedTrace.possiblyUnhandledRejection(reason, this);
        }
    }
};

var contextStack = [];
Promise.prototype._peekContext = function Promise$_peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return void 0;

};

Promise.prototype._pushContext = function Promise$_pushContext() {
    if (!debugging) return;
    contextStack.push(this);
};

Promise.prototype._popContext = function Promise$_popContext() {
    if (!debugging) return;
    contextStack.pop();
};

function Promise$_CreatePromiseArray(
    promises, PromiseArrayConstructor, boundTo) {

    var list = null;
    if (isArray(promises)) {
        list = promises;
    }
    else {
        list = Promise._cast(promises, void 0);
        if (list !== promises) {
            list._setBoundTo(boundTo);
        }
        else if (!isPromise(list)) {
            list = null;
        }
    }
    if (list !== null) {
        return new PromiseArrayConstructor(list, boundTo);
    }
    return {
        promise: function() {return apiRejection("expecting an array, a promise or a thenable");}
    };
}

var old = global.Promise;
Promise.noConflict = function() {
    if (global.Promise === Promise) {
        global.Promise = old;
    }
    return Promise;
};

if (!CapturedTrace.isSupported()) {
    Promise.longStackTraces = function(){};
    debugging = false;
}

Promise._makeSelfResolutionError = makeSelfResolutionError;
require("./finally.js")(Promise, NEXT_FILTER);
require("./direct_resolve.js")(Promise);
require("./thenables.js")(Promise, INTERNAL);
require("./synchronous_inspection.js")(Promise);
Promise.RangeError = RangeError;
Promise.CancellationError = CancellationError;
Promise.TimeoutError = TimeoutError;
Promise.TypeError = TypeError;
Promise.RejectionError = RejectionError;

util.toFastProperties(Promise);
util.toFastProperties(Promise.prototype);
require('./timers.js')(Promise,INTERNAL);
require('./any.js')(Promise,Promise$_CreatePromiseArray,PromiseArray);
require('./race.js')(Promise,INTERNAL);
require('./call_get.js')(Promise);
require('./filter.js')(Promise,Promise$_CreatePromiseArray,PromiseArray,apiRejection);
require('./generators.js')(Promise,apiRejection,INTERNAL);
require('./map.js')(Promise,PromiseArray,INTERNAL,apiRejection);
require('./nodeify.js')(Promise);
require('./promisify.js')(Promise,INTERNAL);
require('./props.js')(Promise,PromiseArray);
require('./reduce.js')(Promise,Promise$_CreatePromiseArray,PromiseArray,apiRejection,INTERNAL);
require('./settle.js')(Promise,Promise$_CreatePromiseArray,PromiseArray);
require('./some.js')(Promise,Promise$_CreatePromiseArray,PromiseArray,apiRejection);
require('./progress.js')(Promise,isPromiseArrayProxy);
require('./cancel.js')(Promise,INTERNAL);

Promise.prototype = Promise.prototype;
return Promise;

};

}).call(this,require("tWU75n"))
},{"./any.js":3,"./async.js":4,"./call_get.js":6,"./cancel.js":7,"./captured_trace.js":8,"./catch_filter.js":9,"./direct_resolve.js":10,"./errors.js":11,"./errors_api_rejection":12,"./filter.js":14,"./finally.js":15,"./generators.js":16,"./global.js":17,"./map.js":18,"./nodeify.js":19,"./progress.js":20,"./promise_array.js":22,"./promise_resolver.js":23,"./promisify.js":25,"./props.js":27,"./race.js":29,"./reduce.js":30,"./settle.js":32,"./some.js":34,"./synchronous_inspection.js":36,"./thenables.js":37,"./timers.js":38,"./util.js":39,"tWU75n":2}],22:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var canAttach = require("./errors.js").canAttach;
var util = require("./util.js");
var async = require("./async.js");
var hasOwn = {}.hasOwnProperty;
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -1: return void 0;
    case -2: return [];
    case -3: return {};
    }
}

function PromiseArray(values, boundTo) {
    var promise = this._promise = new Promise(INTERNAL);
    var parent = void 0;
    if (values instanceof Promise) {
        parent = values;
        if (values._cancellable()) {
            promise._setCancellable();
            promise._cancellationParent = values;
        }
        if (values._isBound()) {
            promise._setBoundTo(boundTo);
        }
    }
    promise._setTrace(parent);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(void 0, -2);
}
PromiseArray.PropertiesPromiseArray = function() {};

PromiseArray.prototype.length = function PromiseArray$length() {
    return this._length;
};

PromiseArray.prototype.promise = function PromiseArray$promise() {
    return this._promise;
};

PromiseArray.prototype._init =
function PromiseArray$_init(_, resolveValueIfEmpty) {
    var values = this._values;
    if (values instanceof Promise) {
        if (values.isFulfilled()) {
            values = values._settledValue;
            if (!isArray(values)) {
                var err = new Promise.TypeError("expecting an array, a promise or a thenable");
                this.__hardReject__(err);
                return;
            }
            this._values = values;
        }
        else if (values.isPending()) {
            values._then(
                this._init,
                this._reject,
                void 0,
                this,
                resolveValueIfEmpty
           );
            return;
        }
        else {
            values._unsetRejectionIsUnhandled();
            this._reject(values._settledValue);
            return;
        }
    }

    if (values.length === 0) {
        this._resolve(toResolutionValue(resolveValueIfEmpty));
        return;
    }
    var len = values.length;
    var newLen = len;
    var newValues;
    if (this instanceof PromiseArray.PropertiesPromiseArray) {
        newValues = this._values;
    }
    else {
        newValues = new Array(len);
    }
    var isDirectScanNeeded = false;
    for (var i = 0; i < len; ++i) {
        var promise = values[i];
        if (promise === void 0 && !hasOwn.call(values, i)) {
            newLen--;
            continue;
        }
        var maybePromise = Promise._cast(promise, void 0);
        if (maybePromise instanceof Promise) {
            if (maybePromise.isPending()) {
                maybePromise._proxyPromiseArray(this, i);
            }
            else {
                maybePromise._unsetRejectionIsUnhandled();
                isDirectScanNeeded = true;
            }
        }
        else {
            isDirectScanNeeded = true;
        }
        newValues[i] = maybePromise;
    }
    if (newLen === 0) {
        if (resolveValueIfEmpty === -2) {
            this._resolve(newValues);
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    this._values = newValues;
    this._length = newLen;
    if (isDirectScanNeeded) {
        var scanMethod = newLen === len
            ? this._scanDirectValues
            : this._scanDirectValuesHoled;
        async.invoke(scanMethod, this, len);
    }
};

PromiseArray.prototype._settlePromiseAt =
function PromiseArray$_settlePromiseAt(index) {
    var value = this._values[index];
    if (!(value instanceof Promise)) {
        this._promiseFulfilled(value, index);
    }
    else if (value.isFulfilled()) {
        this._promiseFulfilled(value._settledValue, index);
    }
    else if (value.isRejected()) {
        this._promiseRejected(value._settledValue, index);
    }
};

PromiseArray.prototype._scanDirectValuesHoled =
function PromiseArray$_scanDirectValuesHoled(len) {
    for (var i = 0; i < len; ++i) {
        if (this._isResolved()) {
            break;
        }
        if (hasOwn.call(this._values, i)) {
            this._settlePromiseAt(i);
        }
    }
};

PromiseArray.prototype._scanDirectValues =
function PromiseArray$_scanDirectValues(len) {
    for (var i = 0; i < len; ++i) {
        if (this._isResolved()) {
            break;
        }
        this._settlePromiseAt(i);
    }
};

PromiseArray.prototype._isResolved = function PromiseArray$_isResolved() {
    return this._values === null;
};

PromiseArray.prototype._resolve = function PromiseArray$_resolve(value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype.__hardReject__ =
PromiseArray.prototype._reject = function PromiseArray$_reject(reason) {
    this._values = null;
    var trace = canAttach(reason) ? reason : new Error(reason + "");
    this._promise._attachExtraTrace(trace);
    this._promise._reject(reason, trace);
};

PromiseArray.prototype._promiseProgressed =
function PromiseArray$_promiseProgressed(progressValue, index) {
    if (this._isResolved()) return;
    this._promise._progress({
        index: index,
        value: progressValue
    });
};


PromiseArray.prototype._promiseFulfilled =
function PromiseArray$_promiseFulfilled(value, index) {
    if (this._isResolved()) return;
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

PromiseArray.prototype._promiseRejected =
function PromiseArray$_promiseRejected(reason, index) {
    if (this._isResolved()) return;
    this._totalResolved++;
    this._reject(reason);
};

return PromiseArray;
};

},{"./async.js":4,"./errors.js":11,"./util.js":39}],23:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var util = require("./util.js");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = require("./errors.js");
var TimeoutError = errors.TimeoutError;
var RejectionError = errors.RejectionError;
var async = require("./async.js");
var haveGetters = util.haveGetters;
var es5 = require("./es5.js");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

function wrapAsRejectionError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new RejectionError(obj);
    }
    else {
        ret = obj;
    }
    errors.markAsOriginatingFromRejection(ret);
    return ret;
}

function nodebackForPromise(promise) {
    function PromiseResolver$_callback(err, value) {
        if (promise === null) return;

        if (err) {
            var wrapped = wrapAsRejectionError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        }
        else {
            if (arguments.length > 2) {
                var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
                promise._fulfill(args);
            }
            else {
                promise._fulfill(value);
            }
        }

        promise = null;
    }
    return PromiseResolver$_callback;
}


var PromiseResolver;
if (!haveGetters) {
    PromiseResolver = function PromiseResolver(promise) {
        this.promise = promise;
        this.asCallback = nodebackForPromise(promise);
        this.callback = this.asCallback;
    };
}
else {
    PromiseResolver = function PromiseResolver(promise) {
        this.promise = promise;
    };
}
if (haveGetters) {
    var prop = {
        get: function() {
            return nodebackForPromise(this.promise);
        }
    };
    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
}

PromiseResolver._nodebackForPromise = nodebackForPromise;

PromiseResolver.prototype.toString = function PromiseResolver$toString() {
    return "[object PromiseResolver]";
};

PromiseResolver.prototype.resolve =
PromiseResolver.prototype.fulfill = function PromiseResolver$resolve(value) {
    var promise = this.promise;
    if ((promise === void 0) || (promise._tryFollow === void 0)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.");
    }
    if (promise._tryFollow(value)) {
        return;
    }
    async.invoke(promise._fulfill, promise, value);
};

PromiseResolver.prototype.reject = function PromiseResolver$reject(reason) {
    var promise = this.promise;
    if ((promise === void 0) || (promise._attachExtraTrace === void 0)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.");
    }
    errors.markAsOriginatingFromRejection(reason);
    var trace = errors.canAttach(reason) ? reason : new Error(reason + "");
    promise._attachExtraTrace(trace);
    async.invoke(promise._reject, promise, reason);
    if (trace !== reason) {
        async.invoke(this._setCarriedStackTrace, this, trace);
    }
};

PromiseResolver.prototype.progress =
function PromiseResolver$progress(value) {
    async.invoke(this.promise._progress, this.promise, value);
};

PromiseResolver.prototype.cancel = function PromiseResolver$cancel() {
    async.invoke(this.promise.cancel, this.promise, void 0);
};

PromiseResolver.prototype.timeout = function PromiseResolver$timeout() {
    this.reject(new TimeoutError("timeout"));
};

PromiseResolver.prototype.isResolved = function PromiseResolver$isResolved() {
    return this.promise.isResolved();
};

PromiseResolver.prototype.toJSON = function PromiseResolver$toJSON() {
    return this.promise.toJSON();
};

PromiseResolver.prototype._setCarriedStackTrace =
function PromiseResolver$_setCarriedStackTrace(trace) {
    if (this.promise.isRejected()) {
        this.promise._setCarriedStackTrace(trace);
    }
};

module.exports = PromiseResolver;

},{"./async.js":4,"./errors.js":11,"./es5.js":13,"./util.js":39}],24:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var errors = require("./errors.js");
var TypeError = errors.TypeError;
var util = require("./util.js");
var isArray = util.isArray;
var errorObj = util.errorObj;
var tryCatch1 = util.tryCatch1;
var yieldHandlers = [];

function promiseFromYieldHandler(value) {
    var _yieldHandlers = yieldHandlers;
    var _errorObj = errorObj;
    var _Promise = Promise;
    var len = _yieldHandlers.length;
    for (var i = 0; i < len; ++i) {
        var result = tryCatch1(_yieldHandlers[i], void 0, value);
        if (result === _errorObj) {
            return _Promise.reject(_errorObj.e);
        }
        var maybePromise = _Promise._cast(result,
            promiseFromYieldHandler, void 0);
        if (maybePromise instanceof _Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver) {
    var promise = this._promise = new Promise(INTERNAL);
    promise._setTrace(void 0);
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = void 0;
}

PromiseSpawn.prototype.promise = function PromiseSpawn$promise() {
    return this._promise;
};

PromiseSpawn.prototype._run = function PromiseSpawn$_run() {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = void 0;
    this._next(void 0);
};

PromiseSpawn.prototype._continue = function PromiseSpawn$_continue(result) {
    if (result === errorObj) {
        this._generator = void 0;
        var trace = errors.canAttach(result.e)
            ? result.e : new Error(result.e + "");
        this._promise._attachExtraTrace(trace);
        this._promise._reject(result.e, trace);
        return;
    }

    var value = result.value;
    if (result.done === true) {
        this._generator = void 0;
        if (!this._promise._tryFollow(value)) {
            this._promise._fulfill(value);
        }
    }
    else {
        var maybePromise = Promise._cast(value, PromiseSpawn$_continue, void 0);
        if (!(maybePromise instanceof Promise)) {
            if (isArray(maybePromise)) {
                maybePromise = Promise.all(maybePromise);
            }
            else {
                maybePromise = promiseFromYieldHandler(maybePromise);
            }
            if (maybePromise === null) {
                this._throw(new TypeError("A value was yielded that could not be treated as a promise"));
                return;
            }
        }
        maybePromise._then(
            this._next,
            this._throw,
            void 0,
            this,
            null
       );
    }
};

PromiseSpawn.prototype._throw = function PromiseSpawn$_throw(reason) {
    if (errors.canAttach(reason))
        this._promise._attachExtraTrace(reason);
    this._continue(
        tryCatch1(this._generator["throw"], this._generator, reason)
   );
};

PromiseSpawn.prototype._next = function PromiseSpawn$_next(value) {
    this._continue(
        tryCatch1(this._generator.next, this._generator, value)
   );
};

PromiseSpawn.addYieldHandler = function PromiseSpawn$AddYieldHandler(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function");
    yieldHandlers.push(fn);
};

return PromiseSpawn;
};

},{"./errors.js":11,"./util.js":39}],25:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = require("./util.js");
var es5 = require("./es5.js");
var nodebackForPromise = require("./promise_resolver.js")
    ._nodebackForPromise;
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var deprecated = util.deprecated;
var TypeError = require("./errors").TypeError;


var rasyncSuffix = new RegExp("Async" + "$");
function isPromisified(fn) {
    return fn.__isPromisified__ === true;
}
function hasPromisified(obj, key) {
    var containsKey = ((key + "Async") in obj);
    return containsKey ? isPromisified(obj[key + "Async"])
                       : false;
}
function checkValid(ret) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (rasyncSuffix.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(rasyncSuffix, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API " +
                        "that has normal methods with Async-suffix");
                }
            }
        }
    }
}
var inheritedMethods = (function() {
    if (es5.isES5) {
        var create = Object.create;
        var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
        return function(cur) {
            var ret = [];
            var visitedKeys = create(null);
            var original = cur;
            while (cur !== null) {
                var keys = es5.keys(cur);
                for (var i = 0, len = keys.length; i < len; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = getOwnPropertyDescriptor(cur, key);

                    if (desc != null &&
                        typeof desc.value === "function" &&
                        !isPromisified(desc.value) &&
                        !hasPromisified(original, key)) {
                        ret.push(key, desc.value);
                    }
                }
                cur = es5.getPrototypeOf(cur);
            }
            checkValid(ret);
            return ret;
        };
    }
    else {
        return function(obj) {
            var ret = [];
            /*jshint forin:false */
            for (var key in obj) {
                var fn = obj[key];
                if (typeof fn === "function" &&
                    !isPromisified(fn) &&
                    !hasPromisified(obj, key)) {
                    ret.push(key, fn);
                }
            }
            checkValid(ret);
            return ret;
        };
    }
})();

function switchCaseArgumentOrder(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 5);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        if (i === likelyArgumentCount) continue;
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 5; ++i) {
        ret.push(i);
    }
    return ret;
}

function parameterDeclaration(parameterCount) {
    var ret = new Array(parameterCount);
    for(var i = 0; i < ret.length; ++i) {
        ret[i] = "_arg" + i;
    }
    return ret.join(", ");
}

function parameterCount(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function propertyAccess(id) {
    if (rident.test(id)) {
        return "." + id;
    }
    else return "['" + id.replace(/(['\\])/g, "\\$1") + "']";
}

function makeNodePromisifiedEval(callback, receiver, originalName, fn) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);

    var callbackName = (typeof originalName === "string" ?
        originalName + "Async" :
        "promisified");

    function generateCallForArgumentCount(count) {
        var args = new Array(count);
        for (var i = 0, len = args.length; i < len; ++i) {
            args[i] = "arguments[" + i + "]";
        }
        var comma = count > 0 ? "," : "";

        if (typeof callback === "string" &&
            receiver === THIS) {
            return "this" + propertyAccess(callback) + "("+args.join(",") +
                comma +" fn);"+
                "break;";
        }
        return (receiver === void 0
            ? "callback("+args.join(",")+ comma +" fn);"
            : "callback.call("+(receiver === THIS
                ? "this"
                : "receiver")+", "+args.join(",") + comma + " fn);") +
        "break;";
    }

    if (!rident.test(callbackName)) {
        callbackName = "promisified";
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for(var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }
        ret += "default: var args = new Array(len + 1);" +
            "var i = 0;" +
            "for (var i = 0; i < len; ++i) { " +
            "   args[i] = arguments[i];" +
            "}" +
            "args[i] = fn;" +

            (typeof callback === "string"
            ? "this" + propertyAccess(callback) + ".apply("
            : "callback.apply(") +

            (receiver === THIS ? "this" : "receiver") +
            ", args); break;";
        return ret;
    }

    return new Function("Promise", "callback", "receiver",
            "withAppended", "maybeWrapAsError", "nodebackForPromise",
            "INTERNAL",
        "var ret = function " + callbackName +
        "(" + parameterDeclaration(newParameterCount) + ") {\"use strict\";" +
        "var len = arguments.length;" +
        "var promise = new Promise(INTERNAL);"+
        "promise._setTrace(void 0);" +
        "var fn = nodebackForPromise(promise);"+
        "try {" +
        "switch(len) {" +
        generateArgumentSwitchCase() +
        "}" +
        "}" +
        "catch(e){ " +
        "var wrapped = maybeWrapAsError(e);" +
        "promise._attachExtraTrace(wrapped);" +
        "promise._reject(wrapped);" +
        "}" +
        "return promise;" +
        "" +
        "}; ret.__isPromisified__ = true; return ret;"
   )(Promise, callback, receiver, withAppended,
        maybeWrapAsError, nodebackForPromise, INTERNAL);
}

function makeNodePromisifiedClosure(callback, receiver) {
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        if (typeof callback === "string") {
            callback = _receiver[callback];
        }
        var promise = new Promise(INTERNAL);
        promise._setTrace(void 0);
        var fn = nodebackForPromise(promise);
        try {
            callback.apply(_receiver, withAppended(arguments, fn));
        }
        catch(e) {
            var wrapped = maybeWrapAsError(e);
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        }
        return promise;
    }
    promisified.__isPromisified__ = true;
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function _promisify(callback, receiver, isAll) {
    if (isAll) {
        var methods = inheritedMethods(callback);
        for (var i = 0, len = methods.length; i < len; i+= 2) {
            var key = methods[i];
            var fn = methods[i+1];
            var promisifiedKey = key + "Async";
            callback[promisifiedKey] = makeNodePromisified(key, THIS, key, fn);
        }
        util.toFastProperties(callback);
        return callback;
    }
    else {
        return makeNodePromisified(callback, receiver, void 0, callback);
    }
}

Promise.promisify = function Promise$Promisify(fn, receiver) {
    if (typeof fn === "object" && fn !== null) {
        deprecated("Promise.promisify for promisifying entire objects is deprecated. Use Promise.promisifyAll instead.");
        return _promisify(fn, receiver, true);
    }
    if (typeof fn !== "function") {
        throw new TypeError("fn must be a function");
    }
    if (isPromisified(fn)) {
        return fn;
    }
    return _promisify(
        fn,
        arguments.length < 2 ? THIS : receiver,
        false);
};

Promise.promisifyAll = function Promise$PromisifyAll(target) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function");
    }
    return _promisify(target, void 0, true);
};
};


},{"./errors":11,"./es5.js":13,"./promise_resolver.js":23,"./util.js":39}],26:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, PromiseArray) {
var util = require("./util.js");
var inherits = util.inherits;
var es5 = require("./es5.js");

function PropertiesPromiseArray(obj, boundTo) {
    var keys = es5.keys(obj);
    var values = new Array(keys.length);
    for (var i = 0, len = values.length; i < len; ++i) {
        values[i] = obj[keys[i]];
    }
    this.constructor$(values, boundTo);
    if (!this._isResolved()) {
        for (var i = 0, len = keys.length; i < len; ++i) {
            values.push(keys[i]);
        }
    }
}
inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init =
function PropertiesPromiseArray$_init() {
    this._init$(void 0, -3) ;
};

PropertiesPromiseArray.prototype._promiseFulfilled =
function PropertiesPromiseArray$_promiseFulfilled(value, index) {
    if (this._isResolved()) return;
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val = {};
        var keyOffset = this.length();
        for (var i = 0, len = this.length(); i < len; ++i) {
            val[this._values[i + keyOffset]] = this._values[i];
        }
        this._resolve(val);
    }
};

PropertiesPromiseArray.prototype._promiseProgressed =
function PropertiesPromiseArray$_promiseProgressed(value, index) {
    if (this._isResolved()) return;

    this._promise._progress({
        key: this._values[index + this.length()],
        value: value
    });
};

PromiseArray.PropertiesPromiseArray = PropertiesPromiseArray;

return PropertiesPromiseArray;
};

},{"./es5.js":13,"./util.js":39}],27:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, PromiseArray) {
var PropertiesPromiseArray = require("./properties_promise_array.js")(
    Promise, PromiseArray);
var util = require("./util.js");
var apiRejection = require("./errors_api_rejection")(Promise);
var isObject = util.isObject;

function Promise$_Props(promises, useBound) {
    var ret;
    var castValue = Promise._cast(promises, void 0);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object");
    }
    else if (castValue instanceof Promise) {
        ret = castValue._then(Promise.props, void 0, void 0,
                        void 0, void 0);
    }
    else {
        ret = new PropertiesPromiseArray(
            castValue,
            useBound === true && castValue._isBound()
                        ? castValue._boundTo
                        : void 0
       ).promise();
        useBound = false;
    }
    if (useBound === true && castValue._isBound()) {
        ret._setBoundTo(castValue._boundTo);
    }
    return ret;
}

Promise.prototype.props = function Promise$props() {
    return Promise$_Props(this, true);
};

Promise.props = function Promise$Props(promises) {
    return Promise$_Props(promises, false);
};
};

},{"./errors_api_rejection":12,"./properties_promise_array.js":26,"./util.js":39}],28:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
function arrayCopy(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
    }
}

function pow2AtLeast(n) {
    n = n >>> 0;
    n = n - 1;
    n = n | (n >> 1);
    n = n | (n >> 2);
    n = n | (n >> 4);
    n = n | (n >> 8);
    n = n | (n >> 16);
    return n + 1;
}

function getCapacity(capacity) {
    if (typeof capacity !== "number") return 16;
    return pow2AtLeast(
        Math.min(
            Math.max(16, capacity), 1073741824)
   );
}

function Queue(capacity) {
    this._capacity = getCapacity(capacity);
    this._length = 0;
    this._front = 0;
    this._makeCapacity();
}

Queue.prototype._willBeOverCapacity =
function Queue$_willBeOverCapacity(size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function Queue$_pushOne(arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function Queue$push(fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function Queue$shift() {
    var front = this._front,
        ret = this[front];

    this[front] = void 0;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function Queue$length() {
    return this._length;
};

Queue.prototype._makeCapacity = function Queue$_makeCapacity() {
    var len = this._capacity;
    for (var i = 0; i < len; ++i) {
        this[i] = void 0;
    }
};

Queue.prototype._checkCapacity = function Queue$_checkCapacity(size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 3);
    }
};

Queue.prototype._resizeTo = function Queue$_resizeTo(capacity) {
    var oldFront = this._front;
    var oldCapacity = this._capacity;
    var oldQueue = new Array(oldCapacity);
    var length = this.length();

    arrayCopy(this, 0, oldQueue, 0, oldCapacity);
    this._capacity = capacity;
    this._makeCapacity();
    this._front = 0;
    if (oldFront + length <= oldCapacity) {
        arrayCopy(oldQueue, oldFront, this, 0, length);
    }
    else {        var lengthBeforeWrapping =
            length - ((oldFront + length) & (oldCapacity - 1));

        arrayCopy(oldQueue, oldFront, this, 0, lengthBeforeWrapping);
        arrayCopy(oldQueue, 0, this, lengthBeforeWrapping,
                    length - lengthBeforeWrapping);
    }
};

module.exports = Queue;

},{}],29:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var apiRejection = require("./errors_api_rejection.js")(Promise);
var isArray = require("./util.js").isArray;

var raceLater = function Promise$_raceLater(promise) {
    return promise.then(function(array) {
        return Promise$_Race(array, promise);
    });
};

var hasOwn = {}.hasOwnProperty;
function Promise$_Race(promises, parent) {
    var maybePromise = Promise._cast(promises, void 0);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    }
    else if (!isArray(promises)) {
        return apiRejection("expecting an array, a promise or a thenable");
    }

    var ret = new Promise(INTERNAL);
    ret._setTrace(parent);
    if (parent !== void 0) {
        if (parent._isBound()) {
            ret._setBoundTo(parent._boundTo);
        }
        if (parent._cancellable()) {
            ret._setCancellable();
            ret._cancellationParent = parent;
        }
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === void 0 && !(hasOwn.call(promises, i))) {
            continue;
        }

        Promise.cast(val)._then(
            fulfill,
            reject,
            void 0,
            ret,
            null
       );
    }
    return ret;
}

Promise.race = function Promise$Race(promises) {
    return Promise$_Race(promises, void 0);
};

Promise.prototype.race = function Promise$race() {
    return Promise$_Race(this, void 0);
};

};

},{"./errors_api_rejection.js":12,"./util.js":39}],30:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(
    Promise, Promise$_CreatePromiseArray,
    PromiseArray, apiRejection, INTERNAL) {

function Reduction(callback, index, accum, items, receiver) {
    this.promise = new Promise(INTERNAL);
    this.index = index;
    this.length = items.length;
    this.items = items;
    this.callback = callback;
    this.receiver = receiver;
    this.accum = accum;
}

Reduction.prototype.reject = function Reduction$reject(e) {
    this.promise._reject(e);
};

Reduction.prototype.fulfill = function Reduction$fulfill(value, index) {
    this.accum = value;
    this.index = index + 1;
    this.iterate();
};

Reduction.prototype.iterate = function Reduction$iterate() {
    var i = this.index;
    var len = this.length;
    var items = this.items;
    var result = this.accum;
    var receiver = this.receiver;
    var callback = this.callback;

    for (; i < len; ++i) {
        result = callback.call(receiver, result, items[i], i, len);
        result = Promise._cast(result, void 0);

        if (result instanceof Promise) {
            result._then(
                this.fulfill, this.reject, void 0, this, i);
            return;
        }
    }
    this.promise._fulfill(result);
};

function Promise$_reducer(fulfilleds, initialValue) {
    var fn = this;
    var receiver = void 0;
    if (typeof fn !== "function")  {
        receiver = fn.receiver;
        fn = fn.fn;
    }
    var len = fulfilleds.length;
    var accum = void 0;
    var startIndex = 0;

    if (initialValue !== void 0) {
        accum = initialValue;
        startIndex = 0;
    }
    else {
        startIndex = 1;
        if (len > 0) accum = fulfilleds[0];
    }
    var i = startIndex;

    if (i >= len) {
        return accum;
    }

    var reduction = new Reduction(fn, i, accum, fulfilleds, receiver);
    reduction.iterate();
    return reduction.promise;
}

function Promise$_unpackReducer(fulfilleds) {
    var fn = this.fn;
    var initialValue = this.initialValue;
    return Promise$_reducer.call(fn, fulfilleds, initialValue);
}

function Promise$_slowReduce(
    promises, fn, initialValue, useBound) {
    return initialValue._then(function(initialValue) {
        return Promise$_Reduce(
            promises, fn, initialValue, useBound);
    }, void 0, void 0, void 0, void 0);
}

function Promise$_Reduce(promises, fn, initialValue, useBound) {
    if (typeof fn !== "function") {
        return apiRejection("fn must be a function");
    }

    if (useBound === true && promises._isBound()) {
        fn = {
            fn: fn,
            receiver: promises._boundTo
        };
    }

    if (initialValue !== void 0) {
        if (initialValue instanceof Promise) {
            if (initialValue.isFulfilled()) {
                initialValue = initialValue._settledValue;
            }
            else {
                return Promise$_slowReduce(promises,
                    fn, initialValue, useBound);
            }
        }

        return Promise$_CreatePromiseArray(promises, PromiseArray,
            useBound === true && promises._isBound()
                ? promises._boundTo
                : void 0)
            .promise()
            ._then(Promise$_unpackReducer, void 0, void 0, {
                fn: fn,
                initialValue: initialValue
            }, void 0);
    }
    return Promise$_CreatePromiseArray(promises, PromiseArray,
            useBound === true && promises._isBound()
                ? promises._boundTo
                : void 0).promise()
        ._then(Promise$_reducer, void 0, void 0, fn, void 0);
}


Promise.reduce = function Promise$Reduce(promises, fn, initialValue) {
    return Promise$_Reduce(promises, fn, initialValue, false);
};

Promise.prototype.reduce = function Promise$reduce(fn, initialValue) {
    return Promise$_Reduce(this, fn, initialValue, true);
};
};

},{}],31:[function(require,module,exports){
(function (process){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var global = require("./global.js");
var schedule;
if (typeof process !== "undefined" && process !== null &&
    typeof process.cwd === "function" &&
    typeof process.nextTick === "function" &&
    typeof process.version === "string") {
    schedule = function Promise$_Scheduler(fn) {
        process.nextTick(fn);
    };
}
else if ((typeof global.MutationObserver === "function" ||
        typeof global.WebkitMutationObserver === "function" ||
        typeof global.WebKitMutationObserver === "function") &&
        typeof document !== "undefined" &&
        typeof document.createElement === "function") {


    schedule = (function(){
        var MutationObserver = global.MutationObserver ||
            global.WebkitMutationObserver ||
            global.WebKitMutationObserver;
        var div = document.createElement("div");
        var queuedFn = void 0;
        var observer = new MutationObserver(
            function Promise$_Scheduler() {
                var fn = queuedFn;
                queuedFn = void 0;
                fn();
            }
       );
        observer.observe(div, {
            attributes: true
        });
        return function Promise$_Scheduler(fn) {
            queuedFn = fn;
            div.setAttribute("class", "foo");
        };

    })();
}
else if (typeof global.postMessage === "function" &&
    typeof global.importScripts !== "function" &&
    typeof global.addEventListener === "function" &&
    typeof global.removeEventListener === "function") {

    var MESSAGE_KEY = "bluebird_message_key_" + Math.random();
    schedule = (function(){
        var queuedFn = void 0;

        function Promise$_Scheduler(e) {
            if (e.source === global &&
                e.data === MESSAGE_KEY) {
                var fn = queuedFn;
                queuedFn = void 0;
                fn();
            }
        }

        global.addEventListener("message", Promise$_Scheduler, false);

        return function Promise$_Scheduler(fn) {
            queuedFn = fn;
            global.postMessage(
                MESSAGE_KEY, "*"
           );
        };

    })();
}
else if (typeof global.MessageChannel === "function") {
    schedule = (function(){
        var queuedFn = void 0;

        var channel = new global.MessageChannel();
        channel.port1.onmessage = function Promise$_Scheduler() {
                var fn = queuedFn;
                queuedFn = void 0;
                fn();
        };

        return function Promise$_Scheduler(fn) {
            queuedFn = fn;
            channel.port2.postMessage(null);
        };
    })();
}
else if (global.setTimeout) {
    schedule = function Promise$_Scheduler(fn) {
        setTimeout(fn, 4);
    };
}
else {
    schedule = function Promise$_Scheduler(fn) {
        fn();
    };
}

module.exports = schedule;

}).call(this,require("tWU75n"))
},{"./global.js":17,"tWU75n":2}],32:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports =
    function(Promise, Promise$_CreatePromiseArray, PromiseArray) {

var SettledPromiseArray = require("./settled_promise_array.js")(
    Promise, PromiseArray);

function Promise$_Settle(promises, useBound) {
    return Promise$_CreatePromiseArray(
        promises,
        SettledPromiseArray,
        useBound === true && promises._isBound()
            ? promises._boundTo
            : void 0
   ).promise();
}

Promise.settle = function Promise$Settle(promises) {
    return Promise$_Settle(promises, false);
};

Promise.prototype.settle = function Promise$settle() {
    return Promise$_Settle(this, true);
};
};

},{"./settled_promise_array.js":33}],33:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, PromiseArray) {
var PromiseInspection = Promise.PromiseInspection;
var util = require("./util.js");
var inherits = util.inherits;
function SettledPromiseArray(values, boundTo) {
    this.constructor$(values, boundTo);
}
inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved =
function SettledPromiseArray$_promiseResolved(index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

SettledPromiseArray.prototype._promiseFulfilled =
function SettledPromiseArray$_promiseFulfilled(value, index) {
    if (this._isResolved()) return;
    var ret = new PromiseInspection();
    ret._bitField = 268435456;
    ret._settledValue = value;
    this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected =
function SettledPromiseArray$_promiseRejected(reason, index) {
    if (this._isResolved()) return;
    var ret = new PromiseInspection();
    ret._bitField = 134217728;
    ret._settledValue = reason;
    this._promiseResolved(index, ret);
};

return SettledPromiseArray;
};

},{"./util.js":39}],34:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports =
function(Promise, Promise$_CreatePromiseArray, PromiseArray, apiRejection) {

var SomePromiseArray = require("./some_promise_array.js")(PromiseArray);
function Promise$_Some(promises, howMany, useBound) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer");
    }
    var ret = Promise$_CreatePromiseArray(
        promises,
        SomePromiseArray,
        useBound === true && promises._isBound()
            ? promises._boundTo
            : void 0
   );
    var promise = ret.promise();
    if (promise.isRejected()) {
        return promise;
    }
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function Promise$Some(promises, howMany) {
    return Promise$_Some(promises, howMany, false);
};

Promise.prototype.some = function Promise$some(count) {
    return Promise$_Some(this, count, true);
};

};

},{"./some_promise_array.js":35}],35:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function (PromiseArray) {
var util = require("./util.js");
var RangeError = require("./errors.js").RangeError;
var inherits = util.inherits;
var isArray = util.isArray;

function SomePromiseArray(values, boundTo) {
    this.constructor$(values, boundTo);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function SomePromiseArray$_init() {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(void 0, -2);
    var isArrayResolved = isArray(this._values);
    this._holes = isArrayResolved ? this._values.length - this.length() : 0;

    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        var message = "(Promise.some) input array contains less than " +
                        this._howMany  + " promises";
        this._reject(new RangeError(message));
    }
};

SomePromiseArray.prototype.init = function SomePromiseArray$init() {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function SomePromiseArray$setUnwrap() {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function SomePromiseArray$howMany() {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany =
function SomePromiseArray$setHowMany(count) {
    if (this._isResolved()) return;
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled =
function SomePromiseArray$_promiseFulfilled(value) {
    if (this._isResolved()) return;
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        }
        else {
            this._resolve(this._values);
        }
    }

};
SomePromiseArray.prototype._promiseRejected =
function SomePromiseArray$_promiseRejected(reason) {
    if (this._isResolved()) return;
    this._addRejected(reason);
    if (this.howMany() > this._canPossiblyFulfill()) {
        if (this._values.length === this.length()) {
            this._reject([]);
        }
        else {
            this._reject(this._values.slice(this.length() + this._holes));
        }
    }
};

SomePromiseArray.prototype._fulfilled = function SomePromiseArray$_fulfilled() {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function SomePromiseArray$_rejected() {
    return this._values.length - this.length() - this._holes;
};

SomePromiseArray.prototype._addRejected =
function SomePromiseArray$_addRejected(reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled =
function SomePromiseArray$_addFulfilled(value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill =
function SomePromiseArray$_canPossiblyFulfill() {
    return this.length() - this._rejected();
};

return SomePromiseArray;
};

},{"./errors.js":11,"./util.js":39}],36:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== void 0) {
        this._bitField = promise._bitField;
        this._settledValue = promise.isResolved()
            ? promise._settledValue
            : void 0;
    }
    else {
        this._bitField = 0;
        this._settledValue = void 0;
    }
}

PromiseInspection.prototype.isFulfilled =
Promise.prototype.isFulfilled = function Promise$isFulfilled() {
    return (this._bitField & 268435456) > 0;
};

PromiseInspection.prototype.isRejected =
Promise.prototype.isRejected = function Promise$isRejected() {
    return (this._bitField & 134217728) > 0;
};

PromiseInspection.prototype.isPending =
Promise.prototype.isPending = function Promise$isPending() {
    return (this._bitField & 402653184) === 0;
};

PromiseInspection.prototype.value =
Promise.prototype.value = function Promise$value() {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise");
    }
    return this._settledValue;
};

PromiseInspection.prototype.error =
Promise.prototype.reason = function Promise$reason() {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise");
    }
    return this._settledValue;
};

PromiseInspection.prototype.isResolved =
Promise.prototype.isResolved = function Promise$isResolved() {
    return (this._bitField & 402653184) > 0;
};

Promise.prototype.inspect = function Promise$inspect() {
    return new PromiseInspection(this);
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],37:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = require("./util.js");
var canAttach = require("./errors.js").canAttach;
var errorObj = util.errorObj;
var isObject = util.isObject;

function getThen(obj) {
    try {
        return obj.then;
    }
    catch(e) {
        errorObj.e = e;
        return errorObj;
    }
}

function Promise$_Cast(obj, originalPromise) {
    if (isObject(obj)) {
        if (obj instanceof Promise) {
            return obj;
        }
        else if (isAnyBluebirdPromise(obj)) {
            var ret = new Promise(INTERNAL);
            ret._setTrace(void 0);
            obj._then(
                ret._fulfillUnchecked,
                ret._rejectUncheckedCheckError,
                ret._progressUnchecked,
                ret,
                null
            );
            ret._setFollowing();
            return ret;
        }
        var then = getThen(obj);
        if (then === errorObj) {
            if (originalPromise !== void 0 && canAttach(then.e)) {
                originalPromise._attachExtraTrace(then.e);
            }
            return Promise.reject(then.e);
        }
        else if (typeof then === "function") {
            return Promise$_doThenable(obj, then, originalPromise);
        }
    }
    return obj;
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    return hasProp.call(obj, "_promise0");
}

function Promise$_doThenable(x, then, originalPromise) {
    var resolver = Promise.defer();
    var called = false;
    try {
        then.call(
            x,
            Promise$_resolveFromThenable,
            Promise$_rejectFromThenable,
            Promise$_progressFromThenable
        );
    }
    catch(e) {
        if (!called) {
            called = true;
            var trace = canAttach(e) ? e : new Error(e + "");
            if (originalPromise !== void 0) {
                originalPromise._attachExtraTrace(trace);
            }
            resolver.promise._reject(e, trace);
        }
    }
    return resolver.promise;

    function Promise$_resolveFromThenable(y) {
        if (called) return;
        called = true;

        if (x === y) {
            var e = Promise._makeSelfResolutionError();
            if (originalPromise !== void 0) {
                originalPromise._attachExtraTrace(e);
            }
            resolver.promise._reject(e, void 0);
            return;
        }
        resolver.resolve(y);
    }

    function Promise$_rejectFromThenable(r) {
        if (called) return;
        called = true;
        var trace = canAttach(r) ? r : new Error(r + "");
        if (originalPromise !== void 0) {
            originalPromise._attachExtraTrace(trace);
        }
        resolver.promise._reject(r, trace);
    }

    function Promise$_progressFromThenable(v) {
        if (called) return;
        var promise = resolver.promise;
        if (typeof promise._progress === "function") {
            promise._progress(v);
        }
    }
}

Promise._cast = Promise$_Cast;
};

},{"./errors.js":11,"./util.js":39}],38:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var global = require("./global.js");
var setTimeout = function(fn, ms) {
    var $_len = arguments.length;var args = new Array($_len - 2); for(var $_i = 2; $_i < $_len; ++$_i) {args[$_i - 2] = arguments[$_i];}
    global.setTimeout(function(){
        fn.apply(void 0, args);
    }, ms);
};

module.exports = function(Promise, INTERNAL) {
var util = require("./util.js");
var errors = require("./errors.js");
var apiRejection = require("./errors_api_rejection")(Promise);
var TimeoutError = Promise.TimeoutError;

var afterTimeout = function Promise$_afterTimeout(promise, message, ms) {
    if (!promise.isPending()) return;
    if (typeof message !== "string") {
        message = "operation timed out after" + " " + ms + " ms"
    }
    var err = new TimeoutError(message);
    errors.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._rejectUnchecked(err);
};

var afterDelay = function Promise$_afterDelay(value, promise) {
    promise._fulfill(value);
};

var delay = Promise.delay = function Promise$Delay(value, ms) {
    if (ms === void 0) {
        ms = value;
        value = void 0;
    }
    ms = +ms;
    var maybePromise = Promise._cast(value, void 0);
    var promise = new Promise(INTERNAL);

    if (maybePromise instanceof Promise) {
        if (maybePromise._isBound()) {
            promise._setBoundTo(maybePromise._boundTo);
        }
        if (maybePromise._cancellable()) {
            promise._setCancellable();
            promise._cancellationParent = maybePromise;
        }
        promise._setTrace(maybePromise);
        promise._follow(maybePromise);
        return promise.then(function(value) {
            return Promise.delay(value, ms);
        });
    }
    else {
        promise._setTrace(void 0);
        setTimeout(afterDelay, ms, value, promise);
    }
    return promise;
};

Promise.prototype.delay = function Promise$delay(ms) {
    return delay(this, ms);
};

Promise.prototype.timeout = function Promise$timeout(ms, message) {
    ms = +ms;

    var ret = new Promise(INTERNAL);
    ret._setTrace(this);

    if (this._isBound()) ret._setBoundTo(this._boundTo);
    if (this._cancellable()) {
        ret._setCancellable();
        ret._cancellationParent = this;
    }
    ret._follow(this);
    setTimeout(afterTimeout, ms, ret, message, ms);
    return ret;
};

};

},{"./errors.js":11,"./errors_api_rejection":12,"./global.js":17,"./util.js":39}],39:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var global = require("./global.js");
var es5 = require("./es5.js");
var haveGetters = (function(){
    try {
        var o = {};
        es5.defineProperty(o, "f", {
            get: function () {
                return 3;
            }
        });
        return o.f === 3;
    }
    catch (e) {
        return false;
    }

})();

var canEvaluate = (function() {
    if (typeof window !== "undefined" && window !== null &&
        typeof window.document !== "undefined" &&
        typeof navigator !== "undefined" && navigator !== null &&
        typeof navigator.appName === "string" &&
        window === global) {
        return false;
    }
    return true;
})();

function deprecated(msg) {
    if (typeof console !== "undefined" && console !== null &&
        typeof console.warn === "function") {
        console.warn("Bluebird: " + msg);
    }
}

var errorObj = {e: {}};
function tryCatch1(fn, receiver, arg) {
    try {
        return fn.call(receiver, arg);
    }
    catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

function tryCatch2(fn, receiver, arg, arg2) {
    try {
        return fn.call(receiver, arg, arg2);
    }
    catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

function tryCatchApply(fn, args, receiver) {
    try {
        return fn.apply(receiver, args);
    }
    catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};

function asString(val) {
    return typeof val === "string" ? val : ("" + val);
}

function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return !isPrimitive(value);
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(asString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}


function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}


var wrapsPrimitiveReceiver = (function() {
    return this !== "string";
}).call("string");

function thrower(r) {
    throw r;
}


function toFastProperties(obj) {
    /*jshint -W027*/
    function f() {}
    f.prototype = obj;
    return f;
    eval(obj);
}

var ret = {
    thrower: thrower,
    isArray: es5.isArray,
    haveGetters: haveGetters,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    canEvaluate: canEvaluate,
    deprecated: deprecated,
    errorObj: errorObj,
    tryCatch1: tryCatch1,
    tryCatch2: tryCatch2,
    tryCatchApply: tryCatchApply,
    inherits: inherits,
    withAppended: withAppended,
    asString: asString,
    maybeWrapAsError: maybeWrapAsError,
    wrapsPrimitiveReceiver: wrapsPrimitiveReceiver,
    toFastProperties: toFastProperties
};

module.exports = ret;

},{"./es5.js":13,"./global.js":17}],40:[function(require,module,exports){
(function (process){
;(function (require, exports, module, platform) {

if (module) module.exports = minimatch
else exports.minimatch = minimatch

if (!require) {
  require = function (id) {
    switch (id) {
      case "sigmund": return function sigmund (obj) {
        return JSON.stringify(obj)
      }
      case "path": return { basename: function (f) {
        f = f.split(/[\/\\]/)
        var e = f.pop()
        if (!e) e = f.pop()
        return e
      }}
      case "lru-cache": return function LRUCache () {
        // not quite an LRU, but still space-limited.
        var cache = {}
        var cnt = 0
        this.set = function (k, v) {
          cnt ++
          if (cnt >= 100) cache = {}
          cache[k] = v
        }
        this.get = function (k) { return cache[k] }
      }
    }
  }
}

minimatch.Minimatch = Minimatch

var LRU = require("lru-cache")
  , cache = minimatch.cache = new LRU({max: 100})
  , GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
  , sigmund = require("sigmund")

var path = require("path")
  // any single thing other than /
  // don't need to escape / when using new RegExp()
  , qmark = "[^/]"

  // * => any number of characters
  , star = qmark + "*?"

  // ** when dots are allowed.  Anything goes, except .. and .
  // not (^ or / followed by one or two dots followed by $ or /),
  // followed by anything, any number of times.
  , twoStarDot = "(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?"

  // not a ^ or / followed by a dot,
  // followed by anything, any number of times.
  , twoStarNoDot = "(?:(?!(?:\\\/|^)\\.).)*?"

  // characters that need to be escaped in RegExp.
  , reSpecials = charSet("().*{}+?[]^$\\!")

// "abc" -> { a:true, b:true, c:true }
function charSet (s) {
  return s.split("").reduce(function (set, c) {
    set[c] = true
    return set
  }, {})
}

// normalizes slashes.
var slashSplit = /\/+/

minimatch.filter = filter
function filter (pattern, options) {
  options = options || {}
  return function (p, i, list) {
    return minimatch(p, pattern, options)
  }
}

function ext (a, b) {
  a = a || {}
  b = b || {}
  var t = {}
  Object.keys(b).forEach(function (k) {
    t[k] = b[k]
  })
  Object.keys(a).forEach(function (k) {
    t[k] = a[k]
  })
  return t
}

minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return minimatch

  var orig = minimatch

  var m = function minimatch (p, pattern, options) {
    return orig.minimatch(p, pattern, ext(def, options))
  }

  m.Minimatch = function Minimatch (pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options))
  }

  return m
}

Minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return Minimatch
  return minimatch.defaults(def).Minimatch
}


function minimatch (p, pattern, options) {
  if (typeof pattern !== "string") {
    throw new TypeError("glob pattern string required")
  }

  if (!options) options = {}

  // shortcut: comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === "#") {
    return false
  }

  // "" only matches ""
  if (pattern.trim() === "") return p === ""

  return new Minimatch(pattern, options).match(p)
}

function Minimatch (pattern, options) {
  if (!(this instanceof Minimatch)) {
    return new Minimatch(pattern, options, cache)
  }

  if (typeof pattern !== "string") {
    throw new TypeError("glob pattern string required")
  }

  if (!options) options = {}
  pattern = pattern.trim()

  // windows: need to use /, not \
  // On other platforms, \ is a valid (albeit bad) filename char.
  if (platform === "win32") {
    pattern = pattern.split("\\").join("/")
  }

  // lru storage.
  // these things aren't particularly big, but walking down the string
  // and turning it into a regexp can get pretty costly.
  var cacheKey = pattern + "\n" + sigmund(options)
  var cached = minimatch.cache.get(cacheKey)
  if (cached) return cached
  minimatch.cache.set(cacheKey, this)

  this.options = options
  this.set = []
  this.pattern = pattern
  this.regexp = null
  this.negate = false
  this.comment = false
  this.empty = false

  // make the set of regexps etc.
  this.make()
}

Minimatch.prototype.debug = function() {}

Minimatch.prototype.make = make
function make () {
  // don't do it more than once.
  if (this._made) return

  var pattern = this.pattern
  var options = this.options

  // empty patterns and comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === "#") {
    this.comment = true
    return
  }
  if (!pattern) {
    this.empty = true
    return
  }

  // step 1: figure out negation, etc.
  this.parseNegate()

  // step 2: expand braces
  var set = this.globSet = this.braceExpand()

  if (options.debug) this.debug = console.error

  this.debug(this.pattern, set)

  // step 3: now we have a set, so turn each one into a series of path-portion
  // matching patterns.
  // These will be regexps, except in the case of "**", which is
  // set to the GLOBSTAR object for globstar behavior,
  // and will not contain any / characters
  set = this.globParts = set.map(function (s) {
    return s.split(slashSplit)
  })

  this.debug(this.pattern, set)

  // glob --> regexps
  set = set.map(function (s, si, set) {
    return s.map(this.parse, this)
  }, this)

  this.debug(this.pattern, set)

  // filter out everything that didn't compile properly.
  set = set.filter(function (s) {
    return -1 === s.indexOf(false)
  })

  this.debug(this.pattern, set)

  this.set = set
}

Minimatch.prototype.parseNegate = parseNegate
function parseNegate () {
  var pattern = this.pattern
    , negate = false
    , options = this.options
    , negateOffset = 0

  if (options.nonegate) return

  for ( var i = 0, l = pattern.length
      ; i < l && pattern.charAt(i) === "!"
      ; i ++) {
    negate = !negate
    negateOffset ++
  }

  if (negateOffset) this.pattern = pattern.substr(negateOffset)
  this.negate = negate
}

// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
  return new Minimatch(pattern, options).braceExpand()
}

Minimatch.prototype.braceExpand = braceExpand
function braceExpand (pattern, options) {
  options = options || this.options
  pattern = typeof pattern === "undefined"
    ? this.pattern : pattern

  if (typeof pattern === "undefined") {
    throw new Error("undefined pattern")
  }

  if (options.nobrace ||
      !pattern.match(/\{.*\}/)) {
    // shortcut. no need to expand.
    return [pattern]
  }

  var escaping = false

  // examples and comments refer to this crazy pattern:
  // a{b,c{d,e},{f,g}h}x{y,z}
  // expected:
  // abxy
  // abxz
  // acdxy
  // acdxz
  // acexy
  // acexz
  // afhxy
  // afhxz
  // aghxy
  // aghxz

  // everything before the first \{ is just a prefix.
  // So, we pluck that off, and work with the rest,
  // and then prepend it to everything we find.
  if (pattern.charAt(0) !== "{") {
    this.debug(pattern)
    var prefix = null
    for (var i = 0, l = pattern.length; i < l; i ++) {
      var c = pattern.charAt(i)
      this.debug(i, c)
      if (c === "\\") {
        escaping = !escaping
      } else if (c === "{" && !escaping) {
        prefix = pattern.substr(0, i)
        break
      }
    }

    // actually no sets, all { were escaped.
    if (prefix === null) {
      this.debug("no sets")
      return [pattern]
    }

   var tail = braceExpand.call(this, pattern.substr(i), options)
    return tail.map(function (t) {
      return prefix + t
    })
  }

  // now we have something like:
  // {b,c{d,e},{f,g}h}x{y,z}
  // walk through the set, expanding each part, until
  // the set ends.  then, we'll expand the suffix.
  // If the set only has a single member, then'll put the {} back

  // first, handle numeric sets, since they're easier
  var numset = pattern.match(/^\{(-?[0-9]+)\.\.(-?[0-9]+)\}/)
  if (numset) {
    this.debug("numset", numset[1], numset[2])
    var suf = braceExpand.call(this, pattern.substr(numset[0].length), options)
      , start = +numset[1]
      , end = +numset[2]
      , inc = start > end ? -1 : 1
      , set = []
    for (var i = start; i != (end + inc); i += inc) {
      // append all the suffixes
      for (var ii = 0, ll = suf.length; ii < ll; ii ++) {
        set.push(i + suf[ii])
      }
    }
    return set
  }

  // ok, walk through the set
  // We hope, somewhat optimistically, that there
  // will be a } at the end.
  // If the closing brace isn't found, then the pattern is
  // interpreted as braceExpand("\\" + pattern) so that
  // the leading \{ will be interpreted literally.
  var i = 1 // skip the \{
    , depth = 1
    , set = []
    , member = ""
    , sawEnd = false
    , escaping = false

  function addMember () {
    set.push(member)
    member = ""
  }

  this.debug("Entering for")
  FOR: for (i = 1, l = pattern.length; i < l; i ++) {
    var c = pattern.charAt(i)
    this.debug("", i, c)

    if (escaping) {
      escaping = false
      member += "\\" + c
    } else {
      switch (c) {
        case "\\":
          escaping = true
          continue

        case "{":
          depth ++
          member += "{"
          continue

        case "}":
          depth --
          // if this closes the actual set, then we're done
          if (depth === 0) {
            addMember()
            // pluck off the close-brace
            i ++
            break FOR
          } else {
            member += c
            continue
          }

        case ",":
          if (depth === 1) {
            addMember()
          } else {
            member += c
          }
          continue

        default:
          member += c
          continue
      } // switch
    } // else
  } // for

  // now we've either finished the set, and the suffix is
  // pattern.substr(i), or we have *not* closed the set,
  // and need to escape the leading brace
  if (depth !== 0) {
    this.debug("didn't close", pattern)
    return braceExpand.call(this, "\\" + pattern, options)
  }

  // x{y,z} -> ["xy", "xz"]
  this.debug("set", set)
  this.debug("suffix", pattern.substr(i))
  var suf = braceExpand.call(this, pattern.substr(i), options)
  // ["b", "c{d,e}","{f,g}h"] ->
  //   [["b"], ["cd", "ce"], ["fh", "gh"]]
  var addBraces = set.length === 1
  this.debug("set pre-expanded", set)
  set = set.map(function (p) {
    return braceExpand.call(this, p, options)
  }, this)
  this.debug("set expanded", set)


  // [["b"], ["cd", "ce"], ["fh", "gh"]] ->
  //   ["b", "cd", "ce", "fh", "gh"]
  set = set.reduce(function (l, r) {
    return l.concat(r)
  })

  if (addBraces) {
    set = set.map(function (s) {
      return "{" + s + "}"
    })
  }

  // now attach the suffixes.
  var ret = []
  for (var i = 0, l = set.length; i < l; i ++) {
    for (var ii = 0, ll = suf.length; ii < ll; ii ++) {
      ret.push(set[i] + suf[ii])
    }
  }
  return ret
}

// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse
var SUBPARSE = {}
function parse (pattern, isSub) {
  var options = this.options

  // shortcuts
  if (!options.noglobstar && pattern === "**") return GLOBSTAR
  if (pattern === "") return ""

  var re = ""
    , hasMagic = !!options.nocase
    , escaping = false
    // ? => one single character
    , patternListStack = []
    , plType
    , stateChar
    , inClass = false
    , reClassStart = -1
    , classStart = -1
    // . and .. never match anything that doesn't start with .,
    // even when options.dot is set.
    , patternStart = pattern.charAt(0) === "." ? "" // anything
      // not (start or / followed by . or .. followed by / or end)
      : options.dot ? "(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))"
      : "(?!\\.)"
    , self = this

  function clearStateChar () {
    if (stateChar) {
      // we had some state-tracking character
      // that wasn't consumed by this pass.
      switch (stateChar) {
        case "*":
          re += star
          hasMagic = true
          break
        case "?":
          re += qmark
          hasMagic = true
          break
        default:
          re += "\\"+stateChar
          break
      }
      self.debug('clearStateChar %j %j', stateChar, re)
      stateChar = false
    }
  }

  for ( var i = 0, len = pattern.length, c
      ; (i < len) && (c = pattern.charAt(i))
      ; i ++ ) {

    this.debug("%s\t%s %s %j", pattern, i, re, c)

    // skip over any that are escaped.
    if (escaping && reSpecials[c]) {
      re += "\\" + c
      escaping = false
      continue
    }

    SWITCH: switch (c) {
      case "/":
        // completely not allowed, even escaped.
        // Should already be path-split by now.
        return false

      case "\\":
        clearStateChar()
        escaping = true
        continue

      // the various stateChar values
      // for the "extglob" stuff.
      case "?":
      case "*":
      case "+":
      case "@":
      case "!":
        this.debug("%s\t%s %s %j <-- stateChar", pattern, i, re, c)

        // all of those are literals inside a class, except that
        // the glob [!a] means [^a] in regexp
        if (inClass) {
          this.debug('  in class')
          if (c === "!" && i === classStart + 1) c = "^"
          re += c
          continue
        }

        // if we already have a stateChar, then it means
        // that there was something like ** or +? in there.
        // Handle the stateChar, then proceed with this one.
        self.debug('call clearStateChar %j', stateChar)
        clearStateChar()
        stateChar = c
        // if extglob is disabled, then +(asdf|foo) isn't a thing.
        // just clear the statechar *now*, rather than even diving into
        // the patternList stuff.
        if (options.noext) clearStateChar()
        continue

      case "(":
        if (inClass) {
          re += "("
          continue
        }

        if (!stateChar) {
          re += "\\("
          continue
        }

        plType = stateChar
        patternListStack.push({ type: plType
                              , start: i - 1
                              , reStart: re.length })
        // negation is (?:(?!js)[^/]*)
        re += stateChar === "!" ? "(?:(?!" : "(?:"
        this.debug('plType %j %j', stateChar, re)
        stateChar = false
        continue

      case ")":
        if (inClass || !patternListStack.length) {
          re += "\\)"
          continue
        }

        clearStateChar()
        hasMagic = true
        re += ")"
        plType = patternListStack.pop().type
        // negation is (?:(?!js)[^/]*)
        // The others are (?:<pattern>)<type>
        switch (plType) {
          case "!":
            re += "[^/]*?)"
            break
          case "?":
          case "+":
          case "*": re += plType
          case "@": break // the default anyway
        }
        continue

      case "|":
        if (inClass || !patternListStack.length || escaping) {
          re += "\\|"
          escaping = false
          continue
        }

        clearStateChar()
        re += "|"
        continue

      // these are mostly the same in regexp and glob
      case "[":
        // swallow any state-tracking char before the [
        clearStateChar()

        if (inClass) {
          re += "\\" + c
          continue
        }

        inClass = true
        classStart = i
        reClassStart = re.length
        re += c
        continue

      case "]":
        //  a right bracket shall lose its special
        //  meaning and represent itself in
        //  a bracket expression if it occurs
        //  first in the list.  -- POSIX.2 2.8.3.2
        if (i === classStart + 1 || !inClass) {
          re += "\\" + c
          escaping = false
          continue
        }

        // finish up the class.
        hasMagic = true
        inClass = false
        re += c
        continue

      default:
        // swallow any state char that wasn't consumed
        clearStateChar()

        if (escaping) {
          // no need
          escaping = false
        } else if (reSpecials[c]
                   && !(c === "^" && inClass)) {
          re += "\\"
        }

        re += c

    } // switch
  } // for


  // handle the case where we left a class open.
  // "[abc" is valid, equivalent to "\[abc"
  if (inClass) {
    // split where the last [ was, and escape it
    // this is a huge pita.  We now have to re-walk
    // the contents of the would-be class to re-translate
    // any characters that were passed through as-is
    var cs = pattern.substr(classStart + 1)
      , sp = this.parse(cs, SUBPARSE)
    re = re.substr(0, reClassStart) + "\\[" + sp[0]
    hasMagic = hasMagic || sp[1]
  }

  // handle the case where we had a +( thing at the *end*
  // of the pattern.
  // each pattern list stack adds 3 chars, and we need to go through
  // and escape any | chars that were passed through as-is for the regexp.
  // Go through and escape them, taking care not to double-escape any
  // | chars that were already escaped.
  var pl
  while (pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + 3)
    // maybe some even number of \, then maybe 1 \, followed by a |
    tail = tail.replace(/((?:\\{2})*)(\\?)\|/g, function (_, $1, $2) {
      if (!$2) {
        // the | isn't already escaped, so escape it.
        $2 = "\\"
      }

      // need to escape all those slashes *again*, without escaping the
      // one that we need for escaping the | character.  As it works out,
      // escaping an even number of slashes can be done by simply repeating
      // it exactly after itself.  That's why this trick works.
      //
      // I am sorry that you have to see this.
      return $1 + $1 + $2 + "|"
    })

    this.debug("tail=%j\n   %s", tail, tail)
    var t = pl.type === "*" ? star
          : pl.type === "?" ? qmark
          : "\\" + pl.type

    hasMagic = true
    re = re.slice(0, pl.reStart)
       + t + "\\("
       + tail
  }

  // handle trailing things that only matter at the very end.
  clearStateChar()
  if (escaping) {
    // trailing \\
    re += "\\\\"
  }

  // only need to apply the nodot start if the re starts with
  // something that could conceivably capture a dot
  var addPatternStart = false
  switch (re.charAt(0)) {
    case ".":
    case "[":
    case "(": addPatternStart = true
  }

  // if the re is not "" at this point, then we need to make sure
  // it doesn't match against an empty path part.
  // Otherwise a/* will match a/, which it should not.
  if (re !== "" && hasMagic) re = "(?=.)" + re

  if (addPatternStart) re = patternStart + re

  // parsing just a piece of a larger pattern.
  if (isSub === SUBPARSE) {
    return [ re, hasMagic ]
  }

  // skip the regexp for non-magical patterns
  // unescape anything in it, though, so that it'll be
  // an exact match against a file etc.
  if (!hasMagic) {
    return globUnescape(pattern)
  }

  var flags = options.nocase ? "i" : ""
    , regExp = new RegExp("^" + re + "$", flags)

  regExp._glob = pattern
  regExp._src = re

  return regExp
}

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe()
}

Minimatch.prototype.makeRe = makeRe
function makeRe () {
  if (this.regexp || this.regexp === false) return this.regexp

  // at this point, this.set is a 2d array of partial
  // pattern strings, or "**".
  //
  // It's better to use .match().  This function shouldn't
  // be used, really, but it's pretty convenient sometimes,
  // when you just want to work with a regex.
  var set = this.set

  if (!set.length) return this.regexp = false
  var options = this.options

  var twoStar = options.noglobstar ? star
      : options.dot ? twoStarDot
      : twoStarNoDot
    , flags = options.nocase ? "i" : ""

  var re = set.map(function (pattern) {
    return pattern.map(function (p) {
      return (p === GLOBSTAR) ? twoStar
           : (typeof p === "string") ? regExpEscape(p)
           : p._src
    }).join("\\\/")
  }).join("|")

  // must match entire pattern
  // ending in a * or ** will make it less strict.
  re = "^(?:" + re + ")$"

  // can match anything, as long as it's not this.
  if (this.negate) re = "^(?!" + re + ").*$"

  try {
    return this.regexp = new RegExp(re, flags)
  } catch (ex) {
    return this.regexp = false
  }
}

minimatch.match = function (list, pattern, options) {
  var mm = new Minimatch(pattern, options)
  list = list.filter(function (f) {
    return mm.match(f)
  })
  if (options.nonull && !list.length) {
    list.push(pattern)
  }
  return list
}

Minimatch.prototype.match = match
function match (f, partial) {
  this.debug("match", f, this.pattern)
  // short-circuit in the case of busted things.
  // comments, etc.
  if (this.comment) return false
  if (this.empty) return f === ""

  if (f === "/" && partial) return true

  var options = this.options

  // windows: need to use /, not \
  // On other platforms, \ is a valid (albeit bad) filename char.
  if (platform === "win32") {
    f = f.split("\\").join("/")
  }

  // treat the test path as a set of pathparts.
  f = f.split(slashSplit)
  this.debug(this.pattern, "split", f)

  // just ONE of the pattern sets in this.set needs to match
  // in order for it to be valid.  If negating, then just one
  // match means that we have failed.
  // Either way, return on the first hit.

  var set = this.set
  this.debug(this.pattern, "set", set)

  var splitFile = path.basename(f.join("/")).split("/")

  for (var i = 0, l = set.length; i < l; i ++) {
    var pattern = set[i], file = f
    if (options.matchBase && pattern.length === 1) {
      file = splitFile
    }
    var hit = this.matchOne(file, pattern, partial)
    if (hit) {
      if (options.flipNegate) return true
      return !this.negate
    }
  }

  // didn't get any hits.  this is success if it's a negative
  // pattern, failure otherwise.
  if (options.flipNegate) return false
  return this.negate
}

// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
  var options = this.options

  this.debug("matchOne",
              { "this": this
              , file: file
              , pattern: pattern })

  this.debug("matchOne", file.length, pattern.length)

  for ( var fi = 0
          , pi = 0
          , fl = file.length
          , pl = pattern.length
      ; (fi < fl) && (pi < pl)
      ; fi ++, pi ++ ) {

    this.debug("matchOne loop")
    var p = pattern[pi]
      , f = file[fi]

    this.debug(pattern, p, f)

    // should be impossible.
    // some invalid regexp stuff in the set.
    if (p === false) return false

    if (p === GLOBSTAR) {
      this.debug('GLOBSTAR', [pattern, p, f])

      // "**"
      // a/**/b/**/c would match the following:
      // a/b/x/y/z/c
      // a/x/y/z/b/c
      // a/b/x/b/x/c
      // a/b/c
      // To do this, take the rest of the pattern after
      // the **, and see if it would match the file remainder.
      // If so, return success.
      // If not, the ** "swallows" a segment, and try again.
      // This is recursively awful.
      //
      // a/**/b/**/c matching a/b/x/y/z/c
      // - a matches a
      // - doublestar
      //   - matchOne(b/x/y/z/c, b/**/c)
      //     - b matches b
      //     - doublestar
      //       - matchOne(x/y/z/c, c) -> no
      //       - matchOne(y/z/c, c) -> no
      //       - matchOne(z/c, c) -> no
      //       - matchOne(c, c) yes, hit
      var fr = fi
        , pr = pi + 1
      if (pr === pl) {
        this.debug('** at the end')
        // a ** at the end will just swallow the rest.
        // We have found a match.
        // however, it will not swallow /.x, unless
        // options.dot is set.
        // . and .. are *never* matched by **, for explosively
        // exponential reasons.
        for ( ; fi < fl; fi ++) {
          if (file[fi] === "." || file[fi] === ".." ||
              (!options.dot && file[fi].charAt(0) === ".")) return false
        }
        return true
      }

      // ok, let's see if we can swallow whatever we can.
      WHILE: while (fr < fl) {
        var swallowee = file[fr]

        this.debug('\nglobstar while',
                    file, fr, pattern, pr, swallowee)

        // XXX remove this slice.  Just pass the start index.
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug('globstar found match!', fr, fl, swallowee)
          // found a match.
          return true
        } else {
          // can't swallow "." or ".." ever.
          // can only swallow ".foo" when explicitly asked.
          if (swallowee === "." || swallowee === ".." ||
              (!options.dot && swallowee.charAt(0) === ".")) {
            this.debug("dot detected!", file, fr, pattern, pr)
            break WHILE
          }

          // ** swallows a segment, and continue.
          this.debug('globstar swallow a segment, and continue')
          fr ++
        }
      }
      // no match was found.
      // However, in partial mode, we can't say this is necessarily over.
      // If there's more *pattern* left, then 
      if (partial) {
        // ran out of file
        this.debug("\n>>> no match, partial?", file, fr, pattern, pr)
        if (fr === fl) return true
      }
      return false
    }

    // something other than **
    // non-magic patterns just have to match exactly
    // patterns with magic have been turned into regexps.
    var hit
    if (typeof p === "string") {
      if (options.nocase) {
        hit = f.toLowerCase() === p.toLowerCase()
      } else {
        hit = f === p
      }
      this.debug("string match", p, f, hit)
    } else {
      hit = f.match(p)
      this.debug("pattern match", p, f, hit)
    }

    if (!hit) return false
  }

  // Note: ending in / means that we'll get a final ""
  // at the end of the pattern.  This can only match a
  // corresponding "" at the end of the file.
  // If the file ends in /, then it can only match a
  // a pattern that ends in /, unless the pattern just
  // doesn't have any more for it. But, a/b/ should *not*
  // match "a/b/*", even though "" matches against the
  // [^/]*? pattern, except in partial mode, where it might
  // simply not be reached yet.
  // However, a/b/ should still satisfy a/*

  // now either we fell off the end of the pattern, or we're done.
  if (fi === fl && pi === pl) {
    // ran out of pattern and filename at the same time.
    // an exact hit!
    return true
  } else if (fi === fl) {
    // ran out of file, but still had pattern left.
    // this is ok if we're doing the match as part of
    // a glob fs traversal.
    return partial
  } else if (pi === pl) {
    // ran out of pattern, still have file left.
    // this is only acceptable if we're on the very last
    // empty segment of a file with a trailing slash.
    // a/* should match a/b/
    var emptyFileEnd = (fi === fl - 1) && (file[fi] === "")
    return emptyFileEnd
  }

  // should be unreachable.
  throw new Error("wtf?")
}


// replace stuff like \* with *
function globUnescape (s) {
  return s.replace(/\\(.)/g, "$1")
}


function regExpEscape (s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
}

})( typeof require === "function" ? require : null,
    this,
    typeof module === "object" ? module : null,
    typeof process === "object" ? process.platform : "win32"
  )

}).call(this,require("tWU75n"))
},{"lru-cache":41,"path":1,"sigmund":42,"tWU75n":2}],41:[function(require,module,exports){
;(function () { // closure for web browsers

if (typeof module === 'object' && module.exports) {
  module.exports = LRUCache
} else {
  // just set the global for non-node platforms.
  this.LRUCache = LRUCache
}

function hOP (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function naiveLength () { return 1 }

function LRUCache (options) {
  if (!(this instanceof LRUCache))
    return new LRUCache(options)

  if (typeof options === 'number')
    options = { max: options }

  if (!options)
    options = {}

  this._max = options.max
  // Kind of weird to have a default max of Infinity, but oh well.
  if (!this._max || !(typeof this._max === "number") || this._max <= 0 )
    this._max = Infinity

  this._lengthCalculator = options.length || naiveLength
  if (typeof this._lengthCalculator !== "function")
    this._lengthCalculator = naiveLength

  this._allowStale = options.stale || false
  this._maxAge = options.maxAge || null
  this._dispose = options.dispose
  this.reset()
}

// resize the cache when the max changes.
Object.defineProperty(LRUCache.prototype, "max",
  { set : function (mL) {
      if (!mL || !(typeof mL === "number") || mL <= 0 ) mL = Infinity
      this._max = mL
      if (this._length > this._max) trim(this)
    }
  , get : function () { return this._max }
  , enumerable : true
  })

// resize the cache when the lengthCalculator changes.
Object.defineProperty(LRUCache.prototype, "lengthCalculator",
  { set : function (lC) {
      if (typeof lC !== "function") {
        this._lengthCalculator = naiveLength
        this._length = this._itemCount
        for (var key in this._cache) {
          this._cache[key].length = 1
        }
      } else {
        this._lengthCalculator = lC
        this._length = 0
        for (var key in this._cache) {
          this._cache[key].length = this._lengthCalculator(this._cache[key].value)
          this._length += this._cache[key].length
        }
      }

      if (this._length > this._max) trim(this)
    }
  , get : function () { return this._lengthCalculator }
  , enumerable : true
  })

Object.defineProperty(LRUCache.prototype, "length",
  { get : function () { return this._length }
  , enumerable : true
  })


Object.defineProperty(LRUCache.prototype, "itemCount",
  { get : function () { return this._itemCount }
  , enumerable : true
  })

LRUCache.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this
  var i = 0;
  for (var k = this._mru - 1; k >= 0 && i < this._itemCount; k--) if (this._lruList[k]) {
    i++
    var hit = this._lruList[k]
    if (this._maxAge && (Date.now() - hit.now > this._maxAge)) {
      del(this, hit)
      if (!this._allowStale) hit = undefined
    }
    if (hit) {
      fn.call(thisp, hit.value, hit.key, this)
    }
  }
}

LRUCache.prototype.keys = function () {
  var keys = new Array(this._itemCount)
  var i = 0
  for (var k = this._mru - 1; k >= 0 && i < this._itemCount; k--) if (this._lruList[k]) {
    var hit = this._lruList[k]
    keys[i++] = hit.key
  }
  return keys
}

LRUCache.prototype.values = function () {
  var values = new Array(this._itemCount)
  var i = 0
  for (var k = this._mru - 1; k >= 0 && i < this._itemCount; k--) if (this._lruList[k]) {
    var hit = this._lruList[k]
    values[i++] = hit.value
  }
  return values
}

LRUCache.prototype.reset = function () {
  if (this._dispose && this._cache) {
    for (var k in this._cache) {
      this._dispose(k, this._cache[k].value)
    }
  }

  this._cache = Object.create(null) // hash of items by key
  this._lruList = Object.create(null) // list of items in order of use recency
  this._mru = 0 // most recently used
  this._lru = 0 // least recently used
  this._length = 0 // number of items in the list
  this._itemCount = 0
}

// Provided for debugging/dev purposes only. No promises whatsoever that
// this API stays stable.
LRUCache.prototype.dump = function () {
  return this._cache
}

LRUCache.prototype.dumpLru = function () {
  return this._lruList
}

LRUCache.prototype.set = function (key, value) {
  if (hOP(this._cache, key)) {
    // dispose of the old one before overwriting
    if (this._dispose) this._dispose(key, this._cache[key].value)
    if (this._maxAge) this._cache[key].now = Date.now()
    this._cache[key].value = value
    this.get(key)
    return true
  }

  var len = this._lengthCalculator(value)
  var age = this._maxAge ? Date.now() : 0
  var hit = new Entry(key, value, this._mru++, len, age)

  // oversized objects fall out of cache automatically.
  if (hit.length > this._max) {
    if (this._dispose) this._dispose(key, value)
    return false
  }

  this._length += hit.length
  this._lruList[hit.lu] = this._cache[key] = hit
  this._itemCount ++

  if (this._length > this._max) trim(this)
  return true
}

LRUCache.prototype.has = function (key) {
  if (!hOP(this._cache, key)) return false
  var hit = this._cache[key]
  if (this._maxAge && (Date.now() - hit.now > this._maxAge)) {
    return false
  }
  return true
}

LRUCache.prototype.get = function (key) {
  return get(this, key, true)
}

LRUCache.prototype.peek = function (key) {
  return get(this, key, false)
}

LRUCache.prototype.pop = function () {
  var hit = this._lruList[this._lru]
  del(this, hit)
  return hit || null
}

LRUCache.prototype.del = function (key) {
  del(this, this._cache[key])
}

function get (self, key, doUse) {
  var hit = self._cache[key]
  if (hit) {
    if (self._maxAge && (Date.now() - hit.now > self._maxAge)) {
      del(self, hit)
      if (!self._allowStale) hit = undefined
    } else {
      if (doUse) use(self, hit)
    }
    if (hit) hit = hit.value
  }
  return hit
}

function use (self, hit) {
  shiftLU(self, hit)
  hit.lu = self._mru ++
  self._lruList[hit.lu] = hit
}

function trim (self) {
  while (self._lru < self._mru && self._length > self._max)
    del(self, self._lruList[self._lru])
}

function shiftLU (self, hit) {
  delete self._lruList[ hit.lu ]
  while (self._lru < self._mru && !self._lruList[self._lru]) self._lru ++
}

function del (self, hit) {
  if (hit) {
    if (self._dispose) self._dispose(hit.key, hit.value)
    self._length -= hit.length
    self._itemCount --
    delete self._cache[ hit.key ]
    shiftLU(self, hit)
  }
}

// classy, since V8 prefers predictable objects.
function Entry (key, value, lu, length, now) {
  this.key = key
  this.value = value
  this.lu = lu
  this.length = length
  this.now = now
}

})()

},{}],42:[function(require,module,exports){
module.exports = sigmund
function sigmund (subject, maxSessions) {
    maxSessions = maxSessions || 10;
    var notes = [];
    var analysis = '';
    var RE = RegExp;

    function psychoAnalyze (subject, session) {
        if (session > maxSessions) return;

        if (typeof subject === 'function' ||
            typeof subject === 'undefined') {
            return;
        }

        if (typeof subject !== 'object' || !subject ||
            (subject instanceof RE)) {
            analysis += subject;
            return;
        }

        if (notes.indexOf(subject) !== -1 || session === maxSessions) return;

        notes.push(subject);
        analysis += '{';
        Object.keys(subject).forEach(function (issue, _, __) {
            // pseudo-private values.  skip those.
            if (issue.charAt(0) === '_') return;
            var to = typeof subject[issue];
            if (to === 'function' || to === 'undefined') return;
            analysis += issue;
            psychoAnalyze(subject[issue], session + 1);
        });
    }
    psychoAnalyze(subject, 0);
    return analysis;
}

// vim: set softtabstop=4 shiftwidth=4:

},{}],43:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
//--------------------------------------------------------------------------
//
//  StringSet
//
//--------------------------------------------------------------------------
/**
* Set that only accept string as value
*/
var StringSet = (function () {
    /**
    * constructor
    * @param array an array of string that will be added to the set
    */
    function StringSet(array) {
        this.map = Object.create(null);
        if (array) {
            for (var i = 0, l = array.length; i < l; i++) {
                this.add(array[i]);
            }
        }
    }
    /**
    * add a value to the set
    * @param value
    */
    StringSet.prototype.add = function (value) {
        this.map[value] = true;
    };

    /**
    * remove a value from the set
    * @param value
    */
    StringSet.prototype.remove = function (value) {
        delete this.map[value];
    };

    /**
    * return true if the set contains the given value
    * @param value
    */
    StringSet.prototype.has = function (value) {
        return !!this.map[value];
    };

    Object.defineProperty(StringSet.prototype, "values", {
        /**
        * return an array containing the values of the set
        */
        get: function () {
            return Object.keys(this.map);
        },
        enumerable: true,
        configurable: true
    });
    return StringSet;
})();
exports.StringSet = StringSet;

;

/**
* Map that only accept string as key
*/
var StringMap = (function () {
    /**
    * constructor
    * @param obj initial values to set in the map each properties
    *  of the object will be treaded as a pair key/value
    */
    function StringMap(obj) {
        var _this = this;
        this.map = Object.create(null);
        this.mascot = {};
        if (obj) {
            Object.keys(obj).forEach(function (key) {
                return _this.map[key] = obj[key];
            });
        }
    }
    /**
    * set a value in the map
    * @param key the key
    * @param value the value
    */
    StringMap.prototype.set = function (key, value) {
        this.map[key] = (typeof value === 'undefined' ? this.mascot : value);
    };

    /**
    * retrive a value associated to the given key
    * @param key the key to retrieve the value associated with
    */
    StringMap.prototype.get = function (key) {
        var value = this.map[key];
        return value === this.mascot ? undefined : value;
    };

    /**
    * delete an entry corresponding to the given key
    * @param key
    */
    StringMap.prototype.delete = function (key) {
        return delete this.map[key];
    };

    /**
    * return true if the map contains the given key
    * @param key
    */
    StringMap.prototype.has = function (key) {
        return typeof this.map[key] !== 'undefined';
    };

    /**
    * clear the map
    */
    StringMap.prototype.clear = function () {
        this.map = Object.create(null);
    };

    Object.defineProperty(StringMap.prototype, "keys", {
        /**
        * return an array containing the keys of the map
        */
        get: function () {
            return Object.keys(this.map);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(StringMap.prototype, "values", {
        /**
        * return an array containing the values of the map
        */
        get: function () {
            var _this = this;
            return Object.keys(this.map).map(function (key) {
                return _this.map[key];
            });
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(StringMap.prototype, "entries", {
        /**
        * return an array containing the entries of the map
        */
        get: function () {
            var _this = this;
            return Object.keys(this.map).map(function (key) {
                return {
                    key: key,
                    value: _this.map[key]
                };
            });
        },
        enumerable: true,
        configurable: true
    });

    /**
    * return an object representation
    */
    StringMap.prototype.toObject = function () {
        var _this = this;
        return Object.keys(this.map).reduce(function (obj, key) {
            obj[key] = _this.map[key];
            return obj;
        }, {});
    };

    /**
    * return a clone of the map
    */
    StringMap.prototype.clone = function () {
        return new StringMap(this.toObject());
    };
    return StringMap;
})();
exports.StringMap = StringMap;

},{}],44:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
/**
* An Enum representing the different kind of hint
*/
(function (CompletionKind) {
    /**
    * the completion entry correspond to a class name
    */
    CompletionKind[CompletionKind["CLASS"] = 0] = "CLASS";

    /**
    * the completion entry correspond to an interface name
    */
    CompletionKind[CompletionKind["INTERFACE"] = 1] = "INTERFACE";

    /**
    * the completion entry correspond to an enum name
    */
    CompletionKind[CompletionKind["ENUM"] = 2] = "ENUM";

    /**
    * the completion entry correspond to a module name
    */
    CompletionKind[CompletionKind["MODULE"] = 3] = "MODULE";

    /**
    * the completion entry correspond to a variable name
    */
    CompletionKind[CompletionKind["VARIABLE"] = 4] = "VARIABLE";

    /**
    * the completion entry correspond to a mehtod name
    */
    CompletionKind[CompletionKind["METHOD"] = 5] = "METHOD";

    /**
    * the completion entry correspond to a function
    */
    CompletionKind[CompletionKind["FUNCTION"] = 6] = "FUNCTION";

    /**
    * the completion entry correspond to a keyword
    */
    CompletionKind[CompletionKind["KEYWORD"] = 7] = "KEYWORD";

    /**
    * Any other type
    */
    CompletionKind[CompletionKind["DEFAULT"] = 8] = "DEFAULT";
})(exports.CompletionKind || (exports.CompletionKind = {}));
var CompletionKind = exports.CompletionKind;




},{}],45:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

//--------------------------------------------------------------------------
//
//  Change record
//
//--------------------------------------------------------------------------
/**
* enum representing the kind change possible in the fileSysem
*/
(function (FileChangeKind) {
    /**
    * a file has been added
    */
    FileChangeKind[FileChangeKind["ADD"] = 0] = "ADD";

    /**
    * a file has been updated
    */
    FileChangeKind[FileChangeKind["UPDATE"] = 1] = "UPDATE";

    /**
    * a file has been deleted
    */
    FileChangeKind[FileChangeKind["DELETE"] = 2] = "DELETE";

    /**
    * the project files has been reset
    */
    FileChangeKind[FileChangeKind["RESET"] = 3] = "RESET";
})(exports.FileChangeKind || (exports.FileChangeKind = {}));
var FileChangeKind = exports.FileChangeKind;


},{}],46:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
//--------------------------------------------------------------------------
//
//  Logger
//
//--------------------------------------------------------------------------
/**
* hold the configured log level
*/
var currentLogLevel = 1 /* error */;

/**
* return true if the logging level is superior or equal to information
*/
function information() {
    return currentLogLevel >= 4 /* information */;
}
exports.information = information;

/**
* return true if the logging level is superior or equal to debug
*/
function debug() {
    return currentLogLevel >= 3 /* debug */;
}
exports.debug = debug;

/**
* return true if the logging level is superior or equal to warning
*/
function warning() {
    return currentLogLevel >= 2 /* warning */;
}
exports.warning = warning;

/**
* return true if the logging level is superior or equal to error
*/
function error() {
    return currentLogLevel >= 1 /* error */;
}
exports.error = error;

/**
* return true if the logging level is superior or equal to fatal
*/
function fatal() {
    return currentLogLevel >= 0 /* fatal */;
}
exports.fatal = fatal;

/**
* log the given string
*/
function log(s) {
    console.log(s);
}
exports.log = log;

/**
* Logging level
*/
(function (Level) {
    Level[Level["fatal"] = 0] = "fatal";
    Level[Level["error"] = 1] = "error";
    Level[Level["warning"] = 2] = "warning";
    Level[Level["debug"] = 3] = "debug";
    Level[Level["information"] = 4] = "information";
})(exports.Level || (exports.Level = {}));
var Level = exports.Level;

/**
* set the current log level, accepted level are :
*  'information',
*  'debug',
*  'warning',
*  'error',
*  'fatal'
*/
function setLogLevel(level) {
    currentLogLevel = Level[level];
}
exports.setLogLevel = setLogLevel;

/**
* base class reusing the logger for typescript
*/
var LogingClass = (function () {
    function LogingClass() {
        this.information = exports.information;
        this.debug = exports.debug;
        this.warning = exports.warning;
        this.error = exports.error;
        this.fatal = exports.fatal;
        this.log = exports.log;
    }
    return LogingClass;
})();
exports.LogingClass = LogingClass;

},{}],47:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
var Promise = require('bluebird');

/**
* A simple Promise Queue
*/
var PromiseQueue = (function () {
    function PromiseQueue() {
        var _this = this;
        /**
        * true if the queue has been initialized
        */
        this.initialized = false;
        this.promise = new Promise(function (resolve) {
            _this.initializer = resolve;
        });
    }
    /**
    * initialize the queue subsequent call reset the queue
    *
    * @param val the value passed as initialial result
    */
    PromiseQueue.prototype.init = function (val) {
        if (this.initialized) {
            this.promise = Promise.cast(val);
        } else {
            this.initialized = true;
            this.initializer(val);
            return this.promise;
        }
    };

    /**
    * enqueue an action
    */
    PromiseQueue.prototype.then = function (action) {
        return this.promise = this.promise.then(function () {
            return action();
        }, function () {
            return action();
        });
    };
    return PromiseQueue;
})();

module.exports = PromiseQueue;

},{"bluebird":5}],48:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';

var Signal = (function () {
    function Signal() {
        /**
        * list of listeners that have been suscribed to this signal
        */
        this.listeners = [];
        /**
        * Priorities corresponding to the listeners
        */
        this.priorities = [];
    }
    /**
    * Subscribes a listener for the signal.
    *
    * @params listener the callback to call when events are dispatched
    * @params priority an optional priority for this signal
    */
    Signal.prototype.add = function (listener, priority) {
        if (typeof priority === "undefined") { priority = 0; }
        var index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.priorities[index] = priority;
            return;
        }
        for (var i = 0, l = this.priorities.length; i < l; i++) {
            if (this.priorities[i] < priority) {
                this.priorities.splice(i, 0, priority);
                this.listeners.splice(i, 0, listener);
                return;
            }
        }
        this.priorities.push(priority);
        this.listeners.push(listener);
    };

    /**
    * unsubscribe a listener for the signal
    *
    * @params listener the previously subscribed listener
    */
    Signal.prototype.remove = function (listener) {
        var index = this.listeners.indexOf(listener);
        if (index >= 0) {
            this.priorities.splice(index, 1);
            this.listeners.splice(index, 1);
        }
    };

    /**
    * dispatch an event
    *
    * @params parameter the parameter attached to the event dispatching
    */
    Signal.prototype.dispatch = function (parameter) {
        var hasBeenCanceled = this.listeners.every(function (listener) {
            var result = listener(parameter);
            return result !== false;
        });

        return hasBeenCanceled;
    };

    /**
    * Remove all listener from the signal
    */
    Signal.prototype.clear = function () {
        this.listeners = [];
        this.priorities = [];
    };

    /**
    * @return true if the listener has been subsribed to this signal
    */
    Signal.prototype.hasListeners = function () {
        return this.listeners.length > 0;
    };
    return Signal;
})();
exports.Signal = Signal;

},{}],49:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
/**
* helper function that valid a config file
* @param config the config object to validate
*/
function validateTypeScriptProjectConfig(config) {
    if (!config) {
        return false;
    }
    if (config.target && ['es3', 'es5'].indexOf(config.target.toLowerCase()) === -1) {
        return false;
    }
    if (config.module && ['none', 'amd', 'commonjs'].indexOf(config.module.toLowerCase()) === -1) {
        return false;
    }
    if (config.sourceRoot && typeof config.sourceRoot !== 'string') {
        return false;
    }
    if (!config.sources || !Array.isArray(config.sources) || !config.sources.every(function (pattern) {
        return typeof pattern === 'string';
    })) {
        return false;
    }

    return true;
}
exports.validateTypeScriptProjectConfig = validateTypeScriptProjectConfig;

/**
* Default configuration for typescript project
*/
exports.typeScriptProjectConfigDefault = {
    noLib: false,
    target: 'es3',
    module: 'none',
    noImplicitAny: false
};

},{}],50:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
var path = require('path');

/**
* assign all properties of a list of object to an object
* @param target the object that will receive properties
* @param items items which properties will be assigned to a target
*/
function assign(target) {
    var items = [];
    for (var _i = 0; _i < (arguments.length - 1); _i++) {
        items[_i] = arguments[_i + 1];
    }
    return items.reduce(function (target, source) {
        return Object.keys(source).reduce(function (target, key) {
            target[key] = source[key];
            return target;
        }, target);
    }, target);
}
exports.assign = assign;

/**
* clone an object (shallow)
* @param target the object to clone
*/
function clone(target) {
    return exports.assign(Array.isArray(target) ? [] : {}, target);
}
exports.clone = clone;

/**
* clone an object (deep)
*
* @param target the object to clone
*/
function deepClone(target) {
    return Object.keys(target).reduce(function (result, key) {
        var value = target[key];
        if (typeof value === 'object') {
            value = exports.deepClone(value);
        }
        result[key] = value;
        return result;
    }, Array.isArray(target) ? [] : {});
}
exports.deepClone = deepClone;

/**
* retrieve all enumerable properties of an object in the prototype chain
*
* @param target the object to which we will retrieve properties
*/
function getEnumerablePropertyNames(target) {
    var result = [];
    for (var key in target) {
        result.push(key);
    }
    return result;
}
exports.getEnumerablePropertyNames = getEnumerablePropertyNames;

/**
* merge multiple array in one
*
* @param array an array of array to be flattened
*/
function mergeAll(array) {
    var results = [];
    array.forEach(function (subArray) {
        Array.prototype.push.apply(results, subArray);
    });

    return results;
}
exports.mergeAll = mergeAll;
;

/**
* browserify path.resolve is buggy on windows
*/
function pathResolve(from, to) {
    var result = path.resolve(from, to);
    var index = result.indexOf(from[0]);
    return result.slice(index);
}
exports.pathResolve = pathResolve;

},{"path":1}],51:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
//--------------------------------------------------------------------------
//
//  WorkerBridge
//
//--------------------------------------------------------------------------
var utils = require('./utils');
var collections = require('./collections');
var signal = require('./signal');
var Promise = require('bluebird');

/**
* list of operations that can be requested
*/
var Operation;
(function (Operation) {
    Operation[Operation["REQUEST"] = 0] = "REQUEST";
    Operation[Operation["RESPONSE"] = 1] = "RESPONSE";
    Operation[Operation["ERROR"] = 2] = "ERROR";
    Operation[Operation["EXPOSE"] = 3] = "EXPOSE";
    Operation[Operation["SIGNAL"] = 4] = "SIGNAL";
})(Operation || (Operation = {}));

/**
* type of function exposed
*/
var Type;
(function (Type) {
    Type[Type["FUNCTION"] = 0] = "FUNCTION";
    Type[Type["SIGNAL"] = 1] = "SIGNAL";
})(Type || (Type = {}));

/**
* create a descriptor for a map of exposed services
*
* @param services
* @param observables
* @param baseKeys
*/
function createProxyDescriptor(services, signals, baseKeys) {
    if (typeof baseKeys === "undefined") { baseKeys = []; }
    if (baseKeys.length > 5) {
        return {};
    }
    return utils.getEnumerablePropertyNames(services).reduce(function (descriptor, key) {
        var value = services[key], keys = baseKeys.concat(key);
        if (typeof value === 'function') {
            descriptor[key] = 0 /* FUNCTION */;
        } else if (typeof value === 'object') {
            if (value instanceof signal.Signal) {
                descriptor[key] = 1 /* SIGNAL */;
                signals[keys.join('.')] = value;
            } else if (!Array.isArray(value)) {
                descriptor[key] = createProxyDescriptor(value, signals, keys);
            }
        }
        return descriptor;
    }, {});
}

var uidHelper = 0;

/**
* create a query factory for a proxied service method
*/
function newQuery(chain, sendMessage, resolverMap) {
    return function () {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            args[_i] = arguments[_i + 0];
        }
        var uid = 'operation' + (uidHelper++);
        sendMessage({
            operation: 0 /* REQUEST */,
            chain: chain,
            args: args,
            uid: uid
        });
        return new Promise(function (resolve, reject) {
            resolverMap.set(uid, {
                resolve: resolve,
                reject: reject
            });
        });
    };
}

/**
* create proxy from proxy descriptor
*/
function createProxy(descriptor, sendMessage, resolverMap, baseKeys) {
    if (typeof baseKeys === "undefined") { baseKeys = []; }
    return Object.keys(descriptor).reduce(function (proxy, key) {
        var value = descriptor[key], keys = baseKeys.concat(key);
        if (value === 0 /* FUNCTION */) {
            proxy[key] = newQuery(keys, sendMessage, resolverMap);
        } else if (value === 1 /* SIGNAL */) {
            proxy[key] = new signal.Signal();
        } else if (typeof value === 'object') {
            proxy[key] = createProxy(descriptor[key], sendMessage, resolverMap, keys);
        }
        return proxy;
    }, {});
}

/**
* a simple bridge that will expose services from the 2 sides of a web worker
*/
var WorkerBridge = (function () {
    function WorkerBridge(/**
    * target
    */
    target) {
        var _this = this;
        this.target = target;
        /**
        * stack of deferred bound to a requres
        */
        this.resolverMap = new collections.StringMap();
        /**
        * message handler
        */
        this.messageHandler = function (message) {
            var data = message.data;
            switch (data.operation) {
                case 3 /* EXPOSE */:
                    _this.proxy = createProxy(data.descriptor, function (args) {
                        return _this.target.postMessage(args);
                    }, _this.resolverMap);

                    _this.initResolver.resolve(_this.proxy);
                    break;

                case 0 /* REQUEST */:
                    new Promise(function (resolve) {
                        var chain = data.chain.slice(), thisObject = null, method = _this.services;
                        while (chain.length) {
                            thisObject = method;
                            method = method[chain.shift()];
                        }
                        resolve(method.apply(thisObject, data.args));
                    }).then(function (result) {
                        _this.target.postMessage({
                            operation: 1 /* RESPONSE */,
                            chain: data.chain,
                            result: result,
                            uid: data.uid
                        });
                    }, function (error) {
                        _this.target.postMessage({
                            operation: 2 /* ERROR */,
                            chain: data.chain,
                            errorMessage: error instanceof Error ? error.message : error,
                            uid: data.uid
                        });
                    });

                    break;

                case 1 /* RESPONSE */:
                    var responseDeferred = _this.resolverMap.get(data.uid);
                    responseDeferred.resolve(data.result);
                    _this.resolverMap.delete(data.uid);
                    break;

                case 2 /* ERROR */:
                    var errorDeferred = _this.resolverMap.get(data.uid);
                    errorDeferred.reject(new Error(data.errorMessage));
                    _this.resolverMap.delete(data.uid);
                    break;

                default:
                    var chain = data.chain.slice(), signal = _this.proxy;
                    while (chain.length) {
                        signal = signal[chain.shift()];
                    }
                    signal.dispatch(data.value);
            }
        };
    }
    /**
    * initialize te bridge, return a promise that resolve to the created proxy
    * @param services the exposed services
    */
    WorkerBridge.prototype.init = function (services) {
        var _this = this;
        this.services = services;
        return new Promise(function (resolve, reject) {
            var target = _this.target;
            target.onmessage = _this.messageHandler;

            var signals = {};
            target.postMessage({
                operation: 3 /* EXPOSE */,
                descriptor: createProxyDescriptor(services, signals)
            });

            _this.signals = Object.keys(signals).map(function (key) {
                var signal = signals[key];
                var handler = function (value) {
                    target.postMessage({
                        operation: 4 /* SIGNAL */,
                        chain: key.split('.'),
                        value: value
                    });
                };
                signal.add(handler);
                return {
                    signal: signal,
                    handler: handler
                };
            });

            _this.initResolver = { resolve: resolve, reject: reject };
        });
    };

    /**
    * dispose the bridge
    */
    WorkerBridge.prototype.dispose = function () {
        this.signals.forEach(function (signalDesc) {
            return signalDesc.signal.remove(signalDesc.handler);
        });
        this.target.onmessage = null;
    };
    return WorkerBridge;
})();

module.exports = WorkerBridge;

},{"./collections":43,"./signal":48,"./utils":50,"bluebird":5}],52:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';


/**
* enum listing the change kind that occur in a working set
*/
(function (WorkingSetChangeKind) {
    WorkingSetChangeKind[WorkingSetChangeKind["ADD"] = 0] = "ADD";
    WorkingSetChangeKind[WorkingSetChangeKind["REMOVE"] = 1] = "REMOVE";
})(exports.WorkingSetChangeKind || (exports.WorkingSetChangeKind = {}));
var WorkingSetChangeKind = exports.WorkingSetChangeKind;



},{}],53:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
var completion = require('../commons/completion');
var logger = require('../commons/logger');

var ScriptElementKind = ts.ScriptElementKind;

/**
* implementation of the ICompletionService
*/
var CompletionService = (function () {
    /**
    * @param projectManager the Project manager used by the service to retrieve project
    */
    function CompletionService(projectManager) {
        this.projectManager = projectManager;
    }
    /**
    * Retrieve completion proposal at a given point in a given file
    * @param fileName the absolute path of the file
    * @param position in the file where you want to retrieve completion proposal
    *
    * @return a promise resolving to a list of proposals
    */
    CompletionService.prototype.getCompletionAtPosition = function (fileName, position) {
        var _this = this;
        return this.projectManager.getProjectForFile(fileName).then(function (project) {
            var documentRegistry = project.getDocumentRegistry(), languageService = project.getLanguageService(), languageServiceHost = project.getLanguageServiceHost(), index = languageServiceHost.getIndexFromPos(fileName, position), completionInfo = languageService.getCompletionsAtPosition(fileName, index, true), typeScriptEntries = completionInfo && completionInfo.entries;

            if (!typeScriptEntries) {
                return { entries: [], match: '' };
            }

            var sourceUnit = documentRegistry.acquireDocument(fileName, languageServiceHost.getCompilationSettings(), languageServiceHost.getScriptSnapshot(fileName), languageServiceHost.getScriptVersion(fileName), languageServiceHost.getScriptIsOpen(fileName), project.getReferencedOrImportedFiles(fileName)).getSourceUnit(), currentToken = TypeScript.Syntax.findTokenOnLeft(sourceUnit, index), match;

            if (currentToken && _this.isValidTokenKind(currentToken.kind())) {
                match = currentToken.fullText();
                if (currentToken.leadingTrivia()) {
                    match = match.substr(currentToken.leadingTriviaWidth());
                }

                if (currentToken.trailingTrivia()) {
                    match = match.substr(0, match.length - currentToken.trailingTriviaWidth());
                }

                typeScriptEntries = typeScriptEntries.filter(function (entry) {
                    return entry.name && entry.name.toLowerCase().indexOf(match.toLowerCase()) === 0;
                });
            }

            typeScriptEntries.sort(function (entry1, entry2) {
                var match1 = entry1 ? entry1.name.indexOf(match) : -1, match2 = entry2 ? entry2.name.indexOf(match) : -1;
                if (match1 === 0 && match2 !== 0) {
                    return -1;
                } else if (match2 === 0 && match1 !== 0) {
                    return 1;
                } else {
                    var name1 = entry1 && entry1.name.toLowerCase(), name2 = entry2 && entry2.name.toLowerCase();

                    if (name1 < name2) {
                        return -1;
                    } else if (name1 > name2) {
                        return 1;
                    } else {
                        return 0;
                    }
                }
            });

            var completionEntries = typeScriptEntries.map(function (typeScriptEntry) {
                var entryInfo = languageService.getCompletionEntryDetails(fileName, index, typeScriptEntry.name), completionEntry = {
                    name: typeScriptEntry.name,
                    kind: 8 /* DEFAULT */,
                    type: entryInfo && entryInfo.type,
                    doc: entryInfo && entryInfo.docComment
                };

                switch (typeScriptEntry.kind) {
                    case ScriptElementKind.unknown:
                    case ScriptElementKind.primitiveType:
                    case ScriptElementKind.scriptElement:
                        break;
                    case ScriptElementKind.keyword:
                        completionEntry.kind = 7 /* KEYWORD */;
                        break;

                    case ScriptElementKind.classElement:
                        completionEntry.kind = 0 /* CLASS */;
                        break;
                    case ScriptElementKind.interfaceElement:
                        completionEntry.kind = 1 /* INTERFACE */;
                        break;
                    case ScriptElementKind.enumElement:
                        completionEntry.kind = 2 /* ENUM */;
                        break;
                    case ScriptElementKind.moduleElement:
                        completionEntry.kind = 3 /* MODULE */;
                        break;

                    case ScriptElementKind.memberVariableElement:
                    case ScriptElementKind.variableElement:
                    case ScriptElementKind.localVariableElement:
                    case ScriptElementKind.parameterElement:
                        completionEntry.kind = 4 /* VARIABLE */;
                        break;

                    case ScriptElementKind.memberFunctionElement:
                    case ScriptElementKind.functionElement:
                    case ScriptElementKind.localFunctionElement:
                        completionEntry.kind = 6 /* FUNCTION */;
                        break;

                    case ScriptElementKind.typeParameterElement:
                    case ScriptElementKind.constructorImplementationElement:
                    case ScriptElementKind.constructSignatureElement:
                    case ScriptElementKind.callSignatureElement:
                    case ScriptElementKind.indexSignatureElement:
                    case ScriptElementKind.memberGetAccessorElement:
                    case ScriptElementKind.memberSetAccessorElement:
                        if (logger.information()) {
                            logger.log('un handled ScriptElementKind in completion list: ' + typeScriptEntry.kind);
                        }
                        break;
                }

                return completionEntry;
            });

            return {
                entries: completionEntries,
                match: match
            };
        }).catch(function () {
            return ({
                entries: [],
                match: ''
            });
        });
    };

    /**
    * helper method return true if the token correspond to an 'completable' token
    */
    CompletionService.prototype.isValidTokenKind = function (tokenKind) {
        return tokenKind === 11 /* IdentifierName */ || (tokenKind >= 15 /* BreakKeyword */ && tokenKind < 70 /* OpenBraceToken */);
    };
    return CompletionService;
})();

module.exports = CompletionService;

},{"../commons/completion":44,"../commons/logger":46}],54:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
/**
* implementation of the IDefinitionService
*/
var DefinitionService = (function () {
    /**
    * @param projectManager the Project manager used by the service to retrieve project
    */
    function DefinitionService(projectManager) {
        this.projectManager = projectManager;
    }
    /**
    * retrieve definition info of a symbol at a given position in a given file
    * @param fileName the absolute path of the file
    * @param position in the file where you want to retrieve definition info
    *
    * @return a promise resolving to a list of definition info
    */
    DefinitionService.prototype.getDefinitionForFile = function (fileName, position) {
        return this.projectManager.getProjectForFile(fileName).then(function (project) {
            var languageService = project.getLanguageService(), languageServiceHost = project.getLanguageServiceHost(), index = languageServiceHost.getIndexFromPos(fileName, position);
            if (index < 0) {
                return [];
            }
            return languageService.getDefinitionAtPosition(fileName, index).map(function (definition) {
                var startPos = languageServiceHost.indexToPosition(definition.fileName, definition.minChar), endPos = languageServiceHost.indexToPosition(definition.fileName, definition.limChar);
                return {
                    name: (definition.containerName ? (definition.containerName + '.') : '') + definition.name,
                    lineStart: startPos.line,
                    charStart: startPos.ch,
                    lineEnd: endPos.line,
                    charEnd: endPos.ch,
                    fileName: definition.fileName
                };
            });
        }).catch(function () {
            return [];
        });
    };
    return DefinitionService;
})();

module.exports = DefinitionService;

},{}],55:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
/**
* brackets Error message type
*/
var Type = {
    /** Unambiguous error, such as a syntax error */
    ERROR: 'problem_type_error',
    /** Maintainability issue, probable error / bad smell, etc. */
    WARNING: 'problem_type_warning',
    /** Inspector unable to continue, code too complex for static analysis, etc. Not counted in error/warning tally. */
    META: 'problem_type_meta'
};

/**
* implementation of the IErrorService
*/
var ErrorService = (function () {
    /**
    * @param projectManager the Project manager used by the service to retrieve project
    */
    function ErrorService(projectManager) {
        this.projectManager = projectManager;
    }
    /**
    * Retrieve a list of errors for a given file
    * @param fileName the absolute path of the file
    *
    * @return a promise resolving to a list of errors
    */
    ErrorService.prototype.getErrorsForFile = function (fileName) {
        var _this = this;
        return this.projectManager.getProjectForFile(fileName).then(function (project) {
            var languageService = project.getLanguageService(), syntacticDiagnostics = languageService.getSyntacticDiagnostics(fileName), errors = _this.diagnosticToError(project.getLanguageServiceHost(), syntacticDiagnostics);

            if (errors.length === 0) {
                var semanticDiagnostic = languageService.getSemanticDiagnostics(fileName);
                errors = _this.diagnosticToError(project.getLanguageServiceHost(), semanticDiagnostic);
            }

            return {
                errors: errors,
                aborted: false
            };
        }).catch(function () {
            return {
                errors: [],
                aborted: false
            };
        });
    };

    /**
    * convert TypeScript Diagnostic to brackets error format
    * @param diagnostics
    */
    ErrorService.prototype.diagnosticToError = function (languageServiceHost, diagnostics) {
        if (!diagnostics) {
            return [];
        }
        return diagnostics.map(function (diagnostic) {
            var type;

            switch (diagnostic.category) {
                case 1 /* Error */:
                    type = Type.ERROR;
                    break;
                case 0 /* Warning */:
                    type = Type.WARNING;
                    break;
                case 3 /* NoPrefix */:
                    type = Type.ERROR;
                    break;
                case 2 /* Message */:
                    type = Type.META;
                    break;
            }

            return {
                pos: languageServiceHost.indexToPosition(diagnostic.file.filename, diagnostic.start),
                endpos: languageServiceHost.indexToPosition(diagnostic.file.filename, diagnostic.start + diagnostic.length),
                message: diagnostic.messageText,
                type: type
            };
        });
    };
    return ErrorService;
})();

module.exports = ErrorService;

},{}],56:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
var FormattingService = (function () {
    /**
    * @param projectManager the Project manager used by the service to retrieve project
    */
    function FormattingService(projectManager) {
        this.projectManager = projectManager;
    }
    /**
    * Retrieve formating information for a givent file
    * @param fileName the absolute path of the file
    * @param options formation options
    * @param startPos an option start position for the formating range
    * @param endPos an optional end position for the formating range
    *
    * @return a promise resolving to a formating range info
    */
    FormattingService.prototype.getFormatingForFile = function (fileName, options, startPos, endPos) {
        return this.projectManager.getProjectForFile(fileName).then(function (project) {
            var languageServiceHost = project.getLanguageServiceHost(), languageService = project.getLanguageService(), minChar, limChar;

            if (!startPos || !endPos) {
                minChar = 0;
                limChar = project.getLanguageServiceHost().getScriptContent(fileName).length - 1;
            } else {
                minChar = languageServiceHost.getIndexFromPos(fileName, startPos);
                limChar = languageServiceHost.getIndexFromPos(fileName, endPos);
            }

            var result = languageService.getFormattingEditsForRange(fileName, minChar, limChar, options);

            return result && result.reverse();
        });
    };
    return FormattingService;
})();

module.exports = FormattingService;

},{}],57:[function(require,module,exports){
(function (global){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
// inject global in the worker
importScripts('../../third_party/typescript/typescriptServices.js');
global.window = self;

var TypeScriptProjectManager = require('./projectManager');
var TypeScriptProject = require('./project');
var ErrorService = require('./errorService');
var DefinitionService = require('./definitionService');
var CompletionService = require('./completionService');
var FormattingService = require('./formattingService');
var LexicalStructureService = require('./lexicalStructureService');
var WorkerBridge = require('../commons/workerBridge');
var logger = require('../commons/logger');

//instantiate the different service
var projectManager = new TypeScriptProjectManager(), errorService = new ErrorService(projectManager), completionService = new CompletionService(projectManager), definitionService = new DefinitionService(projectManager), lexicalStructureService = new LexicalStructureService(projectManager), formattingService = new FormattingService(projectManager), bridge = new WorkerBridge(self);

//expose the worker services
bridge.init({
    errorService: errorService,
    completionService: completionService,
    definitionService: definitionService,
    lexicalStructureService: lexicalStructureService,
    formattingService: formattingService
}).then(function (proxy) {
    //inject main services into worker components
    proxy.getTypeScriptLocation().then(function (location) {
        proxy.getLogLevel().then(function (logLevel) {
            self.console = proxy.console;
            logger.setLogLevel(logLevel);
            projectManager.init(location, proxy.preferencesManager, proxy.fileSystem, proxy.workingSet, TypeScriptProject.newProject).then(function () {
                if (logger.information()) {
                    logger.log('TSWorker : initilialization complete');
                }
            });
        });
    });
});

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../commons/logger":46,"../commons/workerBridge":51,"./completionService":53,"./definitionService":54,"./errorService":55,"./formattingService":56,"./lexicalStructureService":59,"./project":60,"./projectManager":61}],58:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var logger = require('../commons/logger');
var collections = require('../commons/collections');
var path = require('path');
var utils = require('../commons/utils');

var cancellationToken = {
    isCancellationRequested: function () {
        return false;
    }
};

/**
* ILanguage Service host implementation
*/
var LanguageServiceHost = (function (_super) {
    __extends(LanguageServiceHost, _super);
    function LanguageServiceHost() {
        _super.apply(this, arguments);
        /**
        * a map associating file absolute path to ScriptInfo
        */
        this.fileNameToScript = new collections.StringMap();
    }
    /**
    * add a script to the host
    *
    * @param fileName the absolute path of the file
    * @param content the file content
    */
    LanguageServiceHost.prototype.addScript = function (fileName, content) {
        var script = new ScriptInfo(fileName, content);
        this.fileNameToScript.set(fileName, script);
    };

    /**
    * remove a script from the host
    *
    * @param fileName the absolute path of the file
    */
    LanguageServiceHost.prototype.removeScript = function (fileName) {
        this.fileNameToScript.delete(fileName);
    };

    /**
    * remove all script from the host
    *
    * @param fileName the absolute path of the file
    */
    LanguageServiceHost.prototype.removeAll = function () {
        this.fileNameToScript.clear();
    };

    /**
    * update a script
    *
    * @param fileName the absolute path of the file
    * @param content the new file content
    */
    LanguageServiceHost.prototype.updateScript = function (fileName, content) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            script.updateContent(content);
            return;
        }
        throw new Error('No script with name \'' + fileName + '\'');
    };

    /**
    * edit a script
    *
    * @param fileName the absolute path of the file
    * @param minChar the index in the file content where the edition begins
    * @param limChar the index  in the file content where the edition ends
    * @param newText the text inserted
    */
    LanguageServiceHost.prototype.editScript = function (fileName, minChar, limChar, newText) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            script.editContent(minChar, limChar, newText);
            return;
        }

        throw new Error('No script with name \'' + fileName + '\'');
    };

    /**
    * set 'open' status of a script
    *
    * @param fileName the absolute path of the file
    * @param isOpen open status
    */
    LanguageServiceHost.prototype.setScriptIsOpen = function (fileName, isOpen) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            script.isOpen = isOpen;
            return;
        }

        throw new Error('No script with name \'' + fileName + '\'');
    };

    /**
    * the the language service host compilation settings
    *
    * @param the settings to be applied to the host
    */
    LanguageServiceHost.prototype.setCompilationSettings = function (settings) {
        this.compilationSettings = Object.freeze(utils.clone(settings));
    };

    /**
    * retrieve the content of a given script
    *
    * @param fileName the absolute path of the file
    */
    LanguageServiceHost.prototype.getScriptContent = function (fileName) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.content;
        }
        return null;
    };

    /**
    * return an index from a positon in line/char
    *
    * @param path the path of the file
    * @param position the position
    */
    LanguageServiceHost.prototype.getIndexFromPos = function (fileName, position) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.getPositionFromLine(position.line, position.ch);
        }
        return -1;
    };

    /**
    * return a positon in line/char from an index
    * @param path the path of the file
    * @param index the index
    */
    LanguageServiceHost.prototype.indexToPosition = function (fileName, index) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            var tsPosition = script.getLineAndColForPositon(index);
            return {
                ch: tsPosition.character,
                line: tsPosition.line
            };
        }
        return null;
    };

    //////////////////////////////////////////////////////////////////////
    // ILanguageServiceShimHost implementation
    //
    LanguageServiceHost.prototype.getCompilationSettings = function () {
        return this.compilationSettings;
    };

    LanguageServiceHost.prototype.getScriptFileNames = function () {
        return this.fileNameToScript.keys;
    };

    LanguageServiceHost.prototype.getScriptSnapshot = function (fileName) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return new ScriptSnapshot(script);
        }
        return null;
    };

    LanguageServiceHost.prototype.getScriptVersion = function (fileName) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.version;
        }
        return 0;
    };

    LanguageServiceHost.prototype.getScriptIsOpen = function (fileName) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.isOpen;
        }
        return false;
    };

    LanguageServiceHost.prototype.getLocalizedDiagnosticMessages = function () {
        return '';
    };

    LanguageServiceHost.prototype.fileExists = function (s) {
        return this.fileNameToScript.has(s);
    };

    LanguageServiceHost.prototype.directoryExists = function (s) {
        return true;
    };

    LanguageServiceHost.prototype.resolveRelativePath = function (fileName, directory) {
        return utils.pathResolve(directory, fileName);
    };

    LanguageServiceHost.prototype.getParentDirectory = function (fileName) {
        return path.dirname(fileName);
    };

    LanguageServiceHost.prototype.getCancellationToken = function () {
        return cancellationToken;
    };
    return LanguageServiceHost;
})(logger.LogingClass);

/**
* Manage a script in the language service host
*/
var ScriptInfo = (function () {
    /**
    * @param fileName the absolute path of the file
    * @param content the content of the file
    * @param isOpen the open status of the script
    */
    function ScriptInfo(fileName, content, isOpen) {
        if (typeof isOpen === "undefined") { isOpen = false; }
        this.version = 1;
        this.editRanges = [];
        this.lineMap = null;
        this.fileName = fileName;
        this.content = content;
        this.isOpen = isOpen;
        this.setContent(content);
    }
    /**
    * update the content of the script
    *
    * @param newContent the new script content
    */
    ScriptInfo.prototype.updateContent = function (newContent) {
        this.setContent(newContent);
        this.editRanges = [];
        this.version++;
    };

    /**
    * edit the script content
    *
    * @param minChar the index in the file content where the edition begins
    * @param limChar the index  in the file content where the edition ends
    * @param newText the text inserted
    */
    ScriptInfo.prototype.editContent = function (minChar, limChar, newText) {
        // Apply edits
        var prefix = this.content.substring(0, minChar);
        var middle = newText;
        var suffix = this.content.substring(limChar);
        this.setContent(prefix + middle + suffix);

        // Store edit range + new length of script
        this.editRanges.push(new TypeScript.TextChangeRange(TypeScript.TextSpan.fromBounds(minChar, limChar), newText.length));

        // Update version #
        this.version++;
    };

    /**
    * return an index position from line an character position
    *
    * @param line line number
    * @param character charecter poisiton in the line
    */
    ScriptInfo.prototype.getPositionFromLine = function (line, character) {
        return this.lineMap.getPosition(line, character);
    };

    /**
    * return line and chararacter position from index position
    *
    * @param position
    */
    ScriptInfo.prototype.getLineAndColForPositon = function (position) {
        var lineAndChar = { line: -1, character: -1 };
        this.lineMap.fillLineAndCharacterFromPosition(position, lineAndChar);
        return lineAndChar;
    };

    /**
    * set the script content
    */
    ScriptInfo.prototype.setContent = function (content) {
        this.content = content;
        this.lineMap = TypeScript.LineMap1.fromString(content);
    };
    return ScriptInfo;
})();

/**
* ScriptSnapshot implementation
* Simply a proxy over ScriptInfo
*/
var ScriptSnapshot = (function () {
    function ScriptSnapshot(scriptInfo) {
        this.lineMap = null;
        this.scriptInfo = scriptInfo;
        this.textSnapshot = scriptInfo.content;
        this.version = scriptInfo.version;
        this.editRanges = scriptInfo.editRanges.slice(0);
    }
    ScriptSnapshot.prototype.getText = function (start, end) {
        return this.textSnapshot.substring(start, end);
    };

    ScriptSnapshot.prototype.getLength = function () {
        return this.textSnapshot.length;
    };

    ScriptSnapshot.prototype.getLineStartPositions = function () {
        if (this.lineMap === null) {
            this.lineMap = TypeScript.LineMap1.fromString(this.textSnapshot);
        }
        return this.lineMap.lineStarts();
    };

    ScriptSnapshot.prototype.getTextChangeRangeSinceVersion = function (scriptVersion) {
        if (scriptVersion === this.version) {
            // No edits!
            return TypeScript.TextChangeRange.unchanged;
        }
        var initialEditRangeIndex = this.editRanges.length - (this.version - scriptVersion);

        if (initialEditRangeIndex < 0) {
            return null;
        }

        var entries = this.editRanges.slice(initialEditRangeIndex);
        return TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(entries);
    };
    return ScriptSnapshot;
})();

module.exports = LanguageServiceHost;

},{"../commons/collections":43,"../commons/logger":46,"../commons/utils":50,"path":1}],59:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
/**
* ILexical structure implementation
*/
var LexicalStructureService = (function () {
    /**
    * @param projectManager the Project manager used by the service to retrieve project
    */
    function LexicalStructureService(projectManager) {
        this.projectManager = projectManager;
    }
    /**
    * retrieve Lexical structure for a given file
    *
    * @param fileName absolute path of the file
    *
    * @return a Promise that resolve to a list of LexicalStructureItem
    */
    LexicalStructureService.prototype.getLexicalStructureForFile = function (fileName) {
        return this.projectManager.getProjectForFile(fileName).then(function (project) {
            var languageServiceHost = project.getLanguageServiceHost();
            var items = project.getLanguageService().getScriptLexicalStructure(fileName) || [];
            return items.map(function (item) {
                return ({
                    name: item.name,
                    containerName: item.containerName,
                    position: languageServiceHost.indexToPosition(fileName, item.minChar)
                });
            });
        });
    };
    return LexicalStructureService;
})();

module.exports = LexicalStructureService;

},{}],60:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
var path = require('path');
var minimatch = require('minimatch');
var Promise = require('bluebird');
var PromiseQueue = require('../commons/promiseQueue');
var Services = TypeScript.Services;

var collections = require('../commons/collections');
var fs = require('../commons/fileSystem');
var ws = require('../commons/workingSet');
var logger = require('../commons/logger');

var utils = require('../commons/utils');

var LanguageServiceHost = require('./languageServiceHost');

//--------------------------------------------------------------------------
//
//  TypeScriptProject
//
//--------------------------------------------------------------------------
/**
* class representing a typescript project, responsible of synchronizing
* languageServiceHost with the file system
*/
var TypeScriptProject = (function () {
    //-------------------------------
    //  constructor
    //-------------------------------
    /**
    * @param baseDirectory the baseDirectory of the project
    * @param config the project config file
    * @param fileSystem the fileSystem wrapper used by the project
    * @param workingSet the working set wrapper used by the project
    * @param defaultLibLocation the location of the default compiler 'lib.d.ts' file
    */
    function TypeScriptProject(baseDirectory, config, fileSystem, workingSet, defaultLibLocation) {
        var _this = this;
        this.baseDirectory = baseDirectory;
        this.config = config;
        this.fileSystem = fileSystem;
        this.workingSet = workingSet;
        this.defaultLibLocation = defaultLibLocation;
        /**
        * a promise queue used to run in sequence file based operation
        */
        this.queue = new PromiseQueue();
        //-------------------------------
        //  Events Handler
        //-------------------------------
        /**
        * handle changes in the fileSystem
        */
        this.filesChangeHandler = function (changeRecords) {
            _this.queue.then(function () {
                changeRecords.forEach(function (record) {
                    switch (record.kind) {
                        case 0 /* ADD */:
                            if (_this.isProjectSourceFile(record.fileName) || _this.references.has(record.fileName)) {
                                _this.addFile(record.fileName);
                            }
                            break;
                        case 2 /* DELETE */:
                            if (_this.projectFilesSet.has(record.fileName)) {
                                _this.removeFile(record.fileName);
                            }
                            break;
                        case 1 /* UPDATE */:
                            if (_this.projectFilesSet.has(record.fileName)) {
                                _this.updateFile(record.fileName);
                            }
                            break;
                    }
                });
            });
        };
        /**
        * handle changes in the workingSet
        */
        this.workingSetChangedHandler = function (changeRecord) {
            _this.queue.then(function () {
                switch (changeRecord.kind) {
                    case 0 /* ADD */:
                        changeRecord.paths.forEach(function (fileName) {
                            if (_this.projectFilesSet.has(fileName)) {
                                _this.languageServiceHost.setScriptIsOpen(fileName, true);
                            }
                        });
                        break;
                    case 1 /* REMOVE */:
                        changeRecord.paths.forEach(function (fileName) {
                            if (_this.projectFilesSet.has(fileName)) {
                                _this.languageServiceHost.setScriptIsOpen(fileName, false);
                                _this.updateFile(fileName);
                            }
                        });
                        break;
                }
            });
        };
        /**
        * handle document edition
        */
        this.documentEditedHandler = function (record) {
            _this.queue.then(function () {
                if (_this.projectFilesSet.has(record.path)) {
                    var mustUpdate = false, oldPaths = new collections.StringSet(_this.getReferencedOrImportedFiles(record.path)), lastChange;
                    record.changeList.some(function (change) {
                        lastChange = change;
                        if (!change.from || !change.to) {
                            mustUpdate = true;
                        } else {
                            var minChar = _this.languageServiceHost.getIndexFromPos(record.path, change.from), limChar = _this.languageServiceHost.getIndexFromPos(record.path, change.to);

                            _this.languageServiceHost.editScript(record.path, minChar, limChar, change.text);
                        }
                        return mustUpdate;
                    });
                    if (mustUpdate || _this.languageServiceHost.getScriptContent(record.path) !== record.documentText) {
                        if (logger.warning()) {
                            if (mustUpdate) {
                                logger.log('TypeScriptProject: inconsistent change descriptor: ' + JSON.stringify(lastChange));
                            } else {
                                logger.log('TypeScriptProject: text different before and after change');
                            }
                        }
                        _this.languageServiceHost.updateScript(record.path, record.documentText);
                    }

                    _this.updateReferences(record.path, oldPaths);
                }
            });
        };
    }
    //-------------------------------
    //  public methods
    //-------------------------------
    /**
    * Initialize the project an his component
    */
    TypeScriptProject.prototype.init = function () {
        var _this = this;
        this.projectFilesSet = new collections.StringSet();
        this.references = new collections.StringMap();
        this.workingSet.workingSetChanged.add(this.workingSetChangedHandler);
        this.workingSet.documentEdited.add(this.documentEditedHandler);
        this.fileSystem.projectFilesChanged.add(this.filesChangeHandler);

        return this.queue.init(this.getTypeScriptInfosForPath(this.config.typescriptPath).then(function (typeScriptInfo) {
            _this.libLocation = typeScriptInfo.libLocation;
            _this.coreService = typeScriptInfo.factory.createCoreServicesShim(new logger.LogingClass());
            _this.languageServiceHost = new LanguageServiceHost();
            _this.languageServiceHost.setCompilationSettings(_this.createCompilationSettings());
            _this.documentRegistry = ts.createDocumentRegistry();
            _this.languageService = ts.createLanguageService(_this.languageServiceHost, _this.documentRegistry);

            return _this.collectFiles();
        }).then(function () {
            _this.updateWorkingSet();
        }));
    };

    /**
    * update a project with a new config
    */
    TypeScriptProject.prototype.update = function (config) {
        var _this = this;
        if (this.config.typescriptPath !== config.typescriptPath) {
            return this.init();
        }

        if (!this.config.noLib && config.noLib) {
            this.removeFile(this.libLocation);
        }

        var pojectSources = this.projectFilesSet.values.filter(function (fileName) {
            return _this.isProjectSourceFile(fileName);
        });
        this.config = config;
        return this.queue.then(function () {
            _this.languageServiceHost.setCompilationSettings(_this.createCompilationSettings());
            var promises = [];
            pojectSources.forEach(function (fileName) {
                if (!_this.isProjectSourceFile(fileName)) {
                    _this.removeFile(fileName);
                }
            });

            return Promise.all(promises).then(function () {
                return _this.collectFiles();
            }).then(function () {
                return _this.updateWorkingSet();
            });
        });
    };

    /**
    * dispose the project
    */
    TypeScriptProject.prototype.dispose = function () {
        this.workingSet.workingSetChanged.remove(this.workingSetChangedHandler);
        this.workingSet.documentEdited.remove(this.documentEditedHandler);
        this.fileSystem.projectFilesChanged.remove(this.filesChangeHandler);
    };

    //-------------------------------
    //  exposed services
    //-------------------------------
    TypeScriptProject.prototype.getDocumentRegistry = function () {
        return this.documentRegistry;
    };

    /**
    * return the language service host of the project
    */
    TypeScriptProject.prototype.getLanguageServiceHost = function () {
        return this.languageServiceHost;
    };

    /**
    * return the core service used by the project
    */
    TypeScriptProject.prototype.getCoreService = function () {
        return this.coreService;
    };

    /**
    * return the languageService used by the project
    */
    TypeScriptProject.prototype.getLanguageService = function () {
        return this.languageService;
    };

    //-------------------------------
    //  exposed files informations
    //-------------------------------
    /**
    * return the set of files contained in the project
    */
    TypeScriptProject.prototype.getProjectFilesSet = function () {
        return new collections.StringSet(this.projectFilesSet.values);
    };

    /**
    * for a given path, give the relation between the project an the associated file
    * @param path
    */
    TypeScriptProject.prototype.getProjectFileKind = function (fileName) {
        if (this.projectFilesSet.has(fileName)) {
            return this.isProjectSourceFile(fileName) ? 1 /* SOURCE */ : 2 /* REFERENCE */;
        } else {
            return 0 /* NONE */;
        }
    };

    //-------------------------------
    //  private methods
    //-------------------------------
    /**
    * Retrieve a ServiceFactory from a given typeScriptService file path
    * @param typescriptPath
    */
    TypeScriptProject.prototype.getTypeScriptInfosForPath = function (typescriptPath) {
        var _this = this;
        if (!typescriptPath) {
            return Promise.cast({
                factory: new Services.TypeScriptServicesFactory(),
                libLocation: this.defaultLibLocation
            });
        } else {
            var typescriptServicesFile = path.join(typescriptPath, 'typescriptServices.js');

            return this.fileSystem.readFile(typescriptServicesFile).then(function (code) {
                var func = new Function('var TypeScript;' + code + ';return TypeScript;'), typeScript = func();

                return {
                    factory: new typeScript.Services.TypeScriptServicesFactory(),
                    libLocation: path.join(typescriptPath, 'lib.d.ts')
                };
            }).catch(function () {
                if (logger.error()) {
                    logger.log('could not retrieve typescript compiler at path: ' + typescriptPath);
                }
                return {
                    factory: new Services.TypeScriptServicesFactory(),
                    libLocation: _this.defaultLibLocation
                };
            });
        }
    };

    /**
    * create Typescript compilation settings from config file
    */
    TypeScriptProject.prototype.createCompilationSettings = function () {
        var compilationSettings = {}, moduleType = this.config.module.toLowerCase();

        compilationSettings.noLib = this.config.noLib;
        compilationSettings.noImplicitAny = this.config.noImplicitAny;
        compilationSettings.sourceRoot = this.config.sourceRoot;

        compilationSettings.target = this.config.target.toLowerCase() === 'es3' ? 0 /* ES3 */ : 1 /* ES5 */;

        compilationSettings.module = moduleType === 'none' ? 0 /* None */ : moduleType === 'amd' ? 2 /* AMD */ : 1 /* CommonJS */;

        return compilationSettings;
    };

    /**
    * update the languageService host script 'open' status
    * according to file in the working set
    */
    TypeScriptProject.prototype.updateWorkingSet = function () {
        var _this = this;
        this.workingSet.getFiles().then(function (files) {
            return files.forEach(function (fileName) {
                if (_this.projectFilesSet.has(fileName)) {
                    _this.languageServiceHost.setScriptIsOpen(fileName, true);
                }
            });
        });
    };

    //-------------------------------
    //  Project Files Management
    //-------------------------------
    /**
    * retrieve files content for path match described in the config
    */
    TypeScriptProject.prototype.collectFiles = function () {
        var _this = this;
        return this.fileSystem.getProjectFiles().then(function (files) {
            var promises = [];
            files.forEach(function (fileName) {
                if (_this.isProjectSourceFile(fileName) && !_this.projectFilesSet.has(fileName)) {
                    console.log(fileName);
                    promises.push(_this.addFile(fileName, false));
                }
            });

            if (!_this.config.noLib && !_this.projectFilesSet.has(_this.libLocation)) {
                promises.push(_this.addFile(_this.libLocation));
            }

            return Promise.all(promises);
        });
    };

    /**
    * return true a if a given file path match the config
    * @param path
    */
    TypeScriptProject.prototype.isProjectSourceFile = function (fileName) {
        var relativeFileName = path.relative(this.baseDirectory, fileName);
        return this.config.sources.some(function (pattern) {
            return minimatch(relativeFileName, pattern) || minimatch(fileName, pattern);
        });
    };

    /**
    * add a file to the project and all file that this file reference
    * @param path
    */
    TypeScriptProject.prototype.addFile = function (fileName, notify) {
        var _this = this;
        if (typeof notify === "undefined") { notify = true; }
        if (!this.projectFilesSet.has(fileName)) {
            this.projectFilesSet.add(fileName);
            return this.fileSystem.readFile(fileName).then(function (content) {
                var promises = [];
                _this.languageServiceHost.addScript(fileName, content);
                _this.getReferencedOrImportedFiles(fileName).forEach(function (referencedFile) {
                    promises.push(_this.addFile(referencedFile));
                    _this.addReference(fileName, referencedFile);
                });
                return Promise.all(promises);
            }, function () {
                _this.projectFilesSet.remove(fileName);
            });
        }
        return null;
    };

    /**
    * remove a file from the project
    * @param path
    */
    TypeScriptProject.prototype.removeFile = function (fileName) {
        var _this = this;
        if (this.projectFilesSet.has(fileName)) {
            this.getReferencedOrImportedFiles(fileName).forEach(function (referencedPath) {
                _this.removeReference(fileName, referencedPath);
            });
            this.projectFilesSet.remove(fileName);
            this.languageServiceHost.removeScript(fileName);
        }
    };

    /**
    * update a project file
    * @param path
    */
    TypeScriptProject.prototype.updateFile = function (fileName) {
        var _this = this;
        this.fileSystem.readFile(fileName).then(function (content) {
            var oldPaths = new collections.StringSet(_this.getReferencedOrImportedFiles(fileName));
            _this.languageServiceHost.updateScript(fileName, content);
            _this.updateReferences(fileName, oldPaths);
        });
    };

    //-------------------------------
    //  References
    //-------------------------------
    /**
    * for a given file retrives the file referenced or imported by this file
    * @param path
    */
    TypeScriptProject.prototype.getReferencedOrImportedFiles = function (fileName) {
        if (!this.projectFilesSet.has(fileName)) {
            return [];
        }
        var script = this.languageServiceHost.getScriptSnapshot(fileName), preProcessedFileInfoString = this.coreService.getPreProcessedFileInfo(fileName, script), preProcessedFileInfo = JSON.parse(preProcessedFileInfoString).result, dir = path.dirname(fileName);

        return preProcessedFileInfo.referencedFiles.map(function (fileReference) {
            return utils.pathResolve(dir, fileReference.path);
        }).concat(preProcessedFileInfo.importedFiles.map(function (fileReference) {
            return utils.pathResolve(dir, fileReference.path + '.ts');
        }));
    };

    /**
    * add a reference
    *
    * @param fileName the path of the file referencing anothe file
    * @param referencedPath the path of the file referenced
    */
    TypeScriptProject.prototype.addReference = function (fileName, referencedPath) {
        if (!this.references.has(referencedPath)) {
            this.references.set(referencedPath, new collections.StringSet());
        }
        this.references.get(referencedPath).add(fileName);
    };

    /**
    * remove a reference
    *
    * @param fileName the path of the file referencing anothe file
    * @param referencedPath the path of the file referenced
    */
    TypeScriptProject.prototype.removeReference = function (fileName, referencedPath) {
        var fileRefs = this.references.get(referencedPath);
        if (!fileRefs) {
            this.removeFile(referencedPath);
        }
        fileRefs.remove(fileName);
        if (fileRefs.values.length === 0) {
            this.references.delete(referencedPath);
            this.removeFile(referencedPath);
        }
    };

    /**
    * update file references after an update
    *
    * @param fileName the absolute path of the file
    * @param oldFileReferences list of file this file referenced before being updated
    */
    TypeScriptProject.prototype.updateReferences = function (fileName, oldFileReferences) {
        var _this = this;
        this.getReferencedOrImportedFiles(fileName).forEach(function (referencedPath) {
            oldFileReferences.remove(referencedPath);
            if (!_this.projectFilesSet.has(referencedPath)) {
                _this.addFile(referencedPath);
                _this.addReference(fileName, referencedPath);
            }
        });

        oldFileReferences.values.forEach(function (referencedPath) {
            return _this.removeReference(fileName, referencedPath);
        });
    };
    return TypeScriptProject;
})();

var TypeScriptProject;
(function (TypeScriptProject) {
    /**
    * enum describing the type of file ib a project
    */
    (function (ProjectFileKind) {
        /**
        * the file is not a part of the project
        */
        ProjectFileKind[ProjectFileKind["NONE"] = 0] = "NONE";

        /**
        * the file is a source file of the project
        */
        ProjectFileKind[ProjectFileKind["SOURCE"] = 1] = "SOURCE";

        /**
        * the file is referenced by a source file of the project
        */
        ProjectFileKind[ProjectFileKind["REFERENCE"] = 2] = "REFERENCE";
    })(TypeScriptProject.ProjectFileKind || (TypeScriptProject.ProjectFileKind = {}));
    var ProjectFileKind = TypeScriptProject.ProjectFileKind;

    /**
    * default Project factory
    * @param baseDirectory the baseDirectory of the project
    * @param config the project config file
    * @param fileSystem the fileSystem wrapper used by the project
    * @param workingSet the working set wrapper used by the project
    * @param defaultLibLocation the location of the default compiler 'lib.d.ts' file
    */
    function newProject(baseDirectory, config, fileSystem, workingSet, defaultLibLocation) {
        return new TypeScriptProject(baseDirectory, config, fileSystem, workingSet, defaultLibLocation);
    }
    TypeScriptProject.newProject = newProject;
})(TypeScriptProject || (TypeScriptProject = {}));

module.exports = TypeScriptProject;

},{"../commons/collections":43,"../commons/fileSystem":45,"../commons/logger":46,"../commons/promiseQueue":47,"../commons/utils":50,"../commons/workingSet":52,"./languageServiceHost":58,"bluebird":5,"minimatch":40,"path":1}],61:[function(require,module,exports){
//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
var Promise = require('bluebird');
var path = require('path');
var PromiseQueue = require('../commons/promiseQueue');

var collections = require('../commons/collections');
var tsUtils = require('../commons/typeScriptUtils');
var utils = require('../commons/utils');
var logger = require('../commons/logger');
var TypeScriptProject = require('./project');

//--------------------------------------------------------------------------
//
//  TypeScriptProjectManager
//
//--------------------------------------------------------------------------
/**
* The main facade class of the extentions, responsible to create, destroy, update
* projects by observing preferenreces.
*/
var TypeScriptProjectManager = (function () {
    function TypeScriptProjectManager() {
        var _this = this;
        /**
        * a map containing the projects
        */
        this.projectMap = new collections.StringMap();
        /**
        * a promise queue used to insure async task are run sequentialy
        */
        this.queue = new PromiseQueue();
        //-------------------------------
        //  Events Handler
        //-------------------------------
        /**
        * handle changes in the preferences, update / delete / create project accordingly
        */
        this.configChangeHandler = function () {
            _this.queue.then(function () {
                _this.preferenceManager.getProjectsConfig().then(function (configs) {
                    var promises = [];
                    _this.projectMap.entries.forEach(function (entry) {
                        var projectId = entry.key, project = entry.value, config = configs[projectId];
                        if (!config) {
                            project.dispose();
                            _this.projectMap.delete(projectId);
                        } else {
                            promises.push(project.update(config));
                        }
                    });

                    Object.keys(configs).forEach(function (projectId) {
                        if (!_this.projectMap.has(projectId)) {
                            promises.push(_this.createProjectFromConfig(projectId, configs[projectId]));
                        }
                    });
                });
            });
        };
    }
    //-------------------------------
    // Public methods
    //-------------------------------
    /**
    * initialize the project manager
    *
    * @param defaultTypeScriptLocation location of the default typescript compiler lib.d.ts file
    * @param preferenceManager preferences manager used to retrieve project config
    * @param fileSystem editor filesystem manager
    * @param workingSet editor workingset manager
    * @param projectFactory a factory used to create project
    */
    TypeScriptProjectManager.prototype.init = function (defaultTypeScriptLocation, preferenceManager, fileSystem, workingSet, projectFactory) {
        var _this = this;
        this.defaultTypeScriptLocation = defaultTypeScriptLocation;
        this.preferenceManager = preferenceManager;
        this.workingSet = workingSet;
        this.fileSystem = fileSystem;
        this.projectFactory = projectFactory;

        this.preferenceManager.configChanged.add(this.configChangeHandler);

        return this.queue.init(this.fileSystem.getProjectRoot().then(function (projectRootDir) {
            _this.projectRootDir = projectRootDir;
            return _this.createProjects();
        }));
    };

    /**
    * dispose the project manager
    */
    TypeScriptProjectManager.prototype.dispose = function () {
        var _this = this;
        this.preferenceManager.configChanged.remove(this.configChangeHandler);
        this.queue.then(function () {
            return _this.disposeProjects();
        });
    };

    /**
    * this method will try to find a project referencing the given path
    * it will by priority try to retrive project that have that file as part of 'direct source'
    * before returning projects that just have 'reference' to this file
    *
    * @param fileName the path of the typesrcript file for which project are looked fo
    */
    TypeScriptProjectManager.prototype.getProjectForFile = function (fileName) {
        var _this = this;
        return this.queue.then(function () {
            var projects = _this.projectMap.values, project = null;

            //first we check for a project that have tha file as source
            projects.some(function (tsProject) {
                if (tsProject.getProjectFileKind(fileName) === 1 /* SOURCE */) {
                    project = tsProject;
                    return true;
                }
            });

            //then we check if a project has a file referencing the given file
            if (!project) {
                projects.some(function (tsProject) {
                    if (tsProject.getProjectFileKind(fileName) === 2 /* REFERENCE */) {
                        project = tsProject;
                        return true;
                    }
                });
            }

            //then we check if the current temp project has the file
            if (!project) {
                if (_this.tempProject && _this.tempProject.getProjectFilesSet().has(fileName)) {
                    project = _this.tempProject;
                } else if (_this.tempProject) {
                    _this.tempProject.dispose();
                    _this.tempProject = null;
                }
            }

            //then if still no project found we create the temp project
            if (!project) {
                var config = utils.clone(tsUtils.typeScriptProjectConfigDefault);
                config.target = 'es5';
                config.sources = [fileName];
                _this.tempProject = project = _this.projectFactory(_this.projectRootDir, config, _this.fileSystem, _this.workingSet, path.join(_this.defaultTypeScriptLocation, 'lib.d.ts'));
                return _this.tempProject.init().then(function () {
                    return _this.tempProject;
                });
            }

            return project;
        });
    };

    //-------------------------------
    //  Private methods
    //-------------------------------
    /**
    * create projects from project configs retrieved by the preferenceManager
    */
    TypeScriptProjectManager.prototype.createProjects = function () {
        var _this = this;
        return this.preferenceManager.getProjectsConfig().then(function (configs) {
            return Promise.all(Object.keys(configs).map(function (projectId) {
                return _this.createProjectFromConfig(projectId, configs[projectId]);
            }));
        });
    };

    /**
    * dispose every projects created by the ProjectManager
    */
    TypeScriptProjectManager.prototype.disposeProjects = function () {
        var projectMap = this.projectMap;
        projectMap.keys.forEach(function (path) {
            projectMap.get(path).dispose();
        });
        this.projectMap.clear();
        if (this.tempProject) {
            this.tempProject.dispose();
            this.tempProject = null;
        }
    };

    /**
    * for given config and projectId create a project
    *
    * @param projectId the id of the project
    * @param config the project config
    */
    TypeScriptProjectManager.prototype.createProjectFromConfig = function (projectId, config) {
        var _this = this;
        var project = this.projectFactory(this.projectRootDir, config, this.fileSystem, this.workingSet, path.join(this.defaultTypeScriptLocation, 'lib.d.ts'));
        return project.init().then(function () {
            _this.projectMap.set(projectId, project);
        }, function () {
            if (logger.fatal()) {
                logger.log('could not create project:' + projectId);
            }
        });
    };
    return TypeScriptProjectManager;
})();

module.exports = TypeScriptProjectManager;

},{"../commons/collections":43,"../commons/logger":46,"../commons/promiseQueue":47,"../commons/typeScriptUtils":49,"../commons/utils":50,"./project":60,"bluebird":5,"path":1}]},{},[57])