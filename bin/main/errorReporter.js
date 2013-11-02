define(["require", "exports", './logger'], function(require, exports, __Logger__) {
    
    var Logger = __Logger__;
    
    var Services = TypeScript.Services;

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
    exports.TypeScriptErrorReporter = TypeScriptErrorReporter;
});
