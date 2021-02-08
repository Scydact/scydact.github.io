import { addSVGNode, clearNode, getMinMax } from "./Utils.js";
function polylinePoints(...arr) {
    return arr.map(x => x.join(',')).join(' ');
}
export function render(SVG, size, flow) {
    const [WIDTH, HEIGHT] = size;
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
                drawArrowTextNumber(text_number_parent, x0, dy, flow, time);
                drawArrowTextText(text_text_parent, x0, dy, flow, time);
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
        if (size === 0)
            return;
        let classList = ['arrow'];
        if (Math.sign(size) === -1)
            classList.push('negative-arrow');
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
            points: polylinePoints([x - arrowSize[0], y0 * (1 - size) + Math.sign(size) * arrowSize[1]], [x, y0 * (1 - size)], [x + arrowSize[0], y0 * (1 - size) + Math.sign(size) * arrowSize[1]]),
        });
    }
    function drawArrowTextNumber(text_number_parent, x, size, flow, time) {
        let textMargin = [20, 10];
        let data = flow.values[time];
        let numbers = data.filter(x => x.type === 'flowSimple');
        let result = flow.numValues[time];
        if (!result)
            return;
        let xn = x + textMargin[0];
        let yn = (HEIGHT / 2) * (1 - size) + textMargin[1];
        if (numbers.length > 1) {
            let text_anchor = (Math.sign(result) > 0) ? 'start' : 'end';
            addSVGNode(text_number_parent, 'text', {
                'text-anchor': text_anchor,
                transform: `translate(${xn},${yn}) rotate(90)`,
                class: 'text-small',
            }, `(${numbers
                .map(x => x.value.value)
                .join('+')
                .replace(/\+\-/g, '-')})`);
            addSVGNode(text_number_parent, 'text', {
                'text-anchor': text_anchor,
                transform: `translate(${xn + textMargin[0]},${yn}) rotate(90)`,
            }, result);
        }
        else {
            let msg = numbers[0].value.value.toString();
            addSVGNode(text_number_parent, 'text', {
                x: xn,
                y: yn,
                'text-anchor': 'start',
            }, msg);
        }
    }
    function drawArrowTextText(text_text_parent, x, size, flow, time) {
        let textMargin = [20, 20];
        let data = flow.values[time];
        let text = data.filter(x => x.type === 'text');
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
                }, msg.value);
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
            }, flow.meta.title);
        }
    }
    clearNode(SVG);
    const baseline = addSVGNode(SVG, 'line', {
        x1: 0,
        x2: WIDTH,
        y1: HEIGHT / 2,
        y2: HEIGHT / 2,
        class: 'baseline',
    });
    const arrowLength = 15;
    const arrowHead = addSVGNode(SVG, 'polyline', {
        points: polylinePoints([WIDTH - arrowLength, HEIGHT / 2 + arrowLength], [WIDTH, HEIGHT / 2], [WIDTH - arrowLength, HEIGHT / 2 - arrowLength]),
        class: 'baseline',
    });
    const renderGroup = {
        timeTicks: addSVGNode(SVG, 'g', { class: 'baseline' }),
        timestamps: addSVGNode(SVG, 'g', { class: 'timestamps' }),
        arrows: addSVGNode(SVG, 'g', { class: 'arrows' }),
        arrowsTextNumber: addSVGNode(SVG, 'g', { class: 'arrows-text-number' }),
        arrowsTextText: addSVGNode(SVG, 'g', { class: 'arrows-text-text' }),
        title: addSVGNode(SVG, 'g', { class: 'text-title' }),
    };
    drawDivisions(flow, renderGroup.timeTicks);
    drawTimestamps(flow, renderGroup.timestamps);
    drawArrows(flow, renderGroup.arrows, renderGroup.arrowsTextText, renderGroup.arrowsTextNumber);
    drawMeta(flow, renderGroup.title);
}
//# sourceMappingURL=render.js.map