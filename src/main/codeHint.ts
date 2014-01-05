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

import TypeScriptProjectManager = require('./projectManager');
import Logger = require('./logger');
import immediate = require('./utils/immediate');
import project = require('./project');
import Services = TypeScript.Services;

//--------------------------------------------------------------------------
//
//  HintService
//
//--------------------------------------------------------------------------


/**
 * enum representing the different kind of hint
 */
export enum HintKind {
    DEFAULT,
    CLASS,
    INTERFACE,
    ENUM,
    MODULE,
    VARIABLE,
    METHOD,
    FUNCTION,
    KEYWORD
}

/**
 * interface representing a hint
 */
export interface Hint {
    name: string;
    type: string;
    kind: HintKind;
    doc: string;
}

/**
 * Service returning hint for a given file
 */
export class HintService {
    private typescriptProjectManager: TypeScriptProjectManager;
    
    init(typescriptProjectManager : TypeScriptProjectManager){
        this.typescriptProjectManager = typescriptProjectManager;
    }
    
    /**
     * 
     * Return a list of hint for a given file and position
     * 
     * @param path path of the file
     * @param position position in the file
     * @param currentToken if given filter the hint to match this token
     */
    getHintsAtPositon(path: string, position: CodeMirror.Position, currentToken: string) : JQueryPromise<Hint[]> {
        var project = this.typescriptProjectManager.getProjectForFile(path);
        
        if (!project) {
            return null;
        }
        
        return project.getCompletionsAtPosition(path, position).then(entries => {
            if(!entries) {
                return [];
            }
            
            if (currentToken) {
                entries = entries.filter(entry => {
                    return entry.name && entry.name.toLowerCase().indexOf(currentToken.toLowerCase()) === 0;
                });
            }
        
            entries.sort(function(entry1, entry2) {
                var name1 = entry1 && entry1.name.toLowerCase(),
                    name2 = entry2 && entry2.name.toLowerCase();
                if(name1 < name2) {
                    return -1;
                }
                else if(name1 > name2) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
            
            
            var hints: Hint[] =  entries.map(entry => ({
                name: entry.name,
                kind: HintKind.DEFAULT,
                type: null, 
                doc: null 
            }));
            
            return hints;
        })
    }
}


//--------------------------------------------------------------------------
//
//  TypeScriptCodeHintProvider
//
//--------------------------------------------------------------------------

declare var Mustache: any;

var logger = new Logger(),
    classifier = new Services.TypeScriptServicesFactory().createClassifier(logger),
    _ = brackets.getModule('thirdparty/lodash');

var HINT_TEMPLATE = '<span class="cm-s-default">\
                            <span style="display: inline-block" class="{{class_type}}">\
                                <span style="font-weight: bold">{{match}}</span>{{suffix}}\
                            <span>\
                    </span>'
    
/**
 * token created by the typescript mode
 */
interface Token { 
    string: string; 
    classification: Services.TokenClass;
    position: number;
}

/**
 * brackets hint provider for typescript
 */
export class TypeScriptCodeHintProvider implements brackets.CodeHintProvider {
    private lastUsedToken: Token;
    private editor: brackets.Editor;
    
    constructor(
        private hintService: HintService
    ) {}
    
    /**
     * return true if hints can be calculated for te current editor
     * 
     * @param editor the editor
     * @param implicitChar determine whether the hinting request is explicit or implicit, 
     * null if implicit, contains the last character inserted
     */
    hasHints(editor : brackets.Editor, implicitChar : string): boolean {
        if (implicitChar) {
            var token = this.getCurrentToken(editor);
            if (token) {
                var TokenClass = Services.TokenClass;
                switch(token.classification) {
                    case TokenClass.NumberLiteral :
                    case TokenClass.StringLiteral:
                    case TokenClass.RegExpLiteral :
                    case TokenClass.Operator: 
                    case TokenClass.Comment:
                    case TokenClass.Whitespace:
                        return false;
                        break;
                    case TokenClass.Punctuation: 
                        if (token.string !== '.') {
                            return false;
                        }
                        break;
                    default:
                        if (token.string.length < 2) {
                            return false;
                        }
                        break;
                } 
            } else {
                return false;
            }
        }
        this.editor = editor;
        return true;
    }
    
    /**
     * return list of hints
     * @param implicitChar
     */
    getHints(implicitChar:string): JQueryDeferred<brackets.HintResult> {
        var deferred: JQueryDeferred<brackets.HintResult> = $.Deferred();
        //async so we are sure that the languageServiceHost has been updated
        immediate.setImmediate(() => {
            if (deferred.state() === 'rejected') {
                return;
            }
            
            this.lastUsedToken = this.getCurrentToken(this.editor);
            if (this.lastUsedToken) {
                var TokenClass = Services.TokenClass;
                switch(this.lastUsedToken.classification) {
                    case TokenClass.NumberLiteral :
                    case TokenClass.StringLiteral:
                    case TokenClass.RegExpLiteral :
                    case TokenClass.Operator: 
                    case TokenClass.Comment:
                    case TokenClass.Whitespace:
                    case TokenClass.Punctuation: 
                        if (implicitChar && this.lastUsedToken.string !== '.' || this.lastUsedToken.classification !== TokenClass.Punctuation) {
                            deferred.resolve({hints : []});
                        }
                        this.lastUsedToken = null;
                    default:
                        break;
                }
            }
            
            var currentFilePath: string = this.editor.document.file.fullPath, 
                position = this.editor.getCursorPos();
            
            this.hintService.getHintsAtPositon(currentFilePath, position, this.lastUsedToken && this.lastUsedToken.string).then(hints =>{
                if (!hints || hints.length === 0) {
                    deferred.resolve({hints : []});
                    return;
                }
                deferred.resolve({
                    hints: hints.map(this.hintToJQuery, this),
                    selectInitial: !!implicitChar
                })
            }, () => {
                deferred.reject();    
            })
        });
        
        return deferred;
    }
    
    /**
     * insert hin if chosen
     * @param $hintObj
     */
    insertHint($hintObj: JQuery):void {
        var hint: Hint = $hintObj.data('hint'),
            position = this.editor.getCursorPos(),
            startPos = !this.lastUsedToken ? 
                            position : 
                            {
                                line : position.line,
                                ch : this.lastUsedToken.position
                            }, 
            endPos = !this.lastUsedToken ? 
                        position: 
                        {
                            line : position.line,
                            ch : this.lastUsedToken.position + this.lastUsedToken.string.length
                        };
        
        
        this.editor.document.replaceRange(hint.name, startPos, endPos);
    }
    
    
    

    /**
     * convert a hint to jquery object for display
     * @param hint
     */
    private hintToJQuery(hint: Hint): JQuery {
        var text = hint.name,
            match: string,
            suffix: string,
            class_type= '';
        switch(hint.kind) {
            
            case HintKind.KEYWORD:
                switch (hint.name) {
                    case 'static':
                    case 'public':
                    case 'private':
                    case 'export':
                    case 'get':
                    case 'set':
                        class_type = 'cm-qualifier';
                        break;
                    case 'class':
                    case 'function':
                    case 'module':
                    case 'var':
                        class_type = 'cm-def';
                        break;
                    default:
                        class_type = 'cm-keyword';
                        break;
                }
                break;
            case HintKind.METHOD:
            case HintKind.FUNCTION:
                text += hint.type ?  hint.type : ''; 
                break;
            default:
                text += hint.type ? ' - ' + hint.type : ''; 
                break;
        }
   
        // highlight the matched portion of each hint
        if (this.lastUsedToken) {
            match   = text.slice(0,  this.lastUsedToken.string.length);
            suffix  = text.slice(this.lastUsedToken.string.length);
           
        } else {
            match = '';
            suffix = text
        }
        
        
        var result = $(Mustache.render(HINT_TEMPLATE, {
            classifier: classifier,
            match: match,
            suffix: suffix,
            class_type: class_type
        })); 
        result.data('hint', hint)
        return result;
    }
    
    /**
     * retrive the current token from editor
     * @param editor
     */
    private getCurrentToken(editor: brackets.Editor): Token  {
        var position = editor.getCursorPos(),
            lineStr = editor.document.getLine(position.line),
            classificationResult =  classifier.getClassificationsForLine(lineStr,  Services.EndOfLineState.Start),
            currentPos = 0,
            linePosition = position.ch - 1;
        
        for (var i = 0, l = classificationResult.entries.length; i < l; i++) {
            var entry = classificationResult.entries[i];
            if(linePosition >= currentPos && linePosition < (currentPos + entry.length)) {
                return  {
                    string : lineStr.substr(currentPos, entry.length),
                    classification: entry.classification,
                    position: currentPos
                }
            }
            currentPos += entry.length;
        }
        return null;
    }
}
