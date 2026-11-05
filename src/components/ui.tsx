import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'soft' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-sun text-ink-950 hover:bg-[#ffdb85] shadow-[0_10px_30px_-10px_rgba(255,209,102,0.6)]',
  soft: 'bg-white/[0.07] text-ink-100 hover:bg-white/[0.12] ring-1 ring-white/10',
  ghost: 'text-ink-200 hover:bg-white/[0.07]',
  danger: 'bg-[#ff6b6b]/15 text-[#ffb0b0] hover:bg-[#ff6b6b]/25 ring-1 ring-[#ff6b6b]/30',
};

export function Button({
  variant = 'soft',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun/70 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = '',
  children,
  active = false,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 place-items-center rounded-xl transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun/70 ${
        active ? 'bg-white/15 text-white' : 'text-ink-200 hover:bg-white/10 hover:text-white'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl bg-ink-850/80 shadow-card ring-1 ring-white/[0.06] backdrop-blur ${className}`}>{children}</div>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-3xl bg-ink-850 p-5 shadow-card ring-1 ring-white/10 sm:p-7 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title && <h2 className="font-display text-2xl font-bold text-ink-100">{title}</h2>}
              <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1 shrink-0">
                <X size={20} />
              </IconButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-xl bg-ink-950/60 p-1 ring-1 ring-white/5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative rounded-lg font-semibold transition ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${
            value === o.value ? 'text-ink-950' : 'text-ink-300 hover:text-ink-100'
          }`}
        >
          {value === o.value && (
            <motion.span layoutId={undefined} className="absolute inset-0 rounded-lg bg-ink-100" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
          )}
          <span className="relative inline-flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
