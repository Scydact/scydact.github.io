import { addSVGNode, clearNode, getMinMax, round } from "./Utils.js";
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
        //let [dx, dy] = [10, 20];
        for (let i = 0; i < n; ++i) {
            let j = flow.keys[i];
            addSVGNode(parent, 'text', {
                x: d * i,
                y: HEIGHT / 2,
            }, i + flow.start);
        }
    }
    function drawArrows(flow, parent, text_text_parent) {
        let n = flow.end - flow.start + 1;
        let dx = WIDTH / n;
        let doOverlap = flow.meta.overlapBehaviour === 'sum';
        let sepFlow = flow.meta.sepFlows;
        if (sepFlow) {
            var [min, max] = getMinMax(Object.values(flow.numBiValues).flat());
        }
        else {
            var [min, max] = getMinMax(Object.values(flow.numValues));
        }
        let abs = Math.max(Math.abs(min), Math.abs(max));
        let minSize = 0.1;
        let arrow_dx = 10;
        for (let i = 0; i < n; ++i) {
            let time = i + flow.start;
            let x0 = dx * i;
            if (!flow.values[time])
                continue;
            // Filter numbers only
            let v = Object.values(flow.values[time])
                .filter(x => x.type === 'flowSimple')
                .map(x => x.value.value);
            // Do 2 arrows if sepFlows is true, else just 1 arrow.
            let values = [];
            if (flow.meta.sepFlows) {
                values = [
                    v.filter(x => x < 0),
                    v.filter(x => x >= 0),
                ];
            }
            else {
                values = [v];
            }
            // let numValues = values.filter(x => typeof (x) !== 'string');
            // Draw arrows (be 1 or 2)
            for (const value of values) {
                let v_reduce = value.reduce((p, c) => p + c, 0);
                let dy = Math.sign(v_reduce) * Math.max(minSize, Math.abs(v_reduce) / abs);
                var arrow = drawArrow(parent, x0, dy);
                drawArrowTextNumber(arrow, x0, dy, value, flow);
            }
            let dy;
            let text = Object.values(flow.values[time])
                .filter(x => x.type === 'text')
                .map(x => x.value);
            // 1 arrow, either up or down.
            let p = arrow || addSVGNode(parent, 'g', { x: x0, y: HEIGHT / 2 });
            if (values.length === 1) {
                let v_reduce = values[0].reduce((p, c) => p + c, 0);
                dy = Math.sign(v_reduce) * Math.max(minSize, Math.abs(v_reduce) / abs);
                drawArrowTextText(p, x0, dy, text, flow);
            }
        }
    }
    function drawArrow(parent, x, size, size_init = 0) {
        if (size === 0 || isNaN(size))
            return;
        let classList = ['arrow'];
        if (Math.sign(size) === -1)
            classList.push('negative-arrow');
        let g = addSVGNode(parent, 'g', { class: classList.join(' ') });
        let y0 = HEIGHT / 2;
        let arrowSize = [10, 15];
        let l_attr = {
            x1: x,
            x2: x,
            y1: y0,
            y2: y0 * (1 - size),
        };
        addSVGNode(g, 'line', l_attr);
        addSVGNode(g, 'polyline', {
            points: polylinePoints([x - arrowSize[0], y0 * (1 - size) + Math.sign(size) * arrowSize[1]], [x, y0 * (1 - size)], [x + arrowSize[0], y0 * (1 - size) + Math.sign(size) * arrowSize[1]]),
        });
        return g;
    }
    function drawArrowTextNumber(parent, x, dy, data, flow) {
        let nround = (n) => round(n, flow.meta.roundDigits);
        const result = nround(data.reduce((p, c) => p + c, 0));
        if (!result) {
            return;
        }
        let a_def = {
            'text-anchor': 'start',
            x,
            y: (1 - dy) * (HEIGHT / 2),
            class: 'arrows-number',
        };
        if (flow.meta.numberRotated)
            a_def.class += ' rotate';
        if (data.length > 1) {
            //let text_anchor = (Math.sign(result) > 0) ? 'start' : 'end';
            let nsum = data
                .map(x => nround(x))
                .join('+')
                .replace(/\+\-/g, '-');
            let t_container = addSVGNode(parent, 'text', a_def);
            addSVGNode(t_container, 'tspan', { x }, nround(result));
            addSVGNode(t_container, 'tspan', {
                x,
                class: 'text-small',
                dy: '1.2em',
            }, `(${nsum})`);
        }
        else {
            addSVGNode(parent, 'text', a_def, result);
        }
    }
    function drawArrowTextNumberOld(text_number_parent, x, size, deltaSize, flow, time) {
        //let textMargin = [20, 10];
        let data = flow.values[time];
        let numbers = data.filter(x => x.type === 'flowSimple');
        let result = flow.numValues[time];
        if (!result)
            return;
        let nround = (n) => round(n, flow.meta.roundDigits);
        let xn = x; // + textMargin[0];
        let yn = (HEIGHT / 2) * (1 - size); // + textMargin[1];
        let a_def = {
            'text-anchor': 'start',
            x: xn,
            y: yn,
            class: 'arrows-text-number',
        };
        if (numbers.length > 1) {
            let text_anchor = (Math.sign(result) > 0) ? 'start' : 'end';
            let nsum = numbers
                .map(x => nround(x.value.value))
                .join('+')
                .replace(/\+\-/g, '-');
            let x = addSVGNode(text_number_parent, 'text', a_def);
            addSVGNode(x, 'tspan', {
                x: xn,
            }, nround(result));
            addSVGNode(x, 'tspan', {
                class: 'text-small',
                x: xn,
                dy: '1.2em',
            }, `(${nsum})`);
        }
        else {
            let msg = nround(numbers[0].value.value);
            addSVGNode(text_number_parent, 'text', a_def, msg);
        }
    }
    function drawArrowTextText(parent, x, dy, text, flow) {
        if (text.length) {
            let margin = 1;
            let xn = x;
            let yn = (HEIGHT / 2) * (1 - dy);
            let t = addSVGNode(parent, 'text', {
                x: xn,
                y: yn,
                'text-anchor': 'middle',
                class: 'arrows-text',
            });
            let line = 0;
            for (let msg of text) {
                addSVGNode(t, 'tspan', {
                    x: xn,
                    dy: '1em',
                }, msg);
                line++;
            }
            return t;
        }
    }
    function drawArrowTextTextOld(text_text_parent, x, size, deltaSize, flow, time) {
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
        arrowsTextText: addSVGNode(SVG, 'g', { class: 'arrows-text-text' }),
        title: addSVGNode(SVG, 'g', { class: 'text-title' }),
    };
    drawDivisions(flow, renderGroup.timeTicks);
    drawTimestamps(flow, renderGroup.timestamps);
    drawArrows(flow, renderGroup.arrows, renderGroup.arrowsTextText);
    drawMeta(flow, renderGroup.title);
}
//# sourceMappingURL=render.js.map