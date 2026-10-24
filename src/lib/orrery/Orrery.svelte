<script lang="ts">
	import { helioLongitude, PLANETS, type Planet, type SkyBody, type SkyPosition } from '#lib/astro/positions.ts';
	import { solveTimeForAngle } from '#lib/astro/scrub.ts';
	import { norm360 } from '#lib/astro/time.ts';
	import { GLYPHS, SIGNS } from '#lib/astro/zodiac.ts';
	import {
		CENTER,
		MARKER_R,
		ORBIT_R,
		PLANET_SIZE,
		RING_INNER,
		RING_OUTER,
		SIZE,
		angleOf,
		polar,
		rayToCircle
	} from './geometry';

	interface Props {
		time: number;
		ayanamsa: number;
		sky: SkyPosition[];
		active?: SkyBody | null;
		onscrub: (time: number) => void;
		onscrubstart?: () => void;
		onscrubend?: () => void;
	}

	let {
		time,
		ayanamsa,
		sky,
		active = $bindable(null),
		onscrub,
		onscrubstart,
		onscrubend
	}: Props = $props();

	let svg: SVGSVGElement;
	let dragging = $state<Planet | null>(null);

	// $derived values recompute whenever `time`, `sky` or `ayanamsa` change, so the drawing
	// follows the clock and drags without any manual update code.
	const planets = $derived(
		PLANETS.map((name) => {
			const angle = helioLongitude(name, time);
			return { name, angle, ...polar(ORBIT_R[name], angle), size: PLANET_SIZE[name] };
		})
	);
	const earth = $derived(planets.find((planet) => planet.name === 'Earth')!);
	const skyByBody = $derived(
		Object.fromEntries(sky.map((position) => [position.body, position])) as Record<SkyBody, SkyPosition>
	);
	// The red thread: from Earth, in the Sun's true geocentric direction, out to the zodiac ring.
	const sunThreadEnd = $derived(rayToCircle(earth.x, earth.y, skyByBody.Sun.tropical, RING_INNER));
	// The Moon is drawn on a small circle around Earth, in its true geocentric direction.
	const moon = $derived.by(() => {
		const moonRadians = (skyByBody.Moon.tropical * Math.PI) / 180;
		return { x: earth.x + 16 * Math.cos(moonRadians), y: earth.y - 16 * Math.sin(moonRadians) };
	});

	// Sign boundaries sit at tropical longitude ayanamsa + 30k, so the ring rotates slowly
	// (about 1° every 72 years) as the equinox precesses.
	const ticks = $derived(
		SIGNS.map((_, index) => {
			const boundary = ayanamsa + 30 * index;
			return { inner: polar(RING_INNER, boundary), outer: polar(RING_OUTER, boundary) };
		})
	);
	const signLabels = $derived(
		SIGNS.map((name, index) => {
			const middle = ayanamsa + 30 * index + 15;
			const { x, y } = polar((RING_INNER + RING_OUTER) / 2, middle);
			// Turn each label to follow the ring, then flip the bottom half so no label reads upside down.
			let rotation = norm360(90 - middle);
			if (rotation > 90 && rotation < 270) rotation = (rotation + 180) % 360;
			return { name, x, y, rotation };
		})
	);
	const markers = $derived(sky.map((position) => ({ body: position.body, ...polar(MARKER_R, position.tropical) })));

	const orbits = PLANETS.map((name) => ({ name, radius: ORBIT_R[name] }));

	/** Convert a pointer position on screen into the SVG's own 900 × 900 coordinates. */
	function toSvgPoint(event: PointerEvent) {
		const screenMatrix = svg.getScreenCTM();
		if (!screenMatrix) return null;
		return new DOMPoint(event.clientX, event.clientY).matrixTransform(screenMatrix.inverse());
	}

	/** Which readout row to highlight for a planet. Earth has no row; from Earth we see the Sun. */
	function readoutBodyFor(planet: Planet): SkyBody {
		return planet === 'Earth' ? 'Sun' : planet;
	}

	function onPointerDown(planet: Planet, event: PointerEvent) {
		event.preventDefault();
		// Capture keeps the move events coming to this planet even when the pointer leaves it.
		(event.currentTarget as Element).setPointerCapture(event.pointerId);
		dragging = planet;
		active = readoutBodyFor(planet);
		onscrubstart?.();
	}

	function onPointerMove(planet: Planet, event: PointerEvent) {
		if (dragging !== planet) return;
		const point = toSvgPoint(event);
		if (point) onscrub(solveTimeForAngle(planet, time, angleOf(point.x, point.y)));
	}

	function onPointerUp(planet: Planet) {
		if (dragging !== planet) return;
		dragging = null;
		onscrubend?.();
	}

	/** Degrees a key turns a planet: arrows 1° (Shift 10°), Page Up/Down 30°. Zero for other keys. */
	function keyStep(event: KeyboardEvent): number {
		const arrowStep = event.shiftKey ? 10 : 1;
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				return arrowStep;
			case 'ArrowLeft':
			case 'ArrowDown':
				return -arrowStep;
			case 'PageUp':
				return 30;
			case 'PageDown':
				return -30;
			default:
				return 0;
		}
	}

	// Each planet is a real slider for keyboard users.
	function onKeyDown(planet: Planet, angle: number, event: KeyboardEvent) {
		const step = keyStep(event);
		if (step === 0) return;
		event.preventDefault();
		// A key press is a whole drag in one step, so it must end the scrub too.
		// Without onscrubend the page would think a drag is still running and never resume.
		onscrubstart?.();
		onscrub(solveTimeForAngle(planet, time, angle + step));
		onscrubend?.();
	}

	const dateText = $derived(
		new Date(time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
	);

	/** Two decimals is plenty on a 900-unit drawing and keeps the SVG markup short. */
	const twoDecimals = (value: number) => value.toFixed(2);
</script>

<svg
	bind:this={svg}
	viewBox="0 0 {SIZE} {SIZE}"
	class="orrery"
	class:is-dragging={dragging}
	role="group"
	aria-label="The solar system right now. Drag any planet to move through time."
>
	<defs>
		<filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
			<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
		</filter>
	</defs>

	<g aria-hidden="true">
		<g filter="url(#ink)">
			<circle class="ring" cx={CENTER} cy={CENTER} r={RING_OUTER + 4} />
			<circle class="ring-thin" cx={CENTER} cy={CENTER} r={RING_OUTER} />
			<circle class="ring" cx={CENTER} cy={CENTER} r={RING_INNER} />
			{#each orbits as orbit (orbit.name)}
				<circle class="orbit" cx={CENTER} cy={CENTER} r={orbit.radius} />
			{/each}
		</g>
		{#each ticks as tick, index (index)}
			<line
				class="tick"
				x1={twoDecimals(tick.inner.x)}
				y1={twoDecimals(tick.inner.y)}
				x2={twoDecimals(tick.outer.x)}
				y2={twoDecimals(tick.outer.y)}
			/>
		{/each}
		{#each signLabels as label (label.name)}
			<text
				class="sign"
				x={twoDecimals(label.x)}
				y={twoDecimals(label.y)}
				transform="rotate({twoDecimals(label.rotation)} {twoDecimals(label.x)} {twoDecimals(label.y)})"
				>{label.name}</text
			>
		{/each}

		<line
			class="sight"
			x1={twoDecimals(earth.x)}
			y1={twoDecimals(earth.y)}
			x2={twoDecimals(sunThreadEnd.x)}
			y2={twoDecimals(sunThreadEnd.y)}
		/>

		{#each markers as marker (marker.body)}
			<text class="marker" class:on={active === marker.body} x={twoDecimals(marker.x)} y={twoDecimals(marker.y)}
				>{GLYPHS[marker.body]}</text
			>
		{/each}

		<circle class="halo" cx={CENTER} cy={CENTER} r="30" />
		<circle class="sun" cx={CENTER} cy={CENTER} r="17" />

		<circle class="moon-orbit" cx={twoDecimals(earth.x)} cy={twoDecimals(earth.y)} r="16" />
		<circle class="moon" cx={twoDecimals(moon.x)} cy={twoDecimals(moon.y)} r="2.6" />

		{#each planets as planet (planet.name)}
			<circle
				class={planet.name === 'Earth' ? 'earth' : 'planet'}
				class:on={dragging === planet.name}
				cx={twoDecimals(planet.x)}
				cy={twoDecimals(planet.y)}
				r={planet.size}
			/>
			<text
				class="label"
				x={twoDecimals(planet.x + planet.size + 5)}
				y={twoDecimals(planet.y - planet.size - 3)}>{planet.name}</text
			>
		{/each}
	</g>

	<!-- Invisible, generous hit areas: these are the sliders. -->
	{#each planets as planet (planet.name)}
		{@const degrees = Math.round(norm360(planet.angle))}
		<circle
			class="hit"
			cx={twoDecimals(planet.x)}
			cy={twoDecimals(planet.y)}
			r="24"
			tabindex="0"
			role="slider"
			aria-label="{planet.name}, drag to move through time"
			aria-valuemin={0}
			aria-valuemax={360}
			aria-valuenow={degrees}
			aria-valuetext="{planet.name} at {degrees}°, {dateText}"
			onpointerdown={(event) => onPointerDown(planet.name, event)}
			onpointermove={(event) => onPointerMove(planet.name, event)}
			onpointerup={() => onPointerUp(planet.name)}
			onpointercancel={() => onPointerUp(planet.name)}
			onpointerenter={() => (active = readoutBodyFor(planet.name))}
			onfocus={() => (active = readoutBodyFor(planet.name))}
			onkeydown={(event) => onKeyDown(planet.name, planet.angle, event)}
		/>
	{/each}
</svg>

<style>
	.orrery {
		width: 100%;
		max-width: 780px;
		height: auto;
		display: block;
		user-select: none;
		-webkit-user-select: none;
	}
	.ring {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.2;
	}
	.ring-thin {
		fill: none;
		stroke: var(--ink);
		stroke-width: 0.6;
	}
	.orbit {
		fill: none;
		stroke: var(--ink);
		stroke-width: 0.9;
		opacity: 0.5;
	}
	.tick {
		stroke: var(--sepia);
		stroke-width: 1.1;
	}
	.sign {
		font-family: var(--font-caps);
		font-size: 15px;
		letter-spacing: 1.5px;
		fill: var(--ink);
		text-anchor: middle;
		dominant-baseline: middle;
	}
	.sight {
		stroke: var(--vermilion);
		stroke-width: 0.8;
		stroke-dasharray: 3 4;
		opacity: 0.7;
	}
	.marker {
		font-family: var(--font-glyph);
		font-size: 14px;
		fill: var(--muted);
		text-anchor: middle;
		dominant-baseline: central;
		transition: fill 0.15s;
	}
	.marker.on {
		fill: var(--vermilion);
		font-size: 19px;
	}
	.halo {
		fill: none;
		stroke: var(--sepia);
		stroke-width: 0.8;
		stroke-dasharray: 1 5;
	}
	.sun {
		fill: var(--gold);
		stroke: var(--ink);
		stroke-width: 1.2;
	}
	.planet {
		fill: var(--ink);
	}
	.earth {
		fill: var(--sepia);
		stroke: var(--ink);
		stroke-width: 1;
	}
	.planet.on,
	.earth.on {
		fill: var(--vermilion);
	}
	.moon-orbit {
		fill: none;
		stroke: var(--ink);
		stroke-width: 0.4;
		opacity: 0.35;
	}
	.moon {
		fill: var(--paper);
		stroke: var(--ink);
		stroke-width: 0.9;
	}
	.label {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 15px;
		fill: var(--ink-soft);
		pointer-events: none;
	}
	.hit {
		fill: transparent;
		cursor: grab;
		touch-action: none;
		outline: none;
	}
	.is-dragging .hit {
		cursor: grabbing;
	}
	.hit:focus-visible {
		stroke: var(--vermilion);
		stroke-width: 1.5;
		stroke-dasharray: 2 3;
	}
</style>
