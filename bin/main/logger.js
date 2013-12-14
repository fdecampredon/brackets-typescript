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
