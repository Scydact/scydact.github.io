var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { commands, createFlow, lineParser } from "./commands.js";
import { ClassWatcher, clearNode, createSVGNode, fixFloatError, round, setWin, SVG_DOCSTRING } from "./Utils.js";
import { render } from "./render.js";
setWin({ p: lineParser });
let NODES = {
    svg: document.createElementNS(SVG_DOCSTRING, 'svg'),
    svg_sub: createSVGNode('g', { class: 'container' }),
    ta_in: null,
    ta_meta: null,
    ta_style: null,
    buffer: document.createElement('div'),
};
let SETTINGS_NODES = {
    size: document.getElementById('size_y'),
    transparency: document.getElementById('transparency'),
};
function getSvgSize() {
    let a = NODES.svg.getBoundingClientRect();
    return [a.width, a.height];
}
//#region EXPORT AS PNG + style config
function getCss() {
    let style = NODES.ta_style.get();
    if (style.trim() !== '')
        return style;
    let defaultStyle = DEFAULT_VALUES.style;
    NODES.ta_style.set(defaultStyle);
    return defaultStyle;
}
function getDefaultCss() {
    return __awaiter(this, void 0, void 0, function* () {
        let x = yield (yield fetch('flow.css')).text();
        return x;
    });
}
function setCss(str) {
    let a = NODES.ta_style;
    if (a) {
        a.set(str);
        appendCss();
    }
}
function appendCss() {
    let stylenode = NODES.svg.getElementById('svg-style');
    if (!stylenode) {
        stylenode = document.createElementNS(SVG_DOCSTRING, 'style');
        stylenode.id = 'svg-style';
        NODES.svg.appendChild(stylenode);
    }
    stylenode.innerHTML = getCss();
}
function getSvgBlob(svg) {
    let svgString = new XMLSerializer().serializeToString(svg);
    return new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
}
function fillAlpha(ctx, bgColor) {
    // save state
    ctx.save();
    // make sure defaults are set
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none";
    // fill transparent pixels with bgColor
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // cleanup
    ctx.restore();
}
function getPngBlobAsync(svg, scale = 2, forceRemoveTransparency = false) {
    return __awaiter(this, void 0, void 0, function* () {
        //when using on another file, change hiddenBuffer to some hidden space on Document.
        // TODO: Get svg size function => [width, height];
        let size = getSvgSize().map(x => Math.round(x * scale));
        clearNode(NODES.buffer);
        let svgblob = getSvgBlob(svg);
        let canvas = document.createElement('canvas');
        NODES.buffer.appendChild(canvas);
        canvas.width = size[0];
        canvas.height = size[1];
        let ctx = canvas.getContext('2d');
        let DOMURL = self.URL;
        let url = DOMURL.createObjectURL(svgblob);
        let loadPromise = new Promise((resolve) => {
            let img = new Image();
            img.onload = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    if (!SETTINGS_NODES.transparency.checked || forceRemoveTransparency)
                        fillAlpha(ctx, 'white');
                    ctx.drawImage(img, 0, 0, size[0], size[1]);
                    yield canvas.toBlob(resolve, 'image/png');
                });
            };
            img.src = url;
        });
        return yield loadPromise;
    });
}
function downloadFile(blob, filename) {
    // SRC: https://gist.github.com/davalapar/d0a5ba7cce4bc599f54800da22926da2
    // Other browsers
    // Create a link pointing to the ObjectURL containing the blob
    const blobURL = window.URL.createObjectURL(blob);
    const tempLink = document.createElement('a');
    tempLink.style.display = 'none';
    tempLink.href = blobURL;
    tempLink.setAttribute('download', filename);
    // Safari thinks _blank anchor are pop ups. We only want to set _blank
    // target if the browser does not support the HTML5 download attribute.
    // This allows you to download files in desktop safari if pop up blocking
    // is enabled.
    if (typeof tempLink.download === 'undefined') {
        tempLink.setAttribute('target', '_blank');
    }
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    setTimeout(() => {
        // For Firefox it is necessary to delay revoking the ObjectURL
        window.URL.revokeObjectURL(blobURL);
    }, 100);
}
function copyBlobToClipboard(blob) {
    return __awaiter(this, void 0, void 0, function* () {
        yield navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    });
}
const FILENAME = 'diagrama_flujo';
function getScale() {
    let v = SETTINGS_NODES.size.value;
    let s = getSvgSize();
    return parseFloat(v) / s[1];
}
const DOWNLOADS = {
    png: () => __awaiter(void 0, void 0, void 0, function* () { return downloadFile(yield getPngBlobAsync(NODES.svg, getScale()), FILENAME + '.png'); }),
    svg: () => __awaiter(void 0, void 0, void 0, function* () { return downloadFile(getSvgBlob(NODES.svg), FILENAME + '.svg'); }),
};
const OTHER = {
    clipboard: () => __awaiter(void 0, void 0, void 0, function* () { return copyBlobToClipboard(yield getPngBlobAsync(NODES.svg, getScale(), true)); }),
    newTab: () => __awaiter(void 0, void 0, void 0, function* () {
        const blob = getSvgBlob(NODES.svg); //await getPngBlobAsync(svg, getScale());
        const blobUrl = URL.createObjectURL(blob);
        let x = window.open(blobUrl, '_blank');
        x.onbeforeunload = () => URL.revokeObjectURL(blobUrl);
    }),
};
setWin({ OTHER, DOWNLOADS });
//#endregion
//#region COOKIES
const COOKIE_NAME = 'economica-flow-v2';
const DEFAULT_VALUES = {
    style: '',
    meta: `
    round 2
    overlap SUM
    sepflow 0
    numrot auto
    width auto
    interest 3%

    `.trim().split('\n').map(x => x.trim()).join('\n'),
    data: `
    h Some flow diagram example

    % Sum of inputs on same place
    5k -200 -300 -2400
    
    % Some random flows
    -1.5k m Cookies
    -500
    +1000 m Pizza
    
    % Annuality + gradient
    a 5 -800
    t r-5
    sa 5 50
    
    
    % Move 3 without any flow
    t r3
    
    % Pay 2k
    2k
    
    % Show message
    t r-3
    m Trimester
    m without any
    m cash flow
    
    t 6
    m .
    m Gradient + Annuality
    m F = 800 - n*50
    `.trim().split('\n').map(x => x.trim()).join('\n'),
    size: 1e3,
    transparency: false,
    currentTab: 0,
};
let SAVED_VALUES;
let SAVE_COOKIES = true;
function loadCookies() {
    return __awaiter(this, void 0, void 0, function* () {
        let x = localStorage.getItem(COOKIE_NAME);
        SAVED_VALUES = Object.assign(Object.assign({}, DEFAULT_VALUES), JSON.parse(x));
        NODES.ta_in.set(SAVED_VALUES.data);
        NODES.ta_meta.set(SAVED_VALUES.meta);
        SETTINGS_NODES.size.value = SAVED_VALUES.size;
        SETTINGS_NODES.transparency.checked = SAVED_VALUES.transparency;
        setCss(SAVED_VALUES.style);
        document.querySelector('.tab')['tab']['openTab'](SAVED_VALUES.currentTab);
    });
}
function saveCookies() {
    SAVED_VALUES = {
        style: getCss(),
        data: NODES.ta_in.get(),
        meta: NODES.ta_meta.get(),
        size: parseInt(SETTINGS_NODES.size.value),
        transparency: SETTINGS_NODES.transparency.checked,
        currentTab: document.querySelector('.tab')['tab']['current'],
    };
    if (SAVE_COOKIES)
        localStorage.setItem(COOKIE_NAME, JSON.stringify(SAVED_VALUES));
}
function removeCookies() {
    localStorage.removeItem(COOKIE_NAME);
}
//#endregion
//#region ONLOAD RUN
function doRender() {
    let [data, meta] = getDataStr();
    let flow = createFlow(data, meta);
    let renderLog = render(NODES.svg_sub, NODES.svg, flow);
    clearLog();
    addLog([
        `Present value with i=${fixFloatError(flow.meta.interest * 100)}% ` +
            `is ${round(flow.pv, flow.meta.roundDigits)}`
    ]);
    addLog([...flow.log, ...renderLog]);
    //svgDebug();
}
const svgDebug = function () {
    const svg = NODES.svg;
    const texts = svg.getElementsByClassName('arrow');
    for (const txt of [...texts]) {
        const bbox = txt.getBBox();
        // const tbbox = txt.getBoundingClientRect();
        const a = {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            fill: 'red',
            opacity: 0.5,
        };
        txt.parentNode.insertBefore(createSVGNode('rect', a), txt);
    }
};
setWin({ svgDebug });
function populateCmdTable() {
    let cmds = Object.values(commands)
        .map(x => x.desc);
    let oTable = document.getElementById('commands-table');
    for (const cmd of cmds.filter(x => x[0] === 'data')) {
        let r = oTable.insertRow();
        r.insertCell().innerText = cmd[1];
        r.insertCell().innerText = cmd[2];
    }
    oTable = document.getElementById('meta-commands-table');
    for (const cmd of cmds.filter(x => x[0] === 'meta')) {
        let r = oTable.insertRow();
        r.insertCell().innerText = cmd[1];
        r.insertCell().innerText = cmd[2];
    }
}
function clearLog() {
    clearNode(document.getElementById('log'));
}
function addLog(x) {
    let l = document.getElementById('log');
    for (const t of x) {
        let o = document.createElement('li');
        o.innerText = t;
        if (t.toLowerCase().includes('error')) {
            o.classList.add('error');
        }
        if (t.toLowerCase().includes('warning')) {
            o.classList.add('warning');
        }
        l.appendChild(o);
    }
}
//#endregion
//#region Code editor stuff
function getDataStr() {
    let meta = NODES.ta_meta.get();
    let newLineNumber = NODES.ta_meta.editor.doc.size + 1;
    let data = NODES.ta_in.get();
    NODES.ta_in.editor.setOption('firstLineNumber', newLineNumber);
    return [data, meta];
}
window.addEventListener('load', () => __awaiter(void 0, void 0, void 0, function* () {
    DEFAULT_VALUES.style = yield getDefaultCss();
    populateCmdTable();
    setWin({ DEFAULT_VALUES, NODES, doRender });
    // Meta code
    {
        let a = document.createElement('textarea');
        a.id = 'txtinputmeta';
        let b = document.getElementById('container_meta');
        b.appendChild(a);
        let editor = CodeMirror.fromTextArea(a, {
            lineNumbers: true,
            mode: null,
        });
        editor.on('change', doRender);
        editor.setSize(null, 150);
        NODES.ta_meta = {
            editor,
            get: () => editor.getValue(),
            set: (x) => editor.setValue(x)
        };
        setWin({ editor });
        new ClassWatcher(b, 'disabled', null, () => editor.refresh());
    }
    // Code
    {
        let a = document.createElement('textarea');
        a.id = 'txtinput';
        document.getElementById('container_in').appendChild(a);
        let editor = CodeMirror.fromTextArea(a, {
            lineNumbers: true,
            mode: null,
        });
        editor.on('change', doRender);
        editor.setSize(null, 300);
        NODES.ta_in = {
            editor,
            get: () => editor.getValue(),
            set: (x) => editor.setValue(x),
        };
    }
    // Styles
    {
        let a = document.createElement('textarea');
        a.id = 'styleinput';
        let b = document.getElementById('container_style');
        b.appendChild(a);
        let editor = CodeMirror.fromTextArea(a, {
            lineNumbers: true,
            mode: 'css',
            tabSize: 4,
        });
        editor.on('change', appendCss);
        editor.setSize(null, 500);
        NODES.ta_style = {
            editor,
            get: () => editor.getValue(),
            set: (x) => editor.setValue(x)
        };
        new ClassWatcher(b, 'disabled', null, () => editor.refresh());
    }
    // SVG
    NODES.svg.id = 'canvas';
    NODES.svg.appendChild(NODES.svg_sub);
    document.getElementById('container_canvas').appendChild(NODES.svg);
    NODES.svg.addEventListener('click', () => {
        OTHER.clipboard();
        const a = () => NODES.svg.classList.remove('copy-click-anim');
        const b = () => NODES.svg.classList.add('copy-click-anim');
        a();
        setTimeout(b, 10);
        setTimeout(a, 3e3);
    });
    // Hidden buffer
    NODES.buffer.classList.add('hidden');
    document.body.appendChild(NODES.buffer);
    loadCookies();
    doRender();
    window.addEventListener('beforeunload', saveCookies);
}));
//# sourceMappingURL=main.js.map