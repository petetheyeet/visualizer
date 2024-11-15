import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';

const EnhancedAudioPatterns = ({ audioUrl, title = "Untitled Track" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [pattern, setPattern] = useState('crystalFlow');
  const [error, setError] = useState(null);
  const [frequencyData, setFrequencyData] = useState(new Array(32).fill(0));
  
  // Refs for audio context and animation
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);
  
  const mag = (x, y) => Math.sqrt(x * x + y * y);

  // Enhanced frequency analysis functions
  const getFrequencyEnergy = (frequencies, startBand, endBand, sensitivity = 1) => {
    const bandEnergy = frequencies.slice(startBand, endBand).reduce((a, b) => a + b, 0);
    return Math.pow(bandEnergy / ((endBand - startBand) * 255), sensitivity);
  };

  const patterns = {
    crystalFlow: (x, y, t, frequencies) => {
      const bassEnergy = getFrequencyEnergy(frequencies, 0, 4, 1.5);
      const lowMidEnergy = getFrequencyEnergy(frequencies, 4, 8, 1.2);
      const highMidEnergy = getFrequencyEnergy(frequencies, 8, 16, 1.3);
      const highEnergy = getFrequencyEnergy(frequencies, 16, 32, 1.4);
      
      const dx = x - 200;
      const dy = y - 200;
      const angle = Math.atan2(dy, dx);
      const d = mag(dx, dy);
      
      const crystallization = Math.sin(angle * (3 + highMidEnergy * 5)) * 
                            Math.sin(d * 0.05 + bassEnergy * 2);
      
      return [
        x + dx * crystallization * (0.3 + lowMidEnergy) + 
          Math.sin(dy * 0.02 + t) * (10 + highEnergy * 20),
        y + dy * crystallization * (0.3 + lowMidEnergy) + 
          Math.cos(dx * 0.02 + t) * (10 + highEnergy * 20)
      ];
    },

    neuralPulse: (x, y, t, frequencies) => {
      const bassEnergy = getFrequencyEnergy(frequencies, 0, 4, 1.8);
      const midEnergy = getFrequencyEnergy(frequencies, 4, 16, 1.4);
      const highEnergy = getFrequencyEnergy(frequencies, 16, 32, 1.2);
      
      const k = (x - 200) / (8 + bassEnergy * 10);
      const e = (y - 200) / (8 + bassEnergy * 10);
      const d = mag(k, e);
      
      const pulse = Math.sin(d - t * (1 + midEnergy)) * 
                   Math.exp(-d * (0.1 + highEnergy * 0.2));
      
      return [
        x + 30 * pulse * Math.cos(d * 0.5 + t + midEnergy * Math.PI),
        y + 30 * pulse * Math.sin(d * 0.5 + t + midEnergy * Math.PI)
      ];
    },

    spectrumVortex: (x, y, t, frequencies) => {
      const bassEnergy = getFrequencyEnergy(frequencies, 0, 4, 2);
      const midEnergy = getFrequencyEnergy(frequencies, 4, 16, 1.5);
      const highEnergy = getFrequencyEnergy(frequencies, 16, 32, 1.3);
      
      const dx = x - 200;
      const dy = y - 200;
      const d = mag(dx, dy);
      const angle = Math.atan2(dy, dx);
      
      const spiral = angle + d * (0.02 + bassEnergy * 0.04);
      const distortion = Math.sin(spiral + t) * (1 + midEnergy);
      
      return [
        200 + (d + highEnergy * 20) * Math.cos(spiral) * distortion,
        200 + (d + highEnergy * 20) * Math.sin(spiral) * distortion
      ];
    },

    quantumField: (x, y, t, frequencies) => {
      const bassEnergy = getFrequencyEnergy(frequencies, 0, 4, 2);
      const midEnergy = getFrequencyEnergy(frequencies, 4, 16, 1.6);
      const highEnergy = getFrequencyEnergy(frequencies, 16, 32, 1.4);
      
      const dx = x - 200;
      const dy = y - 200;
      const d = mag(dx, dy);
      
      const quantum = Math.sin(d * (0.1 + highEnergy * 0.2) - t);
      const field = Math.cos(Math.atan2(dy, dx) * (2 + midEnergy * 4));
      
      return [
        x + (dx * quantum * field * (0.5 + bassEnergy)) * (1 + midEnergy),
        y + (dy * quantum * field * (0.5 + bassEnergy)) * (1 + midEnergy)
      ];
    },

    fracturedSpace: (x, y, t, frequencies) => {
      const bassEnergy = getFrequencyEnergy(frequencies, 0, 4, 2);
      const midEnergy = getFrequencyEnergy(frequencies, 4, 16, 1.7);
      const highEnergy = getFrequencyEnergy(frequencies, 16, 32, 1.5);
      
      const k = x / (6 + bassEnergy * 10) - 30;
      const e = y / (6 + bassEnergy * 10) - 30;
      const d = mag(k, e) ** 2 / (80 + midEnergy * 40);
      
      const fracture = Math.sin(d - t + highEnergy * Math.PI) * 
                      Math.cos(d * (0.5 + midEnergy));
      
      return [
        x + 20 * Math.sin(y * 0.05 + t) * fracture * (1 + bassEnergy),
        y + 20 * Math.cos(x * 0.05 + t) * fracture * (1 + bassEnergy)
      ];
    }
  };

  // Audio context setup
  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      // Enhanced FFT settings for better frequency resolution
      analyserRef.current.fftSize = 8192;
      analyserRef.current.smoothingTimeConstant = 0.8;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -20;
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

  const draw = (ctx) => {
    if (!analyserRef.current || !isPlaying) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Enhanced frequency band processing
    const bands = new Array(32).fill(0);
    const binSize = Math.floor(bufferLength / 32);
    
    for (let i = 0; i < 32; i++) {
      let sum = 0;
      for (let j = 0; j < binSize; j++) {
        // Logarithmic scaling for more natural frequency response
        const value = dataArray[i * binSize + j];
        sum += value * Math.log10(10 + value);
      }
      bands[i] = sum / binSize;
    }
    setFrequencyData(bands);

    // Enhanced visual effects
    const bassEnergy = getFrequencyEnergy(bands, 0, 4, 1.5);
    const midEnergy = getFrequencyEnergy(bands, 4, 16, 1.3);
    const highEnergy = getFrequencyEnergy(bands, 16, 32, 1.2);

    // Dynamic fade effect based on energy
    ctx.fillStyle = `rgba(6, 6, 6, ${0.1 + bassEnergy * 0.1})`;
    ctx.fillRect(0, 0, 400, 400);
    
    // Enhanced color response
    const hue = (210 + 
                bassEnergy * 40 + 
                midEnergy * 20 + 
                highEnergy * 30 + 
                timeRef.current * 5) % 360;
    const saturation = 70 + highEnergy * 30;
    const lightness = 45 + bassEnergy * 35;
    const alpha = 0.6 + midEnergy * 0.4;
    
    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    ctx.beginPath();
    
    const patternFunc = patterns[pattern];
    // Adaptive step size based on energy
    const step = Math.max(4, 8 - bassEnergy * 4);
    
    for (let y = 50; y < 350; y += step) {
      for (let x = 50; x < 350; x += step) {
        const [posX, posY] = patternFunc(x, y, timeRef.current, bands);
        if (x === 50 && y === 50) {
          ctx.moveTo(posX, posY);
        } else {
          ctx.lineTo(posX, posY);
        }
      }
    }
    
    // Dynamic line width based on energy
    ctx.lineWidth = 1 + bassEnergy * 0.5;
    ctx.stroke();
    
    timeRef.current += 0.02 * (1 + bassEnergy * 0.5);
    animationFrameRef.current = requestAnimationFrame(() => draw(ctx));
  };

  useEffect(() => {
    if (isPlaying) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        animationFrameRef.current = requestAnimationFrame(() => draw(ctx));
      }
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, pattern]);

  const togglePlay = async () => {
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
    <div className="flex flex-col items-center gap-4 p-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        className="hidden"
        crossOrigin="anonymous"
      />
      
      <div className="flex items-center gap-4">
        <select 
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700"
        >
          <option value="crystalFlow">Crystal Flow</option>
          <option value="neuralPulse">Neural Pulse</option>
          <option value="spectrumVortex">Spectrum Vortex</option>
          <option value="quantumField">Quantum Field</option>
          <option value="fracturedSpace">Fractured Space</option>
        </select>

        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>

        <button
          onClick={toggleMute}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="bg-gray-900 rounded-lg shadow-lg"
      />
    </div>
  );
};

export default EnhancedAudioPatterns;