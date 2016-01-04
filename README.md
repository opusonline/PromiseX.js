EventEmitter.js
===============

Javascript EventEmitter. The best you'll get ^^

This library supports:
* on: multiple events, event namespaces, multiple listeners, listeners with context
* off: all, multiple events, event namespaces, multiple listeners, listeners with context
* emit: multiple events, event namespaces
* listeners: multiple events, namespaces, all at once
* newListener/removeListener events
* chainable
* includes inherit method and noConflict
* amd and node support

#Support

Minimum IE 9, Chrome 5, Firefox 4, Opera 10.5, Safari 5, Mobile browsers, Node

For older browser support, a `compatible` version is added.

#Install

* Install with [Bower](http://bower.io): `bower install opusonline-eventemitter.js`
* Install with [NPM](https://www.npmjs.org/): `npm install opusonline-eventemitter.js`

#Usage

###Example

```javascript
function Foo() {
	EventEmitter.call(this);
}

EventEmitter.inherits(Foo);
// in node you could also use require('util').inherits(Foo, EventEmitter);

Foo.prototype.bar = function() {
	this.emit('bar');
};

var foo = new Foo();
foo.on('bar', function() {
	console.log('Yeah, it works!');
});
foo.bar();
```

Some Highlights:

```javascript
var ee = EventEmitter.noConflict(); // no conflict to other EventEmitter implementations

foo.on(['foo', 'bar'], listener1, [listener2, myContext]); // multiple events, multiple listener, listeners context

foo
	.on('newListener', function(event, ee) { // newListener event
		console.log(ee.listener);
	})
	.on('foo.bar', something); // chaining, namespaces

foo.emit(['foo', 'pow'], arg1, arg2); // emit multiple events at once

foo.off('.bar'); // namespaces
```
##Methods

###noConflict

```javascript
var ee = EventEmitter.noConflict();
```

###inherits

Build in `inherits` method. In node you can use util.inherits(ctor, EventEmitter) instead or the build in method.

```javascript
function Foo() {
	EventEmitter.call(this);
}
EventEmitter.inherits(Foo);
```

###on (alias: addListener)

```javascript
var ee = new EventEmitter();
ee.on('go', go); // normal
ee.on(['go', 'foo'], go); // multiple events
ee.on(['go', 'foo'], go, foo); // multiple events, multiple listeners
ee.on('go.now', go); // namespace
ee.on('go.now', go, goFurther); // namespace, multiple listeners
ee.on(['go.now', 'foo'], go, goFurther); // multiple events including namespace, multiple listeners
ee.on('go', [go, person]); // listeners context
ee.on('go', go.bind(person)); // listeners context in native way
```

###once

Includes all possible parameters like `on`. The event `removeListener` is called *after* execution.

```javascript
var ee = new EventEmitter();
ee.once('go', go);
```

###off (alias: removeListener, removeAllListeners)

```javascript
var ee = new EventEmitter();
ee.off(); // same as ee.removeAllListeners();
ee.off('go'); // same as ee.removeAllListeners('go');
ee.off('go', go); // same as ee.removeListener('go', go);
ee.off(['go', 'foo'], go); // same listener on multiple events
ee.off('go', go, foo); // multiple listeners
ee.off('go.now', go); // namespace
ee.off('.now', go); // namespace and listener
ee.off('.now'); // all listener from event namespace
ee.off('go', [go, person]); // remove listener with according context
```

###emit

```javascript
var ee = new EventEmitter();
ee.emit('go', now);
ee.emit('go'); // without arguments
ee.emit('go.now'); // namespace
ee.emit(['go', 'foo'], now); // multiple events
```

###listeners

```javascript
var ee = new EventEmitter();
ee.listeners(); // all existing listeners
ee.listeners('go'); // normal
ee.listeners('go', 'foo'); // multiple events
ee.listeners('.now'); // namespace
```

###newListener, removeListener events

`newListener` is always fired *after* added to list of events. `removeListener` is always fired *before* removing from list of events.
`ee` is an object containing `listener, context, namespaces, once`.

```javascript
var ee = new EventEmitter();
ee.on('newListener', function(event, ee) {
	console.log(event, ee.listener);
});
ee.on('removeListener', function(event, ee) {
	console.log(event, ee.listener);
});
```
