export function setWindow(key, value) {
    if (value === undefined && typeof (key) === 'object') {
        Object.entries(key).forEach(x => setWindow(x[0], x[1]));
    }
    else if (typeof (key) === 'string') {
        window[key] = value;
    }
}
export function getWindow(key) {
    return window[key];
}
//# sourceMappingURL=Utils.js.map