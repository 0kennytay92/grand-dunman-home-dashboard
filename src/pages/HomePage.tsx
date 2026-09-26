import { CalendarDays, DoorOpen, TriangleAlert, Wallet, ChevronRight, Gauge } from 'lucide-react';
import { budgetCategories, defects, expenses, project, rooms, tasks } from '../data/sampleData';
import { daysUntil, formatDate, money, roomName } from '../format';
import { href } from '../router';
import { navItems } from '../components/Layout';
import { Badge, Card, ProgressBar, Stat, statusTone } from '../components/ui';

export function HomePage() {
  const totalBudget = budgetCategories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = budgetCategories.reduce((s, c) => s + c.spent, 0);
  const overall = Math.round(rooms.reduce((s, r) => s + r.progress * r.areaSqm, 0) / rooms.reduce((s, r) => s + r.areaSqm, 0));
  const openDefects = defects.filter((d) => d.status !== 'Resolved');
  const inProgressRooms = rooms.filter((r) => r.status === 'In progress');
  const moveInDays = daysUntil(project.targetMoveIn);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Welcome home</p>
          <h1>{project.name}</h1>
          <p className="hero-sub">Renovation in progress · target move-in {formatDate(project.targetMoveIn)}</p>
        </div>
        <div className="hero-count">
          <span className="hero-count-num">{Math.max(moveInDays, 0)}</span>
          <span>days to move-in</span>
        </div>
      </section>

      <div className="stats-grid">
        <Stat icon={<Gauge size={18} />} label="Overall progress" value={`${overall}%`} hint={`${inProgressRooms.length} rooms under works`} />
        <Stat icon={<Wallet size={18} />} label="Budget used" value={money(totalSpent)} hint={`of ${money(totalBudget)}`} />
        <Stat icon={<TriangleAlert size={18} />} label="Open defects" value={String(openDefects.length)} hint={`${openDefects.filter((d) => d.severity === 'High').length} high priority`} />
        <Stat icon={<DoorOpen size={18} />} label="Rooms" value={String(rooms.length)} hint={`${rooms.filter((r) => r.status === 'Completed').length} completed`} />
      </div>

      <div className="grid-2">
        <Card title="Rooms under works" action={<a className="link" href={href('/rooms')}>All rooms <ChevronRight size={15} /></a>}>
          <ul className="list">
            {inProgressRooms.map((r) => (
              <li key={r.id}>
                <a className="list-row" href={href(`/rooms/${r.id}`)}>
                  <div className="grow">
                    <p className="row-title">{roomName(r.id)}</p>
                    <ProgressBar value={r.progress} />
                  </div>
                  <span className="row-meta">{r.progress}%</span>
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Coming up">
          <ul className="list">
            {tasks.map((t) => (
              <li key={t.id} className="list-row">
                <div className="date-tile">
                  <span>{formatDate(t.due, { month: 'short' })}</span>
                  <strong>{formatDate(t.due, { day: 'numeric' })}</strong>
                </div>
                <div className="grow">
                  <p className="row-title">{t.title}</p>
                  <p className="row-sub">{t.roomId ? roomName(t.roomId) : 'Whole home'}</p>
                </div>
                <CalendarDays size={16} className="muted" />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent spending" action={<a className="link" href={href('/budget')}>Budget <ChevronRight size={15} /></a>}>
          <ul className="list">
            {expenses.slice(0, 4).map((e) => (
              <li key={e.id} className="list-row">
                <div className="grow">
                  <p className="row-title">{e.description}</p>
                  <p className="row-sub">{e.vendor} · {formatDate(e.date)}</p>
                </div>
                <span className="row-amount">{money(e.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Open defects" action={<a className="link" href={href('/defects')}>All defects <ChevronRight size={15} /></a>}>
          <ul className="list">
            {openDefects.slice(0, 4).map((d) => (
              <li key={d.id} className="list-row">
                <div className="grow">
                  <p className="row-title">{d.title}</p>
                  <p className="row-sub">{roomName(d.roomId)}</p>
                </div>
                <Badge tone={statusTone[d.severity]}>{d.severity}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <h2 className="section-title">Quick access</h2>
      <div className="quick-grid">
        {navItems.slice(1).map(({ path, label, icon: Icon }) => (
          <a key={path} className="quick" href={href(path)}>
            <Icon size={22} strokeWidth={1.6} />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </>
  );
}
