//   Copyright 2013-2014 François de Campredon
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

/*istanbulify ignore file*/

'use strict';

import WorkerBridge = require('../commons/workerBridge');
import signal = require('../commons/signal');
import Promise = require('bluebird');

class FakeWorker {
    private initialized: boolean;
    onmessage: (message: { data: any }) => void;
    private workerOnMessage:  (message: { data: any }) => void;
    
    constructor(
        private source: (postMessage: (message: { data: any }) => void) => void
    ) {
        
    }
    postMessage(message: any): void {
        if (!this.initialized) {
            this.init();
        }
        setTimeout(() => {
            if (this.workerOnMessage) {
                this.workerOnMessage({ data: JSON.parse(JSON.stringify(message)) });
            }
        }, 0);
    }
    
    terminate() {
        this.workerOnMessage = null;
    }
    
   
    private init() {
        var workerPostMessage = (message: { data: any }) => {
            setTimeout(() => {
                if (this.onmessage) {
                    this.onmessage({ data: JSON.parse(JSON.stringify(message)) });
                }
            }, 0);
        };
        
        var workerContext: any = { postMessage: workerPostMessage };
        this.source.call( workerContext , workerPostMessage);
        this.workerOnMessage = workerContext.onmessage;
        this.initialized = true;
    }
}


describe('bridge', function () {
    var worker: FakeWorker,
        bridges: WorkerBridge [] = [];
    
    afterEach(function () {
        worker.terminate();
        bridges.forEach(bridge => bridge.dispose());
        bridges = [];
    });
    
    function createBridge(target: WorkerBridge.MessageTarget, services: any) {
        var bridge = new WorkerBridge(target);
        bridges.push(bridge);
        return bridge.init(services);
    }
    
    
    it('should expose to the worker services', function () {
        worker = new FakeWorker(function (postMessage) {
            createBridge(this, {}).then(services => {
                services.myService.myMethod();
            });
        });
        
        var spy = jasmine.createSpy('myMethod');
        createBridge(worker, {
            myService: {
                myMethod: spy
            }
        });
        
        waitsFor(() => spy.callCount === 1, 'spy should have been called', 100);
        
    });
    
    it('should expose services from the worker', function () {
        
        var spy = jasmine.createSpy('myMethod');
        worker = new FakeWorker(function (postMessage) {
            createBridge(this, {
                myService: {
                    myMethod: spy
                }
            });
        });
        
        
        createBridge(worker, {}).then(services => {
            services.myService.myMethod();
        });
        
        waitsFor(() => spy.callCount === 1, 'spy should have been called', 100);
        
    });
    
    
    it('proxied service should return a promise that resolve to the returned value of the original service', function () {
        
        worker = new FakeWorker(function (postMessage) {
            createBridge(this, {
                myService: {
                    myMethod: function () {
                        return 10;
                    }
                }
            });
        });
        
        var serviceResult: number;
        
        createBridge(worker, {}).then(services => {
            services.myService.myMethod().then( (result: any) => serviceResult = result);
        });
        
        waitsFor(() => !!serviceResult, 'serviceResult should have been set', 100);
        runs(function () {
            expect(serviceResult).toBe(10);
        });
    });
    
    
    it('if the original service return a promise the returned promise should resolve to the resolve value of this promise', function () {
        
        worker = new FakeWorker(function (postMessage) {
            createBridge(this, {
                myService: {
                    myMethod: function () {
                        return new Promise(resolve => {
                            resolve(10);
                        });
                    }
                }
            });
        });
        
        var serviceResult: number;
        
        createBridge(worker, {}).then(services => {
            services.myService.myMethod().then( (result: any) => serviceResult = result);
        });
        
        waitsFor(() => !!serviceResult, 'serviceResult should have been set', 100);
        runs(function () {
            expect(serviceResult).toBe(10);
        });
    });
    
    
    it('should pass the argument to the original service method', function () {
        
        worker = new FakeWorker(function (postMessage) {
            createBridge(this, {
                myService: {
                    myMethod: function (a: number, b: number) {
                        return a + b;
                    }
                }
            });
        });
        
        var serviceResult: number;
        
        createBridge(worker, {}).then(services => {
            services.myService.myMethod(2, 3).then( (result: any) => serviceResult = result);
        });
        
        waitsFor(() => !!serviceResult, 'serviceResult should have been set', 100);
        runs(function () {
            expect(serviceResult).toBe(5);
        });
    });
    
    
    it('proxied service should return a promise that reject to the original error message if an error occur', function () {
        
        worker = new FakeWorker(function (postMessage) {
            createBridge(this, {
                myService: {
                    myMethod: function () {
                        throw new Error('my error message');
                    }
                }
            });
        });
        
        var serviceError: Error;
        
        createBridge(worker, {}).then(services => {
            services.myService.myMethod().then( undefined, (error: any) => serviceError = error);
        });
        
        waitsFor(() => !!serviceError, 'errorMessage should have been set', 100);
        runs(function () {
            expect(serviceError instanceof Error).toBe(true);
            expect(serviceError.message).toBe('my error message');
        });
    });
    
    it('if the original service return a promise that is rejected the resulted promise should be rejected ', function () {
        
        worker = new FakeWorker(function (postMessage) {
            createBridge(this, {
                myService: {
                    myMethod: function () {
                        return new Promise((resolve, reject) => reject('my error'));
                    }
                }
            });
        });
        
         var serviceError: Error;
        
        createBridge(worker, {}).then(services => {
            services.myService.myMethod().then( undefined, (error: any) => serviceError = error);
        });
        
        waitsFor(() => !!serviceError, 'errorMessage should have been set', 100);
        runs(function () {
            expect(serviceError instanceof Error).toBe(true);
            expect(serviceError.message).toBe('my error');
        });
    });
    
    
     
    it('if a service expose a signal, the proxied service should expose a signal that ' +
            'is synchronized with the original service', function () {
        
        worker = new FakeWorker(function (postMessage) {
            createBridge(this, {
                signal: new signal.Signal()
            });
        });
        
        var exposedSignal: signal.Signal<string>,
            spy = jasmine.createSpy('onNext');
        
        createBridge(worker, {}).then(services => {
            exposedSignal = services.signal;
        });
        
        waitsFor(() => !!exposedSignal,  'workerSignal should have been set', 100);
        runs(function () {
            exposedSignal.add(spy);
            exposedSignal.dispatch('hello');
            exposedSignal.dispatch('world');
        });
        waits(100);
        runs(function () {
            expect(spy).toHaveBeenCalledWith('hello');
            expect(spy).toHaveBeenCalledWith('world');
        });
    });
    
});
