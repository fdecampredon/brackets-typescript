var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", '../logger', './script'], function(require, exports, __Logger__, __script__) {
    var Logger = __Logger__;
    var script = __script__;
    var Services = TypeScript.Services;

    var LanguageServiceHost = (function (_super) {
        __extends(LanguageServiceHost, _super);
        function LanguageServiceHost(settings, files) {
            _super.call(this);
            this.files = {};
            this.settings = settings;
            if (typeof files !== 'undefined') {
                for (var path in files) {
                    if (files.hasOwnProperty(path)) {
                        this.addScript(path, files[path]);
                    }
                }
            }
        }
        LanguageServiceHost.prototype.addScript = function (path, content) {
            var scriptInfo = new script.ScriptInfo(path, content);
            this.files[path] = scriptInfo;
        };

        LanguageServiceHost.prototype.updateScript = function (path, content) {
            var script = this.files[path];
            if (script) {
                script.updateContent(content);
                return;
            }
            this.addScript(path, content);
        };

        LanguageServiceHost.prototype.editScript = function (path, minChar, limChar, newText) {
            var script = this.files[path];
            if (script) {
                script.editContent(minChar, limChar, newText);
                return;
            }
            throw new Error("No script with name '" + path + "'");
        };

        LanguageServiceHost.prototype.removeScript = function (path) {
            delete this.files[path];
        };

        LanguageServiceHost.prototype.lineColToPosition = function (path, line, col) {
            var script = this.files[path];
            if (script) {
                var position = script.getPositionFromLine(line, col);
                if (!isNaN(position)) {
                    return position;
                }
            }
            return -1;
        };

        LanguageServiceHost.prototype.postionToLineAndCol = function (path, position) {
            var script = this.files[path];
            if (script) {
                return script.getLineAndColForPositon(position);
            }
            return null;
        };

        LanguageServiceHost.prototype.setScriptIsOpen = function (path, isOpen) {
            var script = this.files[path];
            if (script) {
                script.isOpen = true;
            }
        };

        LanguageServiceHost.prototype.getScriptSnapshot = function (path) {
            var scriptInfo = this.files[path];
            if (scriptInfo) {
                return new script.ScriptSnapshot(scriptInfo);
            }
            return null;
        };

        LanguageServiceHost.prototype.resolveRelativePath = function (path, directory) {
            return PathUtils.makePathAbsolute(path, directory);
        };

        LanguageServiceHost.prototype.fileExists = function (path) {
            return !!this.files[path];
        };

        LanguageServiceHost.prototype.directoryExists = function (path) {
            return true;
        };

        LanguageServiceHost.prototype.getParentDirectory = function (path) {
            return PathUtils.directory(path);
        };

        LanguageServiceHost.prototype.getCompilationSettings = function () {
            return this.settings;
        };

        LanguageServiceHost.prototype.getScriptFileNames = function () {
            return Object.keys(this.files);
        };

        LanguageServiceHost.prototype.getScriptVersion = function (path) {
            var scriptInfo = this.files[path];
            if (scriptInfo) {
                return scriptInfo.version;
            }
            return 1;
        };

        LanguageServiceHost.prototype.getScriptIsOpen = function (path) {
            var scriptInfo = this.files[path];
            if (scriptInfo) {
                return scriptInfo.isOpen;
            }
            return false;
        };

        LanguageServiceHost.prototype.getScriptByteOrderMark = function (path) {
            var scriptInfo = this.files[path];
            if (scriptInfo) {
                return scriptInfo.byteOrderMark;
            }
            return TypeScript.ByteOrderMark.None;
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
