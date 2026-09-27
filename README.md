# Grand Dunman Home

A mobile-friendly dashboard for managing the renovation of our Grand Dunman home.
It starts with sample (made-up) data that you can edit, delete or clear.

Sections: Home · Notes · Rooms · Floor Plan · Measurements · Photos · Interior Designs · Renovation Budget · Settings & Backup

## What you can do

- **Add, edit and delete** rooms, measurements, budget items, vendors, payments, categories, designs and tasks.
  Look for the **+ Add** buttons; tap any item to edit or delete it.
- **Open any room** to see its own page with five tabs:
  - **Overview**: floor area, size, ceiling height, budget, notes, tasks and latest photos
  - **Photos**: that room's photos; add new ones straight into the room
  - **Measurements**: room width, room length and ceiling height, plus walls, doors,
    windows (with height from the floor) and anything else. Floor area is worked out
    from width × length. Switch between mm, cm and m.
  - **Designs**: design ideas for the room
  - **Budget**: the room's items, with their total, paid and remaining amounts
- **Interior Designs**, organised by room. Each design has a render/image, room, design name,
  version, date, description, design prompt (with a Copy button), reference images and a status
  (Concept, Shortlisted, Selected, Rejected).
  - **New version** copies a design (name, prompt, references) as v2, v3… so you can iterate.
  - **Compare** shows a room's renders side by side, or two at a time with a slider to wipe
    between them. You can change each design's status right there.
  - **Import from PowerPoint**: download your renders deck as .pptx (Google Slides:
    File → Download → Microsoft PowerPoint) and choose it. Each slide with a picture becomes a
    design; the biggest picture is the render, others become reference images, the slide title
    becomes the name and the room is guessed from it. A "Prompt:" line on the slide, or the
    speaker notes, becomes the design prompt. Nothing is uploaded — it all happens on your device.
- **Floor Plan** (menu → Floor Plan): your Type 4BR G1 layout with every room's *measured*
  width × length drawn to scale on top. Outlines are green when they match the plan (within 5%)
  and amber when they differ; they update as soon as you change a measurement. Tap a room to
  update its width or length right there. Width = left ↔ right on the plan, length = top ↕ bottom.
  A table below lists plan vs measured for every room.
- **Design files** (Interior Designs → Import designs → a `.json` design file) add ready-made
  designs with their pictures, and optionally your floor plan drawing. They are *added* to what you
  have (nothing is replaced), and importing the same file again updates rather than duplicates.
- **Renovation Budget**: every item you're buying or building (sofa, carpentry, curtains…).
  - Each item has **one total amount**, marked *Estimated* or *Confirmed*, or **TBD** when it isn't
    known yet. TBD items are never counted as $0: totals leave them out and say how many are waiting.
  - **Paid** is always added up from the item's payments (deposits, progress and final payments;
    refunds are taken off; *scheduled* payments don't count until paid). **Remaining** = total − paid.
  - Changing a total keeps a short history of what it was and why it changed.
  - Items can have product photos and short videos (camera or photo library, up to 50 MB each), a
    vendor, room and category, product details and delivery / installation dates and statuses.
  - **Documents**: upload quotations, contracts, invoices, receipts, warranties and more, as PDFs or
    photos. The original file is kept exactly as uploaded (open it or download it any time). A document
    can be linked to a vendor, one or more items, and payments. Uploading an invoice never marks
    anything as paid; if its amount differs from the item's total you're *offered* an update (tick
    the box), nothing changes by itself.
  - **Receipts / proof of payment** can be attached straight from a payment (e.g. a screenshot of
    the bank transfer). Items with payments but no invoice, and paid payments with no receipt, show
    under "Needs attention" – switch this off per item when no paperwork is expected.
  - **Delivery & installation**: tap **Mark delivered** (or **Mark installed**), take photos, choose
    how it went (Good, Minor issue, Damaged, Wrong item, Incomplete…) and **Accept** – or **Report
    issue**. Set the expected date right on the item's Delivery / Installation tab.
  - **Issues**: every problem is tracked (Open → Reported to vendor → Fix scheduled → Resolved) with
    photos; resolving the last delivery or installation issue puts the item back on track.
  - **Messages**: keep a timeline of what each vendor said – type it in or add WhatsApp / email
    screenshots (the app isn't connected to WhatsApp or email).
  - **Warranty**: start date and length (the end date is worked out), provider, notes and warranty
    documents, with a countdown.
  - Each item shows its **journey**: payment, delivery and installation on separate lines.
  - **Needs attention** also covers: delivered but not inspected, installation not scheduled, open
    issues, and warranties ending within 30 days. Booked fixes appear under **Coming up**.
  - Documents and videos are stored on your device and, when syncing, in the same private online
    storage as your photos – only people in your home can open them.
  - **Vendors** have their own page with contact buttons (call, WhatsApp, email) and a money summary.
  - A table on large screens and cards on phones, with search, filters and sorting; totals by room,
    category and vendor; what's coming up; and what needs attention (e.g. overdue payments).
  - **Import items** loads a list of items from a `.json` file; items already in the app are skipped.
  - Payments recorded before this upgrade were kept and show under "Payments not linked to an item"
    until you link each one to its item.
- **Notes** (menu → Notes): rough notes – type anything, optionally add photos or tag a room, and pin
  important ones to the top. Search and filter by room. A room's page shows its notes and has its own
  quick-note box. Notes sync like everything else and are kept by "Start fresh".
- **Sample photos**: the grey example pictures can be removed in one tap ("Remove sample photos" on
  the Photos page or a room's Photos tab). Any photo can also be deleted with the bin button when
  viewing it full screen.
- **Tick off tasks** on the Home page or on a room's page.
- **Add real photos**: in a room's Photos tab (or the Photos page) tap **Add Photo**. On iPhone you can
  *Take Photo* or pick from your *Photo Library*. Each photo has a room, date, description and
  category (Existing Condition, Measurement, Design Reference, Renovation Progress).
  Photos are shrunk automatically (to about 1920 pixels) so they take little space.
  Tap a photo to see it full-screen; swipe left/right to move between photos.
- **Measure on photos**: while viewing a photo, tap **Add measurement**, tap the spot on the photo,
  then type a name (e.g. "Dining wall") and the width/height in mm. A label appears on the photo.
  Tap a label to edit, move or delete it; tap the eye button to hide labels. The photo itself is
  never changed — each label is saved as a normal measurement of that room (so it also appears in
  the room's Measurements tab), together with its position on the photo.
- Everything is **saved automatically** on the device you are using.

## Where your data is saved (important)

Your data is saved **inside the browser on each device**. That means:

- Your phone and your computer each keep **their own separate copy**.
- Clearing your browser's history/website data, or using private browsing, can erase it.
- **Export a backup regularly**: Settings & Backup → *Export backup*. The backup includes your photos. Keep the file somewhere safe
  (email it to yourself, or save it to iCloud/Google Drive).
- To copy your data to another device: export on one, then *Import backup* on the other.

On iPhone, adding the app to your Home Screen (Safari → Share → *Add to Home Screen*) and opening it
from there helps stop Safari from clearing its storage if you haven't used it for a while.

When you're ready to enter your real details, go to Settings & Backup → **Start fresh**.
It keeps your list of rooms and budget categories but clears the example content.

---

## Using it online

The app is published at **https://0kennytay92.github.io/grand-dunman-home-dashboard/**
and updates automatically a minute or two after each change is pushed to GitHub
(see the *Actions* tab on GitHub for progress).

- Your data is still stored **only on each device** (in that browser). Visitors to the link
  see an empty copy with sample data — never your own information.
- On iPhone: open the link in Safari → Share → **Add to Home Screen** for an app icon.
- To move data from your computer's local copy (http://localhost:5173) to the online copy:
  Settings & Backup → **Export backup** locally, then **Import backup** online.

## Online sync & sharing (optional)

With online sync switched on (see `supabase/setup.sql` and *Setting up online sync* below),
**Sync & Sharing** in the menu lets you:

- sign in with email and password, on any number of devices;
- put your home online once, then **Use the online copy** on your other devices;
- see changes from other devices within seconds (and keep working offline – changes upload later);
- invite family or your designer by email (they create an account with that email and your home appears).

Photos and renders are kept in private online storage and download to a device the first time
they're viewed. Only members of your home can read or change its data – this is enforced by the
database, not just the app.

### Setting up online sync (one time)

1. Create a free project at supabase.com.
2. In the project: **SQL Editor** → paste all of `supabase/setup.sql` → **Run**.
3. **Authentication → URL Configuration**: Site URL = the app's web address; add the same address
   (and `http://localhost:5173/**` for local use) to Redirect URLs.
4. Put the project's URL and *publishable* key in `src/config.ts` (never the secret key).

## How to run it on your computer (one-time setup)

1. **Install Node.js** (the engine that runs the app).
   Download the "LTS" version from <https://nodejs.org> and install it like any other program.
2. **Download this project** from GitHub (green **Code** button → **Download ZIP**), then unzip it.
3. **Open a terminal in the project folder.**
   - Mac: open the *Terminal* app, type `cd ` (with a space), drag the unzipped folder into the window, press Enter.
   - Windows: open the folder, click the address bar, type `cmd`, press Enter.
4. Type this and press Enter (only needed the first time; it downloads the building blocks):
   ```
   npm install
   ```

## Starting the app (every time)

In the terminal, inside the project folder:

```
npm run dev
```

Then open **http://localhost:5173** in your browser.
To stop the app, click in the terminal and press **Ctrl + C**.

### Viewing it on your iPhone

Your iPhone must be on the **same Wi-Fi** as your computer.
When you run `npm run dev`, the terminal shows a line like `Network: http://192.168.1.23:5173/`.
Type that address into Safari on your iPhone.
Tip: in Safari tap **Share → Add to Home Screen** to get an app-like icon.

## The sample data

The example content lives in `src/data/sampleData.ts`. It is only used the first
time the app opens, and when you press *Reset to sample data*.

## Checking for errors

```
npm run build
```

If it finishes with `✓ built`, there are no errors.

---

## For the technically curious

| Piece | What it is |
|---|---|
| React + TypeScript | Builds the screens; TypeScript catches mistakes early |
| Vite | Runs the app locally and reloads it when files change |
| lucide-react | The icon set |
| fflate | Opens PowerPoint files (they are zip files) to import renders |
| Plain CSS (`src/styles.css`) | All colours/spacing; automatic dark mode |

Folder layout:

```
src/
  data/types.ts        ← what information is stored
  data/store.tsx       ← keeps the data and saves it on the device
  data/images.ts       ← stores photo files on the device (IndexedDB)
  data/measurementKinds.ts ← measurement types (wall, door, window…) and units
  data/labelLayout.ts  ← places measurement labels on photos so they don't overlap
  data/photoTags.ts    ← photo categories
  data/designs.ts      ← design statuses and versions
  data/pptx.ts         ← reads renders out of PowerPoint files
  data/designPack.ts   ← imports ready-made design files
  data/floorPlanLayout.ts ← where each room sits on the Type 4BR G1 plan
  cloud/               ← online sync: sign-in, sharing, the sync engine
  config.ts            ← online sync settings (Supabase address and public key)
supabase/setup.sql     ← database setup to paste into Supabase
  data/sampleData.ts   ← example content
  pages/               ← one file per screen
  pages/room/          ← the room page and its five tabs
  pages/designs/       ← designs list, design page and compare
  editors/             ← the add/edit forms
  components/          ← shared pieces (navigation, cards, form fields)
  styles.css           ← the look and feel
```

No database and no cloud hosting yet. Data is kept in the browser's own storage (localStorage for details, IndexedDB for photos).
