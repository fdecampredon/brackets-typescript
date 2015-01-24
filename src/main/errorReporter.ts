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

var DocumentManager = brackets.getModule('document/DocumentManager');
var CodeInspection = brackets.getModule('language/CodeInspection');

import ServiceConsumer = require('./serviceConsumer');
import immediate = require('./immediate');
import ts = require('typescript');


//--------------------------------------------------------------------------
//
//  TypeScriptProject
//
//--------------------------------------------------------------------------

function diagCategoryToType(category: ts.DiagnosticCategory): string {
    switch(category) {
        case ts.DiagnosticCategory.Message:
            return CodeInspection.Type.META;
        case ts.DiagnosticCategory.Error:
            return CodeInspection.Type.ERROR;
        case ts.DiagnosticCategory.Warning:
            return CodeInspection.Type.WARNING;
    }
}

/**
 * TypeScript Inspection Provider
 */
    
/**
 * name of the error reporter
 */
export var name = 'TypeScript';
    
    /**
     * scan file
     */
export function scanFileAsync(content: string, path: string): JQueryPromise<{ errors: brackets.LintingError[];  aborted: boolean }> {
    return $.Deferred(deferred => {
        immediate.setImmediate(() => {
            ServiceConsumer.getService().then(service => {
                service.getDiagnosticsForFile(path)
                    .then(diagnostics => {
                        var document: any = DocumentManager.getOpenDocumentForPath(path);
                        document._ensureMasterEditor();
                        var codeMirror = document._masterEditor._codeMirror;
                        deferred.resolve({
                            errors: diagnostics.map(diagnostic => ({
                                pos: codeMirror.posFromIndex(diagnostic.start),
                                endPos: codeMirror.posFromIndex(diagnostic.start + diagnostic.length),
                                message: diagnostic.messageText,
                                type: diagCategoryToType(diagnostic.category)
                            })),
                            aborted: false
                        });
                    }, (e) => {
                        deferred.reject(e);
                    });
            });    
        });
    }).promise();
}

