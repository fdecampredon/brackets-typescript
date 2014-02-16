import Rx = require('rx');
import completion = require('../commons/completion');

var CompletionKind = completion.CompletionKind;
/*istanbulify ignore file*/

var HINT_TEMPLATE = [
    '<span class="cm-s-default">',
    '   <span style="display: inline-block" class="{{class_type}}">',
    '       <span style="font-weight: bold">{{match}}</span>{{suffix}}',
    '   </span>',
    '</span>'
].join('\n');


class CodeHintProvider implements brackets.CodeHintProvider {
    
    private editor: brackets.Editor;
    
    private hintRequest = new Rx.Subject<{ file: string; pos: CodeMirror.Position }>();
    
    public geHintRequest(): Rx.Observable<{ file: string; pos: CodeMirror.Position }> {
        return this.hintRequest;
    }
    
    private hintList = new Rx.Subject<completion.CompletionResult>();
    
    public getHintsList(): Rx.Observer<completion.CompletionResult> {
        return this.hintList;
    }
    
    
    /**
     * return true if hints can be calculated for te current editor
     * 
     * @param editor the editor
     * @param implicitChar determine whether the hinting request is explicit or implicit, 
     * null if implicit, contains the last character inserted
     */
    hasHints(editor: brackets.Editor, implicitChar:string): boolean {
        //TODO we should find a better test here that limits more the implicit request
        if (!implicitChar || /[\w.\($_]/.test(implicitChar)) {
            this.editor = editor;
            return true;
        }
        return false;
    }
    
    getHints(implicitChar:string): JQueryDeferred<brackets.HintResult> {
        var currentFilePath: string = this.editor.document.file.fullPath, 
            position = this.editor.getCursorPos();
        var deferred = $.Deferred<brackets.HintResult>();
        var disposable = this.hintList
            .map(result => {
                if (deferred.state() === 'rejected') {
                    disposable.dispose();
                }
                return {
                    hints: result.entries.map(entry => {
                        var text = entry.name,
                            match: string,
                            suffix: string,
                            class_type= '';
                        
                        switch(entry.kind) {
                            case CompletionKind.KEYWORD:
                                switch (entry.name) {
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
                            case CompletionKind.METHOD:
                            case CompletionKind.FUNCTION:
                                text += entry.type ?  entry.type : ''; 
                                break;
                            default:
                                text += entry.type ? ' - ' + entry.type : ''; 
                                break;
                        }

                        // highlight the matched portion of each hint
                        if (result.match) {
                            match= text.slice(0, result.match.length);
                            suffix  = text.slice(result.match.length);

                        } else {
                            match = '';
                            suffix = text
                        }


                        var jqueryObj = $(Mustache.render(HINT_TEMPLATE, {
                            match: match,
                            suffix: suffix,
                            class_type: class_type
                        })); 
                        jqueryObj.data('hint', entry)
                        return jqueryObj;
                    
                    }),
                    selectInitial: !!implicitChar
                }
            })
            .subscribe(
                result => { 
                    disposable.dispose();
                    deferred.resolve(result)
                },
                error => {
                    disposable.dispose();
                    deferred.reject(error)
                }
            );
        
        this.hintRequest.onNext({ file: currentFilePath, pos: position });
        return deferred;
    }
    
    
    
    insertHint(hint: any):void {
        
    }
}


export = CodeHintProvider;