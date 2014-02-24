//   Copyright 2013 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

'use strict';


//--------------------------------------------------------------------------
//
//  WorkerBridge
//
//--------------------------------------------------------------------------

import utils = require('./utils');
import Rx = require('rx');

/**
 * list of operations that can be requested
 */
enum Operation {
    REQUEST,
    RESPONSE,
    ERROR,
    EXPOSE,
    OBSERVABLE_NEXT,
    OBSERVABLE_ERROR,
    OBSERVABLE_COMPLETED
}

/**
 * type of function exposed
 */
enum Type {
    FUNCTION,
    OBSERVABLE
}

/**
 * create a descriptor for a map of exposed services
 * 
 * @param services
 * @param observables
 * @param baseKeys
 */
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

/**
 * create a query factory for a proxied service method
 */
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


/**
 * create proxy from proxy descriptor
 */
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

/**
 * a simple bridge that will expose services from the 2 sides of a web worker
 */
class WorkerBridge {

    /**
     * disposabmles
     */
    private disposables: Rx.Disposable[];
    
    /**
     * stack of deferred bound to a requres
     */
    private deferredStack: JQueryDeferred<any>[] = [];
    
    /**
     * deffered tracking sate
     */
    private initDeferred: JQueryDeferred<any>
    
    /**
     * @private
     * exposed services
     */
    private services: any;
    
    /**
     * build proxy of the bridge
     */
    proxy: any
    
    constructor(
        /**
         * target
         */
        private target: WorkerBridge.MessageTarget
    ) {}
    
    /**
     * initialize te bridge, return a promise that resolve to the created proxy 
     * @param services the exposed services
     */
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
    
    /**
     * dispose the bridge
     */
    dispose() {
        this.disposables.forEach(disposable => disposable.dispose());
        this.target.onmessage = null;
    }
    
    /**
     * message handler
     */
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
