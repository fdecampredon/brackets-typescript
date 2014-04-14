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

import TypeScriptProjectConfig = require('../commons/config');
import tsUtils = require('../commons/typeScriptUtils');
import utils = require('../commons/utils');
import logger = require('../commons/logger');
import collections = require('../commons/collections');
import signal = require('../commons/signal');

class TypescriptPreferenceManager {
    constructor(
        private prefManager: brackets.PreferencesManager
    ) {
        this.prefManager.on('change', this.preferenceChangedHandler);
    }
    
    private projectConfigs: collections.StringMap<TypeScriptProjectConfig>;
    
    configChanged = new signal.Signal<void>();
    
    getProjectsConfig() {
        if (!this.projectConfigs) {
            this.projectConfigs = this.retriveProjectsConfig()
        }
        return this.projectConfigs.toObject(); 
    }

    dispose() {
        this.configChanged.clear();
    }
    
    private retriveProjectsConfig(): collections.StringMap<TypeScriptProjectConfig>  {
        var result = new collections.StringMap<TypeScriptProjectConfig>();
        
        var data = this.prefManager.get('typescript');
        if (!data) {
            return result;
        }
        
        var configs: any;

        if (data.hasOwnProperty('projects')) {
            var projects: any = data.projects;
            delete data.projects;
            if (typeof projects !== 'object') {
                return result;    
            }
            configs = Object.keys(projects).reduce((configs: any, id: any) => {
                var project = projects[id];
                if (typeof project === 'object') {
                    configs[id] = utils.assign({}, data, project);
                }
                return configs;
            }, {});
        } else {
            configs = {
                default: data
            };
        }
        
        Object.keys(configs).forEach(projectId => {
            var config: TypeScriptProjectConfig = utils.assign({ },  tsUtils.typeScriptProjectConfigDefault, configs[projectId]);
            if(!tsUtils.validateTypeScriptProjectConfig(config)) {
                if (logger.warning()) {
                    logger.log('invalid config file for brackets-typescript config file');
                }
            } else {
                result.set(projectId, config);
            }
        });
        
        return result;
    }
    
    private preferenceChangedHandler = (e: any, data: any) => {
        if (data && Array.isArray(data.ids) && data.ids.indexOf('typescript') !== -1) {
            this.projectConfigs = null;
            this.configChanged.dispatch();
        }
    }
}

export = TypescriptPreferenceManager;