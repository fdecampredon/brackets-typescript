interface TestObject {
    /**
     * Declare that n assertions should be run. t.end() will be called automatically after the nth assertion. 
     * If there are any more assertions after the nth, or after t.end() is called, they will generate errors.
     * 
     * @param n the number of assertions planned
     */
    plan(n: number): void

    /**
     * Declare the end of a test explicitly.
     */
    end(): void;
    /**
     * Generate a failing assertion 
     * @param msg message associated to the assertion
     */
    fail(msg?: string): void;
    
    /**
     * Generate a passing assertion
     * @param msg message associated to the assertion
     */
    pass(msg?: string): void;
    
    /**
     * Generate an assertion that will be skipped over.
     * @param msg message associated to the assertion
     */
    skin(msg?: string): void;
    
    /**
     * Assert that value is truthy 
     * 
     * @param value the value that should be truthy
     * @param msg an optional description message msg.
     */
    ok(value: any, msg?: string): void;
    
    /**
     * Assert that value is truthy 
     * 
     * @param value the value that should be truthy
     * @param msg an optional description message msg.
     */
    true(value: any, msg?: string): void;
    
    /**
     * Assert that value is truthy 
     * 
     * @param value the value that should be truthy
     * @param msg an optional description message msg.
     */
    assert(value: any, msg?: string): void;
    
    
    /**
     * Assert that value is falsy 
     * 
     * @param value the value that should be falsy
     * @param msg an optional description message msg.
     */
    notOk(value: any, msg?: string): void;
    
    /**
     * Assert that value is falsy 
     * 
     * @param value the value that should be falsy
     * @param msg an optional description message msg.
     */
    notok(value: any, msg?: string): void;
    
    /**
     * Assert that value is falsy 
     * 
     * @param value the value that should be falsy
     * @param msg an optional description message msg.
     */
    false(value: any, msg?: string): void;
    
    
    /**
     * Assert that err is falsy. If err is non-falsy, use its err.message as the description message.
     * 
     * @param value the value that should be falsy
     * @param msg an optional description message msg.
     */
    error(value: any, msg?: string): void;
    
    /**
     * Assert that err is falsy. If err is non-falsy, use its err.message as the description message.
     * 
     * @param value the value that should be falsy
     * @param msg an optional description message msg.
     */
    ifError(value: any, msg?: string): void;
    
    /**
     * Assert that err is falsy. If err is non-falsy, use its err.message as the description message.
     * 
     * @param value the value that should be falsy
     * @param msg an optional description message msg.
     */
    ifErr(value: any, msg?: string): void;
    
    /**
     * Assert that err is falsy. If err is non-falsy, use its err.message as the description message.
     * 
     * @param value the value that should be falsy
     * @param msg an optional description message msg.
     */
    iferror(value: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    equal(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    equals(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    isEqual(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    is(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    strictEqual(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    strictEquals(a: any, b: any, msg?: string): void;
    
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notEqual(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notEquals(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notStrictEqual(a: any, b: any, msg?: string): void;
    
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notStrictEquals(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    isNotEqual(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    isNot(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    not(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    doesNotEqual(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a === b 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    isInequal(a: any, b: any, msg?: string): void;
    
    
    /**
     * Assert that a and b have the same structure and nested values using node's deepEqual() algorithm 
     * with strict comparisons (===) on leaf nodes.
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    deepEqual(a: any, b: any, msg?: string): void;
    
    
    /**
     * Assert that a and b have the same structure and nested values using node's deepEqual() algorithm 
     * with strict comparisons (===) on leaf nodes.
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    deepEquals(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b have the same structure and nested values using node's deepEqual() algorithm 
     * with strict comparisons (===) on leaf nodes.
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    isEquivalent(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b have the same structure and nested values using node's deepEqual() algorithm 
     * with strict comparisons (===) on leaf nodes.
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    same(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with strict comparisons (===) on leaf nodes 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notDeepEqual(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with strict comparisons (===) on leaf nodes 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notEquivalent(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with strict comparisons (===) on leaf nodes 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notDeeply(a: any, b: any, msg?: string): void;
    
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with strict comparisons (===) on leaf nodes 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notSame(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with strict comparisons (===) on leaf nodes 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    isNotDeepEqual(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with strict comparisons (===) on leaf nodes 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    isNotDeeply(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with strict comparisons (===) on leaf nodes 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    isNotEquivalent(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with strict comparisons (===) on leaf nodes 
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    isInequivalent(a: any, b: any, msg?: string): void;
    
    
    /**
     * Assert that a and b have the same structure and nested values using node's deepEqual() algorithm with loose comparisons (==) 
     * on leaf nodes and an optional description msg.
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    deepLooseEqual(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b have the same structure and nested values using node's deepEqual() algorithm with loose comparisons (==) 
     * on leaf nodes and an optional description msg.
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    looseEqual(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b have the same structure and nested values using node's deepEqual() algorithm with loose comparisons (==) 
     * on leaf nodes and an optional description msg.
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    looseEquals(a: any, b: any, msg?: string): void;
    
    
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with loose comparisons (==) on leaf nodes and an optional description msg.
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notDeepLooseEqual(a: any, b: any, msg?: string): void;
    
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with loose comparisons (==) on leaf nodes and an optional description msg.
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notLooseEqual(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that a and b do not have the same structure and nested values using node's deepEqual() 
     * algorithm with loose comparisons (==) on leaf nodes and an optional description msg.
     * 
     * @param a the first value to compare
     * @param b the second value to compare
     * @param msg an optional description message msg.
     */
    notLooseEquals(a: any, b: any, msg?: string): void;
    
    /**
     * Assert that the function call fn() throws an exception.
     * 
     * @param fn the function that should throws an exception
     * @param expected the type of error expected
     * @param msg an optional description message msg.
     */
    throws(fn:() => void, expected: any, msg?: string): void;
    
    /**
     * Assert that the function call fn() does not throw an exception.
     * 
     * @param fn the function that should throws an exception
     * @param msg an optional description message msg.
     */
    doesNotThrow(fn:() => void,  msg?: string): void;
    
    
    
    /**
     * Create a subtest with a new test handle st from cb(st) inside the current test t. 
     * cb(st) will only fire when t finishes. Additional tests queued up after t will not be run until all subtests finish.
     * 
     * @param name an optional name string. 
     * @param callback fires with the new test object t once all preceeding tests have finished. Tests execute serially.
     */
    test(name: string, callback: (t: TestObject) => void): void;
    /**
     * Create a subtest with a new test handle st from cb(st) inside the current test t. 
     * cb(st) will only fire when t finishes. Additional tests queued up after t will not be run until all subtests finish.
     * 
     * @param callback fires with the new test object t once all preceeding tests have finished. Tests execute serially.
     */
    test(callback: (t: TestObject) => void): void;
}

declare module 'tape' {
    
    
    /**
     * Create a new test
     * 
     * @param name an optional name string. 
     * @param callback fires with the new test object t once all preceeding tests have finished. Tests execute serially.
     */
    function test(name: string, callback: (t: TestObject) => void): void;
    /**
     * Create a new test
     * 
     * @param callback fires with the new test object t once all preceeding tests have finished. Tests execute serially.
     */
    function test(callback: (t: TestObject) => void): void;
    
    
    module test {
        /**
         * Create a new test harness instance, which is a function like test(), but with a new pending stack and test state. By default the TAP output goes 
         * to process.stdout or console.log() if the environment doesn't have process.stdout. 
         * You can pipe the output to someplace else if you test.stream.pipe() to a destination stream on the first tick.
         */
        function createHarness(): void;
        
        
         /**
         * Like test(name, cb) except if you use .only this is the only test case that will run for the entire process, 
         * all other test cases using tape will be ignored
         * 
         * @param name an optional name string. 
         * @param callback fires with the new test object t once all preceeding tests have finished. Tests execute serially.
         */
        function only(name: string, callback: (t: TestObject) => void): void;
        /**
         * Like test(name, cb) except if you use .only this is the only test case that will run for the entire process, 
         * all other test cases using tape will be ignored
         * 
         * @param callback fires with the new test object t once all preceeding tests have finished. Tests execute serially.
         */
        function only(callback: (t: TestObject) => void): void;
    }
    
    
    
    export = test;
}



