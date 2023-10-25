let inTime, holdTime, outTime, pauseTime;
let currentPhase = "";
let elapsedMillis = 0;
let interval;
let isRunning = false;
let maxDashArray = 471;  // This is 2 * pi * 75 (circle's radius)

function formatTime(millis) {
    let seconds = Math.floor(millis / 1000);
    let deciseconds = Math.floor((millis % 1000) / 100);
    return seconds + "." + deciseconds;
}

function beep() {
    let context = new AudioContext();
    let o = context.createOscillator();
    o.type = "sine";
    o.connect(context.destination);
    o.start();
    o.stop(context.currentTime + 0.1);
}

function getNextPhase() {
    switch (currentPhase) {
        case "in":
            return document.getElementById("holdCheck").checked ? "hold" : "out";
        case "hold":
            return "out";
        case "out":
            return document.getElementById("pauseCheck").checked ? "pause" : "in";
        case "pause":
            return "in";
    }
}

function updatePhaseDisplay(phase) {
    let phaseDiv = document.querySelector(".phase-name");
    phaseDiv.textContent = phase.replace(/^\w/, (c) => c.toUpperCase());
    if (document.getElementById("beepOnPhaseChange").checked) {
        beep();
    }
}

function updateProgressCircle(phaseTime) {
    let progressCircle = document.querySelector(".circle-progress");
    let percentage = elapsedMillis / phaseTime;
    let offset = maxDashArray * (1 - percentage);
    progressCircle.setAttribute("stroke-dashoffset", offset);
}

function updateAvgCyclesPerMinute() {
    let totalSeconds = parseFloat(document.getElementById("inTime").value);
    if (document.getElementById("holdCheck").checked) {
        totalSeconds += parseFloat(document.getElementById("holdTime").value);
    }
    totalSeconds += parseFloat(document.getElementById("outTime").value);
    if (document.getElementById("pauseCheck").checked) {
        totalSeconds += parseFloat(document.getElementById("pauseTime").value);
    }
    
    let avgCycles = 60 / totalSeconds;
    document.getElementById("avgCycles").textContent = "Average Cycles per Minute: " + avgCycles.toFixed(2);
}

function startBreathing() {
    if (isRunning) {
        clearInterval(interval);
        document.getElementById("startBtn").textContent = "Start";
        document.querySelector(".circle-progress").setAttribute("stroke-dashoffset", maxDashArray);
        document.getElementById("elapsedTime").textContent = formatTime(0);
        updatePhaseDisplay('');
        isRunning = false;
        return;
    }

    inTime = parseInt(document.getElementById("inTime").value) * 1000;
    holdTime = parseInt(document.getElementById("holdTime").value) * 1000;
    outTime = parseInt(document.getElementById("outTime").value) * 1000;
    pauseTime = parseInt(document.getElementById("pauseTime").value) * 1000;

    elapsedMillis = 0;
    currentPhase = "in";
    updatePhaseDisplay(currentPhase);

    interval = setInterval(function() {
        elapsedMillis += 100;
        document.getElementById("elapsedTime").textContent = formatTime(elapsedMillis);

        let phaseTime = {
            "in": inTime,
            "hold": holdTime,
            "out": outTime,
            "pause": pauseTime
        }[currentPhase];

        updateProgressCircle(phaseTime);

        if (elapsedMillis >= phaseTime) {
            elapsedMillis = 0;
            currentPhase = getNextPhase();
            updatePhaseDisplay(currentPhase);
        }
    }, 100);

    document.getElementById("startBtn").textContent = "Stop";
    isRunning = true;
}

// Event listeners
document.getElementById("startBtn").addEventListener("click", startBreathing);
document.getElementById("inTime").addEventListener("input", updateAvgCyclesPerMinute);
document.getElementById("holdTime").addEventListener("input", updateAvgCyclesPerMinute);
document.getElementById("outTime").addEventListener("input", updateAvgCyclesPerMinute);
document.getElementById("pauseTime").addEventListener("input", updateAvgCyclesPerMinute);
document.getElementById("holdCheck").addEventListener("change", updateAvgCyclesPerMinute);
document.getElementById("pauseCheck").addEventListener("change", updateAvgCyclesPerMinute);

// Initial calculation
updateAvgCyclesPerMinute();
