"use strict";

var $ = {},
    exports = $;

/**
 * 
 * @class toolous
 */
var toolous = {};

/**
 * Returns true iff the given object is an array
 * @param {any} obj the object to test
 * @method isArray
 */
toolous.isArray = Array.isArray || function(obj) {
    return toString.call(obj) == '[object Array]';
};

/**
 * No operation - does nothing.
 * @method noop
 */
toolous.noop = function() {};

/**
 * Creates an array object of the captured arguments value from the given index (defaults to 0).
 * @param {arguments} args the array like arguments object, should always be <i>arguments</i>
 * @param {integer} from the index to start the copy from, defaults to 0
 * @param {any...} prepends objects to prepend to the return value. If this is specified 'from' is mandatory
 * @method toArray
 */
toolous.toArray = function(args, from) {
    var ret = Array.prototype.slice.call(args, toolous.nvl(from, 0));
    if (arguments.length > 2) {
        return toolous.toArray(arguments, 2).concat(ret);
        //skipping args and from
    }
    return ret;
};
/**
 * Replaces a value if it's undefined: Returns val if it's defined or def otherwise
 * @param {any} val the value that will be returned if it is defined.
 * @param {any} def the default value if val is undefined
 * @method nvl
 * */
toolous.nvl = function(val, def) {
    return toolous.isDef(val) ? val : def;
};
/**
 * returns true iff the value is not undefined
 * @param {any} o the value to check
 * @method isDef
 */
toolous.isDef = function(o) {
    return typeof o !== "undefined";
};
/**
 * returns true iff the value is a function
 * @param {any} func the value to check if a function
 * @method isFunction
 */
toolous.isFunction = function(o) {
    return typeof o === "function";
};

/**
 * Merges properties from all Sets all properties in override to target, the rightmost object is the most important
 * @param {Object} target the object that will be merged into
 * @param {Object...} sources each source object's properties will be copied to target, the right most source is the most significant. undefined values are ignored.
 * @return {Object} always returns target
 * @method merge
 */
toolous.merge = function(target, source) {
    if (toolous.isDef(source)) {
        toolous.forEachKey(source, function(key, value) {
            target[key] = value;
        });
    }

    if (arguments.length > 2) {
        return toolous.merge.apply(toolous, toolous.toArray(arguments, 2, target));
    }
    return target;
};

/**
 * Iterates an array as per the Array.forEach spec: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/forEach
 *
 * @param {Array} arr The array to iterate on
 * @param {function(any, number, Array)} cb called with each element, it's index and the array
 * @param {any} thisArg the context to run cb on
 * @method forEach
 */
toolous.forEach = function(arr, cb, thisArg) {
    if (arr.forEach) {
        arr.forEach(cb, thisArg);
    } else {
        for (var i = 0; i < arr.length; ++i) {
            if (toolous.isDef(arr[i])) {
                cb.call(thisArg, arr[i], i, arr);
            }
        }
    }
};

/**
 * Calls a callback for each key and value in an object
 * @param {Object} obj The object who'se properties will be enumerated
 * @param {function(string, any)} cb called with each property key and value. Context is the iterated object
 * @param {boolean} owned if true only the object's own properties will be iterated (see Object.hasOwnProperty), defaults to true
 * @method forEachKey
 */
toolous.forEachKey = function(obj, cb, owned) {
    var any = !toolous.nvl(owned, true);
    for (var key in obj) {
        if (any || obj.hasOwnProperty(key)) {
            cb.call(obj, key, obj[key]);
        }
    }
};

/**
 * Returns a binding of the function to the given object <br/>
 * Adapted from https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind to avoid changing the Function prototype.
 * @param {string | function} func the function to bind to. If this is a string the method named func on obj is bound.
 * @param {any} obj the object to bind the function to
 * @method bind
 */
toolous.bind = function(fToBind, oThis) {
    if ( typeof (fToBind) === "string") {
        fToBind = oThis[fToBind];
    }
    if (fToBind.bind) {
        return fToBind.bind.apply(fToBind, toolous.toArray(arguments, 1));
    }
    //Adapted from: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind
    if ( typeof fToBind !== "function") {
        // closest thing possible to the ECMAScript 5 internal IsCallable function
        throw new TypeError("toolous.bind - what is trying to be bound is not callable");
    }

    var aArgs = toolous.toArray(arguments, 2), NOPf = function() {
    }, fBound = function() {
        return fToBind.apply(this instanceof NOPf && oThis ? this : oThis, aArgs.concat(toolous.toArray(arguments)));
    };

    NOPf.prototype = fToBind.prototype;
    fBound.prototype = new NOPf();

    return fBound;
};




//=============================Callback lists=============================
/**
 * Utility object to contain a list of callbacks that can be fired with arguments and a context. <br/>
 * Callback lists can be configured to delete listeners upon file (i.e. 'once'),
 * and/or to retain last fired arguments and context to send to newly add listeners (i.e. 'memory')
 * @param {Object} options optional callback options
 * @param {boolean} options.once  true if to remove listeners after firing. (default=false)
 * @param {boolean} options.memory true if to keep the last value (and context) in memory and fire on new listeners (default=true)
 * @class CallbackList
 * @constructor
 */
function CallbackList(options) {
    this._callbacks = [];
    this.options = toolous.merge({
        once : false,
        memory : true
    }, options);
}

/**
 * Binds cb as a listener for this CallbackList. <br/>
 * If there is a last value stored in memory (only if constructed with memory=true), cb is immediately called (and if once===true) then removed as a listener.
 * @param {function} cb the listener callback
 * @method add
 * @return {CallbackList} this
 */
CallbackList.prototype.add = function(cb) {
    this._callbacks.push(cb);
    if (this.firedArgs) {//memory, firedArgs is always trueish if exists (since it is an array)
        cb.apply(this.firedContext, this.firedArgs);
        if (this.options.once) {//clean listeners
            this._callbacks = [];
        }
        //also removes the listener if once===true
    }
    return this;
};
/**
 * Fires all listeners with the given context and any arguments given after it
 * @param {any} context the context to fire the callbacks with
 * @param {any...} args the arguments to send all callback listeners
 * @method fireWith
 * @return {CallbackList} this
 */
CallbackList.prototype.fireWith = function(context) {
    var args = toolous.toArray(arguments, 1);
    //ignore context as a parameter to the callback
    if (this.options.memory) {//store value in memory
        this.firedArgs = args;
        this.firedContext = context;
    }
    toolous.forEach(this._callbacks, function(cb) {
        cb.apply(context, args);
    });
    if (this.options.once) {//clean listeners
        this._callbacks = [];
    }
    return this;
};
/**
 * Fires all listeners with the null context and any arguments given to fire.<br/>
 * Equals to fireWith(null,...)
 * @param {any...} args the arguments to send all callback listeners
 * @method fire
 * @return {CallbackList} this
 */
CallbackList.prototype.fire = function() {//Fire without context
    return this.fireWith.apply(this, toolous.toArray(arguments, 0, null));
};
//===========================END Callback lists===========================

//========================= Finite State Machine =========================
/**
 * Finite State Machine (Or a flying spaghetti monster). <br/>
 * A finite state machine has a state (string), and fires events when the state changes
 * @param {Object} options Optional options object of the following format:
 * @param {string} options.state the initial state name. (default="initial")
 * @param {Object} options.stateOptions map between state names to their specific options. of the form {stateName: {once:bool, memory: bool, finalState: bool}}
 * @param {boolean} options.once Default once value for states that don't have a specific once value in options.stateOptions.  true if to remove listeners after firing. (default=true)
 * @param {boolean} options.memory Default memory value for states that don't have a specific memory value in options.stateOptions.  true if to keep the last value (and context) in memory and fire on new listeners (default=true)
 * @param {boolean}: options.finalState: Default finalState value for states that don't have a specific finalState value in options.stateOptions. - true if the FSM cannot change states once in this one. (default=false)
 * @class FSM
 */
function FSM(options) {
    options = toolous.merge({
        state : "initial"
    }, options);

    this._state = String(options.state);
    this._listeners = {};
    this._stateOpts = toolous.nvl(options.statesOptions, {});
    this._actualStateOpts = {};

    this._stateOptDefs = {
        once : !!toolous.nvl(options.once, true),
        memory : !!toolous.nvl(options.memory, true),
        finalState : !!toolous.nvl(options.finalState, false)
    };
}

/**
 * Returns the actual state options for <code>state</code>, as a merge between the default state options and the specific state options if any
 * @param {String} state state name
 * @method _getStateOptions
 * @return {Object} the options for the given state 
 * @private
 */
FSM.prototype._getStateOptions = function(state) {
    var actual = this._actualStateOpts[state];
    if (!toolous.isDef(actual)) {
        this._actualStateOpts[state] = actual = toolous.merge({}, this._stateOptDefs, this._stateOpts[state]);
    }
    return actual;
};
/**
 * returns the callback list for the given state name
 * @param {String} state state name
 * @return {CallbackList} the CallbackList for the given state
 * @method  _getCallbackList
 * @private
 */
FSM.prototype._getCallbackList = function(state) {
    var cbList = this._listeners[state];
    if (!cbList) {//create CallbackList
        var cblOptions = this._getStateOptions(state);
        this._listeners[state] = cbList = new CallbackList(cblOptions);
    }
    return cbList;
};
/**
 * Adds func as a listener when the state changes to <code>state<code>
 * @param {Object} state
 * @param {Object} func
 * @method on
 */
FSM.prototype.on = function(state, func) {
    state = String(state);
    var cbList = this._getCallbackList(state);
    cbList.add(func);
};

/**
 * If state is defined, attempts to change to it, firing any listeners upon change. <br/>
 * Trying to change from a final state has no effect, doesn't any event listeners and returns false.
 * @param {string} state the state name to change into. undefined has no affect and just retrieves the state.
 * @param {any} context the context to send to the event listeners.
 * @param {any...} arguments the arguments to pass forward to the event listeners
 * @return the state after the change (if any change occurred) or false if trying to change from a final state.
 * @method state
 * @return false if trying to change a final state, else the state after the method invocation 
 */
FSM.prototype.state = function(state,context) {
    if (toolous.isDef(state)) {//change
        var currentStateOptions = this._getStateOptions(this._state);
        //check if final
        if (currentStateOptions.finalState) {
            return false;
            //Cannot change.
        }
        this._state = state = String(state);
        var args = toolous.toArray(arguments, 1); //Removing state, keeping context //2, context);
        //skipping state
        var cbList = this._getCallbackList(state);
        cbList.fireWith.apply(cbList, args);
    }
    //get
    return this._state;
};
//======================= END Finite State Machine =======================

//=============================== Deferred ===============================
/**
 * @class Promise 
 */
var PROMISE_FUNCTIONS = [
/**
 * see {{#crossLink "Deferred/state:method"}}{{/crossLink}}
 * @method state
 */
    "state",
/**
 * see {{#crossLink "Deferred/then:method"}}{{/crossLink}}
 * @method then
 */
    "then",
    /**
 * see {{#crossLink "Deferred/done:method"}}{{/crossLink}}
 * @method done
 */
    "done",
    /**
 * see {{#crossLink "Deferred/fail:method"}}{{/crossLink}}
 * @method fail
 */
    "fail",
    /**
 * see {{#crossLink "Deferred/always:method"}}{{/crossLink}}
 * @method always
 */
    "always",
    /**
 * see {{#crossLink "Deferred/pipe:method"}}{{/crossLink}}
 * @method pipe
 */
    "pipe",
    /**
 * see {{#crossLink "Deferred/progress:method"}}{{/crossLink}}
 * @method progress
 */
    "progress"];

/**
 * Promise exposes the only promise's set of methods from a deferred object.
 * @param {Object} deferred the deferred object of which methods to expose
 * @param {any} this either a newly created object (when used with new), or an object to copy all of the promise methods to.
 * @class Promise
 * @constructor
 */
function Promise(deferred) {
    var promise = this;
    toolous.forEach(PROMISE_FUNCTIONS, function(funcName) {
        promise[funcName] = function() {
            var ret = deferred[funcName].apply(deferred, arguments);
            return ret === deferred ? promise : ret;
            //Not returning the deferred object.
        };
    });
    promise.promise = function() {
        return this;
    };
}

/**
 * @class Deferred 
 */
var STATES = {
    resolved : {
        /**
         * Returns true if this deferred is in the 'resolved' state
         * @method isResolved 
         * @return {boolean}
         */
        /**
         * Same as resolveWith(null, arguments...)
         * @method resolve 
         * @return {Deferred} this
         */
        /**
         * If currently pending, moves to the resolved state and fires any listeners bound on it
         * @method resolveWith
         * @param {any} context the context to fire the lisnters with
         * @param {any...} arguments the rest of the arguments.
         * @return {Deferred} this
         */
        fire : "resolve",
        listen : "done",
        thenIndex : 0,
        memory : true,
        once : true,
        query : "isResolved",
        finalState : true
    },
    rejected : {
        /**
         * Returns true if this deferred is in the 'rejected' state
         * @method isRejected
         * @return {boolean}
         */
        /**
         * Same as rejectWith(null, arguments...)
         * @method reject
         * @return {Deferred} this 
         */
        /**
         * If currently pending, moves to the rejected state and fires any listeners bound on it
         * @method rejectWith
         * @param {any} context the context to fire the lisnters with
         * @param {any...} arguments the rest of the arguments.
         * @return {Deferred} this
         */
        fire : "reject",
        listen : "fail",
        thenIndex : 1,
        memory : true,
        once : true,
        query : "isRejected",
        finalState : true
    },
    pending : {
        /**
         * Returns true if this deferred is in the 'rejected' state
         * @method isRejected
         * @return {boolean}
         */
        /**
         * Same as rejectWith(null, arguments...)
         * @method reject 
         * @return {Deferred} this
         */
        /**
         * If currently pending, moves to the rejected state and fires any listeners bound on it
         * @method rejectWith
         * @param {any} context the context to fire the lisnters with
         * @param {any...} arguments the rest of the arguments.
         * @return {Deferred} this
         */
        fire : "notify",
        listen : "progress",
        thenIndex : 2,
        memory : true,
        once : false
    }
};


/**
 * Returns a new empty deferred instance
 * @param {function(Deferred)} init a callback to be called once this deferred is initialized
 * @constructor
 */	
function Deferred(init) {
    if (!(this instanceof Deferred)) {//must be called with new.
        return new Deferred(init);
    }
    var deferred = this;
    this._fsm = new FSM({
        state : "pending",
        statesOptions : STATES
    });

    var promise = new Promise(this);
    this.promise = function(obj) {
        if (!toolous.isDef(obj)) {
            return promise;
        } else {
            toolous.merge(obj, promise);
            //copy properties, instanceof will not work.
            return obj;
        }
    };

    toolous.forEachKey(Deferred.prototype, function(name,func) {
        deferred[name] = toolous.bind(func,deferred);
    });
    this.pipe = this.then;

    if (toolous.isDef(init)) {
        init.call(this, this);
    }
}


toolous.forEachKey(STATES, function(state, stateDefinition) {
    var fire = stateDefinition.fire, listen = stateDefinition.listen, query = stateDefinition.query;

    Deferred.prototype[listen] = function(cb) {//Add listeners
        var callbacks = [];
        toolous.forEach(toolous.toArray(arguments), function(cb) {
            if (toolous.isArray(cb)) {
                callbacks = callbacks.concat(cb);
            }
            else if(toolous.isFunction(cb)) {
                callbacks.push(cb);
            }
        });
        // console.log(callbacks);
        var me = this;
        toolous.forEach(callbacks, function(cb) {
            me._fsm.on(state, cb);
        });

        return this;
    };
    Deferred.prototype[fire] = function() {
        this[fire + "With"].apply(this, toolous.toArray(arguments, 0, this.promise()));
        return this;
    };
    Deferred.prototype[fire + "With"] = function(context) {
        this._fsm.state.apply(this._fsm, toolous.toArray(arguments, 1, state, context));
        return this;
    };

    if (query) {
        Deferred.prototype[query] = function() {
            return this._fsm.state() === state;
        };
    }
});

/**
 * Bind a listener to be called on done or rejected
 * @method always 
 */
Deferred.prototype.always = function() {
    return this.done.apply(this, arguments).fail.apply(this, arguments);
};
/**
 * Returns the current state 'pending', 'resolved' or 'rejected'
 * @return {String} current state 
 */
Deferred.prototype.state = function() {
    return this._fsm.state();
};
/**
 * See http://api.jquery.com/deferred.then/
 * @method then 
 */
Deferred.prototype.then = function(/*doneFilter, failFilter, progressFilter*/) {//Took some inspiration from jQuery's implementation at https://github.com/jquery/jquery/blob/master/src/deferred.js
    var args = arguments,
        retDeferred = new Deferred(), //"returns a new promise that can filter the status and values of a deferred through a function"
        me = this; //The deferred on which to perform the filter
    toolous.forEachKey(STATES, function(state, stateDefinition) {
        var i = stateDefinition.thenIndex,
        // fire = stateDefinition.fire,
            listen = stateDefinition.listen,
            filter = toolous.isFunction(args[i]) && args[i];
        me[listen](function() {
            var filterResult = filter && filter.apply(this, arguments);
            if (Deferred.isObservable(filterResult)) {
                //Case A: "These filter functions can return"..."[an] observable
                //			object (Deferred, Promise, etc) which will pass its 
                //			resolved / rejected status and values to the promise's callbacks"
                var filterPromise = filterResult.promise();
                //Listening to any event on the observable, passing the
                //call into the returned promise:
                toolous.forEachKey(STATES, function(_, chainStateDefinition) {
                    filterPromise[chainStateDefinition.listen](function() {
                        //Prepending 'this' in order to keep the same context
                        //the event which should be the same as given to the
                        //filter promise.
                        var args = toolous.toArray(arguments, 0, this); 
                        retDeferred[chainStateDefinition.fire+"With"].apply(retDeferred, args);
                    });
                });
            } else {//value, passed along
                //Case B: "If the filter function used is null, or not specified,
                //			the promise will be resolved or rejected with the same
                //			values as the original."
                //Case C: "These filter functions can return a new value to be
                //			passed along to the promise's .done() or .fail() callbacks"

                //If the context is the original deferred object, it wasn't specified
                //and we need to pass the returned deferred Otherwise we pass the new context 
                var context = (Deferred.isObservable(this) && this.promise() === me.promise()) ?
                                    retDeferred.promise() : this;

                //"If the filter function used is null, or not specified, the promise
                // will be resolved or rejected with the same values as the original.":
                var eventArgs = filter ? [filterResult] : toolous.toArray(arguments);

                retDeferred[stateDefinition.fire + "With"].apply(retDeferred,
                                                    [context].concat(eventArgs));

            }
        });
    });
    return retDeferred.promise();
};

/**
 * returns true if and only if the given object is a deferred or promise instance (has the .promise method)
 * @static 
 * @param {Object} obj
 * @method isObservable
 */
Deferred.isObservable = function(obj) {
    return obj !== null && toolous.isDef(obj) && (toolous.isFunction(obj.promise));
};
/**
 * see http://api.jquery.com/jQuery.when/
 * @method when
 * @for deferred
 * @static
 */
exports.when = function(single) {
    var whenArgs = toolous.toArray(arguments),
        resDef = new Deferred(),
        remaining = whenArgs.length,
        combinedState = {};

    if (remaining <= 1) { //Single 
        if(!Deferred.isObservable(single)) {
            //"If a single argument is passed to jQuery.when and it is not a
            // Deferred or a Promise, it will be treated as a resolved Deferred
            // and any doneCallbacks attached will be executed immediately"
            single = new Deferred().resolveWith(null, single);
        }
        //"If a single Deferred is passed to jQuery.when, its Promise object
        // (a subset of the Deferred methods) is returned by the method""
        return single.promise();
    }

    //Multiple values:
    toolous.forEach(["resolve","notify"], function(name) {
        combinedState[name] = {
            "name": name,
            "contexts": new Array(remaining),
            "values": new Array(remaining),
            mark: function(i, context, value) {
                this.contexts[i] = context;
                this.values[i] = value;
            },
            createMarkFunction: function(i) {
                var me = this;
                return function(value) {
                    me.mark(i, this, value);
                };
            },
            publish: function() {
                resDef[name+"With"].apply(resDef,[this.contexts].concat(this.values));
            }
        };
    });

    var valueReceived = function() { 
        --remaining;
        if (remaining === 0) {
            combinedState.resolve.publish();
        }
    };

    toolous.forEach(whenArgs, function(whenPart, i) {
        if (Deferred.isObservable(whenPart)) {
            whenPart = whenPart.promise();

            whenPart.done(combinedState.resolve.createMarkFunction(i));  //Mark the ith deferred as returned.
            whenPart.done(valueReceived); //Then count the value received and check if done

            whenPart.progress(combinedState.notify.createMarkFunction(i)); //Mark progress
            whenPart.progress(toolous.bind("publish",combinedState.notify)); //Notify progress

            whenPart.fail(function(error) { //Notify failure
                resDef.rejectWith(this, error);
            });
        } else { //Immidiate value:
            combinedState.resolve.mark(i, undefined, whenPart);
            valueReceived();
        }
    });

    return resDef.promise();
};

exports.Deferred = Deferred;
