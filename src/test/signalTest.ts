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

import signal = require('../commons/signal');

describe('signals', function () {
    var sign: signal.ISignal<any>,
        spy: jasmine.Spy;
    
    beforeEach( function() {
        sign = new signal.Signal<any>();
        spy = jasmine.createSpy('spy');  
        sign.add(spy);
    });
    
    it('should call listener when event dispatched, with parameter passed to dispatch', function () {
        var parameter = {};
        expect(sign.dispatch(parameter)).toBe(true);
        expect(spy).toHaveBeenCalledWith(parameter);
    });
    
    it('should not call listener after removal', function () {
        sign.remove(spy);
        expect(sign.dispatch(null)).toBe(true);
        expect(spy.callCount).toBe(0);
    });
    
    it('should not add a listener twice', function() {
        sign.add(spy);
        expect(sign.dispatch(null)).toBe(true);
        expect(spy.callCount).toBe(1);
    });
    
    it('should call listener in order of add', function () {
        var spy2 = jasmine.createSpy('spy2').andCallFake(function () {
            expect(spy).toHaveBeenCalled();
        });
        sign.add(spy2);
        expect(sign.dispatch(null)).toBe(true);
    });
    
    it('should call listener in order of priority if given', function () {
        var spy2 = jasmine.createSpy('spy2').andCallFake(function () {
            expect(spy.callCount).toBe(0);
        });
        sign.add(spy2, 1);
        expect(sign.dispatch(null)).toBe(true);
        expect(spy).toHaveBeenCalled();
    });
    
    it('should not call any listener after clear call', function () {
        var spy2 = jasmine.createSpy('spy2');
        sign.add(spy2);
        sign.clear();
        expect(sign.dispatch(null)).toBe(true);
        expect(spy.callCount).toBe(0);
        expect(spy2.callCount).toBe(0);
    });
    
    it('should not call a listener if another lister returned \'false\’ before, and dispatch should return false', function () {
        sign.add(function () {
            return false;
        }, 1);
        expect(sign.dispatch(null)).toBe(false);
        expect(spy.callCount).toBe(0);
    });
});
