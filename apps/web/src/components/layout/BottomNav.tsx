import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Calendar, FileText, Menu } from 'lucide-react';

export const BottomNav: React.FC<{ onOpenMenu: () => void }> = ({ onOpenMenu }) => {
  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Leads', path: '/leads', icon: Users },
    { label: 'Follow-ups', path: '/followups', icon: Calendar },
    { label: 'Quotes', path: '/quotations', icon: FileText },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 pb-safe shadow-lg">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isActive ? 'text-amber-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5 mb-1" />
          <span className="text-[11px] tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
