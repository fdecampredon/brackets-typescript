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

import Promise = require('bluebird');
import TypeScriptProjectService = require('typescript-project-services');


/**
 * callback that resolve the internal promise 
 */
var serviceResolver: (t: typeof TypeScriptProjectService) => void;

/**
 * internal promise 
 */
var promise: Promise<typeof TypeScriptProjectService>;


/**
 * inject the service
 * 
 * @param service the injected service
 */
export function setService(service: typeof TypeScriptProjectService) {
    serviceResolver(service);
}

/**
 * @return a promise that will be resolved when the service get injected
 */
export function getService(): Promise<typeof TypeScriptProjectService> {
    return promise;    
}

/**
 * reset the injection
 */
export function reset() {
    promise = new Promise(resolve => serviceResolver = resolve);
}

reset();

