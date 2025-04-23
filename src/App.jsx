import { useEffect, useState, useRef } from 'react';
import './styles.css';

// List of cue options that can be triggered during the countdown
const CUE_OPTIONS = [
  { id: '40min', label: '40 Minutes Remaining' },
  { id: '30min', label: '30 Minutes Remaining' },
  { id: '10min', label: '10 Minutes Remaining' },
  { id: '5min', label: '5 Minutes Remaining' },
  { id: 'blackout', label: 'Blackout' },
  { id: 'gameover', label: 'Game Over' }
];

function App() {
  // State variables
  const [duration, setDuration] = useState(60); // duration in minutes
  const [selectedCues, setSelectedCues] = useState([]); // array of selected cue IDs
  const [timeLeft, setTimeLeft] = useState(0); // countdown in seconds
  const [running, setRunning] = useState(false); // is the countdown active?

  // Refs to store persistent values between renders
  const intervalRef = useRef(null); // ID of the interval timer
  const mainAudioRef = useRef(null); // audio element for the main track
  const cueScheduleRef = useRef({}); // map of cueId to the time (in seconds) it should trigger
  const playedCuesRef = useRef(new Set()); // set of already played cueIds
  const cueAudioRefs = useRef({}); // map of cueId to their corresponding Audio objects

  // Toggle a cue in the selectedCues list
  const handleToggleCue = (cueId) => {
    setSelectedCues((prev) =>
      prev.includes(cueId) ? prev.filter((id) => id !== cueId) : [...prev, cueId]
    );
  };

  // Update duration when the input field changes
  const handleDurationChange = (e) => {
    const value = Number(e.target.value);
    if (value > 0) setDuration(value);
  };

  // Format time in seconds to MM:SS
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Start the countdown and initialize audio + cues
  const handleStart = () => {
    setRunning(true);
    const totalSeconds = duration * 60;
    setTimeLeft(totalSeconds);

    const schedule = {};

    // Calculate when each selected cue should trigger
    selectedCues.forEach(cueId => {
      if (cueId === 'blackout') {
        schedule[cueId] = 60; // play at 1 minute left
      } else if (cueId === 'gameover') {
        schedule[cueId] = 5; // play at 5 seconds left
      } else {
        const match = cueId.match(/^([0-9]+)min$/);
        if (match) {
          const minutes = parseInt(match[1], 10);
          schedule[cueId] = minutes * 60; // e.g. 5min cue triggers at 300 seconds
        }
      }

      // Preload audio if not already cached
      if (!cueAudioRefs.current[cueId]) {
        cueAudioRefs.current[cueId] = new Audio(`${cueId}.mp3`);
      }
    });

    cueScheduleRef.current = schedule;
    console.log('✅ Cue schedule updated:', cueScheduleRef.current);

    // Start the main background track
    mainAudioRef.current = new Audio('main-track.mp3');
    mainAudioRef.current.play().catch(err => console.error("Audio play error:", err));

    // Start decrementing time every second
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
  };

  // Hook to check and trigger cues during the countdown
  useEffect(() => {
    if (!running) return;

    console.log("⏱ Current timeLeft:", timeLeft);
    console.log("📋 Cue schedule:", cueScheduleRef.current);

    // Stop timer and audio when countdown finishes
    if (timeLeft === 0) {
      clearInterval(intervalRef.current);
      setRunning(false);
      mainAudioRef.current?.pause();
    }

    // Check if any cue should be triggered now
    for (const [cueId, triggerAt] of Object.entries(cueScheduleRef.current)) {
      const shouldTrigger = timeLeft === triggerAt;
      const notPlayedYet = !playedCuesRef.current.has(cueId);

      if (shouldTrigger && notPlayedYet) {
        console.log(`🚨 MATCH! CueId: ${cueId}, timeLeft: ${timeLeft}, should trigger at: ${triggerAt}`);

        const cueAudio = cueAudioRefs.current[cueId];
        if (cueAudio) {
          cueAudio.play()
            .then(() => console.log(`🔔 Played: ${cueId}.mp3`))
            .catch(err => console.error(`❌ Failed to play ${cueId}.mp3`, err));
        }

        playedCuesRef.current.add(cueId);
      }
    }
  }, [timeLeft, running]);

  // Compute how much of the progress bar should be filled
  const progressPercent = running ? (1 - timeLeft / (duration * 60)) * 100 : 0;

  return (
    <div className="container">
      <h2>Escape Room Setup</h2>

      <div style={{ marginTop: '20px' }}>
        {running ? (
          <>
            {/* Countdown display */}
            <div style={{ fontSize: '2rem', marginTop: '20px', color: '#333', fontWeight: 'bold' }}>
              Time Left: {formatTime(timeLeft)}
            </div>

            {/* Visual progress bar */}
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>

            {/* Debug or info line for cue times */}
            <p style={{ color: '#777', fontSize: '0.9rem' }}>
              Cue triggers (in seconds): {Object.values(cueScheduleRef.current).join(', ') || 'None'}
            </p>
          </>
        ) : (
          <>
            {/* Setup screen: input duration */}
            <label>
              Escape Room Duration (minutes):
              <input
                type="number"
                min="1"
                value={duration}
                onChange={handleDurationChange}
              />
            </label>

            {/* Cue selection UI */}
            <h3>Select Cue Notifications:</h3>
            <div className="cue-list">
              {CUE_OPTIONS.map(({ id, label }) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={selectedCues.includes(id)}
                    onChange={() => handleToggleCue(id)}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Start button */}
            <button onClick={handleStart} style={{ marginTop: '20px' }}>
              ▶️ Start
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;





