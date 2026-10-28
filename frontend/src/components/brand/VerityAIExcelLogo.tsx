import React from 'react';

interface Props {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Use 'light' for dark backgrounds (landing hero, sidebar bottom) */
  variant?: 'default' | 'light';
}

export const VerityAIExcelLogo: React.FC<Props> = ({
  className = '',
  showSubtitle = true,
  size = 'md',
  variant = 'default',
}) => {
  const iconSizes = { sm: 'w-7 h-7', md: 'w-8 h-8', lg: 'w-10 h-10' };
  const textSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };

  const isDark = variant === 'default';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* VerityAI Excel mark: shield + checkmark */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-[#1F3954] flex items-center justify-center text-white shadow-sm relative overflow-hidden shrink-0 border border-[#37C2CC]/30`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-[#37C2CC]"
          aria-hidden="true"
        >
          {/* Shield base */}
          <path
            d="M12 2L4 5.5V11C4 15.418 7.582 19.418 12 21C16.418 19.418 20 15.418 20 11V5.5L12 2Z"
            fill="#37C2CC"
            fillOpacity="0.2"
          />
          <path
            d="M12 2L4 5.5V11C4 15.418 7.582 19.418 12 21C16.418 19.418 20 15.418 20 11V5.5L12 2Z"
            stroke="#37C2CC"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Check mark */}
          <path
            d="M8.5 11.5L11 14L15.5 9.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <div
          className={`font-display font-bold tracking-tight leading-none ${textSizes[size]} ${
            isDark ? 'text-[#1B1411]' : 'text-white'
          }`}
        >
          VerityAI{' '}
          <span className={isDark ? 'text-[#37C2CC]' : 'text-[#37C2CC]'}>
            Excel
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`text-[10px] font-medium tracking-normal mt-0.5 ${
              isDark ? 'text-[#667085]' : 'text-white/60'
            }`}
          >
            Institutional Application Scrutiny
          </span>
        )}
      </div>
    </div>
  );
};
