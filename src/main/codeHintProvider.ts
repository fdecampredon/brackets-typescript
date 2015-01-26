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

//TODO that part of the application is not well tested and just 'work' it needs to be refactored

import ServiceConsumer = require('./serviceConsumer');
import TypeScriptProjectService = require('typescript-project-services');
import ts = require('typescript');



var HINT_TEMPLATE = [
    '<span class="cm-s-default ts-code-hint">',
'       <span class="ts-type-icon {{classType}}" />',
    '   <span class="ts-hint-text">',
    '       <span style="font-weight: bold">{{match}}</span>{{suffix}}',
    '   </span>',
    '   <span class="ts-hint-details">',
    '       {{details}}',
    '   </span>',
    '   <span class="ts-hint-doc">',
    '       {{doc}}',
    '   </span>',
    '</span>'
].join('\n');





var editor: brackets.Editor;

/**
 * return true if hints can be calculated for te current editor
 * 
 * @param editor the editor
 * @param implicitChar determine whether the hinting request is explicit or implicit, 
 * null if implicit, contains the last character inserted
 */
export function hasHints(hostEditor: brackets.Editor, implicitChar: string): boolean {
    //TODO we should find a better test here that limits more the implicit request
    if (!implicitChar || /[\w.\($_]/.test(implicitChar)) {
        editor = hostEditor;
        return true;
    }
    return false;
}




export function getHints(implicitChar: string): JQueryDeferred<brackets.HintResult> {
    var currentFileName: string = editor.document.file.fullPath, 
        position = editor.getCursorPos(),
        deferred = $.Deferred();
    if (!hasHints(editor, implicitChar)) {
        deferred.resolve({
            hints: [],
            selectInitial: false 
        });
    } else {

        ServiceConsumer.getService().then(service => {
            var index = editor.indexFromPos(position)
            
            service.getCompletionAtPosition(currentFileName, index).then(result => {
                deferred.resolve({
                    hints: result.entries.map(entry => {
                        var text = entry.name,
                            match: string,
                            suffix: string,
                            classType = getClassTypeForEntry(entry.kind);
                        
                        
                        
 
                        if (result.match) {
                            match = text.slice(0, result.match.length);
                            suffix  = text.slice(result.match.length);

                        } else {
                            match = '';
                            suffix = text;
                        }

                        var jqueryObj = $(Mustache.render(HINT_TEMPLATE, {
                            match: match,
                            suffix: suffix,
                            classType: classType,
                            details: entry.displayParts && entry.displayParts.map(part => part.text).join(''),
                            doc: entry.documentation && entry.documentation.map(part => part.text).join(''),
                        })); 
                        jqueryObj.data('entry', entry);
                        jqueryObj.data('match', result.match);

                        return jqueryObj;

                    }),
                    selectInitial: !!implicitChar
                });
            }).catch(error => deferred.reject(error));
        });
    }
    return deferred;
}



export function insertHint($hintObj: JQuery): void {
    var entry: any= $hintObj.data('entry'),
        match: string = $hintObj.data('match'), 
        position = editor.getCursorPos(),
        startPos = !match ? 
            position : 
            {
                line : position.line,
                ch : position.ch - match.length
            }
        ;


    editor.document.replaceRange(entry.name, startPos, position);
}




function getClassTypeForEntry(kind: string) {
    switch (kind) {
        case ts.ScriptElementKind.primitiveType:
        case ts.ScriptElementKind.keyword:
            return "ts-keyword";

     
        case ts.ScriptElementKind.memberVariableElement:
        case ts.ScriptElementKind.memberGetAccessorElement:
        case ts.ScriptElementKind.memberSetAccessorElement:
            return "ts-field";
            
        case ts.ScriptElementKind.constElement: 
        case ts.ScriptElementKind.letElement: 
        case ts.ScriptElementKind.variableElement:
        case ts.ScriptElementKind.localVariableElement:
        case ts.ScriptElementKind.parameterElement:
            return "ts-variable";
            
        case ts.ScriptElementKind.functionElement:
        case ts.ScriptElementKind.constructSignatureElement:
        case ts.ScriptElementKind.callSignatureElement:
        case ts.ScriptElementKind.localFunctionElement:
            return "ts-function";
            
        case ts.ScriptElementKind.memberFunctionElement:
            return "ts-method";
            
        case ts.ScriptElementKind.constructorImplementationElement:
            return "ts-constructor"
            
        case ts.ScriptElementKind.moduleElement:
            return "ts-module";
            
        case ts.ScriptElementKind.classElement:
            return "ts-class";
            
        case ts.ScriptElementKind.interfaceElement:
        case ts.ScriptElementKind.typeElement:
            return "ts-interface";
            
        case ts.ScriptElementKind.enumElement:
            return "ts-enum";
   
        case ts.ScriptElementKind.alias:
            return "ts-reference";
            
        case ts.ScriptElementKind.unknown:
        case ts.ScriptElementKind.indexSignatureElement:
        case ts.ScriptElementKind.typeParameterElement:
        case ts.ScriptElementKind.scriptElement:
        case ts.ScriptElementKind.label:
        default:
            return "";
            
        
    }
}
