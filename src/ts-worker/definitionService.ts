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
import es6Promise = require('es6-promise');
import definition = require('../commons/definition')
import Promise = es6Promise.Promise;;


class DefinitionService implements definition.DefinitionService {
    
    constructor(
        private projectManager: TypeScriptProjectManager
    ) {}
    
    getDefinitionForFile(fileName: string, position: CodeMirror.Position): Promise<definition.DefinitionInfo[]> {
        return this.projectManager.getProjectForFile(fileName).then(project => {
            var languageService = project.getLanguageService(),
                languageServiceHost = project.getLanguageServiceHost(),
                index = languageServiceHost.getIndexFromPos(fileName, position);
            if (index < 0) {
                return [];
            }
            return languageService.getDefinitionAtPosition(fileName, index).map(definition => {
                var startPos = languageServiceHost.indexToPosition(definition.fileName, definition.minChar),
                    endPos = languageServiceHost.indexToPosition(definition.fileName, definition.limChar);
                return {
                    path: definition.fileName,
                    name: (definition.containerName ? (definition.containerName + '.') : '') + definition.name,
                    lineStart : startPos.line,
                    charStart : startPos.ch,
                    lineEnd : endPos.line,
                    charEnd : endPos.ch,
                    fileName: definition.fileName
                }
            });
        }).catch(() => [])
    }
}


export = DefinitionService;