define(["require", "exports", '../logger'], function(require, exports, __Logger__) {
    var Logger = __Logger__;
    var Services = TypeScript.Services;

    var coreService = new Services.TypeScriptServicesFactory().createCoreServices({
        logger: new Logger()
    });

    
    return coreService;
});
