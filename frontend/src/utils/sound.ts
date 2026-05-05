// Simple sound effects for MathBuddy
// Uses Web Audio API to generate tones (no external audio files needed)

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  if (!audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}

export type SoundType = 'correct' | 'incorrect' | 'levelup' | 'complete' | 'wrongstreak';

export function playSound(type: SoundType) {
  switch (type) {
    case 'correct':
      // Happy ascending two-tone beep
      playTone(523, 0.1, 'sine', 0.25);  // C5
      setTimeout(() => playTone(659, 0.15, 'sine', 0.25), 80);  // E5
      break;
    case 'incorrect':
      // Low sad single tone
      playTone(220, 0.2, 'triangle', 0.2);  // A3
      break;
    case 'levelup':
      // Triumphant three-tone fanfare
      playTone(392, 0.12, 'square', 0.2);  // G4
      setTimeout(() => playTone(523, 0.12, 'square', 0.2), 100);  // C5
      setTimeout(() => playTone(659, 0.2, 'square', 0.2), 200);  // E5
      break;
    case 'complete':
      // Cheerful success melody
      playTone(523, 0.1, 'sine', 0.2);
      setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 100);
      setTimeout(() => playTone(784, 0.2, 'sine', 0.2), 200);
      break;
    case 'wrongstreak':
      // Warning two short beeps
      playTone(300, 0.08, 'square', 0.15);
      setTimeout(() => playTone(300, 0.08, 'square', 0.15), 150);
      break;
  }
}

export function playStreak(streakCount: number) {
  if (streakCount >= 10) {
    // Big celebration - rapid ascending tones
    playTone(523, 0.08, 'square', 0.2);
    setTimeout(() => playTone(587, 0.08, 'square', 0.2), 60);
    setTimeout(() => playTone(659, 0.08, 'square', 0.2), 120);
    setTimeout(() => playTone(698, 0.08, 'square', 0.2), 180);
    setTimeout(() => playTone(784, 0.15, 'square', 0.2), 240);
  } else if (streakCount >= 5) {
    // Quick celebration
    playTone(523, 0.08, 'square', 0.2);
    setTimeout(() => playTone(659, 0.15, 'square', 0.2), 80);
  }
}
