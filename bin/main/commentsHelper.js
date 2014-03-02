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
define(["require", "exports", './logger'], function(require, exports, Logger) {
    var Services = TypeScript.Services;

    // Brackets modules
    var EditorManager = brackets.getModule('editor/EditorManager'), DocumentManager = brackets.getModule('document/DocumentManager'), KeyEvent = brackets.getModule('utils/KeyEvent'), StringUtils = brackets.getModule('utils/StringUtils');

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
    /*
    *
    * @param editor
    */
    /**
    * main helper function
    * @param editor
    */
    function handleEnterKey(editor) {
        var cursor = editor.getCursorPos(), token = editor._codeMirror.getTokenAt(cursor), insert, newPosition;
        if (token.state.eolState === 1 /* InMultiLineCommentTrivia */) {
            if (!StringUtils.endsWith(token.string, '*/') || cursor.ch < token.end) {
                var line = editor.document.getLine(cursor.line), index = line.search(/[\/*]/), indent = line.substr(0, index);

                if (index != -1 && indent.match(/^\s*$/)) {
                    var isFirstLineComment = (line.substr(index, 2) === '/*'), isJSDocComment = (line.substr(index, 3) === '/**'), isClosed = false, currentLineNumber = cursor.line + 1, firstNonBlankIndex;
                    while (true) {
                        line = editor.document.getLine(currentLineNumber);
                        if (line === undefined) {
                            break;
                        } else {
                            firstNonBlankIndex = line.search(/[^\s]/);
                            if (line[firstNonBlankIndex] !== '*') {
                                break;
                            }
                            if (line[firstNonBlankIndex + 1] === '/') {
                                isClosed = true;
                                break;
                            }
                        }
                        currentLineNumber++;
                    }
                    if (isFirstLineComment && !isClosed) {
                        indent += ' ';
                        insert = '\n' + indent + '* \n';
                        if (isJSDocComment) {
                            var currentLineNumber = cursor.line;
                            do {
                                currentLineNumber++;
                                line = editor.document.getLine(currentLineNumber);
                            } while(!line && line !== undefined);

                            //Todo perhaps i should use ast here
                            var matches = /^\s*((function|private|public)\s+)?\S+\(([^)]*)\)(\s*:\s*\S+)? \s*\{\s*$/.exec(line), params = matches && matches[matches.length - 2].split(',').map(function (param) {
                                return param.replace(/:.*$/, '').replace(/\s/g, '');
                            }).filter(function (param) {
                                return !!param;
                            });
                            if (params && params.length > 0) {
                                insert = '\n' + indent + '* \n';
                                params.forEach(function (param) {
                                    insert += indent + '* @param ' + param + '\n';
                                });
                            }
                        }

                        insert += indent + '*/';
                        newPosition = {
                            line: cursor.line + 1,
                            ch: indent.length + 3
                        };
                    } else {
                        insert = '\n' + indent + (isFirstLineComment ? ' ' : '') + '* ';
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

    function handleKey(editor) {
        var cursor = editor.getCursorPos(), token = editor._codeMirror.getTokenAt(cursor);
        if (token.state.eolState === 1 /* InMultiLineCommentTrivia */) {
            if (!StringUtils.endsWith(token.string, '*/') || cursor.ch < token.end) {
                var line = editor.document.getLine(cursor.line), index = line.search(/[^\s]/), prefix = line.substr(0, index);

                editor.document.replaceRange('\n' + prefix + (line[index] === '*' ? '' : ' ') + '* ', cursor, cursor);

                return true;
            }
        }
        return false;
    }

    function handleKeyPress(event) {
        if (event.keyCode === KeyEvent.DOM_VK_RETURN) {
            var editor = EditorManager.getFocusedEditor();
            if (editor) {
                if (editor.getModeForSelection() === 'typescript') {
                    if (handleEnterKey(editor)) {
                        event.stopPropagation(); // don't let CM also handle it
                        event.preventDefault(); // including via natively editing its hidden textarea
                    }
                }
            }
        }
    }

    var keyPressSignal;
    function init(signal) {
        keyPressSignal = signal;
        signal.add(handleKeyPress);
    }
    exports.init = init;

    function dispose() {
        keyPressSignal.remove(handleKeyPress);
        keyPressSignal = null;
    }
    exports.dispose = dispose;
});
