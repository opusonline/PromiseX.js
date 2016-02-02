<a href="http://promises-aplus.github.com/promises-spec">
    <img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png"
         align="right" alt="Promises/A+ logo" />
</a>

PromiseX.js
===========

Javascript Promise Xtended - Wrapper to add new methods [w/o changing the native promise prototype](https://www.nczonline.net/blog/2010/03/02/maintainable-javascript-dont-modify-objects-you-down-own/)

# Features

 * built-in `defer` if needed
 * assignable context for all functions
 * public string constants for better readability
 * exposed `value` and `status` of each promise
 * nice methods like `finally`, `timeout`, `any` or `nodeify`
 * **cancellable promise chain** (partly or as long as you want)
 * create cancellable promises by adding public methods to a created Promise
 * change underlying promise at runtime - that way you don't need to redefine global promise

# Promises/A+ Compliance

`PromiseX` is NO plain Promise plugin, it is a _wrapper_ to extend basic functionality.  
Per default, `PromiseX` uses the native Promise. If no promise is present, an error is thrown.  
Since [some implementations have better performance than native promise](http://jsperf.com/promise-speed-comparison/8), 
you can choose the base promise for `PromiseX`. And better, you can have multiple instances with different base promises!!!

```javascript
PromiseX.config('getPromise') === window.Promise; // true

var PromiseZousan = PromiseX.config('createPromise', Zousan); // https://github.com/bluejava/zousan

PromiseX.resolve('native').then(function() {
	return PromiseZousan.resolve('zousan');
}).then(…);
```

`PromiseX` with native Promise is passing all Tests of [Compliance Test Suite](https://github.com/promises-aplus/promises-tests).

It follows [Promises/A+ Specification](https://promisesaplus.com/), but some points are extended.  
For example [Point 2.2.5](https://promisesaplus.com/#point-35) is true in general, but with `PromiseX` you are free to add your desired context :D

# Install

 * Install with [Bower](http://bower.io): `bower install opusonline-promisex.js`
 * Install with [NPM](https://www.npmjs.org/): `npm install opusonline-promisex.js`

# Usage

### new PromiseX([executor], [context]) => {PromiseX}

`executor` should be the execution function called with optional context,  
if `executor` is empty the promise is a `deferred` with resolve and reject functions,  
if `executor` is a native promise the new object will be a wrapper for this promise  
every other executor is treated as PromiseX.resolve(value)

### Constants

 * PromiseX.PENDING
 * PromiseX.RESOLVED
 * PromiseX.REJECTED

```javascript
var promise = Promise.resolve('foo');
if (promise.status === PromiseX.RESOLVED) {
    doStuff();
}
```

### PromiseX#then(resolve, [reject], [context]) => {PromiseX}

just like standard Promise.then, always returns a new Promise  
resolve function is executed if previous Promise is resolved  
reject function is executed if previous Promise is rejected  
resolve/reject functions are called with optional context

```javascript
// default use
doAsync().then(function(value) {
    console.log(value);
});

// resolve and reject
doAsync().then(function(value) {
    console.log(value);
}, function(reason) {
    console.error(reason);
});

// catch
doAsync().then(null, function(reason) {
    console.error(reason);
});

// context
var collection = {};
doAsync().then(function(value) {
    this.result = value;
}, null, collection);           // null is for reject function
```

### PromiseX#catch(reject, [context]) => {PromiseX}

just like standard Promise.catch, always returns a new Promise  
reject function is executed if previous Promise is rejected  
shorthand for Promise.then(null, reject)  
reject function is called with optional context

```javascript
// default use
doAsync().catch(function(reason) {
    console.error(reason);
});

// context
var collection = {};
doAsync().catch(function(reason) {
    this.result = reason;
}, collection);
```

### PromiseX#finally(callback, [context]) => {PromiseX}

non-standard, always returns a new Promise  
defined here: <https://www.promisejs.org/api/#Promise_prototype_finally>  
callback is executed with optional context when Promise is fulfilled  
previous resolved/rejected values are propagated to next Promise  
__attention:___ this behaves exactly like try-catch-finally  
<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling#The_finally_block>  
and is a bit different to others regarding the return value of finally callback

```javascript
// default use
showLoadingSpinner();
doAsync().finally(function() { // or just .finally(hideLoadingSpinner) but be sure that hideLoadingSpinner returns no value
    hideLoadingSpinner();
    // return;
}).then(function(value) {
    // result of doAsync is shown here
    console.log(value);
}).catch(function(reason) {
    // errors in doAsync will be catched here
    console.error(reason);
});

PromiseX.reject('error').finally(function() {
    throw 'finally error';
}).catch(function(reason) {
    // reason == 'finally error';
});

PromiseX.resolve('foo').finally(function() {
    return 'bar';
}).then(function(reason) {
    // reason == 'bar';
});
```

### PromiseX#done([resolve], [reject], [context]) => {undefined}

non-standard  
does **not** return a promise, throws outside promises on next tick  
defined here: <https://www.promisejs.org/api/#Promise_prototype_done>  
if resolve/reject is/are provided, a last Promise.then is executed with optional context

```javascript
// default use
doAsync().then(doStuff).done();

// then().done() in one
doAsync().done(doStuff);
```

### PromiseX#nodeify(callback, [context]) => {PromiseX}

non-standard  
transforms Promise to node-like callback - meaning: `callback(error, value)`  
defined here: <https://www.promisejs.org/api/#Promise_prototype_nodify>

```javascript
doAsync().nodeify(function (error, result) {
    if (error) {
        console.error(error);
        return;
    }
    doStuff(result);
});
```

### PromiseX#delay(ms) => {PromiseX}

non-standard  
used in many Promise libraries like [BluebirdJS](http://bluebirdjs.com/docs/api/promise.delay.html)  
delays execution of next Promise in chain  
previous value or error is propagated

```javascript
doAsync().delay(5000).then(function(value) {
    // 5s after doAsync resolves
    // value is result of doAsync
}, function(reason) {
    // 5s after doAsync rejects
    // reason is error of doAsync
});
```

### PromiseX#cancelled(resolve, [context]) => {PromiseX}

non-standard  
cancelled promise chain can be catched here  
resolve method gets reason as parameter  
influence continuing by returning a value or throw  
return nothing (undefined) means continue cancelling

```javascript
getJSON('data').catch(function(reason) {
    return PromiseX.cancel({message: 'Load Error', error: reason});
}).then(function(data) {
    // success loading
    // process data
    // never called if cancelled before
    return processData(data);
}).then(function(foo) {
    // only called if not cancelled
    duStuff(foo);
}).catch(function(reason) {
    // even catch is never called if cancelled before!!!
}).cancelled(function(error) {
    console.warn(error.message, error.error);
    return 'from cancelled with <3'; // optional
}).then(function(message) {
    // continues here
    // message from cancelled handler (optional)
});
```

### PromiseX.resolve([value]) => {PromiseX}

standard, returns a resolved Promise with given value  
_heads-up:_ if value is a `PromiseX`, value is returned

```javascript
PromiseX.resolve('done');
```

### PromiseX.reject([reason]) => {PromiseX}

standard, returns a rejected Promise with given reason

```javascript
PromiseX.reject('fail');
```

### PromiseX.timeout(promise, ms, [reason]) => {PromiseX}

non standard  
used in many Promise libraries like [BluebirdJS](http://bluebirdjs.com/docs/api/timeout.html)  
example here <https://www.promisejs.org/patterns/#race>  
timeout for given Promise fulfillment  
if reason is given, timeout Promise rejects with reason  
_heads-up:_ I refused doAsync().timeout() because I want to avoid using timeout later in promise chain  
since setTimeout starts immediately when calling and not when promise starts

```javascript
PromiseX.timeout(doAsync(), 5000).then(function (value) {
    // result of doAsync in under 5000ms
}, function(reason) {
    // error from doAsync in under 5000ms
    // or reason.message == Timeout otherwise since Error('Timeout') is thrown
});

PromiseX.timeout(doAsync(), 5000, 'doAsyncTimeout').catch(function(reason) {
    // error from doAsync in under 5000ms
    // or reason.message == 'doAsyncTimeout'
});

// good practice
doAsync().then(function() {
    return PromiseX.timeout(somePromise(), 5000); // timeout starts counting when then is executed
}).catch(function(reason) {
    // reason.message == 'Timeout'
});
```

### PromiseX.delay(ms, [value]) => {PromiseX}

non-standard  
returns a resolved Promise with given value after certain amount of time

```javascript
PromiseX.delay(5000, 'foo').then(function(value) {
    // 5 seconds later
    // value == 'foo'
});

// fancy Promise timeout
PromiseX.race([doAsync(), PromiseX.delay(100).then(function(){
    throw new Error('timeout');
})]).catch(function(reason) {
    // reason == doAsync error or timeout
});

doAsync().then(function(value) {
    return PromiseX.delay(5000, value);
}).then(function(value) {
    // value == doAsync value; 5 seconds after doAsync resolved
});
```

### PromiseX.defer => {PromiseX}

non-standard  
returns a deferred object including promise and  
resolve and reject methods to fulfill the promise  
<https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred>  
_attention:_ don't use deferred.promise; there is a `promise` property but only for internal use!

```javascript
function doAsync() {
    var deferred = PromiseX.defer(); // could also be: deferred = new Promise();
    setTimeout(function() {
        if (test) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
    }, 5000);
    return deferred;
}
doAsync().then(…)
```

### PromiseX.cast(value) => {PromiseX}

ensures to return a `PromiseX` promise  
if value is a promise, return that promise  
different to PromiseX.resolve since `cast` transforms and `resolve` gives a resolved `PromiseX`  
<http://www.wintellect.com/devcenter/nstieglitz/5-great-features-in-es6-harmony>

```javascript
// any value
PromiseX.cast('foo').then(…);

// promise
var promise = Promise.resolve();
PromiseX.cast(promise).then(…);

// PromiseX
var promise = new PromiseX();
PromiseX.cast(promise).then(…); // PromiseX.cast(promise) === promise
```

### PromiseX.all(promises) => {PromiseX}

standard  
returns a Promise that is resolved only if all promises are resolved  
or rejected if any promise of list is rejected  
resolve function gets array of promise values  
following promises can be cancelled if any promise returns a cancel promise

```javascript
PromiseX.all([doAsync1(), doAsync2()]).then(function(resolveArray) {
    var value1 = resolveArray[0];
    var value2 = resolveArray[1];
}).catch(function(reason) {
    // could be any error from doAsync1 or doAsync2
});

// fancy usecase
var requests = PromiseX.map(['content1.json', 'content2.json'], getJSON); // same as [getJSON('content1.json'), getJSON('content2.json')]
PromiseX.all(requests).then(…).catch(…);
```

### PromiseX.race(promises) => {PromiseX}

standard  
returns a Promise that is resolved as soon as one promise is resolved  
or rejected as soon as one promise of list is rejected  
following promises can be cancelled if any promise returns a cancel promise

```javascript
PromiseX.race([doAsync1(), doAsync2()]).then(function(value) {
    // value could be resolved value from doAsync1 or doAsync2 deciding on faster one
}).catch(function() {
    // could be any error from doAsync1 or doAsync2
});

// nice for timeout
PromiseX.race([doAsync(), PromiseX.delay(100).then(function(){
    throw new Error('timeout');
})]).catch(function(reason) {
    // reason == doAsync error or timeout
});
```

### PromiseX.every(promises) => {PromiseX}

non-standard  
is fulfilled only if all promises are fulfilled either resolved or rejected.  
each promise's fulfillment state and value is provided in the propagated value array  
as promise.value and promise.status  
following promises can be cancelled if any promise returns a cancel promise

```javascript
var requests = PromiseX.map(['c1.json', c2.json], getJSON); // could also be [getJSON('c1.json'), getJSON('c1.json')]
PromiseX.every(requests).then(function(resultArray) {
    resultArray.forEach(function(result) {
        if (result.status === PromiseX.RESOLVED) {
            console.log(result.value);
        } else {
            console.error(result.value);
        }
    });
}).catch(function(reason) {
    // reason could be any error during performing PromiseX.every, NOT a rejected request
});
```

### PromiseX.any(promises) => {PromiseX}

non-standard  
is fulfilled as soon as any promise is resolved or all promises are rejected  
following promises can be cancelled if any promise returns a cancel promise

```javascript
var requests = ['endpoint1', 'endpoint2'].map(function(endpoint) { // could also be [getJSON('endpoint1/a.json'), getJSON('endpoint2/a.json')];
    return getJSON(endpoint + '/a.json');
});
PromiseX.any(requests).then(function(response) {
    // response is from fastest endpoint, yeah :D
}).catch(function(reason) {
    // none of endpoints resolved
    // reason.message == 'No promises resolved successfully.'
});
```

### PromiseX.map(values, mapFunction, [context]) => {Array\<PromiseX>}

non-standard  
returns an array of `PromiseX` created from each value by the map function executed with optional context  
mapFunction is called as mapper(current, index, length, values)  
_heads-up:_ take care of errors; invalid input throws

```javascript
var requestConfig = {
    credentials: 'include'
};

var requests = PromiseX.map(['c1.json', c2.json], function(file) {
    var request = new Request('endpoint/' + file, requestConfig);
    return fetch(request).then(function(response) {             // see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
        if (response.ok === false) {
            throw new TypeError('Invalid response');
        }
        return response.json();
    });
});

// use of PromiseX promises
requests.forEach(function(promise) {
    // promise is automatically casted to PromiseX within PromiseX.map
    promise.nodeify(callback);
});

// usecase
PromiseX.every(requests).then(…).catch(…);
```

### PromiseX.reduce(values, reduceFunction, [initialValue], [context]) => {PromiseX}

non-standard  
reduces an array of promises or values to one promise chain  
reduceFunction(previous, current, index, length) is called after previous promise is resolved  
with the result of previous promise and current promise; first result is initialValue or undefined  
used in used in many Promise libraries like [BluebirdJS](http://bluebirdjs.com/docs/api/timeout.html)  
or slightly different here [promise-reduce](https://github.com/yoshuawuyts/promise-reduce)

```javascript
// simple usecase
PromiseX.reduce(['entries-10.txt', 'entries-20.txt'], function(result, file) {
    return readEntriesAsync(file).then(function(entries) {
        // entries of entries-10 is 10 and so on
        return entries + result;            // first result = 0 (initValue)
    });
}, 0).then(function(total) {
    // total == 0 + 10 + 20 = 30
});
// even simpler
PromiseX.reduce([1, 2, 3], function(total, current) {
    return total + current;
}, 0).then(function(total) {
    // total == 6
});

// example adapted from http://www.html5rocks.com/en/tutorials/es6/promises/#toc-creating-sequences
var urls = ['chapter-1.json', 'chapter-2.json', …];
var requests = PromiseX.map(urls, getJSON);         // start loading each immediately
PromiseX.reduce(requests, function(_, chapterPromise) {
    return chapterPromise.then(function(chapter) {
        addHTMLToPage(chapter.htmlContent);         // add in correct order as soon as loaded
    });
}).then(function() {
    addTextToPage("All done");
}).catch(function(err) {
    // catch any error that happened along the way
    addTextToPage("Argh, broken: " + err.message);
}).finally(function() {
    document.querySelector('.spinner').style.display = 'none';
});
```

### PromiseX.cancel(reason) => {PromiseX}

non-standard  
returning PromiseX.cancel(reason) will cancel the whole following promise chain  
cancel can be caught on PromiseX#cancelled(reason) method within a chain

```javascript
getJSON('/data').catch(function(error) {
    return PromiseX.cancel({message: 'AJAX error', error: error});
}).then(function() {
    // this function is never invoked on cancel
}).then(function() {
    // this function is never invoked on cancel
}).catch(function() {
    // this function is never invoked on cancel
}).cancelled(function(reason) {
    console.warn('cancelled', reason.message, reason.error);
});
```

### PromiseX.config(option, [value]) => {boolean|*}

non-standard  
influence behaviour of PromiseX plugin  
'getPromise' and 'setPromise' G/Setter for the underlying promise - that way you don't need to redefine global promise  
'createPromise' creates a new separate PromiseX instance with a given underlying promise

```javascript
var Bluebird = Promise.noConflict();     // if Bluebird is included
PromiseX.config('setPromise', Bluebird);
var PromiseZ = PromiseX.config('createPromise', Zousan);
assert(PromiseZ.config('getPromise') instanceof Zousan);
```

### PromiseX.CancellationError(message) => {PromiseX.CancellationError}

static error on PromiseX  
can be used to throw special error and check with 'instanceof'  
provides message and even error like stack

```javascript
getJSON('/data.json').then(function(data) {
    if (data.length === 0) {
        throw PromiseX.CancellationError('data.json is empty');
    }
    return doStuff(data);
}).then(…).catch(function(reason) {
    if (reason instanceof PromiseX.CancellationError) {
        console.error(reason);
    } else {
        // here for example getJSON errors are caught
    }
});
```

### PromiseX.TimeoutError(message) => {PromiseX.TimeoutError}

static error on PromiseX  
can be used to throw special error and check with 'instanceof'  
provides message and even error like stack

```javascript
function loadWithTimeout(url, delay) {
    return new PromiseX(function(resolve, reject) {
        setTimeout(function() {
            throw new PromiseX.TimeoutError('loadWithTimeout from ' + url);
        }, delay);
        getJSON(url).then(resolve, reject);
    });
}
loadWithTimeout('/data', 5000).catch(function(reason) {
    if (reason instanceof PromiseX.TimeoutError) {
        console.warn('timeout', reason.message);
    }
});
```

