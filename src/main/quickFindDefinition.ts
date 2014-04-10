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


import LexicalStructureService = require('../commons/lexicalStructureService');
import WorkingSet = require('./workingSet')

var EditorManager = brackets.getModule('editor/EditorManager'),
    QuickOpen    = brackets.getModule('search/QuickOpen');


class TypeScriptQuickFindDefitionProvider implements brackets.QuickOpenPluginDef<TypeScriptQuickFindDefitionProvider.LexicalStructureItem> {
    
    private lexicalStructureService: JQueryDeferred<LexicalStructureService> = $.Deferred();
    

    setLexicalStructureService(service: LexicalStructureService) {
        this.lexicalStructureService.resolve(service);
    }
    
    
    name = 'TypeScriptQuickFindDefitionProvider';
    languageIds = ["typescript"];    
    label = 'TypeScript';
    
    match(query: string) {
        return query.indexOf("@") === 0;
    }
    
    search = (request: string) =>  {
        request = request.substr(1);
        
        var deferred = $.Deferred(),
            currentFile = EditorManager.getActiveEditor().document.file.fullPath;
        
        this.lexicalStructureService.then(lexicalStructureService => {
            lexicalStructureService.getLexicalStructureForFile(currentFile).then(items => {
                deferred.resolve(items.filter(item => item.name.indexOf(request) !== -1));    
            });
        });
        
        return deferred.promise();
    }
    
    itemSelect(item: TypeScriptQuickFindDefitionProvider.LexicalStructureItem) {
         EditorManager.getActiveEditor().setCursorPos(item.position.line, item.position.ch, true, true)
    }
    
    resultsFormatter(item: TypeScriptQuickFindDefitionProvider.LexicalStructureItem) {
        var displayName = QuickOpen.highlightMatch(item.name);
        return "<li>" + displayName + "</li>";
    }
}

module TypeScriptQuickFindDefitionProvider {
    export interface LexicalStructureItem {
        name: string; 
        position: CodeMirror.Position;
    }
}


export = TypeScriptQuickFindDefitionProvider;
   /* itemFocus =  (result: LexicalStructureItem) => {
       
    }*/
    
    
    
//    /**
//         * plug-in name, **must be unique**
//         */
//        name: string; 
//        /**
//         * language Ids array. Example: ["javascript", "css", "html"]. To allow any language, pass []. Required.
//         */
//        languageIds: string[];
//        /**
//         * called when quick open is complete. Plug-in should clear its internal state. Optional.
//         */
//        done?: () => void;
//        /**
//         * takes a query string and a StringMatcher (the use of which is optional but can speed up your searches) 
//         * and returns an array of strings that match the query. Required.
//         */
//        search: (request: string) => JQueryPromise<S[]>;//function(string, !StringMatch.StringMatcher):Array.<SearchResult|string>,
//        /**
//         * takes a query string and returns true if this plug-in wants to provide
//         */
//        match: (query: string) => boolean;
//        /**
//         * performs an action when a result has been highlighted (via arrow keys, mouseover, etc.).
//         */
//        itemFocus?: (result: S) => void;
//        /**
//         * performs an action when a result is chosen.
//         */
//        itemSelect:  (result: S) => void;
//        /**
//         * takes a query string and an item string and returns 
//         * a <LI> item to insert into the displayed search results. Optional.
//         */
//        resultsFormatter?: (result: S) => string;
//        /**
//         * options to pass along to the StringMatcher (see StringMatch.StringMatcher for available options). 
//         */
//        matcherOptions? : StringMatcherOptions;
//        /**
//         * if provided, the label to show before the query field. Optional.
//         */
//        label?: string;