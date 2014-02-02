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


'use strict';

import signal = require('../main/utils/signal');
import sinon = require('sinon');
import test = require('tape');


test('signals', function (t) {
    var sign: signal.ISignal<any>,
        spy: SinonSpy;
    
    function reset() {
        sign = new signal.Signal<any>();
        spy = sinon.spy() 
        sign.add(spy);
    };
    
    t.test('should call listener when event dispatched, with parameter passed to dispatch', function (t) {
        reset();
        var parameter = {};
        t.ok(sign.dispatch(parameter));
        t.ok(spy.called);
        t.end();
    });
    
    t.test('should not call listener after removal', function (t) {
        reset();
        sign.remove(spy);
        t.ok(sign.dispatch(null));
        t.equal(spy.callCount, 0);
        t.end();
    });
    
    t.test('should not add a listener twice', function(t) {
        reset();
        sign.add(spy);
        t.ok(sign.dispatch(null));
        t.equal(spy.callCount, 1);
        t.end();
    });
    
    /*t.test('should call listener in order of add', function () {
        var spy2 = jasmine.createSpy('spy2').andCallFake(function () {
            expect(spy).toHaveBeenCalled();
        });
        sign.add(spy2);
        expect(sign.dispatch(null)).to.be(true);
    });*/
    
    /*t.test('should call listener in order of priority if given', function () {
        var spy2 = jasmine.createSpy('spy2').andCallFake(function () {
            expect(spy.callCount).to.be(0);
        });
        sign.add(spy2, 1);
        expect(sign.dispatch(null)).to.be(true);
        expect(spy).toHaveBeenCalled();
    });*/
    
    /*t.test('should not call any listener after clear call', function () {
        var spy2 = jasmine.createSpy('spy2');
        sign.add(spy2);
        sign.clear();
        expect(sign.dispatch(null)).to.be(true);
        expect(spy.callCount).to.be(0);
        expect(spy2.callCount).to.be(0);
    });*/
    
    /*t.test('should not call a listener if another lister returned \'false\’ before, and dispatch should return false', function () {
        sign.add(function () {
            return false;
        }, 1);
        expect(sign.dispatch(null)).to.be(false);
        expect(spy.callCount).to.be(0);
    });*/
});