import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './GameBoard.css';
import vocabulary from '../data/vocabulary';
import { useGameAudio } from '../hooks/useGameAudio';
import { audioSpriteManifest, AUDIO_SPRITE_PATH } from '../data/audioSprites';

type Difficulty = 'simple' | 'medium' | 'hard';

interface WordData {
  english: string;
  hanzi: string;
  pinyin: string;
  difficulty: string;
  category: string;
}

interface BubbleData {
  id: number;
  word: WordData;
  x: number;
  y: number;
  slotIndex: number;
  cooldown: boolean;
  popping: boolean;
  flash: 'correct' | 'wrong' | null;
}

interface Props {
  categories: string[];
  difficulty: Difficulty;
  showPinyin: boolean;
  speakOnCorrect: boolean;
  onBackToMenu: () => void;
}

const DIFFICULTY_PARAMS: Record<Difficulty, {
  wordFilter: string[];
  maxBubbles: number;
  fallSpeedMs: number;
  pointsCorrect: number;
  penaltyWrong: number;
  goal: number;
}> = {
  simple: {
    wordFilter: ['simple'],
    maxBubbles: 4,
    fallSpeedMs: 40000,
    pointsCorrect: 10,
    penaltyWrong: 20,
    goal: 200,
  },
  medium: {
    wordFilter: ['simple', 'medium'],
    maxBubbles: 5,
    fallSpeedMs: 35000,
    pointsCorrect: 20,
    penaltyWrong: 40,
    goal: 400,
  },
  hard: {
    wordFilter: ['simple', 'medium', 'hard'],
    maxBubbles: 6,
    fallSpeedMs: 30000,
    pointsCorrect: 40,
    penaltyWrong: 80,
    goal: 800,
  },
};

const LOCK_THRESHOLD = 0.6;
const WRAP_THRESHOLD = 0.8;
const STAGGER_Y = [0, 0.08, 0.16, 0.24, 0.32, 0.40];

// ---------- TTS + Sprite helpers ----------
let speechToken = 0;
let spriteAudioBuffer: AudioBuffer | null = null;
let spriteAudioContext: AudioContext | null = null;
let spriteChecked = false;

async function loadSpriteAudio() {
  if (spriteAudioBuffer || spriteChecked) return;
  spriteChecked = true;
  try {
    const headResp = await fetch(AUDIO_SPRITE_PATH, { method: 'HEAD' });
    if (!headResp.ok) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    spriteAudioContext = ctx;
    const resp = await fetch(AUDIO_SPRITE_PATH);
    const arrayBuffer = await resp.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    spriteAudioBuffer = audioBuffer;
  } catch {
    // silently skip – sprite not available
  }
}

function playSpriteSegment(start: number, end: number) {
  if (!spriteAudioBuffer || !spriteAudioContext) return;
  const ctx = spriteAudioContext;
  if (ctx.state === 'suspended') ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = spriteAudioBuffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.8, ctx.currentTime);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0, start, end - start);
}

function speakHanzi(hanzi: string) {
  speechToken++;
  const token = speechToken;
  window.speechSynthesis.cancel();

  const sprite = audioSpriteManifest[hanzi];
  if (sprite) {
    playSpriteSegment(sprite.start, sprite.end);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(hanzi);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85;
  utterance.volume = 1;

  utterance.onend = () => {
    if (token !== speechToken) return;
  };

  window.speechSynthesis.speak(utterance);
}

export function initTTS() {
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    window.speechSynthesis.getVoices();
  } catch {
    // ignore
  }
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
  loadSpriteAudio();
}
// -----------------------------------------

// Weighted random selection helper
function pickWeighted(words: WordData[], weights: Record<string, number>): WordData {
  const weightList = words.map(w => ({
    word: w,
    weight: weights[w.english] ?? 2, // fresh words start at 2
  }));
  const totalWeight = weightList.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * totalWeight;
  for (const item of weightList) {
    r -= item.weight;
    if (r <= 0) return item.word;
  }
  return weightList[weightList.length - 1].word;
}

const GameBoard: React.FC<Props> = ({ categories, difficulty, showPinyin, speakOnCorrect, onBackToMenu }) => {
  const params = DIFFICULTY_PARAMS[difficulty];
  const [_showPinyin, _setShowPinyin] = useState(showPinyin); // just to hold the value
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [targetEnglish, setTargetEnglish] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [goal, setGoal] = useState(params.goal);
  const [levelComplete, setLevelComplete] = useState(false);
  const [isEndless, setIsEndless] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<BubbleData[]>([]);
  const animFrameRef = useRef<number>(0);
  const spawnTimeoutRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const firstSpawnDone = useRef(false);
  const targetSetRef = useRef(false);
  const targetHanziRef = useRef<string | null>(null);

  // Word weights for adaptive frequency
  const wordWeightsRef = useRef<Record<string, number>>({});

  const { playCorrect, playWrong } = useGameAudio();

  const wordPool = useMemo(() => {
    return vocabulary.filter(
      (w: WordData) =>
        categories.includes(w.category) && params.wordFilter.includes(w.difficulty)
    );
  }, [categories, params.wordFilter]);

  const slotPositions = useMemo(() => {
    const count = params.maxBubbles;
    const margin = 5;
    const usable = 100 - 2 * margin;
    const positions: number[] = [];
    for (let i = 0; i < count; i++) {
      positions.push(margin + ((i + 0.5) / count) * usable);
    }
    return positions;
  }, [params.maxBubbles]);

  useEffect(() => {
    bubblesRef.current = bubbles;
  }, [bubbles]);

  useEffect(() => {
    if (!targetEnglish) {
      targetHanziRef.current = null;
      return;
    }
    const word = wordPool.find(w => w.english === targetEnglish);
    if (!word) return;
    targetHanziRef.current = word.hanzi;
  }, [targetEnglish, wordPool]);

  const getFreeSlots = useCallback(
    (containerHeight: number): number[] => {
      const lockedSlots = new Set<number>();
      const lockY = containerHeight * LOCK_THRESHOLD;
      for (const b of bubblesRef.current) {
        if (b.y < lockY) {
          lockedSlots.add(b.slotIndex);
        }
      }
      const free: number[] = [];
      for (let i = 0; i < params.maxBubbles; i++) {
        if (!lockedSlots.has(i)) free.push(i);
      }
      return free;
    },
    [params.maxBubbles]
  );

  const spawnBubble = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const current = bubblesRef.current;
    if (current.length >= params.maxBubbles) return;
    if (wordPool.length === 0) return;

    const containerHeight = container.getBoundingClientRect().height;
    const freeSlots = getFreeSlots(containerHeight);
    if (freeSlots.length === 0) return;

    const slotIndex = freeSlots[Math.floor(Math.random() * freeSlots.length)];

    let y: number;
    if (!firstSpawnDone.current) {
      const staggerIndex = Math.min(slotIndex, STAGGER_Y.length - 1);
      y = containerHeight * STAGGER_Y[staggerIndex];
    } else {
      y = Math.random() * containerHeight * 0.2;
    }

    const x = slotPositions[slotIndex];

    const existingHanzi = new Set(current.map((b) => b.word.hanzi));
    const availableWords = wordPool.filter((w) => !existingHanzi.has(w.hanzi));
    if (availableWords.length === 0) return;

    // Choose word using weighted selection if pool is large enough
    let word: WordData;
    if (wordPool.length > 20) {
      word = pickWeighted(availableWords, wordWeightsRef.current);
    } else {
      word = availableWords[Math.floor(Math.random() * availableWords.length)];
    }

    const newBubble: BubbleData = {
      id: nextIdRef.current++,
      word,
      x,
      y,
      slotIndex,
      cooldown: false,
      popping: false,
      flash: null,
    };

    setBubbles((prev) => {
      const updated = [...prev, newBubble];
      if (!targetSetRef.current) {
        targetSetRef.current = true;
        setTargetEnglish(word.english);
      }
      return updated;
    });
  }, [wordPool, params.maxBubbles, getFreeSlots, slotPositions]);

  useEffect(() => {
    if (levelComplete) return;
    if (!containerRef.current) return;

    for (let i = 0; i < params.maxBubbles; i++) {
      setTimeout(() => {
        if (!levelComplete) spawnBubble();
      }, i * 200);
    }
    firstSpawnDone.current = true;

    const scheduleSpawn = () => {
      spawnBubble();
      const delay = 800 + Math.random() * 1200;
      spawnTimeoutRef.current = window.setTimeout(scheduleSpawn, delay);
    };
    const timeout = setTimeout(scheduleSpawn, params.maxBubbles * 200 + 500);

    return () => {
      clearTimeout(timeout);
      clearTimeout(spawnTimeoutRef.current);
    };
  }, [levelComplete]);

  useEffect(() => {
    if (levelComplete) return;
    const container = containerRef.current;
    if (!container) return;

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const containerHeight = container.clientHeight;
      const speed = containerHeight / params.fallSpeedMs;
      const step = speed * delta;
      const lockY = containerHeight * LOCK_THRESHOLD;

      setBubbles((prev) => {
        const updated = prev.map((b) => {
          if (b.popping) return b;
          const newY = b.y + step;

          if (newY > containerHeight * WRAP_THRESHOLD) {
            const freeSlots = getFreeSlots(containerHeight);
            if (freeSlots.length > 0) {
              const si = freeSlots[Math.floor(Math.random() * freeSlots.length)];
              const newX = slotPositions[si];
              const wrapY = Math.random() * containerHeight * 0.15;
              return { ...b, x: newX, y: wrapY, slotIndex: si };
            }
            return { ...b, y: Math.min(newY, lockY - 50) };
          }
          return { ...b, y: newY };
        });
        return updated;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [levelComplete, params.fallSpeedMs, getFreeSlots, slotPositions]);

  // ----- Adaptive weight updates -----
  const adjustWeight = useCallback((english: string, factor: number) => {
    const weights = wordWeightsRef.current;
    const current = weights[english] ?? 1;
    const newWeight = Math.max(0.2, Math.min(5, current * factor));
    weights[english] = newWeight;
  }, []);

  const handleCorrectTap = useCallback(
    (bubbleId: number) => {
      playCorrect();

      // Speak if voice is enabled
      if (speakOnCorrect && targetHanziRef.current) {
        speakHanzi(targetHanziRef.current);
      }

      // Find the word before removing it
      const word = bubblesRef.current.find(b => b.id === bubbleId)?.word;
      if (word && wordPool.length > 20) {
        adjustWeight(word.english, 0.8); // Decrease weight: show less often
      }

      setBubbles((prev) => {
        const updated = prev.map((b) =>
          b.id === bubbleId ? { ...b, popping: true, flash: 'correct' as const } : b
        );
        return updated;
      });

      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
      }, 200);

      setScore((prev) => {
        const newScore = prev + params.pointsCorrect;
        if (!isEndless && newScore >= goal) setLevelComplete(true);
        return newScore;
      });

      setBubbles((prev) => {
        const remaining = prev.filter((b) => b.id !== bubbleId);
        if (remaining.length > 0) {
          const idx = Math.floor(Math.random() * remaining.length);
          setTargetEnglish(remaining[idx].word.english);
        } else {
          setTargetEnglish(null);
        }
        return prev;
      });
    },
    [params.pointsCorrect, goal, playCorrect, isEndless, wordPool.length, adjustWeight, speakOnCorrect]
  );

  const handleWrongTap = useCallback(
    (bubbleId: number, correctHanzi: string) => {
      playWrong();

      // Increase weight for the correct target word (the one user missed)
      if (targetEnglish && wordPool.length > 20) {
        adjustWeight(targetEnglish, 1.3); // Increase: show more often
      }

      setBubbles((prev) =>
        prev.map((b) => (b.id === bubbleId ? { ...b, flash: 'wrong' as const } : b))
      );

      setTimeout(() => {
        setBubbles((prev) =>
          prev.map((b) => (b.id === bubbleId ? { ...b, flash: null } : b))
        );
      }, 300);

      setScore((prev) => Math.max(0, prev - params.penaltyWrong));

      const correctBubbleEl = document.querySelector(`[data-hanzi="${correctHanzi}"]`);
      if (correctBubbleEl) {
        correctBubbleEl.classList.add('flash-correct');
        setTimeout(() => correctBubbleEl.classList.remove('flash-correct'), 300);
      }
      if (navigator.vibrate) navigator.vibrate(100);
    },
    [params.penaltyWrong, playWrong, targetEnglish, wordPool.length, adjustWeight]
  );

  const handlePop = useCallback(
    (bubble: BubbleData) => {
      if (!targetEnglish) return;
      if (bubble.word.english === targetEnglish) {
        handleCorrectTap(bubble.id);
      } else {
        const correctBubble = bubblesRef.current.find((b) => b.word.english === targetEnglish);
        const correctHanzi = correctBubble?.word.hanzi ?? '';
        handleWrongTap(bubble.id, correctHanzi);
      }
    },
    [targetEnglish, handleCorrectTap, handleWrongTap]
  );

  const handleReplay = useCallback(() => {
    if (targetHanziRef.current) {
      speakHanzi(targetHanziRef.current);
    }
  }, []);

  const handleContinue = useCallback(() => {
    setScore(0);
    setLevelComplete(false);
    setBubbles([]);
    firstSpawnDone.current = false;
    targetSetRef.current = false;
    setTargetEnglish(null);
    targetHanziRef.current = null;
    // Keep word weights when going to endless mode
    window.speechSynthesis.cancel();
    setIsEndless(true);
    setGoal(Infinity);
  }, []);

  const handleBackMenu = useCallback(() => {
    window.speechSynthesis.cancel();
    onBackToMenu();
  }, [onBackToMenu]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="game-container">
      <div className="top-bar">
        <button className="back-btn" onClick={handleBackMenu}>
          ← Menu
        </button>
        <div className="target-word" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{targetEnglish ? targetEnglish : '...'}</span>
          {targetEnglish && (
            <button className="replay-btn" onClick={handleReplay} title="Replay pronunciation">
              🔊
            </button>
          )}
        </div>
        <div className="score-area">
          <span className="score">
            {isEndless ? `Score: ${score}` : `Score: ${score}/${goal}`}
          </span>
        </div>
      </div>

      <div className="game-area" ref={containerRef} style={{ touchAction: 'none' }}>
        {bubbles.map((bubble) => {
          const extraClass = bubble.flash === 'wrong' ? 'flash-wrong' : '';
          return (
            <div
              key={bubble.id}
              className={`bubble ${bubble.popping ? 'pop-animation' : ''} ${extraClass}`}
              style={{ left: `${bubble.x}%`, top: `${bubble.y}px` }}
              data-hanzi={bubble.word.hanzi}
              onPointerDown={(e) => {
                e.preventDefault();
                if (bubble.cooldown || bubble.popping) return;
                handlePop(bubble);
              }}
            >
              <div className="bubble-hanzi">{bubble.word.hanzi}</div>
              {showPinyin && <div className="bubble-pinyin">{bubble.word.pinyin}</div>}
            </div>
          );
        })}
      </div>

      {levelComplete && !isEndless && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Level Complete!</h2>
            <p>Score: {score}</p>
            <p>Goal: {goal}</p>
            <div className="modal-buttons">
              <button onClick={handleContinue} className="modal-btn yes">
                Yes, continue
              </button>
              <button onClick={handleBackMenu} className="modal-btn no">
                No, back to menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;