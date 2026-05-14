import React from 'react';
import './Bubble.css';

interface BubbleData {
  id: number;
  word: { english: string; hanzi: string; pinyin: string; difficulty: string; category: string };
  x: number;
  y: number;
  cooldown: boolean;
  popping: boolean;
}

interface Props {
  bubble: BubbleData;
  showPinyin: boolean;
  onPop: () => void;
}

const Bubble: React.FC<Props> = ({ bubble, showPinyin, onPop }) => {
  const [popping, setPopping] = React.useState(false);
  const [flashClass, setFlashClass] = React.useState('');

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (bubble.cooldown || popping) return;

    // Tentatively flash green (will be overridden by onPop callback)
    setPopping(true);
    setTimeout(() => {
      onPop();
      setPopping(false);
    }, 200);
  };

  // Listen for flash-wrong class from parent (via data-hanzi query in GameBoard)
  // This is handled by the flash-wrong class added via DOM query in GameBoard,
  // but we also need to trigger it from the Bubble component itself.
  // We'll add a method: if the tap is wrong, the parent calls a ref to add class.
  // Simpler: let's have the Bubble remove itself on correct, and the parent
  // directly applies the flash class to the DOM element via data-hanzi query.
  // So the Bubble just needs to not pop on wrong.

  // Actually, let's change approach: on pointerdown, don't pop immediately.
  // Instead, call onPop instantly, and GameBoard returns whether it was correct.
  // We'll restructure: onPop returns true/false, and Bubble acts accordingly.

  // Better: remove the popping state from Bubble entirely. The game board
  // will manage the visual state via the bubble's `popping` property.

  // Only render the pop animation if bubble.popping is true (set by GameBoard)
  const showPop = bubble.popping && !flashClass;

  return (
    <div
      className={`bubble ${showPop ? 'pop-animation' : ''} ${flashClass}`}
      style={{
        left: `${bubble.x}%`,
        top: `${bubble.y}px`,
      }}
      data-hanzi={bubble.word.hanzi}
      onPointerDown={handlePointerDown}
    >
      <div className="bubble-hanzi">{bubble.word.hanzi}</div>
      {showPinyin && <div className="bubble-pinyin">{bubble.word.pinyin}</div>}
    </div>
  );
};

export default Bubble;