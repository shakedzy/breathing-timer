let inTime, holdTime, outTime, pauseTime;
let currentPhase = "";
let elapsedMillis = 0;
let interval;
let isRunning = false;
let maxDashArray = 471;  // This is 2 * pi * 75 (circle's radius)
let audioContext;
let currentOscillator;
let currentGain;

function stopCurrentTone() {
  if (currentOscillator) {
    currentGain.gain.cancelScheduledValues(audioContext.currentTime);
    currentGain.gain.setValueAtTime(0, audioContext.currentTime);
    currentOscillator.stop(audioContext.currentTime);
    currentOscillator = null;
    currentGain = null;
  }
}

function playTone(frequency, duration) {
  // Stop any previously playing tone
  stopCurrentTone();

  // Create new AudioContext if it doesn't exist or if it was closed
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  currentOscillator = audioContext.createOscillator();
  currentOscillator.type = 'sine';
  currentOscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  currentGain = audioContext.createGain();
  currentGain.gain.setValueAtTime(0, audioContext.currentTime);
  currentGain.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.01);
  currentGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

  currentOscillator.connect(currentGain);
  currentGain.connect(audioContext.destination);

  currentOscillator.start(audioContext.currentTime);
  // Ensure the oscillator stops after the specified duration
  currentOscillator.stop(audioContext.currentTime + duration);
}

function formatTime(millis) {
    let seconds = Math.floor(millis / 1000);
    let deciseconds = Math.floor((millis % 1000) / 100);
    return seconds + "." + deciseconds;
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
        let phaseFrequency = {
            "in": 293.66,
            "hold": 329.63,
            "out": 392,
            "pause": 440
        }[phase];
        playTone(phaseFrequency, 2);
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

function setPerfectBreathing() {
    // Set inhale and exhale times to 5.5 seconds
    document.getElementById('inTime').value = 5.5;
    document.getElementById('outTime').value = 5.5;

    // Set hold and pause times to 0
    document.getElementById('holdTime').value = 0;
    document.getElementById('pauseTime').value = 0;

    // Uncheck the hold and pause checkboxes
    document.getElementById('holdCheck').checked = false;
    document.getElementById('pauseCheck').checked = false;

    updateAvgCyclesPerMinute();
}

function setBoxBreathing() {
    document.getElementById('inTime').value = 4;
    document.getElementById('holdTime').value = 4;
    document.getElementById('outTime').value = 4;
    document.getElementById('pauseTime').value = 4;

    // Check the hold and pause checkboxes
    document.getElementById('holdCheck').checked = true;
    document.getElementById('pauseCheck').checked = true;

    updateAvgCyclesPerMinute();
}

function setExtendedBoxBreathing() {
    document.getElementById('inTime').value = 4;
    document.getElementById('holdTime').value = 4;
    document.getElementById('outTime').value = 6;
    document.getElementById('pauseTime').value = 2;

    // Check the hold and pause checkboxes
    document.getElementById('holdCheck').checked = true;
    document.getElementById('pauseCheck').checked = true;

    updateAvgCyclesPerMinute();
}

function setExtendedExhaleBreathing() {
    document.getElementById('inTime').value = 4;
    document.getElementById('holdTime').value = 0;
    document.getElementById('outTime').value = 6;
    document.getElementById('pauseTime').value = 0;

    // Uncheck the hold and pause checkboxes
    document.getElementById('holdCheck').checked = false;
    document.getElementById('pauseCheck').checked = false;

    updateAvgCyclesPerMinute();
}

function set478Breathing() {
    document.getElementById('inTime').value = 4;
    document.getElementById('holdTime').value = 7;
    document.getElementById('outTime').value = 8;
    document.getElementById('pauseTime').value = 0;

    document.getElementById('holdCheck').checked = true;
    document.getElementById('pauseCheck').checked = false;

    updateAvgCyclesPerMinute();
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
