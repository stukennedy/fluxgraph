/**
 * Sandbox utilities for safe function execution
 */
/**
 * Create a sandboxed function from a string
 * This is a simplified version - in production, use a proper sandbox like VM2 or QuickJS
 */
export declare function createSandboxedFunction(code: string, params?: string[]): Function;
/**
 * Validate that code is safe to execute
 */
export declare function validateCode(code: string): boolean;
/**
 * Create a timeout wrapper for functions
 */
export declare function withTimeout<T>(fn: (...args: any[]) => T | Promise<T>, timeoutMs: number): (...args: any[]) => Promise<T>;
/**
 * Create a memoized function
 */
export declare function memoize<T extends (...args: any[]) => any>(fn: T, keyFn?: (...args: Parameters<T>) => string): T;
//# sourceMappingURL=sandbox.d.ts.map