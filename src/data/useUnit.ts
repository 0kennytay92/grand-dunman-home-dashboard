import { useEffect, useState } from 'react';
import { units, type Unit } from './measurementKinds';

const KEY = 'grand-dunman-home:unit';

/** The unit (mm / cm / m) used to show measurements, remembered on this device. */
export function useUnit() {
  const [unit, setUnit] = useState<Unit>(() => {
    try {
      const saved = localStorage.getItem(KEY) as Unit | null;
      return saved && units.includes(saved) ? saved : 'mm';
    } catch {
      return 'mm';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, unit);
    } catch {
      // not important if this can't be remembered
    }
  }, [unit]);
  return [unit, setUnit] as const;
}
