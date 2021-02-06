import { setWindow } from "./Utils.js";
import * as d from "./ltspiceModelParser.js";
import * as p from "./StrParse.js";

window.addEventListener('load', function () {
    document.getElementById('file-input')
        .addEventListener('change', readSingleFile, false);
    console.log(d);
});

function readSingleFile(e: any) {
    var file = e.target.files[0];
    setWindow('files', e.target.files);
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
        var contents = e.target.result;
        displayContents(contents);
    };
    reader.readAsText(file);
}
function displayContents(contents: string | ArrayBuffer) {
    if (contents) {
        var element = document.getElementById('file-content');
        element.textContent = contents.toString();
    }
}
setWindow({ p });