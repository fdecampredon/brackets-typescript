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

import ServiceConsumer = require('./serviceConsumer');
import ts = require('typescript');

var EditorManager = brackets.getModule('editor/EditorManager'),
    Editor = brackets.getModule('editor/Editor').Editor;



export function format() {
    var editor = EditorManager.getCurrentFullEditor();
    if (!editor) {
        return;
    }
    var useTabs = Editor.getUseTabChar();

    var options: ts.FormatCodeOptions = {
        InsertSpaceAfterCommaDelimiter: true,
        InsertSpaceAfterSemicolonInForStatements: true,
        InsertSpaceBeforeAndAfterBinaryOperators: true,
        InsertSpaceAfterKeywordsInControlFlowStatements: true,
        InsertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
        InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
        PlaceOpenBraceOnNewLineForFunctions: false,
        PlaceOpenBraceOnNewLineForControlBlocks: false,

        IndentSize: Editor.getSpaceUnits(),
        TabSize: Editor.getTabSize(),
        NewLineCharacter: '\n',
        ConvertTabsToSpaces: !Editor.getUseTabChar()
    };
    var currentRange = editor.getSelection(true),
        startPos = currentRange ? currentRange.start : undefined,
        endPos = currentRange ? currentRange.end : undefined;

    if (startPos && endPos && startPos.line === endPos.line && startPos.ch === endPos.ch) {
        startPos = endPos = undefined;
    }


    ServiceConsumer.getService().then(service => {
        service.getFormatingForFile(editor.document.file.fullPath, options, startPos, endPos).then(textEdits => {
            if (EditorManager.getCurrentFullEditor() !== editor) {
                return;
            }
            var pos = editor.getCursorPos();
            var scrollPos = editor.getScrollPos();
            var newText = textEdits.reduce((text, edit) => {
                return text.substr(0, edit.start) + edit.newText + text.substr(edit.end);
            }, editor.document.getText());
            
            editor.document.setText(newText);
            editor.setCursorPos(pos.line, pos.ch, false, false);
            editor.setScrollPos(scrollPos.x, scrollPos.y);
        });
    });
};

export var FORMAT_COMMAND_ID = 'fdecampred.brackets-typescript.format';

export var FORMAT_LABEL = 'Format';
