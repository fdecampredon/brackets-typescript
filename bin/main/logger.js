define(["require", "exports"], function(require, exports) {
    'use strict';

    var debug;

    var Logger = (function () {
        function Logger() {
        }
        Logger.prototype.information = function () {
            return debug;
        };
        Logger.prototype.debug = function () {
            return debug;
        };
        Logger.prototype.warning = function () {
            return debug;
        };
        Logger.prototype.error = function () {
            return debug;
        };
        Logger.prototype.fatal = function () {
            return debug;
        };

        Logger.prototype.log = function (s) {
            console.log(s);
        };
        return Logger;
    })();

    var Logger;
    (function (Logger) {
        function setDebugMode(value) {
            debug = value;
        }
        Logger.setDebugMode = setDebugMode;
    })(Logger || (Logger = {}));

    
    return Logger;
});
