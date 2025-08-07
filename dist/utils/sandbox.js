/**
 * Sandbox utilities for safe function execution
 */
/**
 * Create a sandboxed function from a string
 * This is a simplified version - in production, use a proper sandbox like VM2 or QuickJS
 */
export function createSandboxedFunction(code, params = ['data', 'metadata']) {
    try {
        // Create function with limited scope
        const func = new Function(...params, code);
        // Wrap in error handling
        return (...args) => {
            try {
                return func(...args);
            }
            catch (error) {
                console.error('Sandboxed function error:', error);
                throw error;
            }
        };
    }
    catch (error) {
        throw new Error(`Failed to create sandboxed function: ${error}`);
    }
}
/**
 * Validate that code is safe to execute
 */
export function validateCode(code) {
    // Check for dangerous patterns
    const dangerousPatterns = [/eval\s*\(/, /Function\s*\(/, /require\s*\(/, /import\s+/, /process\./, /global\./, /__dirname/, /__filename/, /fs\./, /child_process/];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
            return false;
        }
    }
    return true;
}
/**
 * Create a timeout wrapper for functions
 */
export function withTimeout(fn, timeoutMs) {
    return async (...args) => {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Function timeout after ${timeoutMs}ms`)), timeoutMs);
        });
        const result = await Promise.race([Promise.resolve(fn(...args)), timeoutPromise]);
        return result;
    };
}
/**
 * Create a memoized function
 */
export function memoize(fn, keyFn) {
    const cache = new Map();
    return ((...args) => {
        const key = keyFn ? keyFn(...args) : JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        // Limit cache size
        if (cache.size > 1000) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) {
                cache.delete(firstKey);
            }
        }
        return result;
    });
}
