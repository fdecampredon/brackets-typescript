import TypeScriptProjectManager = require('./projectManager');
import TypeScriptProject = require('./project');
import ErrorService = require('./errorService');
import DefinitionService = require('./definitionService');
import CompletionService = require('./completionService');
import WorkerBridge = require('../commons/workerBridge');


var projectManager = new TypeScriptProjectManager(),
    errorService = new ErrorService(projectManager),
    completionService = new CompletionService(projectManager),
    definitionService = new DefinitionService(projectManager),
    bridge = new WorkerBridge(<any>self);

bridge.init({
    errorService: errorService,
    completionService: completionService,
    definitionService: definitionService
}).then(proxy => {
    proxy.getTypeScriptLocation().then( (location: string) => {
        projectManager.init(location, proxy.fileSystem, proxy.workingSet, TypeScriptProject.newProject); 
    });
});