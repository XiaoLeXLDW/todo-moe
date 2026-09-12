// Test host only. Native UI scheduling still requires device verification.
export function runOnUISync<Args extends unknown[], Result>(worklet: (...args: Args) => Result, ...args: Args): Result {
    return worklet(...args);
}
