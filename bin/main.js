!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.bracketsTypescript=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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

}).call(this,_dereq_("tWU75n"))
},{"tWU75n":2}],2:[function(_dereq_,module,exports){
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

},{}],3:[function(_dereq_,module,exports){
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

var SomePromiseArray = _dereq_("./some_promise_array.js")(PromiseArray);
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

},{"./some_promise_array.js":35}],4:[function(_dereq_,module,exports){
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
var schedule = _dereq_("./schedule.js");
var Queue = _dereq_("./queue.js");
var errorObj = _dereq_("./util.js").errorObj;
var tryCatch1 = _dereq_("./util.js").tryCatch1;
var process = _dereq_("./global.js").process;

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

},{"./global.js":17,"./queue.js":28,"./schedule.js":31,"./util.js":39}],5:[function(_dereq_,module,exports){
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
var Promise = _dereq_("./promise.js")();
module.exports = Promise;
},{"./promise.js":21}],6:[function(_dereq_,module,exports){
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

},{}],7:[function(_dereq_,module,exports){
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
var errors = _dereq_("./errors.js");
var async = _dereq_("./async.js");
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

},{"./async.js":4,"./errors.js":11}],8:[function(_dereq_,module,exports){
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
var inherits = _dereq_("./util.js").inherits;
var defineProperty = _dereq_("./es5.js").defineProperty;

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

},{"./es5.js":13,"./util.js":39}],9:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
var errors = _dereq_("./errors.js");
var tryCatch1 = util.tryCatch1;
var errorObj = util.errorObj;
var keys = _dereq_("./es5.js").keys;
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

},{"./errors.js":11,"./es5.js":13,"./util.js":39}],10:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
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

},{"./util.js":39}],11:[function(_dereq_,module,exports){
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
var global = _dereq_("./global.js");
var Objectfreeze = _dereq_("./es5.js").freeze;
var util = _dereq_("./util.js");
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

},{"./es5.js":13,"./global.js":17,"./util.js":39}],12:[function(_dereq_,module,exports){
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
var TypeError = _dereq_('./errors.js').TypeError;

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

},{"./errors.js":11}],13:[function(_dereq_,module,exports){
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

},{}],14:[function(_dereq_,module,exports){
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
var isArray = _dereq_("./util.js").isArray;

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

},{"./util.js":39}],15:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
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

},{"./util.js":39}],16:[function(_dereq_,module,exports){
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
var PromiseSpawn = _dereq_("./promise_spawn.js")(Promise, INTERNAL);
var errors = _dereq_("./errors.js");
var TypeError = errors.TypeError;
var deprecated = _dereq_("./util.js").deprecated;

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

},{"./errors.js":11,"./promise_spawn.js":24,"./util.js":39}],17:[function(_dereq_,module,exports){
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
},{}],18:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
var canAttach = _dereq_("./errors.js").canAttach;
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

},{"./errors.js":11,"./util.js":39}],19:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
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

},{"./async.js":4,"./util.js":39}],20:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var errors = _dereq_("./errors.js");
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

},{"./async.js":4,"./errors.js":11,"./util.js":39}],21:[function(_dereq_,module,exports){
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
var global = _dereq_("./global.js");
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var errors = _dereq_("./errors.js");

var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {e: null};

var PromiseArray = _dereq_("./promise_array.js")(Promise, INTERNAL);
var CapturedTrace = _dereq_("./captured_trace.js")();
var CatchFilter = _dereq_("./catch_filter.js")(NEXT_FILTER);
var PromiseResolver = _dereq_("./promise_resolver.js");

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
var apiRejection = _dereq_("./errors_api_rejection")(Promise);


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
_dereq_("./finally.js")(Promise, NEXT_FILTER);
_dereq_("./direct_resolve.js")(Promise);
_dereq_("./thenables.js")(Promise, INTERNAL);
_dereq_("./synchronous_inspection.js")(Promise);
Promise.RangeError = RangeError;
Promise.CancellationError = CancellationError;
Promise.TimeoutError = TimeoutError;
Promise.TypeError = TypeError;
Promise.RejectionError = RejectionError;

util.toFastProperties(Promise);
util.toFastProperties(Promise.prototype);
_dereq_('./timers.js')(Promise,INTERNAL);
_dereq_('./any.js')(Promise,Promise$_CreatePromiseArray,PromiseArray);
_dereq_('./race.js')(Promise,INTERNAL);
_dereq_('./call_get.js')(Promise);
_dereq_('./filter.js')(Promise,Promise$_CreatePromiseArray,PromiseArray,apiRejection);
_dereq_('./generators.js')(Promise,apiRejection,INTERNAL);
_dereq_('./map.js')(Promise,PromiseArray,INTERNAL,apiRejection);
_dereq_('./nodeify.js')(Promise);
_dereq_('./promisify.js')(Promise,INTERNAL);
_dereq_('./props.js')(Promise,PromiseArray);
_dereq_('./reduce.js')(Promise,Promise$_CreatePromiseArray,PromiseArray,apiRejection,INTERNAL);
_dereq_('./settle.js')(Promise,Promise$_CreatePromiseArray,PromiseArray);
_dereq_('./some.js')(Promise,Promise$_CreatePromiseArray,PromiseArray,apiRejection);
_dereq_('./progress.js')(Promise,isPromiseArrayProxy);
_dereq_('./cancel.js')(Promise,INTERNAL);

Promise.prototype = Promise.prototype;
return Promise;

};

}).call(this,_dereq_("tWU75n"))
},{"./any.js":3,"./async.js":4,"./call_get.js":6,"./cancel.js":7,"./captured_trace.js":8,"./catch_filter.js":9,"./direct_resolve.js":10,"./errors.js":11,"./errors_api_rejection":12,"./filter.js":14,"./finally.js":15,"./generators.js":16,"./global.js":17,"./map.js":18,"./nodeify.js":19,"./progress.js":20,"./promise_array.js":22,"./promise_resolver.js":23,"./promisify.js":25,"./props.js":27,"./race.js":29,"./reduce.js":30,"./settle.js":32,"./some.js":34,"./synchronous_inspection.js":36,"./thenables.js":37,"./timers.js":38,"./util.js":39,"tWU75n":2}],22:[function(_dereq_,module,exports){
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
var canAttach = _dereq_("./errors.js").canAttach;
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
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

},{"./async.js":4,"./errors.js":11,"./util.js":39}],23:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors.js");
var TimeoutError = errors.TimeoutError;
var RejectionError = errors.RejectionError;
var async = _dereq_("./async.js");
var haveGetters = util.haveGetters;
var es5 = _dereq_("./es5.js");

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

},{"./async.js":4,"./errors.js":11,"./es5.js":13,"./util.js":39}],24:[function(_dereq_,module,exports){
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
var errors = _dereq_("./errors.js");
var TypeError = errors.TypeError;
var util = _dereq_("./util.js");
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

},{"./errors.js":11,"./util.js":39}],25:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
var es5 = _dereq_("./es5.js");
var nodebackForPromise = _dereq_("./promise_resolver.js")
    ._nodebackForPromise;
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var deprecated = util.deprecated;
var TypeError = _dereq_("./errors").TypeError;


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


},{"./errors":11,"./es5.js":13,"./promise_resolver.js":23,"./util.js":39}],26:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
var inherits = util.inherits;
var es5 = _dereq_("./es5.js");

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

},{"./es5.js":13,"./util.js":39}],27:[function(_dereq_,module,exports){
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
var PropertiesPromiseArray = _dereq_("./properties_promise_array.js")(
    Promise, PromiseArray);
var util = _dereq_("./util.js");
var apiRejection = _dereq_("./errors_api_rejection")(Promise);
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

},{"./errors_api_rejection":12,"./properties_promise_array.js":26,"./util.js":39}],28:[function(_dereq_,module,exports){
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

},{}],29:[function(_dereq_,module,exports){
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
var apiRejection = _dereq_("./errors_api_rejection.js")(Promise);
var isArray = _dereq_("./util.js").isArray;

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

},{"./errors_api_rejection.js":12,"./util.js":39}],30:[function(_dereq_,module,exports){
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

},{}],31:[function(_dereq_,module,exports){
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
var global = _dereq_("./global.js");
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

}).call(this,_dereq_("tWU75n"))
},{"./global.js":17,"tWU75n":2}],32:[function(_dereq_,module,exports){
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

var SettledPromiseArray = _dereq_("./settled_promise_array.js")(
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

},{"./settled_promise_array.js":33}],33:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
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

},{"./util.js":39}],34:[function(_dereq_,module,exports){
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

var SomePromiseArray = _dereq_("./some_promise_array.js")(PromiseArray);
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

},{"./some_promise_array.js":35}],35:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
var RangeError = _dereq_("./errors.js").RangeError;
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

},{"./errors.js":11,"./util.js":39}],36:[function(_dereq_,module,exports){
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

},{}],37:[function(_dereq_,module,exports){
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
var util = _dereq_("./util.js");
var canAttach = _dereq_("./errors.js").canAttach;
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

},{"./errors.js":11,"./util.js":39}],38:[function(_dereq_,module,exports){
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
var global = _dereq_("./global.js");
var setTimeout = function(fn, ms) {
    var $_len = arguments.length;var args = new Array($_len - 2); for(var $_i = 2; $_i < $_len; ++$_i) {args[$_i - 2] = arguments[$_i];}
    global.setTimeout(function(){
        fn.apply(void 0, args);
    }, ms);
};

module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var errors = _dereq_("./errors.js");
var apiRejection = _dereq_("./errors_api_rejection")(Promise);
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

},{"./errors.js":11,"./errors_api_rejection":12,"./global.js":17,"./util.js":39}],39:[function(_dereq_,module,exports){
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
var global = _dereq_("./global.js");
var es5 = _dereq_("./es5.js");
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

},{"./es5.js":13,"./global.js":17}],40:[function(_dereq_,module,exports){
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

},{}],41:[function(_dereq_,module,exports){
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




},{}],42:[function(_dereq_,module,exports){
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


},{}],43:[function(_dereq_,module,exports){
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
//  Immediate
//
//--------------------------------------------------------------------------
/**
* a setImmediate shim
*/
var immediateImpl;

if (typeof window.setImmediate !== 'undefined') {
    immediateImpl = window;
} else {
    var setImmediateQueue = [], canceledImmediate = {}, sentinel = 'immediate' + String(Math.random()), uidHelper = 0;

    window.addEventListener('message', function (event) {
        if (event.data === sentinel) {
            var queue = setImmediateQueue, canceled = canceledImmediate;

            setImmediateQueue = [];
            canceledImmediate = {};
            queue.forEach(function (task) {
                if (!canceled[task.handle]) {
                    task.callBack.apply(null, task.parameters);
                }
            });
        }
    });

    immediateImpl = {
        setImmediate: function (expression) {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                args[_i] = arguments[_i + 1];
            }
            uidHelper++;
            setImmediateQueue.push({
                handle: uidHelper,
                callBack: typeof expression === 'string' ? new Function(expression) : expression,
                parameters: args
            });
            window.postMessage(sentinel, '*');
            return uidHelper;
        },
        clearImmediate: function (handle) {
            canceledImmediate[handle] = true;
        }
    };

    Object.freeze(immediateImpl);
}

module.exports = immediateImpl;

},{}],44:[function(_dereq_,module,exports){
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

},{}],45:[function(_dereq_,module,exports){
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

},{}],46:[function(_dereq_,module,exports){
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

},{}],47:[function(_dereq_,module,exports){
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
var path = _dereq_('path');

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

},{"path":1}],48:[function(_dereq_,module,exports){
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
var utils = _dereq_('./utils');
var collections = _dereq_('./collections');
var signal = _dereq_('./signal');
var Promise = _dereq_('bluebird');

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

},{"./collections":40,"./signal":45,"./utils":47,"bluebird":5}],49:[function(_dereq_,module,exports){
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



},{}],50:[function(_dereq_,module,exports){
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
//TODO that part of the application is not well tested and just 'work' it needs to be refactored
var ServiceConsumer = _dereq_('./serviceConsumer');
var completion = _dereq_('../commons/completion');
var CompletionKind = completion.CompletionKind;

var HINT_TEMPLATE = [
    '<span class="cm-s-default">',
    '   <span style="display: inline-block" class="{{classType}}">',
    '       <span style="font-weight: bold">{{match}}</span>{{suffix}}',
    '   </span>',
    '</span>'
].join('\n');

/**
* basic implementation
*/
var CodeHintProvider = (function (_super) {
    __extends(CodeHintProvider, _super);
    function CodeHintProvider() {
        _super.apply(this, arguments);
    }
    /**
    * return true if hints can be calculated for te current editor
    *
    * @param editor the editor
    * @param implicitChar determine whether the hinting request is explicit or implicit,
    * null if implicit, contains the last character inserted
    */
    CodeHintProvider.prototype.hasHints = function (editor, implicitChar) {
        //TODO we should find a better test here that limits more the implicit request
        if (!implicitChar || /[\w.\($_]/.test(implicitChar)) {
            this.editor = editor;
            return true;
        }
        return false;
    };

    CodeHintProvider.prototype.getHints = function (implicitChar) {
        var currentFileName = this.editor.document.file.fullPath, position = this.editor.getCursorPos(), deferred = $.Deferred();
        if (!this.hasHints(this.editor, implicitChar)) {
            deferred.resolve({
                hints: [],
                selectInitial: false
            });
        } else {
            this.getService().then(function (service) {
                service.getCompletionAtPosition(currentFileName, position).then(function (result) {
                    deferred.resolve({
                        hints: result.entries.map(function (entry) {
                            var text = entry.name, match, suffix, classType = '';

                            switch (entry.kind) {
                                case 7 /* KEYWORD */:
                                    switch (entry.name) {
                                        case 'static':
                                        case 'public':
                                        case 'private':
                                        case 'export':
                                        case 'get':
                                        case 'set':
                                            classType = 'cm-qualifier';
                                            break;
                                        case 'class':
                                        case 'function':
                                        case 'module':
                                        case 'var':
                                            classType = 'cm-def';
                                            break;
                                        default:
                                            classType = 'cm-keyword';
                                            break;
                                    }
                                    break;
                                case 5 /* METHOD */:
                                case 6 /* FUNCTION */:
                                    text += entry.type ? entry.type : '';
                                    break;
                                default:
                                    text += entry.type ? ' - ' + entry.type : '';
                                    break;
                            }

                            // highlight the matched portion of each hint
                            if (result.match) {
                                match = text.slice(0, result.match.length);
                                suffix = text.slice(result.match.length);
                            } else {
                                match = '';
                                suffix = text;
                            }

                            var jqueryObj = $(Mustache.render(HINT_TEMPLATE, {
                                match: match,
                                suffix: suffix,
                                classType: classType
                            }));
                            jqueryObj.data('entry', entry);
                            jqueryObj.data('match', result.match);
                            return jqueryObj;
                        }),
                        selectInitial: !!implicitChar
                    });
                }).catch(function (error) {
                    return deferred.reject(error);
                });
            });
        }
        return deferred;
    };

    CodeHintProvider.prototype.insertHint = function ($hintObj) {
        var entry = $hintObj.data('entry'), match = $hintObj.data('match'), position = this.editor.getCursorPos(), startPos = !match ? position : {
            line: position.line,
            ch: position.ch - match.length
        };

        this.editor.document.replaceRange(entry.name, startPos, position);
    };
    return CodeHintProvider;
})(ServiceConsumer);

module.exports = CodeHintProvider;

},{"../commons/completion":41,"./serviceConsumer":61}],51:[function(_dereq_,module,exports){
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
//TODO that part of the application is not well tested and just 'work' it needs to be refactored
//--------------------------------------------------------------------------
//
//  TypeScriptProject
//
//--------------------------------------------------------------------------
var BRACKETS_CONFIG_FILE_NAME = '.brackets.json';

function isBracketsPreferenceFile(path) {
    return path && path.substr(path.lastIndexOf('/') + 1, path.length) === BRACKETS_CONFIG_FILE_NAME;
}

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
* TypeScript Inspection Provider
*/
var TypeScriptConfigErrorReporter = (function () {
    function TypeScriptConfigErrorReporter() {
        /**
        * name of the error reporter
        */
        this.name = 'TypeScript Configuration';
    }
    /**
    * scan file
    */
    TypeScriptConfigErrorReporter.prototype.scanFile = function (content, path) {
        if (!isBracketsPreferenceFile(path)) {
            return null;
        }
        var data;
        try  {
            data = JSON.parse(content);
        } catch (e) {
            return {
                errors: [],
                aborted: true
            };
        }

        var typescript = data.typescript;
        if (!data.typescript) {
            return {
                errors: [],
                aborted: false
            };
        }

        var errors = [];
        if (typescript.projects && typescript.sources) {
            errors.push('You cannot have sources and projects at the same level');
        }

        validateSection(null, typescript, !typescript.projects, errors);

        if (typescript.projects) {
            if (typeof typescript.projects !== 'object') {
                errors.push('invalid section projects, it must be an object');
            }
            Object.keys(typescript.projects).forEach(function (key) {
                validateSection(key + ': ', typescript.projects[key], true, errors);
            });
        }

        return {
            errors: errors.map(function (message) {
                return ({
                    message: message,
                    type: Type.ERROR,
                    pos: { line: -1, ch: -1 }
                });
            }),
            aborted: false
        };
    };
    return TypeScriptConfigErrorReporter;
})();

function validateSection(sectionName, config, mustHaveSources, errors) {
    var prefix = sectionName ? sectionName + ': ' : '';
    if (config.target && ['es3', 'es5'].indexOf(config.target.toLowerCase()) === -1) {
        errors.push(prefix + 'the target section has invalid value authorized values are \'es3\' or \'es5\'');
    }
    if (config.module && ['none', 'amd', 'commonjs'].indexOf(config.module.toLowerCase()) === -1) {
        errors.push(prefix + 'the module section has invalid value authorized values are \'none\', \'amd\' or \'commonjs\'');
    }
    if (config.sourceRoot && typeof config.sourceRoot !== 'string') {
        errors.push(prefix + 'the sourceRoot section must be a string');
    }
    if (mustHaveSources) {
        if (!config.sources || !Array.isArray(config.sources) || !config.sources.every(function (pattern) {
            return typeof pattern === 'string';
        })) {
            errors.push(prefix + 'invalid sources section it must be an array of string');
        }
    }
}

module.exports = TypeScriptConfigErrorReporter;

},{}],52:[function(_dereq_,module,exports){
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
//TODO that part of the application is not well tested and just 'work' it needs to be refactored
var ServiceConsumer = _dereq_('./serviceConsumer');
var immediate = _dereq_('../commons/immediate');

//--------------------------------------------------------------------------
//
//  TypeScriptProject
//
//--------------------------------------------------------------------------
/**
* TypeScript Inspection Provider
*/
var TypeScriptErrorReporter = (function (_super) {
    __extends(TypeScriptErrorReporter, _super);
    function TypeScriptErrorReporter() {
        _super.apply(this, arguments);
        /**
        * name of the error reporter
        */
        this.name = 'TypeScript';
    }
    /**
    * scan file
    */
    TypeScriptErrorReporter.prototype.scanFileAsync = function (content, path) {
        var _this = this;
        return $.Deferred(function (deferred) {
            immediate.setImmediate(function () {
                _this.getService().then(function (service) {
                    service.getErrorsForFile(path).then(function (result) {
                        deferred.resolve(result);
                    }, function () {
                        deferred.resolve({
                            errors: [],
                            aborted: false
                        });
                    });
                });
            });
        }).promise();
    };
    return TypeScriptErrorReporter;
})(ServiceConsumer);

module.exports = TypeScriptErrorReporter;

},{"../commons/immediate":43,"./serviceConsumer":61}],53:[function(_dereq_,module,exports){
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
var collections = _dereq_('../commons/collections');
var signal = _dereq_('../commons/signal');
var Promise = _dereq_('bluebird');
var fs = _dereq_('../commons/fileSystem');

/**
* IFileSystem implementations
*/
var FileSystem = (function () {
    //-------------------------------
    //  constructor
    //-------------------------------
    /**
    * @param nativeFileSystem brackets FileSystem module
    * @param projectManager brackets ProjectManager Module
    */
    function FileSystem(nativeFileSystem, projectManager) {
        var _this = this;
        this.nativeFileSystem = nativeFileSystem;
        this.projectManager = projectManager;
        //-------------------------------
        //  Variables
        //-------------------------------
        /**
        * map path to native files
        */
        this.filesContent = new collections.StringMap();
        /**
        * cache of the paths list
        */
        this.filesPath = [];
        /**
        * boolean containing the initialization state of the wrapper
        */
        this.initialized = false;
        /**
        * a stack containing all the call that have been performed before initiliazation
        */
        this.initializationStack = [];
        this._projectFilesChanged = new signal.Signal();
        //-------------------------------
        //  Events handler
        //-------------------------------
        /**
        * handle project workspaces changes
        */
        this.changesHandler = function (event, file) {
            if (!file) {
                // a refresh event
                var oldPathsSet = new collections.StringSet(), oldFilesContent = _this.filesContent.clone(), oldPaths = _this.filesPath.map(function (path) {
                    oldPathsSet.add(path);
                    return path;
                });

                _this.initialized = false;
                _this.filesContent.clear();
                _this.filesPath.length = 0;

                _this.projectManager.getAllFiles().then(function (files) {
                    var fileAdded = [], fileDeleted = [], fileUpdated = [], newPathsSet = new collections.StringSet(), promises = [];

                    _this.filesPath = (files || []).map(function (file) {
                        if (!oldPathsSet.has(file.fullPath)) {
                            fileAdded.push(file.fullPath);
                        }
                        if (oldFilesContent.has(file.fullPath)) {
                            promises.push(new Promise(function (resolve, reject) {
                                file.read({}, function (err, content) {
                                    if (!err) {
                                        _this.filesContent.set(file.fullPath, content);
                                    }
                                    if (err || content !== oldFilesContent.get(file.fullPath)) {
                                        fileUpdated.push(file.fullPath);
                                    }
                                    resolve(true);
                                });
                            }));
                        }
                        newPathsSet.add(file.fullPath);
                        return file.fullPath;
                    });

                    oldPaths.forEach(function (path) {
                        if (!newPathsSet.has(path)) {
                            fileDeleted.push(path);
                        }
                    });

                    Promise.all(promises).then(function () {
                        var changes = [];

                        fileDeleted.forEach(function (path) {
                            changes.push({
                                kind: 2 /* DELETE */,
                                fileName: path
                            });
                        });

                        fileAdded.forEach(function (path) {
                            changes.push({
                                kind: 0 /* ADD */,
                                fileName: path
                            });
                        });

                        fileUpdated.forEach(function (path) {
                            changes.push({
                                kind: 1 /* UPDATE */,
                                fileName: path
                            });
                        });

                        if (changes.length > 0) {
                            _this._projectFilesChanged.dispatch(changes);
                        }
                        _this.initialized = true;
                        _this.resolveInitializationStack();
                    });
                }, function () {
                    _this.reset();
                });
            } else if (file.isFile) {
                //file have been updated simply dispatch an update event and update the cache if necessary
                var dispatchUpdate = function () {
                    _this._projectFilesChanged.dispatch([{
                            kind: 1 /* UPDATE */,
                            fileName: file.fullPath
                        }]);
                };

                if (_this.filesContent.has(file.fullPath)) {
                    // if the file content has been cached update the cache
                    _this.filesContent.delete(file.fullPath);
                    _this.readFile(file.fullPath).then(function (content) {
                        _this.filesContent.set(file.fullPath, content);
                    }).catch().then(dispatchUpdate);
                } else {
                    dispatchUpdate();
                }
            } else if (file.isDirectory) {
                // a directory content has been changed need to make diff between cache an directory
                var directory = file;

                directory.getContents(function (err, files) {
                    if (err) {
                        // an err occured reset
                        _this.reset();
                    }
                    var oldFiles = {}, newFiles = {};

                    //collect all the paths in the cache
                    _this.filesPath.forEach(function (path) {
                        var index = path.indexOf(directory.fullPath);
                        if (index !== -1) {
                            var index2 = path.indexOf('/', index + directory.fullPath.length);
                            if (index2 === -1) {
                                oldFiles[path] = [path];
                            } else {
                                //in case of subdir regroup the files by subdir
                                var dirPath = path.substring(0, index2 + 1);
                                if (!oldFiles[dirPath]) {
                                    oldFiles[dirPath] = [path];
                                } else {
                                    oldFiles[dirPath].push(path);
                                }
                            }
                        }
                    });

                    files.forEach(function (file) {
                        newFiles[file.fullPath] = file;
                    });

                    var changes = [], path;
                    for (path in oldFiles) {
                        if (!newFiles.hasOwnProperty(path) && oldFiles.hasOwnProperty(path)) {
                            //for each files that has been deleted add a DELETE record
                            oldFiles[path].forEach(function (path) {
                                var index = _this.filesPath.indexOf(path);
                                if (index !== -1) {
                                    _this.filesPath.splice(index, 1);
                                    _this.filesContent.delete(path);
                                    changes.push({
                                        kind: 2 /* DELETE */,
                                        fileName: path
                                    });
                                }
                            });
                        }
                    }

                    var promises = [];
                    for (path in newFiles) {
                        if (newFiles.hasOwnProperty(path) && !oldFiles.hasOwnProperty(path)) {
                            //if a file has been added just add a ADD record
                            if (newFiles[path].isFile) {
                                _this.filesPath.push(path);
                                changes.push({
                                    kind: 0 /* ADD */,
                                    fileName: path
                                });
                            } else {
                                var newDir = newFiles[path];

                                //if a dir has been added collect each files in this directory then for each one add an 'ADD' record
                                promises.push(_this.getDirectoryFiles(newDir).then(function (files) {
                                    files.forEach(function (file) {
                                        _this.filesPath.push(file.fullPath);
                                        changes.push({
                                            kind: 0 /* ADD */,
                                            fileName: file.fullPath
                                        });
                                    });
                                }));
                            }
                        }
                    }
                    ;

                    Promise.all(promises).then(function () {
                        if (changes.length > 0) {
                            _this._projectFilesChanged.dispatch(changes);
                        }
                    }, function () {
                        //in case of error reset
                        _this.reset();
                    });
                });
            }
        };
        /**
        * handle file renaming event
        */
        this.renameHandler = function (event, oldPath, newPath) {
            var isDirectory = oldPath[oldPath.length - 1] === '/';
            var changes;
            if (isDirectory) {
                changes = [];
                _this.filesPath.concat().forEach(function (path) {
                    var index = path.indexOf(oldPath);
                    if (index === 0) {
                        changes = changes.concat(_this.fileRenamedHandler(path, path.replace(oldPath, newPath)));
                    }
                });
            } else {
                changes = _this.fileRenamedHandler(oldPath, newPath);
            }
            if (changes.length > 0) {
                _this._projectFilesChanged.dispatch(changes);
            }
        };
        nativeFileSystem.on('change', this.changesHandler);
        nativeFileSystem.on('rename', this.renameHandler);
        this.init();
    }
    //-------------------------------
    //  IFileSystem implementation
    //-------------------------------
    /**
    * return a promise resolving to the project root folder path
    */
    FileSystem.prototype.getProjectRoot = function () {
        return Promise.cast(this.projectManager.getProjectRoot().fullPath);
    };

    Object.defineProperty(FileSystem.prototype, "projectFilesChanged", {
        /**
        * a signal dispatching fine grained change reflecting the change that happens in the working set
        */
        get: function () {
            return this._projectFilesChanged;
        },
        enumerable: true,
        configurable: true
    });

    /**
    * return a promise that resolve with an array of string containing all the files of the projects
    */
    FileSystem.prototype.getProjectFiles = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.addToInitializatioStack(function () {
                return resolve(_this.filesPath);
            });
        });
    };

    /**
    * read a file, return a promise with that resolve to the file content
    *
    * @param path the file to read
    */
    FileSystem.prototype.readFile = function (path) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.addToInitializatioStack(function () {
                if (_this.filesContent.has(path)) {
                    resolve(_this.filesContent.get(path));
                } else {
                    var file = _this.nativeFileSystem.getFileForPath(path);
                    if (file.isDirectory) {
                        reject('not found');
                        return;
                    }
                    file.read({}, function (err, content) {
                        if (err) {
                            reject(err);
                        } else {
                            content = content && _this.normalizeText(content);
                            _this.filesContent.set(path, content);
                            resolve(content);
                        }
                    });
                }
            });
        });
    };

    /**
    * reset the wrapper and dispatch a refresh event
    */
    FileSystem.prototype.reset = function () {
        this.initialized = false;
        this.filesContent.clear();
        this.filesPath.length = 0;
        this.init();
        this._projectFilesChanged.dispatch([{
                kind: 3 /* RESET */,
                fileName: null
            }]);
    };

    /**
    * clean the wrapper for disposal
    */
    FileSystem.prototype.dispose = function () {
        this.nativeFileSystem.off('change', this.changesHandler);
        this.nativeFileSystem.off('rename', this.renameHandler);
        this._projectFilesChanged.clear();
    };

    //-------------------------------
    //  privates methods
    //-------------------------------
    /**
    * initialize the wrapper
    */
    FileSystem.prototype.init = function () {
        var _this = this;
        this.projectManager.getAllFiles().then(function (files) {
            _this.filesPath = files ? files.map(function (file) {
                return file.fullPath;
            }) : [];
            _this.initialized = true;
            _this.resolveInitializationStack();
        });
    };

    /**
    * execute an operation if initialized, add to initialization stack if not
    */
    FileSystem.prototype.addToInitializatioStack = function (callback) {
        if (this.initialized) {
            callback();
        } else {
            this.initializationStack.push(callback);
        }
    };

    FileSystem.prototype.resolveInitializationStack = function () {
        this.initializationStack.forEach(function (callback) {
            return callback();
        });
        this.initializationStack.length = 0;
    };

    /**
    * retrieves all files contained in a directory (and in subdirectory)
    */
    FileSystem.prototype.getDirectoryFiles = function (directory) {
        return new Promise(function (resolve, reject) {
            var files = [];
            directory.visit(function (entry) {
                if (entry.isFile) {
                    files.push(entry);
                }
                return true;
            }, {}, function (err) {
                resolve(files);
            });
        });
    };

    /**
    * normalize text to be conform to codemirro
    * @param text
    */
    FileSystem.prototype.normalizeText = function (text) {
        return text.replace(/\r\n/g, '\n');
    };

    /**
    * dispatch events when a file has been renamed
    */
    FileSystem.prototype.fileRenamedHandler = function (oldPath, newPath) {
        var index = this.filesPath.indexOf(oldPath);
        if (index !== -1) {
            this.filesPath.splice(index, 1);
            this.filesPath.push(newPath);
            if (this.filesContent.has(oldPath)) {
                var content = this.filesContent.get(oldPath);
                this.filesContent.delete(oldPath);
                this.filesContent.set(newPath, content);
            }
            return [
                {
                    kind: 2 /* DELETE */,
                    fileName: oldPath
                }, {
                    kind: 0 /* ADD */,
                    fileName: newPath
                }];
        }
        return [];
    };
    return FileSystem;
})();

module.exports = FileSystem;

},{"../commons/collections":40,"../commons/fileSystem":42,"../commons/signal":45,"bluebird":5}],54:[function(_dereq_,module,exports){
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
var ServiceConsumer = _dereq_('./serviceConsumer');

var EditorManager = brackets.getModule('editor/EditorManager'), Editor = brackets.getModule('editor/Editor').Editor;

var FormattingManager = (function (_super) {
    __extends(FormattingManager, _super);
    function FormattingManager() {
        _super.apply(this, arguments);
        var _this = this;
        this.format = function () {
            var editor = EditorManager.getCurrentFullEditor();
            if (!editor) {
                return;
            }
            var useTabs = Editor.getUseTabChar();

            var options = {
                IndentSize: Editor.getSpaceUnits(),
                TabSize: Editor.getTabSize(),
                NewLineCharacter: '\n',
                ConvertTabsToSpaces: !useTabs,
                InsertSpaceAfterSemicolonInForStatements: true,
                InsertSpaceAfterCommaDelimiter: true,
                InsertSpaceBeforeAndAfterBinaryOperators: true,
                InsertSpaceAfterKeywordsInControlFlowStatements: true,
                InsertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
                InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
                PlaceOpenBraceOnNewLineForFunctions: false,
                PlaceOpenBraceOnNewLineForControlBlocks: false
            };
            var currentRange = editor.getSelection(true), startPos = currentRange ? currentRange.start : undefined, endPos = currentRange ? currentRange.end : undefined;

            if (startPos && endPos && startPos.line === endPos.line && startPos.ch === endPos.ch) {
                startPos = endPos = undefined;
            }

            _this.getService().then(function (service) {
                service.getFormatingForFile(editor.document.file.fullPath, options, startPos, endPos).then(function (textEdits) {
                    if (EditorManager.getCurrentFullEditor() !== editor) {
                        return;
                    }
                    editor.document.setText(textEdits.reduce(function (text, edit) {
                        return text.substr(0, edit.minChar) + edit.text + text.substr(edit.limChar);
                    }, editor.document.getText()));
                });
            });
        };
    }
    FormattingManager.FORMAT_COMMAND_ID = 'fdecampred.brackets-typescript.format';

    FormattingManager.FORMAT_LABEL = 'Format';
    return FormattingManager;
})(ServiceConsumer);

module.exports = FormattingManager;

},{"./serviceConsumer":61}],55:[function(_dereq_,module,exports){
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
var logger = _dereq_('../commons/logger');
var FileSystem = _dereq_('./fileSystem');
var WorkingSet = _dereq_('./workingSet');
var TypeScriptPreferencesManager = _dereq_('./preferencesManager');
var WorkerBridge = _dereq_('../commons/workerBridge');
var TypeScriptErrorReporter = _dereq_('./errorReporter');
var TypeScriptConfigErrorReporter = _dereq_('./configErrorReporter');
var TypeScriptQuickEditProvider = _dereq_('./quickEdit');
var TypeScriptQuickJumpProvider = _dereq_('./quickJump');
var TypeScriptQuickFindDefitionProvider = _dereq_('./quickFindDefinition');
var CodeHintProvider = _dereq_('./codeHintProvider');
var FormattingManager = _dereq_('./formattingManager');
var typeScriptModeFactory = _dereq_('./mode');

//--------------------------------------------------------------------------
//
//  Main entry point of the extension
//
//--------------------------------------------------------------------------
// brackets dependency
var LanguageManager = brackets.getModule('language/LanguageManager'), BracketsFileSystem = brackets.getModule('filesystem/FileSystem'), DocumentManager = brackets.getModule('document/DocumentManager'), ProjectManager = brackets.getModule('project/ProjectManager'), CodeHintManager = brackets.getModule('editor/CodeHintManager'), CodeInspection = brackets.getModule('language/CodeInspection'), EditorManager = brackets.getModule('editor/EditorManager'), QuickOpen = brackets.getModule('search/QuickOpen'), PreferencesManager = brackets.getModule('preferences/PreferencesManager'), CommandManager = brackets.getModule('command/CommandManager'), CodeMirror = brackets.getModule('thirdparty/CodeMirror2/lib/codemirror'), Menus = brackets.getModule('command/Menus');

var tsErrorReporter, quickEditProvider, codeHintProvider, quickJumpProvider, quickFindDefinitionProvider, formattingManager;

var fileSystem, workingSet, worker, preferencesManager, bridge;

function init(config) {
    logger.setLogLevel(config.logLevel);
    CodeMirror.defineMode('typescript', typeScriptModeFactory);

    //Register the language extension
    LanguageManager.defineLanguage('typescript', {
        name: 'TypeScript',
        mode: 'typescript',
        fileExtensions: ['ts'],
        blockComment: ['/*', '*/'],
        lineComment: ['//']
    });

    // Register code hint
    codeHintProvider = new CodeHintProvider();
    CodeHintManager.registerHintProvider(codeHintProvider, ['typescript'], 0);

    // Register quickEdit
    quickEditProvider = new TypeScriptQuickEditProvider();
    EditorManager.registerInlineEditProvider(quickEditProvider.typeScriptInlineEditorProvider);

    //Register quickJump
    quickJumpProvider = new TypeScriptQuickJumpProvider();
    EditorManager.registerJumpToDefProvider(quickJumpProvider.handleJumpToDefinition);

    //Register error provider
    tsErrorReporter = new TypeScriptErrorReporter();
    CodeInspection.register('typescript', tsErrorReporter);
    CodeInspection.register('json', new TypeScriptConfigErrorReporter());

    //Register quickFindDefinitionProvider
    quickFindDefinitionProvider = new TypeScriptQuickFindDefitionProvider();
    QuickOpen.addQuickOpenPlugin(quickFindDefinitionProvider);

    //Register formatting command
    formattingManager = new FormattingManager();
    CommandManager.register(FormattingManager.FORMAT_LABEL, FormattingManager.FORMAT_COMMAND_ID, formattingManager.format);
    var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
    contextMenu.addMenuItem(FormattingManager.FORMAT_COMMAND_ID);

    initServices(config.workerLocation, config.typeScriptLocation, config.logLevel);

    $(ProjectManager).on('beforeProjectClose beforeAppClose', disposeServices);
    $(ProjectManager).on('projectOpen', function () {
        return initServices(config.workerLocation, config.typeScriptLocation, config.logLevel);
    });
}

function disposeServices() {
    bridge.dispose();
    worker.terminate();
    fileSystem.dispose();
    workingSet.dispose();
    preferencesManager.dispose();

    formattingManager.reset();
    tsErrorReporter.reset();
    codeHintProvider.reset();
    quickEditProvider.reset();
    quickJumpProvider.reset();
    quickFindDefinitionProvider.reset();
}

function initServices(workerLocation, typeScriptLocation, logLevel) {
    fileSystem = new FileSystem(BracketsFileSystem, ProjectManager);
    workingSet = new WorkingSet(DocumentManager, EditorManager);
    worker = new Worker(workerLocation);
    bridge = new WorkerBridge(worker);
    preferencesManager = new TypeScriptPreferencesManager(PreferencesManager);

    bridge.init({
        console: console,
        workingSet: workingSet,
        fileSystem: fileSystem,
        preferencesManager: preferencesManager,
        getTypeScriptLocation: function () {
            return typeScriptLocation;
        },
        getLogLevel: function () {
            return logLevel;
        }
    }).then(function (proxy) {
        tsErrorReporter.setService(proxy.errorService);
        codeHintProvider.setService(proxy.completionService);
        quickEditProvider.setService(proxy.definitionService);
        quickJumpProvider.setService(proxy.definitionService);
        quickFindDefinitionProvider.setService(proxy.lexicalStructureService);
        formattingManager.setService(proxy.formattingService);
    });
}

module.exports = init;

},{"../commons/logger":44,"../commons/workerBridge":48,"./codeHintProvider":50,"./configErrorReporter":51,"./errorReporter":52,"./fileSystem":53,"./formattingManager":54,"./mode":56,"./preferencesManager":57,"./quickEdit":58,"./quickFindDefinition":59,"./quickJump":60,"./workingSet":62}],56:[function(_dereq_,module,exports){
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
var FormattingOptions = (function () {
    function FormattingOptions(useTabs, spacesPerTab, indentSpaces, newLineCharacter) {
        this.useTabs = useTabs;
        this.spacesPerTab = spacesPerTab;
        this.indentSpaces = indentSpaces;
        this.newLineCharacter = newLineCharacter;
    }
    FormattingOptions.defaultOptions = new FormattingOptions(false, /*spacesPerTab:*/ 4, /*indentSpaces:*/ 4, '\r\n');
    return FormattingOptions;
})();

var logger = _dereq_('../commons/logger');
var Formatting = TypeScript.Services.Formatting;

var Token = (function () {
    function Token() {
    }
    return Token;
})();

var LineDescriptor = (function () {
    function LineDescriptor() {
        this.eolState = 0 /* Start */;
        this.text = '';
    }
    LineDescriptor.prototype.clone = function () {
        var clone = new LineDescriptor();
        clone.tokenMap = this.tokenMap;
        clone.eolState = this.eolState;
        clone.text = this.text;
        return clone;
    };
    return LineDescriptor;
})();

var TypeScriptMode = (function () {
    function TypeScriptMode(options) {
        this.lineComment = '//';
        this.blockCommentStart = '/*';
        this.blockCommentEnd = '*/';
        this.electricChars = ':{}[]()';
        this.options = options;
    }
    TypeScriptMode.prototype.startState = function () {
        return new LineDescriptor();
    };

    TypeScriptMode.prototype.copyState = function (lineDescriptor) {
        return lineDescriptor.clone();
    };

    TypeScriptMode.prototype.token = function (stream, lineDescriptor) {
        if (stream.sol()) {
            this.initializeLineDescriptor(lineDescriptor, stream.string);
        }

        var token = lineDescriptor.tokenMap[stream.pos];
        if (token) {
            var textBefore = stream.string.substr(0, stream.pos);
            for (var i = 0; i < token.length; i++) {
                stream.next();
            }
            return getStyleForToken(token, textBefore);
        } else {
            stream.skipToEnd();
        }

        return null;
    };

    TypeScriptMode.prototype.indent = function (lineDescriptor, textAfter) {
        if (lineDescriptor.eolState !== 0 /* Start */) {
            //strange bug preven CodeMirror.Pass
            return CodeMirror.Pass;
        }
        var text = lineDescriptor.text + '\n' + (textAfter || 'fakeIdent'), position = textAfter ? text.length : text.length - 9, syntaxTree = this.getSyntaxTree(text), options = new FormattingOptions(!this.options.indentWithTabs, this.options.tabSize, this.options.indentUnit, '\n'), textSnapshot = new Formatting.TextSnapshot(TypeScript.SimpleText.fromString(text)), indent = Formatting.SingleTokenIndenter.getIndentationAmount(position, syntaxTree.sourceUnit(), textSnapshot, options);

        if (indent === null) {
            //strange bug preven CodeMirror.Pass
            return CodeMirror.Pass;
        }
        return indent;
    };

    TypeScriptMode.prototype.initializeLineDescriptor = function (lineDescriptor, text) {
        var classificationResult = getClassificationsForLine(text, lineDescriptor.eolState), tokens = classificationResult.tokens;

        if (lineDescriptor.text) {
            lineDescriptor.text += '\n';
        }
        lineDescriptor.text += text;
        lineDescriptor.eolState = classificationResult.eolState;
        lineDescriptor.tokenMap = {};

        for (var i = 0, l = tokens.length; i < l; i++) {
            lineDescriptor.tokenMap[tokens[i].position] = tokens[i];
        }
    };

    TypeScriptMode.prototype.getSyntaxTree = function (text) {
        return TypeScript.Parser.parse('script', TypeScript.SimpleText.fromString(text), 1 /* ES5 */, false);
    };
    return TypeScriptMode;
})();

var classifier = ts.createClassifier(new logger.LogingClass());

function getClassificationsForLine(text, eolState) {
    var classificationResult = classifier.getClassificationsForLine(text, eolState), currentPosition = 0, tokens = [];

    for (var i = 0, l = classificationResult.entries.length; i < l; i++) {
        var entry = classificationResult.entries[i];
        var token = {
            string: text.substr(currentPosition, entry.length),
            length: entry.length,
            classification: entry.classification,
            position: currentPosition
        };
        tokens.push(token);
        currentPosition += entry.length;
    }

    return {
        tokens: tokens,
        eolState: classificationResult.finalLexState
    };
}

function getStyleForToken(token, textBefore) {
    var TokenClass = ts.TokenClass;
    switch (token.classification) {
        case 6 /* NumberLiteral */:
            return 'number';
        case 7 /* StringLiteral */:
            return 'string';
        case 8 /* RegExpLiteral */:
            return 'string-2';
        case 2 /* Operator */:
            return 'operator';
        case 3 /* Comment */:
            return 'comment';
        case 1 /* Keyword */:
            switch (token.string) {
                case 'string':
                case 'number':
                case 'void':
                case 'bool':
                case 'boolean':
                    return 'variable-2';
                case 'static':
                case 'public':
                case 'private':
                case 'export':
                case 'get':
                case 'set':
                    return 'qualifier';
                case 'class':
                case 'function':
                case 'module':
                case 'var':
                    return 'def';
                default:
                    return 'keyword';
            }

        case 5 /* Identifier */:
            // Show types (indentifiers in PascalCase) as variable-2, other types (camelCase) as variable
            if (token.string.charAt(0).toLowerCase() !== token.string.charAt(0)) {
                return 'variable-2';
            } else {
                return 'variable';
            }
        case 0 /* Punctuation */:
            return 'bracket';
        case 4 /* Whitespace */:
        default:
            return null;
    }
}

function typeScriptModeFactory(options, spec) {
    return new TypeScriptMode(options);
}

module.exports = typeScriptModeFactory;

},{"../commons/logger":44}],57:[function(_dereq_,module,exports){
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
var Promise = _dereq_('bluebird');

var tsUtils = _dereq_('../commons/typeScriptUtils');
var utils = _dereq_('../commons/utils');
var logger = _dereq_('../commons/logger');
var collections = _dereq_('../commons/collections');
var signal = _dereq_('../commons/signal');

/**
* Implementation of the ITypescriptPreferenceManager
*/
var TypescriptPreferenceManager = (function () {
    /**
    * @prama prefManager brackets PreferenceManager module
    */
    function TypescriptPreferenceManager(prefManager) {
        var _this = this;
        this.prefManager = prefManager;
        this.configChanged = new signal.Signal();
        /**
        * handle change in preferences
        */
        this.preferenceChangedHandler = function (e, data) {
            if (data && Array.isArray(data.ids) && data.ids.indexOf('typescript') !== -1) {
                _this.projectConfigs = null;
                _this.configChanged.dispatch();
            }
        };
        this.prefManager.on('change', this.preferenceChangedHandler);
    }
    /**
    * @return a Promise resolving to and map projectId <=> project config
    * corresponding to the typescript section in project preference
    */
    TypescriptPreferenceManager.prototype.getProjectsConfig = function () {
        if (!this.projectConfigs) {
            this.projectConfigs = this.retriveProjectsConfig();
        }
        return Promise.cast(this.projectConfigs.toObject());
    };

    /**
    * A signal notifying when preferences might have changed
    */
    TypescriptPreferenceManager.prototype.dispose = function () {
        this.configChanged.clear();
    };

    /**
    * retrieve project configs from preferences
    */
    TypescriptPreferenceManager.prototype.retriveProjectsConfig = function () {
        var result = new collections.StringMap();

        var data = this.prefManager.get('typescript', this.prefManager.CURRENT_PROJECT);
        if (!data) {
            return result;
        }

        var configs;

        if (data.hasOwnProperty('projects')) {
            var projects = data.projects;
            delete data.projects;
            if (typeof projects !== 'object') {
                return result;
            }
            configs = Object.keys(projects).reduce(function (configs, id) {
                var project = projects[id];
                if (typeof project === 'object') {
                    configs[id] = utils.assign({}, data, project);
                }
                return configs;
            }, {});
        } else {
            configs = {
                default: data
            };
        }

        Object.keys(configs).forEach(function (projectId) {
            var config = utils.assign({}, tsUtils.typeScriptProjectConfigDefault, configs[projectId]);
            if (!tsUtils.validateTypeScriptProjectConfig(config)) {
                if (logger.warning()) {
                    logger.log('invalid config file for brackets-typescript config file');
                }
            } else {
                result.set(projectId, config);
            }
        });

        return result;
    };
    return TypescriptPreferenceManager;
})();

module.exports = TypescriptPreferenceManager;

},{"../commons/collections":40,"../commons/logger":44,"../commons/signal":45,"../commons/typeScriptUtils":46,"../commons/utils":47,"bluebird":5}],58:[function(_dereq_,module,exports){
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
//TODO that part of the application is not well tested and just 'work' it needs to be refactored
var ServiceConsumer = _dereq_('./serviceConsumer');

var DocumentManager = brackets.getModule('document/DocumentManager'), MultiRangeInlineEditor = brackets.getModule('editor/MultiRangeInlineEditor').MultiRangeInlineEditor;

var TypeScriptQuickEditProvider = (function (_super) {
    __extends(TypeScriptQuickEditProvider, _super);
    function TypeScriptQuickEditProvider() {
        _super.apply(this, arguments);
        var _this = this;
        this.typeScriptInlineEditorProvider = function (hostEditor, pos) {
            if (hostEditor.getModeForSelection() !== 'typescript') {
                return null;
            }

            var sel = hostEditor.getSelection(false);
            if (sel.start.line !== sel.end.line) {
                return null;
            }
            var deferred = $.Deferred();
            _this.getService().then(function (service) {
                var fileName = hostEditor.document.file.fullPath;
                service.getDefinitionForFile(fileName, pos).then(function (definitions) {
                    if (!definitions || definitions.length === 0) {
                        deferred.reject();
                    }

                    definitions.filter(function (definition) {
                        return definition.fileName !== fileName || definition.lineStart !== pos.line;
                    });
                    if (definitions.length === 0) {
                        deferred.reject();
                    }

                    var promises = [], ranges = [];

                    definitions.forEach(function (definition) {
                        promises.push(DocumentManager.getDocumentForPath(definition.fileName).then(function (doc) {
                            ranges.push({
                                document: doc,
                                name: definition.name,
                                lineStart: definition.lineStart,
                                lineEnd: definition.lineEnd,
                                fileName: definition.fileName
                            });
                        }));
                    });

                    return $.when.apply($, promises).then(function () {
                        var inlineEditor = new MultiRangeInlineEditor(ranges);
                        inlineEditor.load(hostEditor);
                        deferred.resolve(inlineEditor);
                    });
                }).catch(function (e) {
                    deferred.reject();
                });
            });
            return deferred.promise();
        };
    }
    return TypeScriptQuickEditProvider;
})(ServiceConsumer);

module.exports = TypeScriptQuickEditProvider;

},{"./serviceConsumer":61}],59:[function(_dereq_,module,exports){
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
//TODO that part of the application is not well tested and just 'work' it needs to be refactored
var ServiceConsumer = _dereq_('./serviceConsumer');

var EditorManager = brackets.getModule('editor/EditorManager'), QuickOpen = brackets.getModule('search/QuickOpen');

var Session = (function () {
    function Session(items) {
        this.items = items;
    }
    return Session;
})();

var TypeScriptQuickFindDefitionProvider = (function (_super) {
    __extends(TypeScriptQuickFindDefitionProvider, _super);
    function TypeScriptQuickFindDefitionProvider() {
        _super.apply(this, arguments);
        var _this = this;
        this.name = 'TypeScriptQuickFindDefitionProvider';
        this.languageIds = ['typescript'];
        this.label = 'TypeScript';
        this.search = function (request, stringMatcher) {
            request = request.slice(request.indexOf('@') + 1, request.length);
            return _this.getSession().then(function (session) {
                return session.items.filter(function (item) {
                    return !!stringMatcher.match(item.name, request);
                });
            });
        };
        this.done = function () {
            _this.session = null;
        };
        this.itemSelect = function (item) {
            _this.itemFocus(item);
        };
        this.itemFocus = function (item) {
            _this.setCurrentPosition(item.position);
        };
    }
    TypeScriptQuickFindDefitionProvider.prototype.match = function (query) {
        return query.indexOf('@') === 0;
    };

    TypeScriptQuickFindDefitionProvider.prototype.resultsFormatter = function (item) {
        var displayName = QuickOpen.highlightMatch(item.name);
        displayName = item.containerName ? item.containerName + '.' + displayName : displayName;
        return '<li>' + displayName + '</li>';
    };

    TypeScriptQuickFindDefitionProvider.prototype.getSession = function () {
        var _this = this;
        return $.Deferred(function (deferred) {
            if (_this.session) {
                deferred.resolve(_this.session);
            } else {
                _this.getService().then(function (lexicalStructureService) {
                    var editor = EditorManager.getActiveEditor(), currentFile = editor.document.file.fullPath;
                    lexicalStructureService.getLexicalStructureForFile(currentFile).then(function (items) {
                        _this.session = new Session(items);
                        deferred.resolve(_this.session);
                    });
                });
            }
        }).promise();
    };

    TypeScriptQuickFindDefitionProvider.prototype.setCurrentPosition = function (pos) {
        EditorManager.getActiveEditor().setCursorPos(pos.line, pos.ch, true, true);
    };
    return TypeScriptQuickFindDefitionProvider;
})(ServiceConsumer);

module.exports = TypeScriptQuickFindDefitionProvider;

},{"./serviceConsumer":61}],60:[function(_dereq_,module,exports){
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
//TODO that part of the application is not well tested and just 'work' it needs to be refactored
var ServiceConsumer = _dereq_('./serviceConsumer');

var EditorManager = brackets.getModule('editor/EditorManager'), Commands = brackets.getModule('command/Commands'), CommandManager = brackets.getModule('command/CommandManager');

var TypeScriptQuickJumpProvider = (function (_super) {
    __extends(TypeScriptQuickJumpProvider, _super);
    function TypeScriptQuickJumpProvider() {
        _super.apply(this, arguments);
        var _this = this;
        this.handleJumpToDefinition = function () {
            var editor = EditorManager.getFocusedEditor();

            if (!editor || editor.getModeForSelection() !== 'typescript') {
                return null;
            }

            var pos = editor.getCursorPos(), fileName = editor.document.file.fullPath, deferred = $.Deferred();

            _this.getService().then(function (service) {
                service.getDefinitionForFile(fileName, pos).then(function (definitions) {
                    if (!definitions || definitions.length === 0) {
                        deferred.reject();
                    }

                    definitions.filter(function (definition) {
                        return definition.fileName !== fileName || definition.lineStart !== pos.line;
                    });
                    if (definitions.length === 0) {
                        deferred.reject();
                    }
                    if (editor === EditorManager.getFocusedEditor()) {
                        if (editor.getCursorPos().line === pos.line) {
                            var def = definitions[0];
                            if (def.fileName === fileName) {
                                editor.setCursorPos(def.lineStart, def.charStart, true, true);
                                deferred.resolve(true);
                            } else {
                                CommandManager.execute(Commands.FILE_OPEN, { fullPath: def.fileName }).then(function () {
                                    var editor = EditorManager.getFocusedEditor();
                                    editor.setCursorPos(def.lineStart, def.charStart, true, true);
                                    deferred.resolve(true);
                                }, function () {
                                    return deferred.reject();
                                });
                            }
                            return;
                        }
                    }
                    deferred.reject();
                }, function () {
                    return deferred.reject();
                });
            });
            return deferred.promise();
        };
    }
    return TypeScriptQuickJumpProvider;
})(ServiceConsumer);

module.exports = TypeScriptQuickJumpProvider;

},{"./serviceConsumer":61}],61:[function(_dereq_,module,exports){
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
var Promise = _dereq_('bluebird');

/**
* a class implementing logic to stack operations until a service
* has been injected
*/
var ServiceConsumer = (function () {
    /**
    * constructor
    */
    function ServiceConsumer() {
        this.reset();
    }
    /**
    * inject the service
    *
    * @param service the injected service
    */
    ServiceConsumer.prototype.setService = function (service) {
        this.serviceResolver(service);
    };

    /**
    * @return a promise that will be resolved when the service get injected
    */
    ServiceConsumer.prototype.getService = function () {
        return this.promise;
    };

    /**
    * reset the injection
    */
    ServiceConsumer.prototype.reset = function () {
        var _this = this;
        this.promise = new Promise(function (resolve) {
            return _this.serviceResolver = resolve;
        });
    };
    return ServiceConsumer;
})();

module.exports = ServiceConsumer;

},{"bluebird":5}],62:[function(_dereq_,module,exports){
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
var signal = _dereq_('../commons/signal');
var collections = _dereq_('../commons/collections');
var ws = _dereq_('../commons/workingSet');
var Promise = _dereq_('bluebird');

/**
* implementation of the IWorkingSet
*/
var WorkingSet = (function () {
    //-------------------------------
    //  constructor
    //-------------------------------
    function WorkingSet(documentManager, editorManager) {
        var _this = this;
        this.documentManager = documentManager;
        this.editorManager = editorManager;
        //-------------------------------
        //  Variables
        //-------------------------------
        /**
        * internal signal for workingSetChanged
        */
        this._workingSetChanged = new signal.Signal();
        /**
        * internal signal for documentEdited
        */
        this._documentEdited = new signal.Signal();
        /**
        * Set of file path in the working set
        */
        this.filesSet = new collections.StringSet();
        //-------------------------------
        //  Events Handler
        //-------------------------------
        /**
        * handle 'workingSetAdd' event
        */
        this.workingSetAddHandler = function (event, file) {
            _this.filesSet.add(file.fullPath);
            _this.workingSetChanged.dispatch({
                kind: 0 /* ADD */,
                paths: [file.fullPath]
            });
        };
        /**
        * handle 'workingSetAddList' event
        */
        this.workingSetAddListHandler = function (event) {
            var files = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                files[_i] = arguments[_i + 1];
            }
            var paths = files.map(function (file) {
                _this.filesSet.add(file.fullPath);
                return file.fullPath;
            });
            if (paths.length > 0) {
                _this.workingSetChanged.dispatch({
                    kind: 0 /* ADD */,
                    paths: paths
                });
            }
        };
        /**
        * handle 'workingSetRemove' event
        */
        this.workingSetRemoveHandler = function (event, file) {
            _this.filesSet.remove(file.fullPath);
            _this.workingSetChanged.dispatch({
                kind: 1 /* REMOVE */,
                paths: [file.fullPath]
            });
        };
        /**
        * handle 'workingSetRemoveList' event
        */
        this.workingSetRemoveListHandler = function (event) {
            var files = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                files[_i] = arguments[_i + 1];
            }
            var paths = files.map(function (file) {
                _this.filesSet.remove(file.fullPath);
                return file.fullPath;
            });
            if (paths.length > 0) {
                _this.workingSetChanged.dispatch({
                    kind: 1 /* REMOVE */,
                    paths: paths
                });
            }
        };
        /**
        * handle 'change' on document
        */
        this.documentChangesHandler = function (event, document, changes) {
            var changeList = changes.map(function (change) {
                return ({
                    from: change.from,
                    to: change.to,
                    text: change.text && change.text.join('\n'),
                    removed: change.removed ? change.removed.join('\n') : ''
                });
            });

            if (changeList.length > 0) {
                _this.documentEdited.dispatch({
                    path: document.file.fullPath,
                    changeList: changeList,
                    documentText: document.getText()
                });
            }
        };
        /**
        * handle active editor change
        */
        this.activeEditorChangeHandler = function (event, current, previous) {
            _this.setActiveEditor(current);
        };
        $(documentManager).on('workingSetAdd', this.workingSetAddHandler);
        $(documentManager).on('workingSetAddList', this.workingSetAddListHandler);
        $(documentManager).on('workingSetRemove', this.workingSetRemoveHandler);
        $(documentManager).on('workingSetRemoveList', this.workingSetRemoveListHandler);

        $(editorManager).on('activeEditorChange', this.activeEditorChangeHandler);

        this.setFiles(documentManager.getWorkingSet().map(function (file) {
            return file.fullPath;
        }));
        this.setActiveEditor(editorManager.getActiveEditor());
    }
    //-------------------------------
    //  IWorkingSet implementations
    //-------------------------------
    /**
    * list of files in the working set
    */
    WorkingSet.prototype.getFiles = function () {
        return Promise.cast(this.filesSet.values);
    };

    Object.defineProperty(WorkingSet.prototype, "workingSetChanged", {
        /**
        * a signal dispatching events when change occured in the working set
        */
        get: function () {
            return this._workingSetChanged;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(WorkingSet.prototype, "documentEdited", {
        /**
        * a signal that provide fine grained change over edited document
        */
        get: function () {
            return this._documentEdited;
        },
        enumerable: true,
        configurable: true
    });

    /**
    * dispose the working set
    */
    WorkingSet.prototype.dispose = function () {
        $(this.documentManager).off('workingSetAdd', this.workingSetAddHandler);
        $(this.documentManager).off('workingSetAddList', this.workingSetAddListHandler);
        $(this.documentManager).off('workingSetRemove', this.workingSetRemoveHandler);
        $(this.documentManager).off('workingSetRemoveList', this.workingSetRemoveListHandler);
        $(this.editorManager).off('activeEditorChange', this.activeEditorChangeHandler);
        this.setFiles(null);
        this.setActiveEditor(null);
    };

    //-------------------------------
    //  Privates methods
    //-------------------------------
    /**
    * set working set files
    */
    WorkingSet.prototype.setFiles = function (files) {
        var _this = this;
        this.filesSet.values.forEach(function (path) {
            return _this.filesSet.remove(path);
        });
        if (files) {
            files.forEach(function (path) {
                return _this.filesSet.add(path);
            });
        }
    };

    /**
    * attach events to the activeEditor
    */
    WorkingSet.prototype.setActiveEditor = function (editor) {
        if (this.currentDocument) {
            $(this.currentDocument).off('change', this.documentChangesHandler);
        }
        this.currentDocument = editor && editor.document;
        if (this.currentDocument) {
            $(this.currentDocument).on('change', this.documentChangesHandler);
        }
    };
    return WorkingSet;
})();

module.exports = WorkingSet;

},{"../commons/collections":40,"../commons/signal":45,"../commons/workingSet":49,"bluebird":5}]},{},[55])
(55)
});