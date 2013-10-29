import project = require('./project');
import Logger = require('./logger');
import language = require('./typescript/language');

var logger = new Logger(),
    classifier = new Services.TypeScriptServicesFactory().createClassifier(logger);

export class TypeScriptCodeHintProvider implements brackets.CodeHintProvider {
    private typescriptProjectManager: project.TypeScriptProjectManager;
    private project: project.TypeScriptProject;
    private currentFilePath: string;
    private lastUsedEditor: brackets.Editor;
    private hintPosition: CodeMirror.Position;
    private hints: string[];
    private token:{ length: number; position: number; string: string;};
    
    constructor(typescriptProjectManager: project.TypeScriptProjectManager) {
        this.typescriptProjectManager = typescriptProjectManager;
    }
    
    hasHints(editor : brackets.Editor, implicitChar : string): boolean {
        this.setCurrentFilePath(editor.document.file.fullPath)
        this.lastUsedEditor = editor;
        this.hintPosition = editor.getCursorPos();
        if (this.project) {
            this.hints = this.getCompletionAtHintPosition();
            if(this.hints && this.hints.length > 0) {
                if (implicitChar ) {
                    var hints = this.getFilteredHints();
                    return hints && hints.length === 1 && this.token.length > 1;
                } else {
                    return this.hints.length > 0
                }
            };
        }
        return false;
    }
    
    getHints(implicitChar:string): brackets.HintResult {
        var hints = this.getFilteredHints();
        if (hints.length> 0) {
            return {
                hints : hints,
                selectInitial: !!implicitChar
            };
        }
        return null;
    }
    
    insertHint(hint:string):void {
        var startPos = !this.token ? 
                            this.hintPosition : 
                            {
                                line : this.hintPosition.line,
                                ch : this.token.position
                            }, 
            endPos = !this.token ? 
                        this.hintPosition : 
                        {
                            line : this.hintPosition.line,
                            ch : this.token.position + this.token.length
                        };
        
        this.lastUsedEditor.document.replaceRange(hint, startPos, endPos);
    }
    
    private getFilteredHints(): string[] {
        var editorPos = this.lastUsedEditor.getCursorPos(),
            lineStr = this.lastUsedEditor.document.getLine(editorPos.line),
            classificationResult =  classifier.getClassificationsForLine(lineStr,  Services.EndOfLineState.Start),
            currentPos = 0,
            linePosition = editorPos.ch - 1;

        for(var i = 0, l = classificationResult.entries.length; i < l; i++) {
            var entry = classificationResult.entries[i];
            if(linePosition >= currentPos && linePosition < currentPos+entry.length) {
                var TokenClass = Services.TokenClass;
                switch(entry.classification) {
                    case TokenClass.NumberLiteral :
                        case TokenClass.StringLiteral:
                        case TokenClass.RegExpLiteral :
                        case TokenClass.Operator: 
                        case TokenClass.Comment:
                        case TokenClass.Punctuation: 
                        case TokenClass.Whitespace:
                            this.token = null;
                            break;
                    default :
                        this.token = {
                            string : lineStr.substr(currentPos, entry.length),
                            position : currentPos,
                            length : entry.length
                        }
                        break;
                }
            }
            currentPos += entry.length;
        }
        var hints = this.hints.slice(0, this.hints.length);
        if(this.token) {
            hints = hints.filter(hint => hint && hint.toLowerCase().indexOf(this.token.string.toLowerCase()) === 0);
        }
        return hints;
    }
    
    private setCurrentFilePath(path: string) {
        if (path !== this.currentFilePath || !project) {
            this.currentFilePath = path;
            this.project = this.typescriptProjectManager.getProjectForFile(path);
        }
    }
    
    private getCompletionAtHintPosition(): string[] {
        var languageService= this.project.getLanguageService(),
            languageServiceHost = this.project.getLanguageServiceHost()

        if(!languageService || !languageService) {
                return null;
        }
        var index = languageServiceHost.lineColToPosition(this.currentFilePath, this.hintPosition.line, this.hintPosition.ch),
            completionInfo = languageService.getCompletionsAtPosition(this.currentFilePath, index, true);
            
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
