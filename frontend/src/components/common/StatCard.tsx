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
      className={`border-[#E5DDD5] bg-white rounded-2xl shadow-[0_2px_12px_-2px_rgba(27,20,17,0.04)] transition-all duration-200 hover:border-[#1B1411]/25 hover:shadow-[0_8px_24px_-4px_rgba(27,20,17,0.08)] ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <CardContent className="p-4 sm:p-5 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[#66574F] uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1B1411]">
              {value}
            </span>
            {trend && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  trend.isPositive
                    ? 'bg-[#33CC7A]/15 text-[#136639]'
                    : 'bg-[#D97706]/15 text-[#92400E]'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-[#66574F]/85 pt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="p-2.5 rounded-xl bg-[#EEE5DC]/70 text-[#1B1411] border border-[#E5DDD5]/60 shrink-0">
          <Icon className="size-5 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};
