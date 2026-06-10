import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'link';

const VARIANT_CLASS: Record<Variant, string> = {
  // 主: 塗り・アクセント
  primary:
    'bg-accent text-white hover:bg-accent/90 disabled:bg-line disabled:text-ink-sub disabled:cursor-not-allowed',
  // 副: 枠線
  secondary:
    'border border-line bg-white text-ink hover:bg-surface disabled:text-ink-sub disabled:cursor-not-allowed',
  // 危険: 枠線・赤文字
  danger:
    'border border-danger/40 bg-white text-danger hover:bg-danger/5 disabled:border-line disabled:text-ink-sub disabled:cursor-not-allowed',
  // 文字リンク
  link: 'text-accent hover:underline px-1 py-0.5',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'secondary', className = '', children, ...rest }: Props) {
  const base =
    variant === 'link'
      ? 'inline-flex items-center gap-1 rounded-md text-sm font-medium transition-colors'
      : 'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors';
  return (
    <button className={`${base} ${VARIANT_CLASS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
