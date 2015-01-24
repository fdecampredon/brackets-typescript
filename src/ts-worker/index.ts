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

'use strict';

declare var global: any;
// inject global in the worker
global.window = self;


import service = require('typescript-project-services');
import WorkerBridge = require('../main/workerBridge');
import Promise = require('bluebird');

(<any>Promise).setScheduler((function(){
    var queuedFn: () => void = void 0;

    var channel = new global.MessageChannel();
    channel.port1.onmessage = function Promise$_Scheduler() {
            var fn = queuedFn;
            queuedFn = void 0;
            fn();
    };

    return function Promise$_Scheduler(fn: () => void) {
        queuedFn = fn;
        channel.port2.postMessage(null);
    };
})());

service.injectPromiseLibrary(Promise);

var bridge = new WorkerBridge(<any>self);

//expose the worker services
bridge.init(service).then(proxy => {
    var console = proxy.console;
    service.injectLogger(
        () => void 0, 
        console.warn.bind(console),
        console.error.bind(console)
    );
    return Promise.all([
        proxy.getTypeScriptLocation(),
        proxy.preferencesManager.getProjectsConfig()
    ])
    .then(result => {
        service.init({
            defaultTypeScriptLocation: <any>result[0],
            fileSystem: proxy.fileSystem,
            workingSet: proxy.workingSet,
            projectConfigs: <any>result[1]
        });     
        proxy.preferencesManager.configChanged.add(() => {
            proxy.preferencesManager.getProjectsConfig().then((config: any) => {
                service.updateProjectConfigs(config);
            })
        })
    })
});
