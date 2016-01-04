PromiseX.js
===========

Javascript Promise Xtended - Wrapper to add new methods [w/o changing the native promise prototype](https://www.nczonline.net/blog/2010/03/02/maintainable-javascript-dont-modify-objects-you-down-own/)

# Features

 * built-in defer
 * assignable context for all functions
 * public string constants for better readability
 * accessible value and status of each promise
 * nice methods like finally, timeout, any or nodeify
 * change underlying promise at runtime - that way you don't need to redefine global promise


# Install

 * Install with [Bower](http://bower.io): `bower install opusonline-promisex.js`
 * Install with [NPM](https://www.npmjs.org/): `npm install opusonline-promisex.js`

# Usage

### new PromiseX([executor], [context])

Constructor\
executor should be the execution function called with optional context,\
if executor is empty the promise is a deferred with resolve and reject functions,\
if executor is a native promise the new object will be a wrapper for this promise\
every other executor is treated as PromiseX.resolve(value)

### Constants

 * PromiseX.PENDING
 * PromiseX.RESOLVED
 * PromiseX.REJECTED

### PromiseX#then(resolve, [reject], [context])

Just like standard Promise.then, always returns a new Promise\
resolve function is executed if previous Promise is resolved\
reject function is executed if previous Promise is rejected\
resolve/reject functions are called with optional context

### PromiseX#catch(reject, [context])

Just like standard Promise.catch, always returns a new Promise\
reject function is executed if previous Promise is rejected\
shorthand for Promise.then(null, reject)\
reject function is called with optional context

### PromiseX#finally(callback, [context])

non-standard, always returns a new Promise\
defined here: <https://www.promisejs.org/api/#Promise_prototype_finally>\
callback is executed with optional context when Promise is fulfilled\
previous resolved/rejected values are propagated to next Promise\
_addition_: callback provides previous promise as parameter (use promise.value and promise.status)\
_heads-up_: errors within callback will propagate as rejected promise\

### PromiseX#done([resolve], [reject], [context])

non-standard\
does *not* return a promise, throws outside promises on next tick\
defined here: <https://www.promisejs.org/api/#Promise_prototype_done>\
if resolve/reject is/are provided, a last Promise.then is executed with optional context

### PromiseX#nodeify(callback, [context])

non-standard\
transforms Promise to node-like callback - meaning: callback(error, value)\
defined here: <https://www.promisejs.org/api/#Promise_prototype_nodify>

### PromiseX#timeout(ms, [reason])

non-standard\
used in many Promise libraries like [BluebirdJS](http://bluebirdjs.com/docs/api/timeout.html)\
timeout for previous Promise fulfillment\
if reason is given, timeout Promise rejects with reason

### PromiseX#delay(ms, [value])

non-standard\
used in many Promise libraries like [BluebirdJS](http://bluebirdjs.com/docs/api/promise.delay.html)\
delays execution of next Promise in chain\
if init value is given, this Promise resolves with init value otherwise previous value is propagated

### PromiseX.resolve(value)

standard, returns a resolved Promise with given value

### PromiseX.reject(reason)

standard, returns a rejected Promise with given reason

### PromiseX.delay(ms, [value])

non-standard\
returns a resolved Promise with given value after certain amount of time in milliseconds

### PromiseX.defer

non-standard\
returns a deferred object including promise and\
resolve and reject methods to fulfill the promise
<https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred>

### PromiseX.cast(value)

ensures to return a promise\
if value is a promise, return that promise\
<http://www.wintellect.com/devcenter/nstieglitz/5-great-features-in-es6-harmony>

### PromiseX.all(promises)

standard\
returns a Promise that is resolved only if all promises are resolved
or rejected if any promise of list is rejected\
resolve function gets array of promise values

### PromiseX.race(promises)

standard\
returns a Promise that is resolved as soon as one promise is resolved
or rejected as soon as one promise of list is rejected\
_heads-up_: native function is commented since some checks are missing

### PromiseX.every(promises)

non-standard\
is fulfilled only if all promises are fulfilled either resolved or rejected.\
each promise's fulfillment state and value is provided in the propagated value array
as promise.value and promise.status

### PromiseX.any(promises)

non-standard\
is fulfilled as soon as any promise is resolved or all promises are rejected

### PromiseX.map(values, mapFunction, [context])

non-standard\
returns an array of PromiseX created from each value by the map function executed with optional context

### PromiseX.config(option, value)

non-standard\
influence behaviour of PromiseX plugin\
'getPromise' and 'setPromise' G/Setter for the underlying promise - that way you don't need to redefine global promise
