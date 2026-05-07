import React, { useEffect, useRef, useState } from 'react';
import { SimliClient, generateSimliSessionToken, LogLevel } from 'simli-client';
import { getAuth } from '../lib/auth';

const SIMLI_API_KEY = import.meta.env.VITE_SIMLI_API_KEY || '';
const SIMLI_FACE_ID = import.meta.env.VITE_SIMLI_FACE_ID || '';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function InterviewAvatar({ currentQuestion, hideBackground, isAiSpeaking, onSpeakEnd }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const simliRef = useRef(null);
  const isSpeakingNowRef = useRef(false);
  const lastSpokenRef = useRef(null);
  const pendingSpeakRef = useRef(null); // text queued while Simli was still connecting
  const onSpeakEndRef = useRef(onSpeakEnd);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Keep callback ref current across renders
  useEffect(() => {
    onSpeakEndRef.current = onSpeakEnd;
  }, [onSpeakEnd]);

  // Initialize SimliClient once on mount
  useEffect(() => {
    if (!SIMLI_API_KEY || !SIMLI_FACE_ID) {
      setConnectionError('Simli credentials not configured');
      return;
    }

    let stopped = false;
    let client = null;

    // Releases any blocked interview flow on error or init failure
    function releaseBlockedSpeech() {
      if (pendingSpeakRef.current) {
        pendingSpeakRef.current = null;
        if (onSpeakEndRef.current) onSpeakEndRef.current();
      } else if (isSpeakingNowRef.current) {
        isSpeakingNowRef.current = false;
        if (onSpeakEndRef.current) onSpeakEndRef.current();
      }
    }

    async function initSimli() {
      try {
        const { session_token } = await generateSimliSessionToken({
          apiKey: SIMLI_API_KEY,
          config: {
            faceId: SIMLI_FACE_ID,
            handleSilence: true,
            maxSessionLength: 3600,
            maxIdleTime: 600,
            model: 'fasttalk',
          },
        });

        if (stopped) return;

        client = new SimliClient(
          session_token,
          videoRef.current,
          audioRef.current,
          null,           // ICE servers — not needed for livekit
          LogLevel.ERROR,
          'livekit'
        );

        simliRef.current = client;

        client.on('start', () => {
          if (!stopped) setIsConnected(true);
        });

        client.on('silent', () => {
          if (isSpeakingNowRef.current) {
            isSpeakingNowRef.current = false;
            if (onSpeakEndRef.current) onSpeakEndRef.current();
          }
        });

        client.on('error', (msg) => {
          console.error('Simli error:', msg);
          if (!stopped) setConnectionError('Avatar connection error');
          releaseBlockedSpeech();
        });

        await client.start();
      } catch (err) {
        console.error('Simli init error:', err);
        if (!stopped) setConnectionError('Failed to connect avatar');
        releaseBlockedSpeech();
      }
    }

    initSimli();

    return () => {
      stopped = true;
      if (simliRef.current) {
        simliRef.current.stop().catch(() => {});
        simliRef.current = null;
      }
      setIsConnected(false);
    };
  }, []);

  // When AI has a new question, either speak it or queue it if still connecting
  useEffect(() => {
    if (!isAiSpeaking || !currentQuestion) return;
    if (currentQuestion === lastSpokenRef.current) return;

    lastSpokenRef.current = currentQuestion;

    if (!simliRef.current || !isConnected) {
      // Simli still connecting — hold the text, speak once connected
      pendingSpeakRef.current = currentQuestion;
      return;
    }

    speakWithSimli(currentQuestion);
  }, [isAiSpeaking, currentQuestion, isConnected]);

  // When Simli connects, speak any text that arrived during connection
  useEffect(() => {
    if (!isConnected || !pendingSpeakRef.current) return;
    const text = pendingSpeakRef.current;
    pendingSpeakRef.current = null;
    speakWithSimli(text);
  }, [isConnected]);

  async function speakWithSimli(text) {
    const auth = getAuth();
    try {
      const response = await fetch(
        `${API_BASE}/api/candidate/interviews/tts?text=${encodeURIComponent(text)}`,
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );

      if (!response.ok) throw new Error(`TTS request failed: ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();

      // Decode MP3 at native sample rate
      const decodeCtx = new AudioContext();
      const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
      await decodeCtx.close();

      // Resample to 16 kHz mono — required by Simli
      const targetRate = 16000;
      const frameCount = Math.ceil(decoded.duration * targetRate);
      const offlineCtx = new OfflineAudioContext(1, frameCount, targetRate);
      const src = offlineCtx.createBufferSource();
      src.buffer = decoded;
      src.connect(offlineCtx.destination);
      src.start();
      const resampled = await offlineCtx.startRendering();

      // Float32 → Int16 PCM → Uint8Array
      const floats = resampled.getChannelData(0);
      const pcm = new Int16Array(floats.length);
      for (let i = 0; i < floats.length; i++) {
        pcm[i] = Math.max(-32768, Math.min(32767, Math.round(floats[i] * 32767)));
      }

      isSpeakingNowRef.current = true;
      simliRef.current.sendAudioData(new Uint8Array(pcm.buffer));
    } catch (err) {
      console.error('Simli speak error:', err);
      isSpeakingNowRef.current = false;
      if (onSpeakEndRef.current) onSpeakEndRef.current();
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'transparent',
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <audio ref={audioRef} autoPlay />
      {connectionError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,15,15,0.85)',
            color: '#f87171',
            fontSize: '11px',
            textAlign: 'center',
            padding: '8px',
            gap: '4px',
          }}
        >
          <span>Avatar unavailable</span>
          <span style={{ color: '#94a3b8', fontSize: '10px' }}>{connectionError}</span>
        </div>
      )}
    </div>
  );
}
