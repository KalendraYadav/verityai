import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  onClick,
  className = '',
}) => {
  return (
    <Card
      onClick={onClick}
      className={`border-[#E5DDD5] bg-white rounded-2xl shadow-[0_2px_12px_-2px_rgba(32,41,54,0.04)] transition-all duration-200 hover:border-[#202936]/25 hover:shadow-[0_8px_24px_-4px_rgba(32,41,54,0.08)] ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <CardContent className="p-4 sm:p-5 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#536174] uppercase tracking-wider font-sans">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="stat-number-display text-3xl sm:text-[34px] tracking-tight text-[#202936] font-bold tabular-nums">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full font-sans ${
                  trend.isPositive
                    ? 'bg-emerald-50 text-[#0D7A48] border border-emerald-200/70'
                    : 'bg-amber-50 text-[#B45309] border border-amber-200/70'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#718096] font-sans font-normal pt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="p-2.5 rounded-xl bg-[#E3FDFF] text-[#1F3954] border border-[#D5F1F3] shrink-0 shadow-xs">
          <Icon className="size-5 shrink-0 text-[#1F3954]" />
        </div>
      </CardContent>
    </Card>
  );
};
