import Logger = require('../logger');

var coreService = new Services.TypeScriptServicesFactory().createCoreServices({
    logger: new Logger()
});

export = coreService;
