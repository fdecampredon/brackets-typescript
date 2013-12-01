export class StringSet {
    private map: { [path: string]: boolean };
    
    constructor() {
        this.map = Object.create(null)
    }
    
    add(value: string): void {
        this.map[value] = true;
    }
    
    remove(value: string): boolean {
        return delete this.map[value];
    }
    
    has(value: string): boolean {
        return !!this.map[value];
    }
 
    get keys(): string[] {
        return Object.keys(this.map);
    }
}

export class StringMap<T> {
    private map: { [path: string]: T };
    private mascot: T
    
    constructor() {
        this.map = Object.create(null);
        this.mascot = <T>{};
    }
    
    set(key: string, value: T): void {
        this.map[key] = (typeof value === 'undefined' ? this.mascot : value);
    }
    
    get(key: string): T {
        var value = this.map[key];
        return value === this.mascot ? undefined : value;
    }
    
    delete(key: string): boolean {
        return delete this.map[key];
    }
    
    has(key: string): boolean {
        return typeof this.map[key] !== 'undefined';
    }
    
    clear(): void {
        this.map = Object.create(null);
    }
    
    get keys() {
        return Object.keys(this.map);
    }
    
    get values() {
        return Object.keys(this.map).map(key => this.map[key]);
    }
    
    clone(): StringMap<T> {
        var map = new StringMap<T>();
        this.keys.forEach(key => {
            map.set(key, this.get(key));
        })
        return map;
    }
}