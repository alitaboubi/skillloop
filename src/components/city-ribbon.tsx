import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { CITIES } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

/**
 * Home "Où ?" cities as two crossing ribbons (lime in front, ink behind) with large names that slide sideways forever.
 * Only the lime ribbon is real: each city links to Explore; the second copy inside it (for the seamless loop) and the
 * ink ribbon are decorative and hidden from assistive tech. Moves with transform only, stops on hover/focus, and stands
 * still (wrapped, nothing cut) under reduced motion. City names are Latin, so the ribbons run left to right everywhere.
 */
export function CityRibbon() {
  const { t } = useI18n();
  const row = (copy: boolean) => (
    <ul aria-hidden={copy || undefined} className={`ribbon-row ${copy ? "ribbon-copy" : ""}`}>
      {CITIES.map((c) => (
        <li key={c}>
          <Link to="/explore" search={{ city: c }} tabIndex={copy ? -1 : undefined} className="ribbon-item" aria-label={copy ? undefined : `${t("explore_services")} · ${c}`}>
            <MapPin className="ribbon-pin" aria-hidden />{c}
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="ribbons">
      <div aria-hidden className="ribbon ribbon-back">
        <div className="ribbon-move">
          {[0, 1, 2, 3].map((k) => <span key={k} className="ribbon-row">{CITIES.map((c) => <span key={c} className="ribbon-item">{c}</span>)}</span>)}
        </div>
      </div>
      <nav aria-label={t("hp_loc_title")} className="ribbon ribbon-front">
        {/* One real row + three copies, moved by a quarter: seamless even on very wide screens. */}
        <div className="ribbon-move">{row(false)}{row(true)}{row(true)}{row(true)}</div>
      </nav>
    </div>
  );
}
