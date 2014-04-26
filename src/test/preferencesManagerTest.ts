//   Copyright 2013-2014 François de Campredon
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
                return preferences;    
            },
            on(type: string, callback: () => void) {
                this.callback = callback;
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
    });
    
    function expectProjectConfig(compareValue: any) {
        var configs: any;
        tsPrefManager.getProjectsConfig().then(result =>  configs = result);
        waitsFor(() => !!configs, 'config should have been set');
        runs(function () {
           expect(configs).toEqual(compareValue); 
        });
    }
    
    it('should not contains any project config if typescript preference section contains nothing', function () {
        expectProjectConfig({});
    });
    
    
    it('retrieve only one \'default\' project config augmented with  default config value ' +
            'if preferences in typescript section are valid preference', function () {
        preferences = {
            sources: ['src/'],
            target: 'es5'
        };
        expectProjectConfig({
            default: {
                sources: ['src/'],
                target: 'es5',
                noLib: false,
                module: 'none',
                noImplicitAny: false
            }
        });
    });
    
    
    it('should retrieve no project config if the config is not valid', function () {
        preferences = { hello: 'world' };
        expectProjectConfig({});
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
        expectProjectConfig({
            project1: {
                sources: ['src/'],
                target: 'es3',
                noLib: false,
                module: 'commonjs',
                noImplicitAny: false
            },
            project2: {
                sources: ['src/'],
                target: 'es5',
                noLib: false,
                module: 'commonjs',
                noImplicitAny: false
            }
        });
    });
    
    

    it('should notify config change when the typescript section change', function () {
        
        var configChangeSpy = jasmine.createSpy('configChangeSpy');
        tsPrefManager.configChanged.add(configChangeSpy);
        preferences = {
            sources: ['src']
        };
        bracketsPrefManagerMock.notifyChange();
        expect(configChangeSpy).toHaveBeenCalled();
        tsPrefManager.dispose();
    });
   
});
