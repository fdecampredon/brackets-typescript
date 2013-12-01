define(["require", "exports"], function(require, exports) {
    

    var TypeScriptErrorReporter = (function () {
        function TypeScriptErrorReporter(typescriptProjectManager, errorType) {
            this.typescriptProjectManager = typescriptProjectManager;
            this.errorType = errorType;
            this.name = 'TypeScript';
        }
        TypeScriptErrorReporter.prototype.scanFile = function (content, path) {
            var project = this.typescriptProjectManager.getProjectForFile(path), languageService = project && project.getLanguageService(), languageServiceHost = project && project.getLanguageServiceHost(), scriptSnapshot = languageServiceHost && languageServiceHost.getScriptSnapshot(path);

            if (!project || !languageService || !languageServiceHost) {
                return { errors: [], aborted: true };
            }

            var syntacticDiagnostics = languageService.getSyntacticDiagnostics(path), errors = this.diagnosticToError(syntacticDiagnostics, scriptSnapshot);

            if (errors.length === 0) {
                var semanticDiagnostic = languageService.getSemanticDiagnostics(path);
                errors = this.diagnosticToError(semanticDiagnostic, scriptSnapshot);
            }

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
            return diagnostics.map(function (diagnostic) {
                var info = diagnostic.info(), type;

                switch (info.category) {
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
                        line: diagnostic.line(),
                        ch: diagnostic.character()
                    },
                    endpos: {
                        line: diagnostic.line(),
                        ch: diagnostic.character() + diagnostic.length()
                    },
                    message: diagnostic.message(),
                    type: type
                };
            });
        };
        return TypeScriptErrorReporter;
    })();

    
    return TypeScriptErrorReporter;
});
