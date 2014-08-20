//   Copyright 2013-2014 François de Campredon
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

'use strict';

import TypeScriptProjectManager = require('./projectManager');
import LanguageServiceHost = require('./languageServiceHost');
import Promise = require('bluebird');
import IErrorService = require('../commons/errorService');

/**
 * brackets Error message type
 */
var Type = {
    /** Unambiguous error, such as a syntax error */
    ERROR: 'problem_type_error',
    /** Maintainability issue, probable error / bad smell, etc. */
    WARNING: 'problem_type_warning',
    /** Inspector unable to continue, code too complex for static analysis, etc. Not counted in error/warning tally. */
    META: 'problem_type_meta'
};

/**
 * implementation of the IErrorService
 */
class ErrorService implements IErrorService {
    
    /**
     * @param projectManager the Project manager used by the service to retrieve project
     */
    constructor(
        private projectManager: TypeScriptProjectManager
    ) {}

    /**
     * Retrieve a list of errors for a given file
     * @param fileName the absolute path of the file 
     * 
     * @return a promise resolving to a list of errors
     */
    getErrorsForFile(fileName: string): Promise<{ errors: brackets.LintingError[];  aborted: boolean }> {
        return this.projectManager.getProjectForFile(fileName).then(project => {
            var languageService = project.getLanguageService(),
                syntacticDiagnostics = languageService.getSyntacticDiagnostics(fileName),
                errors = this.diagnosticToError(project.getLanguageServiceHost(), syntacticDiagnostics);
            
            if (errors.length === 0) {
                var semanticDiagnostic = languageService.getSemanticDiagnostics(fileName);
                errors = this.diagnosticToError(project.getLanguageServiceHost(), semanticDiagnostic);
            }
            
            return { 
                errors: errors, 
                aborted: false
            };
        }).catch(() => {
            return { 
                errors: [], 
                aborted: false
            };    
        });
    }
    
    /**
     * convert TypeScript Diagnostic to brackets error format
     * @param diagnostics
     */
    private diagnosticToError(languageServiceHost: LanguageServiceHost, diagnostics: ts.Diagnostic[]): brackets.LintingError[] {
        if (!diagnostics) {
            return [];
        }
        return diagnostics.map(diagnostic => {
            var type: string;
            
            switch (diagnostic.category) {
                case ts.DiagnosticCategory.Error:
                    type = Type.ERROR;
                    break;
                case ts.DiagnosticCategory.Warning:
                    type = Type.WARNING;
                    break;
                case ts.DiagnosticCategory.Message:
                    type = Type.META;
                    break;
            }
            
            return {
                pos: languageServiceHost.indexToPosition(diagnostic.file.filename, diagnostic.start),
                endpos: languageServiceHost.indexToPosition(diagnostic.file.filename, diagnostic.start + diagnostic.length),
                message: diagnostic.messageText,
                type: type
            };
        });
    }
}

export = ErrorService;
