'use strict';

import signal = require('../main/utils/signal');

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