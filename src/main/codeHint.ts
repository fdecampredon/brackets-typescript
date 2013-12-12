'use strict';

import project = require('./project');
import Logger = require('./logger');
import immediate = require('./utils/immediate');
import Services = TypeScript.Services;
import ScriptElementKind =  Services.ScriptElementKind;
import ScriptElementKindModifier =  Services.ScriptElementKindModifier;


//--------------------------------------------------------------------------
//
//  HintService
//
//--------------------------------------------------------------------------
var Xx =2


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
    
    constructor(
        private typescriptProjectManager: project.TypeScriptProjectManager
    ) {}
    
    /**
     * 
     * Return a list of hint for a given file and position
     * 
     * @param path path of the file
     * @param position position in the file
     * @param currentToken if given filter the hint to match this token
     */
    getHintsAtPositon(path: string, position: CodeMirror.Position, currentToken: string) : Hint[] {
        var project: project.TypeScriptProject = this.typescriptProjectManager.getProjectForFile(path);
        
        if (!project) {
            return null;
        }
        
        var languageService = project.getLanguageService()
        
        if(!languageService) {
            return null;
        }
   
        var index = project.getIndexFromPos(path, position),
            completionInfo = languageService.getCompletionsAtPosition(path, index, true),
            entries = completionInfo && completionInfo.entries;
        
        if(!entries) {
            return null;
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
        
        
        
        var hints = entries.map(entry => {
            var entryInfo = languageService.getCompletionEntryDetails(path, index, entry.name),
                hint = {
                    name: entry.name,
                    kind: HintKind.DEFAULT,
                    type: entryInfo && entryInfo.type,
                    doc: entryInfo && entryInfo.docComment
                };
           
        
            switch(entry.kind) {
                case ScriptElementKind.unknown:
                case ScriptElementKind.primitiveType:
                case ScriptElementKind.scriptElement:
                    break;
                case ScriptElementKind.keyword:
                    hint.kind = HintKind.KEYWORD;
                    break;
                    
                case ScriptElementKind.classElement:
                    hint.kind = HintKind.CLASS;
                    break;
                case ScriptElementKind.interfaceElement:
                    hint.kind = HintKind.INTERFACE;
                    break;
                case ScriptElementKind.enumElement:
                    hint.kind = HintKind.ENUM;
                    break;
                case ScriptElementKind.moduleElement:
                    hint.kind = HintKind.MODULE;
                    break;
                    
                    
                case ScriptElementKind.memberVariableElement:
                case ScriptElementKind.variableElement:
                case ScriptElementKind.localVariableElement:
                case ScriptElementKind.parameterElement:
                    hint.kind = HintKind.VARIABLE;
                    break;
                
                
                case ScriptElementKind.memberFunctionElement:
                case ScriptElementKind.functionElement:
                case ScriptElementKind.localFunctionElement:
                    hint.kind = HintKind.FUNCTION;
                    break;
                
                    
                case ScriptElementKind.typeParameterElement:
                case ScriptElementKind.constructorImplementationElement:
                case ScriptElementKind.constructSignatureElement:
                case ScriptElementKind.callSignatureElement:
                case ScriptElementKind.indexSignatureElement:
                case ScriptElementKind.memberGetAccessorElement:
                case ScriptElementKind.memberSetAccessorElement:
                    console.log('untreated case ' + entry.kind);
                    break;
            }
            
            return hint;
        });
        
        return hints;
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
            
            var hints = this.hintService.getHintsAtPositon(currentFilePath, position, this.lastUsedToken && this.lastUsedToken.string)
            
            if (!hints || hints.length === 0) {
                deferred.resolve({hints : []});
                return;
            }
            deferred.resolve({
                hints: hints.map(this.hintToJQuery, this),
                selectInitial: !!implicitChar
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
