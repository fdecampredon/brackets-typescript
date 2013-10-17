define(["require", "exports"], function(require, exports) {
    'use strict';

    var Signal = (function () {
        function Signal() {
            this.listeners = [];
            this.priorities = [];
        }
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

        Signal.prototype.remove = function (listener) {
            var index = this.listeners.indexOf(listener);
            if (index >= 0) {
                this.priorities.splice(index, 1);
                this.listeners.splice(index, 1);
            }
        };

        Signal.prototype.dispatch = function (parameter) {
            var indexesToRemove;
            var hasBeenCanceled = this.listeners.every(function (listener) {
                var result = listener(parameter);
                return result !== false;
            });

            return hasBeenCanceled;
        };

        Signal.prototype.clear = function () {
            this.listeners = [];
            this.priorities = [];
        };

        Signal.prototype.hasListeners = function () {
            return this.listeners.length > 0;
        };
        return Signal;
    })();
    exports.Signal = Signal;

    var JQuerySignalWrapper = (function () {
        function JQuerySignalWrapper(target, event) {
            var _this = this;
            this.jqueryEventHandler = function (parameter) {
                _this.signal.dispatch(parameter);
            };
            this.target = target;
            this.event = event;
            this.signal = new Signal();
        }
        JQuerySignalWrapper.prototype.add = function (listener, priority) {
            this.signal.add(listener, priority);
            this.target.on(this.event, this.jqueryEventHandler);
        };

        JQuerySignalWrapper.prototype.remove = function (listener) {
            this.signal.remove(listener);
            if (!this.hasListeners()) {
                this.removeJQueryEventListener();
            }
        };

        JQuerySignalWrapper.prototype.dispatch = function (parameter) {
            return this.signal.dispatch(parameter);
        };

        JQuerySignalWrapper.prototype.clear = function () {
            this.signal.clear();
            this.removeJQueryEventListener();
        };

        JQuerySignalWrapper.prototype.hasListeners = function () {
            return this.signal.hasListeners();
        };

        JQuerySignalWrapper.prototype.removeJQueryEventListener = function () {
            this.target.off(this.event, this.jqueryEventHandler);
        };
        return JQuerySignalWrapper;
    })();
    exports.JQuerySignalWrapper = JQuerySignalWrapper;
});
