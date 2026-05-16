import React from 'react';
import './CategoryMenu.css';
import { initTTS } from './GameBoard';

const GROUPS: { label: string; categories: string[] }[] = [
  {
    label: 'Nouns',
    categories: [
      'Colors', 'Numbers (1‑20)', 'Family (immediate)', 'Animals (pets)',
      'Animals (farm)', 'Animals (wild basic)', 'Fruits', 'Vegetables',
      'Food (snacks/meals)', 'Drinks', 'Clothing', 'House / rooms', 'Furniture',
      'School objects', 'Hobbies', 'Sports', 'Body parts', 'Health',
    ],
  },
  {
    label: 'Verbs & Routines',
    categories: [
      'Daily routines', 'Movement verbs', 'Communication verbs', 'Mental verbs',
      'Sensory verbs', 'Cooking & household verbs', 'Modal verbs', 'Emotion/state verbs',
    ],
  },
  {
    label: 'Adjectives & Emotions',
    categories: [
      'Emotions', 'Size & shape', 'Opposites', 'Personality traits',
      'Physical conditions', 'Nationalities & languages',
    ],
  },
  {
    label: 'Time, Weather, Nature',
    categories: [
      'Weather', 'Nature', 'Days of week', 'Months / seasons',
      'Time expressions (relative)', 'Frequency adverbs',
    ],
  },
  {
    label: 'Social & Travel',
    categories: [
      'Greetings & polite phrases', 'Transportation', 'Occupations (basic)',
      'Social activities', 'Travel & directions', 'Shopping & money',
    ],
  },
  {
    label: 'HSK',
    categories: ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5'],
  },
  {
    label: 'Grammar & Function Words',
    categories: ['Common adverbs of degree', 'Prepositions & location words'],
  },
];

type Difficulty = 'simple' | 'medium' | 'hard';

interface Props {
  onStartGame: (categories: string[], difficulty: Difficulty, showPinyin: boolean, speakOnCorrect: boolean) => void;
}

const CategoryMenu: React.FC<Props> = ({ onStartGame }) => {
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [difficulty, setDifficulty] = React.useState<Difficulty>('simple');
  const [showPinyin, setShowPinyin] = React.useState(true);
  const [speakOnCorrect, setSpeakOnCorrect] = React.useState(false);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const selectAllInGroup = (categories: string[]) => {
    const allSelected = categories.every((c) => selectedCategories.includes(c));
    if (allSelected) {
      setSelectedCategories((prev) => prev.filter((c) => !categories.includes(c)));
    } else {
      setSelectedCategories((prev) => {
        const newSet = new Set(prev);
        categories.forEach((c) => newSet.add(c));
        return Array.from(newSet);
      });
    }
  };

  const handleStart = () => {
    if (selectedCategories.length === 0) return;
    initTTS();
    onStartGame(selectedCategories, difficulty, showPinyin, speakOnCorrect);
  };

  return (
    <div className="menu-container">
      <h1 className="menu-title">Bubble Mandarin</h1>

      <div className="difficulty-selector">
        <label>Difficulty:</label>
        <div className="difficulty-buttons">
          {(['simple', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`diff-btn ${difficulty === d ? 'active' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Pinyin toggle */}
      <div className="menu-toggle-row">
        <label className="toggle-label">
          <span>Show Pinyin</span>
          <div
            className={`toggle-switch ${showPinyin ? 'on' : ''}`}
            onClick={() => setShowPinyin(!showPinyin)}
          >
            <div className="toggle-knob" />
          </div>
        </label>
        {/* Voice toggle */}
        <label className="toggle-label">
          <span>Voice (on tap)</span>
          <div
            className={`toggle-switch ${speakOnCorrect ? 'on' : ''}`}
            onClick={() => setSpeakOnCorrect(!speakOnCorrect)}
          >
            <div className="toggle-knob" />
          </div>
        </label>
      </div>

      <div className="start-btn-wrapper">
        <button
          className="start-btn"
          disabled={selectedCategories.length === 0}
          onClick={handleStart}
        >
          Start Game ({selectedCategories.length} categories)
        </button>
      </div>

      <div className="groups-scroll">
        <div className="groups-list">
          {GROUPS.map((group) => (
            <div key={group.label} className="group-card">
              <div className="group-header" onClick={() => toggleGroup(group.label)}>
                <span className="group-arrow">{expandedGroups.includes(group.label) ? '▼' : '▶'}</span>
                <span className="group-label">{group.label}</span>
                <button
                  className="select-all-btn"
                  onClick={(e) => { e.stopPropagation(); selectAllInGroup(group.categories); }}
                >
                  {group.categories.every((c) => selectedCategories.includes(c)) ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {expandedGroups.includes(group.label) && (
                <div className="group-categories">
                  {group.categories.map((cat) => (
                    <label key={cat} className="category-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryMenu;