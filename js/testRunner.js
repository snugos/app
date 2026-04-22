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

// Export for use in other modules
export { TestRunner };
export default TestRunner;