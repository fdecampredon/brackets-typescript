//   Copyright 2013 François de Campredon
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
define(["require", "exports"], function(require, exports) {
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

    
    return immediateImpl;
});
