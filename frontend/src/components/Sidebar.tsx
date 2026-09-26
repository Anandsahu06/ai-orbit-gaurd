import React from 'react';
import {
  Home,
  Orbit,
  AlertTriangle,
  Sliders,
  Satellite,
  BarChart3,
  LogOut
} from 'lucide-react';

export type NavTab = 'home' | 'live-orbit' | 'conjunctions' | 'simulation' | 'satellites' | 'analytics';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen
}) => {
  // Navigation strictly focused on Core MVPs
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'live-orbit', label: 'Live Orbit', icon: Orbit, badge: 'MVP 01' },
    { id: 'conjunctions', label: 'Conjunctions', icon: AlertTriangle, badge: 'MVP 02' },
    { id: 'simulation', label: 'Simulation', icon: Sliders, badge: 'MVP 03' },
    { id: 'satellites', label: 'Satellites', icon: Satellite },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className={`fixed lg:static top-0 left-0 z-40 h-screen bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-150 ${isOpen ? 'w-56' : 'w-16'}`}>
      <div>
        {/* Sidebar Header */}
        <div className="h-14 flex items-center px-4 border-b border-slate-100 gap-2">
          {isOpen ? (
            <div className="overflow-hidden whitespace-nowrap">
              <span className="font-bold text-slate-900 text-sm tracking-tight">ORBITALGUARD</span>
              <span className="text-[10px] block font-medium text-slate-500 tracking-wider">DECISION SUPPORT</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center">
              OG
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="p-2 space-y-0.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={item.label}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-500'}`} />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </div>
                {isOpen && item.badge && !isActive && (
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Hackathon attribution */}
      <div className="p-3 border-t border-slate-100">
        {isOpen && (
          <div className="p-2 bg-slate-50 rounded border border-slate-200/80 mb-2">
            <div className="text-[10px] font-bold text-slate-800 tracking-wide">IPEC GRAND HACK 2026</div>
            <div className="text-[9px] text-slate-500">Technical Evaluation Prototype</div>
          </div>
        )}

        <button
          onClick={() => setActiveTab('home')}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Reset"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {isOpen && <span>Reset View</span>}
        </button>
      </div>
    </aside>
  );
};
