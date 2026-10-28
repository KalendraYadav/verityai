import React from 'react';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-card/60 ${className}`}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#E3FDFF] border border-[#D5F1F3] text-[#37C2CC] mb-3 shadow-xs">
        <Icon className="size-6 shrink-0 text-[#1F3954]" />
      </div>
      <h3 className="text-base font-display font-semibold text-foreground tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed font-sans">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="teal" size="sm" className="btn-hover cursor-pointer font-semibold">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
