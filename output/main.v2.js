function stagemonolith(coefficient, distance, rounding, range, final = false) {

    function speedFormat(x) {
        return `${x} km/h`
    }
    function overageFormat(y) {
        return `+${Math.floor(y).toString().padStart(2, '0')}'${Math.floor((y * 60) % 60).toString().padStart(2, '0')}"`
    }
    function timeFormat(x) {
        return `${Math.floor(x / 60)}h${Math.floor(x % 60).toString().padStart(2, '0')}'${Math.floor((x * 60) % 60).toString().padStart(2, '0')}"`
    }
    function hourFormat(x) {
        return `${Math.floor(x / 60)}h${Math.floor(x % 60).toString().padStart(2, '0')}'`
    }

    function convertRemToPixels(rem) {
        return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
    }

    let contentsBounds = document.getElementById("speedGraph").getBoundingClientRect().width || document.getElementById("timeGraph").getBoundingClientRect().width
    let width = 1920
    let height = 1080
    let ratio = (contentsBounds - convertRemToPixels(2)) / width
    width *= ratio
    height *= ratio

    functionPlot.globals.DEFAULT_WIDTH = width
    functionPlot.globals.DEFAULT_HEIGHT = height

    function converter(x, coefficient, distance, rounding = "") {
        if (x < 0) {
            return;
        }

        let baseline = 0

        let stopper = false;

        coefficient.forEach((value) => {

            if (stopper) {
                return;
            }

            if (value < 1) {
                baseline = value
            } else if (x <= value) {
                stopper = true;
            }
        })

        switch (rounding) {
            case "ceil-s":
                return Math.ceil(baseline * (distance / x) * 3600) / 60;
            case "ceil-m":
                return Math.ceil(baseline * (distance / x) * 60);
            case "ceil-h":
                return Math.ceil(baseline * (distance / x)) * 60;
            case "floor-s":
                return Math.floor(baseline * (distance / x) * 3600) / 60;
            case "floor-m":
                return Math.floor(baseline * (distance / x) * 60);
            case "floor-h":
                return Math.floor(baseline * (distance / x)) * 60;
            case "round-s":
                return Math.round(baseline * (distance / x) * 3600) / 60;
            case "round-m":
                return Math.round(baseline * (distance / x) * 60);
            case "round-h":
                return Math.round(baseline * (distance / x)) * 60;
            default:
                return baseline * (distance / x) * 60;
        }

    }

    function minmax(xes, coefficient, distance, rounding = "") {
        let min = converter(xes[0], coefficient, distance, rounding)
        let max = min
        for (let index = xes[0]; index < xes[1]; index += 0.1) {
            min = Math.min(min, converter(index, coefficient, distance, rounding))
            max = Math.max(max, converter(index, coefficient, distance, rounding))
        }

        return [min - 1, max + 1]
    }

    let timeannotations = []
    let speedannotations = []

    if (final) {
        finalminutes = final[0] * 60 + final[1] + final[2] * 60;
        finalspeed = (distance / (finalminutes / 60)).toFixed(1);
        finalcut = converter(finalspeed, coefficient, distance, rounding)

        timeannotations = [
            {
                x: finalminutes,
                text: timeFormat(finalminutes)
            },
            {
                y: finalcut,
                text: overageFormat(finalcut)
            }
        ]

        speedannotations = [
            {
                x: finalspeed,
                text: speedFormat(finalspeed)
            },
            {
                y: finalcut,
                text: overageFormat(finalcut)
            }
        ]
    }

    function speedGraph(distance, coefficient, rounding = "") {
        let target = document.getElementById("speedGraph");
        let instance = functionPlot({
            grid: true,
            tip: {
                xLine: true,
                yLine: true,
                renderer: function (x, y, index) {
                    x = x.toFixed(1);
                    x = speedFormat(x);

                    y = overageFormat(y);

                    return `${x}\n${y}`
                }
            },
            yAxis: {
                domain: minmax(range, coefficient, distance, rounding),
                label: "Cutoff Time ->"
            },
            xAxis: {
                domain: range,
                label: "Finish Speed ->"
            },
            data: [
                {
                    graphType: 'polyline',
                    color: 'red',
                    fn: (scope) => converter(scope.x, coefficient, distance, rounding)
                }
            ],
            annotations: speedannotations,
            target
        });

        instance.meta.xAxis.tickFormat(speedFormat);
        instance.meta.yAxis.tickFormat(overageFormat);
        instance.meta.margin.left += 5;
        instance.draw();

        return instance;
    }

    var speedGraph = speedGraph(distance, coefficient, rounding);

    function timeToSpeed(time, distance) {
        return distance / (time / 60)
    }

    function speedToTime(speed, distance) {
        return (distance / speed) * 60
    }

    function ends(xes, distance) {
        return [speedToTime(xes[0], distance), speedToTime(xes[1], distance)].reverse()
    }

    function timeGraph(distance, coefficient, rounding = "") {
        let target = document.getElementById("timeGraph");

        let instance = functionPlot({
            grid: true,
            tip: {
                xLine: true,
                yLine: true,
                renderer: function (x, y, index) {
                    x = x.toFixed(1);
                    x = timeFormat(x);

                    y = overageFormat(y);

                    return `${x}\n${y}`
                }
            },
            yAxis: {
                domain: minmax(range, coefficient, distance, rounding),
                label: "Cutoff Time ->"
            },
            xAxis: {
                domain: ends(range, distance),
                label: "Finish Time ->"
            },
            data: [
                {
                    graphType: 'polyline',
                    color: 'red',
                    fn: (scope) => converter(timeToSpeed(scope.x, distance), coefficient, distance, rounding)
                }
            ],
            annotations: timeannotations,
            target
        });

        instance.meta.xAxis.tickFormat(hourFormat);
        instance.meta.yAxis.tickFormat(overageFormat);
        instance.meta.margin.left += 5;
        instance.draw();

        return instance;
    }

    var timeGraph = timeGraph(distance, coefficient, rounding);

    document.getElementById("speedButton").addEventListener("click", (e) => document.getElementById("graphContainer").classList.toggle("timeSwitch"));

    document.getElementById("timeButton").addEventListener("click", (e) => document.getElementById("graphContainer").classList.toggle("timeSwitch"));

    function updateVirtual() {
        realDistance = distance - document.getElementById("distance").value;

        duration = document.getElementById("duration").value.split(":").map(Number);

        duration = duration[0] * 60 + duration[1] + duration[2] / 60;

        speed = timeToSpeed(duration, realDistance).toFixed(1);

        if (realDistance == distance) {
            broomwagon = converter(speed, coefficient, distance, rounding);
        } else {
            broomwagon = converter(speed, coefficient, distance, rounding) * (realDistance / distance);
        }

        document.querySelector("section p").innerHTML = `${speed} km/h • Virtual broomwagon: + ${Math.floor(broomwagon).toString().padStart(2, '0')}'${Math.floor((broomwagon * 60) % 60).toString().padStart(2, '0')}"`
    }

    document.getElementById("distance").addEventListener("change", () => updateVirtual())

    document.getElementById("duration").addEventListener("change", () => updateVirtual())

    updateVirtual()

}