import { useState, useRef, useEffect, type ReactNode } from 'react';

interface AccordionProps {
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  isLoading?: boolean;
  children: ReactNode;
}

export function Accordion({ title, badge, defaultOpen = false, forceOpen, isLoading, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen || !!forceOpen);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (open) {
      setHeight(bodyRef.current.scrollHeight);
      const id = setTimeout(() => setHeight(undefined), 200);
      return () => clearTimeout(id);
    } else {
      setHeight(bodyRef.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [open]);

  return (
    <div className="card mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-zinc-50/60 dark:hover:bg-zinc-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          {isLoading && (
            <svg className="animate-spin h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {badge}
        </div>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        ref={bodyRef}
        style={{ height: height === undefined ? 'auto' : height }}
        className="transition-[height] duration-200 ease-in-out overflow-hidden"
      >
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
