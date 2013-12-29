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

///<reference path="./references.ts" />

'use strict';


import LanguageServiceHost = require('./languageServiceHost');
import Logger = require('./logger');
import collections = require('../commons/collections');
import operations = require('../commons/tsOperations');

var languageService: TypeScript.Services.ILanguageService,
    languageServiceHost: LanguageServiceHost,
    coreService: TypeScript.Services.CoreServices;


function init(compilationSettings: TypeScript.CompilationSettings, map: collections.StringMap<string>): void {
    var factory = new TypeScript.Services.TypeScriptServicesFactory();
    
    languageServiceHost = new LanguageServiceHost(compilationSettings, map);
    languageService = factory.createPullLanguageService(languageServiceHost);
    coreService = factory.createCoreServices({
        logger: new Logger()
    });
}

function getReferencedOrImportedFiles(fileName: string): string[] {
    var scriptSnapShot = languageServiceHost.getScriptSnapshot(fileName);
    if (!scriptSnapShot) {
        return null;
    }
    
    var preProcessedFileInfo = coreService.getPreProcessedFileInfo(fileName, scriptSnapShot);
    return preProcessedFileInfo.referencedFiles.map(fileReference => {
        return PathUtils.makePathAbsolute(fileReference.path, fileName);
    }).concat(preProcessedFileInfo.importedFiles.map(fileReference => {
        return PathUtils.makePathAbsolute(fileReference.path + '.ts', fileName);
    }));
}

function getSyntacticDiagnostics(fileName: string): TypeScript.Diagnostic[] {
    return languageService.getSyntacticDiagnostics(fileName);
}

function getSemanticDiagnostics(fileName: string): TypeScript.Diagnostic[] {
    return languageService.getSemanticDiagnostics(fileName);
}


function getCompletionsAtPosition(fileName: string, position: CodeMirror.Position): TypeScript.Services.CompletionInfo {
    var index = languageServiceHost.getIndexFromPos(fileName, position);
    return languageService.getCompletionsAtPosition(fileName, index, true);
}

function getCompletionEntryDetails(fileName: string, position: CodeMirror.Position, entryName: string): TypeScript.Services.CompletionEntryDetails  {
    var index = languageServiceHost.getIndexFromPos(fileName, position);
    return languageService.getCompletionEntryDetails(fileName, index, entryName);
}

function getDefinitionAtPosition(fileName: string, position: CodeMirror.Position): TypeScript.Services.DefinitionInfo[]  {
    var index = languageServiceHost.getIndexFromPos(fileName, position);
    return languageService.getDefinitionAtPosition(fileName, index);
}
 
function cleanupSemanticCache(): void {
    languageService.cleanupSemanticCache();
}

var Operations = operations.TypeScriptOperation

declare function postMessage(args: any): void;

onmessage = (event: MessageEvent) => {
    var data : {
        operation: operations.TypeScriptOperation;
        args: any[];
    };
    
    data = event.data;
    var result: any[];
    try {
        switch (data.operation) {
            case Operations.GET_REFERENCES:
                result = getReferencedOrImportedFiles.apply(undefined, data.args);
                break;
            case Operations.GET_COMPLETION:
                result = getCompletionsAtPosition.apply(undefined, data.args);
                break;
        }
    } catch (error) {
        postMessage({
            isError: true,
            error: error
        });
    }
    postMessage(result);
}