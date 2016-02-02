/**
 * Promises/A+ Compliance Test for PromiseX
 */
var promisesAplusTests = require("promises-aplus-tests");
var PromiseX = require("../src/PromiseX.js");

var adapter = {
    deferred: function () {
        var p = new PromiseX();
        return {
            promise: p,
            resolve: p.resolve,
            reject: p.reject
        }
    }
};

promisesAplusTests(adapter, function (err) {
    if (err)
        console.log("Test FAILED: " + err);
    else
        console.log("Test Complete. All tests PASSED");
});
