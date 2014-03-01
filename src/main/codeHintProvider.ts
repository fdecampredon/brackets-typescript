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
    
    private completionService: JQueryDeferred<completion.CompletionService> = $.Deferred()
    
    setCompletionService(service: completion.CompletionService) {
        this.completionService.resolve(service);
    }
    
    
    
    private editor: brackets.Editor;
    
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
        var currentFileName: string = this.editor.document.file.fullPath, 
            position = this.editor.getCursorPos(),
            deferred = $.Deferred()
        this.completionService.then(service => {
            service.getCompletionAtPosition(currentFileName, position).then(result => {
                deferred.resolve({
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
                        jqueryObj.data('entry', entry)
                        jqueryObj.data('match', result.match)
                        return jqueryObj;

                    }),
                    selectInitial: !!implicitChar
                })
            }).catch(error => deferred.reject(error))
        });
        
        return deferred;
    }
    
    
    
    insertHint($hintObj: JQuery):void {
        var entry: completion.CompletionEntry = $hintObj.data('entry'),
            match: string = $hintObj.data('match'), 
            position = this.editor.getCursorPos(),
            startPos = !match ? 
                position : 
                {
                    line : position.line,
                    ch : position.ch - match.length
                }
            ;
        
        
        this.editor.document.replaceRange(entry.name, startPos, position);
    }
}


export = CodeHintProvider;