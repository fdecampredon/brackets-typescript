import Logger = require('../logger');
import TypeScriptServicesFactory = TypeScript.Services.TypeScriptServicesFactory;

var coreService = new TypeScriptServicesFactory().createCoreServices({
    logger: new Logger()
});

export = coreService;
