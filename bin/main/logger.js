'use strict';
define(["require", "exports"], function(require, exports) {
    var currentLogLevel = 3;

    var Logger = (function () {
        function Logger() {
        }
        Logger.prototype.information = function () {
            return currentLogLevel >= 0 /* INFORMATION */;
        };

        Logger.prototype.debug = function () {
            return currentLogLevel >= 1 /* DEBUG */;
        };

        Logger.prototype.warning = function () {
            return currentLogLevel >= 2 /* WARNING */;
        };

        Logger.prototype.error = function () {
            return currentLogLevel >= 3 /* ERROR */;
        };

        Logger.prototype.fatal = function () {
            return currentLogLevel >= 4 /* FATAL */;
        };

        Logger.prototype.log = function (s) {
            //console.log(s);
        };
        return Logger;
    })();

    var Logger;
    (function (Logger) {
        function setLogLevel(value) {
            switch (value) {
                case "information":
                    currentLogLevel = 0 /* INFORMATION */;
                    break;
                case "debug":
                    currentLogLevel = 1 /* DEBUG */;
                    break;
                case "warning":
                    currentLogLevel = 2 /* WARNING */;
                    break;
                case "error":
                    currentLogLevel = 3 /* ERROR */;
                    break;
                case "fatal":
                    currentLogLevel = 4 /* FATAL */;
                    break;
            }
        }
        Logger.setLogLevel = setLogLevel;

        (function (Level) {
            Level[Level["INFORMATION"] = 0] = "INFORMATION";
            Level[Level["DEBUG"] = 1] = "DEBUG";
            Level[Level["WARNING"] = 2] = "WARNING";
            Level[Level["ERROR"] = 3] = "ERROR";
            Level[Level["FATAL"] = 4] = "FATAL";
        })(Logger.Level || (Logger.Level = {}));
        var Level = Logger.Level;
    })(Logger || (Logger = {}));

    
    return Logger;
});
