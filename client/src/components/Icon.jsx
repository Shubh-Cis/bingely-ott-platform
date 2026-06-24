// Clean, consistent SVG icon set (OTT / JioHotstar style). Each takes a
// className so size + colour come from Tailwind (e.g. "h-5 w-5").
const base = (props) => ({ viewBox: "0 0 24 24", "aria-hidden": true, ...props });

export const PlayIcon = ({ className = "h-5 w-5" }) => (
  <svg {...base()} className={className} fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.79-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" /></svg>
);

export const PauseIcon = ({ className = "h-5 w-5" }) => (
  <svg {...base()} className={className} fill="currentColor"><path d="M7 4h3v16H7zM14 4h3v16h-3z" /></svg>
);

export const PlusIcon = ({ className = "h-5 w-5" }) => (
  <svg {...base()} className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);

export const CheckIcon = ({ className = "h-5 w-5" }) => (
  <svg {...base()} className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);

export const InfoIcon = ({ className = "h-5 w-5" }) => (
  <svg {...base()} className={className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" strokeLinecap="round" /><circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none" /></svg>
);

export const VolumeOnIcon = ({ className = "h-5 w-5" }) => (
  <svg {...base()} className={className} fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M19 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);

export const VolumeOffIcon = ({ className = "h-5 w-5" }) => (
  <svg {...base()} className={className} fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4Z" /><path d="m16 9 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);

export const ChevronLeftIcon = ({ className = "h-6 w-6" }) => (
  <svg {...base()} className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
);

export const ChevronRightIcon = ({ className = "h-6 w-6" }) => (
  <svg {...base()} className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
);

export const ChevronDownIcon = ({ className = "h-5 w-5" }) => (
  <svg {...base()} className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
);
