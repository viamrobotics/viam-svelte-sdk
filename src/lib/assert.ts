/** Assertion functions for runtime and type safety. */

export class AssertionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AssertionError';
	}
}

/**
 * Assert that a value is defined.
 *
 * @example
 * const stringify = (value: number | undefined): number => {
 *  assertExists(value)
 *  return `${value}` // TS now knows that value is of type `number`
 * }
 */
export const assertExists: <T>(value: T, message: string) => asserts value is NonNullable<T> = (
	value,
	message
) => {
	if (value === null || value === undefined) {
		throw new AssertionError(message);
	}
};
