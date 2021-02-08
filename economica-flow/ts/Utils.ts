
export const SVG_DOCSTRING = 'http://www.w3.org/2000/svg';
export function setWin(params) {
    let w = window as any;
    for (const key in params) {
        const val = params[key];
        window[key] = val;
    }
}

export function createNodeNS(NS, element, content?, attributes = {}) {
    let x = document.createElementNS(NS, element);
    if (content !== undefined && typeof (content) !== 'object')
        content = document.createTextNode(content);
    if (content)
        x.appendChild(content);
    for (let attrName in attributes) {
        let attrVal = attributes[attrName];
        x.setAttribute(attrName, attrVal);
    }
    return x;
}
export function createSVGNode(element, attributes, content?) {
    return createNodeNS(SVG_DOCSTRING, element, content, attributes);
}
export function addSVGNode(parent, element, attributes, content?) {
    let x = createSVGNode(element, attributes, content);
    parent.appendChild(x);
    return x;
}
export function clearNode(node) {
    while (node.firstChild)
        node.removeChild(node.firstChild);
}

export function getMinMax(arr: number[]) {
    let [min, max] = [Infinity, -Infinity];
    for (let x of arr) {
        if (x < min) min = x;
        if (x > max) max = x;
    }
    return [min, max];
}

export const PF = (n, i) => (1 + i) ** -n;

export const fixFloatError = (val: number) => Number.parseFloat(val.toPrecision(15));
export const round = (num: number, digits = 0) => Number.parseFloat(num.toFixed(digits));
export class ClassWatcher {
    targetNode: HTMLElement;
    classToWatch: string;
    classAddedCallback: Function;
    classRemovedCallback: Function;
    observer: any;
    lastClassState: boolean;

    constructor(targetNode, classToWatch, classAddedCallback, classRemovedCallback) {
        this.targetNode = targetNode
        this.classToWatch = classToWatch
        this.classAddedCallback = classAddedCallback
        this.classRemovedCallback = classRemovedCallback
        this.observer = null
        this.lastClassState = targetNode.classList.contains(this.classToWatch)

        this.init()
    }

    init() {
        this.observer = new MutationObserver(this.mutationCallback)
        this.observe()
    }

    observe() {
        this.observer.observe(this.targetNode, { attributes: true })
    }

    disconnect() {
        this.observer.disconnect()
    }

    mutationCallback = mutationsList => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                let currentClassState = mutation.target.classList.contains(this.classToWatch)
                if (this.lastClassState !== currentClassState) {
                    this.lastClassState = currentClassState
                    if (currentClassState) {
                        if (this.classAddedCallback) this.classAddedCallback();
                    }
                    else {
                        if (this.classRemovedCallback) this.classRemovedCallback();
                    }
                }
            }
        }
    }
}