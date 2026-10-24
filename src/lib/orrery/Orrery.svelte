<script lang="ts">
	import { helioLongitude, PLANETS, type Planet, type SkyBody, type SkyPosition } from '#lib/astro/positions.ts';
	import { solveTimeForAngle } from '#lib/astro/scrub.ts';
	import { SIGNS } from '#lib/astro/zodiac.ts';
	import {
		C,
		GLYPH,
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

	const planets = $derived(
		PLANETS.map((name) => {
			const angle = helioLongitude(name, time);
			return { name, angle, ...polar(ORBIT_R[name], angle), size: PLANET_SIZE[name] };
		})
	);
	const earth = $derived(planets.find((p) => p.name === 'Earth')!);
	const byBody = $derived(Object.fromEntries(sky.map((b) => [b.body, b])) as Record<SkyBody, SkyPosition>);
	const sightEnd = $derived(rayToCircle(earth.x, earth.y, byBody.Sun.tropical, RING_INNER));
	const moon = $derived.by(() => {
		const a = (byBody.Moon.tropical * Math.PI) / 180;
		return { x: earth.x + 16 * Math.cos(a), y: earth.y - 16 * Math.sin(a) };
	});

	// Sign boundaries sit at tropical longitude ayanamsa + 30k, so the ring rotates slowly
	// (about 1° every 72 years) as the equinox precesses.
	const ticks = $derived(
		SIGNS.map((_, k) => ({ a: polar(RING_INNER, ayanamsa + 30 * k), b: polar(RING_OUTER, ayanamsa + 30 * k) }))
	);
	const signLabels = $derived(
		SIGNS.map((name, k) => {
			const mid = ayanamsa + 30 * k + 15;
			const { x, y } = polar((RING_INNER + RING_OUTER) / 2, mid);
			let rot = (((90 - mid) % 360) + 360) % 360;
			if (rot > 90 && rot < 270) rot = (rot + 180) % 360;
			return { name, x, y, rot };
		})
	);
	const markers = $derived(sky.map((b) => ({ body: b.body, ...polar(MARKER_R, b.tropical) })));

	const orbitBodies = PLANETS.map((name) => ({ name, r: ORBIT_R[name] }));

	function toSvg(e: PointerEvent) {
		const m = svg.getScreenCTM();
		if (!m) return null;
		return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
	}

	function focusBody(p: Planet): SkyBody {
		return p === 'Earth' ? 'Sun' : p;
	}

	function onDown(p: Planet, e: PointerEvent) {
		e.preventDefault();
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		dragging = p;
		active = focusBody(p);
		onscrubstart?.();
	}

	function onMove(p: Planet, e: PointerEvent) {
		if (dragging !== p) return;
		const pt = toSvg(e);
		if (pt) onscrub(solveTimeForAngle(p, time, angleOf(pt.x, pt.y)));
	}

	function onUp(p: Planet) {
		if (dragging !== p) return;
		dragging = null;
		onscrubend?.();
	}

	// Each planet is a real slider for keyboard users: arrows turn it 1°, Shift 10°.
	function onKey(p: Planet, angle: number, e: KeyboardEvent) {
		const step = e.shiftKey ? 10 : 1;
		const delta =
			e.key === 'ArrowRight' || e.key === 'ArrowUp'
				? step
				: e.key === 'ArrowLeft' || e.key === 'ArrowDown'
					? -step
					: e.key === 'PageUp'
						? 30
						: e.key === 'PageDown'
							? -30
							: 0;
		if (!delta) return;
		e.preventDefault();
		// A key press is a whole drag in one step, so it must end the scrub too.
		// Without onscrubend the page would think a drag is still running and never resume.
		onscrubstart?.();
		onscrub(solveTimeForAngle(p, time, angle + delta));
		onscrubend?.();
	}

	const dateText = $derived(
		new Date(time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
	);
	const fx = (n: number) => n.toFixed(2);
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
			<circle class="ring" cx={C} cy={C} r={RING_OUTER + 4} />
			<circle class="ring-thin" cx={C} cy={C} r={RING_OUTER} />
			<circle class="ring" cx={C} cy={C} r={RING_INNER} />
			{#each orbitBodies as o (o.name)}
				<circle class="orbit" cx={C} cy={C} r={o.r} />
			{/each}
		</g>
		{#each ticks as t, i (i)}
			<line class="tick" x1={fx(t.a.x)} y1={fx(t.a.y)} x2={fx(t.b.x)} y2={fx(t.b.y)} />
		{/each}
		{#each signLabels as s (s.name)}
			<text class="sign" x={fx(s.x)} y={fx(s.y)} transform="rotate({fx(s.rot)} {fx(s.x)} {fx(s.y)})">{s.name}</text>
		{/each}

		<line class="sight" x1={fx(earth.x)} y1={fx(earth.y)} x2={fx(sightEnd.x)} y2={fx(sightEnd.y)} />

		{#each markers as m (m.body)}
			<text class="marker" class:on={active === m.body} x={fx(m.x)} y={fx(m.y)}>{GLYPH[m.body]}</text>
		{/each}

		<circle class="halo" cx={C} cy={C} r="30" />
		<circle class="sun" cx={C} cy={C} r="17" />

		<circle class="moon-orbit" cx={fx(earth.x)} cy={fx(earth.y)} r="16" />
		<circle class="moon" cx={fx(moon.x)} cy={fx(moon.y)} r="2.6" />

		{#each planets as p (p.name)}
			<circle class={p.name === 'Earth' ? 'earth' : 'planet'} class:on={dragging === p.name} cx={fx(p.x)} cy={fx(p.y)} r={p.size} />
			<text class="label" x={fx(p.x + p.size + 5)} y={fx(p.y - p.size - 3)}>{p.name}</text>
		{/each}
	</g>

	<!-- Invisible, generous hit areas: these are the sliders. -->
	{#each planets as p (p.name)}
		<circle
			class="hit"
			cx={fx(p.x)}
			cy={fx(p.y)}
			r="24"
			tabindex="0"
			role="slider"
			aria-label="{p.name}, drag to move through time"
			aria-valuemin={0}
			aria-valuemax={360}
			aria-valuenow={Math.round(((p.angle % 360) + 360) % 360)}
			aria-valuetext="{p.name} at {Math.round(((p.angle % 360) + 360) % 360)}°, {dateText}"
			onpointerdown={(e) => onDown(p.name, e)}
			onpointermove={(e) => onMove(p.name, e)}
			onpointerup={() => onUp(p.name)}
			onpointercancel={() => onUp(p.name)}
			onpointerenter={() => (active = focusBody(p.name))}
			onfocus={() => (active = focusBody(p.name))}
			onkeydown={(e) => onKey(p.name, p.angle, e)}
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
