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
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", '../logger', './script'], function(require, exports, Logger, script) {
    var Services = TypeScript.Services;

    var LanguageServiceHost = (function (_super) {
        __extends(LanguageServiceHost, _super);
        function LanguageServiceHost(settings, files) {
            _super.call(this);
            this.settings = settings;
            this.files = files;
            this.settings = settings;
        }
        // TypeScript.IReferenceResolverHost
        LanguageServiceHost.prototype.getScriptSnapshot = function (path) {
            var scriptInfo = this.files.get(path);
            if (scriptInfo) {
                return new script.ScriptSnapshot(scriptInfo);
            }
            return null;
        };

        LanguageServiceHost.prototype.resolveRelativePath = function (path, directory) {
            return PathUtils.makePathAbsolute(path, directory);
        };

        LanguageServiceHost.prototype.fileExists = function (path) {
            return this.files.has(path);
        };

        LanguageServiceHost.prototype.directoryExists = function (path) {
            return true;
        };

        LanguageServiceHost.prototype.getParentDirectory = function (path) {
            return PathUtils.directory(path);
        };

        //ILanguageServiceHost implementations
        LanguageServiceHost.prototype.getCompilationSettings = function () {
            return this.settings;
        };

        LanguageServiceHost.prototype.getScriptFileNames = function () {
            return this.files.keys;
        };

        LanguageServiceHost.prototype.getScriptVersion = function (path) {
            var scriptInfo = this.files.get(path);
            if (scriptInfo) {
                return scriptInfo.version;
            }
            return 1;
        };

        LanguageServiceHost.prototype.getScriptIsOpen = function (path) {
            var scriptInfo = this.files.get(path);
            if (scriptInfo) {
                return scriptInfo.isOpen;
            }
            return false;
        };

        LanguageServiceHost.prototype.getScriptByteOrderMark = function (path) {
            var scriptInfo = this.files.get(path);
            if (scriptInfo) {
                return scriptInfo.byteOrderMark;
            }
            return 0 /* None */;
        };

        LanguageServiceHost.prototype.getDiagnosticsObject = function () {
            return new LanguageServicesDiagnostics("");
        };

        LanguageServiceHost.prototype.getLocalizedDiagnosticMessages = function () {
            return null;
        };
        return LanguageServiceHost;
    })(Logger);
    exports.LanguageServiceHost = LanguageServiceHost;

    var LanguageServicesDiagnostics = (function () {
        function LanguageServicesDiagnostics(destination) {
            this.destination = destination;
        }
        LanguageServicesDiagnostics.prototype.log = function (content) {
        };
        return LanguageServicesDiagnostics;
    })();
});
