// Sound effects for MathBuddy
// Uses the Web Speech API (no external audio files needed)

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

export type SoundType = 'correct' | 'incorrect' | 'levelup' | 'complete' | 'wrongstreak';

/** Speak text via Text-to-Speech (fires and forgets) */
function speak(text: string, pitch = 1.1, rate = 1.0) {
  if (!synth) return;
  // Cancel any ongoing speech to avoid overlap
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = pitch;
  utterance.rate = rate;
  utterance.volume = 0.8;
  synth.speak(utterance);
}

/** Play a sound effect by type */
export function playSound(type: SoundType) {
  switch (type) {
    case 'correct':
      speak('好嘢！', 1.2, 1.1);
      break;
    case 'incorrect':
      speak('加油！', 0.9, 1.0);
      break;
    case 'levelup':
      speak('升級了！', 1.3, 1.05);
      break;
    case 'complete':
      speak('你完成了！', 1.2, 1.0);
      break;
    case 'wrongstreak':
      speak('記得多練習這一題', 0.95, 0.95);
      break;
  }
}

/** Play encouraging message for streaks */
export function playStreak(streakCount: number) {
  if (streakCount >= 10) {
    speak(`連續${streakCount}題！你真係好犀利！`, 1.3, 1.0);
  } else if (streakCount >= 5) {
    speak(`係囉！連續${streakCount}題！`, 1.2, 1.05);
  }
}