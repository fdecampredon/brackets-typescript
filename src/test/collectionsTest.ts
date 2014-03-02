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

/*istanbulify ignore file*/

import collections = require('../commons/collections');
describe('StringSet', function () {
    var stringSet: collections.StringSet;
    beforeEach(function () {
        stringSet = new collections.StringSet();
    })
    it('should have constructor takes an array of string as argument and add every element of this array to the Set', function () {
        stringSet = new collections.StringSet(['hello', 'world']);
        expect(stringSet.has('hello')).toBe(true);
        expect(stringSet.has('world')).toBe(true);
        expect(stringSet.has('bla')).toBe(false);
    })
    
    it('should allow to add/remove string from the set and check presence', function () {
        stringSet.add('hello');
        stringSet.add('world');
        stringSet.remove('hello');
        stringSet.remove('foo');
        expect(stringSet.has('hello')).toBe(false);
        expect(stringSet.has('world')).toBe(true);
        expect(stringSet.values).toEqual(['world']);
    });
    
    it('should not contains object prototype method', function () {
        expect(stringSet.has('hasOwnProperty')).toBe(false);
    });
    
    it('should have a property \'values\' returning an array of string refelecting the Set', function () {
        stringSet.add('hello'),
        stringSet.add('world');
        stringSet.add('foo');
        stringSet.add('bar');
        stringSet.remove('foo');
        
        expect(stringSet.values.sort()).toEqual(['hello', 'world', 'bar'].sort());
    });
});

describe('StringMap', function () {
    var stringMap: collections.StringMap<any>;
    beforeEach(function () {
        stringMap = new collections.StringMap();
    });
    
    it('should have a constructor that takes an object has parameter and and each pair property/value of this object has entry of the map', function () {
        stringMap = new collections.StringMap({ 'foo' : 'bar', 'hello' : 'world' });
        expect(stringMap.get('hello')).toBe('world');
        expect(stringMap.get('foo')).toBe('bar');
        expect(stringMap.has('bla')).toBe(false);
    });
    
    it('should allow to set keys/values', function () {
        var obj1 = {},
            obj2 = {},
            obj3 = 4;
        stringMap.set('foo', obj1);
        stringMap.set('foo', obj2);
        stringMap.set('bar', obj3);
        expect(stringMap.get('foo')).toBe(obj2);
        expect(stringMap.get('bar')).toBe(obj3);
    });
    
    it('should allow to delete entries', function () {
        stringMap.set('foo', 'bar');
        stringMap.delete('foo');
        expect(stringMap.has('foo')).toBe(false);
    });
    
    it('should differencied \'undefined\' value and unset value', function () {
        stringMap.set('foo', undefined);
        expect(stringMap.get('foo')).toBe(undefined);
        expect(stringMap.get('bar')).toBe(undefined);
        expect(stringMap.has('foo')).toBe(true);
        expect(stringMap.has('bar')).toBe(false);
    });
    
    it('should does not contains object prototype defualt property', function () {
        expect(stringMap.has('hasOwnProperty')).toBe(false);
    });
    
    it('should provide a properties \'keys\' returning an array of map key', function () {
        stringMap = new collections.StringMap({ 'foo' : 'bar', 'hello' : 'world' });
        expect(stringMap.keys.sort()).toEqual(['foo','hello']);
    });
    
    it('should provide a properties \'values\' returning an array of map key', function () {
        stringMap = new collections.StringMap({ 'foo' : 'bar', 'hello' : 'world' });
        expect(stringMap.values.sort()).toEqual(['bar','world']);
    });
    
    it('should provide a properties \'entries\' returning an array of map entrie', function () {
        stringMap = new collections.StringMap({ 'foo' : 'bar', 'hello' : 'world' });
        expect(stringMap.entries).toEqual([ { key: 'foo', value: 'bar' }, { key: 'hello', value: 'world' } ]);
    });
    
    it('should provide a properties \'toObject\' returning an object reprensenting the map', function () {
        stringMap = new collections.StringMap({ 'foo' : 'bar', 'hello' : 'world' });
        expect(stringMap.toObject()).toEqual({ 'foo' : 'bar', 'hello' : 'world' });
    });
    
    
    it('should provide a method clear allowing to empty the map', function () {
        stringMap = new collections.StringMap({ 'foo' : 'bar', 'hello' : 'world' });
        stringMap.clear();
        expect(stringMap.toObject()).toEqual({});
    });
    
    it('should provide a method clone allowing to clone the map', function () {
        stringMap = new collections.StringMap({ 'foo' : 'bar', 'hello' : 'world' });
        var stringMap2 = stringMap.clone();
        expect(stringMap2).toNotBe(stringMap);
        expect(stringMap.toObject()).toEqual(stringMap2.toObject());
    });
});