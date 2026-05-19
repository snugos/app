// js/testRunner.js - Simple test runner for SnugOS
// Provides basic assertion framework and test discovery

const TestRunner = {
    tests: [],
    results: { passed: 0, failed: 0, errors: [] },
    
    // Register a test
    test(name, fn) {
        this.tests.push({ name, fn });
    },
    
    // Basic assertions
    assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    },
    
    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message} Expected ${expected}, got ${actual}`);
        }
    },
    
    assertDeepEqual(actual, expected, message = '') {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`${message} Objects are not equal`);
        }
    },
    
    assertTruthy(value, message = 'Expected truthy value') {
        if (!value) {
            throw new Error(message);
        }
    },
    
    assertFalsy(value, message = 'Expected falsy value') {
        if (value) {
            throw new Error(message);
        }
    },
    
    assertThrows(fn, message = 'Expected function to throw') {
        let threw = false;
        try {
            fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(message);
        }
    },
    
    // Stub factory for mocking
    stub() {
        const stubFn = (...args) => stubFn;
        stubFn.calls = [];
        stubFn.returns = (val) => { stubFn._returnValue = val; return stubFn; };
        stubFn._returnValue = undefined;
        const handler = {
            get(target, prop) {
                if (prop === 'calls') {
                    return stubFn.calls;
                }
                if (prop === 'arguments') {
                    return stubFn._lastCallArgs;
                }
                const value = target[prop];
                if (typeof value === 'function') {
                    return (...args) => {
                        stubFn.calls.push({ arguments: args });
                        stubFn._lastCallArgs = args;
                        if (stubFn._returnValue !== undefined) {
                            if (typeof stubFn._returnValue === 'object' && stubFn._returnValue !== null) {
                                return stubFn._returnValue;
                            }
                            return stubFn._returnValue;
                        }
                        return value.apply(target, args);
                    };
                }
                return value;
            },
            set(target, prop, value) {
                target[prop] = value;
                return true;
            }
        };
        return new Proxy(stubFn, handler);
    },
    
    // Run all tests
    async runAll(showNotification = null) {
        this.results = { passed: 0, failed: 0, errors: [] };
        const startTime = performance.now();
        
        console.log('[TestRunner] Running tests...');
        
        for (const test of this.tests) {
            try {
                await test.fn(this);
                this.results.passed++;
                console.log(`✓ ${test.name}`);
            } catch (e) {
                this.results.failed++;
                this.results.errors.push({ name: test.name, error: e.message });
                console.error(`✗ ${test.name}: ${e.message}`);
            }
        }
        
        const duration = (performance.now() - startTime).toFixed(2);
        const summary = `Tests: ${this.results.passed} passed, ${this.results.failed} failed (${duration}ms)`;
        console.log(`[TestRunner] ${summary}`);
        
        if (showNotification) {
            showNotification(summary, 3000);
        }
        
        return this.results;
    },
    
    // Get test count
    getTestCount() {
        return this.tests.length;
    },
    
    // Clear all tests
    clearTests() {
        this.tests = [];
        this.results = { passed: 0, failed: 0, errors: [] };
    }
};

// Export for browser console access
export async function runTests() {
    return await TestRunner.runAll(window.showNotification);
}

// Export for use in other modules
export { TestRunner };
export default TestRunner;