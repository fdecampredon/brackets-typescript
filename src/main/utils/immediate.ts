'use strict';


var immediateImpl: {
    setImmediate(expression: any, ...args: any[]): number;
    clearImmediate(handle: number): void;
};

interface Task {
    handle: number;
    callBack: (args: any[]) => any;
    parameters: any[];
}

if (typeof window.setImmediate !== 'undefined') {
    immediateImpl = window;
} else {
    var setImmediateQueue: Task[] = [],
        canceledImmediate: { [handle: number]: boolean } = {},
        sentinel = 'immediate' + String(Math.random()),
        uidHelper = 0;
    
    window.addEventListener('message', (event: MessageEvent) => {
        if (event.data === sentinel) {
            var queue = setImmediateQueue,
                canceled = canceledImmediate;
            
            setImmediateQueue = [];
            canceledImmediate = {};
            queue.forEach((task) => {
                if (!canceled[task.handle]) {
                    task.callBack.apply(null, task.parameters);
                }
            });
        }
    });
    
    immediateImpl = {
        setImmediate(expression: any, ...args: any[]): number {
            uidHelper++;
            setImmediateQueue.push({
                handle: uidHelper,
                callBack : typeof expression === 'string'? new Function(expression): expression,
                parameters: args
            });
            window.postMessage(sentinel, '*');
            return uidHelper;
        },
        clearImmediate(handle: number): void {
            canceledImmediate[handle] = true;
        }
    }
    
    Object.freeze(immediateImpl);
}

export = immediateImpl;
