import React from 'react';
import './App.css';
import CategoryMenu from './components/CategoryMenu';
import GameBoard from './components/GameBoard';

type Difficulty = 'simple' | 'medium' | 'hard';

interface GameSettings {
  categories: string[];
  difficulty: Difficulty;
}

const App: React.FC = () => {
  const [view, setView] = React.useState<'menu' | 'game'>('menu');
  const [settings, setSettings] = React.useState<GameSettings | null>(null);

  const handleStartGame = (categories: string[], difficulty: Difficulty) => {
    setSettings({ categories, difficulty });
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
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
};

export default App;