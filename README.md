# Grand Dunman Home

A mobile-friendly dashboard for managing the renovation of our Grand Dunman home.
It starts with sample (made-up) data that you can edit, delete or clear.

Sections: Home · Rooms · Measurements · Photos · Interior Designs · Budget · Settings & Backup

## What you can do

- **Add, edit and delete** rooms, measurements, payments, budget categories, designs and tasks.
  Look for the **+ Add** buttons; tap any item to edit or delete it.
- **Open any room** to see its own page with five tabs:
  - **Overview**: floor area, size, ceiling height, budget, notes, tasks and latest photos
  - **Photos**: that room's photos; add new ones straight into the room
  - **Measurements**: room width, room length and ceiling height, plus walls, doors,
    windows (with height from the floor) and anything else. Floor area is worked out
    from width × length. Switch between mm, cm and m.
  - **Designs**: design ideas for the room
  - **Budget**: a planned budget for the room, and the payments linked to it
- **Tick off tasks** on the Home page or on a room's page.
- **Add real photos**: on the Photos page (or a room's page) tap **Add photos**. On iPhone you can
  *Take Photo* or pick several from your *Photo Library*. Photos are shrunk automatically
  (to about 1920 pixels) so they take little space. Tap a photo to see it full-screen;
  swipe left/right to move between photos, and tap the pencil to edit or delete.
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
| Plain CSS (`src/styles.css`) | All colours/spacing; automatic dark mode |

Folder layout:

```
src/
  data/types.ts        ← what information is stored
  data/store.tsx       ← keeps the data and saves it on the device
  data/images.ts       ← stores photo files on the device (IndexedDB)
  data/measurementKinds.ts ← measurement types (wall, door, window…) and units
  data/sampleData.ts   ← example content
  pages/               ← one file per screen
  pages/room/          ← the room page and its five tabs
  editors/             ← the add/edit forms
  components/          ← shared pieces (navigation, cards, form fields)
  styles.css           ← the look and feel
```

No database and no cloud hosting yet. Data is kept in the browser's own storage (localStorage for details, IndexedDB for photos).
