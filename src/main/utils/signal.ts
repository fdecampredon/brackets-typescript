'use strict';

export interface ISignal<T> {
    add(listener: (parameter: T) => any, priority?: number): void;
    remove(listener: (parameter: T) => any): void;
    dispatch(parameter: T): boolean;
    clear(): void;
    hasListeners(): boolean;
}

export class Signal<T> implements ISignal<T> {
    private listeners: { (parameter: T): any }[] = [];
    private priorities: number[] = [];
    
    add(listener: (parameter: T) => any, priority = 0): void {
        var index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.priorities[index] = priority;
            return;
        }
        for (var i = 0, l = this.priorities.length; i < l; i++) {
            if (this.priorities[i] < priority) {
                this.priorities.splice(i, 0, priority);
                this.listeners.splice(i, 0, listener);
                return;
            }
        }
        this.priorities.push(priority);
        this.listeners.push(listener);
    }
    
    remove(listener: (parameter: T) => any): void {
        var index = this.listeners.indexOf(listener);
        if (index >= 0) {
            this.priorities.splice(index, 1);
            this.listeners.splice(index, 1);
        }
    }
    
    dispatch(parameter: T): boolean {
        var indexesToRemove: number[];
        var hasBeenCanceled = this.listeners.every((listener: (parameter: T) => any) =>  {
            var result = listener(parameter);
            return result !== false;
        });
        
        return hasBeenCanceled;
    }
    
    clear(): void {
        this.listeners = [];
        this.priorities = [];
    }
    
    hasListeners(): boolean {
        return this.listeners.length > 0;
    }
}


export class JQuerySignalWrapper<JQueryEventObject> implements ISignal<JQueryEventObject>  {
  
    constructor(
        private target: JQuery, 
        private event: string
    ) {}
    
    private signal: Signal<JQueryEventObject> = new Signal<JQueryEventObject>();
    private jqueryEventHandler = (parameter: JQueryEventObject) => {
        this.signal.dispatch(parameter);
    }    
    
    add(listener: (parameter: JQueryEventObject) => any, priority?: number): void {
        this.signal.add(listener, priority);
        this.target.on(this.event, this.jqueryEventHandler); 
    }
    
    remove(listener: (parameter: JQueryEventObject) => any): void {
        this.signal.remove(listener);
        if (!this.hasListeners()) {
            this.removeJQueryEventListener();
        }
    } 
    
    dispatch(parameter: JQueryEventObject): boolean {
        return this.signal.dispatch(parameter);
    }
    
    clear(): void {
        this.signal.clear();
        this.removeJQueryEventListener();
    }
    
    hasListeners(): boolean {
        return this.signal.hasListeners();
    }
    
    private removeJQueryEventListener() {
        this.target.off(this.event, this.jqueryEventHandler);
    }
}


export class DomSignalWrapper<T extends Event> implements ISignal<T>  {
  
    constructor(
        private target: EventTarget, 
        private event: string,
        private capture: boolean
    ) {}
    
    private signal: Signal<T> = new Signal<T>();
    private eventHandler = (parameter: T) => {
        this.signal.dispatch(parameter);
    }    
    
    add(listener: (parameter: T) => any, priority?: number): void {
        this.signal.add(listener, priority);
        this.target.addEventListener(this.event, this.eventHandler, this.capture);
    }
    
    remove(listener: (parameter: T) => any): void {
        this.signal.remove(listener);
        if (!this.hasListeners()) {
            this.removeEventListener();
        }
    } 
    
    dispatch(parameter: T): boolean {
        return this.signal.dispatch(parameter);
    }
    
    clear(): void {
        this.signal.clear();
        this.removeEventListener();
    }
    
    hasListeners(): boolean {
        return this.signal.hasListeners();
    }
    
    private removeEventListener() {
        this.target.removeEventListener(this.event, this.eventHandler, this.capture);
    }
}