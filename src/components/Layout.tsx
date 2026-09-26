import { useState, type ReactNode } from 'react';
import { Home, DoorOpen, Ruler, Camera, Palette, Wallet, TriangleAlert, Ellipsis, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { href } from '../router';
import { project } from '../data/sampleData';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/rooms', label: 'Rooms', icon: DoorOpen },
  { path: '/measurements', label: 'Measurements', icon: Ruler },
  { path: '/photos', label: 'Photos', icon: Camera },
  { path: '/designs', label: 'Interior Designs', icon: Palette },
  { path: '/budget', label: 'Budget', icon: Wallet },
  { path: '/defects', label: 'Defects', icon: TriangleAlert },
];

// On phones the bottom bar shows these four, the rest sit under "More".
const mobilePrimary = ['/', '/rooms', '/budget', '/defects'];

function isActive(itemPath: string, current: string) {
  return itemPath === '/' ? current === '/' : current === itemPath || current.startsWith(`${itemPath}/`);
}

export function Layout({ path, children }: { path: string; children: ReactNode }) {
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
          <p>{project.address}</p>
          <p className="muted">Prototype · sample data</p>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="topbar">
        <a className="brand" href={href('/')}>
          <img src="/icon.svg" alt="" width={30} height={30} />
          <strong>Grand Dunman Home</strong>
        </a>
      </header>

      <main className="content">{children}</main>

      {/* Phone bottom tab bar */}
      <nav className="tabbar">
        {navItems
          .filter((n) => mobilePrimary.includes(n.path))
          .map(({ path: p, label, icon: Icon }) => (
            <a key={p} href={href(p)} className={`tab ${isActive(p, path) ? 'active' : ''}`} onClick={() => setMoreOpen(false)}>
              <Icon size={22} strokeWidth={1.75} />
              <span>{label}</span>
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
    </div>
  );
}
