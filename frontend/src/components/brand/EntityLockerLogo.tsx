import React from 'react';

interface Props {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const EntityLockerLogo: React.FC<Props> = ({
  className = '',
  showSubtitle = true,
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* EntityLocker Iconic Red Folder Mark */}
      <div
        className={`${iconSizes[size]} rounded-lg bg-[#F04438] flex items-center justify-center text-white shadow-xs relative overflow-hidden shrink-0`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-white"
        >
          {/* Back tab */}
          <path
            d="M3 7C3 5.89543 3.89543 5 5 5H9.58579C10.1162 5 10.6249 5.21071 11 5.58579L12.4142 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"
            fill="currentColor"
            fillOpacity="0.3"
          />
          {/* Document sheet */}
          <rect x="6" y="8" width="12" height="8" rx="1" fill="white" />
          {/* Front flap */}
          <path
            d="M3 10C3 8.89543 3.89543 8 5 8H19C20.1046 8 21 8.89543 21 10V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V10Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className={`font-bold tracking-tight text-[#171B45] leading-none ${textSizes[size]}`}>
          Entity<span className="text-[#7450D8]">Locker</span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] text-[#5F6485] font-medium tracking-normal mt-0.5">
            Powered by VerityAI
          </span>
        )}
      </div>
    </div>
  );
};
