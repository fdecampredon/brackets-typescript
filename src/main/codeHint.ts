'use strict';

import project = require('./project');
import Logger = require('./logger');
import language = require('./typescript/language');

var logger = new Logger(),
    classifier = new Services.TypeScriptServicesFactory().createClassifier(logger);

interface Token { 
    string: string; 
    classification: Services.TokenClass;
    position: number;
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
            }
        }
        this.editor = editor;
        return true;
    }
    
    getHints(implicitChar:string): JQueryDeferred<brackets.HintResult> {
        var deferred: JQueryDeferred<brackets.HintResult> = $.Deferred();
        setTimeout(() => {
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
            
            var hints = this.getCompletionAtHintPosition();
            if (this.lastUsedToken) {
                var hasExactToken = false;
                hints = hints.filter(hint => {
                    if (hint === this.lastUsedToken.string) {
                        hasExactToken = true;
                    }
                    return hint && hint.toLowerCase().indexOf(this.lastUsedToken.string.toLowerCase()) === 0;
                });
                if (hasExactToken) {
                    deferred.resolve({hints : []});
                    return;
                }
            }
            deferred.resolve({
                hints : hints,
                selectInitial: !!implicitChar
            });
            
        }, 0);
        return deferred;
    }
    
    insertHint(hint:string):void {
        var position = this.editor.getCursorPos(),
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
        
        this.editor.document.replaceRange(hint, startPos, endPos);
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
    
    private getCompletionAtHintPosition(): string[] {
        var currentFilePath: string = this.editor.document.file.fullPath,
            project: project.TypeScriptProject = this.typescriptProjectManager.getProjectForFile(this.editor.document.file.fullPath);
        if (!project) {
            return null;
        }
        var languageService= project.getLanguageService(),
            languageServiceHost = project.getLanguageServiceHost(),
            position = this.editor.getCursorPos();

        if(!languageService || !languageService) {
                return null;
        }
        var index = languageServiceHost.lineColToPosition(currentFilePath, position.line, position.ch),
            completionInfo = languageService.getCompletionsAtPosition(currentFilePath, index, true);
            
        if(completionInfo && completionInfo.entries && completionInfo.entries.length > 0) {
            return completionInfo.entries.map(entry => entry.name).sort(function(a, b) {
                a = a && a.toLowerCase();
                b = b && b.toLowerCase();
                if(a < b) {
                    return -1;
                }
                else if(a > b) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
        }
    }
}