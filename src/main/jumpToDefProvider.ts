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

var EditorManager = brackets.getModule('editor/EditorManager'),
    Commands = brackets.getModule('command/Commands'),
    CommandManager = brackets.getModule('command/CommandManager');

    
function jumpToDefProvider(editor: brackets.Editor, pos: CodeMirror.Position): JQueryPromise<boolean>  {

    if (!editor || editor.getModeForSelection() !== 'typescript') {
        return null;
    }

    var fileName = editor.document.file.fullPath,
        deferred = $.Deferred();

    ServiceConsumer.getService().then(service => {
        service.getDefinitionAtPosition(fileName, editor.indexFromPos(pos)).then(definitions => {
            if (!definitions || definitions.length === 0) {
                deferred.reject();
            }

            var codeMirror = (<any>editor._codeMirror);
            if (codeMirror) {
                definitions = definitions.filter(definition => 
                    definition.fileName !== fileName || 
                    codeMirror.posFromIndex(definition.textSpan.start).line !== pos.line
                );
            }
            if (definitions.length === 0) {
                deferred.reject();
            }
            if (editor === EditorManager.getFocusedEditor()) {
                if (editor.getCursorPos().line === pos.line) {
                    var def = definitions[0];
                    if (def.fileName === fileName) {
                        setPositionFromDef(editor, def.textSpan);
                        deferred.resolve(true);
                    } else {
                        CommandManager.execute(Commands.FILE_OPEN, {fullPath: def.fileName}).then(function () {
                            var editor = EditorManager.getFocusedEditor();
                            setPositionFromDef(editor, def.textSpan);
                            deferred.resolve(true);
                        }, () => deferred.reject());
                    }
                    return;
                }
            }
            deferred.reject();
        }, () => deferred.reject()); 
    });
    return deferred.promise();
};


function setPositionFromDef(editor: brackets.Editor, span: { start: number; length: number}) {
    var codeMirror = (<any>editor._codeMirror);
    var pos = codeMirror.posFromIndex(span.start);
    editor.setCursorPos(pos.line, pos.ch, true, true);
}

export = jumpToDefProvider;
