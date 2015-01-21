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
    '   <span class="{{classType}}">',
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
            service.getCompletionAtPosition(currentFileName, position).then(result => {
                deferred.resolve({
                    hints: result.entries.map(entry => {
                        var text = entry.name,
                            match: string,
                            suffix: string,
                            classType = '';


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


