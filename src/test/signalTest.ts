'use strict';

import signal = require('../main/utils/signal');

describe('signals', function () {
    var sign: signal.ISignal<any>,
        spy: SinonSpy;
    beforeEach( function() {
        sign = new signal.Signal<any>();
        spy = sinon.spy();  
        sign.add(spy);
            
    });
    
    it('should call listener when event dispatched, with parameter passed to dispatch', function () {
        var parameter = {};
        expect(sign.dispatch(parameter)).toBe(true);
        expect(spy.calledOnce).toBe(true);
        expect(spy.args[0][0]).toBe(parameter);
    });
    
    it('should not call listener after removal', function () {
        sign.remove(spy);
        expect(sign.dispatch(null)).toBe(true);
        expect(spy.notCalled).toBe(true);
    });
    
    it('should not add a listener twice', function() {
        sign.add(spy);
        expect(sign.dispatch(null)).toBe(true);
        expect(spy.calledOnce).toBe(true);
    });
    
    it('should call listener in order of add', function () {
        var spy2 = sinon.spy();
        sign.add(spy2);
        expect(sign.dispatch(null)).toBe(true);
        expect(spy.calledBefore(spy2)).toBe(true);
    });
    
    it('should call listener in order of priority if given', function () {
        var spy2 = sinon.spy();
        sign.add(spy2, 1);
        expect(sign.dispatch(null)).toBe(true);
        expect(spy2.calledBefore(spy)).toBe(true);
    });
    
    it('should not call any listener after clear call', function () {
        var spy2 = sinon.spy();
        sign.add(spy2);
        sign.clear();
        expect(sign.dispatch(null)).toBe(true);
        expect(spy.notCalled).toBe(true);
        expect(spy2.notCalled).toBe(true);
    });
    
    it('should not call a listener if another lister returned \'false\’ before, and dispatch should return false', function () {
        sign.add(function () {
            return false;
        }, 1);
        expect(sign.dispatch(null)).toBe(false);
        expect(spy.notCalled).toBe(true);
    });
});