import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  dataSourceStatus?: string;
}

export const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  dataSourceStatus = 'Connected (Public TLE)'
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Simple Professional Brand Name */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          title="Toggle Navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-baseline gap-2">
          <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
            ORBITALGUARD <span className="text-orange-600 font-bold">AI</span>
          </span>
          <span className="hidden md:inline-block text-[11px] font-medium text-slate-400">
            Space Traffic Management
          </span>
        </div>
      </div>

      {/* Center: Search Input */}
      <div className="flex-1 max-w-sm mx-4 hidden sm:block">
        <form onSubmit={onSearchSubmit} className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search satellite or NORAD ID..."
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
          />
        </form>
      </div>

      {/* Right: Data Connection Status & Profile */}
      <div className="flex items-center gap-4">
        {/* Subtle Text Data Source Indicator */}
        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dataSourceStatus.includes('Connected') ? 'bg-emerald-600' : 'bg-amber-500'}`} />
          <span className="hidden sm:inline text-slate-400">Data:</span>
          <span className="text-slate-700 font-semibold">{dataSourceStatus}</span>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-7 h-7 rounded-md bg-slate-800 text-white font-semibold text-xs flex items-center justify-center">
            S
          </div>
          <div className="hidden md:flex items-center gap-1 text-xs">
            <span className="font-semibold text-slate-800">Saksham</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
};
