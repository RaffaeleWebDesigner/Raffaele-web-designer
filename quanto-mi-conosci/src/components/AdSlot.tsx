import { features, type AdPlacement } from '../config/features';

/**
 * PREDISPOSIZIONE — spazio pubblicitario non invasivo.
 * Spento di default (vedi src/config/features.ts): non rende nulla.
 */
export function AdSlot({ placement }: { placement: AdPlacement }) {
  if (!features.ads.enabled || !features.ads.placements.includes(placement)) return null;
  return (
    <aside className="ad-slot" data-placement={placement} aria-label="Pubblicità">
      {/* Qui andrà lo snippet del circuito pubblicitario */}
      <span>Spazio pubblicitario</span>
    </aside>
  );
}
