import { functionPlot } from 'https://unpkg.com/function-plot/dist/function-plot.js'

function stagemonolith(coefficient, distance, rounding, range) {

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

    let converter = function (x, coefficient, distance, rounding = "") {
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
                break;
            case "ceil-m":
                return Math.ceil(baseline * (distance / x) * 60);
                break;
            case "ceil-h":
                return Math.ceil(baseline * (distance / x)) * 60;
                break;
            case "floor-s":
                return Math.floor(baseline * (distance / x) * 3600) / 60;
                break;
            case "floor-m":
                return Math.floor(baseline * (distance / x) * 60);
                break;
            case "floor-h":
                return Math.floor(baseline * (distance / x)) * 60;
                break;
            case "round-s":
                return Math.round(baseline * (distance / x) * 3600) / 60;
                break;
            case "round-m":
                return Math.round(baseline * (distance / x) * 60);
                break;
            case "round-h":
                return Math.round(baseline * (distance / x)) * 60;
                break;
            default:
                return baseline * (distance / x) * 60;
        }

    }

    minmax = function (xes, coefficent, distance, rounding = "") {
        let min = converter(xes[0], coefficient, distance, rounding)
        let max = min
        for (let index = xes[0]; index < xes[1]; index += 0.1) {
            min = Math.min(min, converter(index, coefficient, distance, rounding))
            max = Math.max(max, converter(index, coefficient, distance, rounding))
        }

        return [min - 1, max + 1]
    }

    speedGraph = function (distance, coefficient, rounding = "") {
        let target = document.getElementById("speedGraph");
        let speedFormat = function (x) {
            return `${x} km/h`
        }
        let overageFormat = function (y) {
            return `+${Math.floor(y).toString().padStart(2, '0')}'${Math.floor((y * 60) % 60).toString().padStart(2, '0')}"`
        }
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
            target
        });

        instance.meta.xAxis.tickFormat(speedFormat);
        instance.meta.yAxis.tickFormat(overageFormat);
        instance.meta.margin.left += 5;
        instance.draw();

        return instance;
    }

    var speedGraph = speedGraph(distance, coefficient, rounding);

    timeToSpeed = function (time, distance) {
        return distance / (time / 60)
    }

    speedToTime = function (speed, distance) {
        return (distance / speed) * 60
    }

    ends = function (xes, distance) {
        return [speedToTime(xes[0], distance), speedToTime(xes[1], distance)].reverse()
    }

    timeGraph = function (distance, coefficient, rounding = "") {
        let target = document.getElementById("timeGraph");
        let speedFormat = function (x) {
            return `${Math.floor(x / 60)}h${Math.floor(x % 60).toString().padStart(2, '0')}'${Math.floor((x * 60) % 60).toString().padStart(2, '0')}"`
        }
        let overageFormat = function (y) {
            return `+${Math.floor(y).toString().padStart(2, '0')}'${Math.floor((y * 60) % 60).toString().padStart(2, '0')}"`
        }
        let timeFormat = function (x) {
            return `${Math.floor(x / 60)}h${Math.floor(x % 60).toString().padStart(2, '0')}'`
        }
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
            target
        });

        instance.meta.xAxis.tickFormat(timeFormat);
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

    window.addEventListener('load', function () {
        document.getElementById("distance").addEventListener("change", () => updateVirtual())

        document.getElementById("duration").addEventListener("change", () => updateVirtual())

        updateVirtual()
    })

}