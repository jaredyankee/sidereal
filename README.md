# Trips Around the Sun

A live, draggable orrery with a sidereal reading of the sky, drawn in an ink-and-vellum calligraphic style.

- **Every planet is a slider.** Drag any planet around its orbit and time moves with it; every other planet, the date and the placements follow. Each planet is a different gear: one degree of Mercury is about six hours, one degree of Neptune about half a year. Keyboard: focus a planet, then arrows (1°), Shift+arrows (10°), Page Up/Down (30°).
- **Speed controls** run time from real time up to ×10⁷.
- **Sidereal placements as seen from Earth**: Sun, Moon, planets, and the mean lunar nodes (Rahu/Ketu), with retrograde detection and a Lahiri / Fagan-Bradley ayanamsa toggle.

## How the model works

Two layers, on purpose:

| Layer | What it is for | Source |
| --- | --- | --- |
| Drawing | Real heliocentric direction of each planet, placed on circles with relational (not to-scale) radii | `astronomy-engine` heliocentric vectors |
| Readouts | Geocentric tropical longitude of date, minus the ayanamsa | `astronomy-engine` geocentric vectors |

Because the orbit radii are not to scale, a line from the drawn Earth to a drawn planet does not point at that planet's sign. The outer ring of glyphs shows the true geocentric positions instead. The Sun is the exception: Earth → Sun → ring is exact, and is drawn as the red thread.

**Drag to scrub** (`src/lib/astro/scrub.ts`): the pointer angle becomes a target heliocentric longitude for the dragged planet, and Newton's method on that planet's local angular speed solves for the instant it gets there. Steps always take the shortest way round, so continuous drags accumulate whole orbits instead of snapping back.

**Ayanamsa** (`src/lib/astro/zodiac.ts`): value at J2000 plus IAU 2006 general precession. Accurate to a few arcseconds of Swiss Ephemeris over the supported window (years 1000–3000).

## Layout

```
src/lib/astro/    pure TypeScript: positions, ayanamsa, scrub solver, tests
src/lib/orrery/   the SVG orrery component and its geometry
src/lib/sky/      readout table
src/routes/       the homepage
```

## Develop

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests for the astronomy layer
npm run check    # svelte-check / TypeScript
npm run build    # static site in build/
```

Deploys to Netlify as a static site (`netlify.toml`). Built with SvelteKit (Svelte 5) and TypeScript.

Built with Claude; architecture and astronomy model by Jared Yankee.
