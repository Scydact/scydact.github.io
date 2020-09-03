var unapecCode = "https://servicios.unapec.edu.do/pensum/Main/Detalles/";

/** Loads the node given at 'input' into the DOM */
async function fetchPensumTable() {
    const contentDiv = document.getElementById("tempFrame");
    var code = document.getElementById("codigoMateria").value;
    var urlToLoad = unapecCode + code;
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
            };
            let currentRows = rows[j].cells;
            outMat.codigo = currentRows[0].innerText;
            outMat.asignatura = currentRows[1].innerText;
            outMat.creditos = parseFloat(currentRows[2].innerText);

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
    arr.forEach((e) => {
        out[e.codigo] = e;
    });
    return out;
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
    let oxxxut = {
        carrera: "",
        codigo: "",
        vigencia: "",
        infoCarrera: [],
        cuats: [
            {
                codigo: "",
                asignatura: "",
                creditos: 0,
                prereq: [],
                prereqExtra: [],
            },
        ],
    };

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

            row.insertCell().innerText = mat.codigo;
            row.insertCell().innerText = mat.asignatura;
            {
                let r = row.insertCell();
                r.innerText = mat.creditos;
                r.classList.add("text-center");
            }
            row.insertCell().innerText = `${[mat.prereq, mat.prereqExtra]
                .flat()
                .join(", ")}`;
        });
    });

    return out;
}

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

            var timeoutId = setTimeout(() => controller.abort(), 5e3);
            var sendDate = (new Date()).getTime();

            var response = await fetch(currProxy + url, opts);
            if (response.ok) {
                var recieveDate = (new Date()).getTime();
                console.info(`CORS proxy '${currProxy}' succeeded in ${recieveDate - sendDate}ms."`)
                return await response.text();
            } else {
                throw response;
            }
        } catch (err) {
            var recieveDate = (new Date()).getTime();
            console.warn(`CORS proxy '${currProxy}' failed in ${recieveDate - sendDate}ms."`);
            console.warn(err);
            console.warn(await err.text())
            ++i;
        }
    }
    return null;
}

//#endregion

//#region Init

/** This function is called by the <search> button */
async function loadPensum() {
    let pensumNode = await fetchPensumTable();
    let pData = extractPensumData(pensumNode);

    if (pData) {
        document.getElementById("codigoMateria").value = pData.codigo;

        window.a = pData;
        window.b = matsToDict(window.a.cuats.flat());
        var wrapper = document.getElementById("tempFrame");
        wrapper.innerHTML = "";
        {
            let h = document.createElement("h1");
            h.innerText = pData.carrera;
            wrapper.appendChild(h);
        }
        wrapper.appendChild(createNewPensumTable(pData));
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

    loadPensum();
}
window.addEventListener("load", onWindowLoad);
//#endregion
