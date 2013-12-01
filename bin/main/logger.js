define(["require", "exports"], function(require, exports) {
    'use strict';

    var currentLogLevel = 3;

    var Logger = (function () {
        function Logger() {
        }
        Logger.prototype.information = function () {
            return currentLogLevel >= Logger.Level.INFORMATION;
        };

        Logger.prototype.debug = function () {
            return currentLogLevel >= Logger.Level.DEBUG;
        };

        Logger.prototype.warning = function () {
            return currentLogLevel >= Logger.Level.WARNING;
        };

        Logger.prototype.error = function () {
            return currentLogLevel >= Logger.Level.ERROR;
        };

        Logger.prototype.fatal = function () {
            return currentLogLevel >= Logger.Level.FATAL;
        };

        Logger.prototype.log = function (s) {
        };
        return Logger;
    })();

    var Logger;
    (function (Logger) {
        function setLogLevel(value) {
            switch (value) {
                case "information":
                    currentLogLevel = Level.INFORMATION;
                    break;
                case "debug":
                    currentLogLevel = Level.DEBUG;
                    break;
                case "warning":
                    currentLogLevel = Level.WARNING;
                    break;
                case "error":
                    currentLogLevel = Level.ERROR;
                    break;
                case "fatal":
                    currentLogLevel = Level.FATAL;
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
