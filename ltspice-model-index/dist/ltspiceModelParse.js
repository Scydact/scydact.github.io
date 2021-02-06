// .model 1N914 D(Is=2.52n Rs=.568 N=1.752 Cjo=4p M=.4 
//              + tt=20n Iave=200m Vpk=75 mfg=OnSemi type=silicon)
import { between, choice, digits, str } from "./StrParse";
const betweenBrackets = between(str('('), str(')'));
const numberParser = digits.map(x => ({
    type: 'number',
    value: Number(x),
}));
const operatorParser = choice([
    str('+'),
]);
//# sourceMappingURL=ltspiceModelParse.js.map