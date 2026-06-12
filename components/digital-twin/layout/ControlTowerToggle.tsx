'use client';

import { FC, useState } from 'react';
import { ShieldAlert, Settings } from 'lucide-react';
import { useDigitalTwinStore } from '@/lib/digitalTwinStore';

const ControlTowerToggle: FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const { isControlTowerMode, setControlTowerMode } = useDigitalTwinStore();

  return (
    <div 
      className="fixed top-20 right-[150px] z-50 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`
        transform transition-all duration-300 ease-out
        ${isHovered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-90'}
      `}>
        <button
          onClick={() => setControlTowerMode(!isControlTowerMode)}
          className={`
            relative flex items-center justify-center gap-2 px-4 py-3 
            ${isControlTowerMode ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 'bg-white dark:bg-black hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-white border-black dark:border-white'}
            font-medium text-sm
            rounded-none shadow-none
            transition-all duration-200 ease-out
            transform hover:scale-105 active:scale-95
            border
            min-w-[140px]
          `}
        >
          <div className="relative flex items-center gap-2">
            {isControlTowerMode ? (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Control Tower</span>
              </>
            ) : (
              <>
                <Settings className="w-4 h-4" />
                <span>Design Mode</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Tooltip */}
      <div className={`
        absolute top-full right-0 mt-2 px-3 py-1.5
        bg-gray-900 text-white text-xs rounded-md
        transform transition-all duration-200 ease-out
        ${isHovered ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0 pointer-events-none'}
        whitespace-nowrap
        shadow-lg
      `}>
        {isControlTowerMode ? 'Exit Control Tower mode' : 'Enter Control Tower mode'}
        <div className="absolute -top-1 right-12 w-2 h-2 bg-gray-900 transform rotate-45"></div>
      </div>
    </div>
  );
};

export default ControlTowerToggle;
