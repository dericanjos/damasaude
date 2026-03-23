import { useNavigate } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';

interface DamaInsightCardProps {
  lost: number;
}

export default function DamaInsightCard({ lost }: DamaInsightCardProps) {
  const navigate = useNavigate();

  if (lost <= 500) return null;

  return (
    <div className="rounded-2xl bg-card border border-[#D4AF37]/20 p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/10">
          <Lightbulb className="h-5 w-5 text-[#D4AF37]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Médicos com um time comercial estratégico reduzem vazamentos em até 40%.
          </p>
          <button
            onClick={() => navigate('/institucional')}
            className="text-xs text-[#D4AF37] font-semibold mt-1 hover:text-[#e0c04a] transition-colors"
          >
            Como funciona →
          </button>
        </div>
      </div>
    </div>
  );
}
