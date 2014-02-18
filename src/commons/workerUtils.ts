import utils = require('./utils');

enum Operation {
    REQUEST,
    RESPONSE,
    ERROR,
    EXPOSE
}

function createExpositionMap(exposedService: any) {
    return utils.getEnumerablePropertyNames(exposedService).reduce( 
        (serviceMap: any, key: string) => {
            var value = exposedService[key] 
            if (typeof value === 'function') {
                serviceMap[key] = true;
            } else if (typeof value === 'object') {
                if (!Array.isArray(value)) {
                    serviceMap[key] = createExpositionMap(exposedService[key])
                }
            }
        }, {}
    );
}

function newQuery(methodChain: string[], sendMessage: (args: any) => void, deferredStack: JQueryDeferred<any>[]): any {
    return (...args: any []) => {
        sendMessage({
            operation: Operation.REQUEST,
            methodChain: methodChain,
            args: args
        });
        deferredStack.push($.Deferred<any>());
    }
}

function createProxy(expositionMap: any, sendMessage: (args: any) => void, deferredStack: JQueryDeferred<any>[], baseKeys: string[] = []): any {
    return Object.keys(expositionMap).reduce( (proxy: any, key: string) => {
        var value = expositionMap[key],
            keys = baseKeys.concat(key);
        if (value === true) {
            proxy[key] = newQuery(keys, sendMessage, deferredStack);
        } else if (typeof value === 'object') {
            proxy[key] = createProxy(expositionMap[key], sendMessage, deferredStack,  keys)
        }
    }, {});
}


function proxy(scope: any, exposedServices: { [key: string]: any }): JQueryPromise<any> {
    return $.Deferred<any>( deferred => {
        var deferredStack: JQueryDeferred<any>[] = [];
        
        scope.onmessage = (event: MessageEvent) => {
            switch(event.data.operation) {
                case Operation.EXPOSE:
                    deferred.resolve(createProxy(event.data.expositionMap,  (args: any) => scope.postMessage(args), deferredStack));
                    break;
                case Operation.REQUEST:
                    try {
                        var methodChain: string[] = event.data.methodChain.slice(),
                            thisObject: any = null,
                            method: any = exposedServices;
                        while (methodChain.length) {
                            thisObject = method;
                            method = exposedServices[methodChain.shift()];
                        }
                        var result = method.apply(thisObject, event.data.args);
                    } catch(error) {
                        scope.postMessage({
                            operation: Operation.ERROR,
                            methodChain: event.data.methodChain,
                            errorMessage: error.message
                        });
                        break;
                    }
                    scope.postMessage({
                        operation: Operation.RESPONSE,
                        methodChain: event.data.methodChain,
                        result: result
                    });
                    break;
                case Operation.RESPONSE:
                    var deffered = deferredStack.shift();
                    deferred.resolve(event.data.result);
                    break;
                case Operation.ERROR:
                    var deffered = deferredStack.shift();
                    deferred.reject(new Error(event.data.errorMessage));
                    break;
            }
        };
        scope.postMessage({ 
            operation: Operation.EXPOSE, 
            exposedService: createExpositionMap(exposedServices) 
        });
    }).promise();
}

export = proxy;
