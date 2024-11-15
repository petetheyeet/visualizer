import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import './AudioVisualizer.scss';

const AudioVisualizer = ({ audioUrl, title = "Untitled Track" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [visualData, setVisualData] = useState(new Array(32).fill(0));
  const [error, setError] = useState(null);
  const [formatSupported, setFormatSupported] = useState(true);
  
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      // Increase FFT size for even better low frequency resolution
      analyserRef.current.fftSize = 4096;
      // Adjust smoothing for better response
      analyserRef.current.smoothingTimeConstant = 0.85;
      // Widen the decibel range for better dynamics
      analyserRef.current.minDecibels = -85;
      analyserRef.current.maxDecibels = -25;
    } catch (err) {
      console.error("Audio Context Init Error:", err);
      setError(`Audio Context Error: ${err.message}`);
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = document.createElement('audio');
    const canPlayOgg = audio.canPlayType('audio/ogg; codecs="vorbis"');
    const isOggFile = audioUrl?.toLowerCase().endsWith('.ogg');
    
    if (isOggFile && !canPlayOgg) {
      setFormatSupported(false);
      setError("Your browser doesn't support OGG audio format");
      return;
    }

    setFormatSupported(true);
    setError(null);
    
    const handleError = (e) => {
      console.error("Audio Element Error:", e);
      setError(`Audio Error: ${e.type}`);
    };

    if (audioRef.current) {
      audioRef.current.addEventListener('error', handleError);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('error', handleError);
      }
    };
  }, [audioUrl]);

  const connectAudioNodes = async () => {
    if (!audioContextRef.current || !audioRef.current) return;

    try {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }

      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    } catch (err) {
      console.error("Node Connection Error:", err);
      setError(`Connection Error: ${err.message}`);
    }
  };

  const updateVisualization = () => {
    if (!analyserRef.current || !isPlaying) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Define frequency bands with extra attention to low frequencies
    const frequencyBands = [
      { start: 20, end: 40 },    // Sub-bass
      { start: 40, end: 80 },    // Bass
      { start: 80, end: 120 },   // Low-mids
      { start: 120, end: 180 },  // Mids
      { start: 180, end: 250 },
      { start: 250, end: 350 },
      { start: 350, end: 500 },
      { start: 500, end: 700 },
      { start: 700, end: 1000 },
      { start: 1000, end: 1400 },
      { start: 1400, end: 1800 },
      { start: 1800, end: 2300 },
      { start: 2300, end: 2800 },
      { start: 2800, end: 3400 },
      { start: 3400, end: 4000 },
      { start: 4000, end: 4800 },
      { start: 4800, end: 5600 },
      { start: 5600, end: 6400 },
      { start: 6400, end: 7400 },
      { start: 7400, end: 8400 },
      { start: 8400, end: 9400 },
      { start: 9400, end: 10400 },
      { start: 10400, end: 11400 },
      { start: 11400, end: 12400 },
      { start: 12400, end: 13400 },
      { start: 13400, end: 14400 },
      { start: 14400, end: 15400 },
      { start: 15400, end: 16400 },
      { start: 16400, end: 17400 },
      { start: 17400, end: 18400 },
      { start: 18400, end: 19400 },
      { start: 19400, end: 20000 }
    ];

    const sampleRate = audioContextRef.current.sampleRate;
    const newData = frequencyBands.map(({ start, end }, index) => {
      // Convert frequencies to FFT bins
      const startBin = Math.floor((start * bufferLength) / (sampleRate / 2));
      const endBin = Math.floor((end * bufferLength) / (sampleRate / 2));
      
      // Get the maximum value in the frequency range
      let maxValue = 0;
      for (let i = startBin; i < endBin && i < bufferLength; i++) {
        maxValue = Math.max(maxValue, dataArray[i]);
      }
      
      // Apply frequency-dependent scaling
      let boost;
      if (index < 3) {
        // Boost very low frequencies more
        boost = 1.1;
      } else if (index < 8) {
        // Moderate boost for low-mids
        boost = 1.4;
      } else if (index < 16) {
        // Small boost for mids
        boost = 1.2;
      } else {
        // Normal scaling for highs
        boost = 1;
      }

      // Apply non-linear scaling and boosting
      const scaled = Math.pow(maxValue / 255, 0.8) * 100 * boost;
      
      // Ensure we don't exceed 100%
      return Math.min(scaled, 100);
    });

    setVisualData(newData);
    animationFrameRef.current = requestAnimationFrame(updateVisualization);
  };

  useEffect(() => {
    if (isPlaying) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    if (!formatSupported) return;

    try {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      if (!sourceRef.current) {
        await connectAudioNodes();
      }

      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        const playPromise = audioRef.current?.play();
        if (playPromise) {
          await playPromise;
        }
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error("Playback Error:", err);
      setError(`Playback Error: ${err.message}`);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="audio-visualizer">
      {formatSupported && (
        <audio
          ref={audioRef}
          src={audioUrl}
          className="hidden"
          crossOrigin="anonymous"
        />
      )}
      
      <div className="header">
        <h2>{title}</h2>
        {audioUrl && (
          <span className="format-badge">
            {audioUrl.split('.').pop()?.toUpperCase()}
          </span>
        )}
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      
      <div className="visualization">
        <div className="bars">
          {visualData.map((height, index) => (
            <div
              key={index}
              className="bar"
              style={{ 
                height: `${height}%`,
                backgroundColor: `hsl(${210 + (index * 2)}, 70%, ${50 + (height * 0.2)}%)`
              }}
            />
          ))}
        </div>
      </div>
      <div className="controls">
        <button
          onClick={togglePlay}
          disabled={!audioUrl || !formatSupported}
          className="play-button"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>

        <button
          onClick={toggleMute}
          disabled={!audioUrl || !formatSupported}
          className="mute-button"
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>
    </div>
  );
};

export default AudioVisualizer;