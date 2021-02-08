import { choice, number, remainder, sepBy1, sequenceOf, str, whitespace, optional, simpleInt } from "./StrParse.js";
import { fixFloatError, setWin } from "./Utils.js";
//#region Parser
const choiceStr = (chars, caseSensitive) => {
    let choices = [];
    for (let c of chars)
        choices.push(c);
    let o = choices.map(x => str(x, caseSensitive));
    return choice(o);
};
/** Data Types */
const dt = {
    numberFlow: {
        p: sequenceOf([
            number,
            optional(choiceStr('cKM%', false))
        ]).map((x) => {
            const [n, suffix] = x;
            const raw = n + (suffix || '');
            const mult_dict = {
                c: 1e-2,
                '%': 1e-2,
                k: 1e3,
                m: 1e6,
            };
            const mult = mult_dict[suffix] || 1;
            return {
                type: 'flow',
                value: fixFloatError(parseFloat(n) * mult),
                suffix,
                raw,
            };
        }),
    },
    numberTime: {
        p: sequenceOf([
            optional(str('r')),
            simpleInt,
        ]).map((x) => {
            const [prefix, n] = x;
            const raw = (prefix || '') + n;
            return {
                type: 'timeDisplacement',
                value: parseInt(n),
                jumpType: (prefix === 'r') ? 'relative' : 'absolute',
                raw,
            };
        }),
    },
};
const sepBySpaceParser = sepBy1(whitespace);
const s = (x) => str(x, false);
export const commands = {
    comment: {
        desc: ['% TEXT', 'Line is just ignored'],
        p: sequenceOf([s('%'), remainder])
            .map(x => ({
            cmd: 'comment',
            value: x[1],
            ignore: true,
        })),
        a: (state) => { return state; },
    },
    heading: {
        desc: ['h TEXT', 'Sets the plot\'s title.'],
        p: sequenceOf([s('h '), remainder])
            .map(x => ({
            cmd: 'heading',
            value: x[1],
        })),
        a: (state, cmd) => {
            state.meta.title = cmd.value;
            return state;
        },
    },
    message: {
        desc: ['m TEXT', 'Sets a message on this line.'],
        p: sequenceOf([s('m '), remainder])
            .map(x => ({
            cmd: 'message',
            value: x[1],
        })),
        a: (state, cmd) => {
            state.pushVal({
                type: 'text',
                value: cmd.value,
            });
            return state;
        },
    },
    messagePrevious: {
        desc: ['mp TEXT', 'Sets a message on the previous period.'],
        p: sequenceOf([s('mp '), remainder])
            .map(x => ({
            cmd: 'messagePrevious',
            value: x[1],
        })),
        a: (state, cmd) => {
            state.t--;
            state.pushVal({
                type: 'text',
                value: cmd.value,
            });
            state.t++;
            return state;
        },
    },
    timeJump: {
        desc: ['t P', 'Jumps to a given period.'],
        p: sequenceOf([s('t '), dt.numberTime.p])
            .map(x => ({
            cmd: 'timeJump',
            value: x[1].value,
            type: x[1].jumpType,
        })),
        a: (state, cmd) => {
            if (cmd.type === 'absolute')
                state.t = cmd.value;
            else
                state.t += cmd.value;
            return state;
        }
    },
    simpleFlow: {
        desc: ['X', 'Adds an arrow at this time'],
        p: dt.numberFlow.p
            .map(x => ({
            cmd: 'simpleFlow',
            value: x,
        })),
        a: (state, cmd) => {
            state.pushVal({
                type: 'flowSimple',
                value: cmd.value,
            });
            state.hop_t = true;
            return state;
        },
    },
    annuality: {
        desc: ['a n X', 'Adds n payments of X'],
        p: sequenceOf([s('a '), simpleInt, whitespace, dt.numberFlow.p])
            .map(x => ({
            cmd: 'annuality',
            value: [x[1], x[3]],
        })),
        a: (state, cmd) => {
            let imax = parseFloat(cmd.value[0]);
            for (let i = 0; i < imax; i++) {
                state.pushVal({
                    type: 'flowSimple',
                    value: cmd.value[1],
                });
                state.t++;
            }
            state.t--;
            state.hop_t = true;
            return state;
        },
    },
    arithmeticSequence: {
        desc: ['sa n G', 'Adds an arithmetic sequence (sa) of n values in increments of G'],
        p: sequenceOf([s('sa '), simpleInt, whitespace, dt.numberFlow.p])
            .map(x => ({
            cmd: 'arithmeticSequence',
            value: [x[1], x[3]],
        })),
        a: (state, cmd) => {
            let imax = parseFloat(cmd.value[0]);
            let ogVal = cmd.value[1];
            for (let i = 0; i < imax; i++) {
                let modVal = Object.assign(Object.assign({}, ogVal), { value: fixFloatError(i * ogVal.value) });
                state.pushVal({
                    type: 'flowSimple',
                    value: modVal,
                });
                state.t++;
            }
            state.t--;
            state.hop_t = true;
            return state;
        },
    },
    geometricSequence: {
        desc: ['sg n A1 g', 'Adds an geometric sequence (sg) of n values, with initial value A1, at increments of g.'],
        p: sequenceOf([
            s('sg '),
            simpleInt, whitespace,
            dt.numberFlow.p, whitespace,
            dt.numberFlow.p
        ]).map(x => ({
            cmd: 'geometricSequence',
            value: [x[1], x[3], x[5]],
        })),
        a: (state, cmd) => {
            let imax = parseFloat(cmd.value[0]);
            let ogVal = cmd.value[1];
            let increment = cmd.value[2].value;
            for (let i = 0; i < imax; i++) {
                let modVal = Object.assign(Object.assign({}, ogVal), { value: fixFloatError(Math.pow((1 + increment), i) * ogVal.value) });
                state.pushVal({
                    type: 'flowSimple',
                    value: modVal,
                });
                state.t++;
            }
            state.t--;
            state.hop_t = true;
            return state;
        },
    },
};
const command = choice(Object.values(commands).map(x => x.p));
export const lineParser = sepBySpaceParser(command);
//#endregion
//#region Flow and line processing
export function createFlow(str) {
    const str_lines = str
        .split('\n')
        .map(x => x.trim());
    const lines = str_lines.map(x => lineParser.run(x));
    return processLines(lines);
}
function processLines(lines) {
    let state = {
        pushVal: function (x) {
            if (this.values[this.t] === undefined)
                this.values[this.t] = [];
            this.values[this.t].push(x);
        },
        values: {},
        t: 0,
        hop_t: false,
        meta: {
            title: '',
            interest: 0.05,
        },
    };
    // Recompile commands
    for (const l of lines) {
        let line_cmd = (l.result || []).filter(x => !x.ignore);
        if (!line_cmd.length)
            continue;
        for (const cmd of line_cmd) {
            let a = commands[cmd.cmd];
            if (a)
                state = a.a(state, cmd);
        }
        if (state.hop_t)
            state.t++;
        state.hop_t = false;
    }
    // Join arrows and stuff...
    const keys = Object.keys(state.values).map(x => parseInt(x)).sort((a, b) => a - b);
    const minVal = keys[0];
    const maxVal = keys[keys.length - 1];
    // TODO: Set a period system, like: 
    // periods: {
    //     {start: -1, end: 3},
    //     {start: 5, end: 10},
    // }
    // and add some respective period-to-svg-x function.
    let numValues = {};
    for (let key in state.values) {
        numValues[key] = fixFloatError(state.values[key]
            .filter(x => x.type === 'flowSimple')
            .reduce((p, c) => p + c.value.value, 0));
    }
    let x = {
        keys: keys,
        values: state.values,
        numValues: numValues,
        start: minVal,
        end: maxVal,
        meta: state.meta,
    };
    setWin({ parserLines: lines, flow: x });
    return x;
}
//#endregion
//# sourceMappingURL=commands.js.map