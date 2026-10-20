import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-950/40',
  secondary:
    'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
  danger:
    'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-lg',
  ghost:
    'bg-transparent hover:bg-slate-800/60 text-slate-300 border border-transparent hover:border-slate-700',
}

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-lg',
  md: 'text-xs font-semibold px-4.5 py-2.5 rounded-xl',
  lg: 'text-sm font-semibold px-6 py-3 rounded-xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-all active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
        'disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
