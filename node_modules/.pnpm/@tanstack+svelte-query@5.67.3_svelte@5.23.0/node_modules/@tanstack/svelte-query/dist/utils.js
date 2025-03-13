export function isSvelteStore(obj) {
    return 'subscribe' in obj && typeof obj.subscribe === 'function';
}
export function noop() { }
