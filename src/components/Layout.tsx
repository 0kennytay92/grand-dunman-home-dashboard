import { useState, type ReactNode } from 'react';
import { Home, DoorOpen, Map as MapIcon, Ruler, Camera, Palette, Wallet, Settings, Ellipsis, X, CircleCheck, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { href } from '../router';
import { useStore } from '../data/store';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/rooms', label: 'Rooms', icon: DoorOpen },
  { path: '/floor-plan', label: 'Floor Plan', icon: MapIcon },
  { path: '/measurements', label: 'Measurements', icon: Ruler },
  { path: '/photos', label: 'Photos', icon: Camera },
  { path: '/designs', label: 'Interior Designs', icon: Palette },
  { path: '/budget', label: 'Budget', icon: Wallet },
  { path: '/settings', label: 'Settings & Backup', icon: Settings },
];

// On phones the bottom bar shows these four, the rest sit under "More".
const mobilePrimary = ['/', '/rooms', '/measurements', '/budget'];

function isActive(itemPath: string, current: string) {
  return itemPath === '/' ? current === '/' : current === itemPath || current.startsWith(`${itemPath}/`);
}

export function Layout({ path, children }: { path: string; children: ReactNode }) {
  const { data, toast, saveError } = useStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const secondary = navItems.filter((n) => !mobilePrimary.includes(n.path));
  const moreActive = secondary.some((n) => isActive(n.path, path));

  return (
    <div className="shell">
      {/* Desktop / tablet sidebar */}
      <aside className="sidebar">
        <a className="brand" href={href('/')}>
          <img src="/icon.svg" alt="" width={36} height={36} />
          <span>
            <strong>Grand Dunman</strong>
            <small>Home Renovation</small>
          </span>
        </a>
        <nav className="side-nav">
          {navItems.map(({ path: p, label, icon: Icon }) => (
            <a key={p} href={href(p)} className={`side-link ${isActive(p, path) ? 'active' : ''}`}>
              <Icon size={19} strokeWidth={1.75} />
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <p>{data.project.address}</p>
          <p className="muted">Saved on this device</p>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="topbar">
        <a className="brand" href={href('/')}>
          <img src="/icon.svg" alt="" width={30} height={30} />
          <strong>{data.project.name}</strong>
        </a>
      </header>

      <main className="content">
        {saveError && (
          <p className="banner-error">
            <TriangleAlert size={18} /> Changes can't be saved on this device (storage is full or blocked, e.g. private browsing). Export a backup from Settings.
          </p>
        )}
        {children}
      </main>

      {/* Phone bottom tab bar */}
      <nav className="tabbar">
        {navItems
          .filter((n) => mobilePrimary.includes(n.path))
          .map(({ path: p, label, icon: Icon }) => (
            <a key={p} href={href(p)} className={`tab ${isActive(p, path) ? 'active' : ''}`} onClick={() => setMoreOpen(false)}>
              <Icon size={22} strokeWidth={1.75} />
              <span>{label === 'Measurements' ? 'Measure' : label}</span>
            </a>
          ))}
        <button className={`tab ${moreActive || moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
          {moreOpen ? <X size={22} strokeWidth={1.75} /> : <Ellipsis size={22} strokeWidth={1.75} />}
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="sheet" role="dialog" aria-label="More sections">
            {secondary.map(({ path: p, label, icon: Icon }) => (
              <a key={p} href={href(p)} className={`sheet-link ${isActive(p, path) ? 'active' : ''}`} onClick={() => setMoreOpen(false)}>
                <Icon size={20} strokeWidth={1.75} />
                {label}
              </a>
            ))}
          </div>
        </>
      )}

      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} /> {toast}
        </div>
      )}
    </div>
  );
}
