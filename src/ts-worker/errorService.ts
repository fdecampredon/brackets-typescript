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

'use strict'


import TypeScriptProjectManager = require('./projectManager');

 var Type = {
    /** Unambiguous error, such as a syntax error */
    ERROR: "problem_type_error",
    /** Maintainability issue, probable error / bad smell, etc. */
    WARNING: "problem_type_warning",
    /** Inspector unable to continue, code too complex for static analysis, etc. Not counted in error/warning tally. */
    META: "problem_type_meta"
};

class ErrorService {
    
    constructor(
        private projectManager: TypeScriptProjectManager
    ) {}

    
    getErrorsForFile(fileName: string): JQueryPromise<{ errors: brackets.LintingError[];  aborted: boolean }> {
        return this.projectManager.getProjectForFile(fileName).then(project => {
            var languageService = project.getLanguageService(),
                syntacticDiagnostics = languageService.getSyntacticDiagnostics(fileName),
                errors = this.diagnosticToError(syntacticDiagnostics);
            
            if (errors.length === 0) {
                var semanticDiagnostic = languageService.getSemanticDiagnostics(fileName);
                errors = this.diagnosticToError(semanticDiagnostic);
            }
            
            return { 
                errors: errors, 
                aborted: false
            };
        }, () => {
            return { 
                errors: [], 
                aborted: false
            }    
        })
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
                type: string
            
            switch(info.category) {
                case TypeScript.DiagnosticCategory.Error:
                    type = Type.ERROR;
                    break;
                case TypeScript.DiagnosticCategory.Warning:
                    type = Type.WARNING;
                    break;
                case TypeScript.DiagnosticCategory.NoPrefix:
                    type = Type.ERROR;
                    break;
                case TypeScript.DiagnosticCategory.Message:
                    type = Type.META;
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

export = ErrorService;