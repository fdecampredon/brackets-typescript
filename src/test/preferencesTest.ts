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

/*istanbulify ignore file*/

'use strict';

import TypescriptPreferenceManager = require('../main/preferences');

describe('TypescriptPreferenceManager', function () {
    var tsPrefManager: TypescriptPreferenceManager,
        preferences: any,
        bracketsPrefManagerMock = {
            get: function () {
                return preferences    
            }
        };
    
    beforeEach(function () {
        tsPrefManager = new TypescriptPreferenceManager(<any> bracketsPrefManagerMock);
    })

    it('should retrieve the \'typescript\' section from brackets preference manager', function () {
        var spy = spyOn(bracketsPrefManagerMock, 'get')
        tsPrefManager.init();
        expect(spy).toHaveBeenCalledWith('typescript');
    });
    
    
    it('should not contains any project config if typescript preference section contains nothing', function () {
        tsPrefManager.init();
        expect(tsPrefManager.getProjectsConfig()).toEqual({});
    });
    
    
    it('retrieve only one \'default\' project config augmented with  default config value if preferences in typescript section are valid preference', function () {
        preferences = {
            sources: ['src/'],
            target: 'es5'
        }
        tsPrefManager.init();
        expect(tsPrefManager.getProjectsConfig()).toEqual({
            default: {
                sources: ['src/'],
                propagateEnumConstants: false,
                removeComments: false,
                allowAutomaticSemicolonInsertion : true,
                noLib: false,
                target: 'es5',
                module: 'none',
                mapSource: false,
                declaration: false,
                useCaseSensitiveFileResolution: false,
                allowBool: false,
                allowImportModule: false,
                noImplicitAny: false
            }
        });
    });
    
    
    it('should retrieve no project config if the config is not valid', function () {
        preferences = { };
        tsPrefManager.init();
        expect(tsPrefManager.getProjectsConfig()).toEqual({});
    });
    
    
    it('should retrieve mutliple project config if the config file contains mutiple projects', function () {
        preferences = { 
            module: 'commonjs',
            projects: {
                project1: {
                    sources: ['src/']
                }, 
                project2: {
                    sources: ['src/'],
                    target: 'es5',
                }
            }
        };
        tsPrefManager.init();
        expect(tsPrefManager.getProjectsConfig()).toEqual({
            project1: {
                sources: ['src/'],
                propagateEnumConstants: false,
                removeComments: false,
                allowAutomaticSemicolonInsertion : true,
                noLib: false,
                target: 'es3',
                module: 'commonjs',
                mapSource: false,
                declaration: false,
                useCaseSensitiveFileResolution: false,
                allowBool: false,
                allowImportModule: false,
                noImplicitAny: false
            },
            project2: {
                sources: ['src/'],
                propagateEnumConstants: false,
                removeComments: false,
                allowAutomaticSemicolonInsertion : true,
                noLib: false,
                target: 'es5',
                module: 'commonjs',
                mapSource: false,
                declaration: false,
                useCaseSensitiveFileResolution: false,
                allowBool: false,
                allowImportModule: false,
                noImplicitAny: false
            }
        });
    });
});