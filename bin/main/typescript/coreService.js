define(["require", "exports", '../logger'], function(require, exports, __Logger__) {
    var Logger = __Logger__;
    var TypeScriptServicesFactory = TypeScript.Services.TypeScriptServicesFactory;

    var coreService = new TypeScriptServicesFactory().createCoreServices({
        logger: new Logger()
    });

    
    return coreService;
});
