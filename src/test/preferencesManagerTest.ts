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

import TypescriptPreferenceManager = require('../main/preferencesManager');

describe('TypescriptPreferenceManager', function () {
    var tsPrefManager: TypescriptPreferenceManager,
        preferences: any,
        bracketsPrefManagerMock = {
            get() {
                return preferences    
            },
            on(type: string, callback: () => void) {
                this.callback = callback
            },
            notifyChange() {
                this.callback(null, { ids: ['typescript']});
            }
        };
    
    beforeEach(function () {
        tsPrefManager = new TypescriptPreferenceManager(<any> bracketsPrefManagerMock);
    });
    afterEach(function () {
        tsPrefManager.dispose();
    })
    
    it('should not contains any project config if typescript preference section contains nothing', function () {
        expect(tsPrefManager.getProjectsConfig()).toEqual({});
    });
    
    
    it('retrieve only one \'default\' project config augmented with  default config value ' +
            'if preferences in typescript section are valid preference', function () {
        preferences = {
            sources: ['src/'],
            target: 'es5'
        }
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
    
    

    it('should notify config change when the typescript section change', function () {
        
        var configChangeSpy = jasmine.createSpy('configChangeSpy');
        tsPrefManager.configChanged.add(configChangeSpy);
        preferences = {
            sources:['src']
        }
        bracketsPrefManagerMock.notifyChange();
        expect(configChangeSpy).toHaveBeenCalled();
        tsPrefManager.dispose();
    });
   
});