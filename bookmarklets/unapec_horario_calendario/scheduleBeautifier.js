// DATA EXTRACT
var horario = [];
var horarioTable = $(".horario-clases tbody tr");
horarioTable.each(function (index) {
    var output = {
        code: "",
        name: "",
        group: "",
        credits: -1,
        schedule: [],
        campus: "",
        teacher: "",
    };

    var current = $(this);
    var data = current.children("td");
    data.each(function (index2) {
        if (index2 == 0) {
            output.code = $(this).text().trim();
        } else if (index2 == 1) {
            output.name = $(this).text().trim();
        } else if (index2 == 2) {
            output.credits = $(this).text().trim();
        } else if (index2 == 3) {
            output.group = $(this).text().trim();
        } else if (4 <= index2 && index2 <= 10) {
            if ($(this).children().length > 0) {
                var a = {};
                a.day = index2 - 4; /*monday is 0*/
                a.time = $(this).html().split("<br>")[0];
                a.classroom = $(this).html().split("<br>")[1];
                a.type = $(this).html().split("<br>")[2];
                output.schedule.push(a);
            }
        } else if (index2 == 11) {
            output.campus = $(this).text().trim();
        } else if (index2 == 12) {
            output.teacher = $(this).text().trim();
        }
    });
    horario.push(output);
});

// Create new Table
var myTable = document.getElementById("beautifulSchedule");
if (myTable == null) {
    // Container
    var myDiv = document.createElement("div");
    myDiv.classList.add("wprTabla");
    myDiv.classList.add("table-responsive");
    $(myDiv).insertBefore(".wprTabla.table-responsive");
    $(myDiv).css("margin-bottom", "75px");

    // Table
    var myTable = document.createElement("table");
    myTable.id = "beautifulSchedule";
    myTable.classList.add("table");
    myDiv.appendChild(myTable);
}
myTable.innerHTML = null; // clear table

var headers = [
    "Hora",
    "Lunes",
    "Martes",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sabado",
    "Domingo",
];
var headersDay = [null, 0, 1, 2, 3, 4, 5, 6, 7];

function generateTableHead(table, headers) {
    let thead = table.createTHead();
    let row = thead.insertRow();
    for (let value of headers) {
        let th = document.createElement("th");

        // style
        if (value != "Hora") {
            th.style.width = (90 * (1 / 7)).toString() + "%";
        }
        th.style.textAlign = "center";

        // text
        let text = document.createTextNode(value);
        th.appendChild(text);
        row.appendChild(th);
    }
}

generateTableHead(myTable, headers);

// Time string converters
function time24to12(i) {
    if (i == 0 || i == 24) {
        return "12AM";
    } else if (0 < i && i <= 11) {
        return i.toString().padStart(2, "0") + "AM";
    } else if (i == 12) {
        return "12PM";
    } else if (12 < i && i < 24) {
        return (i - 12).toString().padStart(2, "0") + "PM";
    } else {
        return null;
    }
}

function time12to24(str) {
    let s = str.trim();
    let regexp = /(\d{1,2})(AM|PM)/;
    let tag = s.match(regexp);
    if (tag.length != 3) {
        return null;
    }
    let i = parseInt(tag[1]);
    if (tag[2] == "PM") {
        if (i == 12) {
            return 12;
        } else {
            return i + 12;
        }
    } else if (tag[2] == "AM") {
        if (i == 12) {
            return 0;
        } else {
            return i;
        }
    } else {
        return null;
    }
}

function timeRangeConvert(str) {
    let regexp = /(\d{2}(?:AM|PM)) \/ (\d{2}(?:AM|PM))/;
    let tag = str.match(regexp);
    if (tag.length != 3) {
        return null;
    }
    return [time12to24(tag[1]), time12to24(tag[2])];
}

/**
 * Organize data per hour (instead of per class)
 * Fits the data in 24 hour bins. Just the first hour is accounted.
 * */
function convertClassToTime(data) {
    let horario = [];
    for (let i = 0; i < 24; i++) {
        horario.push([]);
    }

    for (let element of data) {
        for (let hour of element.schedule) {
            let o = {};
            //if (hour.classroom == "GRL") {continue; } // Removed class, should not appear
            o.classroom = hour.classroom;
            o.time = timeRangeConvert(hour.time);
            o.type = hour.type;
            o.day = hour.day;
            o.source = element;
            horario[o.time[0]].push(o);
        }
    }

    return horario;
}

// Decorative functions
/** Returns background, foreground, and border colors */
function getColorPair(str) {
    function hashCode(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }

    let h = hashCode(str) % 360;
    let s = "90%";
    let b = "95%";

    return [`hsl(${h},${s},${b})`, `hsl(${h},${s},20%)`, "gray"];
}

// Generate table rows
function generateTableRows(table, data, openTime, closeTime) {
    let orgData = convertClassToTime(data);

    let body = table.createTBody();

    let removeNextHour = [0, 0, 0, 0, 0, 0, 0]; // used to remove unnecesary td's

    for (let hour = openTime; hour < closeTime; hour++) {
        let row = body.insertRow();

        // Hour indicator
        let str = time24to12(hour) + " / " + time24to12(hour + 1);
        let text = document.createTextNode(str);
        let td = document.createElement("td");
        td.classList.add("sb-cell-center");
        td.appendChild(text);
        row.appendChild(td);

        // Days (td collection)
        let days = [];
        for (let j = 0; j < 7; j++) {
            let td = document.createElement("td");
            td.classList.add("sb-cell-center");
            days.push(td);
        }

        // Remove a table cell if last class had >1 hour.
        for (let j = 0; j < 7; j++) {
            if (removeNextHour[j] > 0) {
                removeNextHour[j]--;
            } else {
                row.appendChild(days[j]);
            }
        }

        orgData[hour].forEach((element, index, array) => {
            // Table cell format here
            var currentDay = days[element.day];
            currentDay.classList.add("sb-cell-center-clickable");

            currentDay.appendChild(
                document.createTextNode(element.source.name)
            );
            currentDay.appendChild(document.createElement("br"));
            currentDay.appendChild(
                document.createTextNode(`(${element.classroom})`)
            );
            currentDay.title = `${element.source.teacher}\nGrupo ${element.source.group}\n${element.source.campus}`;

            // currentDay.setAttribute(
            //     "data-schedule",
            //     JSON.stringify(element.source)
            // );

            currentDay.addEventListener('click', (e) => {
                var d = element.source;
                var time = "";
                var days = "LKMJVSD";
                d.schedule.forEach((x) => {
                    time += `\n - ${days[x.day]} ${x.time} @ ${x.classroom} (${x.type})`
                })

                navigator.clipboard.writeText(
`${d.name}
CODIGO: ${d.code}
GRUPO: ${d.group}
PROF: ${d.teacher}
${d.campus}
CREDITOS: ${d.credits}
HORARIO: ${time}`);
                alert(`Información de ${d.name} copiado al portapapeles.`)
            })

            // color
            var o = getColorPair(element.source.name);
            currentDay.style.backgroundColor = o[0];
            currentDay.style.color = o[1];
            currentDay.style.borderTopColor = o[2];

            // duration (hours => rowspan)
            let range = element.time[1] - element.time[0];
            currentDay.rowSpan = range;

            removeNextHour[element.day] += range - 1; // remove this td on the next row
        });
    }
}

generateTableRows(myTable, horario, 8, 22);

var myCss = document.getElementById("beautifulScheduleStyles");
if (myCss == null) {
    // Container
    myCss = document.createElement("style");
    myCss.id = "beautifulScheduleStyles";
    document.head.appendChild(myCss);
}
myCss.innerHTML = `
.sb-cell-center {
    word-break: break-word;
    vertical-align: middle !important;
    text-align: center;
}
.sb-cell-center-clickable:hover {
    filter: brightness(80%);
}`;
