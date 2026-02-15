// Design Tokens - Centralized status/priority/color mappings
// Instead of hardcoded Tailwind classes, use these tokens everywhere

export const priorityConfig = {
  high: {
    label: 'High',
    className: 'bg-red-500/15 text-red-400 border-red-500/20',
    dotColor: 'bg-red-400',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    dotColor: 'bg-amber-400',
  },
  low: {
    label: 'Low',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    dotColor: 'bg-emerald-400',
  },
} as const;

export const statusConfig = {
  backlog: {
    label: 'Backlog',
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    dotColor: 'bg-slate-400',
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    dotColor: 'bg-blue-400',
  },
  review: {
    label: 'Review',
    className: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    dotColor: 'bg-violet-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    dotColor: 'bg-emerald-400',
  },
  todo: {
    label: 'To Do',
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    dotColor: 'bg-slate-400',
  },
  done: {
    label: 'Done',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    dotColor: 'bg-emerald-400',
  },
} as const;

export function getPriorityConfig(priority: string) {
  return priorityConfig[priority as keyof typeof priorityConfig] ?? priorityConfig.low;
}

export function getStatusConfig(status: string) {
  return statusConfig[status as keyof typeof statusConfig] ?? statusConfig.backlog;
}

// Spacing scale (in Tailwind units)
export const spacing = {
  page: 'p-6',
  pageMobile: 'p-4',
  pageResponsive: 'p-4 md:p-6',
  section: 'gap-6',
  sectionMobile: 'gap-4',
  card: 'p-4',
  cardCompact: 'p-3',
} as const;

// Animation presets for Framer Motion
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 },
  },
  staggerChildren: {
    animate: { transition: { staggerChildren: 0.05 } },
  },
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  buttonTap: {
    whileTap: { scale: 0.97 },
    transition: { duration: 0.1 },
  },
} as const;

// Card hover effect classes
export const cardStyles = {
  base: 'bg-card border border-border rounded-xl p-4 transition-all duration-200',
  hover: 'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
  dragging: 'opacity-50 scale-[0.98]',
  highlighted: 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
} as const;

// Modal size presets
export const modalSizes = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[900px]',
} as const;
