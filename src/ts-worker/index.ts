declare var require: any;
global.TypeScript = require('typescriptServices');
global.window = self;



import TypeScriptProjectManager = require('./projectManager');
import TypeScriptProject = require('./project');
import ErrorService = require('./errorService');
import DefinitionService = require('./definitionService');
import CompletionService = require('./completionService');
import LexicalStructureService = require('./lexicalStructureService');
import WorkerBridge = require('../commons/workerBridge');
import logger = require('../commons/logger');

import path = require('path');


var projectManager = new TypeScriptProjectManager(),
    errorService = new ErrorService(projectManager),
    completionService = new CompletionService(projectManager),
    definitionService = new DefinitionService(projectManager),
    lexicalStructureService = new LexicalStructureService(projectManager),
    bridge = new WorkerBridge(<any>self);

bridge.init({
    errorService: errorService,
    completionService: completionService,
    definitionService: definitionService,
    lexicalStructureService: lexicalStructureService
}).then(proxy => {
    proxy.getTypeScriptLocation().then( (location: string) => {
        proxy.getLogLevel().then((logLevel: string) => {  
            self.console = proxy.console;
            logger.setLogLevel(logLevel);
            projectManager.init(location, proxy.preferencesManager, proxy.fileSystem, proxy.workingSet, TypeScriptProject.newProject).then(( )=>{
                if (logger.information()) {
                    logger.log('TSWorker : initilialization complete')
                }
            })
        });
    })
});