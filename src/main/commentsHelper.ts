/*
 * Copyright (c) 2012 Peter Flynn.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the 'Software'),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

'use strict';

import signal = require('./utils/signal');
import Logger = require('./logger');
import project = require('project');
import Services = TypeScript.Services;

// Brackets modules
var EditorManager       = brackets.getModule('editor/EditorManager'),
    DocumentManager     = brackets.getModule('document/DocumentManager'),
    KeyEvent            = brackets.getModule('utils/KeyEvent'),
    StringUtils         = brackets.getModule('utils/StringUtils');


// TODO:
//
//
// - pressing enter just after /** (or just typing the second "*"?) should include auto-generated "@param {} <argname>" blocks
//   if next line includes function-like code (via regexp)
//   (see https://github.com/davidderaedt/annotate-extension ?)
//
// - gesture to re-word-wrap a comment block
//
// - pressing enter in *middle* of //-style comment should split it onto second line with // prefix

/**
 * 
 */
function handleEnterKey(editor: brackets.Editor): boolean {
    var cursor = editor.getCursorPos(),
        token = editor._codeMirror.getTokenAt(cursor),
        insert: string,
        newPosition: CodeMirror.Position
    if (token.state.eolState === Services.EndOfLineState.InMultiLineCommentTrivia) {
        if (!StringUtils.endsWith(token.string, '*/') || cursor.ch < token.end) {
            var line = editor.document.getLine(cursor.line),
                index = line.search(/[\/*]/),
                indent = line.substr(0, index);
            
            if (index != -1 && indent.match(/^\s*$/)) {
                var isFirstLineComment: boolean = (line.substr(index, 2) === '/*'),
                    isClosed: boolean = false,
                    currentLineNumber: number = cursor.line + 1,
                    firstNonBlankIndex: number;
                while (true) {
                    line = editor.document.getLine(currentLineNumber)
                    if (line === undefined ) {
                        break;
                    } else {
                        firstNonBlankIndex = line.search(/[^\s]/)
                        if (line[firstNonBlankIndex] !== '*') {
                            break;
                        }
                        if(line[firstNonBlankIndex + 1] === '/') {
                            isClosed = true;
                            break;
                        }
                    }
                    currentLineNumber++;
                }
                if (isFirstLineComment && !isClosed) {
                    insert = '\n'+ indent + ' * \n' + indent + ' */';
                    newPosition = {
                        line: cursor.line +1, 
                        ch: indent.length + 3
                    }
                    /* todo jsdoc
                        var isNextLineFunc: boolean = false,
                        currentpath = editor.document.file.fullPath,
                        project = typeScriptProjectManager.getProjectForFile(currentpath),
                        languageService = project && project.getLanguageService(),
                        languageHost =  project && project.getLanguageServiceHost();
                    
                    var currentLineNumber: number = cursor.line;
                    do {
                        currentLineNumber++;
                        line = editor.document.getLine(currentLineNumber);
                    } while (!line && line !== undefined);
                    
                    if (line !== undefined && languageService) {
                        var syntaxTree = languageService.getSyntaxTree(currentpath);
                        if (syntaxTree) {
                            var syntaxToken = syntaxTree.sourceUnit().findTokenOnLeft(languageHost.lineColToPosition(currentpath, currentLineNumber, 0));
                        }
                    }*/
                } else {
                    insert = '\n'+ indent + (isFirstLineComment? ' ' : '') + '* ';
                }
            }
        }
    }
    
    if (insert) {
        editor.document.replaceRange(insert, cursor, cursor);
        if (newPosition) {
            editor.setCursorPos(newPosition.line, newPosition.ch, true, true);
        }
        return true;
    }
    return false;
}


function handleKey(editor: brackets.Editor): boolean {
    var cursor = editor.getCursorPos(),
        token = editor._codeMirror.getTokenAt(cursor);
    if (token.state.eolState === Services.EndOfLineState.InMultiLineCommentTrivia) {
        if (!StringUtils.endsWith(token.string, '*/') || cursor.ch < token.end) {
            var line = editor.document.getLine(cursor.line),
                index = line.search(/[^\s]/),
                prefix = line.substr(0, index);
            
            editor.document.replaceRange('\n'+ prefix + ( line[index] === '*'? '' : ' ')  + '* ', cursor, cursor);
            
            return true;
        }
    }
    return false;
}

function handleKeyPress(event: KeyboardEvent) {
    if (event.keyCode === KeyEvent.DOM_VK_RETURN) {
        var editor = EditorManager.getFocusedEditor();
        if (editor) {
            if (editor.getModeForSelection() === 'typescript') { // start with just JS... later should do anything block-commentable
                if (handleEnterKey(editor)) {
                    event.stopPropagation(); // don't let CM also handle it
                    event.preventDefault();  // including via natively editing its hidden textarea
                }
            }
        }
    } 
}

var keyPressSignal: signal.ISignal<KeyboardEvent>,
    typeScriptProjectManager: project.TypeScriptProjectManager;
export function init(signal: signal.ISignal<KeyboardEvent>, projectManager: project.TypeScriptProjectManager) {
    keyPressSignal = signal;
    typeScriptProjectManager = projectManager;
    signal.add(handleKeyPress);
}

export function dispose() {
    keyPressSignal.remove(handleKeyPress)
    keyPressSignal = null;
}