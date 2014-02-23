/*istanbulify ignore file*/

import utils = require('./utils');
import Rx = require('rx');

enum Operation {
    REQUEST,
    RESPONSE,
    ERROR,
    EXPOSE,
    OBSERVABLE_NEXT,
    OBSERVABLE_ERROR,
    OBSERVABLE_COMPLETED
}


enum Type {
    FUNCTION,
    OBSERVABLE
}

function createProxyDescriptor(services: any, observables: { [index: string]: Rx.Observable<any> }, baseKeys: string[] = []) {
    return utils.getEnumerablePropertyNames(services)
        .reduce((descriptor: any, key: string) => {
            var value = services[key],
                keys = baseKeys.concat(key);
            if (typeof value === 'function') {
                descriptor[key] = Type.FUNCTION;
            } else if (typeof value === 'object') {
                if (value instanceof (<any>Rx.Observable)) {
                    descriptor[key] = Type.OBSERVABLE;
                    observables[keys.join('.')] = value;
                } else if (!Array.isArray(value)) {
                    descriptor[key] = createProxyDescriptor(value, observables, keys)
                }
            }
            return descriptor;
        }, {});
}

function newQuery(chain: string[], sendMessage: (args: any) => void, deferredStack: JQueryDeferred<any>[]): any {
    return (...args: any []) => {
        sendMessage({
            operation: Operation.REQUEST,
            chain: chain,
            args: args
        });
        var deferred = $.Deferred<any>();
        deferredStack.push(deferred);
        return deferred.promise();
    }
}

function createProxy(descriptor: any, sendMessage: (args: any) => void, deferredStack: JQueryDeferred<any>[], baseKeys: string[] = []): any {
    return Object.keys(descriptor)
        .reduce((proxy: any, key: string) => {
            var value = descriptor[key],
                keys = baseKeys.concat(key);
            if (value === Type.FUNCTION) {
                proxy[key] = newQuery(keys, sendMessage, deferredStack);
            } else if (value === Type.OBSERVABLE) {
                proxy[key] = new Rx.Subject();
            } else if (typeof value === 'object') {
                proxy[key] = createProxy(descriptor[key], sendMessage, deferredStack, keys)
            }
            return proxy;
        }, {});
}


class WorkerBridge {

    private disposables: Rx.Disposable[];
    
    private deferredStack: JQueryDeferred<any>[] = [];
    
    private initDeferred: JQueryDeferred<any>
    
    private services: any;
    
    proxy: any
    
    constructor(
        private target: WorkerBridge.MessageTarget
    ) {}
    
    
    init(services: any): JQueryPromise<any> {
        this.services = services;
        this.initDeferred = $.Deferred<any>();

        var target = this.target;
        target.onmessage = this.messageHandler

        var observables: { [index: string]: Rx.Observable<any> } = {};
        target.postMessage({
            operation : Operation.EXPOSE,
            descriptor: createProxyDescriptor(services, observables)
        });

        this.disposables =  Object.keys(observables).map(key => {
            var observable = observables[key];
            return observable.subscribe(
                value => target.postMessage({ 
                    operation: Operation.OBSERVABLE_NEXT, 
                    chain: key.split('.') , 
                    value: value
                }),
                error => target.postMessage({ 
                    operation: Operation.OBSERVABLE_ERROR, 
                    chain: key.split('.'), 
                    error: error
                }),
                () => target.postMessage({ 
                    operation: Operation.OBSERVABLE_COMPLETED, 
                    chain: key.split('.'), 
                })
            )
        });
        return this.initDeferred.promise();
    }
    
    dispose() {
        this.disposables.forEach(disposable => disposable.dispose());
        this.target.onmessage = null;
    }
    
    private messageHandler = (message: WorkerBridge.Message) =>  {
        var data = message.data;
        var target = this.target;
        switch(data.operation) {
            case Operation.EXPOSE:
                this.proxy = createProxy(
                    data.descriptor,  
                    (args: any) => target.postMessage(args), 
                    this.deferredStack
                );

                this.initDeferred.resolve(this.proxy);
                break;

            case Operation.REQUEST:
                $.Deferred(deferred => {
                    try {
                        var chain: string[] = data.chain.slice(),
                            thisObject: any = null,
                            method: any = this.services;
                        while (chain.length) {
                            thisObject = method;
                            method = method[chain.shift()];
                        }
                        var result: any = method.apply(thisObject, data.args);
                    } catch(e) {
                        deferred.reject(e);
                        return;
                    }

                    $.when(result).then(
                        deferred.resolve.bind(deferred), 
                        deferred.reject.bind(deferred)
                    )
                }).then(result => {
                    target.postMessage({
                        operation: Operation.RESPONSE,
                        chain: data.chain,
                        result: result
                    });
                }, (error?) => {
                    target.postMessage({
                        operation: Operation.ERROR,
                        chain: data.chain,
                        errorMessage: error instanceof Error? error.message : error
                    });
                });

                break;

            case Operation.RESPONSE:
                var deferred = this.deferredStack.shift();
                deferred.resolve(data.result);
                break;

            case Operation.ERROR:
                var deferred = this.deferredStack.shift();
                deferred.reject(new Error(data.errorMessage));
                break;
                
            default:
                var chain: string[] = data.chain.slice(),
                    subject: Rx.Subject<any> = this.proxy;
                while (chain.length) {
                    subject = subject[chain.shift()];
                }
                switch(data.operation) {
                    case Operation.OBSERVABLE_NEXT:
                        subject.onNext(data.value)
                        break;
                    case Operation.OBSERVABLE_ERROR:
                        subject.onError(data.error)
                        break;
                    case Operation.OBSERVABLE_COMPLETED:
                        subject.onCompleted()
                        break;
                }
        }
    }
}



module WorkerBridge {
    export interface MessageTarget {
        postMessage(message: any): void;
        onmessage: (event: Message) => void;
    }
    
    export interface Message {
        data: any
    }
}

export = WorkerBridge;
