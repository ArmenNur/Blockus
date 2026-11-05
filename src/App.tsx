import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Backdrop } from './components/Backdrop';
import { GameView } from './components/GameView';
import type { PlayerConfig } from './game/types';
import { useLocalGame } from './hooks/useLocalGame';
import { Home } from './screens/Home';
import { LocalSetup } from './screens/LocalSetup';
import { OnlineScreen } from './screens/OnlineScreen';

type Screen =
  | { name: 'home' }
  | { name: 'local-setup' }
  | { name: 'local-game'; configs: PlayerConfig[]; key: number }
  | { name: 'online'; code?: string };

function initialScreen(): Screen {
  const code = new URLSearchParams(window.location.search).get('room');
  if (code) return { name: 'online', code: code.toUpperCase().slice(0, 4) };
  try {
    if (window.sessionStorage.getItem('bloomgrid.session')) return { name: 'online' };
  } catch {
    /* ignore */
  }
  return { name: 'home' };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen);

  const go = (s: Screen) => {
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
    setScreen(s);
  };

  return (
    <>
      <Backdrop />
      <AnimatePresence mode="wait">
        <motion.div
          key={screen.name === 'local-game' ? `game-${screen.key}` : screen.name}
          className="min-h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {screen.name === 'home' && <Home onLocal={() => go({ name: 'local-setup' })} onOnline={() => go({ name: 'online' })} />}
          {screen.name === 'local-setup' && (
            <LocalSetup onBack={() => go({ name: 'home' })} onStart={(configs) => go({ name: 'local-game', configs, key: Date.now() })} />
          )}
          {screen.name === 'local-game' && <LocalGame configs={screen.configs} onExit={() => go({ name: 'local-setup' })} />}
          {screen.name === 'online' && <OnlineScreen initialCode={screen.code} onExit={() => go({ name: 'home' })} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function LocalGame({ configs, onExit }: { configs: PlayerConfig[]; onExit: () => void }) {
  const game = useLocalGame(configs);
  const humans = game.state.players.map((p, i) => (p.kind === 'human' ? i : -1)).filter((i) => i >= 0);
  return (
    <GameView
      state={game.state}
      mode="local"
      controllable={humans}
      onPlace={game.place}
      onRest={game.rest}
      onExit={onExit}
      onUndo={game.undo}
      canUndo={game.canUndo}
      onRestart={game.restart}
    />
  );
}
