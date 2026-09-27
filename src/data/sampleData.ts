// ─────────────────────────────────────────────────────────────
// SAMPLE DATA
// Made-up example content the app starts with. Once you begin
// editing in the app, your own data is saved on your device and
// this file is only used for "Reset to sample data".
// ─────────────────────────────────────────────────────────────

import type { AppData, BudgetCategory, Design, Measurement, Payment, Photo, Project, PurchaseItem, Room, Task, Vendor } from './types';

// ── Project ──────────────────────────────────────────────────

const project: Project = {
  name: 'Grand Dunman Home',
  address: 'Grand Dunman, Dunman Road, Singapore',
  targetMoveIn: '2027-01-10',
};

// ── Rooms ────────────────────────────────────────────────────

const rooms: Room[] = [
  { id: 'lift-lobby', name: 'Private Lift Lobby', areaSqm: 4.1, status: 'Planning', progress: 15, budget: 5000, hue: 30, notes: 'Feature wall and shoe cabinet planned.' },
  { id: 'living', name: 'Living Room', areaSqm: 17.6, status: 'In progress', progress: 45, budget: 18000, hue: 38, notes: 'Hacking of false ceiling done; electrical points next.' },
  { id: 'dining', name: 'Dining Room', areaSqm: 13.4, status: 'In progress', progress: 40, budget: 8000, hue: 24, notes: 'Pendant light position to be confirmed.' },
  { id: 'dry-kitchen', name: 'Dry Kitchen', areaSqm: 4.6, status: 'Planning', progress: 20, budget: 15000, hue: 200, notes: 'Island counter quartz sample selected.' },
  { id: 'wet-kitchen', name: 'Wet Kitchen', includes: 'WC', areaSqm: 9.1, status: 'In progress', progress: 35, budget: 12000, hue: 190, notes: 'Hob and hood model shortlisted.' },
  { id: 'balcony', name: 'Balcony', areaSqm: 9, status: 'Not started', progress: 0, budget: 3000, hue: 110, notes: 'Outdoor tiles and planter idea.' },
  { id: 'master', name: 'Master Bedroom', includes: 'Master Bath', areaSqm: 16.5, status: 'In progress', progress: 55, budget: 25000, hue: 260, notes: 'Walk-in wardrobe carpentry in fabrication.' },
  { id: 'bedroom-2', name: 'Bedroom 2', areaSqm: 9.7, status: 'Planning', progress: 10, budget: 6000, hue: 280, notes: 'Study nook with built-in desk.' },
  { id: 'bedroom-3', name: 'Bedroom 3', includes: 'Bath 3', areaSqm: 9.9, status: 'Planning', progress: 10, budget: 6000, hue: 300, notes: 'Guest room layout.' },
  { id: 'junior-master', name: 'Junior Master', includes: 'Junior Master Bath', areaSqm: 11.8, status: 'In progress', progress: 30, budget: 10000, hue: 240, notes: 'Wardrobe drawings approved.' },
  { id: 'yard', name: 'Yard', areaSqm: 3.6, status: 'Not started', progress: 0, budget: 1500, hue: 90, notes: 'Retractable laundry rack.' },
  { id: 'power-room', name: 'Power Room', areaSqm: 2.1, status: 'Completed', progress: 100, hue: 50, notes: 'DB box access checked.' },
  { id: 'utility', name: 'Utility', areaSqm: 3.1, status: 'Not started', progress: 0, hue: 150, notes: 'Could become helper room or storage.' },
  { id: 'store', name: 'Store', areaSqm: 2.1, status: 'Completed', progress: 100, hue: 15, notes: 'Shelving installed.' },
];

// ── Measurements (millimetres) ───────────────────────────────

const measurements: Measurement[] = [
  // Dining Room – a complete example
  { id: 'm-din-w', roomId: 'dining', kind: 'roomWidth', item: 'Room width', widthMm: 3750 },
  { id: 'm-din-l', roomId: 'dining', kind: 'roomLength', item: 'Room length', depthMm: 3560 },
  { id: 'm-din-c', roomId: 'dining', kind: 'ceilingHeight', item: 'Ceiling height', heightMm: 2800 },
  { id: 'm-din-w1', roomId: 'dining', kind: 'wall', item: 'Feature wall (sideboard)', widthMm: 3500, heightMm: 2800, note: 'Power point at 300 mm for sideboard lamp' },
  { id: 'm-din-w2', roomId: 'dining', kind: 'wall', item: 'Wall facing kitchen', widthMm: 4000, heightMm: 2800 },
  { id: 'm-din-d1', roomId: 'dining', kind: 'door', item: 'Opening to dry kitchen', widthMm: 900, heightMm: 2100 },
  { id: 'm-din-win', roomId: 'dining', kind: 'window', item: 'Main window', widthMm: 1800, heightMm: 1500, sillMm: 900, note: 'Curtain track needs 150 mm each side' },
  { id: 'm-din-o1', roomId: 'dining', kind: 'other', item: 'Pendant light point (from wall A)', widthMm: 1750, depthMm: 2000 },

  { id: 'm-lob-w', roomId: 'lift-lobby', kind: 'roomWidth', item: 'Room width', widthMm: 1890 },
  { id: 'm-lob-l', roomId: 'lift-lobby', kind: 'roomLength', item: 'Room length', depthMm: 2150 },
  { id: 'm-lob-w1', roomId: 'lift-lobby', kind: 'wall', item: 'Shoe cabinet wall', widthMm: 1800, heightMm: 2700 },
  { id: 'm-lob-d1', roomId: 'lift-lobby', kind: 'door', item: 'Main door', widthMm: 1050, heightMm: 2400 },

  { id: 'm-liv-w', roomId: 'living', kind: 'roomWidth', item: 'Room width', widthMm: 3780 },
  { id: 'm-liv-l', roomId: 'living', kind: 'roomLength', item: 'Room length', depthMm: 4650 },
  { id: 'm-liv-c', roomId: 'living', kind: 'ceilingHeight', item: 'Ceiling height', heightMm: 2800 },
  { id: 'm-liv-w1', roomId: 'living', kind: 'wall', item: 'TV feature wall', widthMm: 3600, heightMm: 2800, note: 'Allow 150 mm for concealed trunking' },
  { id: 'm-liv-d1', roomId: 'living', kind: 'door', item: 'Sliding door to balcony', widthMm: 3200, heightMm: 2400 },

  { id: 'm-dk-w', roomId: 'dry-kitchen', kind: 'roomWidth', item: 'Room width', widthMm: 3800 },
  { id: 'm-dk-l', roomId: 'dry-kitchen', kind: 'roomLength', item: 'Room length', depthMm: 1200 },
  { id: 'm-dk-o1', roomId: 'dry-kitchen', kind: 'other', item: 'Island counter', widthMm: 2200, depthMm: 900, heightMm: 900 },

  { id: 'm-wk-w', roomId: 'wet-kitchen', kind: 'roomWidth', item: 'Room width', widthMm: 5230 },
  { id: 'm-wk-l', roomId: 'wet-kitchen', kind: 'roomLength', item: 'Room length', depthMm: 1740 },
  { id: 'm-wk-o1', roomId: 'wet-kitchen', kind: 'other', item: 'Counter run', widthMm: 3000, depthMm: 600 },
  { id: 'm-wk-o2', roomId: 'wet-kitchen', kind: 'other', item: 'WC floor', widthMm: 1200, depthMm: 1500 },

  { id: 'm-bal-w', roomId: 'balcony', kind: 'roomWidth', item: 'Room width', widthMm: 1800, note: 'Measured 1.8 m, wider than the plan drawing' },
  { id: 'm-bal-l', roomId: 'balcony', kind: 'roomLength', item: 'Room length', depthMm: 5000 },

  { id: 'm-mas-w', roomId: 'master', kind: 'roomWidth', item: 'Room width', widthMm: 2780 },
  { id: 'm-mas-l', roomId: 'master', kind: 'roomLength', item: 'Room length', depthMm: 5930 },
  { id: 'm-mas-c', roomId: 'master', kind: 'ceilingHeight', item: 'Ceiling height', heightMm: 2700 },
  { id: 'm-mas-w1', roomId: 'master', kind: 'wall', item: 'Wardrobe wall', widthMm: 3000, heightMm: 2700 },
  { id: 'm-mas-o1', roomId: 'master', kind: 'other', item: 'Master Bath vanity', widthMm: 1500, depthMm: 550 },

  { id: 'm-b2-w', roomId: 'bedroom-2', kind: 'roomWidth', item: 'Room width', widthMm: 2580 },
  { id: 'm-b2-l', roomId: 'bedroom-2', kind: 'roomLength', item: 'Room length', depthMm: 3760 },
  { id: 'm-b2-win', roomId: 'bedroom-2', kind: 'window', item: 'Window', widthMm: 1800, heightMm: 1500, sillMm: 800 },

  { id: 'm-b3-w', roomId: 'bedroom-3', kind: 'roomWidth', item: 'Room width', widthMm: 2610 },
  { id: 'm-b3-l', roomId: 'bedroom-3', kind: 'roomLength', item: 'Room length', depthMm: 3790 },
  { id: 'm-jm-w', roomId: 'junior-master', kind: 'roomWidth', item: 'Room width', widthMm: 4230 },
  { id: 'm-jm-l', roomId: 'junior-master', kind: 'roomLength', item: 'Room length', depthMm: 2790 },
  { id: 'm-yard-w', roomId: 'yard', kind: 'roomWidth', item: 'Room width', widthMm: 3040 },
  { id: 'm-yard-l', roomId: 'yard', kind: 'roomLength', item: 'Room length', depthMm: 1200 },
  { id: 'm-ut-w', roomId: 'utility', kind: 'roomWidth', item: 'Room width', widthMm: 1600 },
  { id: 'm-ut-l', roomId: 'utility', kind: 'roomLength', item: 'Room length', depthMm: 1940 },
  { id: 'm-st-w', roomId: 'store', kind: 'roomWidth', item: 'Room width', widthMm: 1780 },
  { id: 'm-st-l', roomId: 'store', kind: 'roomLength', item: 'Room length', depthMm: 1190 },
  { id: 'm-pr-w', roomId: 'power-room', kind: 'roomWidth', item: 'Room width', widthMm: 1900 },
  { id: 'm-pr-l', roomId: 'power-room', kind: 'roomLength', item: 'Room length', depthMm: 1100 },
];

// ── Photos ───────────────────────────────────────────────────

const photos: Photo[] = [
  { id: 'p1', roomId: 'living', caption: 'Living room at key collection', date: '2026-08-15', tag: 'Existing Condition' },
  { id: 'p2', roomId: 'living', caption: 'False ceiling hacked', date: '2026-09-12', tag: 'Renovation Progress' },
  { id: 'p3', roomId: 'master', caption: 'Wardrobe carcass delivered', date: '2026-09-20', tag: 'Renovation Progress' },
  { id: 'p4', roomId: 'dry-kitchen', caption: 'Quartz island inspiration', date: '2026-08-28', tag: 'Design Reference' },
  { id: 'p5', roomId: 'balcony', caption: 'Balcony view at key collection', date: '2026-08-15', tag: 'Existing Condition' },
  { id: 'p6', roomId: 'lift-lobby', caption: 'Fluted panel feature wall idea', date: '2026-09-01', tag: 'Design Reference' },
  { id: 'p7', roomId: 'wet-kitchen', caption: 'Wall tiles removed', date: '2026-09-18', tag: 'Renovation Progress' },
  { id: 'p8', roomId: 'junior-master', caption: 'Junior Master empty room', date: '2026-08-15', tag: 'Existing Condition' },
  { id: 'p9', roomId: 'dining', caption: 'Pendant light reference', date: '2026-09-05', tag: 'Design Reference' },
];

// ── Interior designs ─────────────────────────────────────────

const designs: Design[] = [
  {
    id: 'd1', roomId: 'living', title: 'Warm Minimal Living', version: 'v1', date: '2026-08-30', status: 'Selected',
    notes: 'Oak veneer TV console, linen curtains, cove lighting.',
    prompt: 'Photorealistic render of a Singapore condo living room, Japandi style, light oak TV feature wall with fluted panels, warm cove lighting, linen sheer curtains, beige boucle sofa, travertine coffee table, soft afternoon light, 35mm lens, eye level',
    referenceIds: [], palette: ['#e9e2d6', '#c4a57f', '#7a6a58', '#2f2b27'],
  },
  {
    id: 'd1b', roomId: 'living', title: 'Warm Minimal Living', version: 'v2', date: '2026-09-06', status: 'Shortlisted',
    notes: 'Same layout with darker walnut console and brass accents.',
    prompt: 'Same living room as v1, walnut TV console instead of oak, brushed brass accents, warmer 2700K lighting, dusk',
    referenceIds: [], palette: ['#e6ddd0', '#8a6547', '#3b2c22', '#b08d57'],
  },
  {
    id: 'd1c', roomId: 'living', title: 'Scandi Light Living', version: 'v1', date: '2026-09-10', status: 'Rejected',
    notes: 'Too cold for the space – kept for reference.',
    prompt: 'Scandinavian living room, white walls, pale ash floor, grey fabric sofa, black accents, overcast daylight',
    referenceIds: [], palette: ['#f4f4f2', '#d9d6d0', '#8f9396', '#2b2d2f'],
  },
  {
    id: 'd2', roomId: 'dining', title: 'Dining Nook', version: 'v1', date: '2026-09-02', status: 'Shortlisted',
    notes: 'Round travertine table with fluted bench.',
    prompt: 'Dining area in a condo, round travertine dining table for 4, built-in fluted oak bench along the wall, linen pendant light, Japandi, warm evening light',
    referenceIds: [], palette: ['#f1ece4', '#b89b76', '#5c5046'],
  },
  {
    id: 'd2b', roomId: 'dining', title: 'Dining Nook', version: 'v2', date: '2026-09-12', status: 'Concept',
    notes: 'Rectangular table for 6, sideboard on the feature wall.',
    prompt: 'Same dining area, rectangular oak table for 6, low sideboard on the feature wall, two linear pendants',
    referenceIds: [], palette: ['#eee7dc', '#a7875f', '#4f443a'],
  },
  {
    id: 'd3', roomId: 'dry-kitchen', title: 'Island Kitchen', version: 'v1', date: '2026-08-28', status: 'Concept',
    notes: 'Calacatta-look quartz, brushed brass handles.',
    prompt: 'Open dry kitchen with 2.2 m island, calacatta-look quartz top, matte greige cabinets, brushed brass handles, three small pendants',
    referenceIds: [], palette: ['#f5f5f3', '#9aa3a6', '#3d4447', '#b08d57'],
  },
  {
    id: 'd4', roomId: 'master', title: 'Hotel-style Master Suite', version: 'v1', date: '2026-08-25', status: 'Selected',
    notes: 'Upholstered headboard wall, glass-front wardrobe.',
    prompt: 'Luxury hotel-style master bedroom, full-height upholstered headboard wall, glass-front walk-in wardrobe with lighting, warm grey and taupe, soft cove lighting',
    referenceIds: [], palette: ['#ece7e1', '#a39585', '#4a4037', '#1f1c19'],
  },
  {
    id: 'd5', roomId: 'lift-lobby', title: 'Welcome Lobby', version: 'v1', date: '2026-09-01', status: 'Shortlisted',
    notes: 'Fluted panels with concealed shoe storage.',
    prompt: 'Private lift lobby, full-height fluted oak panels hiding shoe cabinets, bench seat, bronze mirror, warm downlights',
    referenceIds: [], palette: ['#e8e1d5', '#a0784c', '#2e2a25'],
  },
  {
    id: 'd6', roomId: 'junior-master', title: 'Calm Junior Master', version: 'v1', date: '2026-09-08', status: 'Concept',
    notes: 'Sage accent wall, light ash wood.',
    prompt: 'Calm bedroom, sage green accent wall behind the bed, light ash wood wardrobe, white linen bedding, morning light',
    referenceIds: [], palette: ['#f3f1ec', '#c9d1cc', '#7d8c84'],
  },
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

// ── Vendors, items and payments (made-up examples) ──────────

const vendors: Vendor[] = [
  { id: 'vendor-oak-and-stone-carpentry', name: 'Oak & Stone Carpentry', contactPerson: 'Mr Tan', mobile: '+65 8000 0001' },
  { id: 'vendor-brightspark-electrical', name: 'BrightSpark Electrical' },
  { id: 'vendor-kitchenpro-sg', name: 'KitchenPro SG' },
  { id: 'vendor-floorcraft', name: 'FloorCraft' },
  { id: 'vendor-lumiere-lighting', name: 'Lumière Lighting' },
  { id: 'vendor-bathhaus', name: 'BathHaus' },
  { id: 'vendor-nordic-living', name: 'Nordic Living' },
];

const item = (x: Partial<PurchaseItem> & Pick<PurchaseItem, 'id' | 'name' | 'totalAmount'>): PurchaseItem => ({
  amountStatus: 'Confirmed', deliveryStatus: 'Not Ordered', installationStatus: 'Not Required', photoIds: [], ...x,
});

const purchases: PurchaseItem[] = [
  item({ id: 'i-carpentry', name: 'Carpentry package', vendorId: 'vendor-oak-and-stone-carpentry', categoryId: 'carpentry', totalAmount: 50000, description: 'Wardrobes, kitchen cabinets and TV consoles', orderDate: '2026-09-05', deliveryStatus: 'Ordered', installationStatus: 'Awaiting Installation' }),
  item({ id: 'i-wiring', name: 'Wiring & power points', vendorId: 'vendor-brightspark-electrical', categoryId: 'electrical', totalAmount: 6400, installationStatus: 'Installation In Progress' }),
  item({ id: 'i-hob-hood', name: 'Hob & hood', vendorId: 'vendor-kitchenpro-sg', roomId: 'wet-kitchen', categoryId: 'kitchen', totalAmount: 7000, deliveryStatus: 'Delivery Scheduled', expectedDelivery: '2026-10-12', installationStatus: 'Awaiting Installation' }),
  item({ id: 'i-vinyl', name: 'Vinyl flooring', vendorId: 'vendor-floorcraft', categoryId: 'flooring', totalAmount: 12000, amountStatus: 'Estimated', deliveryStatus: 'Ordered', installationStatus: 'Awaiting Installation' }),
  item({ id: 'i-living-lights', name: 'Living room lighting', vendorId: 'vendor-lumiere-lighting', roomId: 'living', categoryId: 'electrical', totalAmount: 3000, deliveryStatus: 'Delivered', actualDelivery: '2026-09-10', installationStatus: 'Installation Scheduled', expectedInstallation: '2026-10-03' }),
  item({ id: 'i-master-bath', name: 'Master Bath fittings', vendorId: 'vendor-bathhaus', roomId: 'master', categoryId: 'bath', totalAmount: 1800, deliveryStatus: 'Delivered', installationStatus: 'Completed' }),
  item({ id: 'i-dining-chairs', name: 'Dining chairs', vendorId: 'vendor-nordic-living', roomId: 'dining', categoryId: 'furniture', totalAmount: 2400, quantity: 4, deliveryStatus: 'Delivered' }),
  item({ id: 'i-aircon', name: 'Aircon system', categoryId: 'cat-air-conditioning', totalAmount: null, amountStatus: 'Estimated', installationStatus: 'Awaiting Installation' }),
  item({ id: 'i-balcony-set', name: 'Balcony outdoor set', roomId: 'balcony', categoryId: 'furniture', totalAmount: null, amountStatus: 'Estimated' }),
];

const pay = (x: Omit<Payment, 'status' | 'type'> & Partial<Pick<Payment, 'status' | 'type'>>): Payment => ({ status: 'Paid', type: 'Other', ...x });

const payments: Payment[] = [
  pay({ id: 'p1', itemId: 'i-carpentry', vendorId: 'vendor-oak-and-stone-carpentry', amount: 15000, date: '2026-09-05', type: 'Deposit', method: 'Bank transfer', description: 'Carpentry deposit (30%)' }),
  pay({ id: 'p2', itemId: 'i-carpentry', vendorId: 'vendor-oak-and-stone-carpentry', amount: 7500, date: '2026-09-22', type: 'Progress Payment', method: 'PayNow', description: 'Master wardrobe – 2nd payment' }),
  pay({ id: 'p3', itemId: 'i-carpentry', vendorId: 'vendor-oak-and-stone-carpentry', amount: 15000, date: '2026-10-15', status: 'Scheduled', type: 'Progress Payment' }),
  pay({ id: 'p4', itemId: 'i-wiring', vendorId: 'vendor-brightspark-electrical', amount: 3200, date: '2026-09-18', type: 'Deposit', method: 'PayNow' }),
  pay({ id: 'p5', itemId: 'i-hob-hood', vendorId: 'vendor-kitchenpro-sg', amount: 3500, date: '2026-09-15', type: 'Deposit', method: 'Credit card' }),
  pay({ id: 'p6', itemId: 'i-vinyl', vendorId: 'vendor-floorcraft', amount: 4800, date: '2026-09-10', type: 'Deposit', method: 'Bank transfer' }),
  pay({ id: 'p7', itemId: 'i-living-lights', vendorId: 'vendor-lumiere-lighting', amount: 3000, date: '2026-09-02', type: 'Final Payment', method: 'Credit card' }),
  pay({ id: 'p8', itemId: 'i-master-bath', vendorId: 'vendor-bathhaus', amount: 1800, date: '2026-08-30', type: 'Final Payment', method: 'PayNow' }),
  pay({ id: 'p9', itemId: 'i-dining-chairs', vendorId: 'vendor-nordic-living', amount: 2400, date: '2026-08-25', type: 'Final Payment', method: 'Credit card' }),
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
  expenses: [],
  vendors,
  purchases,
  payments,
  documents: [],
  issues: [],
  messages: [],
  tasks,
};
