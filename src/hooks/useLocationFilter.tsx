import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useActiveLocations } from './useLocations';

interface LocationFilterContextType {
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string | null) => void;
}

const LocationFilterContext = createContext<LocationFilterContextType | undefined>(undefined);

export function LocationFilterProvider({ children }: { children: ReactNode }) {
  const activeLocations = useActiveLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

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

const defaultValue: LocationFilterContextType = {
  selectedLocationId: null,
  setSelectedLocationId: () => {},
};

export function useLocationFilter() {
  const context = useContext(LocationFilterContext);
  return context ?? defaultValue;
}
