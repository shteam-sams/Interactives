# Peppered Moth Hunt

A live classroom simulation of natural selection. Students hide and camouflage a moth in a forest scene, then become birds and hunt everyone else's moths. The best-hidden moths win.

Built like Boss Squad: static pages on GitHub Pages, linked live with PeerJS. Students need no accounts or sign-in.

## Files (upload all five to the repo root)

| File | Who opens it |
|---|---|
| `display.html` | Teacher, on the projector. It *is* the game: it hosts the room and holds all the data. |
| `control.html` | Teacher, in another tab/window of the **same browser** (or an OBS dock). |
| `join.html` | Students, on their own devices. |
| `moth-common.js`, `moth.css` | Shared code and styles used by all three pages. |

## Put it on GitHub Pages

1. On GitHub, create a new public repository, e.g. `Peppered-Moth-Hunt`.
2. **Add file → Upload files**, drag in the five files, and commit.
3. **Settings → Pages →** Source: *Deploy from a branch*, Branch: `main` / `(root)`, **Save**.
4. After a minute your game is at `https://<your-username>.github.io/Peppered-Moth-Hunt/display.html`.

## Running a class

1. Open `display.html` on the projector computer. A 5-letter room code and QR code appear.
2. Click **Teacher controls ↗** (opens `control.html`). Keep both open for the whole game.
3. Students scan the QR code or go to `.../join.html`, type their first name and the code.
4. In Teacher controls: **Open hiding** → students pick a spot, confirm, zoom in and color their moth (palette from their spot + a color dropper), then **Release** it.
5. **Start the hunt.** Every student searches the whole forest on their own screen (their own moth doesn't count). The hunt ends automatically when the birds have found the chosen share of all possible finds (default 50%; with 12 students and 12 moths that is 66 of 132).
6. The display plays the ceremony: leaderboard → 3rd, 2nd, 1st survivor (zoomed in, with a "can you spot it?" pause) → podium → showcase of every other moth with the % of birds that found it, plus a "Did camouflage matter?" chart. Use **Next / Skip to showcase** in Teacher controls, or let it run.
7. **New round (same code)** keeps students connected; **New game (new code)** starts fresh.

Tip: **Add 5 practice moths** lets you try a full round alone (open `join.html` in a private window to be a student).

## Playing controls (students)

- **Full screen** button on the hunt, the spot picker and the coloring studio (Esc or "Exit full screen" to leave). On phones that block real full screen, the game still fills the whole page.
- **Zoom:** scroll wheel, pinch, the + / − buttons, or the + / − keys. **Fit** shows the whole forest again.
- **Look around:** drag when zoomed in, or use the arrow keys. A small map in the corner shows where you are; tap it to jump.
- **Coloring:** zoom the moth up to 2.3×; hover shows which square you'll paint. Wings are painted freely (turn on "Mirror both wings" to paint both sides at once). Shortcuts: B brush, F fill, I dropper, M mirror, G squares, Ctrl+Z undo.
- **Hunting:** taps just beside a moth still count, so small screens are fair.

## If the student link is wrong

The display works out the student link from where `display.html` lives and checks that `join.html` is really there. To set it yourself, open `moth-common.js` and paste your exact link into `joinUrl` near the top, e.g.
`joinUrl: "https://<your-username>.github.io/<repo>/Peppered-Moth-Hunt/join.html",`

## Good to know

- The display tab is the server. If it closes, the game pauses; reopen it in the same browser and the game (and code) comes back, and students reconnect automatically.
- Students who refresh rejoin automatically on the same device.
- The forest is generated from a seed, so every device sees the identical picture. You can also upload your own photo (before moths are hidden); it is sent to every student.
- Uses the free PeerJS cloud server, like Boss Squad. If a school network ever blocks it, set `peerServer` at the top of `moth-common.js` to your own PeerJS server.
