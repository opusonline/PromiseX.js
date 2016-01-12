/**
 * PromiseX - Promise Xtended
 * wrapper for promises to add new methods w/o changing the native promise prototype
 * good read: http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html
 * also interesting: https://github.com/paldepind/sync-promise
 * http://exploringjs.com/es6/ch_promises.html
 * @author Stefan Benicke <stefan.benicke@gmail.com>
 * @version 1.3.0
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
         * executor should be the execution function called with optional context,
         * if executor is empty the promise is a deferred with resolve and reject functions,
         * if executor is a native promise the new object will be a wrapper for this promise
         * every other executor is treated as PromiseX.resolve(value)
         *
         * @class
         * @param {undefined|function|*} [executor]
         * @param {Object} [context] Context for executor
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
         * just like standard Promise.then, always returns a new Promise
         * resolve function is executed if previous Promise is resolved
         * reject function is executed if previous Promise is rejected
         * resolve/reject functions are called with optional context
         *
         * @memberOf PromiseX#
         * @param {function} resolve
         * @param {function} [reject]
         * @param {Object} [context] Context for resolve/reject function
         * @return {PromiseX} new PromiseX
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
         * just like standard Promise.catch, always returns a new Promise
         * reject function is executed if previous Promise is rejected
         * shorthand for Promise.then(null, reject)
         * reject function is called with optional context
         *
         * @memberOf PromiseX#
         * @param {function} reject
         * @param {Object} [context] Context for reject function
         * @return {PromiseX} new PromiseX
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
         * non-standard, always returns a new Promise
         * defined here: {@link https://www.promisejs.org/api/#Promise_prototype_finally}
         * callback is executed with optional context when Promise is fulfilled
         * previous resolved/rejected values are propagated to next Promise
         * attention: this behaves exactly like try-catch-finally
         * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling#The_finally_block}
         * and is a bit different to others regarding the return value of finally callback
         *
         * @memberOf PromiseX#
         * @param {function} callback
         * @param {Object} [context] Context for callback
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(proto, 'finally', function (callback, context) {
            var promise = this.promise.then(function (value) {
                return _cast(callback.call(context)).then(function(finallyValue) {
                    return typeof finallyValue !== _undefined ? finallyValue : value;
                });
            }, function (reason) {
                return _cast(callback.call(context)).then(function(finallyValue) {
                    if (typeof finallyValue !== _undefined) {
                        return finallyValue;
                    }
                    throw reason;
                });
            });
            return new PromiseX(promise);
        });
        /**
         * non-standard
         * does *not* return a promise, throws outside promises on next tick
         * defined here: {@link https://www.promisejs.org/api/#Promise_prototype_done}
         * if resolve/reject is/are provided, a last Promise.then is executed with optional context
         *
         * @memberOf PromiseX#
         * @param {function} [resolve]
         * @param {function} [reject]
         * @param {Object} [context] Context for resolve/reject function
         * @throws any exception that is catched from the Promise chain
         * @return {undefined}
         */
        _defineProperty(proto, 'done', function (resolve, reject, context) {
            this.then(resolve, reject, context).catch(function (reason) {
                _setImmediate(function () {
                    throw reason;
                });
            });
        });
        /**
         * non-standard
         * transforms Promise to node-like callback - meaning: callback(error, value)
         * defined here: {@link https://www.promisejs.org/api/#Promise_prototype_nodify}
         *
         * @memberOf PromiseX#
         * @param {function} callback
         * @param {Object} [context] Context for callback
         * @return {PromiseX} self
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
         * non-standard
         * used in many Promise libraries like [BluebirdJS]{@link http://bluebirdjs.com/docs/api/promise.delay.html}
         * delays execution of next Promise in chain
         * previous value or error is propagated
         *
         * @memberOf PromiseX#
         * @param {Number} ms Milliseconds
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(proto, 'delay', function (ms) {
            var promise = this.promise.then(function (value) {
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
         * standard, returns a resolved Promise with given value
         *
         * @memberOf PromiseX
         * @param {*} [value]
         * @return {PromiseX} new PromiseX
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
         * standard, returns a rejected Promise with given reason
         *
         * @memberOf PromiseX
         * @param {*} [reason]
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'reject', function (reason) {
            return new PromiseX(function (_, reject) {
                reject(reason);
            });
        });
        /**
         * non standard
         * used in many Promise libraries like [BluebirdJS]{@link http://bluebirdjs.com/docs/api/timeout.html}
         * example here {@link https://www.promisejs.org/patterns/#race}
         * timeout for given Promise fulfillment
         * if reason is given, timeout Promise rejects with reason
         * _heads-up:_ I refused doAsync().timeout() because I want to avoid using timeout later in promise chain
         * since setTimeout starts immediately when calling and not when promise starts
         *
         * @memberOf PromiseX
         * @param {Promise} promise
         * @param {Number} ms Milliseconds
         * @param {String} [reason]
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'timeout', function(promise, ms, reason) {
            return new PromiseX(function(resolve, reject) {
                setTimeout(function() {
                    reject(new Error(reason || 'Timeout'));
                }, ms);
                promise.then(resolve, reject);
            });
        });
        /**
         * non-standard
         * returns a resolved Promise with given value after certain amount of time
         *
         * @memberOf PromiseX
         * @param {Number} ms Milliseconds
         * @param {*} [value]
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'delay', function (ms, value) {
            return new PromiseX(function (resolve) {
                setTimeout(function () {
                    resolve(value);
                }, ms);
            });
        });
        /**
         * non-standard
         * returns a deferred object including promise and
         * resolve and reject methods to fulfill the promise
         * {@link https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred}
         *
         * @memberOf PromiseX
         * @return {PromiseX} deferred
         */
        _defineProperty(PromiseX, 'defer', function () {
            return new PromiseX();
        });
        /**
         * ensures to return a promise
         * if value is a promise, return that promise
         * {@link http://www.wintellect.com/devcenter/nstieglitz/5-great-features-in-es6-harmony}
         *
         * @memberOf PromiseX
         * @param {*} value
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'cast', function (value) {
            if (value instanceof PromiseX) {
                return value;
            } else if (typeof value === _undefined) {
                value = _cast();
            }
            //else if (value instanceof _Promise) {
            //    return new PromiseX(value);
            //} else {
            //    return PromiseX.resolve(value);
            //}
            return new PromiseX(value); // this way native promises are wrapped and other values are resolved
        });
        /**
         * standard
         * returns a Promise that is resolved only if all promises are resolved
         * or rejected if any promise of list is rejected
         * resolve function gets array of promise values
         *
         * @memberOf PromiseX
         * @param {Array<Promise>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'all', function (promises) {
            return new PromiseX(function (resolve, reject) {
                _Promise.all(promises).then(resolve, reject);
            });
        });
        /**
         * standard
         * returns a Promise that is resolved as soon as one promise is resolved
         * or rejected as soon as one promise of list is rejected
         * _heads-up:_ native function is commented since some checks are missing
         *
         * @memberOf PromiseX
         * @param {Array<Promise|*>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'race', function (promises) {
            //return new PromiseX(function(resolve, reject) {
            //    _Promise.race(promises).then(resolve, reject);
            //});
            return new PromiseX(function (resolve, reject) {
                if (typeof promises === _undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
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
         * non-standard
         * is fulfilled only if all promises are fulfilled either resolved or rejected.
         * each promise's fulfillment state and value is provided in the propagated value array
         * as promise.value and promise.status
         *
         * @memberOf PromiseX
         * @param {Array<Promise|*>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'every', function (promises) {
            return new PromiseX(function (resolve) {
                if (typeof promises === _undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
                }
                var count = _isArray(promises) ? promises.length : 1;
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
                _forEach(promises, function (promise, index) { // if promises is no array forEach transforms it
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
         * non-standard
         * is fulfilled as soon as any promise is resolved or all promises are rejected
         *
         * @memberOf PromiseX
         * @param {Array<Promise|*>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'any', function (promises) {
            return new PromiseX(function (resolve, reject) {
                if (typeof promises === _undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
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
         * non-standard
         * returns an array of PromiseX created from each value by the map function executed with optional context
         * mapFunction is called as mapper(current, index, length, values)
         * _heads-up:_ take care of errors; invalid input throws
         *
         * @memberOf PromiseX
         * @param {Array<*>} values Array of values
         * @param {function} mapFunction Called as mapper(current, index, length, values)
         * @param {Object} [context] Context for mapFunction
         * @return {Array<PromiseX>} promises
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
         * non-standard
         * reduces an array of promises or values to one promise chain
         * reduceFunction(previous, current, index, length) is called after previous promise is resolved
         * with the result of previous promise and current promise; first result is initialValue or undefined
         * used in used in many Promise libraries like [BluebirdJS]{@link http://bluebirdjs.com/docs/api/timeout.html}
         * or slightly different here [promise-reduce]{@link https://github.com/yoshuawuyts/promise-reduce}
         *
         * @memberOf PromiseX
         * @param {Array<*|Promise>} values Array of promises or values
         * @param {function} reduceFunction Called as reducer(previous, current, index, length, values) previous is initialValue or undefined
         * @param {*} [initialValue]
         * @param {Object} [context] Context for reduceFunction
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'reduce', function (values, reduceFunction, initialValue, context) {
            return new PromiseX(function(resolve, reject) {
                if (typeof reduceFunction !== _function) {
                    throw new TypeError('Reduce-function is no valid function');
                }
                var length = _isArray(values) ? values.length : 1;
                var sequence = _Promise.resolve(initialValue);
                _forEach(values, function (value, index) { // if values is no array forEach transforms it
                    sequence = sequence.then(function(result) {
                        return reduceFunction.call(context, result, value, index, length, values);
                    });
                });
                sequence.then(resolve, reject);
            });
        });
        /**
         * non-standard
         * influence behaviour of PromiseX plugin
         * 'getPromise' and 'setPromise' G/Setter for the underlying promise - that way you don't need to redefine global promise
         * 'createPromise' creates a new separate PromiseX instance with a given underlying promise
         *
         * @memberOf PromiseX
         * @param {String} option
         * @param {*} [value]
         * @return {boolean|*} Success state or requested config option
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