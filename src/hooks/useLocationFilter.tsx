import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useActiveLocations } from './useLocations';

interface LocationFilterContextType {
  selectedLocationId: string | null; // null = "Todos os locais"
  setSelectedLocationId: (id: string | null) => void;
}

const LocationFilterContext = createContext<LocationFilterContextType | undefined>(undefined);

export function LocationFilterProvider({ children }: { children: ReactNode }) {
  const activeLocations = useActiveLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(() => {
    const saved = localStorage.getItem('selected_location_id');
    return saved || null;
  });

  useEffect(() => {
    if (selectedLocationId) {
      localStorage.setItem('selected_location_id', selectedLocationId);
    } else {
      localStorage.removeItem('selected_location_id');
    }
  }, [selectedLocationId]);

  // Reset to null if selected location no longer exists
  useEffect(() => {
    if (selectedLocationId && activeLocations.length > 0) {
      const exists = activeLocations.some(l => l.id === selectedLocationId);
      if (!exists) setSelectedLocationId(null);
    }
  }, [activeLocations, selectedLocationId]);

  return (
    <LocationFilterContext.Provider value={{ selectedLocationId, setSelectedLocationId }}>
      {children}
    </LocationFilterContext.Provider>
  );
}

export function useLocationFilter() {
  const context = useContext(LocationFilterContext);
  if (!context) throw new Error('useLocationFilter must be used within LocationFilterProvider');
  return context;
}
