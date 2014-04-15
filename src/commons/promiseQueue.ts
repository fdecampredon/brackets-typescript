import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;
class PromiseQueue {
    
    private promise: Promise<any>;
    private initializer: (result: any) => any;
    
    constructor() {
        this.promise = new Promise(resolve => {
            this.initializer = resolve;    
        })
    }
    
    init<T>(val: Promise<T>):Promise<T>
    init<T>(val: T): Promise<T> {
        this.initializer(val);
        return this.promise;
    }
    
   
    then<T>(action: () => Promise<T>):Promise<T>
    then<T>(action: () => T): Promise<T>
    then(action: () => void): Promise<void> {
        return this.promise = this.promise.then(() => action());
    }
}

export = PromiseQueue;