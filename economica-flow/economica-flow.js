let svg = document.getElementById('canvas');
let textarea = document.getElementById('txtinput');

const SVG = 'http://www.w3.org/2000/svg';
const [WIDTH, HEIGHT] = [700, 400];
{
    let [dx, dy] = [WIDTH, HEIGHT].map(x => 0.1 * x);
    let a = [-dx, -dy - 10, WIDTH + 2 * dx, HEIGHT + 2 * dy];
    svg.setAttribute('viewBox', a.join(' '));
}

function createNodeNS(NS, element, content, attributes = {}) {
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
function createSVGNode(element, attributes, content) {
    return createNodeNS(SVG, element, content, attributes);
}
function addSVGNode(parent, element, attributes, content) {
    let x = createSVGNode(element, attributes, content);
    parent.appendChild(x);
    return x;
}
function clearNode(node) {
    while (node.firstChild)
        node.removeChild(node.firstChild);
}

function getMinMax(arr) {
    let [min, max] = [Infinity, -Infinity];
    for (let x of arr) {
        if (x < min) min = x;
        if (x > max) max = x;
    }
    return [min, max];
}
function polylinePoints(...arr) {
    return arr.map(x => x.join(',')).join(' ');
}

function processInput(str) {
    let lines = str.trim().split('\n').map(x => x.trim().split(' '));

    // first pass - register all commands
    let values = {};
    let current_t = 0;
    let others = {
        title: '',
    }
    function pushVal(x) {
        if (values[current_t] === undefined) values[current_t] = [];
        values[current_t].push(x);
    }

    for (let line of lines) {
        if (!line.length || !line[0].length || line[0][0] === '%') continue;
        let modLine = null;
        let nextLn = line;
        do {
            modLine = nextLn;
            let s = modLine[0].toLowerCase();
            nextLn = modLine.slice(1);
            // case: number:
            if (!isNaN(s)) {
                pushVal(parseFloat(s));
                if (!nextLn.length) ++current_t;
            }
            else if (s === 't') {
                current_t = (line[1] || 0) - 1; //line[1] is string...
                nextLn = modLine.slice(2);
                if (!nextLn.length) ++current_t;
            }
            else if (s === 'tr') {
                current_t += (line[1] || 0) - 1; //line[1] is string...
                nextLn = modLine.slice(2);
                if (!nextLn.length) ++current_t;
            }
            else if (s === 'm') {
                pushVal(nextLn.join(' ').toString());
                ++current_t;
                break;
            } else if (s === 'ma') {
                --current_t;
                pushVal(nextLn.join(' ').toString());
                ++current_t;
                break;
            }
            else if (s === 'h') {
                others.title = nextLn.join(' ').toString();
                break;
            }

        } while (nextLn.length)
    }


    // set as an array
    let keys = Object.keys(values).map(x => parseInt(x)).sort((a, b) => a - b);
    let minVal = keys[0];
    let maxVal = keys[keys.length - 1];
    let numValues = {}
    for (let key in values)
        numValues[key] = values[key].filter(x => typeof (x) === 'number').reduce((p, c) => p + c, 0)

    let w = window;
    w.x = {
        keys: keys,
        values: values,
        numValues: numValues,
        start: minVal,
        end: maxVal,
        meta: others,
    };
    return w.x;
}



function drawDivisions(flow, parent) {
    let n = flow.end - flow.start + 1;
    let d = WIDTH / n;
    let periodSize = 6;
    for (let i = 0; i < n; ++i) {
        addSVGNode(parent, 'line', {
            x1: d * i,
            x2: d * i,
            y1: HEIGHT / 2 - periodSize,
            y2: HEIGHT / 2 + periodSize,
        });
    }
}

function drawTimestamps(flow, parent) {
    let n = flow.end - flow.start + 1;
    let d = WIDTH / n;
    let [dx, dy] = [10, 20];

    for (let i = 0; i < n; ++i) {
        let j = flow.keys[i];
        addSVGNode(parent, 'text', {
            x: d * i + dx,
            y: HEIGHT / 2 + dy,
        }, i + flow.start);
    }
}

function drawArrows(flow, parent, text_text_parent, text_number_parent) {
    let n = flow.end - flow.start + 1;
    let dx = WIDTH / n;
    let [min, max] = getMinMax(Object.values(flow.numValues).flat());
    let abs = Math.max(Math.abs(min), Math.abs(max));
    let minSize = 0.1;
    let arrow_dx = 10;

    for (let i = 0; i < n; ++i) {
        let time = i + flow.start;
        if (flow.values[time]) {
            let value = flow.numValues[time];
            // let numValues = values.filter(x => typeof (x) !== 'string');

            let x0 = dx * i;
            let dy = Math.sign(value) * Math.max(minSize, Math.abs(value) / abs);
            drawArrow(parent, x0, dy);
            drawArrowTextNumber(
                text_number_parent,
                x0,
                dy,
                flow,
                time
            );
            drawArrowTextText(
                text_text_parent,
                x0,
                dy,
                flow,
                time
            );
            // let x0 = dx * time - 0.5 * arrow_dx * (numValues.length - 1);

            // for (let j = 0; j < numValues.length; ++j) {
            //     let value = numValues[j];
            //     if (typeof(value) === 'number') {
            //         let dy = Math.sign(value) * Math.max(minSize, Math.abs(value) / abs);
            //         drawArrow(parent, x0 + j * arrow_dx, dy);
            //     }
            // }
        }
    }
}
function drawArrow(parent, x, size) {
    if (size === 0) return;

    let classList = ['arrow'];
    if (Math.sign(size) === -1) classList.push('negative-arrow');

    let g = addSVGNode(parent, 'g', { class: classList.join(' ') });

    let y0 = HEIGHT / 2;
    let arrowSize = [10, 15];
    addSVGNode(g, 'line', {
        x1: x,
        x2: x,
        y1: y0,
        y2: y0 * (1 - size),
    });
    addSVGNode(g, 'polyline', {
        points: polylinePoints(
            [x - arrowSize[0], y0 * (1 - size) + Math.sign(size) * arrowSize[1]],
            [x, y0 * (1 - size)],
            [x + arrowSize[0], y0 * (1 - size) + Math.sign(size) * arrowSize[1]],
        ),
    });
}

function drawArrowTextNumber(text_number_parent, x, size, flow, time) {
    let textMargin = [20, 10];

    let data = flow.values[time];
    let numbers = data.filter(x => (typeof (x) === 'number'));
    let result = flow.numValues[time];
    if (!result) return;

    let xn = x + textMargin[0];
    let yn = (HEIGHT / 2) * (1 - size) + textMargin[1];

    if (numbers.length > 1) {
        let msg = numbers.join('+').replaceAll('+-', '-') + '=' + result;
        let opts = {
            'text-anchor': (Math.sign(result) > 0) ? 'start' : 'end',
            transform: `translate(${xn},${yn}) rotate(90)`,
        }
        addSVGNode(text_number_parent, 'text', opts, msg)

    } else {
        let msg = numbers[0].toString();
        addSVGNode(text_number_parent, 'text', {
            x: xn,
            y: yn,
            'text-anchor': 'start',
        }, msg)
    }
}

function drawArrowTextText(text_text_parent, x, size, flow, time) {
    let textMargin = [20, 20];

    let data = flow.values[time];
    let text = data.filter(x => typeof (x) === 'string');
    let direction = Math.sign(size) || 1;

    let calcYn = (direction === 1) ?
        (line) => (HEIGHT / 2) + line * textMargin[1] :
        (line) => (HEIGHT / 2) - (text.length - line + 2) * textMargin[1];

    let line = 2;

    if (text.length) {
        for (let msg of text) {
            let xn = x;
            let yn = calcYn(line);
            addSVGNode(text_text_parent, 'text', {
                x: xn,
                y: yn,
                'text-anchor': 'middle',
            }, msg)
            line++;
        }
    }
}

function drawMeta(flow, parent) {
    if (flow.meta.title !== '') {
        addSVGNode(parent, 'text', {
            x: WIDTH / 2,
            y: -15,
            'text-anchor': 'middle',
        }, flow.meta.title)
    }
}

function render(data = textarea.value) {
    let flow = processInput(data);
    for (let x in renderGroup)
        clearNode(renderGroup[x]);

    drawDivisions(flow, renderGroup.timeTicks);
    drawTimestamps(flow, renderGroup.timestamps);
    drawArrows(
        flow,
        renderGroup.arrows,
        renderGroup.arrowsTextText,
        renderGroup.arrowsTextNumber
    );
    drawMeta(flow, renderGroup.title);
}

async function getCss() {
    return await (await fetch('style.css')).text()
}
async function appendCss() {
    let stylenode = svg.getElementById('svg-style');
    if (!stylenode) {
        stylenode = document.createElementNS(SVG,'style');
        svg.appendChild(stylenode);
    }
    stylenode.innerHTML = await getCss();
}
async function getPng() {
    await appendCss();
    let svgString = new XMLSerializer().serializeToString(svg);
    let canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.width = 2*WIDTH;
    canvas.height = 2*HEIGHT;
    let ctx = canvas.getContext('2d');
    let DOMURL = self.URL || self.webkitURL || self;
    let img = new Image();
    let svgblob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    let url = DOMURL.createObjectURL(svgblob);
    img.onload = function() {
        ctx.drawImage(img, 0, 0, 2*WIDTH, 2*HEIGHT);
        let png = canvas.toDataURL('image/png');
        let pngtag = document.createElement('img');
        pngtag.src = png;
        document.body.appendChild(pngtag);
        DOMURL.revokeObjectURL(png);
    }
    img.src = url;
}


// Basic draw
let baseline = addSVGNode(svg, 'line', {
    x1: 0,
    x2: WIDTH,
    y1: HEIGHT / 2,
    y2: HEIGHT / 2,
    class: 'baseline',
});

let arrowLength = 15;
let arrowHead = addSVGNode(svg, 'polyline', {
    points: polylinePoints(
        [WIDTH - arrowLength, HEIGHT / 2 + arrowLength],
        [WIDTH, HEIGHT / 2],
        [WIDTH - arrowLength, HEIGHT / 2 - arrowLength]
    ),
    class: 'baseline',
})
let renderGroup = {
    timeTicks: addSVGNode(svg, 'g', { class: 'baseline' }),
    timestamps: addSVGNode(svg, 'g', { class: 'timestamps' }),
    arrows: addSVGNode(svg, 'g', { class: 'arrows' }),
    arrowsTextNumber: addSVGNode(svg, 'g', { class: 'arrows-text-number' }),
    arrowsTextText: addSVGNode(svg, 'g', { class: 'arrows-text-text' }),
    title: addSVGNode(svg, 'g', { class: 'text-title' }),
}

// First render
render();
textarea.addEventListener('input', (x) => render(x.target.value));