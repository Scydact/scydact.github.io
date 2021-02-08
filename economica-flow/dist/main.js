var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { lineParser } from "./commands.js";
import { ClassWatcher, clearNode, createSVGNode, setWin, SVG_DOCSTRING } from "./Utils.js";
import { render, processInputOld } from "./render.js";
setWin({ p: lineParser });
let NODES = {
    svg: document.createElementNS(SVG_DOCSTRING, 'svg'),
    svg_sub: createSVGNode('g', { class: 'container' }),
    ta_in: document.createElement('textarea'),
    ta_style: null,
    buffer: document.createElement('div'),
};
let SETTINGS_NODES = {
    size: document.getElementById('size_y'),
    transparency: document.getElementById('transparency'),
};
let [WIDTH, HEIGHT] = [700, 400];
{
    let [dx, dy] = [WIDTH, HEIGHT].map(x => 0.1 * x);
    let a = [-dx, -dy - 10, WIDTH + 2 * dx, HEIGHT + 2 * dy];
    NODES.svg.setAttribute('viewBox', a.join(' '));
}
//#region EXPORT AS PNG + style config
function getCss() {
    let style = NODES.ta_style.doc.getValue();
    console.log(style);
    if (style.trim() !== '')
        return style;
    let defaultStyle = DEFAULT_VALUES.style;
    NODES.ta_style.setValue(defaultStyle);
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
    console.log(a);
    if (a) {
        a.setValue(str);
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
        let size = [WIDTH, HEIGHT].map(x => Math.round(x * scale));
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
    return parseFloat(v) / HEIGHT;
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
//#endregion
//#region COOKIES
const COOKIE_NAME = 'economica-flow-v0';
const DEFAULT_VALUES = {
    style: '',
    data: `
    h Flujo

    5000 -200 -300 -2400
    -1500 m Cookies
    -500 
    +1000 m Pizza
    -800
    -800

    % Mover 3 sin pagar
    tr 3
    1500

    t 7
    m Trimestre
    ma sin pagar
    `.trim().split('\n').map(x => x.trim()).join('\n'),
    size: HEIGHT * 3,
    transparency: false,
};
let SAVED_VALUES;
let SAVE_COOKIES = true;
function loadCookies() {
    return __awaiter(this, void 0, void 0, function* () {
        let x = localStorage.getItem(COOKIE_NAME);
        SAVED_VALUES = Object.assign(Object.assign({}, DEFAULT_VALUES), JSON.parse(x));
        NODES.ta_in.value = SAVED_VALUES.data;
        SETTINGS_NODES.size.value = SAVED_VALUES.size;
        SETTINGS_NODES.transparency.checked = SAVED_VALUES.transparency;
        setCss(SAVED_VALUES.style);
    });
}
function saveCookies() {
    SAVED_VALUES = {
        style: getCss(),
        data: NODES.ta_in.value,
        size: parseInt(SETTINGS_NODES.size.value),
        transparency: SETTINGS_NODES.transparency.checked,
    };
    if (SAVE_COOKIES)
        localStorage.setItem(COOKIE_NAME, JSON.stringify(SAVED_VALUES));
}
function removeCookies() {
    localStorage.removeItem(COOKIE_NAME);
}
//#endregion
//#region ONLOAD RUN
function doRender(data) {
    if (!data)
        data = NODES.ta_in.value;
    let flow = processInputOld(data);
    render(NODES.svg_sub, [WIDTH, HEIGHT], flow);
}
window.addEventListener('load', () => __awaiter(void 0, void 0, void 0, function* () {
    DEFAULT_VALUES.style = yield getDefaultCss();
    setWin({ DEFAULT_VALUES, doRender });
    // Code
    NODES.ta_in.id = 'txtinput';
    document.getElementById('container_in').appendChild(NODES.ta_in);
    NODES.ta_in.addEventListener('input', (x) => doRender(x.target.value));
    // Styles
    let a = document.createElement('textarea');
    a.id = 'styleinput';
    let b = document.getElementById('container_style');
    b.appendChild(a);
    var editor = CodeMirror.fromTextArea(a, {
        lineNumbers: true,
        mode: 'css',
    });
    editor.on('change', appendCss);
    editor.setSize(null, 500);
    NODES.ta_style = editor;
    setWin({ editor });
    new ClassWatcher(b, 'disabled', null, () => editor.refresh());
    // SVG
    NODES.svg.id = 'canvas';
    NODES.svg.appendChild(NODES.svg_sub);
    document.getElementById('container_canvas').appendChild(NODES.svg);
    // Hidden buffer
    NODES.buffer.classList.add('hidden');
    document.body.appendChild(NODES.buffer);
    loadCookies();
    doRender();
    window.addEventListener('beforeunload', saveCookies);
}));
//# sourceMappingURL=main.js.map