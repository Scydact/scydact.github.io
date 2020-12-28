/*Danny Feliz - 20152015*/
"use strict";

function _defineProperty(a, b, c) {
    return b in a ? Object.defineProperty(a, b, {
        value: c,
        enumerable: !0,
        configurable: !0,
        writable: !0
    }) : a[b] = c, a
}
var styles = "\n <style>\n .bg-white {\n background-color: white;\n }\n\n .up-arrow {\n border: solid black;\n border-width: 0 3px 3px 0;\n display: inline-block;\n padding: 3px;\n transform: rotate(-135deg);\n -webkit-transform: rotate(-135deg);\n }\n\n .text-green {\n color: darkgreen;\n }\n\n .text-red {\n color: darkred;\n }\n\n .available-size {\n font-size: xx-large;\n text-align: center;\n }\n\n .text-center {\n text-align: center;\n }\n\n .scroll3{\n width: 100%;\n position: relative;\n overflow: visible;\n }\n </style>\n";
$("body").append(styles);
var courseInformation = [],
    daysOfWeek = {
        L: "LUNES",
        K: "MARTES",
        M: "MI\xC9RCOLES",
        J: "JUEVES",
        V: "VIERNES",
        S: "S\xC1BADO",
        D: "DOMINGO"
    },
    MAX_HEIGHT_ALLOWED = 422;
alert("\xA1Asistente activado!"), $("tr[name ^= 'trOferta'] td input[name ^= 'chk']").on("change", function () {
    checkVisibility()
});

function checkVisibility() {
    var a = setInterval(function () {
        $("#ImgLoading").is(":visible") || ($("#divOfertaAcademica").removeClass("scroll2").addClass("scroll3"), $("#divOfertaAcademica").height() > MAX_HEIGHT_ALLOWED && $("#divOfertaAcademica").attr("style", "overflow:overlay"), clearInterval(a), courseInformation = [], init())
    }, 1e3)
}

function init() {
    $("tr[name ^= 'TRHorario'] input[name ^= 'chk']").each(function (a, b) {
        var c = $(b).attr("onclick");
        if (c) {
            var d = c.split("&");
            parseUrl(d)
        }
    }), $("tr[name ^= 'TRHorario']").mouseenter(function (a) {
        var b = $("tr[name ^= 'TRHorario']").index(a.currentTarget);
        $("#tableOferta").append(createTableInfo(b, a))
    }).mouseleave(function () {
        $("#table-details").remove(), $(".up-arrow").remove()
    })
}

function parseUrl(a) {
    var b = extractData(a);
    courseInformation.push(b)
}

function extractData(a) {
    var b = ["disponibles", "hrarel", "hraaul", "hrakey"],
        c = a.map(function (f) {
            return f = f.split("="), !!b.includes(f[0]) && _defineProperty({}, f[0], f[1])
        }),
        d = c.filter(Boolean);
    return mergeArrayOfObject(d)
}

function mergeArrayOfObject(a) {
    return a.reduce(function (b, c) {
        for (var d in c) c.hasOwnProperty(d) && (b[d] = c[d]);
        return b
    }, {})
}

function createTableInfo(a, b) {
    var c = courseInformation[a];
    if (c) {
        var d = $(b.currentTarget).position(),
            f = getDayOfWeek(c.hrarel, b.currentTarget, a),
            g = "";
        c.hrarel.includes("-") && (g = generateSecundRow(c));
        var h = +c.disponibles ? "text-green" : "text-red",
            i = "\n <table border=\"2px black solid\" id=\"table-details\" style=\"position: absolute; top: " + (d.top + 50) + "px; left: 80px; z-index: 9000;\">\n <i class=\"up-arrow\" style=\"position: absolute; top: " + (d.top + 40) + "px; left: 260px\"></i>\n <thead>\n <tr class=\"text-center\">\n <th>Cupos</th>\n <th>D\xEDa(s)</th>\n <th>H. Entrada</th>\n <th>H. Salida</th>\n <th>Aula</th>\n <th>Grupo</th>\n </tr>\n </thead>\n <tbody>\n <tr class='bg-white text-center'>\n <td rowspan=\"2\" class='" + h + " available-size'>" + c.disponibles + "</td>\n <td>" + c.dayOne + "</td>\n <td>" + c.startHourOne + "</td>\n <td>" + c.endHourOne + "</td>\n <td rowspan=\"2\">" + c.hraaul + "</td>\n <td rowspan=\"2\">" + c.hrakey + "</td>\n </tr>\n " + g + "\n </tbody>\n </table>\n ";
        return i
    }
}

function generateSecundRow(a) {
    return "<tr class='bg-white text-center'>\n <td>" + a.dayTwo + "</td>\n <td>" + a.startHourTwo + "</td>\n <td>" + a.endHourTwo + "</td>\n </tr>"
}

function getDayOfWeek(a, b, c) {
    var d = "",
        f = "";
    if (a.includes("-")) {
        var g = a.split("-");
        d = daysOfWeek[g[0]] + c, f = daysOfWeek[g[1]] + c, courseInformation[c].dayOne = daysOfWeek[g[0]], courseInformation[c].dayTwo = daysOfWeek[g[1]]
    } else d = daysOfWeek[a] + c, courseInformation[c].dayOne = daysOfWeek[a];
    if (d) {
        var h = extractDate(d, b);
        courseInformation[c].startHourOne = h.startHour, courseInformation[c].endHourOne = h.endHour
    }
    if (f) {
        var i = extractDate(f, b);
        courseInformation[c].startHourTwo = i.startHour, courseInformation[c].endHourTwo = i.endHour
    }
}

function extractDate(a, b) {
    a = "#" + a.replace("\xC1", "A").replace("\xC9", "E");
    var c = $(b).find(a).text().replace(/[^\d:/\s]/g, "");
    return c = c.split(" / "), {
        startHour: extractHours(c[0]),
        endHour: extractHours(c[1])
    }
}

function extractHours(a) {
    var b = a.split(":");
    a = +b[0];
    var c = " AM";
    return 12 <= a && (c = " PM"), 12 < a && (a -= 12), b[0] = a, b.join(":") + c
}