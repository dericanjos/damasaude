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
      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select
        value={selectedLocationId || 'all'}
        onValueChange={(v) => setSelectedLocationId(v === 'all' ? null : v)}
      >
        <SelectTrigger className="h-8 rounded-xl text-xs border-border/60 bg-card">
          <SelectValue placeholder="Todos os locais" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os locais</SelectItem>
          {locations.map(loc => (
            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
