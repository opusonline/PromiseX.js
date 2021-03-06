/**
 * PromiseX - Promise Xtended
 * wrapper for promises to add new methods w/o changing the native promise prototype
 * good read: http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html
 * also interesting: https://github.com/paldepind/sync-promise
 * http://exploringjs.com/es6/ch_promises.html
 * @author Stefan Benicke <stefan.benicke@gmail.com>
 * @version 2.2.0
 * @see {@link https://github.com/opusonline/PromiseX.js}
 * @license MIT
 */
(function (root, undefined) {
    'use strict';

    var _global = typeof global === 'object' && global !== root.global ? global : root; // in node: root == {}

    var _function = 'function';

    var _setImmediate = typeof _global.setImmediate === _function ? _global.setImmediate : function (callback) {
        return setTimeout(callback, 0);
    };

    var _definePropertyOldSchool = false;
    var _defineProperty;
    var PromiseX;
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

    function _definePromiseX() {

        var _Promise = _global.Promise;
        var _validBasePromise = _supportsPromise();
        var proto;

        /**
         * `executor` should be the execution function called with optional context,
         * if `executor` is empty the promise is a `deferred` with resolve and reject functions,
         * if `executor` is a native promise the new object will be a wrapper for this promise
         * every other executor is treated as PromiseX.resolve(value)
         *
         * @class PromiseX
         * @example
         * // default use
         * var promise = new PromiseX(function(resolve, reject) {
         *     var async = doSomeAsyncStuff();
         *     async.onready = resolve;
         *     async.onerror = reject;
         * });
         *
         * // extended
         * var promise = new PromiseX(function(resolve, reject, self) {
         *     var async = doSomeAsyncStuff();
         *     async.onready = resolve;
         *     async.onerror = reject;
         *     self.cancel = function() {
         *         reject(new Error('canceled'));
         *     };
         * });
         * promise.cancel();
         *
         * // context
         * var collection = {};
         * collection.promise = new PromiseX(function(resolve) {
         *     this.resolve = function(value) {
         *         resolve(value);
         *         return this.promise;
         *     };
         * }, collection);
         * collection.resolve('resolved').then(…);
         *
         * // PromiseX.resolve(value)
         * var promise = new PromiseX('resolved');
         *
         * // PromiseX.defer() including resolve/reject
         * var promise = new PromiseX();
         * promise.resolve('resolved');
         *
         * // PromiseX.cast() or PromiseX.resolve() for underlying promises
         * var nativePromise = Promise.resolve('native');
         * var promiseX = new PromiseX(nativePromise);
         * promiseX.then(…);
         *
         * // status and value
         * var promise = PromiseX.resolve('foo'); // promise.status == 'resolved'; promise.value == 'foo'
         * @param {undefined|function|*} [executor]
         * @param {Object} [context] Context for executor
         * @return {PromiseX} new PromiseX
         */
        function PromiseX(executor, context) {
            var self;
            if (!_isPromiseX(this)) {
                throw new TypeError('Failed to construct \'PromiseX\': Please use the \'new\' operator, this object constructor cannot be called as a function.');
            }
            if (_isPromiseX(executor)) {
                return executor;
            }
            self = this;
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
                            _checkSelfReference(self, value);
                            self.status = PromiseX.RESOLVED;
                            self.value = value;
                            resolve(value);
                        }, function (reason) {
                            if (self.status !== PromiseX.PENDING) {
                                return;
                            }
                            _checkSelfReference(self, reason);
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

        /**
         * @name PromiseX.PENDING
         * @constant {string} PENDING
         */
        PromiseX.PENDING = 'pending';
        /**
         * @name PromiseX.RESOLVED
         * @constant {string} RESOLVED
         */
        PromiseX.RESOLVED = 'resolved';
        /**
         * @name PromiseX.REJECTED
         * @constant {string} REJECTED
         * @example
         * var promise = Promise.resolve('foo');
         * if (promise.status === PromiseX.RESOLVED) {
         *     doStuff();
         * }
         */
        PromiseX.REJECTED = 'rejected';

        proto = PromiseX.prototype;

        _defineProperty(proto, 'status', PromiseX.PENDING);
        _defineProperty(proto, 'value', undefined);

        /**
         * just like standard Promise.then, always returns a new Promise
         * resolve function is executed if previous Promise is resolved
         * reject function is executed if previous Promise is rejected
         * resolve/reject functions are called with optional context
         * skipped if previous promise is cancelled
         *
         * @name PromiseX#then
         * @example
         * // default use
         * doAsync().then(function(value) {
         *     console.log(value);
         * });
         *
         * // resolve and reject
         * doAsync().then(function(value) {
         *     console.log(value);
         * }, function(reason) {
         *     console.error(reason);
         * });
         *
         * // catch
         * doAsync().then(null, function(reason) {
         *     console.error(reason);
         * });
         *
         * // context
         * var collection = {};
         * doAsync().then(function(value) {
         *     this.result = value;
         * }, null, collection);           // null is for reject function
         * @param {function} resolve
         * @param {function} [reject]
         * @param {Object} [context] Context for resolve/reject function
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(proto, 'then', function PromiseX_then(resolve, reject, context) {
            var promiseX, promise;
            var thenResolve = !_isFunction(resolve) ? resolve : function (value) {
                var result;
                if (_isCancelled(value)) {
                    return value;
                }
                result = resolve.call(context, value);
                _checkSelfReference(promiseX, result);
                return _isPromiseX(result) ? result.promise : result;
            };
            var thenReject = !_isFunction(reject) ? reject : function (reason) {
                var result = reject.call(context, reason);
                _checkSelfReference(promiseX, result);
                return _isPromiseX(result) ? result.promise : result;
            };
            promise = this.promise.then(thenResolve, thenReject);
            promiseX = new PromiseX(promise);
            return promiseX;
        });
        /**
         * just like standard Promise.catch, always returns a new Promise
         * reject function is executed if previous Promise is rejected
         * shorthand for Promise.then(null, reject)
         * reject function is called with optional context
         * skipped if previous promise is cancelled
         *
         * @name PromiseX#catch
         * @example
         * // default use
         * doAsync().catch(function(reason) {
         *     console.error(reason);
         * });
         *
         * // context
         * var collection = {};
         * doAsync().catch(function(reason) {
         *     this.result = reason;
         * }, collection);
         * @param {function} reject
         * @param {Object} [context] Context for reject function
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(proto, 'catch', function PromiseX_catch(reject, context) {
            var promiseX, promise;
            if (_isFunction(reject)) {
                promise = this.promise.catch(function (reason) {
                    var result = reject.call(context, reason);
                    _checkSelfReference(promiseX, result);
                    return _isPromiseX(result) ? result.promise : result;
                });
            } else {
                promise = this.promise.catch(reject);
            }
            promiseX = new PromiseX(promise);
            return promiseX;
        });
        /**
         * non-standard, always returns a new Promise
         * defined here: {@link https://www.promisejs.org/api/#Promise_prototype_finally}
         * callback is executed with optional context when Promise is fulfilled
         * previous resolved/rejected values are propagated to next Promise
         * _attention:_ this behaves exactly like try-catch-finally
         * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling#The_finally_block}
         * and is a bit different to others regarding the return value of finally callback
         * skipped if previous promise is cancelled
         *
         * @name PromiseX#finally
         * @example
         * // default use
         * showLoadingSpinner();
         * doAsync().finally(function() { // or just .finally(hideLoadingSpinner) but be sure that hideLoadingSpinner returns no value
         *     hideLoadingSpinner();
         *     // return;
         * }).then(function(value) {
         *     // result of doAsync is shown here
         *     console.log(value);
         * }).catch(function(reason) {
         *     // errors in doAsync will be catched here
         *     console.error(reason);
         * });
         *
         * PromiseX.reject('error').finally(function() {
         *     throw 'finally error';
         * }).catch(function(reason) {
         *     // reason == 'finally error';
         * });
         *
         * PromiseX.resolve('foo').finally(function() {
         *     return 'bar';
         * }).then(function(reason) {
         *     // reason == 'bar';
         * });
         * @param {function} callback
         * @param {Object} [context] Context for callback
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(proto, 'finally', function PromiseX_finally(callback, context) {
            var promiseX;
            var promise = this.promise.then(function (value) {
                var result;
                if (_isCancelled(value)) {
                    return value;
                }
                result = callback.call(context);
                _checkSelfReference(promiseX, result);
                return _castPromise(result).then(function (finallyValue) {
                    return finallyValue !== undefined ? finallyValue : value;
                });
            }, function (reason) {
                var result = callback.call(context);
                _checkSelfReference(promiseX, result);
                return _castPromise(result).then(function (finallyValue) {
                    if (finallyValue !== undefined) {
                        return finallyValue;
                    }
                    throw reason;
                });
            });
            promiseX = new PromiseX(promise);
            return promiseX;
        });
        /**
         * non-standard
         * does **not** return a promise, throws outside promises on next tick
         * defined here: {@link https://www.promisejs.org/api/#Promise_prototype_done}
         * if resolve/reject is/are provided, a last Promise.then is executed with optional context
         * skipped if previous promise is cancelled
         *
         * @name PromiseX#done
         * @example
         * // default use
         * doAsync().then(doStuff).done();
         *
         * // then().done() in one
         * doAsync().done(doStuff);
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
         * transforms Promise to node-like callback - meaning: `callback(error, value)`
         * defined here: {@link https://www.promisejs.org/api/#Promise_prototype_nodify}
         * skipped if previous promise is cancelled
         *
         * @name PromiseX#nodeify
         * @example
         * doAsync().nodeify(function (error, result) {
         *     if (error) {
         *         console.error(error);
         *         return;
         *     }
         *     doStuff(result);
         * });
         * @param {function} callback
         * @param {Object} [context] Context for callback
         * @return {PromiseX} self
         */
        _defineProperty(proto, 'nodeify', function PromiseX_nodeify(callback, context) {
            if (!_isFunction(callback)) {
                return this;
            }
            this.promise.then(function (value) {
                if (!_isCancelled(value)) {
                    _setImmediate(function () {
                        callback.call(context, null, value);
                    });
                }
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
         * skipped if previous promise is cancelled
         *
         * @name PromiseX#delay
         * @example
         * doAsync().delay(5000).then(function(value) {
         *     // 5s after doAsync resolves
         *     // value is result of doAsync
         * }, function(reason) {
         *     // 5s after doAsync rejects
         *     // reason is error of doAsync
         * });
         * @param {Number} ms Milliseconds
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(proto, 'delay', function PromiseX_delay(ms) {
            var promise = this.promise.then(function (value) {
                if (_isCancelled(value)) {
                    return value;
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
         * non-standard
         * cancelled promise chain can be catched here
         * resolve method gets reason as parameter
         * influence continuing by returning a value or throw
         * return nothing (undefined) means continue cancelling
         *
         * @name PromiseX#cancelled
         * @example
         * getJSON('data').catch(function(reason) {
         *     return PromiseX.cancel({message: 'Load Error', error: reason});
         * }).then(function(data) {
         *     // success loading
         *     // process data
         *     // never called if cancelled before
         *     return processData(data);
         * }).then(function(foo) {
         *     // only called if not cancelled
         *     duStuff(foo);
         * }).catch(function(reason) {
         *     // even catch is never called if cancelled before!!!
         * }).cancelled(function(error) {
         *     console.warn(error.message, error.error);
         *     return 'from cancelled with <3'; // optional
         * }).then(function(message) {
         *     // continues here
         *     // message from cancelled handler (optional)
         * });
         * @param {function} resolve
         * @param {Object} [context]
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(proto, 'cancelled', function PromiseX_cancelled(resolve, context) {
            var promiseX;
            var thenResolve = !_isFunction(resolve) ? resolve : function (value) {
                var result;
                if (_isCancelled(value)) {
                    result = resolve.call(context, value.reason);
                    if (result !== undefined) {
                        _checkSelfReference(promiseX, result);
                        return _isPromiseX(result) ? result.promise : result;
                    }
                }
                return value;
            };
            var promise = this.promise.then(thenResolve);
            promiseX = new PromiseX(promise);
            return promiseX;
        });
        /**
         * standard, returns a resolved Promise with given value
         * _heads-up:_ if value is a `PromiseX`, value is returned
         *
         * @name PromiseX.resolve
         * @example
         * PromiseX.resolve('done');
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
         * @name PromiseX.reject
         * @example
         * PromiseX.reject('fail');
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
         * @name PromiseX.timeout
         * @example
         * PromiseX.timeout(doAsync(), 5000).then(function (value) {
         *     // result of doAsync in under 5000ms
         * }, function(reason) {
         *     // error from doAsync in under 5000ms
         *     // or reason.message == Timeout otherwise since Error('Timeout') is thrown
         * });
         *
         * PromiseX.timeout(doAsync(), 5000, 'doAsyncTimeout').catch(function(reason) {
         *     // error from doAsync in under 5000ms
         *     // or reason.message == 'doAsyncTimeout'
         * });
         *
         * // good practice
         * doAsync().then(function() {
         *     return PromiseX.timeout(somePromise(), 5000); // timeout starts counting when then is executed
         * }).catch(function(reason) {
         *     // reason.message == 'Timeout'
         * });
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
         * @name PromiseX.delay
         * @example
         * PromiseX.delay(5000, 'foo').then(function(value) {
         *     // 5 seconds later
         *     // value == 'foo'
         * });
         *
         * // fancy Promise timeout
         * PromiseX.race([doAsync(), PromiseX.delay(100).then(function(){
         *     throw new Error('timeout');
         * })]).catch(function(reason) {
         *     // reason == doAsync error or timeout
         * });
         *
         * doAsync().then(function(value) {
         *     return PromiseX.delay(5000, value);
         * }).then(function(value) {
         *     // value == doAsync value; 5 seconds after doAsync resolved
         * });
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
         * _attention:_ don't use deferred.promise; there is a `promise` property but only for internal use!
         *
         * @name PromiseX.defer
         * @example
         * function doAsync() {
         *     var deferred = PromiseX.defer(); // could also be: deferred = new Promise();
         *     setTimeout(function() {
         *         if (test) {
         *             deferred.resolve();
         *         } else {
         *             deferred.reject();
         *         }
         *     }, 5000);
         *     return deferred;
         * }
         * doAsync().then(…)
         * @return {PromiseX} deferred
         */
        _defineProperty(PromiseX, 'defer', function PromiseX_defer() {
            return new PromiseX();
        });
        /**
         * ensures to return a `PromiseX` promise
         * if value is a promise, return that promise
         * different to PromiseX.resolve since `cast` transforms and `resolve` gives a resolved `PromiseX`
         * {@link http://www.wintellect.com/devcenter/nstieglitz/5-great-features-in-es6-harmony}
         *
         * @name PromiseX.cast
         * @example
         * // any value
         * PromiseX.cast('foo').then(…);
         *
         * // promise
         * var promise = Promise.resolve();
         * PromiseX.cast(promise).then(…);
         *
         * // PromiseX
         * var promise = new PromiseX();
         * PromiseX.cast(promise).then(…); // PromiseX.cast(promise) === promise
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
         * @name PromiseX.all
         * @example
         * PromiseX.all([doAsync1(), doAsync2()]).then(function(resolveArray) {
         *     var value1 = resolveArray[0];
         *     var value2 = resolveArray[1];
         * }).catch(function(reason) {
         *     // could be any error from doAsync1 or doAsync2
         * });
         *
         * // fancy usecase
         * var requests = PromiseX.map(['content1.json', 'content2.json'], getJSON); // same as [getJSON('content1.json'), getJSON('content2.json')]
         * PromiseX.all(requests).then(…).catch(…);
         * @param {Array<Promise>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'all', function PromiseX_all(promises) {
            return new PromiseX(function (resolve, reject) {
                var result, sequence;
                if (promises === undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
                }
                result = [];
                sequence = _cast();

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
         * @name PromiseX.race
         * @example
         * PromiseX.race([doAsync1(), doAsync2()]).then(function(value) {
         *     // value could be resolved value from doAsync1 or doAsync2 deciding on faster one
         * }).catch(function() {
         *     // could be any error from doAsync1 or doAsync2
         * });
         *
         * // nice for timeout
         * PromiseX.race([doAsync(), PromiseX.delay(100).then(function(){
         *     throw new Error('timeout');
         * })]).catch(function(reason) {
         *     // reason == doAsync error or timeout
         * });
         * @param {Array<Promise|*>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'race', function PromiseX_race(promises) {
            return new PromiseX(function (resolve, reject) {
                var i, n;
                if (promises === undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
                }
                if (_isArray(promises)) {
                    n = promises.length;
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
         * @name PromiseX.every
         * @example
         * var requests = PromiseX.map(['c1.json', c2.json], getJSON); // could also be [getJSON('c1.json'), getJSON('c1.json')]
         * PromiseX.every(requests).then(function(resultArray) {
         *     resultArray.forEach(function(result) {
         *         if (result.status === PromiseX.RESOLVED) {
         *             console.log(result.value);
         *         } else {
         *             console.error(result.value);
         *         }
         *     });
         * }).catch(function(reason) {
         *     // reason could be any error during performing PromiseX.every, NOT a rejected request
         * });
         * @param {Array<Promise|*>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'every', function PromiseX_every(promises) {
            return new PromiseX(function (resolve) {
                var count, result;
                if (promises === undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
                }
                count = _isArray(promises) ? promises.length : 1;
                result = new Array(count);
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
         * @name PromiseX.any
         * @example
         * var requests = ['endpoint1', 'endpoint2'].map(function(endpoint) { // could also be [getJSON('endpoint1/a.json'), getJSON('endpoint2/a.json')];
         *     return getJSON(endpoint + '/a.json');
         * });
         * PromiseX.any(requests).then(function(response) {
         *     // response is from fastest endpoint, yeah :D
         * }).catch(function(reason) {
         *     // none of endpoints resolved
         *     // reason.message == 'No promises resolved successfully.'
         * });
         * @param {Array<Promise|*>} promises
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'any', function PromiseX_any(promises) {
            return new PromiseX(function (resolve, reject) {
                var count, onReject, i, n;
                if (promises === undefined || promises === null) {
                    throw new TypeError('First argument needs to be an array of promises or values.');
                }
                if (_isArray(promises)) {
                    count = promises.length;
                    if (count === 0) {
                        return resolve();
                    }
                    onReject = function onReject() {
                        count--;
                        if (count === 0) {
                            reject(new Error('No promises resolved successfully.'));
                        }
                    };

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
         * returns an array of `PromiseX` created from each value by the map function executed with optional context
         * mapFunction is called as mapper(current, index, length, values)
         * _heads-up:_ take care of errors; invalid input throws
         *
         * @name PromiseX.map
         * @example
         * var requestConfig = {
         *     credentials: 'include'
         * };
         *
         * var requests = PromiseX.map(['c1.json', c2.json], function(file) {
         *     var request = new Request('endpoint/' + file, requestConfig);
         *     return fetch(request).then(function(response) {             // see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
         *         if (response.ok === false) {
         *             throw new TypeError('Invalid response');
         *         }
         *         return response.json();
         *     });
         * });
         *
         * // use of PromiseX promises
         * requests.forEach(function(promise) {
         *     // promise is automatically casted to PromiseX within PromiseX.map
         *     promise.nodeify(callback);
         * });
         *
         * // usecase
         * PromiseX.every(requests).then(…).catch(…);
         * @param {Array<*>} values Array of values
         * @param {function} mapFunction Called as mapper(current, index, length, values)
         * @param {Object} [context] Context for mapFunction
         * @return {Array<PromiseX>} promises
         */
        _defineProperty(PromiseX, 'map', function PromiseX_map(values, mapFunction, context) {
            var promises, i, n;
            if (!_isFunction(mapFunction)) {
                throw new TypeError('Map-function is no valid function');
            }
            if (_isArray(values) === false) {
                values = [values];
            }
            promises = [];
            n = values.length;
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
         * @name PromiseX.reduce
         * @example
         * // simple usecase
         * PromiseX.reduce(['entries-10.txt', 'entries-20.txt'], function(result, file) {
         *     return readEntriesAsync(file).then(function(entries) {
         *         // entries of entries-10 is 10 and so on
         *         return entries + result;            // first result = 0 (initValue)
         *     });
         * }, 0).then(function(total) {
         *     // total == 0 + 10 + 20 = 30
         * });
         * // even simpler
         * PromiseX.reduce([1, 2, 3], function(total, current) {
         *     return total + current;
         * }, 0).then(function(total) {
         *     // total == 6
         * });
         *
         * // example adapted from http://www.html5rocks.com/en/tutorials/es6/promises/#toc-creating-sequences
         * var urls = ['chapter-1.json', 'chapter-2.json', …];
         * var requests = PromiseX.map(urls, getJSON);         // start loading each immediately
         * PromiseX.reduce(requests, function(_, chapterPromise) {
         *     return chapterPromise.then(function(chapter) {
         *         addHTMLToPage(chapter.htmlContent);         // add in correct order as soon as loaded
         *     });
         * }).then(function() {
         *     addTextToPage("All done");
         * }).catch(function(err) {
         *     // catch any error that happened along the way
         *     addTextToPage("Argh, broken: " + err.message);
         * }).finally(function() {
         *     document.querySelector('.spinner').style.display = 'none';
         * });
         * @param {Array<*|Promise>} values Array of promises or values
         * @param {function} reduceFunction Called as reducer(previous, current, index, length, values) previous is initialValue or undefined
         * @param {*} [initialValue]
         * @param {Object} [context] Context for reduceFunction
         * @return {PromiseX} new PromiseX
         */
        _defineProperty(PromiseX, 'reduce', function PromiseX_reduce(values, reduceFunction, initialValue, context) {
            return new PromiseX(function (resolve, reject) {
                var length, sequence;
                if (!_isFunction(reduceFunction)) {
                    throw new TypeError('Reduce-function is no valid function');
                }
                length = _isArray(values) ? values.length : 1;
                sequence = _castPromise(initialValue);
                _forEach(values, function (value, index) { // if values is no array forEach transforms it
                    sequence = sequence.then(function (result) {
                        var reduced;
                        if (_isCancelled(result)) {
                            return result;
                        }
                        reduced = reduceFunction.call(context, result, value, index, length, values);
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
         * @name PromiseX.cancel
         * @example
         * getJSON('/data').catch(function(error) {
         *     return PromiseX.cancel({message: 'AJAX error', error: error});
         * }).then(function() {
         *     // this function is never invoked on cancel
         * }).then(function() {
         *     // this function is never invoked on cancel
         * }).catch(function() {
         *     // this function is never invoked on cancel
         * }).cancelled(function(reason) {
         *     console.warn('cancelled', reason.message, reason.error);
         * });
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
         * @name PromiseX.config
         * @example
         * var Bluebird = Promise.noConflict();     // if Bluebird is included
         * PromiseX.config('setPromise', Bluebird);
         * var PromiseZ = PromiseX.config('createPromise', Zousan);
         * assert(PromiseZ.config('getPromise') instanceof Zousan);
         * @param {String} option
         * @param {*} [value]
         * @return {boolean|*} Success state or requested config option
         */
        _defineProperty(PromiseX, 'config', function PromiseX_config(option, value) {
            var newPromise;
            if (option === 'getPromise') {
                return _Promise;
            }
            if (option === 'setPromise' && value !== undefined) {
                if (!_supportsPromise(value)) {
                    throw new TypeError(' Invalid Promise: ' + value);
                }
                _Promise = value;
                _validBasePromise = _supportsPromise();
                return true;
            }
            if (option === 'createPromise' && value !== undefined) {
                if (!_supportsPromise(value)) {
                    throw new TypeError(' Invalid Promise: ' + value);
                }
                newPromise = _definePromiseX();
                newPromise.config('setPromise', value);
                return newPromise;
            }
            return false;
        });
        /**
         * static error on PromiseX
         * can be used to throw special error and check with 'instanceof'
         * provides message and even error like stack
         *
         * @name PromiseX.CancellationError
         * @example
         * getJSON('/data.json').then(function(data) {
         *     if (data.length === 0) {
         *         throw PromiseX.CancellationError('data.json is empty');
         *     }
         *     return doStuff(data);
         * }).then(…).catch(function(reason) {
         *     if (reason instanceof PromiseX.CancellationError) {
         *         console.error(reason);
         *     } else {
         *         // here for example getJSON errors are caught
         *     }
         * });
         * @param {String} message
         * @return {PromiseX.CancellationError}
         */
        _defineProperty(PromiseX, 'CancellationError', function PromiseX_CancellationError(message) {
            if (!(this instanceof PromiseX.CancellationError)) {
                return new PromiseX.CancellationError(message);
            }
            _initError(this, PromiseX.CancellationError, message);
        });
        _defineProperty(PromiseX.CancellationError.prototype, 'message', '');
        /**
         * static error on PromiseX
         * can be used to throw special error and check with 'instanceof'
         * provides message and even error like stack
         *
         * @name PromiseX.TimeoutError
         * @example
         * function loadWithTimeout(url, delay) {
         *     return new PromiseX(function(resolve, reject) {
         *         setTimeout(function() {
         *             throw new PromiseX.TimeoutError('loadWithTimeout from ' + url);
         *         }, delay);
         *         getJSON(url).then(resolve, reject);
         *     });
         * }
         * loadWithTimeout('/data', 5000).catch(function(reason) {
         *     if (reason instanceof PromiseX.TimeoutError) {
         *         console.warn('timeout', reason.message);
         *     }
         * });
         * @param {String} message Everything casted to string
         * @return {PromiseX.TimeoutError}
         */
        _defineProperty(PromiseX, 'TimeoutError', function PromiseX_TimeoutError(message) {
            if (!(this instanceof PromiseX.TimeoutError)) {
                return new PromiseX.TimeoutError(message);
            }
            _initError(this, PromiseX.TimeoutError, message);
        });
        _defineProperty(PromiseX.TimeoutError.prototype, 'message', '');

        function _initError(that, type, message) {
            var error;
            if (message !== undefined) {
                _defineProperty(that, 'message', '' + message);
            }
            if ('captureStackTrace' in Error) {
                Error.captureStackTrace(that, type);
            } else {
                error = new Error(message);
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
            var test;
            if (promise === undefined) {
                promise = _Promise;
            }
            try {
                test = new promise(function (resolve, reject) {
                });
                return 'then' in test && typeof test.then === _function;
            } catch (e) {
            }
            return false;
        }

        function _checkUndefinedPromise() {
            if (!_validBasePromise) {
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

    function _checkSelfReference(instance, value) {
        if (instance === value) {
            throw new TypeError('Attempt to resolve promise with self');
        }
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
    function _forEach(array, callback, context) {
        var i, n;
        if (_isArray(array) === false) {
            array = [array];
        }
        if (typeof Array.prototype.forEach === _function) {
            return array.forEach(callback, context);
        }
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

    PromiseX = _definePromiseX();

    if (typeof _global.define === _function && _global.define.amd) {
        _global.define([], function () {
            return PromiseX;
        });
    } else if (typeof module !== 'undefined' && root.module !== module) {
        module.exports = PromiseX;
    } else {
        _global.PromiseX = PromiseX;
    }

})(this);
