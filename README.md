# Grand Dunman Home

A mobile-friendly dashboard for managing the renovation of our Grand Dunman home.
This is **version 1: a working prototype using sample (made-up) data**.

Sections: Home · Rooms · Measurements · Photos · Interior Designs · Budget · Defects

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

## Changing the sample data

All the example content (rooms, measurements, budget, defects, etc.) lives in one file:

```
src/data/sampleData.ts
```

Open it in any text editor, change a value (e.g. a budget amount), save, and the
browser updates automatically.

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
  data/sampleData.ts   ← all sample content
  pages/               ← one file per screen
  components/          ← shared pieces (navigation, cards, badges)
  styles.css           ← the look and feel
```

No database and no cloud hosting yet — everything runs on your own computer.
