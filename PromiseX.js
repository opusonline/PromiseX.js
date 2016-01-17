/**
 * PromiseX - Promise Xtended
 * wrapper for promises to add new methods w/o changing the native promise prototype
 * good read: http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html
 * also interesting: https://github.com/paldepind/sync-promise
 * http://exploringjs.com/es6/ch_promises.html
 * @author Stefan Benicke <stefan.benicke@gmail.com>
 * @version 2.0.0
 * @see {@link https://github.com/opusonline/PromiseX.js}
 * @license MIT
 */
(function (global, undefined) {

    var _setImmediate = global.setImmediate || function (callback) {
            return setTimeout(callback, 0);
        };

    var _defineProperty;
    var _definePropertyOldSchool = false;
    try {
        Object.defineProperty({}, 'x', {});
        _defineProperty = function defineProperty(object, name, value) {
            return Object.defineProperty(object, name, {
                value: value,
                writable: true,
                enumerable: false,
                configurable: true
            });
        };
    } catch (e) {
        _definePropertyOldSchool = true;
        _defineProperty = function defineProperty(object, name, value) {
            object[name] = value;
            return object;
        };
    }

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
            if (!_isPromiseX(this)) {
                throw new TypeError('Failed to construct \'PromiseX\': Please use the \'new\' operator, this object constructor cannot be called as a function.');
            }
            if (_isPromiseX(executor)) {
                return executor;
            }
            var self = this;
            this.status = PromiseX.PENDING;
            this.value = undefined;
            _checkUndefinedPromise();
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
            if (executor === undefined) { // return "non-standard" deferred (w/o this.promise = PromiseX since this.promise used for native promise)
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
            if (_isFunction(executor)) {
                if (context === undefined) {
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
        _defineProperty(proto, 'then', function PromiseX_then(resolve, reject, context) {
            var thenResolve = !_isFunction(resolve) ? resolve : function (value) {
                if (_isCancelled(value)) {
                    return value;
                }
                var result = resolve.call(context, value);
                return _isPromiseX(result) ? result.promise : result;
            };
            var thenReject = !_isFunction(reject) ? reject : function (reason) {
                var result = reject.call(context, reason);
                return _isPromiseX(result) ? result.promise : result;
            };
            var promise = this.promise.then(thenResolve, thenReject);
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
        _defineProperty(proto, 'catch', function PromiseX_catch(reject, context) {
            var promise;
            if (_isFunction(reject)) {
                promise = this.promise.catch(function (reason) {
                    var result = reject.call(context, reason);
                    return _isPromiseX(result) ? result.promise : result;
                });
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
        _defineProperty(proto, 'finally', function PromiseX_finally(callback, context) {
            var promise = this.promise.then(function (value) {
                var result = callback.call(context);
                return _castPromise(result).then(function (finallyValue) {
                    return finallyValue !== undefined ? finallyValue : value;
                });
            }, function (reason) {
                var result = callback.call(context);
                return _castPromise(result).then(function (finallyValue) {
                    if (finallyValue !== undefined) {
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
        _defineProperty(proto, 'done', function PromiseX_done(resolve, reject, context) {
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
        _defineProperty(proto, 'nodeify', function PromiseX_nodeify(callback, context) {
            if (!_isFunction(callback)) {
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
        _defineProperty(proto, 'delay', function PromiseX_delay(ms) {
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
         * non-standard
         * cancelled promise chain can be catched here
         * resolve method gets reason as parameter
         * influence continuing by return a value of throw; returning nothing means continue cancelling
         *
         * @memberOf PromiseX#
         * @param {function} resolve
         * @param {Object} [context]
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(proto, 'cancelled', function PromiseX_cancelled(resolve, context) {
            var thenResolve = !_isFunction(resolve) ? resolve : function (value) {
                if (_isCancelled(value)) {
                    var result = resolve.call(context, value.reason);
                    if (result !== undefined) {
                        return _isPromiseX(result) ? result.promise : result;
                    }
                }
                return value;
            };
            var promise = this.promise.then(thenResolve);
            return new PromiseX(promise);
        });
        /**
         * standard, returns a resolved Promise with given value
         *
         * @memberOf PromiseX
         * @static
         * @param {*} [value]
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'resolve', function PromiseX_resolve(value) {
            if (_isPromiseX(value)) { // strange since resolve should always return a new promise that mimics any other promise, but this is native behaviour
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
         * @static
         * @param {*} [reason]
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'reject', function PromiseX_reject(reason) {
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
         * @static
         * @param {Promise} promise
         * @param {Number} ms Milliseconds
         * @param {String} [reason]
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'timeout', function PromiseX_timeout(promise, ms, reason) {
            return new PromiseX(function (resolve, reject) {
                setTimeout(function () {
                    reject(new PromiseX.TimeoutError(reason || 'Timeout'));
                }, ms);
                promise.then(resolve, reject);
            });
        });
        /**
         * non-standard
         * returns a resolved Promise with given value after certain amount of time
         *
         * @memberOf PromiseX
         * @static
         * @param {Number} ms Milliseconds
         * @param {*} [value]
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'delay', function PromiseX_delay(ms, value) {
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
         * @static
         * @return {PromiseX} deferred
         */
        _defineProperty(PromiseX, 'defer', function PromiseX_defer() {
            return new PromiseX();
        });
        /**
         * ensures to return a promise
         * if value is a promise, return that promise
         * {@link http://www.wintellect.com/devcenter/nstieglitz/5-great-features-in-es6-harmony}
         *
         * @memberOf PromiseX
         * @static
         * @param {*} value
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'cast', function PromiseX_cast(value) {
            if (_isPromiseX(value)) {
                return value;
            } else if (value === undefined) {
                _checkUndefinedPromise();
                value = _cast();
            }
            return new PromiseX(value); // this way native promises are wrapped and other values are resolved
        });
        /**
         * standard
         * returns a Promise that is resolved only if all promises are resolved
         * or rejected if any promise of list is rejected
         * resolve function gets array of promise values
         * following promises can be cancelled if any promise returns a cancel promise
         *
         * @memberOf PromiseX
         * @static
         * @param {Array<Promise>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'all', function PromiseX_all(promises) {
            return new PromiseX(function (resolve, reject) {
                if (promises === undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
                }
                var result = [];
                var sequence = _cast();

                function addResult(value) {
                    if (_isCancelled(value)) {
                        resolve(value);
                    } else {
                        result.push(value);
                    }
                }

                _forEach(promises, function (promise) {
                    promise = _castPromise(promise).catch(reject);
                    sequence = sequence.then(function () {
                        return promise.then(addResult);
                    });
                });
                sequence.then(function () {
                    resolve(result);
                });
            });
        });
        /**
         * standard
         * returns a Promise that is resolved as soon as one promise is resolved
         * or rejected as soon as one promise of list is rejected
         * following promises can be cancelled if any promise returns a cancel promise
         *
         * @memberOf PromiseX
         * @static
         * @param {Array<Promise|*>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'race', function PromiseX_race(promises) {
            return new PromiseX(function (resolve, reject) {
                if (promises === undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
                }
                if (_isArray(promises)) {
                    var i, n = promises.length;
                    if (n === 0) {
                        return resolve();
                    }
                    for (i = 0; i < n; i++) {
                        _castPromise(promises[i]).then(resolve, reject);
                    }
                } else {
                    _castPromise(promises).then(resolve, reject);
                }
            });
        });
        /**
         * non-standard
         * is fulfilled only if all promises are fulfilled either resolved or rejected.
         * each promise's fulfillment state and value is provided in the propagated value array
         * as promise.value and promise.status
         * following promises can be cancelled if any promise returns a cancel promise
         *
         * @memberOf PromiseX
         * @static
         * @param {Array<Promise|*>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'every', function PromiseX_every(promises) {
            return new PromiseX(function (resolve) {
                if (promises === undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
                }
                var count = _isArray(promises) ? promises.length : 1;
                var result = new Array(count);
                if (count === 0) {
                    return resolve(result);
                }
                function done() {
                    count--;
                    if (count === 0) {
                        resolve(result);
                    }
                }

                _forEach(promises, function (promise, index) { // if promises is no array forEach transforms it
                    promise = PromiseX.cast(promise);
                    function next() {
                        if (promise.status === PromiseX.RESOLVED && _isCancelled(promise.value)) {
                            resolve(promise.value);
                        } else {
                            result[index] = promise;
                            done();
                        }
                    }

                    promise.promise.then(next, next);
                });
            });
        });
        /**
         * non-standard
         * is fulfilled as soon as any promise is resolved or all promises are rejected
         * following promises can be cancelled if any promise returns a cancel promise
         *
         * @memberOf PromiseX
         * @static
         * @param {Array<Promise|*>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'any', function PromiseX_any(promises) {
            return new PromiseX(function (resolve, reject) {
                if (promises === undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
                }
                if (_isArray(promises)) {
                    var count = promises.length;
                    if (count === 0) {
                        return resolve();
                    }
                    function onReject() {
                        count--;
                        if (count === 0) {
                            reject(new Error('No promises resolved successfully.'));
                        }
                    }

                    var i, n;
                    for (i = 0, n = count; i < n; i++) {
                        _castPromise(promises[i]).then(resolve, onReject);
                    }
                } else {
                    _castPromise(promises).then(resolve, reject);
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
         * @static
         * @param {Array<*>} values Array of values
         * @param {function} mapFunction Called as mapper(current, index, length, values)
         * @param {Object} [context] Context for mapFunction
         * @return {Array<PromiseX>} promises
         */
        _defineProperty(PromiseX, 'map', function PromiseX_map(values, mapFunction, context) {
            if (!_isFunction(mapFunction)) {
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
         * @static
         * @param {Array<*|Promise>} values Array of promises or values
         * @param {function} reduceFunction Called as reducer(previous, current, index, length, values) previous is initialValue or undefined
         * @param {*} [initialValue]
         * @param {Object} [context] Context for reduceFunction
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'reduce', function PromiseX_reduce(values, reduceFunction, initialValue, context) {
            return new PromiseX(function (resolve, reject) {
                if (!_isFunction(reduceFunction)) {
                    throw new TypeError('Reduce-function is no valid function');
                }
                var length = _isArray(values) ? values.length : 1;
                var sequence = _castPromise(initialValue);
                _forEach(values, function (value, index) { // if values is no array forEach transforms it
                    sequence = sequence.then(function (result) {
                        if (_isCancelled(result)) {
                            return result;
                        }
                        var reduced = reduceFunction.call(context, result, value, index, length, values);
                        return _isPromiseX(reduced) ? reduced.promise : reduced;
                    });
                });
                sequence.then(resolve, reject);
            });
        });
        /**
         * non-standard
         * returning PromiseX.cancel(reason) will cancel the whole following promise chain
         * cancel can be caught on PromiseX#cancelled(reason) method within a chain
         *
         * @memberOf PromiseX
         * @static
         * @param {*} reason Can be anything, even objects
         * @return {PromiseX} new PromiseX with special Cancel value
         */
        _defineProperty(PromiseX, 'cancel', function PromiseX_cancel(reason) {
            var error = new CancelledPromiseX(reason);
            return new PromiseX(error);
        });
        /**
         * non-standard
         * influence behaviour of PromiseX plugin
         * 'getPromise' and 'setPromise' G/Setter for the underlying promise - that way you don't need to redefine global promise
         * 'createPromise' creates a new separate PromiseX instance with a given underlying promise
         *
         * @memberOf PromiseX
         * @static
         * @param {String} option
         * @param {*} [value]
         * @return {boolean|*} Success state or requested config option
         */
        _defineProperty(PromiseX, 'config', function PromiseX_config(option, value) {
            if (option === 'getPromise') {
                return _Promise;
            }
            if (option === 'setPromise' && value !== undefined) {
                if (!_supportsPromise(value)) {
                    throw new TypeError(' Invalid Promise: ' + value);
                }
                _Promise = value;
                return true;
            }
            if (option === 'createPromise' && value !== undefined) {
                if (!_supportsPromise(value)) {
                    throw new TypeError(' Invalid Promise: ' + value);
                }
                var newPromise = _definePromiseX();
                newPromise.config('setPromise', value);
                return newPromise;
            }
            return false;
        });

        _defineProperty(PromiseX, 'CancellationError', function PromiseX_CancellationError(message) {
            if (!(this instanceof PromiseX.CancellationError)) {
                return new PromiseX.CancellationError(message);
            }
            _initError(this, PromiseX.CancellationError, message);
        });
        _defineProperty(PromiseX.CancellationError.prototype, 'message', '');

        _defineProperty(PromiseX, 'TimeoutError', function PromiseX_TimeoutError(message) {
            if (!(this instanceof PromiseX.TimeoutError)) {
                return new PromiseX.TimeoutError(message);
            }
            _initError(this, PromiseX.TimeoutError, message);
        });
        _defineProperty(PromiseX.TimeoutError.prototype, 'message', '');

        function _initError(that, type, message) {
            if (message !== undefined) {
                _defineProperty(that, 'message', '' + message);
            }
            if ('captureStackTrace' in Error) {
                Error.captureStackTrace(that, type);
            } else {
                var error = new Error(message);
                if (_definePropertyOldSchool) {
                    this.stack = error.stack;
                } else {
                    Object.defineProperty(that, 'stack', {
                        set: function (value) {
                            error.stack = value;
                            return error.stack;
                        },
                        get: function () {
                            return error.stack;
                        },
                        enumerable: false,
                        configurable: true
                    });
                }
            }
        }

        function _cast(value) {
            if (value instanceof _Promise) {
                return value;
            }
            return _Promise.resolve(value);
        }

        function _castPromise(value) {
            return _isPromiseX(value) ? value.promise : _cast(value);
        }

        function _isPromiseX(value) {
            return value instanceof PromiseX;
        }

        function _supportsPromise(promise) {
            if (promise === undefined) {
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

        function _checkUndefinedPromise() {
            if (_Promise === undefined) {
                throw new TypeError('Base Promise needed but is undefined. Use PromiseX.config("setPromise", whateverPromise) or "createPromise".');
            }
        }

        return PromiseX;
    }

    function CancelledPromiseX(reason) {
        if (reason !== undefined) {
            _defineProperty(this, 'reason', reason);
        }
    }

    function _isCancelled(value) {
        return value instanceof CancelledPromiseX;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
    function _forEach(array, callback, context) {
        if (_isArray(array) === false) {
            array = [array];
        }
        if (typeof Array.prototype.forEach === _function) {
            return array.forEach(callback, context);
        }
        var i, n;
        for (i = 0, n = array.length; i < n; i++) {
            callback.call(context, array[i], i, array);
        }
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
    function _isArray(array) {
        if (typeof Array.isArray === _function) {
            return Array.isArray(array);
        }
        return Object.prototype.toString.call(array) === '[object Array]';
    }

    function _isFunction(func) {
        return typeof func === _function;
    }

    var PromiseX = _definePromiseX();

    if (typeof define === _function && define.amd) {
        define(function () {
            return PromiseX;
        });
    } else if (typeof module !== 'undefined') {
        module.exports = PromiseX;
    } else {
        global.PromiseX = PromiseX;
    }

})(this);
