// ─────────────────────────────────────────────────────────────
// SAMPLE DATA
// Made-up example content the app starts with. Once you begin
// editing in the app, your own data is saved on your device and
// this file is only used for "Reset to sample data".
// ─────────────────────────────────────────────────────────────

import type { AppData, BudgetCategory, Design, Expense, Measurement, Photo, Project, Room, Task } from './types';

// ── Project ──────────────────────────────────────────────────

const project: Project = {
  name: 'Grand Dunman Home',
  address: 'Grand Dunman, Dunman Road, Singapore',
  targetMoveIn: '2027-01-10',
};

// ── Rooms ────────────────────────────────────────────────────

const rooms: Room[] = [
  { id: 'lift-lobby', name: 'Private Lift Lobby', areaSqm: 5.5, status: 'Planning', progress: 15, budget: 5000, hue: 30, notes: 'Feature wall and shoe cabinet planned.' },
  { id: 'living', name: 'Living Room', areaSqm: 28, status: 'In progress', progress: 45, budget: 18000, hue: 38, notes: 'Hacking of false ceiling done; electrical points next.' },
  { id: 'dining', name: 'Dining Room', areaSqm: 14, status: 'In progress', progress: 40, budget: 8000, hue: 24, notes: 'Pendant light position to be confirmed.' },
  { id: 'dry-kitchen', name: 'Dry Kitchen', areaSqm: 9, status: 'Planning', progress: 20, budget: 15000, hue: 200, notes: 'Island counter quartz sample selected.' },
  { id: 'wet-kitchen', name: 'Wet Kitchen', includes: 'WC', areaSqm: 10.5, status: 'In progress', progress: 35, budget: 12000, hue: 190, notes: 'Hob and hood model shortlisted.' },
  { id: 'balcony', name: 'Balcony', areaSqm: 8, status: 'Not started', progress: 0, budget: 3000, hue: 110, notes: 'Outdoor tiles and planter idea.' },
  { id: 'master', name: 'Master Bedroom', includes: 'Master Bath', areaSqm: 24, status: 'In progress', progress: 55, budget: 25000, hue: 260, notes: 'Walk-in wardrobe carpentry in fabrication.' },
  { id: 'bedroom-2', name: 'Bedroom 2', areaSqm: 11, status: 'Planning', progress: 10, budget: 6000, hue: 280, notes: 'Study nook with built-in desk.' },
  { id: 'bedroom-3', name: 'Bedroom 3', includes: 'Bath 3', areaSqm: 13.5, status: 'Planning', progress: 10, budget: 6000, hue: 300, notes: 'Guest room layout.' },
  { id: 'junior-master', name: 'Junior Master', includes: 'Junior Master Bath', areaSqm: 17, status: 'In progress', progress: 30, budget: 10000, hue: 240, notes: 'Wardrobe drawings approved.' },
  { id: 'yard', name: 'Yard', areaSqm: 4, status: 'Not started', progress: 0, budget: 1500, hue: 90, notes: 'Retractable laundry rack.' },
  { id: 'power-room', name: 'Power Room', areaSqm: 3, status: 'Completed', progress: 100, hue: 50, notes: 'DB box access checked.' },
  { id: 'utility', name: 'Utility', areaSqm: 4.5, status: 'Not started', progress: 0, hue: 150, notes: 'Could become helper room or storage.' },
  { id: 'store', name: 'Store', areaSqm: 3.5, status: 'Completed', progress: 100, hue: 15, notes: 'Shelving installed.' },
];

// ── Measurements (millimetres) ───────────────────────────────

const measurements: Measurement[] = [
  // Dining Room – a complete example
  { id: 'm-din-w', roomId: 'dining', kind: 'roomWidth', item: 'Room width', widthMm: 3500 },
  { id: 'm-din-l', roomId: 'dining', kind: 'roomLength', item: 'Room length', depthMm: 4000 },
  { id: 'm-din-c', roomId: 'dining', kind: 'ceilingHeight', item: 'Ceiling height', heightMm: 2800 },
  { id: 'm-din-w1', roomId: 'dining', kind: 'wall', item: 'Feature wall (sideboard)', widthMm: 3500, heightMm: 2800, note: 'Power point at 300 mm for sideboard lamp' },
  { id: 'm-din-w2', roomId: 'dining', kind: 'wall', item: 'Wall facing kitchen', widthMm: 4000, heightMm: 2800 },
  { id: 'm-din-d1', roomId: 'dining', kind: 'door', item: 'Opening to dry kitchen', widthMm: 900, heightMm: 2100 },
  { id: 'm-din-win', roomId: 'dining', kind: 'window', item: 'Main window', widthMm: 1800, heightMm: 1500, sillMm: 900, note: 'Curtain track needs 150 mm each side' },
  { id: 'm-din-o1', roomId: 'dining', kind: 'other', item: 'Pendant light point (from wall A)', widthMm: 1750, depthMm: 2000 },

  { id: 'm-lob-w', roomId: 'lift-lobby', kind: 'roomWidth', item: 'Room width', widthMm: 2100 },
  { id: 'm-lob-l', roomId: 'lift-lobby', kind: 'roomLength', item: 'Room length', depthMm: 2600 },
  { id: 'm-lob-w1', roomId: 'lift-lobby', kind: 'wall', item: 'Shoe cabinet wall', widthMm: 1800, heightMm: 2700 },
  { id: 'm-lob-d1', roomId: 'lift-lobby', kind: 'door', item: 'Main door', widthMm: 1050, heightMm: 2400 },

  { id: 'm-liv-w', roomId: 'living', kind: 'roomWidth', item: 'Room width', widthMm: 4800 },
  { id: 'm-liv-l', roomId: 'living', kind: 'roomLength', item: 'Room length', depthMm: 5800 },
  { id: 'm-liv-c', roomId: 'living', kind: 'ceilingHeight', item: 'Ceiling height', heightMm: 2800 },
  { id: 'm-liv-w1', roomId: 'living', kind: 'wall', item: 'TV feature wall', widthMm: 3600, heightMm: 2800, note: 'Allow 150 mm for concealed trunking' },
  { id: 'm-liv-d1', roomId: 'living', kind: 'door', item: 'Sliding door to balcony', widthMm: 3200, heightMm: 2400 },

  { id: 'm-dk-w', roomId: 'dry-kitchen', kind: 'roomWidth', item: 'Room width', widthMm: 2800 },
  { id: 'm-dk-l', roomId: 'dry-kitchen', kind: 'roomLength', item: 'Room length', depthMm: 3200 },
  { id: 'm-dk-o1', roomId: 'dry-kitchen', kind: 'other', item: 'Island counter', widthMm: 2200, depthMm: 900, heightMm: 900 },

  { id: 'm-wk-w', roomId: 'wet-kitchen', kind: 'roomWidth', item: 'Room width', widthMm: 2400 },
  { id: 'm-wk-l', roomId: 'wet-kitchen', kind: 'roomLength', item: 'Room length', depthMm: 3000 },
  { id: 'm-wk-o1', roomId: 'wet-kitchen', kind: 'other', item: 'Counter run', widthMm: 3000, depthMm: 600 },
  { id: 'm-wk-o2', roomId: 'wet-kitchen', kind: 'other', item: 'WC floor', widthMm: 1200, depthMm: 1500 },

  { id: 'm-bal-w', roomId: 'balcony', kind: 'roomWidth', item: 'Room width', widthMm: 4000 },
  { id: 'm-bal-l', roomId: 'balcony', kind: 'roomLength', item: 'Room length', depthMm: 2000 },

  { id: 'm-mas-w', roomId: 'master', kind: 'roomWidth', item: 'Room width', widthMm: 4200 },
  { id: 'm-mas-l', roomId: 'master', kind: 'roomLength', item: 'Room length', depthMm: 4600 },
  { id: 'm-mas-c', roomId: 'master', kind: 'ceilingHeight', item: 'Ceiling height', heightMm: 2700 },
  { id: 'm-mas-w1', roomId: 'master', kind: 'wall', item: 'Wardrobe wall', widthMm: 3000, heightMm: 2700 },
  { id: 'm-mas-o1', roomId: 'master', kind: 'other', item: 'Master Bath vanity', widthMm: 1500, depthMm: 550 },

  { id: 'm-b2-w', roomId: 'bedroom-2', kind: 'roomWidth', item: 'Room width', widthMm: 3000 },
  { id: 'm-b2-l', roomId: 'bedroom-2', kind: 'roomLength', item: 'Room length', depthMm: 3500 },
  { id: 'm-b2-win', roomId: 'bedroom-2', kind: 'window', item: 'Window', widthMm: 1800, heightMm: 1500, sillMm: 800 },

  { id: 'm-b3-w', roomId: 'bedroom-3', kind: 'roomWidth', item: 'Room width', widthMm: 3200 },
  { id: 'm-b3-l', roomId: 'bedroom-3', kind: 'roomLength', item: 'Room length', depthMm: 3800 },
  { id: 'm-jm-w', roomId: 'junior-master', kind: 'roomWidth', item: 'Room width', widthMm: 3600 },
  { id: 'm-jm-l', roomId: 'junior-master', kind: 'roomLength', item: 'Room length', depthMm: 4200 },
  { id: 'm-yard-w', roomId: 'yard', kind: 'roomWidth', item: 'Room width', widthMm: 1600 },
  { id: 'm-yard-l', roomId: 'yard', kind: 'roomLength', item: 'Room length', depthMm: 2400 },
  { id: 'm-ut-w', roomId: 'utility', kind: 'roomWidth', item: 'Room width', widthMm: 1800 },
  { id: 'm-ut-l', roomId: 'utility', kind: 'roomLength', item: 'Room length', depthMm: 2400 },
  { id: 'm-st-w', roomId: 'store', kind: 'roomWidth', item: 'Room width', widthMm: 1500 },
  { id: 'm-st-l', roomId: 'store', kind: 'roomLength', item: 'Room length', depthMm: 2300 },
  { id: 'm-pr-w', roomId: 'power-room', kind: 'roomWidth', item: 'Room width', widthMm: 1200 },
  { id: 'm-pr-l', roomId: 'power-room', kind: 'roomLength', item: 'Room length', depthMm: 2400 },
];

// ── Photos ───────────────────────────────────────────────────

const photos: Photo[] = [
  { id: 'p1', roomId: 'living', caption: 'Living room at key collection', date: '2026-08-15', tag: 'Before' },
  { id: 'p2', roomId: 'living', caption: 'False ceiling hacked', date: '2026-09-12', tag: 'Progress' },
  { id: 'p3', roomId: 'master', caption: 'Wardrobe carcass delivered', date: '2026-09-20', tag: 'Progress' },
  { id: 'p4', roomId: 'dry-kitchen', caption: 'Quartz island inspiration', date: '2026-08-28', tag: 'Inspiration' },
  { id: 'p5', roomId: 'balcony', caption: 'Balcony view at key collection', date: '2026-08-15', tag: 'Before' },
  { id: 'p6', roomId: 'lift-lobby', caption: 'Fluted panel feature wall idea', date: '2026-09-01', tag: 'Inspiration' },
  { id: 'p7', roomId: 'wet-kitchen', caption: 'Wall tiles removed', date: '2026-09-18', tag: 'Progress' },
  { id: 'p8', roomId: 'junior-master', caption: 'Junior Master empty room', date: '2026-08-15', tag: 'Before' },
  { id: 'p9', roomId: 'dining', caption: 'Pendant light reference', date: '2026-09-05', tag: 'Inspiration' },
];

// ── Interior designs ─────────────────────────────────────────

const designs: Design[] = [
  { id: 'd1', roomId: 'living', title: 'Warm Minimal Living', style: 'Japandi', designer: 'Studio Oak & Stone', status: 'Approved', palette: ['#e9e2d6', '#c4a57f', '#7a6a58', '#2f2b27'], notes: 'Oak veneer TV console, linen curtains, cove lighting.' },
  { id: 'd2', roomId: 'dining', title: 'Dining Nook', style: 'Japandi', designer: 'Studio Oak & Stone', status: 'Under review', palette: ['#f1ece4', '#b89b76', '#5c5046'], notes: 'Round travertine table with fluted bench.' },
  { id: 'd3', roomId: 'dry-kitchen', title: 'Island Kitchen', style: 'Modern Luxe', designer: 'Studio Oak & Stone', status: 'Draft', palette: ['#f5f5f3', '#9aa3a6', '#3d4447', '#b08d57'], notes: 'Calacatta-look quartz, brushed brass handles.' },
  { id: 'd4', roomId: 'master', title: 'Hotel-style Master Suite', style: 'Contemporary', designer: 'Studio Oak & Stone', status: 'Approved', palette: ['#ece7e1', '#a39585', '#4a4037', '#1f1c19'], notes: 'Upholstered headboard wall, glass-front wardrobe.' },
  { id: 'd5', roomId: 'lift-lobby', title: 'Welcome Lobby', style: 'Modern Luxe', designer: 'Studio Oak & Stone', status: 'Under review', palette: ['#e8e1d5', '#a0784c', '#2e2a25'], notes: 'Fluted panels with concealed shoe storage.' },
  { id: 'd6', roomId: 'junior-master', title: 'Calm Junior Master', style: 'Scandinavian', designer: 'Studio Oak & Stone', status: 'Draft', palette: ['#f3f1ec', '#c9d1cc', '#7d8c84'], notes: 'Sage accent wall, light ash wood.' },
];

// ── Budget (Singapore dollars) ───────────────────────────────

const budgetCategories: BudgetCategory[] = [
  { id: 'carpentry', name: 'Carpentry', budget: 45000 },
  { id: 'electrical', name: 'Electrical & Lighting', budget: 15000 },
  { id: 'flooring', name: 'Flooring & Tiling', budget: 18000 },
  { id: 'kitchen', name: 'Kitchen & Appliances', budget: 20000 },
  { id: 'bath', name: 'Bathrooms', budget: 12000 },
  { id: 'painting', name: 'Painting', budget: 5000 },
  { id: 'furniture', name: 'Furniture & Decor', budget: 25000 },
];

const expenses: Expense[] = [
  { id: 'e1', date: '2026-09-22', description: 'Master wardrobe – 2nd payment', categoryId: 'carpentry', vendor: 'Oak & Stone Carpentry', amount: 7500, roomId: 'master' },
  { id: 'e2', date: '2026-09-18', description: 'Wiring & new power points', categoryId: 'electrical', vendor: 'BrightSpark Electrical', amount: 3200 },
  { id: 'e3', date: '2026-09-15', description: 'Hob & hood deposit', categoryId: 'kitchen', vendor: 'KitchenPro SG', amount: 3500, roomId: 'wet-kitchen' },
  { id: 'e4', date: '2026-09-10', description: 'Vinyl flooring deposit', categoryId: 'flooring', vendor: 'FloorCraft', amount: 4800 },
  { id: 'e5', date: '2026-09-05', description: 'Carpentry deposit (30%)', categoryId: 'carpentry', vendor: 'Oak & Stone Carpentry', amount: 15000 },
  { id: 'e6', date: '2026-09-02', description: 'Lighting fixtures', categoryId: 'electrical', vendor: 'Lumière Lighting', amount: 3000, roomId: 'living' },
  { id: 'e7', date: '2026-08-30', description: 'Master Bath fittings', categoryId: 'bath', vendor: 'BathHaus', amount: 1800, roomId: 'master' },
  { id: 'e8', date: '2026-08-25', description: 'Dining chairs (4)', categoryId: 'furniture', vendor: 'Nordic Living', amount: 2400, roomId: 'dining' },
];

// ── Upcoming tasks (shown on Home) ───────────────────────────

const tasks: Task[] = [
  { id: 't1', title: 'Confirm pendant light position', due: '2026-09-29', roomId: 'dining' },
  { id: 't2', title: 'Approve kitchen island drawing', due: '2026-10-02', roomId: 'dry-kitchen' },
  { id: 't3', title: 'Book aircon installation', due: '2026-10-06' },
  { id: 't4', title: 'Select balcony tiles', due: '2026-10-10', roomId: 'balcony' },
];

export const sampleData: AppData = {
  version: 1,
  project,
  rooms,
  measurements,
  photos,
  designs,
  budgetCategories,
  expenses,
  tasks,
};
