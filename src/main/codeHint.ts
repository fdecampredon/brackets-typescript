'use strict';

import project = require('./project');
import Logger = require('./logger');
import language = require('./typescript/language');
import immediate = require('./utils/immediate');
import Services = TypeScript.Services;

var logger = new Logger(),
    classifier = new Services.TypeScriptServicesFactory().createClassifier(logger),
    //TODO externalize that
    StringUtils  = brackets.getModule("utils/StringUtils");

interface Token { 
    string: string; 
    classification: Services.TokenClass;
    position: number;
}


function isFunctionElement(kind: string): boolean {
    switch (kind) {
        case Services.ScriptElementKind.callSignatureElement:
        case Services.ScriptElementKind.constructorImplementationElement:
        case Services.ScriptElementKind.constructSignatureElement:
        case Services.ScriptElementKind.functionElement:
        case Services.ScriptElementKind.localFunctionElement:
        case Services.ScriptElementKind.memberFunctionElement:
            return true;
        default:
            return false;
    }
}
    

export class TypeScriptCodeHintProvider implements brackets.CodeHintProvider {
    private typescriptProjectManager: project.TypeScriptProjectManager;
    private lastUsedToken: Token;
    private editor: brackets.Editor;
    
    constructor(typescriptProjectManager: project.TypeScriptProjectManager) {
        this.typescriptProjectManager = typescriptProjectManager;
    }
    
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
                            return;
                        }
                        this.lastUsedToken = null;
                    default:
                        break;
                }
            }
            
            
            var currentFilePath: string = this.editor.document.file.fullPath,
                project: project.TypeScriptProject = this.typescriptProjectManager.getProjectForFile(this.editor.document.file.fullPath);
            
            if (!project) {
                deferred.resolve({ hints: []});
                return;
            }
            
            var languageService = project.getLanguageService(), 
                languageServiceHost = project.getLanguageServiceHost(),
                position = this.editor.getCursorPos();
            
            if(!languageService || !languageService) {
                 deferred.resolve({hints : []});
                return;
            }
       
            var filePosition = languageServiceHost.lineColToPosition(currentFilePath, position.line, position.ch),
                completionInfo = languageService.getCompletionsAtPosition(currentFilePath, filePosition, true),
                entries = completionInfo && completionInfo.entries;
            
            if(!entries) {
                deferred.resolve({hints : []});
                return;
            }
            
            if (this.lastUsedToken && entries) {
                entries = entries.filter(entry => {
                    return entry.name && entry.name.toLowerCase().indexOf(this.lastUsedToken.string.toLowerCase()) === 0;
                });
                if (entries.length === 1 && entries[0].name === this.lastUsedToken.string) {
                    deferred.resolve({hints : []});
                    return;
                }
            }
            entries = entries && entries.sort(function(entry1, entry2) {
                
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
            
            
            var hints = entries && entries.map(entry => {
                var entryInfo = languageService.getCompletionEntryDetails(currentFilePath, filePosition, entry.name),
                    hint = this.hintTextFromInfo(entryInfo),
                    $hintObj = $('<span>'),
                    delimiter = '',
                    hintCssClass: string;
                
                if (entry.kind === Services.ScriptElementKind.keyword) {
                    
                    switch (entry.name) {
                        case 'number':
                        case 'void':
                        case 'bool':
                        case 'boolean':
                            hintCssClass = 'variable';
                            break;
                        case 'static':
                        case 'public':
                        case 'private':
                        case 'export':
                        case 'get':
                        case 'set':
                            hintCssClass = 'qualifier';
                        
                        case 'class':
                        case 'function':
                        case 'module':
                        case 'var':
                            hintCssClass = 'def';
                            break;
                        default:
                            hintCssClass = 'keyword';
                            break;
                    }
                } else {
                    hintCssClass = 'variable';
                }
                
                var $inner = $('<span>').addClass('cm-' + hintCssClass);
                $hintObj = $hintObj
                            .addClass('cm-s-default')
                            .append($inner);
                
                // highlight the matched portion of each hint
                if (this.lastUsedToken) {
                    var match   = StringUtils.htmlEscape(hint.slice(0,  this.lastUsedToken.string.length)),
                        suffix  = StringUtils.htmlEscape(hint.slice(this.lastUsedToken.string.length));
                    $inner
                        .append(delimiter)
                        .append($('<span>')
                            .append(match)
                            .css('font-weight', 'bold'))
                        .append(suffix + delimiter)
                } else {
                    $inner.text(delimiter + hint + delimiter);
                }
                $hintObj.data('entry', entry);
                
                return $hintObj;
            });
            
            deferred.resolve({
                hints : hints || [],
                selectInitial: !!implicitChar
            });
            
        });
        return deferred;
    }
    
    insertHint(hint: JQuery):void {
        var entry: Services.CompletionEntry = hint.data('entry'),
            text = entry.name,
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
        
        this.editor.document.replaceRange(text, startPos, endPos);
    }
    
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
    
    private hintTextFromInfo(entryInfo : Services.CompletionEntryDetails): string {
        var text = entryInfo.name;
        if (isFunctionElement(entryInfo.kind)) {
            text += entryInfo.type || '';
        } else if(entryInfo.type && entryInfo.type !== entryInfo.name) {
            text += ' : ' + entryInfo.type;
        }
        return text;
    }
}