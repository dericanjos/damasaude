import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, BarChart3, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/', icon: LayoutDashboard, label: 'Hoje' },
  { path: '/checkin', icon: ClipboardCheck, label: 'Check-in' },
  { path: '/relatorio', icon: BarChart3, label: 'Relatório' },
  { path: '/insights', icon: Sparkles, label: 'Insights' },
  { path: '/config', icon: Settings, label: 'Config' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 safe-bottom">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[hsl(222,41%,14%)] backdrop-blur-xl">
        <div
          className="mx-auto flex max-w-lg items-center justify-around px-1 py-1"
          style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
        >
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[10px] font-medium transition-all duration-200 min-w-[52px]',
                  isActive
                    ? 'text-white'
                    : 'text-white/45 hover:text-white/70'
                )}
              >
                <div className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-lg transition-all duration-200',
                  isActive && 'bg-white/15'
                )}>
                  <tab.icon className={cn('h-4.5 w-4.5', isActive ? 'stroke-[2.2]' : 'stroke-[1.8]')} style={{ width: '18px', height: '18px' }} />
                </div>
                <span className={cn(isActive && 'font-semibold')}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
