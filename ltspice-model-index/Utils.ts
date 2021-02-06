export function setWindow(key, value?) {
    if (value === undefined && typeof(key) === 'object') {
        Object.entries(key).forEach(x => setWindow(x[0],x[1]));
    } else if (typeof(key) === 'string') {
        (window as any)[key] = value;
    }
}
export function getWindow(key) {
    return (window as any)[key]
}