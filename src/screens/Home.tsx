import { motion } from 'framer-motion';
import { CircleHelp, Globe, Sprout } from 'lucide-react';
import { useState } from 'react';
import { HowToPlay } from '../components/HowToPlay';
import { Logo } from '../components/Logo';

interface Props {
  onLocal: () => void;
  onOnline: () => void;
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.5 + i * 0.1, type: 'spring' as const, stiffness: 260, damping: 24 } }),
};

export function Home({ onLocal, onOnline }: Props) {
  const [help, setHelp] = useState(false);
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Logo />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 max-w-md text-center text-base text-ink-300 sm:text-lg"
      >
        Grow your garden corner to corner and crowd out your rivals. A tile-laying strategy game for 2–4 players.
      </motion.p>

      <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        <MenuCard i={0} icon={<Sprout size={26} />} title="Local game" text="Play against bots or pass the device around — up to 4 gardeners." onClick={onLocal} accent="#33c48a" />
        <MenuCard i={1} icon={<Globe size={26} />} title="Online room" text="Create a room, share the link, and play with friends anywhere." onClick={onOnline} accent="#7d89ff" />
      </div>

      <motion.button
        custom={2}
        variants={item}
        initial="hidden"
        animate="show"
        onClick={() => setHelp(true)}
        className="mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-ink-200 hover:bg-white/[0.07]"
      >
        <CircleHelp size={18} /> How to play
      </motion.button>

      <HowToPlay open={help} onClose={() => setHelp(false)} />
    </div>
  );
}

function MenuCard({ i, icon, title, text, onClick, accent }: { i: number; icon: React.ReactNode; title: string; text: string; onClick: () => void; accent: string }) {
  return (
    <motion.button
      custom={i}
      variants={item}
      initial="hidden"
      animate="show"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl bg-ink-850/80 p-6 text-left shadow-card ring-1 ring-white/[0.07] transition-colors hover:ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun/70"
    >
      <div
        className="absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ background: accent }}
      />
      <div className="relative mb-4 grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `${accent}22`, color: accent }}>
        {icon}
      </div>
      <div className="relative font-display text-2xl font-bold text-ink-100">{title}</div>
      <div className="relative mt-1 text-sm text-ink-300">{text}</div>
    </motion.button>
  );
}
