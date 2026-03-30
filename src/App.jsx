import { useEffect, useState, useCallback, useRef } from 'react';
import BarScene from './components/BarScene';
import ChatWindow from './components/ChatWindow';
import DrinkPanel from './components/DrinkPanel';
import SelectedList from './components/SelectedList';
import ResultScreen from './components/ResultScreen';
import LoadingScreen from './components/LoadingScreen';
import MenuDrawer from './components/MenuDrawer';
import { useConversation } from './hooks/useConversation';
import './App.css';

export default function App() {
  const {
    messages,
    choices,
    selectedDrinks,
    currentDrink,
    showPanel,
    showResult,
    start,
    selectChoice,
    handleTextInput,
    removeDrink,
    setShowPanel,
    restart,
    masterAnimation,
    notifyTypingDone,
  } = useConversation();

  const [animState, setAnimState] = useState('idle');
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const bgmRef = useRef(null);

  // BGM初期化
  useEffect(() => {
    const audio = new Audio('/audio/bgm_theme.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    bgmRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // ローディング完了後にBGM再生
  useEffect(() => {
    if (!loading && bgmRef.current) {
      start();
      bgmRef.current.play().catch(() => {});
    }
  }, [loading]);

  // ミュート切替
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (masterAnimation === 'bow' || masterAnimation === 'greet') {
      setAnimState('bow');
    } else if (masterAnimation === 'talk') {
      setAnimState('talk');
    } else if (masterAnimation === 'thank') {
      setAnimState('thank');
    }
  }, [masterAnimation]);

  const handleAnimDone = useCallback(() => {
    setAnimState('idle');
  }, []);

  const handleDrinkSelect = () => {
    selectChoice({ label: 'これにする', action: 'addToList' });
  };

  const handleDrinkNext = () => {
    selectChoice({ label: '他のも見たい', action: 'nextDrink' });
  };

  return (
    <div className="app">
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      <BarScene animState={animState} onAnimDone={handleAnimDone} />

      <header className="app-header">
        <button className="menu-toggle" onClick={() => setMenuOpen(true)}>≡</button>
        <h1 className="logo">BAR <span>MASTER</span></h1>
        <button className="bgm-toggle" onClick={() => setMuted(m => !m)}>
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <SelectedList drinks={selectedDrinks} onRemove={removeDrink} />

      <ChatWindow
        messages={messages}
        choices={choices}
        onSelect={selectChoice}
        onTextInput={handleTextInput}
        onTypingDone={notifyTypingDone}
      />

      {showPanel && (
        <DrinkPanel
          drink={currentDrink}
          onClose={() => setShowPanel(false)}
          onSelect={handleDrinkSelect}
          onNext={handleDrinkNext}
        />
      )}

      {showResult && (
        <ResultScreen drinks={selectedDrinks} onRestart={restart} />
      )}
    </div>
  );
}
