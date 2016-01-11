PromiseX.js
===========

Javascript Promise Xtended - Wrapper to add new methods [w/o changing the native promise prototype](https://www.nczonline.net/blog/2010/03/02/maintainable-javascript-dont-modify-objects-you-down-own/)

# Features

 * built-in defer if needed
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

Constructor  
executor should be the execution function called with optional context,  
if executor is empty the promise is a deferred with resolve and reject functions,  
if executor is a native promise the new object will be a wrapper for this promise  
every other executor is treated as PromiseX.resolve(value)

```javascript
// default use
var promise = new PromiseX(function(resolve, reject) {
	var async = doSomeAsyncStuff();
	async.onready = resolve;
	async.onerror = reject;
});

// extended
var promise = new PromiseX(function(resolve, reject, self) {
	var async = doSomeAsyncStuff();
	async.onready = resolve;
	async.onerror = reject;
	self.cancel = function() {
		reject(new Error('canceled'));
	};
});
promise.cancel();

// context
var collection = {};
collection.promise = new PromiseX(function(resolve) {
	this.resolve = function(value) {
		resolve(value);
		return this.promise;
	};
}, collection);
collection.resolve('resolved').then(…);

// PromiseX.resolve(value)
var promise = new PromiseX('resolved');

// PromiseX.defer() including resolve/reject
var promise = new PromiseX();
promise.resolve('resolved');

// PromiseX.cast() or PromiseX.resolve() for underlying promises
var nativePromise = Promise.resolve('native');
var promiseX = new PromiseX(nativePromise);
promiseX.then(…);

// status and value
var promise = PromiseX.resolve('foo'); // promise.status == 'resolved'; promise.value == 'foo'
```

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

### PromiseX#then(resolve, [reject], [context])

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

### PromiseX#catch(reject, [context])

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

### PromiseX#finally(callback, [context])

non-standard, always returns a new Promise  
defined here: <https://www.promisejs.org/api/#Promise_prototype_finally>  
callback is executed with optional context when Promise is fulfilled  
previous resolved/rejected values are propagated to next Promise  
_attention:_ this behaves exactly like try-catch-finally
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

### PromiseX#done([resolve], [reject], [context])

non-standard  
does *not* return a promise, throws outside promises on next tick  
defined here: <https://www.promisejs.org/api/#Promise_prototype_done>  
if resolve/reject is/are provided, a last Promise.then is executed with optional context

```javascript
// default use

doAsync().then(doStuff).done();

// then().done() in one
doAsync().done(doStuff);

// catch outside
try {
	PromiseX.reject(Error('reject')).done();
} catch(e) {
	// e.message == 'reject'
}
```

### PromiseX#nodeify(callback, [context])

non-standard  
transforms Promise to node-like callback - meaning: callback(error, value)  
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

### PromiseX#delay(ms)

non-standard  
used in many Promise libraries like [BluebirdJS][http://bluebirdjs.com/docs/api/promise.delay.html](http://bluebirdjs.com/docs/api/promise.delay.html)  
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

### PromiseX.resolve(value)

standard, returns a resolved Promise with given value

```javascript
PromiseX.resolve('done');
```

### PromiseX.reject(reason)

standard, returns a rejected Promise with given reason

```javascript
PromiseX.reject('fail');
```

### PromiseX.timeout()

non standard  
used in many Promise libraries like [BluebirdJS][http://bluebirdjs.com/docs/api/timeout.html](http://bluebirdjs.com/docs/api/timeout.html)  
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

### PromiseX.delay(ms, [value])

non-standard  
returns a resolved Promise with given value after certain amount of time

```javascript
PromiseX.delay(5000, 'foo').then(function(value) {
	// 5 seconds later
	// value == 'foo'
});

// fancy Promise timeout
PromiseX.race([doAsync(), PromiseX.delay(100).then(function(){
	throw new Error('timeout);
})]).catch(function(reason) {
	// reason == doAsync error or timeout
});

doAsync().then(function(value) {
	return PromiseX.delay(5000, value);
}).then(function(value) {
	// value == doAsync value; 5 seconds after doAsync resolved
});
```

### PromiseX.defer

non-standard  
returns a deferred object including promise and  
resolve and reject methods to fulfill the promise  
<https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred>

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

### PromiseX.cast(value)

ensures to return a PromiseX promise  
if value is a PromiseX, return that promise  
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

### PromiseX.all(promises)

standard  
returns a Promise that is resolved only if all promises are resolved  
or rejected if any promise of list is rejected  
resolve function gets array of promise values

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

### PromiseX.race(promises)

standard  
returns a Promise that is resolved as soon as one promise is resolved  
or rejected as soon as one promise of list is rejected  
_heads-up:_ native function is commented since some checks are missing

```javascript
PromiseX.race([doAsync1(), doAsync2()]).then(function(value) {
	// value could be resolved value from doAsync1 or doAsync2 deciding on faster one 
}).catch(function() {
	// could be any error from doAsync1 or doAsync2
});

// nice for timeout
PromiseX.race([doAsync(), PromiseX.delay(100).then(function(){
	throw new Error('timeout);
})]).catch(function(reason) {
	// reason == doAsync error or timeout
});
```

### PromiseX.every(promises)

non-standard  
is fulfilled only if all promises are fulfilled either resolved or rejected.  
each promise's fulfillment state and value is provided in the propagated value array  
as promise.value and promise.status

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

### PromiseX.any(promises)

non-standard  
is fulfilled as soon as any promise is resolved or all promises are rejected

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

### PromiseX.map(values, mapFunction, [context])

non-standard  
returns an array of PromiseX created from each value by the map function executed with optional context

```javascript
var requestConfig = {
    credentials: 'include'
};

var requests = PromiseX.map(['c1.json', c2.json], function(file) {
	var request = new Request('endpoint/' + file, requestConfig);
	return fetch(request).then(function(response) {
		return response.json();
	});
});

// use of PromiseX promises
requests.forEach(function(promise) {
	// promise is automatically casted to PromiseX within PromiseX.map
	promise.nodeify(callback);
});

// usecase
PromiseX.every(requests).then(…);
```

### PromiseX.config(option, [value])

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