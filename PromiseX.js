/*!
 * PromiseX - Promise Xtended
 * wrapper for promises to add new methods w/o changing the native promise prototype
 * good read: http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html
 * also interesting: https://github.com/paldepind/sync-promise
 * @author Stefan Benicke <stefan.benicke@gmail.com>
 * @version 1.1.0
 * @see {@link https://github.com/opusonline/PromiseX.js}
 * @license MIT
 */
(function (global, undefined) {

    var _setImmediate = global.setImmediate || function (callback) {
            return setTimeout(callback, 0);
        };

    var _defineProperty = (function () {
        try {
            Object.defineProperty({}, 'x', {});
            return function (object, name, value) {
                return Object.defineProperty(object, name, {
                    value: value,
                    writable: true,
                    enumerable: false,
                    configurable: true
                });
            };
        } catch (e) {
        }
        return function (object, name, value) {
            object[name] = value;
            return object;
        };
    })();

    var _undefined = 'undefined';
    var _function = 'function';

    function _definePromiseX() {

        var _Promise = global.Promise;

        /**
         * PromiseX
         *
         * executor should be the execution function called with optional context,
         * if executor is empty the promise is a deferred with resolve and reject functions,
         * if executor is a native promise the new object will be a wrapper for this promise
         * every other executor is treated as PromiseX.resolve(value)
         *
         * @class
         * @param {function|*} [executor]
         * @param {Object} [context]
         */
        function PromiseX(executor, context) {
            if (!(this instanceof PromiseX)) {
                throw new TypeError('Failed to construct \'PromiseX\': Please use the \'new\' operator, this object constructor cannot be called as a function.');
            }
            if (executor instanceof PromiseX) {
                return executor;
            }
            var self = this;
            this.status = PromiseX.PENDING;
            this.value = undefined;
            if (executor instanceof _Promise) {
                this.promise = executor.then(function (value) {
                    self.status = PromiseX.RESOLVED;
                    self.value = value;
                    return value;
                }, function (reason) {
                    self.status = PromiseX.REJECTED;
                    self.value = reason;
                    throw reason;
                });
                return this;
            }
            if (typeof executor === _undefined) { // return "non-standard" deferred (w/o this.promise = PromiseX since this.promise used for native promise)
                this.resolve = null;
                this.reject = null;
                executor = function (resolve, reject, promise) {
                    promise.resolve = function (value) {
                        resolve(value);
                        return promise;
                    };
                    promise.reject = function (reason) {
                        reject(reason);
                        return promise;
                    };
                };
            }
            if (typeof executor === _function) {
                if (typeof context === _undefined) {
                    context = self;
                }
                this.promise = new _Promise(function (resolve, reject) {
                    try {
                        executor.call(context, function (value) {
                            if (self.status !== PromiseX.PENDING) {
                                return;
                            }
                            self.status = PromiseX.RESOLVED;
                            self.value = value;
                            resolve(value);
                        }, function (reason) {
                            if (self.status !== PromiseX.PENDING) {
                                return;
                            }
                            self.status = PromiseX.REJECTED;
                            self.value = reason;
                            reject(reason);
                        }, self); // works only on not bound functions
                    } catch (error) {
                        if (self.status === PromiseX.PENDING) {
                            self.status = PromiseX.REJECTED;
                            self.value = error;
                            reject(error);
                        }
                    }
                });
                return this;
            }
            // from here, executor exists, but not as promise or function [shorthand for PromiseX.resolve(executor)]
            this.promise = _cast(executor);
            this.status = PromiseX.RESOLVED;
            this.value = executor;
        }

        // public string constants for better readability
        PromiseX.PENDING = 'pending';
        PromiseX.RESOLVED = 'resolved';
        PromiseX.REJECTED = 'rejected';

        var proto = PromiseX.prototype;

        _defineProperty(proto, 'status', PromiseX.PENDING);
        _defineProperty(proto, 'value', undefined);

        /**
         * PromiseX.prototype.then
         *
         * Just like standard Promise.then, always returns a new Promise
         * resolve function is executed if previous Promise is resolved
         * reject function is executed if previous Promise is rejected
         * resolve/reject functions are called with optional context
         *
         * @param {function} [resolve]
         * @param {function} [reject]
         * @param {Object} [context]
         * @return {Object} - new PromiseX
         */
        _defineProperty(proto, 'then', function (resolve, reject, context) {
            var promise;
            if (typeof context !== _undefined) {
                var thenResolve = typeof resolve !== _function ? resolve : function (value) {
                    return resolve.call(context, value);
                };
                var thenReject = typeof reject !== _function ? reject : function (reason) {
                    return reject.call(context, reason);
                };
                promise = this.promise.then(thenResolve, thenReject);
            } else {
                promise = this.promise.then(resolve, reject);
            }
            return new PromiseX(promise);
        });
        /**
         * PromiseX.prototype.catch
         *
         * Just like standard Promise.catch, always returns a new Promise
         * reject function is executed if previous Promise is rejected
         * shorthand for Promise.then(null, reject)
         * reject function is called with optional context
         *
         * @param {function} [reject]
         * @param {Object} [context]
         * @return {Object} - new PromiseX
         */
        _defineProperty(proto, 'catch', function (reject, context) {
            var promise;
            if (typeof context !== _undefined) {
                var catchReject = typeof reject !== _function ? reject : function (reason) {
                    return reject.call(context, reason);
                };
                promise = this.promise.catch(catchReject);
            } else {
                promise = this.promise.catch(reject);
            }
            return new PromiseX(promise);
        });
        /**
         * PromiseX.prototype.finally
         *
         * non-standard, always returns a new Promise
         * defined here: {@link https://www.promisejs.org/api/#Promise_prototype_finally}
         * callback is executed with optional context when Promise is fulfilled
         * previous resolved/rejected values are propagated to next Promise
         * addition: callback provides previous promise as parameter (use promise.value and promise.status)
         * heads-up: errors within callback will propagate as rejected promise
         *
         * @param {function} callback
         * @param {Object} context
         * @return {Object} - new PromiseX
         */
        _defineProperty(proto, 'finally', function (callback, context) {
            var self = this;
            var promise = this.promise.then(function (value) {
                return _cast(callback.call(context, self)).then(function () { // callback could return a promise
                    return value;
                });
            }, function (reason) {
                return _cast(callback.call(context, self)).then(function () {
                    throw reason;
                });
            });
            return new PromiseX(promise);
        });
        /**
         * PromiseX.prototype.done
         *
         * non-standard
         * does *not* return a promise, throws outside promises on next tick
         * defined here: {@link https://www.promisejs.org/api/#Promise_prototype_done}
         * if resolve/reject is/are provided, a last Promise.then is executed with optional context
         *
         * @param {function} [resolve]
         * @param {function} [reject]
         * @param {Object} [context]
         * @throws - any exception that is catch'd from the Promise chain
         */
        _defineProperty(proto, 'done', function (resolve, reject, context) {
            this.then(resolve, reject, context).catch(function (reason) {
                _setImmediate(function () {
                    throw reason;
                });
            });
        });
        /**
         * PromiseX.prototype.nodefify
         *
         * non-standard
         * transforms Promise to node-like callback - meaning: callback(error, value)
         * defined here: {@link https://www.promisejs.org/api/#Promise_prototype_nodify}
         *
         * @param {function} callback
         * @param {Object} [context]
         * @return {Object} self
         */
        _defineProperty(proto, 'nodeify', function (callback, context) {
            if (typeof callback !== _function) {
                return this;
            }
            this.promise.then(function (value) {
                _setImmediate(function () {
                    callback.call(context, null, value);
                });
            }, function (reason) {
                _setImmediate(function () {
                    callback.call(context, reason);
                });
            });
            return this;
        });
        /**
         * PromiseX.prototype.timeout
         *
         * non-standard
         * used in many Promise libraries like [BluebirdJS]{@link http://bluebirdjs.com/docs/api/timeout.html}
         * timeout for previous Promise fulfillment
         * if reason is given, timeout Promise rejects with reason
         *
         * @param {Number} ms - Milliseconds
         * @param {*} [reason]
         * @return {Object} new PromiseX
         */
        _defineProperty(proto, 'timeout', function (ms, reason) {
            var self = this;
            return new PromiseX(function (resolve, reject) {
                setTimeout(function () {
                    if (typeof reason !== _undefined) {
                        reject(reason);
                    } else {
                        reject(new Error('Timeout'));
                    }
                }, ms);
                self.promise.then(resolve, reject);
            });
        });
        /**
         * PromiseX.prototype.delay
         *
         * non-standard
         * used in many Promise libraries like [BluebirdJS]{@link http://bluebirdjs.com/docs/api/promise.delay.html}
         * delays execution of next Promise in chain
         * if init is given, this Promise resolves with init value otherwise previous value is propagated
         *
         * @param {Number} ms - Milliseconds
         * @param {*} [init]
         * @return {Object} new PromiseX
         */
        _defineProperty(proto, 'delay', function (ms, init) {
            var promise = this.promise.then(function (value) {
                if (typeof init !== _undefined) {
                    value = init;
                }
                return new _Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(value);
                    }, ms);
                });
            }, function (reason) {
                return new _Promise(function (_, reject) {
                    setTimeout(function () {
                        reject(reason);
                    }, ms);
                });
            });
            return new PromiseX(promise);
        });
        /**
         * PromiseX.resolve
         *
         * standard, returns a resolved Promise with given value
         *
         * @param {*} value
         * @return {Object} new PromiseX
         */
        _defineProperty(PromiseX, 'resolve', function (value) {
            if (value instanceof PromiseX) { // strange since resolve should always return a new promise that mimics any other promise, but this is native behaviour
                return value;
            }
            return new PromiseX(function (resolve) {
                resolve(value);
            });
        });
        /**
         * PromiseX.reject
         *
         * standard, returns a rejected Promise with given reason
         *
         * @param {*} reason
         * @return {Object} new PromiseX
         */
        _defineProperty(PromiseX, 'reject', function (reason) {
            return new PromiseX(function (_, reject) {
                reject(reason);
            });
        });
        /**
         * PromiseX.delay
         *
         * non-standard
         * returns a resolved Promise with given value after certain amount of time
         *
         * @param {Number} ms - Milliseconds
         * @param {*} value
         * @return {Object} new PromiseX
         */
        _defineProperty(PromiseX, 'delay', function (ms, value) {
            return new PromiseX(function (resolve) {
                setTimeout(function () {
                    resolve(value);
                }, ms);
            });
        });
        /**
         * PromiseX.deferred
         *
         * non-standard
         * returns a deferred object including promise and
         * resolve and reject methods to fulfill the promise
         * {@link https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred}
         *
         * @return {Object} deferred
         */
        _defineProperty(PromiseX, 'defer', function () {
            return new PromiseX();
        });
        /**
         * PromiseX.cast
         *
         * ensures to return a promise
         * if value is a promise, return that promise
         * {@link http://www.wintellect.com/devcenter/nstieglitz/5-great-features-in-es6-harmony}
         *
         * @param {*} value
         * @return {Object} new PromiseX
         */
        _defineProperty(PromiseX, 'cast', function (value) {
            if (value instanceof PromiseX) {
                return value;
            }
            //else if (value instanceof _Promise) {
            //    return new PromiseX(value);
            //} else {
            //    return PromiseX.resolve(value);
            //}
            return new PromiseX(value); // this way native promises are wrapped and other values are resolved
        });
        /**
         * PromiseX.all
         *
         * standard
         * returns a Promise that is resolved only if all promises are resolved
         * or rejected if any promise of list is rejected
         * resolve function gets array of promise values
         *
         * @param {Object[]} promises
         * @return {Object} new PromiseX
         */
        _defineProperty(PromiseX, 'all', function (promises) {
            return new PromiseX(function (resolve, reject) {
                _Promise.all(promises).then(resolve, reject);
            });
        });
        /**
         * PromiseX.race
         *
         * standard
         * returns a Promise that is resolved as soon as one promise is resolved
         * or rejected as soon as one promise of list is rejected
         * Heads-up: native function is commented since some checks are missing
         *
         * @param {Object[]} promises
         * @return {Object} new PromiseX
         */
        _defineProperty(PromiseX, 'race', function (promises) {
            //return new PromiseX(function(resolve, reject) {
            //    _Promise.race(promises).then(resolve, reject);
            //});
            return new PromiseX(function (resolve, reject) {
                if (typeof promises === _undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises.');
                }
                if (_isArray(promises)) {
                    var i, n = promises.length;
                    if (n === 0) {
                        return resolve();
                    }
                    for (i = 0; i < n; i++) {
                        _cast(promises[i]).then(resolve, reject);
                    }
                } else {
                    resolve(promises);
                }
            });
        });
        /**
         * PromiseX.every
         *
         * non-standard
         * is fulfilled only if all promises are fulfilled either resolved or rejected.
         * each promise's fulfillment state and value is provided in the propagated value array
         * as promise.value and promise.status
         *
         * @param {Object[]} promises
         * @return {Object} new PromiseX
         */
        _defineProperty(PromiseX, 'every', function (promises) {
            return new PromiseX(function (resolve) {
                if (typeof promises === _undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises.');
                }
                if (_isArray(promises) === false) {
                    promises = [promises];
                }
                var count = promises.length;
                var result = new Array(count);
                if (count === 0) {
                    return resolve(result);
                }
                var done = function () {
                    count--;
                    if (count === 0) {
                        resolve(result);
                    }
                };
                _forEach(promises, function (promise, index) {
                    promise = PromiseX.cast(promise);
                    var next = function () {
                        result[index] = promise;
                        done();
                    };
                    promise.then(next, next);
                });
            });
        });
        /**
         * PromiseX.any
         *
         * non-standard
         * is fulfilled as soon as any promise is resolved or all promises are rejected
         *
         * @param {Object[]} promises
         * @return {Object} new PromiseX
         */
        _defineProperty(PromiseX, 'any', function (promises) {
            return new PromiseX(function (resolve, reject) {
                if (typeof promises === _undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises.');
                }
                if (_isArray(promises)) {
                    var resolved = false;
                    var count = promises.length;
                    if (count === 0) {
                        return resolve();
                    }
                    var success = function (value) {
                        resolved = true;
                        count--;
                        resolve(value);
                    };
                    var error = function () {
                        count--;
                        if (count === 0 && !resolved) {
                            reject(new Error('No promises resolved successfully.'));
                        }
                    };
                    var i, n;
                    for (i = 0, n = count; i < n; i++) {
                        _cast(promises[i]).then(success, error);
                    }
                } else {
                    resolve(promises);
                }
            });
        });
        /**
         * PromiseX.map
         *
         * non-standard
         * returns an array of PromiseX created from each value by the map function executed with optional context
         *
         * @param {*} values - Array of values
         * @param {function} mapFunction
         * @param {Object} [context]
         * @return {Object[]} promises
         */
        _defineProperty(PromiseX, 'map', function (values, mapFunction, context) {
            if (typeof mapFunction !== _function) {
                throw new TypeError('Map-function is no valid function');
            }
            if (_isArray(values) === false) {
                values = [values];
            }
            var promises = [];
            var i, n = values.length;
            for (i = 0; i < n; i++) {
                promises.push(PromiseX.cast(mapFunction.call(context, values[i], i, n, values))); // if context = undefined: context = global
            }
            return promises;
        });
        /**
         * PromiseX.config
         *
         * non-standard
         * influence behaviour of PromiseX plugin
         * 'getPromise' and 'setPromise' G/Setter for the underlying promise - that way you don't need to redefine global promise
         * 'createPromise' creates a new separate PromiseX instance with a given underlying promise
         *
         * @param {String} option
         * @param {*} value
         * @return {boolean|*} - success state or requested config option
         */
        _defineProperty(PromiseX, 'config', function (option, value) {
            if (option === 'getPromise') {
                return _Promise;
            }
            if (option === 'setPromise' && typeof value !== _undefined) {
                if (_supportsPromise(value) === false) {
                    throw new TypeError(' Invalid Promise: ' + value.toString());
                }
                _Promise = value;
                return true;
            }
            if (option === 'createPromise' && typeof value !== _undefined) {
                if (_supportsPromise(value) === false) {
                    throw new TypeError(' Invalid Promise: ' + value.toString());
                }
                var newPromise = _definePromiseX();
                newPromise.config('setPromise', value);
                return newPromise;
            }
            return false;
        });

        function _cast(value) {
            if (value instanceof _Promise) {
                return value;
            }
            return _Promise.resolve(value);
        }

        function _supportsPromise(promise) {
            if (typeof promise === _undefined) {
                promise = _Promise;
            }
            try {
                var test = new promise(function (resolve, reject) {
                });
                return 'then' in test && typeof test.then === _function;
            } catch (e) {
            }
            return false;
        }

        return PromiseX;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
    function _forEach(array, callback, context) {
        if (_isArray(array) === false) {
            array = [array];
        }
        if (Array.prototype.forEach) {
            return array.forEach(callback, context);
        }
        var i, n;
        for (i = 0, n = array.length; i < n; i++) {
            callback.call(context, array[i], i, array);
        }
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
    function _isArray(array) {
        if (Array.isArray) {
            return Array.isArray(array);
        }
        return Object.prototype.toString.call(array) === '[object Array]';
    }

    var PromiseX = _definePromiseX();

    if (typeof define === _function && define.amd) {
        define(function () {
            return PromiseX;
        });
    } else if (typeof module !== _undefined) {
        module.exports = PromiseX;
    } else {
        global.PromiseX = PromiseX;
    }

})(this);