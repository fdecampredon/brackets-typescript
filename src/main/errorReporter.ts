import project = require('./project');
import Logger = require('./logger');
import language = require('./typescript/language');

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
       
        /*  semantic errors take too much time
            if (errors.length === 0) {
            var semanticDiagnostic = languageService.getSemanticDiagnostics(path);
            errors = this.diagnosticToError(semanticDiagnostic, scriptSnapshot);
        }*/
        
        return { 
            errors: errors, aborted: false
        };
    }
    
    private diagnosticToError(diagnostics: TypeScript.Diagnostic[], scriptSnapshot: TypeScript.IScriptSnapshot): brackets.LintingError[] {
        if (!diagnostics) {
            return [];
        }
        var lineMap = new TypeScript.LineMap(scriptSnapshot.getLineStartPositions(), scriptSnapshot.getLength());
        return diagnostics.map((diagnostic: TypeScript.Diagnostic) => {
            var lineCol = { line: -1, character: -1 };
            lineMap.fillLineAndCharacterFromPosition(diagnostic.start(), lineCol);
            var type,
                diagnosticCat = TypeScript.getDiagnosticInfoFromKey(diagnostic.diagnosticKey()).category;
            switch(diagnosticCat) {
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
    }   
}
