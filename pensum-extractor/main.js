var saveVer = 1;
var unapecPensumUrl = "https://servicios.unapec.edu.do/pensum/Main/Detalles/";
var currentPensumData = null;
var currentPensumCode = "";
var currentPensumMats = {};
var matLinks = {};

/** Loads the node given at 'input' into the DOM */
async function fetchPensumTable(pensumCode) {
    const contentDiv = document.getElementById("tempFrame");
    var urlToLoad = unapecPensumUrl + pensumCode;
    contentDiv.innerHTML = "Cargando...";
    contentDiv.innerHTML = await fetchHtmlAsText(urlToLoad);
    return contentDiv;
}

/**
 * Converts the node fetched from UNAPEC to a jObject.
 * @param {Element} node
 */
function extractPensumData(node) {
    let out = {
        carrera: "",
        codigo: "",
        vigencia: "",
        infoCarrera: [],
        cuats: [],
    };

    // Verify if pensum is actually valid data
    if (
        node.getElementsByClassName("contPensum").length != 0 &&
        node.getElementsByClassName("contPensum")[0].children.length < 2
    )
        return null;

    // Extract basic data
    var cabPensum = node.getElementsByClassName("cabPensum")[0];
    out.carrera = cabPensum.firstElementChild.innerText;
    var pMeta = cabPensum.getElementsByTagName("p")[0].children;
    out.codigo = pMeta[0].innerText.trim();
    out.vigencia = pMeta[1].innerText.trim();

    // Extract infoCarrera
    var infoCarrera = node.getElementsByClassName("infoCarrera")[0].children;
    for (let i = 0; i < infoCarrera.length; ++i) {
        out.infoCarrera.push(infoCarrera[i].innerText);
    }

    // Extract cuats
    var cuatrim = node.getElementsByClassName("cuatrim");
    for (let i = 0; i < cuatrim.length; ++i) {
        /**
         * @type {HTMLTableElement}
         */
        let currentCuatTable = cuatrim[i];
        let rows = currentCuatTable.tBodies[0].rows;

        let outCuat = [];

        for (let j = 1; j < rows.length; ++j) {
            let outMat = {
                codigo: "",
                asignatura: "",
                creditos: 0,
                prereq: [],
                prereqExtra: [],
                cuatrimestre: 0,
            };
            let currentRows = rows[j].cells;
            outMat.codigo = currentRows[0].innerText;
            outMat.asignatura = currentRows[1].innerText;
            outMat.creditos = parseFloat(currentRows[2].innerText);
            outMat.cuatrimestre = i + 1;

            // Prerequisitos
            var splitPrereq = currentRows[3].innerText
                .replace("\n", ",")
                .split(",")
                .map((x) => x.trim())
                .filter((e) => e !== "");
            for (let i = 0; i < splitPrereq.length; i++) {
                let a = splitPrereq[i];
                if (a.length < 8) outMat.prereq.push(a);
                else outMat.prereqExtra.push(a);
            }

            outCuat.push(outMat);
        }
        out.cuats.push(outCuat);
    }
    return out;
}

/** Maps an array of Mats to an dict where the keys are the Mats' code */
function matsToDict(arr) {
    let out = {};
    arr.forEach((x) => {
        out[x.codigo] = x;
        out[x.codigo].postReq = [];
    });

    // prereqs
    arr.forEach((x) => {
        x.prereq.forEach((y) => {
            out[y].postReq.push(x.codigo);
        })
    })

    return out;
}

/** Create mat dialog showing its dependencies and other options... */
function createMatDialog(code) {
    // let outMat = {
    //     codigo: "",
    //     asignatura: "",
    //     creditos: 0,
    //     prereq: [],
    //     prereqExtra: [],
    // };
    codeData = currentPensumMats[code];
    if (!codeData)
        return new DialogBox().setMsg("Informacion no disponible para " + code);

    let dialog = new DialogBox();
    outNode = dialog.contentNode;

    createElement(
        outNode,
        "h3",
        `(${codeData.codigo}) '${codeData.asignatura}'`
    );

    createElement(outNode, "p", `Codigo: \t${codeData.codigo}`);

    createElement(outNode, "p", `Creditos: \t${codeData.creditos}`);

    createElement(outNode, "p", `Cuatrimestre: \t${codeData.cuatrimestre}`);

    if (codeData.prereq.length > 0 || codeData.prereqExtra.length > 0) {
        createElement(outNode, "h4", "Pre-requisitos");
        codeData.prereq.forEach((x) => {
            let p = createElement(outNode, "p");
            let s = document.createElement("a");
            s.innerText = `(${x}) ${currentPensumMats[x].asignatura}`;
            s.addEventListener("click", () => {
                dialog.hide();
                createMatDialog(x).show();
            });
            s.classList.add("preReq");
            s.classList.add("monospace");

            p.appendChild(s);
        });

        codeData.prereqExtra.forEach((x) => {
            let p = createElement(outNode, "p");
            let s = document.createElement("a");
            s.innerText = x;
            s.classList.add("preReq");
            s.classList.add("preReqExtra");

            p.appendChild(s);
        });
    }

    if (codeData.postReq.length > 0) {
        createElement(outNode, "h4", "Es pre-requisito de: ");
        codeData.postReq.forEach((x) => {
            let p = createElement(outNode, "p");
            let s = document.createElement("a");
            s.innerText = `(${x}) ${currentPensumMats[x].asignatura}`;
            s.addEventListener("click", () => {
                dialog.hide();
                createMatDialog(x).show();
            });
            s.classList.add("preReq");
            s.classList.add("monospace");

            p.appendChild(s);
        });
    }

    outNode.appendChild(dialog.createCloseButton());
    return dialog;
}

/**
 * Recreates the pensumData, as a new formatted table.
 * Cols:
 *  - CUAT indicator
 *  - Codigo
 *  - Nombre
 *  - Creds
 *  - Prereq
 * @param {*} data
 */
function createNewPensumTable(data) {
    // Just for reference, this is the 'data' param schema.
    // let out = {
    //     carrera: "",
    //     codigo: "",
    //     vigencia: "",
    //     infoCarrera: [],
    //     cuats: [
    //         {
    //             codigo: "",
    //             asignatura: "",
    //             creditos: 0,
    //             prereq: [],
    //             prereqExtra: [],
    //         },
    //     ],
    // };

    /** @type {HTMLTableElement} */
    let out = document.createElement("table");

    // create the header
    let headerRow = out.createTHead();
    ["Ct", "Codigo", "Asignatura", "Creditos", "Pre-requisitos"].forEach(
        (x) => {
            let a = document.createElement("th");
            a.innerText = x;
            headerRow.appendChild(a);
        }
    );

    // create the contents
    data.cuats.forEach((cuat, idxCuat) => {
        cuat.forEach((mat, idxMat, currentCuat) => {
            let row = out.insertRow();
            if (idxMat === 0) {
                let a = document.createElement("th");
                row.appendChild(a);
                a.rowSpan = currentCuat.length;
                a.innerHTML = `<p class='vertical-text'>Cuat. ${
                    idxCuat + 1
                }</p>`;
                row.classList.add("cuatLimit");
                a.classList.add("cuatHeader");
            }
            
            // Codigo mat.
            { 
                let r = row.insertCell();
                r.id = `a_${mat.codigo}`;
                row.id = `r_${mat.codigo}`;
                r.classList.add("text-center");
                
                let s = document.createElement("a");
                s.innerText = `${mat.codigo}`;
                s.addEventListener("click", () => {
                    createMatDialog(mat.codigo).show();
                });
                s.classList.add("codigo");
                s.classList.add("monospace");

                r.appendChild(s);
            }

            // Asignatura
            row.insertCell().innerText = mat.asignatura;

            // Creditos
            {
                let r = row.insertCell();
                r.innerText = mat.creditos;
                r.classList.add("text-center");
            }

            // Prereqs
            {
                let r = row.insertCell();

                mat.prereq.forEach((x) => {
                    let s = document.createElement("a");
                    s.innerText = x;
                    s.addEventListener("click", () => {
                        let targetCell = document.getElementById(`a_${x}`);
                        let targetRow = document.getElementById(`r_${x}`);
                        targetCell.scrollIntoView({
                            block: "center",
                        });
                        targetRow.classList.remove("highlightRow");
                        targetRow.classList.add("highlightRow");
                        setTimeout(
                            () => targetRow.classList.remove("highlightRow"),
                            2e3
                        );
                    });
                    s.classList.add("preReq");
                    s.classList.add("monospace");

                    r.appendChild(s);
                    r.appendChild(document.createTextNode('\t'))
                });

                mat.prereqExtra.forEach((x) => {
                    let s = document.createElement("a");
                    s.innerText = x;
                    s.classList.add("preReq");
                    s.classList.add("preReqExtra");

                    r.appendChild(s);
                    r.appendChild(document.createTextNode('\t'))
                });
            }
        });
    });

    return out;
}

/** Extracts and separates the information on "data.infoCarrera" */
function getInfoList(data) {
    return data.infoCarrera.map((x) => {
        let splitOnFirstColon = [
            x.substring(0, x.indexOf(": ")),
            x.substring(x.indexOf(": ") + 2),
        ];
        if (splitOnFirstColon[0] == "") return { type: "simple", data: x };
        else {
            let splitOnDots = splitOnFirstColon[1].split(". ");
            if (splitOnDots.length == 1)
                return { type: "double", data: splitOnFirstColon };
            else
                return {
                    type: "double_sublist",
                    data: [splitOnFirstColon[0], splitOnDots],
                };
        }
    });
}

/**
 * Creates a table that contains the pensum's general info.
 * @param {*} data
 */
function createInfoList(data) {
    /** @type {HTMLTableElement} */
    let out = document.createElement("ul");

    // Most pensums have this already
    // let allMats = data.cuats.flat();
    // let totalCreds = 0;
    // for (let x of allMats) totalCreds += x.creditos;

    // let outTextArr = [`Total de creditos: ${totalCreds}`].concat(data.infoCarrera);

    // Separate the text before outputting.
    let outTextArr = getInfoList(data);

    // Format the text as a list
    for (let x of outTextArr) {
        let li = document.createElement("li");
        switch (x.type) {
            case "simple":
                li.innerText = x.data;
                break;
            case "double":
                li.innerHTML = `<b>${sentenceCase(x.data[0])}:</b>\t${
                    x.data[1]
                }`;
                break;
            case "double_sublist":
                li.innerHTML = `<b>${sentenceCase(x.data[0])}: </b>`;
                var subul = document.createElement("ul");
                x.data[1].forEach((elem) => {
                    let subli = document.createElement("li");
                    subli.innerHTML = elem + ".";
                    subul.appendChild(subli);
                });
                li.appendChild(subul);
                break;
        }
        out.appendChild(li);
    }

    return out;
}

//#region LocalStorage Funcs

function saveToLocalStorage() {
    let out = {
        saveVer: saveVer,
        currentCodeAtInputForm: document.getElementById("codigoMateria").value,
    };

    try {
        localStorage.setItem("saveData", JSON.stringify(out));
        return true;
    } catch (err) {
        console.warn("Could not save saveData to localStorage");
        console.warn(err);
        return false;
    }
}

function loadFromLocalStorage() {
    let saveData = localStorage.getItem("saveData");
    if (saveData === null) return false;

    let out = JSON.parse(saveData);

    document.getElementById("codigoMateria").value = out.currentCodeAtInputForm;

    // Version management and cache clearing.
    if (out.saveVer !== saveVer) {
        console.info(`Updated to version ${saveVer} and cleared localStorage.`)
        localStorage.clear();
    }
    return true;
}

//#endregion

//#region Helper functions

/**
 *
 * @param {String} url address for the HTML to fetch
 * @param {String} cacheOpt cache policy, defaults to force-cache,
 * but if cache must be reloaded, do 'relaod'.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Request/cache
 * @return {String} the resulting HTML string fragment
 */
async function fetchHtmlAsText(
    url,
    cacheOpt = "force-cache" /*'force-cache'*/
) {
    const corsOverride = [
        "https://api.allorigins.win/raw?url=",
        "https://yacdn.org/serve/",
        "https://cors-anywhere.herokuapp.com/", // has request limit (200 per hour)
        "https://cors-proxy.htmldriven.com/?url=", // Fails with CORS (what!?)
        "https://thingproxy.freeboard.io/fetch/", // problems with https requests
        "http://www.whateverorigin.org/get?url=", // problems with https requests, deprecated?
    ];

    let i = 0;
    while (i < corsOverride.length) {
        var currProxy = corsOverride[i];
        try {
            var opts = {
                cache: cacheOpt,
                signal: null,
            };
            var controller = new AbortController();
            var signal = controller.signal;
            opts.signal = signal;

            var timeoutId = setTimeout(() => controller.abort(), 3e3);
            var sendDate = new Date().getTime();

            var response = await fetch(currProxy + url, opts);
            if (response.ok) {
                var recieveDate = new Date().getTime();
                console.info(
                    `CORS proxy '${currProxy}' succeeded in ${
                        recieveDate - sendDate
                    }ms."`
                );
                return await response.text();
            } else {
                throw "Timed out!";
            }
        } catch (err) {
            var recieveDate = new Date().getTime();
            console.warn(
                `CORS proxy '${currProxy}' failed in ${
                    recieveDate - sendDate
                }ms."`
            );
            console.warn(err);
        } finally {
            ++i;
        }
    }
    return null;
}

function titleCase(string) {
    var sentence = string.toLowerCase().split(" ");
    for (var i = 0; i < sentence.length; i++) {
        sentence[i] = sentence[i][0].toUpperCase() + sentence[i].slice(1);
    }
    return sentence.join(" ");
}

function sentenceCase(string) {
    var sentence = string.toLowerCase();
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

class DialogBox {
    constructor() {
        this.wrapperNode = document.createElement("div");
        this.wrapperNode.classList.add("fullscreen");
        this.wrapperNode.classList.add("dialogWrapper");

        this.contentNode = document.createElement("div");
        this.contentNode.classList.add("dialogCard");
        this.wrapperNode.appendChild(this.contentNode);

        return this;
    }

    setMsg(str) {
        createElement(this.contentNode, "p", str);
        this.contentNode.appendChild(this.createCloseButton());
        return this;
    }

    show() {
        document.body.appendChild(this.wrapperNode);
        return this;
    }

    hide() {
        document.body.removeChild(this.wrapperNode);
        return this;
    }

    createCloseButton() {
        let a = document.createElement("a");
        a.innerText = "Cerrar";
        a.addEventListener("click", () => this.hide());
        a.classList.add("btn-primary");
        return a;
    }
}

function createElement(
    parentNode,
    tag = "div",
    innerHTML = null,
    classes = []
) {
    let x = document.createElement(tag);
    parentNode.appendChild(x);
    if (innerHTML !== null) x.innerHTML = innerHTML;
    classes.forEach((clss) => x.classList.add(clss));
    return x;
}

//#endregion

//#region Init

/** This function is called by the <search> button */
async function loadPensum() {
    var infoWrap = document.getElementById("infoWrapper");
    infoWrap.innerHTML = "";

    currentPensumCode = document.getElementById("codigoMateria").value.toUpperCase();

    // try to check if its on localStorage, else check online and cache if successful.
    currentPensumData = getPensumFromLocalStorage(currentPensumCode);
    if (currentPensumData === null) {
        let pensumNode = await fetchPensumTable(currentPensumCode);
        currentPensumData = extractPensumData(pensumNode);

        // Update cache and currentPensumCode if successfuly fetched.
        if (currentPensumData) {
            let newCode = currentPensumData.codigo;
            document.getElementById("codigoMateria").value = newCode;
            currentPensumCode = newCode;
            setPensumToLocalStorage(currentPensumData);
        }
    }

    if (currentPensumData) {
        currentPensumMats = matsToDict(currentPensumData.cuats.flat());
        document.getElementById("codigoMateria").value =
            currentPensumData.codigo;

        var wrapper = document.getElementById("tempFrame");
        wrapper.innerHTML = "";
        {
            let h = document.createElement("h1");
            h.innerText = currentPensumData.carrera;
            wrapper.appendChild(h);
        }
        wrapper.appendChild(createNewPensumTable(currentPensumData));

        {
            let h = document.createElement("h3");
            h.innerText = "Detalles de la carrera: ";
            infoWrap.appendChild(h);
        }
        infoWrap.appendChild(createInfoList(currentPensumData));
        {
            let a = document.createElement("a");
            a.href = unapecPensumUrl + currentPensumCode;
            a.target = "_blank";
            a.innerText = "Ver pensum original.";
            infoWrap.appendChild(a);
        }
    } else {
        infoWrap.innerText = 'No se ha encontrado el pensum!'
    }
}

function setPensumToLocalStorage(data) {
    try {
        let code = 'cache_' + data.codigo;
        let json = JSON.stringify(data);
        window.localStorage.setItem(code, json);
        return true;
    } catch {
        return false;
    }
}

function getPensumFromLocalStorage(matCode) {
    try {
        let code = 'cache_' + matCode;
        let json = window.localStorage.getItem(code);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

async function onWindowLoad() {
    //mFrame.addEventListener('load',(e)=>console.log('loaded'));
    try {
        let carr = await (await fetch("carreras.json")).json();
        let input = document.getElementById("codigoMateria");

        let list = carr.carreras.map((x) => [
            `(${x.codigo}) ${x.nombre}`,
            x.codigo,
        ]);

        // from awesomplete.min.js
        new Awesomplete(input, {
            minChars: 0,
            list: list,
        });
    } catch {
        console.warn(
            "carreras.json could not be loaded.\n Search autocomplete will not be available."
        );
    }

    // associate input with Enter.
    document.getElementById("codigoMateria").addEventListener("keyup", (e) => {
        if (e.key === "Enter") loadPensum();
    });

    // Try to get saved data
    loadFromLocalStorage();

    // Do first load
    loadPensum();
}

window.addEventListener("load", onWindowLoad);

window.addEventListener("beforeunload", (event) => {
    saveToLocalStorage();
});
//#endregion
