import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FounderBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export default function FounderBadge({ size = 'md', className }: FounderBadgeProps) {
  const isSmall = size === 'sm';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 font-semibold text-[#D4AF37]',
        isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <Crown className={cn(isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      Founder
    </span>
  );
}
