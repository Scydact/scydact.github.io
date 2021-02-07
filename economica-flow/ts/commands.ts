import { between, choice, many, many1, number, regex, remainder, sepBy1, sequenceOf, str, whitespace, optional, simpleInt } from "./StrParse.js";
const fixFloatError = (val: number) => Number.parseFloat(val.toPrecision(15));

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

    let w = window as any;
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

const choiceStr = (chars, caseSensitive?) => {
    let choices = [];
    for (let c of chars)
        choices.push(c);
    let o = choices.map(x => str(x, caseSensitive));
    return choice(o);
}

/** Data Types */
const dt = {
    numberFlow: {
        p: sequenceOf([
            number,
            optional(choiceStr('cKM', false))
        ]).map((x) => {
            const [n, suffix] = x;
            const raw = n + (suffix || '');
            const mult_dict = {
                c: 1e-2,
                k: 1e3,
                m: 1e6,
            }
            const mult = mult_dict[suffix] || 1;
            return {
                type: 'flow',
                value: fixFloatError(parseFloat(n) * mult),
                raw,
            }
        }),
    },
    numberTime: {
        p: sequenceOf([
            optional(str('r')),
            simpleInt,
        ])
    },
}
const sepBySpaceParser = sepBy1(whitespace);
const commands = {
    comment: {
        desc: ['% TEXT', 'Line is just ignored'],
        p: sequenceOf([str('%'), remainder])
            .map(x => ({
                cmd: 'comment',
                value: x[1],
            })),
    },
    heading: {
        desc: ['h TEXT', 'Sets the plot\'s title.'],
        p: sequenceOf([str('h '), remainder])
            .map(x => ({
                cmd: 'heading',
                value: x[1],
            })),
    },
    message: {
        desc: ['m TEXT', 'Sets a message on this line.'],
        p: sequenceOf([str('m '), remainder])
            .map(x => ({
                cmd: 'message',
                value: x[1],
            })),
    },
    messagePrevious: {
        desc: ['mp TEXT', 'Sets a message on the previous period.'],
        p: sequenceOf([str('mp '), remainder])
            .map(x => ({
                cmd: 'message',
                value: x[1],
            })),
    },
    timeJump: {
        desc: ['t P', 'Jumps to a given period.'],
        p: sequenceOf([str('t '), dt.numberTime.p]),
    },
    simpleFlow: {
        desc: ['X', 'Adds an arrow at this time'],
        p: dt.numberFlow.p,
    },
}
const command = choice(Object.values(commands).map(x => x.p));
export const lineParser = sepBySpaceParser(command);