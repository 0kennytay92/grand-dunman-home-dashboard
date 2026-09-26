// The shapes of the information the app keeps track of.

export type RoomStatus = 'Not started' | 'Planning' | 'In progress' | 'Completed';

export interface Room {
  id: string;
  name: string;
  includes?: string; // attached spaces, e.g. "Master Bath"
  areaSqm: number; // 0 = not measured yet
  status: RoomStatus;
  progress: number; // 0–100
  budget?: number; // planned spend for this room, in S$
  hue: number; // colour used for the room's placeholder artwork
  notes: string;
}

/** What kind of thing was measured. See measurementKinds.ts for the details of each. */
export type MeasurementKind = 'roomWidth' | 'roomLength' | 'ceilingHeight' | 'wall' | 'door' | 'window' | 'other';

export interface Measurement {
  id: string;
  roomId: string;
  kind: MeasurementKind;
  item: string; // name, e.g. "TV feature wall"
  widthMm?: number; // room width is stored here
  depthMm?: number; // room length is stored here
  heightMm?: number; // ceiling height is stored here
  sillMm?: number; // windows: height of the window's bottom edge above the floor
  note?: string;
  /** Shown as a label on a photo. x and y are 0–1 across/down the picture. The photo itself is never changed. */
  pin?: { photoId: string; x: number; y: number };
}

/** A photo's category. */
export type PhotoTag = 'Existing Condition' | 'Measurement' | 'Design Reference' | 'Renovation Progress';

export interface Photo {
  id: string;
  roomId: string;
  caption: string; // shown as "Description"
  date: string; // YYYY-MM-DD
  tag: PhotoTag; // shown as "Category"
  hasImage?: boolean; // false for sample photos, which show a placeholder
}

export type DesignStatus = 'Concept' | 'Shortlisted' | 'Selected' | 'Rejected';

export interface Design {
  id: string;
  roomId: string;
  title: string; // design name
  version: string; // e.g. "v2"
  date: string; // YYYY-MM-DD
  status: DesignStatus;
  notes: string; // shown as "Description"
  prompt: string; // the design prompt used to generate the render
  hasImage?: boolean; // the render, stored on the device under this design's id
  referenceIds: string[]; // reference images, each stored on the device under its own id
  palette?: string[]; // colour swatches, shown when there is no render yet
  style?: string;
  designer?: string;
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
  roomId?: string; // which room this was for (blank = whole home)
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
