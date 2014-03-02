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


import project = require('./project');
import immediate = require('./utils/immediate');

//--------------------------------------------------------------------------
//
//  TypeScriptProject
//
//--------------------------------------------------------------------------

/**
 * TypeScript Inspection Provider
 */
class TypeScriptErrorReporter implements brackets.InspectionProvider {
    private typescriptProjectManager: project.TypeScriptProjectManager;
    
    constructor(
        private errorType: typeof brackets.ErrorType
    ) {}

    init(typescriptProjectManager: project.TypeScriptProjectManager) {
        this.typescriptProjectManager = typescriptProjectManager;
    }

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
