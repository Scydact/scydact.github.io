var courseInformation = [];

alert("Mostrar cupos activado");
$("tr[name ^= 'trOferta'] td input[name ^= 'chk']").on("change", () => checkVisibility());

function checkVisibility() {
    var a = setInterval(() => {
        if (!$("#ImgLoading").is(":visible")) {
            // Allow overflow
            // $("#divOfertaAcademica").removeClass("scroll2").addClass("scroll3"); 
            // $("#divOfertaAcademica").height() > MAX_HEIGHT_ALLOWED && $("#divOfertaAcademica").attr("style", "overflow:overlay");
            clearInterval(a);
            courseInformation = [];
            init();
        }
    }, 100);
}

function init() {
    var chkBoxes = $("tr[name^='TRHorario'] input[name^='chk']");
    chkBoxes.each((a, b) => {
        var c = $(b).attr("onclick");
        if (c) {
            var d = c.split("&");
            parseUrl(d);
        }
    });

    // Header cell
    var headerCell = $('#tableOferta thead tr').get(0).insertCell();
    headerCell.classList.add('th');
    headerCell.style.width = "332px";
    headerCell.style.textAlign = "center";
    headerCell.innerText = "Cupos";

    // Rows
    var TRHorario = $("tr[name ^= 'TRHorario']");
    TRHorario.get().forEach((row, i) => {
        var newCell = row.insertCell();
        newCell.style.textAlign = "center";

        var cInfo = courseInformation[i];
        if (cInfo)
            newCell.innerText = cInfo["disponibles"].toString() || "";
    });
}

function parseUrl(a) {
    var b = extractData(a);
    courseInformation.push(b);
}

function extractData(urlArgs) {
    /**
     * disponibles (cupos)
     * curso (codigo, ej soc280)
     * plan (pensum)
     * nivel (carrera)
     * curper (ej cuatrimestral)
     * plarel (codigo de nuevo)
     * plaper (?? relacionado a creditos??)
     * pletab: codigo pensum
     * plaopt: (S/N), optativa
     * curcre (creditos)
     * listaespera (si/no, no implementado)
     * hra:
     *  - rel: dia
     *  - dia: dia en palabra
     *  - ini: hora inicio
     *  - fin: hora fin
     *  - key: codigo grupo
     *  - aul: aula
     *  - aspe
     *  - asuc
     *  - compania: (apec gomez o cafam, etc...)
     *  - llave: auth key.
     */
    var toFind = ["disponibles"];
    var data = {};
    for (var urlArg of urlArgs) {
        f = urlArg.split("=");
        if (toFind.includes(f[0]))
            data[f[0]] = f[1];
    }
    return data;
}

