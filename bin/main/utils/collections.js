define(["require", "exports"], function(require, exports) {
    var StringSet = (function () {
        function StringSet() {
            this.map = Object.create(null);
        }
        StringSet.prototype.add = function (value) {
            this.map[value] = true;
        };

        StringSet.prototype.remove = function (value) {
            return delete this.map[value];
        };

        StringSet.prototype.has = function (value) {
            return !!this.map[value];
        };

        Object.defineProperty(StringSet.prototype, "keys", {
            get: function () {
                return Object.keys(this.map);
            },
            enumerable: true,
            configurable: true
        });
        return StringSet;
    })();
    exports.StringSet = StringSet;

    var StringMap = (function () {
        function StringMap() {
            this.map = Object.create(null);
            this.mascot = {};
        }
        StringMap.prototype.set = function (key, value) {
            this.map[key] = (typeof value === 'undefined' ? this.mascot : value);
        };

        StringMap.prototype.get = function (key) {
            var value = this.map[key];
            return value === this.mascot ? undefined : value;
        };

        StringMap.prototype.delete = function (key) {
            return delete this.map[key];
        };

        StringMap.prototype.has = function (key) {
            return typeof this.map[key] !== 'undefined';
        };

        StringMap.prototype.clear = function () {
            this.map = Object.create(null);
        };

        Object.defineProperty(StringMap.prototype, "keys", {
            get: function () {
                return Object.keys(this.map);
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(StringMap.prototype, "values", {
            get: function () {
                var _this = this;
                return Object.keys(this.map).map(function (key) {
                    return _this.map[key];
                });
            },
            enumerable: true,
            configurable: true
        });

        StringMap.prototype.clone = function () {
            var _this = this;
            var map = new StringMap();
            this.keys.forEach(function (key) {
                map.set(key, _this.get(key));
            });
            return map;
        };
        return StringMap;
    })();
    exports.StringMap = StringMap;
});
