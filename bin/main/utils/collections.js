//--------------------------------------------------------------------------
//
//  StringSet
//
//--------------------------------------------------------------------------
define(["require", "exports"], function(require, exports) {
    /**
    * Set that only accept string as value
    */
    var StringSet = (function () {
        /**
        * constructor
        * @param iterable a array of string that will be added to the set
        */
        function StringSet(iterable) {
            this.map = Object.create(null);
            if (iterable) {
                for (var i = 0, l = iterable.length; i < l; i++) {
                    this.add(iterable[i]);
                }
            }
        }
        /**
        * add a value to the set
        * @param value
        */
        StringSet.prototype.add = function (value) {
            this.map[value] = true;
        };

        /**
        * remove a value from the set
        * @param value
        */
        StringSet.prototype.remove = function (value) {
            return delete this.map[value];
        };

        /**
        * return true if the set contains the given value
        * @param value
        */
        StringSet.prototype.has = function (value) {
            return !!this.map[value];
        };

        Object.defineProperty(StringSet.prototype, "values", {
            /**
            * return an array containing the values of the set
            */
            get: function () {
                return Object.keys(this.map);
            },
            enumerable: true,
            configurable: true
        });
        return StringSet;
    })();
    exports.StringSet = StringSet;

    
    ;

    /**
    * Map that only accept string as key
    */
    var StringMap = (function () {
        /**
        * constructor
        * @param iterable a array of MapEntry that will be added to the map
        */
        function StringMap(iterable) {
            this.map = Object.create(null);
            this.mascot = {};
            if (iterable) {
                for (var i = 0, l = iterable.length; i < l; i++) {
                    var entry = iterable[i];
                    this.set(entry.key, entry.value);
                }
            }
        }
        /**
        * set a value in the map
        * @param key the key
        * @param value the value
        */
        StringMap.prototype.set = function (key, value) {
            this.map[key] = (typeof value === 'undefined' ? this.mascot : value);
        };

        /**
        * retrive a value associated to the given key
        * @param key
        */
        StringMap.prototype.get = function (key) {
            var value = this.map[key];
            return value === this.mascot ? undefined : value;
        };

        /**
        * delete the entry corresponding to the given key
        * @param key
        */
        StringMap.prototype.delete = function (key) {
            return delete this.map[key];
        };

        /**
        * return true if the map contains the given key
        * @param key
        */
        StringMap.prototype.has = function (key) {
            return typeof this.map[key] !== 'undefined';
        };

        /**
        * clear the map
        */
        StringMap.prototype.clear = function () {
            this.map = Object.create(null);
        };

        Object.defineProperty(StringMap.prototype, "keys", {
            /**
            * return an array containing the keys of the map
            */
            get: function () {
                return Object.keys(this.map);
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(StringMap.prototype, "values", {
            /**
            * return an array containing the values of the map
            */
            get: function () {
                var _this = this;
                return Object.keys(this.map).map(function (key) {
                    return _this.map[key];
                });
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(StringMap.prototype, "entries", {
            /**
            * return an array containing the entries of the map
            */
            get: function () {
                var _this = this;
                return Object.keys(this.map).map(function (key) {
                    return {
                        key: key,
                        value: _this.map[key]
                    };
                });
            },
            enumerable: true,
            configurable: true
        });

        /**
        * return a clone of the map
        */
        StringMap.prototype.clone = function () {
            return new StringMap(this.entries);
        };
        return StringMap;
    })();
    exports.StringMap = StringMap;
});
