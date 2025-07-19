let inTime, holdTime, outTime, pauseTime;
let currentPhase = "";
let elapsedMillis = 0;
let interval;
let isRunning = false;
let isTransitioning = false; // Flag to prevent multiple transitions
let maxDashArray = 471;  // This is 2 * pi * 75 (circle's radius)
let audioContext;
let currentOscillator;
let currentGain;

// Session duration variables
let sessionDurationMs = 0;
let sessionElapsedMs = 0;
let sessionInterval;
let sessionActive = false;

function stopCurrentTone() {
  if (currentOscillator) {
    try {
      currentGain.gain.cancelScheduledValues(audioContext.currentTime);
      currentGain.gain.setValueAtTime(0, audioContext.currentTime);
      currentOscillator.stop(audioContext.currentTime);
    } catch (e) {
      // Oscillator might already be stopped
    }
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

function playSessionEndTone() {
  // Play a calm bell-like tone sequence
  playBellTone(220, 2.5);    // A3 - first gentle bell
  setTimeout(() => playBellTone(330, 2.5), 1000);  // E4 - second bell
  setTimeout(() => playBellTone(440, 3.5), 2000);  // A4 - final bell with longer sustain
}

function playBellTone(frequency, duration) {
  // Stop any previously playing tone
  stopCurrentTone();

  // Create new AudioContext if it doesn't exist or if it was closed
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Create the fundamental frequency
  currentOscillator = audioContext.createOscillator();
  currentOscillator.type = 'sine';
  currentOscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  // Create a second oscillator for the harmonic (gives bell-like quality)
  let harmonic = audioContext.createOscillator();
  harmonic.type = 'sine';
  harmonic.frequency.setValueAtTime(frequency * 2.5, audioContext.currentTime); // Bell-like harmonic

  // Create gain nodes for both oscillators
  currentGain = audioContext.createGain();
  let harmonicGain = audioContext.createGain();

  // Bell-like envelope: quick attack, long decay - INCREASED VOLUME
  currentGain.gain.setValueAtTime(0, audioContext.currentTime);
  currentGain.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.05); // Increased from 0.3 to 0.6
  currentGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration); // Long decay

  harmonicGain.gain.setValueAtTime(0, audioContext.currentTime);
  harmonicGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05); // Increased from 0.1 to 0.2
  harmonicGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  // Connect oscillators to their gain nodes and to destination
  currentOscillator.connect(currentGain);
  harmonic.connect(harmonicGain);
  currentGain.connect(audioContext.destination);
  harmonicGain.connect(audioContext.destination);

  // Start both oscillators
  currentOscillator.start(audioContext.currentTime);
  harmonic.start(audioContext.currentTime);
  
  // Stop both oscillators after the duration
  currentOscillator.stop(audioContext.currentTime + duration);
  harmonic.stop(audioContext.currentTime + duration);
}

function formatTime(millis) {
    let seconds = Math.floor(millis / 1000);
    let deciseconds = Math.floor((millis % 1000) / 100);
    return seconds + "." + deciseconds;
}

function formatSessionTime(millis) {
    if (millis <= 0) {
        return "0:00";
    }
    let totalSeconds = Math.floor(millis / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
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
    if (document.getElementById("beepOnPhaseChange").checked && phase !== '') {
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
    // Ensure smooth progression from 0 to 100%
    let percentage = Math.min(elapsedMillis / phaseTime, 1);
    let offset = maxDashArray - (maxDashArray * percentage);
    progressCircle.setAttribute("stroke-dashoffset", offset);
}

function updateSessionCountdown() {
    if (sessionActive) {
        let remainingMs = sessionDurationMs - sessionElapsedMs;
        if (remainingMs <= 0) {
            document.getElementById("sessionTimeLeft").textContent = "Finishing last round...";
        } else {
            document.getElementById("sessionTimeLeft").textContent = formatSessionTime(remainingMs);
        }
    }
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

function stopBreathing() {
    clearInterval(interval);
    if (sessionInterval) {
        clearInterval(sessionInterval);
    }
    document.getElementById("startBtn").textContent = "Start";
    document.querySelector(".circle-progress").setAttribute("stroke-dashoffset", maxDashArray);
    document.getElementById("elapsedTime").textContent = formatTime(0);
    document.getElementById("sessionCountdown").style.display = "none";
    updatePhaseDisplay('');
    isRunning = false;
    isTransitioning = false; // Reset transition flag
    sessionActive = false;
    sessionElapsedMs = 0;
}

function checkSessionEnd() {
    // Check if session should end and we're at the start of a new cycle (in phase)
    if (sessionActive && sessionElapsedMs >= sessionDurationMs && currentPhase === "in" && elapsedMillis === 0) {
        playSessionEndTone();
        stopBreathing();
        return true;
    }
    return false;
}

function startBreathing() {
    if (isRunning) {
        stopBreathing();
        return;
    }

    // Use parseFloat instead of parseInt to handle decimal values
    inTime = parseFloat(document.getElementById("inTime").value) * 1000;
    holdTime = parseFloat(document.getElementById("holdTime").value) * 1000;
    outTime = parseFloat(document.getElementById("outTime").value) * 1000;
    pauseTime = parseFloat(document.getElementById("pauseTime").value) * 1000;

    elapsedMillis = 0;
    currentPhase = "in";
    updatePhaseDisplay(currentPhase);

    // Initialize session if enabled
    if (document.getElementById("sessionCheck").checked) {
        sessionDurationMs = parseFloat(document.getElementById("sessionTime").value) * 60 * 1000;
        sessionElapsedMs = 0;
        sessionActive = true;
        document.getElementById("sessionCountdown").style.display = "block";
        updateSessionCountdown();
        
        sessionInterval = setInterval(function() {
            sessionElapsedMs += 100;
            updateSessionCountdown();
        }, 100);
    } else {
        sessionActive = false;
        document.getElementById("sessionCountdown").style.display = "none";
    }

    interval = setInterval(function() {
        // Skip if we're in transition
        if (isTransitioning) return;
        
        elapsedMillis += 100;
        document.getElementById("elapsedTime").textContent = formatTime(elapsedMillis);

        let phaseTime = {
            "in": inTime,
            "hold": holdTime,
            "out": outTime,
            "pause": pauseTime
        }[currentPhase];

        // Update progress circle during the phase
        updateProgressCircle(phaseTime);

        // Check if phase is complete
        if (elapsedMillis >= phaseTime) {
            isTransitioning = true; // Set transition flag
            
            // Ensure the progress circle shows exactly 100% completion
            let progressCircle = document.querySelector(".circle-progress");
            progressCircle.setAttribute("stroke-dashoffset", 0);
            
            // Wait a moment to show the completed state before transitioning
            setTimeout(() => {
                // Reset for next phase
                elapsedMillis = 0;
                currentPhase = getNextPhase();
                updatePhaseDisplay(currentPhase);
                
                // Reset circle for new phase (back to empty/starting position)
                progressCircle.setAttribute("stroke-dashoffset", maxDashArray);
                
                // Check if session should end after completing a cycle
                checkSessionEnd();
                
                isTransitioning = false; // Clear transition flag
            }, 200); // 200ms delay to show completion
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
document.getElementById("sessionTime").addEventListener("input", updateAvgCyclesPerMinute);
document.getElementById("sessionCheck").addEventListener("change", updateAvgCyclesPerMinute);

// Initial calculation
updateAvgCyclesPerMinute();
