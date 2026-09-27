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
  budget: number; // no longer used: item amounts replaced category budgets (kept so nothing is lost)
}

/** A payment from before the budget upgrade. Each one was copied into `payments`; kept unchanged as a record. */
export interface Expense {
  id: string;
  date: string;
  description: string;
  categoryId: string;
  vendor: string;
  amount: number;
  roomId?: string; // which room this was for (blank = whole home)
  migrated?: boolean; // true once copied into `payments`
}

// ── Renovation budget: vendors, items and payments ───────────

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  uen?: string;
  notes?: string;
}

/** Whether an item's total amount is a guess or agreed with the vendor. */
export type AmountStatus = 'Estimated' | 'Confirmed';

export type DeliveryStatus =
  | 'Not Ordered' | 'Ordered' | 'Awaiting Delivery Date' | 'Delivery Scheduled'
  | 'Partially Delivered' | 'Delivered' | 'Delivery Issue' | 'Returned / Exchanged';

export type InstallationStatus =
  | 'Not Required' | 'Awaiting Installation' | 'Installation Scheduled' | 'Installation In Progress'
  | 'Installed' | 'Installation Issue' | 'Completed';

/** How something looked when it was checked on delivery or after installation. */
export type InspectionCondition =
  | 'Good' | 'Minor Issue' | 'Damaged' | 'Wrong Item' | 'Incomplete Delivery' // delivery
  | 'Not Installed Correctly' | 'Incomplete Installation'; // installation

export interface Inspection {
  date: string; // YYYY-MM-DD
  condition: InspectionCondition;
  accepted: boolean; // false = an issue was reported
  notes?: string;
  photoIds: string[];
  issueId?: string;
}

export interface Warranty {
  start?: string; // YYYY-MM-DD
  months?: number;
  end?: string; // worked out from start + months, or typed in
  provider?: string;
  notes?: string;
}

/** One change to an item's total amount. `null` means "TBD". */
export interface AmountChange {
  date: string; // YYYY-MM-DD
  from: number | null;
  to: number | null;
  status: AmountStatus;
  note?: string;
}

/**
 * Something being bought or built. The single source of truth for its money:
 * one total amount; "paid" is always added up from its payments.
 */
export interface PurchaseItem {
  id: string;
  name: string;
  vendorId?: string;
  roomId?: string; // blank = whole home
  categoryId?: string;
  description?: string;
  brand?: string;
  model?: string;
  sku?: string;
  quantity?: number;
  dimensions?: string;
  material?: string;
  colour?: string;
  finish?: string;
  url?: string;
  notes?: string;
  totalAmount: number | null; // null = TBD (unknown), never treated as 0
  amountStatus: AmountStatus;
  amountHistory?: AmountChange[];
  orderDate?: string;
  expectedDelivery?: string;
  actualDelivery?: string;
  expectedInstallation?: string;
  actualInstallation?: string;
  deliveryStatus: DeliveryStatus;
  installationStatus: InstallationStatus;
  photoIds: string[]; // product photos, stored like other pictures
  videoIds?: string[]; // short videos, stored as the original file
  coverId?: string; // which photo shows on cards
  paperworkNotNeeded?: boolean; // no invoice / receipt expected (e.g. paid in a shop), so don't flag it
  deliveryInspection?: Inspection;
  installationInspection?: Inspection;
  warranty?: Warranty;
  createdAt?: string;
}

export type PaymentType = 'Deposit' | 'Progress Payment' | 'Final Payment' | 'Refund' | 'Other';

/** Money paid (or due to be paid) for an item. Refunds are entered as positive amounts and subtracted. */
export interface Payment {
  id: string;
  itemId?: string; // blank = not linked to an item yet
  vendorId?: string;
  amount: number;
  date: string; // date paid, or due date when scheduled
  status: 'Paid' | 'Scheduled';
  type: PaymentType;
  method?: string;
  reference?: string;
  description?: string;
  notes?: string;
  categoryId?: string; // for payments not linked to an item
  roomId?: string; // for payments not linked to an item
  fromExpenseId?: string; // set when copied from an earlier payment record
}

export type DocumentType =
  | 'Quotation' | 'Contract' | 'Purchase Order' | 'Invoice' | 'Receipt' | 'Proof of Payment'
  | 'Warranty' | 'Product Specification' | 'Installation Guide' | 'Other';

/**
 * An uploaded document (PDF or picture). The original file is kept exactly as uploaded,
 * stored on the device and in the home's private online storage under this document's id.
 * A document never changes any amounts: an invoice is not an item and not a payment.
 */
export interface DocumentFile {
  id: string;
  type: DocumentType;
  title: string;
  date: string; // date on the document (YYYY-MM-DD)
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  hasThumb?: boolean; // pictures get a small preview
  vendorId?: string;
  itemIds: string[]; // one invoice can cover several items
  paymentIds: string[]; // e.g. the receipt or proof for a payment
  issueIds?: string[]; // e.g. photos or letters about a defect
  relatesTo?: 'Delivery' | 'Installation'; // e.g. a delivery order or installation report
  number?: string; // invoice / quotation number
  amount?: number; // the total printed on it, for reference only
  notes?: string;
  addedAt: string;
}

export type IssueStatus = 'Open' | 'Reported to Vendor' | 'Fix Scheduled' | 'Resolved';

/** A problem with an item: damaged on delivery, installed wrongly, a defect found later… */
export interface Issue {
  id: string;
  itemId: string;
  kind: 'Delivery' | 'Installation' | 'Other';
  title: string;
  description?: string;
  condition?: InspectionCondition;
  status: IssueStatus;
  reportedDate: string; // YYYY-MM-DD
  fixDate?: string; // when the vendor will fix it
  resolvedDate?: string;
  photoIds: string[];
  notes?: string;
}

export type MessageChannel = 'WhatsApp' | 'Email' | 'Phone Call' | 'Meeting' | 'SMS' | 'Other';

/** A record of talking to a vendor (text and/or screenshots). Not connected to WhatsApp or email. */
export interface VendorMessage {
  id: string;
  vendorId: string;
  itemIds: string[];
  date: string; // YYYY-MM-DD
  channel: MessageChannel;
  direction: 'From Vendor' | 'To Vendor' | 'Note';
  text: string;
  photoIds: string[]; // screenshots
}

/** A rough note: anything worth jotting down. */
export interface Note {
  id: string;
  text: string;
  roomId?: string; // optional: which room it's about
  pinned?: boolean; // kept at the top
  photoIds: string[];
  createdAt: string; // ISO date and time
  updatedAt: string;
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
  budgetVersion?: number; // 2 = budget upgrade done (suggested categories added)
}

/** A floor plan drawing stored on the device, with where the plan's origin is and its scale. */
export interface FloorPlanImage {
  imageId: string;
  width: number; // pixels
  height: number;
  originX: number; // pixel position of the layout's (0, 0) corner
  originY: number;
  pxPerMm: number;
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
  vendors: Vendor[];
  purchases: PurchaseItem[];
  payments: Payment[];
  documents: DocumentFile[];
  issues: Issue[];
  messages: VendorMessage[];
  notes: Note[];
  tasks: Task[];
  floorPlan?: FloorPlanImage;
}
