/*global require, importScripts, onmessage:true, postMessage */
importScripts('./third_party/require.js');
importScripts('./third_party/typescriptServices.js');
importScripts('./third_party/path-utils.js');

var self = this;
function messageHandler(event) {
    'use strict';
    var baseUrl = event.data;
    self.removeEventListener('message', messageHandler, false);
    require({ baseUrl: baseUrl }, ['ts-worker/index'], function (tsService) {
        self.addEventListener('message', tsService.messageHandler, false);
        postMessage('ready');
    });
}

self.addEventListener('message', messageHandler, false);


