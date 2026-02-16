import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, AlertTriangle, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/', icon: LayoutDashboard, label: 'Hoje' },
  { path: '/checkin', icon: ClipboardCheck, label: 'Check-in' },
  { path: '/motivos', icon: AlertTriangle, label: 'Motivos' },
  { path: '/relatorio', icon: BarChart3, label: 'Relatório' },
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
