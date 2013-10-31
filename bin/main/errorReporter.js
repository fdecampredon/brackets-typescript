define(["require", "exports", './logger'], function(require, exports, __Logger__) {
    
    var Logger = __Logger__;
    

    var logger = new Logger(), classifier = new Services.TypeScriptServicesFactory().createClassifier(logger);

    var TypeScriptErrorReporter = (function () {
        function TypeScriptErrorReporter(typescriptProjectManager, errorType) {
            this.name = 'TypeScript';
            this.typescriptProjectManager = typescriptProjectManager;
            this.errorType = errorType;
        }
        TypeScriptErrorReporter.prototype.scanFile = function (content, path) {
            var project = this.typescriptProjectManager.getProjectForFile(path);
            if (!project) {
                return { errors: [], aborted: true };
            }
            var languageService = project.getLanguageService(), languageServiceHost = project.getLanguageServiceHost(), scriptSnapshot = languageServiceHost.getScriptSnapshot(path);

            var syntacticDiagnostics = languageService.getSyntacticDiagnostics(path), errors = this.diagnosticToError(syntacticDiagnostics, scriptSnapshot);

            return {
                errors: errors,
                aborted: false
            };
        };

        TypeScriptErrorReporter.prototype.diagnosticToError = function (diagnostics, scriptSnapshot) {
            var _this = this;
            if (!diagnostics) {
                return [];
            }
            var lineMap = new TypeScript.LineMap(scriptSnapshot.getLineStartPositions(), scriptSnapshot.getLength());
            return diagnostics.map(function (diagnostic) {
                var lineCol = { line: -1, character: -1 };
                lineMap.fillLineAndCharacterFromPosition(diagnostic.start(), lineCol);
                var type, diagnosticCat = TypeScript.getDiagnosticInfoFromKey(diagnostic.diagnosticKey()).category;
                switch (diagnosticCat) {
                    case TypeScript.DiagnosticCategory.Error:
                        type = _this.errorType.ERROR;
                        break;
                    case TypeScript.DiagnosticCategory.Warning:
                        type = _this.errorType.WARNING;
                        break;
                    case TypeScript.DiagnosticCategory.NoPrefix:
                        type = _this.errorType.ERROR;
                        break;
                    case TypeScript.DiagnosticCategory.Message:
                        type = _this.errorType.META;
                        break;
                }

                return {
                    pos: {
                        line: lineCol.line,
                        ch: lineCol.character + 1
                    },
                    endpos: {
                        line: lineCol.line,
                        ch: lineCol.character + 1 + diagnostic.length()
                    },
                    message: diagnostic.message(),
                    type: type
                };
            });
        };
        return TypeScriptErrorReporter;
    })();
    exports.TypeScriptErrorReporter = TypeScriptErrorReporter;
});
