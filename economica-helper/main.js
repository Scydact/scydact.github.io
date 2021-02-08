function updateMathContent(...s) {
    if (MathJax && MathJax.typeset) MathJax.typeset([s]);
}
function changeContent() {
    let x = document.getElementById('lorem')
    let i = Math.floor(mathstr.length * Math.random());
    x.innerHTML = '$$' + mathstr[i] + '$$';
    updateMathContent(x);
}

function setAttributes(element, attributes) {
    for (attrName in attributes) {
        let attrVal = attributes[attrName];
        element.setAttribute(attrName, attrVal);
    }
}

function createNode(element, content, attributes = {}) {
    let x = document.createElement(element);
    if (typeof (content) === 'string')
        content = document.createTextNode(content);
    if (content)
        x.appendChild(content);
    setAttributes(x, attributes);
    return x;
}

function triggerEvent(element, event) {
    if ('createEvent' in document) {
        let evt = document.createEvent('HTMLEvents');
        evt.initEvent(event, false, true);
        element.dispatchEvent(evt);
    }
    else
        element.fireEvent("onchange");
}

let GLOBAL_PARAMS = {
    digits_currency: 2,
    digits_factor: 4,
    trim_zeros_currency: 0,
    trim_zeros_factor: 0,
}

let HISTORY = {
    undoStack: [],
    redoStack: [],
    do: function (x) {
        this.undoStack.push(x);
        this.redoStack = [];
    },
    flipOldNewValues: function (a) {
        return { ...a, old: a.new, new: a.old };
    },
    undo: function () {
        let a = this.undoStack.pop();
        if (a) {
            this.redoStack.push(this.flipOldNewValues(a));
            setAttributes(a.element, a.old);
            triggerEvent(a.element, 'change');
            if (a.action) a.action();
        }
    },
    redo: function () {
        let a = this.redoStack.pop();
        if (a) {
            this.undoStack.push(this.flipOldNewValues(a));
            setAttributes(a.element, a.old);
            triggerEvent(a.element, 'change');
            if (a.action) a.action();
        }
    }
}

document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'z') {
        HISTORY.undo()
    } else if (event.ctrlKey && event.key === 'z') {
        HISTORY.redo();
    }
});

function loadOptions() {
    let a = document.getElementById('options');
    if (a) {
        // doesnt depend on mathjax, so no need to wait for it to load.
        let b = buildFormula({
            param: {
                digits_currency: { name: 'Redondeo moneda', value: GLOBAL_PARAMS.digits_currency, step: 1 },
                digits_factor: { name: 'Redondeo factores', value: GLOBAL_PARAMS.digits_factor, step: 1 },
                trim_zeros_currency: { name: 'Recortar ceros de moneda', value: GLOBAL_PARAMS.trim_zeros_currency, min: 0, max: 1 },
                trim_zeros_factor: { name: 'Recortar ceros de factores', value: GLOBAL_PARAMS.trim_zeros_factor, min: 0, max: 1 },
                global_interes: {
                    name: 'Interés global',
                    value: 10,
                    ignore: true,
                    onchange: (x) => {
                        let i_val = parseFloat(x.target.value);
                        document.querySelectorAll('[data-type="interes"]').forEach(x => x.value = i_val);
                        updateGlobal(); // since ignore:true... necesary for mathjax formulas getting the updated values.
                    },
                },
            },
            out: {
                execfunc: {
                    name: '-',
                    value: updateGlobal,
                    display: false,
                },
            },
            addToGlobalRender: false,
        });
        a.appendChild(b);
    }
}



let RENDER_FUNCTIONS = [];

function updateGlobal(params) {
    if (params !== undefined)
        for (let key in GLOBAL_PARAMS)
            if (params[key] !== undefined) GLOBAL_PARAMS[key] = Math.round(params[key]);
    for (const fx of RENDER_FUNCTIONS)
        if (typeof fx === 'function') fx({ readInputs: true, updateMath: false, });
    if (MathJax && MathJax.typeset) MathJax.typeset();
    return '-';
}

const format = (num, fraction = 2, cropZeros = true) => new Intl.NumberFormat([], {
    minimumFractionDigits: (cropZeros) ? 0 : fraction,
    maximumFractionDigits: fraction,
}).format(num);
const f$ = (n) => format(n, GLOBAL_PARAMS.digits_currency, !!GLOBAL_PARAMS.trim_zeros_currency);
const ff = (n) => format(n, GLOBAL_PARAMS.digits_factor, !!GLOBAL_PARAMS.trim_zeros_factor);
const ffe = (val) => Number.parseFloat(val.toPrecision(15));

function buildFormula(opts) {
    // let sample = 
    let w = createNode('formula');
    let { param, out, formula, addToGlobalRender = true } = opts;

    // Formula subdivs
    let tex = (formula && formula.tex) || '';
    let div_formula_static = createNode('div', tex, { class: 'formula-static' });
    let div_formula_dynamic = createNode('div', null, { class: 'formula-dynamic' });
    let div_inputs = createNode('div', null, { class: 'inputs' });
    let div_output = createNode('div', null, { class: 'output' });

    /** Functions that updates both dynamic_values and its HTML node values. */
    let dynamic_values_update = [];
    /** Stores the calculated output values. Updated by dynamic_values_update[]() */
    let dynamic_values = { _UNFORMATTED: {}, };
    /** Stores the input values. Gets updated by each <input> node.*/
    let dynamic_parameters = {};

    function updateValues() {
        for (let v of dynamic_values_update)
            v(dynamic_parameters, dynamic_values._UNFORMATTED);
    }

    let renderOpts = {
        readInputs: false,
        updateMath: true,
    }

    // Render with custom renderOpts. 
    // Used to disable updateMath, since each click event is linked to render() that redraws the math.
    function batchRender(tempOpts = renderOpts) {
        let oldOpts = renderOpts;
        renderOpts = { ...renderOpts, ...tempOpts };

        if (renderOpts.readInputs)
            div_inputs.querySelectorAll('input').forEach(element => triggerEvent(element, 'change'));

        renderOpts = oldOpts;
    }

    // Updates dynamic_values and redraws math (if opts allow it).
    function render() {
        updateValues();
        let x = formula && formula.dynamic;
        if (x) {
            let tex = formula.dynamic(dynamic_parameters, dynamic_values);
            div_formula_dynamic.innerHTML = tex;
            if (renderOpts.updateMath) updateMathContent(div_formula_dynamic);
        }
    }

    if (addToGlobalRender) RENDER_FUNCTIONS.push(batchRender);

    // Create outputs
    for (let outName in out) {
        let outSpecs = out[outName];
        let {
            name = outName,
            value = () => 0,
            display = true,
            format: formatter = (x) => x,
        } = outSpecs;

        if (display) div_output.appendChild(createNode('label', name));
        let x = createNode('input', null, {
            type: 'text',
            readonly: 'true',
        });

        x.addEventListener('click', (y) => {
            navigator.clipboard.writeText(y.target.value).then(() =>
                console.log('copied ' + y.target.value + ' to clip!'))
        });

        if (display) div_output.appendChild(x);

        dynamic_values_update.push((v, o) => {
            let newValue = value(v, o);
            let formattedVal = formatter(newValue)
            dynamic_values._UNFORMATTED[outName] = newValue;
            dynamic_values[outName] = formattedVal;
            x.value = formattedVal;
        });
    }

    // Create form and event listener from parameters
    for (let paramName in param) {
        let paramSpecs = param[paramName];
        let { name = paramName, value = 0 } = paramSpecs;

        if (!paramSpecs.ignore) dynamic_parameters[paramName] = value;

        let x = createNode('input', null, {
            type: 'text',
            oldvalue: value,
            ...paramSpecs,
        });
        if (!paramSpecs.ignore) // ignored == does not add to paramName and does not update.
            x.addEventListener('change', (y) => {
                let x = y.target;
                let ov = x.getAttribute('oldvalue');
                try {
                    let a = math.evaluate(x.value.replace(/,/g,''));
                    if (isNaN(a)) throw new Error('Not a number!');
                    x.value = a;
                    x.setAttribute('oldvalue', a);
                    dynamic_parameters[paramName] = a;
                    HISTORY.do({
                        element: x,
                        new: { value: a, oldvalue: a },
                        old: { value: ov, oldvalue: ov },
                        // action: render(),
                    });
                    render();
                }
                catch {
                    x.value = ov;
                }
            })
        if (paramSpecs.onchange) x.addEventListener('change', paramSpecs.onchange);

        div_inputs.appendChild(createNode('label', name));
        div_inputs.appendChild(x);
    }

    // Append and return
    w.appendChild(div_formula_static);
    w.appendChild(div_inputs);
    w.appendChild(div_output);
    w.appendChild(div_formula_dynamic);

    // Call render once after all dynamic_parameters have been set.
    updateMathContent(div_formula_static);
    render();

    return w;
}

function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}
function insertBefore(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode);
}

function tryFindPARate(P, A, n, itermax = 512) {
    let PA = P / A;
    let console = { log: () => { }, table: () => { } };
    console.log('P/A=' + PA);

    if (n === 0 || n === -1) {
        console.log('Case n=0, P/A = 0 (invalid)');
        return [NaN];
    }
    if (n === 1) {
        console.log('Case n=1, u=A/P');
        return [A / P - 1];
    }
    if (n === 2) {
        console.log('Case n=2, cuadratic formula');
        let det = 4 * PA + 1;
        let s = Math.sqrt(det);
        let denum = 2 * PA
        return (s === 0) ? [1 / denum - 1] : [(1 + s) / denum - 1, (1 - s) / denum - 1];
    }
    if (n === 0.5) {
        console.log('Case n=0.5, cuadratic formula');
        let det = (PA + 4) / PA;
        let s = Math.sqrt(det);
        let extra = 2 / PA + 1;
        return (s === 0) ? [1 / PA - 0.5] : [0.5 * (-s + extra) - 1, 0.5 * (s + extra) - 1];
    }
    if (n === -2) {
        console.log('Case n=-2, lineal formula');
        return [-PA - 1 - 1];
    }
    if (n === -3) {
        console.log('Case n=-3, cuadratic formula');
        let det = -4 * PA - 3;
        let s = Math.sqrt(det);
        return (s === 0) ? [-1.5] : [0.5 * (-s - 1) - 1, 0.5 * (s - 1) - 1];
    }
    if (n === PA) {
        console.log('Case n=P/A, i=0%');
        return [0];
    }
    if (PA === 0 && n % 2 === 0) {
        console.log('Case C=0, n=even; i=-200%');
        return [-2];
    }
    if (PA < -1 && n % 2 === 0) {
        console.log('Case C=negative, n=even; i=NaN');
        return [];
    }

    let a = (u) => (u ** (-n) - 1) / (1 - u) - PA;
    //Using derivate() or a/da makes this process more prone to floating point errors.
    //let da = (u) => (-n * u ** (-n - 1) + (n + 1) * u ** (-n) - 1) / (1 - u) ** 2;
    //let a_over_da = (x) => a(x)/da(x);
    //let a_over_da = (x) => ((x-1)*x*((PA*(x+1)-1)*(x**n)+1))/(x*(x**n-1)+n*(x-1)+n);
    let a_over_da = (u) => ((u ** (-n) - 1) * (1 - u) - PA * (1 - u) ** 2) / (-n * u ** (-n - 1) + (n + 1) * u ** (-n) - 1);

    let u_list = [1 / PA, -1, -0.6, 0.6, 0.9, 1.05, 1.5];
    let responses = [];
    let ans = [];

    let amountOfResults = (n % 2 === 1) ? 1 : 2;

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }
    function isEqual(u, array) {
        return array[0] === u && array.every(val => val === array[0]);
    }
    function tryPush(x) {
        if (ans.length === 0 || ans[0] !== x) {
            ans.push(x);
            return true;
        }
        return false;
    }

    return newtonApproximate_a_over_da(a_over_da, u_list, itermax, amountOfResults);
}


//#region Funky maths
function getNumberParts(x) {
    var float = new Float64Array(1),
        bytes = new Uint8Array(float.buffer);

    float[0] = x;

    var sign = bytes[7] >> 7,
        exponent = ((bytes[7] & 0x7f) << 4 | bytes[6] >> 4) - 0x3ff;

    bytes[7] = 0x3f;
    bytes[6] |= 0xf0;

    return {
        sign: sign,
        exponent: exponent,
        mantissa: float[0],
    }
}

function fromNumberParts(obj) {
    let { sign, exponent, mantissa } = obj;
    return (sign) ? -mantissa * 2 ** exponent : mantissa * 2 ** exponent;
}

function minimalEpsilon(x, thres = 1) {
    return Number.EPSILON * 2 ** (getNumberParts(x).exponent + thres);
}

function derivate(fn, x, thres = 20) {
    let h = minimalEpsilon(x, thres);
    return (fn(x + h) - fn(x)) / h;
}

function isContinuous(fn, x) {
    return (limit(fn, x, -1) === limit(fn, x, 1));
}

function limit(fn, x, side = 0, thres = 15) {
    let a = fn(x);
    if (isFinite(a)) return a;

    let dx = minimalEpsilon(x, thres);
    if (side === 0) {
        let a = limit(fn, x, -1, thres);
        let b = limit(fn, x, 1, thres);
        if (isNaN(a)) return b; // a is NaN... b might or might not be NaN.
        else if (isNaN(b)) return a; // a is a number, but b is NaN, so a is limit.
        // else if (thres < maxIter && Math.abs(a / b - 1) > 1e-10) { return limit(fn, x, 0, thres + 1); }// flat limit
        else { return 0.5 * (a + b); } // correct stuff
    } else {
        return fn(x + side * dx);
    }
}


function newtonApproximate_a_over_da(a_over_da, initvalues = [-2, -1, -0.5, 0, 0.5, 1, 2], maxIterations = 512, maxValues = Infinity, cacheSize = 3) {
    let ans = [];
    let responses = [];
    let console = { log: () => { }, table: () => { } };

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }
    function isEqual(u, array) {
        return array[0] === u && array.every(val => val === array[0]);
    }
    function tryPush(x) {
        if (ans.length === 0 || ans[0] !== ffe(x)) {
            ans.push(ffe(x));
            return true;
        }
        return false;
    }

    for (let u_init of initvalues) {
        if (ans.length === maxValues) break;
        let u = u_init;
        let u_before = new Array(cacheSize);
        let found = false;

        let i = 0;
        while (i < maxIterations) {
            u = u - a_over_da(u);
            if (!isFinite(u)) {
                responses.push({ initial: u_init, iteration: i, value: u - 1 });
                found = true;
                break;
            }
            if (isEqual(u, u_before)) {
                tryPush(u - 1);
                responses.push({ initial: u_init, iteration: i, value: u - 1 });
                found = true;
                break;
            }
            u_before = [...u_before.slice(2), u];
            ++i;
        }
        if (!found) {
            if (u > 1e140) u = Infinity;
            if (u < -1e140) u = -Infinity;
            if (isFinite(u)) tryPush(u - 1);
            responses.push({ initial: u_init, iteration: i, value: u - 1 });
        }
    }
    console.table(
        responses
        //.filter(x => isFinite(x.value))
        //.sort((a, b) => a.iteration - b.iteration)
    );
    return ans;
}

function newtonApproximate(fn, initvalues, maxIterations, maxValues, cacheSize) {
    return newtonApproximate_a_over_da(
        (u) => fn(u) / derivate(fn, u),
        initvalues, maxIterations, maxValues, cacheSize);
}

//#endregion

//#region Init stuff
function createFormulaBlocks() {
    let blocks = document.getElementsByClassName('buildformula');
    for (let block of blocks) {
        let txt = block.innerText
            .split('\n')
            .map(x => x.trim())
            .join('');
        let fn = new Function(`return ${txt}`);
        let opts = fn();
        let y = buildFormula(opts);
        insertBefore(block, y);
        block.innerHTML = '';
    }
}

function init() {
    loadOptions();
    createFormulaBlocks();
}

window.addEventListener('load', init)


//#endregion