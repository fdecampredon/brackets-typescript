import Logger = require('../logger');
import Services = TypeScript.Services;

var coreService = new Services.TypeScriptServicesFactory().createCoreServices({
    logger: new Logger()
});

export = coreService;
