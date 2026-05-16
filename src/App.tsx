import React from 'react';
import './App.css';
import CategoryMenu from './components/CategoryMenu';
import GameBoard from './components/GameBoard';

type Difficulty = 'simple' | 'medium' | 'hard';

interface GameSettings {
  categories: string[];
  difficulty: Difficulty;
  showPinyin: boolean;
  speakOnCorrect: boolean;
}

const App: React.FC = () => {
  const [view, setView] = React.useState<'menu' | 'game'>('menu');
  const [settings, setSettings] = React.useState<GameSettings | null>(null);

  const handleStartGame = (categories: string[], difficulty: Difficulty, showPinyin: boolean, speakOnCorrect: boolean) => {
    setSettings({ categories, difficulty, showPinyin, speakOnCorrect });
    setView('game');
  };

  const handleBackToMenu = () => {
    setView('menu');
    setSettings(null);
  };

  return (
    <div className="app">
      {view === 'menu' && <CategoryMenu onStartGame={handleStartGame} />}
      {view === 'game' && settings && (
        <GameBoard
          categories={settings.categories}
          difficulty={settings.difficulty}
          showPinyin={settings.showPinyin}
          speakOnCorrect={settings.speakOnCorrect}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
};

export default App;