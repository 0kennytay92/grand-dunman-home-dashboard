// The shapes of the information the app keeps track of.

export type RoomStatus = 'Not started' | 'Planning' | 'In progress' | 'Completed';

export interface Room {
  id: string;
  name: string;
  includes?: string; // attached spaces, e.g. "Master Bath"
  areaSqm: number; // 0 = not measured yet
  status: RoomStatus;
  progress: number; // 0–100
  hue: number; // colour used for the room's placeholder artwork
  notes: string;
}

export interface Measurement {
  id: string;
  roomId: string;
  item: string;
  widthMm?: number;
  depthMm?: number;
  heightMm?: number;
  note?: string;
}

export type PhotoTag = 'Before' | 'Progress' | 'Inspiration';

export interface Photo {
  id: string;
  roomId: string;
  caption: string;
  date: string; // YYYY-MM-DD
  tag: PhotoTag;
}

export type DesignStatus = 'Draft' | 'Under review' | 'Approved';

export interface Design {
  id: string;
  roomId: string;
  title: string;
  style: string;
  designer: string;
  status: DesignStatus;
  palette: string[];
  notes: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  budget: number; // "spent" is worked out from the payments
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  categoryId: string;
  vendor: string;
  amount: number;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  roomId?: string;
  done?: boolean;
}

export interface Project {
  name: string;
  address: string;
  targetMoveIn: string;
}

/** Everything the app stores, in one bundle. */
export interface AppData {
  version: 1;
  project: Project;
  rooms: Room[];
  measurements: Measurement[];
  photos: Photo[];
  designs: Design[];
  budgetCategories: BudgetCategory[];
  expenses: Expense[];
  tasks: Task[];
}
