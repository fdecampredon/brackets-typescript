define(["require", "exports", '../logger'], function(require, exports, Logger) {
    var TypeScriptServicesFactory = TypeScript.Services.TypeScriptServicesFactory;

    var coreService = new TypeScriptServicesFactory().createCoreServices({
        logger: new Logger()
    });

    
    return coreService;
});
