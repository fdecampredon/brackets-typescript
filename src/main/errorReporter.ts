import project = require('./project');

//--------------------------------------------------------------------------
//
//  TypeScriptProject
//
//--------------------------------------------------------------------------

/**
 * TypeScript Inspection Provider
 */
class TypeScriptErrorReporter implements brackets.InspectionProvider {
   
    constructor(
        private typescriptProjectManager: project.TypeScriptProjectManager, 
        private errorType: typeof brackets.ErrorType
    ) {}


    /**
     * name of the error reporter
     */
    name = 'TypeScript';
    
    /**
     * scan file
     */
    scanFile(content: string, path: string): { errors: brackets.LintingError[];  aborted: boolean } {
        try { 
            var project = this.typescriptProjectManager.getProjectForFile(path),
                languageService = project && project.getLanguageService();
            
            if (!project || !languageService) {
                return { errors: [],  aborted: true };
            }
            
            var syntacticDiagnostics = languageService.getSyntacticDiagnostics(path),
                errors = this.diagnosticToError(syntacticDiagnostics);
            
            if (errors.length === 0) {
                var semanticDiagnostic = languageService.getSemanticDiagnostics(path);
                errors = this.diagnosticToError(semanticDiagnostic);
            }
            
            return { 
                errors: errors, 
                aborted: false
            };
        } catch(e) {
            return { errors: [],  aborted: true };
        }
    }
    
    /**
     * convert TypeScript Diagnostic or brackets error format
     * @param diagnostics
     * @param scriptSnapshot
     */
    private diagnosticToError(diagnostics: TypeScript.Diagnostic[]): brackets.LintingError[] {
        if (!diagnostics) {
            return [];
        }
        return diagnostics.map(diagnostic => {
            var info = diagnostic.info(),
                type: brackets.ErrorType;
            
            switch(info.category) {
                case TypeScript.DiagnosticCategory.Error:
                    type = this.errorType.ERROR;
                    break;
                case TypeScript.DiagnosticCategory.Warning:
                    type = this.errorType.WARNING;
                    break;
                case TypeScript.DiagnosticCategory.NoPrefix:
                    type = this.errorType.ERROR;
                    break;
                case TypeScript.DiagnosticCategory.Message:
                    type = this.errorType.META;
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
    }   
}

export = TypeScriptErrorReporter
