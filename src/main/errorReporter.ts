import project = require('./project');
import Logger = require('./logger');
import language = require('./typescript/language');
import Services = TypeScript.Services;

var logger = new Logger(),
    classifier = new Services.TypeScriptServicesFactory().createClassifier(logger);

export class TypeScriptErrorReporter implements brackets.InspectionProvider {
    private typescriptProjectManager: project.TypeScriptProjectManager;
    private errorType: typeof brackets.ErrorType;
    
    name = 'TypeScript';
    
    constructor(typescriptProjectManager: project.TypeScriptProjectManager, errorType: typeof brackets.ErrorType) {
        this.typescriptProjectManager = typescriptProjectManager;
        this.errorType = errorType;
    }
    
    scanFile(content: string, path: string):{ errors: brackets.LintingError[];  aborted: boolean } {
        var project = this.typescriptProjectManager.getProjectForFile(path);
        if (!project) {
            return { errors: [],  aborted: true };
        }
        var languageService= project.getLanguageService(),
            languageServiceHost = project.getLanguageServiceHost(),
            scriptSnapshot = languageServiceHost.getScriptSnapshot(path);
        
        var syntacticDiagnostics = languageService.getSyntacticDiagnostics(path),
            errors = this.diagnosticToError(syntacticDiagnostics, scriptSnapshot);
       
       
        if (errors.length === 0) {
            var semanticDiagnostic = languageService.getSemanticDiagnostics(path);
            errors = this.diagnosticToError(semanticDiagnostic, scriptSnapshot);
        }
        
        return { 
            errors: errors, aborted: false
        };
    }
    
    private diagnosticToError(diagnostics: TypeScript.Diagnostic[], scriptSnapshot: TypeScript.IScriptSnapshot): brackets.LintingError[] {
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
