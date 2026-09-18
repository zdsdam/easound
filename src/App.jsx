import { useEffect, useState, useRef } from 'react';
import './styles.css';
import io from 'socket.io-client'; // ✅ For trap system socket connection

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
  const [trapMessages, setTrapMessages] = useState([]); // ✅ Trap messages from backend
  const [serverConnected, setServerConnected] = useState(false);

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
          schedule[cueId] = minutes * 60;
        }
      }

      // Preload audio if not already cached
      if (!cueAudioRefs.current[cueId]) {
        cueAudioRefs.current[cueId] = new Audio(`${import.meta.env.BASE_URL}${cueId}.mp3`);
      }
    });

    cueScheduleRef.current = schedule;
    console.log('✅ Cue schedule updated:', cueScheduleRef.current);

    // Start the main background track
    mainAudioRef.current = new Audio(`${import.meta.env.BASE_URL}main-track.mp3`);
    mainAudioRef.current.play().catch(err => console.error("Audio play error:", err));

    // Start decrementing time every second
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
  };

  // ✅ Countdown & cue trigger logic (UNCHANGED)
  useEffect(() => {
    if (!running) return;

    console.log("⏱ Current timeLeft:", timeLeft);
    console.log("📋 Cue schedule:", cueScheduleRef.current);

    if (timeLeft === 0) {
      clearInterval(intervalRef.current);
      setRunning(false);
      mainAudioRef.current?.pause();
    }

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

  // Trap system WebSocket listener
  useEffect(() => {
    const socketUrl = import.meta.env.DEV
      ? (import.meta.env.VITE_SOCKET_URL?.trim() || window.location.origin)
      : window.location.origin;
    const socket = io(socketUrl);

    const handleConnect = () => setServerConnected(true);
    const handleDisconnect = () => setServerConnected(false);
    const handleTrap = (data) => {
      if (!data || data.event !== 'trap_triggered'
          || typeof data.device_id !== 'string'
          || typeof data.location !== 'string'
          || !Number.isInteger(data.sequence)
          || typeof data.received_at !== 'string'
          || Number.isNaN(Date.parse(data.received_at))) {
        console.error('Invalid trap event:', data);
        return;
      }
      const { device_id, event, location, sequence, received_at } = data;
      console.log('🚨 Trap Triggered:', location);
      setTrapMessages(prev => [...prev, { device_id, event, location, sequence, received_at }]);

      const trapSound = new Audio(`${import.meta.env.BASE_URL}trap.mp3`);
      trapSound.play().catch(err => console.error("Trap sound failed:", err));
    };

    // Register once per mount, never inside the reconnecting connect handler.
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleDisconnect);
    socket.on('trap_triggered', handleTrap);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleDisconnect);
      socket.off('trap_triggered', handleTrap);
      socket.disconnect();
    };
  }, []);

  // Compute how much of the progress bar should be filled
  const progressPercent = running ? (1 - timeLeft / (duration * 60)) * 100 : 0;

  return (
    <div className="container">
      <h2>Escape Room Setup</h2>
      <p role="status" style={{ color: serverConnected ? '#176b32' : '#a12622' }}>
        Server: {serverConnected ? 'Connected' : 'Disconnected'}
      </p>

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

        {/* ✅ Display trap messages if any are received */}
        {trapMessages.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h3>Trap Activations</h3>
            <ul>
              {trapMessages.map((trap, i) => (
                <li key={i} style={{ color: 'red', fontWeight: 'bold' }}>
                  {trap.location} —{' '}
                  <time dateTime={trap.received_at} title={trap.received_at}>
                    {new Date(trap.received_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
