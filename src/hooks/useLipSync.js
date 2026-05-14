import { useState, useEffect, useRef } from 'react';

/**
 * Hook to handle lip sync by analyzing audio amplitude
 * @param {HTMLAudioElement | null} audioEl - The audio element to analyze
 * @returns {number} mouthOpen - Value from 0 to 1 representing how much the mouth should open
 */
export const useLipSync = (audioEl) => {
  const [mouthOpen, setMouthOpen] = useState(0);
  const animationFrameRef = useRef();
  const analyserRef = useRef();
  const dataArrayRef = useRef();
  const sourceRef = useRef();
  const audioContextRef = useRef();

  useEffect(() => {
    if (!audioEl) {
      console.log('[LipSync] No audio element provided yet');
      return;
    }

    console.log('[LipSync] Audio element detected, setting up listeners');

    const startAnalysis = () => {
      console.log('[LipSync] Audio play detected, starting analysis');
      try {
        if (!audioContextRef.current) {
          console.log('[LipSync] Creating AudioContext');
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          const bufferLength = analyserRef.current.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);
          
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioEl);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
        }

        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }

        const updateMouth = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          const average = sum / dataArrayRef.current.length;
          
          // Normalize to 0-1 (with a sensitivity factor)
          const normalized = Math.min(1, average / 40); 
          
          // Smoothing (more reactive for lip sync)
          setMouthOpen(prev => prev * 0.3 + normalized * 0.7);
          
          animationFrameRef.current = requestAnimationFrame(updateMouth);
        };

        updateMouth();
      } catch (err) {
        console.error('[LipSync] Error starting analysis:', err);
      }
    };

    const stopAnalysis = () => {
      console.log('[LipSync] Audio stopped/ended, stopping analysis');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setMouthOpen(0);
    };

    audioEl.addEventListener('play', startAnalysis);
    audioEl.addEventListener('pause', stopAnalysis);
    audioEl.addEventListener('ended', stopAnalysis);

    return () => {
      console.log('[LipSync] Cleaning up listeners');
      audioEl.removeEventListener('play', startAnalysis);
      audioEl.removeEventListener('pause', stopAnalysis);
      audioEl.removeEventListener('ended', stopAnalysis);
      stopAnalysis();
    };
  }, [audioEl]);

  return mouthOpen;
};

export default useLipSync;
