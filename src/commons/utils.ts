/*istanbulify ignore file*/

export function assign(target: any, ...items: any[]): any {
    return items.reduce(function (target: any, source: any) {
        return Object.keys(source).reduce((target: any, key: string) => {
            target[key] = source[key];
            return target;
        }, target);
    }, target);
}

export function clone<T>(target: T): T {
    return assign({}, target);
}

export function deepClone<T>(source: T): T {
    return Object.keys(source).reduce((result: any, key: string) => {
        var value: any = (<any>source)[key];
        if (typeof value === 'object') {
            value = deepClone(value);
        }
        result[key] = value;
        return result;
    }, Array.isArray(source) ? [] : {});
}

export function getEnumerablePropertyNames(target: any): string [] {
    var result: string[] = [];
    for (var key in target) {
        result.push(key);
    }
    return result;
}

export function mergeAll<T>(array: T[][]): T[] {
    var results: T[] = [];
    array.forEach(subArray => {
        Array.prototype.push.apply(results, subArray);
    });
    
    return results;
};





