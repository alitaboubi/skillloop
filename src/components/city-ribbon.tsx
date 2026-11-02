import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { CITIES } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

/**
 * Home "Où ?" cities on one straight lime ribbon with large names that slide sideways forever. Each city links to Explore;
 * the copies (for the seamless loop) are decorative and hidden from assistive tech. Moves with transform only, stops on hover/focus, and stands
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
      <nav aria-label={t("hp_loc_title")} className="ribbon ribbon-front">
        {/* One real row + three copies, moved by a quarter: seamless even on very wide screens. */}
        <div className="ribbon-move">{row(false)}{row(true)}{row(true)}{row(true)}</div>
      </nav>
    </div>
  );
}
