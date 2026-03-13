import { useActiveLocations } from '@/hooks/useLocations';
import { useLocationFilter } from '@/hooks/useLocationFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';

export default function LocationSelector() {
  const locations = useActiveLocations();
  const { selectedLocationId, setSelectedLocationId } = useLocationFilter();

  if (locations.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-primary shrink-0" />
      <Select
        value={selectedLocationId || 'all'}
        onValueChange={(v) => setSelectedLocationId(v === 'all' ? null : v)}
      >
        <SelectTrigger className="h-10 rounded-xl text-sm font-medium border-border/60 bg-card shadow-sm">
          <SelectValue placeholder="Todas as clínicas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as clínicas</SelectItem>
          {locations.map(loc => (
            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
