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


'use strict';


import LanguageServiceHost = require('./languageServiceHost');
import Logger = require('./logger');
import collections = require('../commons/collections');
import TypeScriptOperation = require('../commons/tsOperations');


class TypeScriptService {
    languageService: TypeScript.Services.ILanguageService;
    languageServiceHost: LanguageServiceHost;
    coreService: TypeScript.Services.CoreServices;
    
    
    constructor(compilationSettings: TypeScript.CompilationSettings) {
        var factory = new TypeScript.Services.TypeScriptServicesFactory();
        
        this.languageServiceHost = new LanguageServiceHost(compilationSettings);
        this.languageService = factory.createPullLanguageService(this.languageServiceHost);
        this.coreService = factory.createCoreServices({
            logger: new Logger()
        });
    }
    
    getReferencedOrImportedFiles(fileName: string): string[] {
        var scriptSnapShot = this.languageServiceHost.getScriptSnapshot(fileName);
        if (!scriptSnapShot) {
            return null;
        }
        
        var preProcessedFileInfo = this.coreService.getPreProcessedFileInfo(fileName, scriptSnapShot);
        return preProcessedFileInfo.referencedFiles.map(fileReference => {
            return PathUtils.makePathAbsolute(fileReference.path, fileName);
        }).concat(preProcessedFileInfo.importedFiles.map(fileReference => {
            return PathUtils.makePathAbsolute(fileReference.path + '.ts', fileName);
        }));
    }
    
    getSyntacticDiagnostics(fileName: string): TypeScript.Diagnostic[] {
        return this.languageService.getSyntacticDiagnostics(fileName);
    }
    
    getSemanticDiagnostics(fileName: string): TypeScript.Diagnostic[] {
        return this.languageService.getSemanticDiagnostics(fileName);
    }
    
    getAllErrors() {
        var errors: TypeScript.Diagnostic[] = [];
        this.languageServiceHost.fileNameToScript.keys.forEach(fileName => {
            var syntacticError = this.languageService.getSyntacticDiagnostics(fileName)
                                            .filter(diagnostic => diagnostic.info().category === TypeScript.DiagnosticCategory.Error);
            if (syntacticError.length > 0) {
                errors = errors.concat(errors);
                return;
            }
            
            var sementicErrors = this.languageService.getSemanticDiagnostics(fileName)
                                            .filter(diagnostic => diagnostic.info().category === TypeScript.DiagnosticCategory.Error);
            errors = errors.concat(errors);
        });
        
        return errors.map(error => ({
            text: error.text(),
            file: error.fileName(),
            position: {
                line : error.line(),
                ch: error.character()
            },
            length: error.length()
        }));
    }
    
    
    getCompletionsAtPosition(fileName: string, position: CodeMirror.Position): TypeScript.Services.CompletionEntry[] {
        var index = this.languageServiceHost.getIndexFromPos(fileName, position);
        var completion = this.languageService.getCompletionsAtPosition(fileName, index, true);
        return completion && completion.entries;
    }
    
    getCompletionEntryDetails(fileName: string, position: CodeMirror.Position, entryName: string): TypeScript.Services.CompletionEntryDetails  {
        var index = this.languageServiceHost.getIndexFromPos(fileName, position);
        return this.languageService.getCompletionEntryDetails(fileName, index, entryName);
    }
    
    getDefinitionAtPosition(fileName: string, position: CodeMirror.Position)  {
        var index = this.languageServiceHost.getIndexFromPos(fileName, position);
        var defs = this.languageService.getDefinitionAtPosition(fileName, index) || [];
        return defs.map(definition => ({
            fileName: definition.fileName,
            minChar: this.languageServiceHost.indexToPosition(definition.fileName, definition.minChar),
            limChar: this.languageServiceHost.indexToPosition(definition.fileName, definition.limChar),
            kind: definition.kind,
            name: definition.name,
            containerKind: definition.containerKind,
            containerName: definition.containerName
        }));
    }
     
    cleanupSemanticCache(): void {
        this.languageService.cleanupSemanticCache();
    }
}

var servicesMap = new collections.StringMap<TypeScriptService>();

declare function postMessage(args: any): void;

export function messageHandler(event: MessageEvent) {
    var data : {
        uid : string;
        operation: TypeScriptOperation;
        args: any[];
    };
    
    data = event.data;
    
    var result: any;
    if (data.operation === TypeScriptOperation.INIT ) {
        servicesMap.set(data.uid ,new TypeScriptService(data.args[0]));
    } else {
        var service = servicesMap.get(data.uid);
        if (!service) {
            throw new Error('unknow service for uid : ' + data.uid);
        }
        switch(data.operation) {
            case TypeScriptOperation.ADD_FILE:
                result = service.languageServiceHost.addScript(data.args[0], data.args[1]);
                break;
            case TypeScriptOperation.UPDATE_FILE:
                result = service.languageServiceHost.updateScript(data.args[0], data.args[1]);
                break;
            case TypeScriptOperation.REMOVE_FILE:
                result = service.languageServiceHost.removeScript(data.args[0]);
                break;
            case TypeScriptOperation.EDIT_FILE:
                var fileName: string = data.args[0],
                    minChar = service.languageServiceHost.getIndexFromPos(fileName, data.args[1]),
                    limChar = service.languageServiceHost.getIndexFromPos(fileName, data.args[2]),
                    newText = data.args[3];
                result = service.languageServiceHost.editScript(fileName, minChar, limChar, newText);
                
                break;
            case TypeScriptOperation.SET_SCRIPT_IS_OPEN:
                result = service.languageServiceHost.setScriptIsOpen(data.args[0], data.args[1]);
                break;
            case TypeScriptOperation.GET_REFERENCES:
                result = service.getReferencedOrImportedFiles(data.args[0]);
                break;
            case TypeScriptOperation.GET_DEFINITIONS:
                result = service.getDefinitionAtPosition(data.args[0], data.args[1]);
                break;
            case TypeScriptOperation.GET_COMPLETIONS:
                result = service.getCompletionsAtPosition(data.args[0], data.args[1]);
                break;
            case TypeScriptOperation.GET_ERRORS:
                result = service.getAllErrors();
                break;
            default:
                throw new Error('unknow operation : '+ TypeScriptOperation[data.operation]);
        }
    }
    postMessage({
        uid: data.uid,
        result: result
    });
}