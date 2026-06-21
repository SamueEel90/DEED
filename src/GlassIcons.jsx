import "./GlassIcons.css";

/*
  ============================================================
  GLASS ICONS — 3D glass dlaždice s ikonou (DEED verzia)
  labely sú vždy viditeľné (vhodné aj pre dotyk).
  item: { icon, color, label, sub, onClick }
  ============================================================
*/
export default function GlassIcons({ items = [], columns = 3, className = "" }) {
  return (
    <div className={`glass-icons ${className}`} style={{ "--gi-cols": columns }}>
      {items.map((it, i) => (
        <button key={i} type="button" className="glass-icon" onClick={it.onClick} aria-label={it.label}>
          <span className="glass-icon__tile">
            <span className="glass-icon__back" style={{ background: `linear-gradient(150deg, ${it.color}, rgba(0,0,0,.34))` }} />
            <span className="glass-icon__front">
              <span className="glass-icon__icon">{it.icon}</span>
            </span>
          </span>
          <span className="glass-icon__label">{it.label}</span>
          {it.sub && <span className="glass-icon__sub">{it.sub}</span>}
        </button>
      ))}
    </div>
  );
}
