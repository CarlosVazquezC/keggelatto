//#region \0vite/modulepreload-polyfill.js
(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
})();
//#endregion
//#region src/session.js
function timeline(steps) {
	let start = 0;
	return steps.map((step) => {
		const withStart = {
			...step,
			start
		};
		start += step.dur;
		return withStart;
	});
}
var duration = (steps) => steps.length ? steps.at(-1).start + steps.at(-1).dur : 0;
function stepAt(steps, elapsed) {
	if (elapsed >= duration(steps)) return {
		index: steps.length,
		step: void 0,
		left: 0,
		done: true
	};
	const t = Math.max(0, elapsed);
	const index = steps.findLastIndex((s) => s.start <= t);
	const step = steps[index];
	return {
		index,
		step,
		left: step.start + step.dur - t,
		done: false
	};
}
var CONTRACTION_BLOCKS = ["hold", "quick"];
function run(steps, { audio, discreet = false, onStep, onTick = () => {}, onEnd, vibrate = () => {} }) {
	let base = Date.now();
	let offset = 0;
	let pausedAt = null;
	let last = -1;
	let timer = null;
	let stopped = false;
	const elapsed = () => pausedAt ?? offset + (Date.now() - base) / 1e3;
	function tick() {
		clearTimeout(timer);
		if (stopped) return;
		const now = stepAt(steps, elapsed());
		if (now.index !== last) {
			last = now.index;
			if (now.done) {
				stopped = true;
				vibrate("end");
				onEnd();
				return;
			}
			vibrate(now.step.sound);
			onStep(now);
		}
		onTick(now);
		if (pausedAt === null) timer = setTimeout(tick, (now.left % 1 || 1) * 1e3);
	}
	function seek(t) {
		offset = t;
		base = Date.now();
		audio?.cancel();
		audio?.play(steps, stepAt(steps, t).index);
		tick();
	}
	audio?.play(steps, 0);
	tick();
	return {
		elapsed,
		cut() {
			const { index, step } = stepAt(steps, elapsed());
			if (!step) return;
			const skip = CONTRACTION_BLOCKS.includes(step.block) ? CONTRACTION_BLOCKS : [step.block];
			const next = steps.findIndex((s, i) => i > index && !skip.includes(s.block));
			seek(next === -1 ? duration(steps) : steps[next].start);
		},
		next() {
			if (stopped) return;
			const { index } = stepAt(steps, elapsed());
			seek(steps[index + 1]?.start ?? duration(steps));
		},
		visibility(hidden) {
			if (stopped) return;
			if (hidden && discreet) {
				pausedAt = elapsed();
				clearTimeout(timer);
				return;
			}
			if (hidden) return;
			if (pausedAt === null) return tick();
			offset = pausedAt;
			base = Date.now();
			pausedAt = null;
			tick();
		},
		stop() {
			stopped = true;
			clearTimeout(timer);
			audio?.cancel();
		}
	};
}
//#endregion
//#region src/kettlebell.js
var ARMS = [
	10,
	12,
	15
];
var LEGS = [
	10,
	12,
	15,
	18,
	20
];
var WARM = 300;
var CAP = 3600;
var PER_REP = 4;
var READY = 3;
var ROUND_REST = 90;
var SIDE = 10;
var CHANGES = [
	3,
	5,
	7,
	9,
	11,
	15
];
var RATINGS$1 = [
	["easy", "Fácil"],
	["good", "Bien"],
	["hard", "Difícil"],
	["fail", "No pude terminar"]
];
var EXERCISES = {
	deadlift: {
		name: "Peso muerto",
		art: "el",
		reps: LEGS,
		variant: "baja en 3 segundos",
		cue: "Cadera hacia atrás, espalda neutra, la pesa entre los pies.",
		avoid: "Evita redondear la espalda o hacer sentadilla en vez de bisagra."
	},
	goblet: {
		name: "Sentadilla goblet",
		art: "la",
		reps: LEGS,
		variant: "pausa de 2 segundos abajo",
		cue: "Pesa vertical al pecho, codos pegados, espalda recta; empuja con los pies y baja hasta donde sea cómodo.",
		avoid: "Evita que las rodillas se vayan hacia adentro o que se levanten los talones."
	},
	row: {
		name: "Remo con un brazo",
		art: "el",
		reps: ARMS,
		sides: true,
		variant: "pausa de 2 segundos arriba",
		cue: "La otra mano apoyada, espalda plana, abdomen firme, hombros abajo y atrás; exhala al jalar, sin girar el tronco.",
		avoid: "Evita girar o subir los hombros."
	},
	floorPress: {
		name: "Press en el piso",
		art: "el",
		reps: ARMS,
		sides: true,
		variant: "baja en 3 segundos",
		cue: "Acostado: el piso limita cuánto baja el codo. Para subir y bajar la pesa, rueda de lado con las dos manos en el asa.",
		avoid: "Evita abrir mucho los codos."
	},
	carry: {
		name: "Carga de maleta",
		art: "la",
		secs: [
			30,
			40,
			50,
			60
		],
		sides: true,
		cue: "La pesa en una mano, agarre firme, espalda recta, y camina.",
		avoid: "Evita inclinarte hacia la pesa o hacia el otro lado."
	},
	swing: {
		name: "Swing con dos manos",
		art: "el",
		reps: LEGS,
		talk: true,
		alt: "deadlift",
		cue: "La fuerza sale de la cadera, no de los hombros; la pesa sube a la altura del pecho. Arriba, de pie y derecho, sin echar la espalda hacia atrás.",
		avoid: "Si irrita la espalda baja, vuelve al peso muerto."
	},
	split: {
		name: "Sentadilla dividida",
		art: "la",
		reps: LEGS,
		sides: true,
		variant: "con la pesa al pecho",
		alt: "goblet",
		cue: "Zancada hacia atrás, espalda recta, rango cómodo. Primero sin peso.",
		avoid: "Cuida las rodillas."
	},
	lunge: {
		name: "Zancada al frente",
		art: "la",
		reps: LEGS,
		sides: true,
		variant: "baja en 3 segundos",
		alt: "goblet",
		cue: "La pesa en una mano. Paso al frente con el pecho arriba y los hombros atrás; empuja con la pierna de adelante para volver. Rango cómodo.",
		avoid: "Cuida las rodillas."
	},
	press: {
		name: "Press sobre la cabeza",
		art: "el",
		reps: ARMS,
		sides: true,
		variant: "baja en 3 segundos",
		alt: "floorPress",
		cue: "Codo cerca de las costillas, pies escalonados. Con la pesa sólo si te salen 8 limpias; si no, sin peso.",
		avoid: "Si duele el hombro, quédate con el press en el piso."
	},
	getup: {
		name: "Medio levantamiento turco",
		art: "el",
		fixed: {
			sets: 1,
			reps: 3
		},
		sides: true,
		alt: null,
		cue: "La mirada en la pesa, brazo vertical y codo firme; si la pesa se inclina, bájala con las dos manos, sin intentar salvarla. Con la pesa sólo si te salen 8 limpias; si no, sin peso.",
		avoid: "Cuida los hombros."
	},
	figureEight: {
		name: "Figura ocho",
		art: "la",
		fixed: {
			sets: 2,
			reps: 10
		},
		alt: null,
		cue: "Pies más abiertos que los hombros y rodillas dobladas, en un rango cómodo. Pasa la pesa de una mano a la otra por debajo de cada pierna, dibujando un 8.",
		avoid: "Cuida la espalda baja y las rodillas."
	},
	hinge: {
		name: "Bisagra de cadera sin peso",
		art: "la",
		fixed: {
			sets: 2,
			reps: 10
		},
		cue: "Cadera hacia atrás, espalda neutra."
	},
	squat: {
		name: "Sentadilla sin peso",
		art: "la",
		fixed: {
			sets: 2,
			reps: 10
		},
		cue: "Espalda recta, empuja con los pies, rango cómodo."
	}
};
var LIGHT_CARRY = {
	sets: 2,
	secs: 30
};
function ladder({ reps, secs, variant, talk }) {
	if (secs) return secs.map((s) => ({
		secs: s,
		rest: 60
	}));
	const up = (sets, v) => reps.map((r) => ({
		sets,
		reps: r,
		variant: v,
		rest: 60
	}));
	const steps = [
		...up(1, false),
		...up(2, false),
		...up(3, false),
		...variant ? up(3, true) : []
	];
	return talk ? steps : [
		...steps,
		{
			...steps.at(-1),
			rest: 45
		},
		{
			...steps.at(-1),
			rest: 30
		}
	];
}
var LADDERS = Object.fromEntries(Object.entries(EXERCISES).filter(([, e]) => !e.fixed).map(([id, e]) => [id, ladder(e)]));
var prescription = (id, step) => LADDERS[id][Math.min(step, LADDERS[id].length) - 1];
function turn(week, from) {
	const open = from.filter(([w]) => w <= week);
	if (!open.length) return null;
	const newest = open.at(-1)[0];
	return open[(open.length - 1 + Math.floor((week - newest) / 2)) % open.length][1];
}
var SESSIONS$1 = [
	{
		name: "Piernas A",
		ids: () => [
			"deadlift",
			"goblet",
			"carry"
		]
	},
	{
		name: "Parte superior A",
		ids: () => [
			"row",
			"floorPress",
			"carry"
		]
	},
	{
		name: "Ligero",
		light: true,
		ids: (week) => [
			"hinge",
			"squat",
			turn(week, [[11, "getup"], [15, "figureEight"]]),
			"carry"
		]
	},
	{
		name: "Piernas B",
		ids: (week, swing) => [
			week >= 7 && swing ? "swing" : "deadlift",
			turn(week, [[3, "lunge"], [5, "split"]]) ?? "goblet",
			"carry"
		]
	},
	{
		name: "Parte superior B",
		ids: (week) => [
			"row",
			week >= 9 ? "press" : "floorPress",
			"carry"
		]
	}
];
function nextLift(lifts, restart, walkUp) {
	const last = lifts.at(-1);
	if (restart !== null) return {
		week: restart,
		n: 1,
		held: false
	};
	if (!last) return {
		week: 1,
		n: 1,
		held: false
	};
	if (last.n < 5) return {
		week: last.week,
		n: last.n + 1,
		held: false
	};
	const held = walkUp && CHANGES.includes(last.week + 1);
	return {
		week: held ? last.week : last.week + 1,
		n: 1,
		held
	};
}
var days$1 = (from, to) => (Date.parse(to) - Date.parse(from)) / 864e5;
var stepDown = (all) => Object.fromEntries(Object.entries(all).map(([id, e]) => [id, {
	...e,
	step: Math.max(1, e.step - 1),
	streak: 0
}]));
function apply(prev, item, week) {
	const now = prev ?? {
		step: 1,
		streak: 0,
		hurt: 0,
		since: week,
		swapped: false
	};
	if (item.hurt) {
		const hurt = now.hurt + 1;
		const again = hurt >= 2;
		return {
			...now,
			hurt,
			streak: 0,
			step: again ? Math.max(1, now.step - 1) : now.step,
			swapped: now.swapped || again && EXERCISES[item.id].alt !== void 0
		};
	}
	const base = {
		...now,
		hurt: 0
	};
	if (!LADDERS[item.id] || week < now.since + 2) return base;
	if (!item.rating) return {
		...base,
		streak: 0
	};
	if (item.rating === "fail") return {
		...base,
		step: Math.max(1, now.step - 1),
		streak: 0
	};
	if (item.rating === "hard") return {
		...base,
		streak: 0
	};
	const streak = now.streak + 1;
	return streak >= 2 ? {
		...base,
		step: Math.min(LADDERS[item.id].length, now.step + 1),
		streak: 0
	} : {
		...base,
		streak
	};
}
function ladderState(lifts, today) {
	let all = {};
	let last = null;
	for (const lift of lifts) {
		if (last !== null && days$1(last, lift.day) >= 7) all = stepDown(all);
		all = lift.items.reduce((acc, item) => ({
			...acc,
			[item.id]: apply(acc[item.id], item, lift.week)
		}), all);
		last = lift.day;
	}
	return last !== null && days$1(last, today) >= 7 ? stepDown(all) : all;
}
var started = (lifts, id) => lifts.some((l) => l.items.some((i) => i.id === id));
function swingDue(lifts, { today, walkUp, restart = null }) {
	const { week, n } = nextLift(lifts, restart, walkUp);
	return week >= 7 && n === 4 && (week === 7 || !CHANGES.includes(week)) && !started(lifts, "swing") && !ladderState(lifts, today).swing?.swapped;
}
function liftPlan(lifts, { restart, today, walkUp, swing = false, session: at = null }) {
	const next = at ? {
		...at,
		held: false
	} : nextLift(lifts, restart, walkUp);
	const all = ladderState(lifts, today);
	const session = SESSIONS$1[next.n - 1];
	const items = session.ids(next.week, swing || started(lifts, "swing")).map((id) => all[id]?.swapped ? EXERCISES[id].alt : id).filter(Boolean).map((id) => {
		const ex = EXERCISES[id];
		const step = all[id]?.step ?? 1;
		const dose = session.light ? ex.fixed ?? LIGHT_CARRY : ex.fixed ?? prescription(id, step);
		const learning = session.light || next.week < (all[id]?.since ?? next.week) + 2;
		return {
			id,
			step,
			sides: Boolean(ex.sides),
			talk: Boolean(ex.talk),
			rest: 60,
			variant: false,
			...dose,
			learning
		};
	});
	return {
		...next,
		name: session.name,
		light: Boolean(session.light),
		items
	};
}
var restSteps = (prev, next, secs) => prev?.talk ? [{
	type: "rest",
	dur: CAP,
	est: 90,
	until: true,
	talk: true,
	sound: "release",
	prev: prev.id,
	next: next.id
}] : [{
	type: "rest",
	dur: secs - READY,
	sound: "release",
	prev: prev?.id,
	next: next.id
}, {
	type: "ready",
	dur: READY,
	sound: "prep",
	prev: prev?.id,
	next: next.id
}];
function setSteps$1(item, round) {
	const one = (side) => item.secs ? {
		type: "timed",
		dur: item.secs,
		sound: "squeeze",
		ex: item.id,
		side,
		round
	} : {
		type: "set",
		dur: CAP,
		est: item.reps * PER_REP,
		until: true,
		sound: "squeeze",
		ex: item.id,
		reps: item.reps,
		side,
		round
	};
	return item.sides ? [
		one(1),
		{
			type: "side",
			dur: SIDE,
			sound: "setEnd",
			ex: item.id,
			round
		},
		one(2)
	] : [one(0)];
}
var rounds = ({ items }) => Math.max(1, ...items.map((i) => i.sets ?? 1));
function buildLift({ items, light }, { resume = false } = {}) {
	const total = rounds({ items });
	const steps = resume ? [] : [{
		type: "warm",
		dur: WARM,
		sound: "prep"
	}];
	if (!light && !resume) steps.push({
		type: "practice",
		dur: CAP,
		est: 150,
		until: true,
		sound: "prep"
	});
	let prev = null;
	for (let round = 1; round <= total; round++) items.filter((i) => (i.sets ?? total) >= round).forEach((item, k) => {
		if (prev) steps.push(...restSteps(prev, item, k ? prev.rest : ROUND_REST));
		steps.push(...setSteps$1(item, round));
		prev = item;
	});
	return timeline(steps);
}
var minutes$1 = (steps) => Math.round(steps.reduce((t, s) => t + (s.est ?? s.dur), 0) / 60);
var setsDone = (steps, elapsed) => steps.filter((s) => (s.type === "set" || s.type === "timed") && s.side !== 1 && s.start + s.dur <= elapsed).reduce((acc, s) => ({
	...acc,
	[s.ex]: (acc[s.ex] ?? 0) + 1
}), {});
//#endregion
//#region src/store.js
var FACE_KINDS = [
	"posture",
	"tongue",
	"yoga15",
	"yoga30"
];
var KEY = "keggelatto:state";
var BACKUP = "keggelatto:respaldo";
var HOUR = 36e5;
var DAY_ENDS_AT = 4;
var initialState = () => ({
	version: 1,
	screening: null,
	learned: false,
	expectSeen: false,
	alarmsSet: false,
	alarms: [{
		time: "",
		routine: ""
	}, {
		time: "",
		routine: ""
	}],
	prefs: {
		discreet: false,
		vibrate: true,
		cue: 0,
		longClose: false,
		tongue: false
	},
	phase: {
		id: 1,
		since: null,
		deferUntil: null,
		lastCheck: null,
		resumedAfter: null
	},
	startedAt: null,
	week12Seen: false,
	sessions: [],
	reviews: [],
	pains: [],
	exercise: null,
	exerciseAlerts: [],
	treadmill: {
		start: null,
		speed: null,
		resumedAfter: null
	},
	walks: [],
	liftCheck: null,
	kettlebell: { restart: null },
	lifts: [],
	faceCheck: null,
	face: {
		start: null,
		yogaFrom: null,
		clearedAt: null,
		neckStop: null,
		photoAt: null
	},
	faceSessions: [],
	facePains: []
});
var NOT_OURS = "El archivo no es un registro de Keggelatto.";
var isNum = (v) => typeof v === "number" && Number.isFinite(v);
var isTime = (v) => v === null || isNum(v);
var isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
var isBool = (v) => typeof v === "boolean";
var isStrings = (v) => Array.isArray(v) && v.every((s) => typeof s === "string");
var isDay = (v) => typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v);
var isList = (v, ok) => Array.isArray(v) && v.every((x) => x !== null && typeof x === "object" && ok(x));
var isAnswers = (v) => v === null || isBool(v?.ok) && isNum(v.at) && isStrings(v.ids);
var RATING_IDS = RATINGS$1.map(([id]) => id);
var isLiftItem = (i) => Object.hasOwn(EXERCISES, i.id) && isInt(i.step, 1, 30) && isInt(i.sets, 0, 10) && (i.rating === null || RATING_IDS.includes(i.rating)) && isBool(i.hurt);
function valid(s) {
	const { screening: sc, phase: p, prefs, exercise: ex, treadmill: t, kettlebell: k, face: f } = s;
	return [
		s.learned,
		s.expectSeen,
		s.alarmsSet,
		s.week12Seen,
		prefs.discreet,
		prefs.vibrate,
		prefs.longClose,
		prefs.tongue
	].every(isBool) && [
		s.startedAt,
		p.since,
		p.deferUntil,
		p.lastCheck,
		p.resumedAfter,
		t.start,
		t.resumedAfter
	].every(isTime) && [
		f.start,
		f.yogaFrom,
		f.clearedAt,
		f.neckStop,
		f.photoAt
	].every(isTime) && (f.start === null || f.yogaFrom !== null) && isAnswers(s.faceCheck) && isList(s.faceSessions, (x) => isNum(x.at) && isDay(x.day) && FACE_KINDS.includes(x.kind) && isNum(x.minutes) && isBool(x.full)) && Array.isArray(s.facePains) && s.facePains.every(isNum) && (t.speed === null ? t.start === null : isNum(t.speed) && t.speed >= 1 && t.speed <= 10) && isAnswers(ex) && isAnswers(s.liftCheck) && (k.restart === null || isInt(k.restart, 1, 1e3)) && isList(s.lifts, (l) => isNum(l.at) && isDay(l.day) && isInt(l.week, 1, 1e3) && isInt(l.n, 1, 5) && isList(l.items, isLiftItem)) && Array.isArray(s.exerciseAlerts) && s.exerciseAlerts.every(isNum) && isList(s.walks, (w) => isNum(w.at) && isDay(w.day) && isNum(w.moderate) && isNum(w.light) && (w.speed === null || isNum(w.speed)) && isInt(w.stage, 1, 5)) && isInt(p.id, 1, 6) && isInt(prefs.cue, 0, 3) && (sc === null || [
		"A",
		"B",
		"C"
	].includes(sc?.result) && [
		null,
		"urgent",
		"sameday",
		"normal"
	].includes(sc.urgency) && isBool(sc.relaxOffered) && isNum(sc.at) && isStrings(sc.ids ?? [])) && isList(s.alarms, (a) => /^(\d\d:\d\d)?$/.test(a.time) && typeof a.routine === "string" && a.routine.length <= 60) && s.alarms.length === 2 && isList(s.sessions, (x) => isNum(x.at) && [
		"full",
		"short",
		"relax"
	].includes(x.kind) && isInt(x.phase, 1, 6) && isNum(x.hold) && (x.rating == null || typeof x.rating === "string")) && isList(s.reviews, (r) => isNum(r.at) && isStrings(r.yes) && isStrings(r.advice ?? []) && [
		null,
		"relax",
		"stop"
	].includes(r.mode ?? null) && [null, "stop"].includes(r.exercise ?? null) && (r.control == null || isInt(r.control, 1, 5))) && Array.isArray(s.pains) && s.pains.every(isNum);
}
function parse(text) {
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error(NOT_OURS);
	}
	if (data?.version !== 1 || !Array.isArray(data.sessions)) throw new Error(NOT_OURS);
	const base = initialState();
	const state = {
		...base,
		...data,
		prefs: {
			...base.prefs,
			...data.prefs
		},
		phase: {
			...base.phase,
			...data.phase
		},
		treadmill: {
			...base.treadmill,
			...data.treadmill
		},
		kettlebell: {
			...base.kettlebell,
			...data.kettlebell
		},
		face: {
			...base.face,
			...data.face
		}
	};
	if (!valid(state)) throw new Error(NOT_OURS);
	return state;
}
var exportJson = (state) => JSON.stringify(state, null, 2);
function load(storage) {
	const text = storage.getItem(KEY);
	if (!text) return initialState();
	try {
		return parse(text);
	} catch (error) {
		console.error("Registro dañado; se guardó una copia en", BACKUP, error);
		storage.setItem(BACKUP, text);
		return {
			...initialState(),
			damaged: true
		};
	}
}
var save = (state, storage) => storage.setItem(KEY, JSON.stringify(state));
var pad = (n) => String(n).padStart(2, "0");
function dayKey(ms) {
	const d = /* @__PURE__ */ new Date(ms - DAY_ENDS_AT * HOUR);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dayNumber(ms) {
	const d = /* @__PURE__ */ new Date(ms - DAY_ENDS_AT * HOUR);
	return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
}
var calendarWeek = (start, now) => Math.max(1, Math.floor((dayNumber(now) - dayNumber(start)) / 7) + 1);
function shiftDays(ms, days) {
	const d = /* @__PURE__ */ new Date(ms - DAY_ENDS_AT * HOUR);
	return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 12).getTime();
}
function slot(ms) {
	const h = new Date(ms).getHours();
	return h >= DAY_ENDS_AT && h < 15 ? "mañana" : "noche";
}
function weekDays(now) {
	const d = /* @__PURE__ */ new Date(now - DAY_ENDS_AT * HOUR);
	const monday = d.getDate() - (d.getDay() + 6) % 7;
	return Array.from({ length: 7 }, (_, i) => dayKey(new Date(d.getFullYear(), d.getMonth(), monday + i, 12).getTime()));
}
function weekSummary(sessions, now) {
	const days = weekDays(now);
	const perDay = days.map((k) => sessions.filter((s) => s.day === k && s.kind === "full").length);
	return {
		full: perDay.reduce((total, n) => total + Math.min(n, 2), 0),
		fullDays: perDay.filter(Boolean).length,
		today: days.indexOf(dayKey(now)),
		days: days.map((k) => sessions.some((s) => s.day === k))
	};
}
//#endregion
//#region src/pelvic.js
var DAY$3 = 864e5;
var POSITIONS = {
	acostado: "Acostado boca arriba, con las rodillas dobladas",
	sentado: "Sentado, con las rodillas separadas",
	pie: "De pie, con los pies separados"
};
var ALL = [
	"acostado",
	"sentado",
	"pie"
];
var PHASES = [
	{
		id: 1,
		name: "Aprender",
		hold: 3,
		rest: 5,
		positions: ["acostado", "sentado"],
		strong: false
	},
	{
		id: 2,
		name: "Construir",
		hold: 5,
		rest: 5,
		positions: ALL,
		strong: false
	},
	{
		id: 3,
		name: "Alargar",
		hold: 8,
		rest: 8,
		positions: ALL,
		strong: false
	},
	{
		id: 4,
		name: "Fortalecer",
		hold: 8,
		rest: 8,
		positions: ALL,
		strong: true
	},
	{
		id: 5,
		name: "Dosis objetivo",
		hold: 10,
		rest: 10,
		positions: ALL,
		strong: true
	},
	{
		id: 6,
		name: "Mantenimiento",
		hold: 10,
		rest: 10,
		positions: ["pie"],
		strong: true
	}
];
var phaseById = (id) => PHASES[id - 1];
var REPS = 5;
var QUICK = [1, 2];
var BREATH = [3, 7];
var PAUSE_BREATHS = 6;
var CLOSE_BREATHS = 10;
var RELAX_BREATHS = 30;
var PREP$1 = 5;
function breaths(n, block, extra = {}) {
	return Array.from({ length: n }, (_, i) => [{
		type: "inhale",
		dur: BREATH[0],
		sound: "inhale",
		block,
		left: n - i,
		...extra
	}, {
		type: "exhale",
		dur: BREATH[1],
		sound: "exhale",
		block,
		left: n - i,
		...extra
	}]).flat();
}
function reps(block, [type, restType], [dur, restDur], where) {
	return Array.from({ length: REPS }, (_, i) => [{
		type,
		dur,
		sound: "squeeze",
		block,
		left: REPS - i,
		...where
	}, {
		type: restType,
		dur: restDur,
		sound: "release",
		block,
		left: REPS - i - 1,
		...where
	}]).flat();
}
var endOfSet = ([first, ...rest]) => [{
	...first,
	sound: "setEnd"
}, ...rest];
function buildSession(phaseId, { position, longClose = false } = {}) {
	const phase = phaseById(phaseId);
	const positions = position ? [position] : phase.positions;
	const sets = positions.flatMap((p, i) => {
		const where = {
			position: p,
			set: i + 1,
			sets: positions.length
		};
		return [
			...i > 0 ? endOfSet(breaths(PAUSE_BREATHS, "pause", { position: p })) : [],
			...reps("hold", ["hold", "rest"], [phase.hold, phase.rest], where),
			...reps("quick", ["quick", "quickRest"], QUICK, where)
		];
	});
	return timeline([
		{
			type: "prep",
			dur: PREP$1,
			sound: "prep",
			block: "prep",
			position: positions[0]
		},
		...sets,
		...endOfSet(breaths(longClose ? RELAX_BREATHS : CLOSE_BREATHS, "close"))
	]);
}
var buildRelax = () => timeline([{
	type: "prep",
	dur: PREP$1,
	sound: "prep",
	block: "prep"
}, ...breaths(RELAX_BREATHS, "relax")]);
var days = (from, to) => (to - from) / DAY$3;
var GOOD = ["fácil", "bien"];
function sessionsInPhase({ phase, sessions }) {
	if (phase.since === null) return [];
	const perDay = {};
	return sessions.filter((s) => {
		if (s.kind !== "full" || s.phase !== phase.id || s.at < phase.since) return false;
		const day = s.day ?? dayKey(s.at);
		perDay[day] = (perDay[day] ?? 0) + 1;
		return perDay[day] <= 2;
	});
}
var programStart = ({ sessions }) => sessions.find((s) => s.kind === "full")?.at ?? null;
function canAdvance(state, now) {
	const { phase } = state;
	if (phase.id >= PHASES.length || phase.since === null) return false;
	if (phase.deferUntil && now < phase.deferUntil) return false;
	const done = sessionsInPhase(state);
	const rated = done.filter((s) => s.rating);
	const lastGood = rated.length >= 3 && rated.slice(-3).every((s) => GOOD.includes(s.rating));
	const sixMonths = phase.id !== 5 || days(programStart(state), now) >= 182;
	return days(phase.since, now) >= 14 && done.length >= 15 && lastGood && sixMonths;
}
var withPhase = (state, change) => ({
	...state,
	phase: {
		...state.phase,
		deferUntil: null,
		lastCheck: null,
		...change
	}
});
var advance = (state, now) => withPhase(state, {
	id: state.phase.id + 1,
	since: now
});
var defer = (state, now) => ({
	...state,
	phase: {
		...state.phase,
		deferUntil: now + 7 * DAY$3
	}
});
var suggestPhysio = ({ phase }, now) => phase.since !== null && days(phase.since, now) >= 21;
function afterPause(state, now) {
	const last = state.sessions.at(-1);
	if (!last || state.phase.id === 1 || state.phase.resumedAfter === last.at || days(last.at, now) < 28) return state;
	return withPhase(state, {
		id: state.phase.id - 1,
		since: now,
		resumedAfter: last.at
	});
}
var checkDue = ({ phase }, now) => phase.id === 6 && days(phase.lastCheck ?? phase.since, now) >= 30;
var monthlyCheck = (state, ok, now) => ok ? {
	...state,
	phase: {
		...state.phase,
		lastCheck: now
	}
} : withPhase(state, {
	id: 5,
	since: now
});
var longestHold = ({ sessions }) => Math.max(0, ...sessions.filter((s) => s.kind === "full").map((s) => s.hold));
//#endregion
//#region src/safety.js
var DAY$2 = 864e5;
var LEVELS = [
	{
		level: "urgent",
		title: "Urgencias ahora"
	},
	{
		level: "sameday",
		title: "Médico el mismo día"
	},
	{
		level: "normal",
		title: "Consulta normal antes de empezar"
	},
	{
		level: "B",
		title: "Relajación antes que fuerza"
	}
];
var SCREENING = [
	{
		id: "numb",
		level: "urgent",
		text: "Adormecimiento alrededor de los genitales o el ano"
	},
	{
		id: "control",
		level: "urgent",
		text: "Pérdida nueva del control de la vejiga o el intestino"
	},
	{
		id: "legs",
		level: "urgent",
		text: "Debilidad o adormecimiento en ambas piernas"
	},
	{
		id: "testicle",
		level: "urgent",
		text: "Dolor fuerte y repentino en un testículo"
	},
	{
		id: "retention",
		level: "sameday",
		text: "No poder orinar"
	},
	{
		id: "blood",
		level: "sameday",
		text: "Sangre visible en la orina"
	},
	{
		id: "burn",
		level: "sameday",
		text: "Ardor al orinar o fiebre"
	},
	{
		id: "urinary",
		level: "normal",
		text: "Dificultad al orinar que un médico no haya revisado, nueva o de siempre: chorro débil, lento o entrecortado; dificultad para empezar; pujar; sensación de no vaciar; urgencia; orinar más de 8 veces al día o levantarse de noche a orinar"
	},
	{
		id: "bowel",
		level: "normal",
		text: "Estreñimiento frecuente, pujo al evacuar o dolor al evacuar que un médico no haya revisado"
	},
	{
		id: "pain",
		level: "normal",
		pain: true,
		text: "Dolor o molestia en el periné, los testículos, el pene, arriba del pubis o en la espalda baja cerca de la pelvis, o dolor durante o después del sexo o al eyacular, que un médico no haya revisado"
	},
	{
		id: "semen",
		level: "normal",
		text: "Sangre en el semen"
	},
	{
		id: "erection",
		level: "normal",
		text: "Problemas de erección que se repiten"
	},
	{
		id: "penis",
		level: "normal",
		pain: true,
		text: "Erección dolorosa, curvatura nueva o bulto en el pene"
	},
	{
		id: "lump",
		level: "normal",
		pain: true,
		text: "Bulto, hinchazón o dolor en un testículo que no se quita"
	},
	{
		id: "stool",
		level: "normal",
		text: "Sangre en las heces, cambio en el hábito intestinal o pérdida de peso sin buscarla"
	},
	{
		id: "surgery",
		level: "normal",
		text: "Cirugía de próstata o urológica sin autorización del cirujano"
	},
	{
		id: "catheter",
		level: "normal",
		text: "Una sonda urinaria puesta"
	},
	{
		id: "relaxing",
		level: "B",
		text: "Dificultad para sentir que los músculos se relajan"
	},
	{
		id: "painChecked",
		level: "B",
		text: "Dolor o molestia en el periné, los testículos, el pene, arriba del pubis o en la espalda baja, ya revisado por un médico sin encontrar otra causa"
	},
	{
		id: "sexChecked",
		level: "B",
		text: "Dolor durante o después del sexo o al eyacular, ya revisado por un médico sin encontrar otra causa"
	},
	{
		id: "urinaryChecked",
		level: "B",
		text: "Dificultad para empezar a orinar, chorro lento, pujar, sensación de no vaciar, urgencia o frecuencia, ya revisados por un médico sin encontrar otra causa"
	},
	{
		id: "bowelChecked",
		level: "B",
		text: "Estreñimiento, pujo, sensación de no vaciar el intestino o dolor al evacuar, ya revisados por un médico sin encontrar otra causa"
	}
];
var SCREEN_RESULT = {
	urgent: "Busca atención médica urgente ahora. No hagas los ejercicios de piso pélvico.",
	sameday: "Ve al médico hoy mismo. No hagas los ejercicios de piso pélvico.",
	normal: "Haz una consulta médica antes de empezar el piso pélvico.",
	B: "No fortalezcas por ahora: usa sólo el modo de relajación y consulta a una fisioterapeuta de piso pélvico. Si el dolor pélvico lleva 3 meses o más de los últimos 6, consulta también al médico.",
	C: "Puedes empezar."
};
var URGENCY = [
	"urgent",
	"sameday",
	"normal"
];
function screen(ids) {
	const picked = SCREENING.filter((i) => ids.includes(i.id));
	const urgency = URGENCY.find((level) => picked.some((i) => i.level === level)) ?? null;
	if (urgency) return {
		result: "A",
		urgency,
		relaxOffered: urgency === "normal" && picked.some((i) => i.pain)
	};
	return {
		result: picked.length ? "B" : "C",
		urgency: null,
		relaxOffered: false
	};
}
var REVIEW = [
	{
		id: "pain",
		text: "Dolor en el periné, los testículos, la punta del pene o arriba del pubis"
	},
	{
		id: "burn",
		text: "Ardor al orinar"
	},
	{
		id: "ejacPain",
		text: "Dolor al eyacular"
	},
	{
		id: "sessionPain",
		text: "Dolor durante o después de las sesiones de piso pélvico"
	},
	{
		id: "release",
		text: "Dificultad para sentir que los músculos se sueltan"
	},
	{
		id: "urinary",
		text: "Sensación de no vaciar la vejiga, u orinar más seguido de lo normal"
	},
	{
		id: "bowel",
		text: "Estreñimiento o pujo"
	},
	{
		id: "erection",
		text: "Erección peor que antes"
	},
	{
		id: "ejacControl",
		text: "Control de la eyaculación peor que antes"
	},
	{
		id: "a",
		text: "Alguna señal de urgencia, de médico el mismo día o de consulta normal del cuestionario inicial"
	},
	{
		id: "exercise",
		text: "Alguna señal del cuestionario de ejercicio: dolor en el pecho, falta de aire fuera de lo normal, mareo, palpitaciones, tobillos hinchados o dolor de pantorrilla al caminar"
	},
	{
		id: "effortPain",
		text: "Dolor en la mandíbula, el cuello, un brazo o la espalda alta que aparece al caminar o con la pesa rusa y se quita al descansar"
	},
	{
		id: "joint",
		text: "Dolor en una articulación que duró más de 2 días"
	},
	{
		id: "jaw",
		text: "Dolor de la mandíbula, chasquido con dolor o bloqueo de la mandíbula, o dolor de cuello, con la cara y cuello o al masticar"
	}
];
var JAW_ADVICE = "Cara y cuello en pausa. Si el dolor no se quita, consulta. Un chasquido sin dolor es común y no cuenta.";
function jointAdvice(yes, before = []) {
	if (!yes.includes("joint")) return null;
	return before.includes("joint") ? "El dolor de la articulación sigue: consulta a un médico o a un fisioterapeuta." : "Dolor en una articulación: si viene de la pesa rusa, toca \"Me duele\" en ese ejercicio y la siguiente vez baja un escalón o cambia a su alternativa. Si sigue una semana más, consulta.";
}
var PAINS = [
	"pain",
	"ejacPain",
	"sessionPain"
];
var CONTROL = ["release", "ejacControl"];
function review(yes, before = []) {
	const exercise = ["exercise", "effortPain"].some((id) => yes.includes(id)) ? "stop" : null;
	return {
		...pelvicReview(yes, before),
		exercise
	};
}
function pelvicReview(yes, before) {
	const has = (ids) => ids.some((id) => yes.includes(id));
	const again = (ids) => has(ids) && ids.some((id) => before.includes(id));
	if (has(["a"])) return {
		mode: "stop",
		advice: ["Deja el piso pélvico y ve al médico con la urgencia que indica el cuestionario inicial. Después vuelve a contestarlo."]
	};
	if (has(["burn"])) return {
		mode: "stop",
		advice: ["Ardor al orinar: deja el piso pélvico y ve al médico hoy mismo. Después vuelve a contestar el cuestionario."]
	};
	const advice = [
		has(["urinary", "bowel"]) && "Síntoma urinario o intestinal nuevo: sólo relajación y consulta normal con el médico.",
		has(PAINS) && (again(PAINS) ? "El dolor se repite: sigue sólo con relajación y consulta a una fisioterapeuta de piso pélvico." : "Dolor: esta semana, sólo relajación. Si ningún médico lo ha revisado, haz una consulta normal."),
		has(CONTROL) && (again(CONTROL) ? "Se repite la dificultad para soltar o el peor control: consulta a una fisioterapeuta de piso pélvico." : "Dificultad para soltar o peor control de la eyaculación: esta semana, sólo relajación."),
		has(["erection"]) && (again(["erection"]) ? "La erección sigue peor: ve al médico, porque puede ser una señal cardiovascular." : "Erección peor que antes: esta semana, sólo relajación.")
	].filter(Boolean);
	return {
		mode: advice.length ? "relax" : null,
		advice
	};
}
var EMERGENCY = [
	"Dolor, presión u opresión en el pecho, o dolor que se extiende al brazo, el cuello, la mandíbula o la espalda",
	"Falta de aire que no deja hablar",
	"Desmayo durante el esfuerzo, o con dolor de pecho o palpitaciones",
	"Dolor de cabeza repentino y muy fuerte",
	"Cara caída de un lado, debilidad o adormecimiento de un brazo o de un lado del cuerpo, o dificultad para hablar"
];
var stopReview = ({ screening, reviews }) => reviews.findLast((r) => r.mode === "stop" && r.at > screening.at);
function mode({ screening, reviews, pains }) {
	if (!screening) return "screen";
	const last = reviews.at(-1);
	if (stopReview({
		screening,
		reviews
	})) return "stop";
	if (screening.result === "A") return screening.relaxOffered ? "relax" : "stop";
	if (screening.result === "B" || last?.mode === "relax") return "relax";
	return pains.some((t) => t > (last?.at ?? -Infinity)) ? "relax" : "normal";
}
var EXERCISE = [
	{
		id: "heart",
		text: "Enfermedad del corazón, de las arterias de las piernas, o un infarto cerebral, ya diagnosticados"
	},
	{
		id: "diabetes",
		text: "Diabetes tipo 1 o 2"
	},
	{
		id: "kidney",
		text: "Enfermedad de los riñones"
	},
	{
		id: "chest",
		text: "Dolor o molestia en el pecho, el cuello, la mandíbula, los brazos u otra zona, que pueda venir del corazón"
	},
	{
		id: "breath",
		text: "Falta de aire en reposo o con poco esfuerzo"
	},
	{
		id: "dizzy",
		text: "Mareo o desmayo"
	},
	{
		id: "lying",
		text: "Falta de aire al acostarse, o que te despierta en la noche"
	},
	{
		id: "ankles",
		text: "Tobillos hinchados"
	},
	{
		id: "palpitations",
		text: "Palpitaciones o corazón acelerado"
	},
	{
		id: "calf",
		text: "Dolor de pantorrilla al caminar"
	},
	{
		id: "murmur",
		text: "Un soplo en el corazón ya conocido"
	},
	{
		id: "tired",
		text: "Cansancio o falta de aire fuera de lo normal en actividades de siempre"
	}
];
var EXERCISE_STOP = "Deja la caminadora y la pesa rusa y ve al médico antes de seguir, aunque no tengas síntomas. Después vuelve a contestar el cuestionario de ejercicio.";
function exerciseMode({ screening, exercise, reviews, exerciseAlerts }) {
	if (screening?.urgency === "urgent") return "urgent";
	if (reviews.some((r) => r.yes?.includes("a") && r.at > (screening?.at ?? -Infinity))) return "urgent";
	if (!exercise) return "screen";
	if (!exercise.ok) return "stop";
	const after = (t) => t > exercise.at;
	return exerciseAlerts.some(after) || reviews.some((r) => r.exercise === "stop" && after(r.at)) ? "stop" : "normal";
}
var LIFT_CHECK = [
	{
		id: "pressure",
		text: "Presión alta diagnosticada que no está controlada"
	},
	{
		id: "joint",
		text: "Dolor o lesión de espalda, cadera, rodilla u hombro que ya limita tus actividades, o artrosis"
	},
	{
		id: "hernia",
		text: "Una hernia, o un bulto en la ingle, el ombligo o el abdomen que crece al toser o al hacer fuerza"
	}
];
function liftMode(state) {
	const m = exerciseMode(state);
	if (m !== "normal") return m;
	if (!state.liftCheck) return "check";
	return state.liftCheck.ok ? "normal" : "consult";
}
var FACE_CHECK = [
	{
		id: "jaw",
		text: "Un problema de la articulación de la mandíbula"
	},
	{
		id: "neck",
		text: "Un problema, una lesión o una cirugía de cuello, o una lesión o cirugía de mandíbula"
	},
	{
		id: "palsy",
		text: "Parálisis facial"
	},
	{
		id: "lump",
		text: "Una infección o un bulto en la cara"
	},
	{
		id: "procedure",
		text: "Rellenos, bótox o algún procedimiento reciente en la cara: consulta con quien te los aplicó"
	}
];
function faceMode(state) {
	if (exerciseMode(state) === "urgent") return "urgent";
	const { faceCheck, facePains, reviews, face } = state;
	if (!faceCheck) return "check";
	if (!faceCheck.ok) return "consult";
	return [...facePains, ...reviews.filter((r) => r.yes?.includes("jaw")).map((r) => r.at)].some((t) => t > faceCheck.at && t > (face.clearedAt ?? -Infinity)) ? "paused" : "normal";
}
var neckStopped = ({ face, faceCheck }) => face.neckStop !== null && face.neckStop > (faceCheck?.at ?? -Infinity);
var reviewDue = ({ startedAt, reviews }, now) => startedAt !== null && now - (reviews.at(-1)?.at ?? startedAt) >= 7 * DAY$2;
//#endregion
//#region src/treadmill.js
var round1 = (x) => Math.round(x * 10) / 10;
var STAGES = [
	{
		id: 1,
		fromWeek: 1,
		moderate: 10,
		total: [15, 20]
	},
	{
		id: 2,
		fromWeek: 4,
		moderate: 15,
		total: [30, 40]
	},
	{
		id: 3,
		fromWeek: 6,
		moderate: 20,
		total: [45, 60]
	},
	{
		id: 4,
		fromWeek: 8,
		moderate: 25,
		total: [45, 60]
	},
	{
		id: 5,
		fromWeek: 10,
		moderate: 30
	}
];
var stageFor = (week) => STAGES.findLast((s) => s.fromWeek <= week);
var currentWeek = ({ treadmill }, now) => treadmill.start === null ? 1 : calendarWeek(treadmill.start, now);
var currentStage = (state, now) => stageFor(currentWeek(state, now));
function totalTarget(week) {
	const stage = stageFor(week);
	if (stage.total) return stage.total;
	const k = Math.floor((week - stage.fromWeek) / 2) + 1;
	return [Math.min(120, 45 + 10 * k), Math.min(120, 60 + 15 * k)];
}
function walkDay(now) {
	const day = (/* @__PURE__ */ new Date(now - 144e5)).getDay();
	return day >= 1 && day <= 5;
}
var warmSpeed = (speed) => Math.max(2.5, round1(speed - 1));
function buildWalk(stage, { lightOnly = false, warm = true } = {}) {
	const light = {
		type: "light",
		dur: 7200,
		sound: lightOnly ? "prep" : "release",
		block: "light"
	};
	if (lightOnly) return timeline([light]);
	return timeline([
		...warm ? [{
			type: "warm",
			dur: 300,
			sound: "prep",
			block: "warm"
		}] : [],
		{
			type: "moderate",
			dur: stage.moderate * 60,
			sound: "squeeze",
			block: "moderate"
		},
		light
	]);
}
function walkStepsUp(state, now) {
	const week = currentWeek(state, now);
	return state.treadmill.start !== null && week >= 4 && week % 2 === 0;
}
function speedTest() {
	const n = Math.round((6.4 - 3) / .2) + 1;
	return timeline(Array.from({ length: n }, (_, i) => ({
		type: "test",
		dur: 60,
		sound: i ? "squeeze" : "prep",
		block: "test",
		speed: round1(3 + .2 * i)
	})));
}
function walked(steps, elapsed) {
	const minutes = (list) => list.reduce((t, s) => t + Math.min(Math.max(elapsed - s.start, 0), s.dur), 0) / 60;
	return {
		moderate: round1(minutes(steps.filter((s) => s.block === "moderate"))),
		light: round1(minutes(steps.filter((s) => s.block !== "moderate")))
	};
}
function cadence(in30s) {
	const perMin = in30s * 2;
	return {
		perMin,
		level: perMin >= 105 ? "moderate" : perMin >= 100 ? "near" : "light"
	};
}
var withStart = (state, start, extra = {}) => ({
	...state,
	treadmill: {
		...state.treadmill,
		start,
		...extra
	}
});
var stageStart = (stage, now) => shiftDays(now, -(stage.fromWeek - 1) * 7);
function afterWalkPause(state, now) {
	const last = state.walks.at(-1);
	const { treadmill } = state;
	if (!last || treadmill.start === null || treadmill.resumedAfter === last.at) return state;
	if (dayNumber(now) - dayNumber(last.at) < 7) return state;
	const previous = STAGES[Math.max(0, stageFor(calendarWeek(treadmill.start, last.at)).id - 2)];
	return withStart(state, stageStart(previous, now), { resumedAfter: last.at });
}
function holdStage(state, now) {
	if (state.treadmill.start === null) return state;
	const latest = stageStart(currentStage(state, now), now);
	return withStart(state, Math.min(shiftDays(state.treadmill.start, 7), latest));
}
var repeatStage = (state, now) => withStart(state, stageStart(currentStage(state, now), now));
function weekModerate(walks, now) {
	const days = weekDays(now);
	return round1(walks.filter((w) => days.includes(w.day)).reduce((t, w) => t + w.moderate, 0));
}
function todayWalk(walks, now) {
	const today = walks.filter((w) => w.day === dayKey(now));
	return {
		moderate: round1(today.reduce((t, w) => t + w.moderate, 0)),
		total: round1(today.reduce((t, w) => t + w.moderate + w.light, 0))
	};
}
//#endregion
//#region src/face.js
var PREP = 5;
var UP = 2;
var PAUSE = 6;
var BREATHE = 10;
var PE = 2;
var YOGA_DELAY = 14;
var YOGA_PAUSE = 14;
var YOGA_KINDS = ["yoga15", "yoga30"];
var FACE = {
	chinTuck: {
		name: "Barbilla hacia atrás",
		sets: 10,
		hold: "week",
		how: "Sentado, desliza la barbilla hacia atrás sin inclinar la cabeza."
	},
	chinBall: {
		name: "Barbilla contra una pelota",
		sets: 5,
		hold: 10,
		how: "Sentado, con una pelota o una toalla enrollada bajo la barbilla, aprieta suave hacia abajo, sin dolor."
	},
	tongue: {
		name: "Lengua contra el paladar",
		sets: 10,
		hold: "week",
		how: "Presiona suave justo detrás de los dientes de arriba, con los labios juntos y los dientes separados, sin apretar la mandíbula."
	},
	start: {
		name: "Posición de inicio: media sonrisa",
		timed: 10,
		how: "Comisuras un poco arriba, labios relajados y cerrados. Vuelves a ella entre ejercicios."
	},
	cheekLift: {
		name: "Subir mejillas",
		sets: 3,
		reps: 10,
		last: 20,
		how: "Abre la boca en una \"O\" larga, sin abrir al máximo, con el labio de arriba doblado sobre los dientes. Sonríe para subir las mejillas, con las yemas apenas apoyadas en ellas. La última subida se sostiene."
	},
	cheekPush: {
		name: "Mejillas contra los dedos",
		sets: 3,
		reps: 10,
		how: "Boca medio abierta, labios sobre los dientes. Los índices empujan las mejillas hacia abajo desde los pómulos y las mejillas suben contra ellos, sin fruncir. Suelta despacio."
	},
	mask: {
		name: "Máscara",
		sets: 3,
		reps: 10,
		how: "Índices a lo largo de los pómulos y medios en los surcos de la nariz a la boca, estirando la piel hacia abajo y afuera. Sube las comisuras y junta las mejillas contra los dedos. Suelta despacio."
	},
	wideSmile: {
		name: "Sonrisa ancha",
		sets: 1,
		hold: 20,
		how: "Jala las comisuras hacia los lados y sube las mejillas con fuerza. Suelta despacio."
	},
	sculpt: {
		name: "Esculpir mejillas",
		sets: 3,
		hold: 20,
		how: "Sonrisa con los labios cerrados y hacia afuera, comisuras arriba. Los índices suben desde las comisuras hasta los pómulos con presión firme, y sostienes."
	},
	puff: {
		name: "Inflar mejillas",
		sets: 3,
		hold: 20,
		how: "Llena de aire mejillas y labios, con un dedo apenas sobre los labios, respirando por la nariz. Suelta despacio."
	},
	kiss: {
		name: "Beso con mejillas hacia atrás",
		sets: 3,
		hold: 10,
		how: "Las palmas en las mejillas, cerca de las orejas, jalan hacia atrás mientras los labios empujan hacia adelante en un beso. Exhala despacio."
	},
	lipsPe: {
		name: "Labios adentro y \"PE\"",
		sets: 3,
		hold: 3,
		pe: true,
		how: "Mete los labios y sostén; luego exhala con un \"PE\" fuerte."
	},
	brows: {
		name: "Subir cejas",
		sets: 3,
		hold: 20,
		how: "Las yemas bajo las cejas empujan hacia arriba y frunces hacia abajo contra ellas. Luego cierra fuerte los párpados y mira hacia arriba."
	},
	eyes: {
		name: "Contorno de ojos",
		sets: 3,
		hold: 10,
		how: "Los dedos en las esquinas de los ojos y el final de las cejas estiran hacia atrás mientras entrecierras los ojos."
	},
	forehead: {
		name: "Frente contra la mano",
		sets: 3,
		hold: 10,
		how: "La mano descansa en la frente sin empujar; sube las cejas contra ella."
	},
	close: {
		name: "Cierre: golpecitos y caricias",
		timed: 60,
		how: "Golpecitos con las yemas, sin tocar los ojos; luego 3 pasadas con las palmas de la frente a las sienes por las mejillas."
	}
};
var CHEEKS = [
	"cheekLift",
	"cheekPush",
	"mask"
];
var postureIds = (tongue) => [
	"chinTuck",
	"chinBall",
	...tongue ? ["tongue"] : []
];
var SESSIONS = {
	posture: postureIds,
	tongue: () => ["tongue"],
	yoga15: () => [
		"start",
		...CHEEKS,
		"sculpt",
		"wideSmile",
		"close"
	],
	yoga30: () => [
		"start",
		...CHEEKS,
		"sculpt",
		"wideSmile",
		"puff",
		"kiss",
		"lipsPe",
		"brows",
		"eyes",
		"forehead",
		...CHEEKS,
		"close"
	]
};
var holdFor = (id, week) => FACE[id].hold === "week" ? week <= 2 ? 5 : 10 : FACE[id].hold;
function setSteps(id, ex, week) {
	if (ex.reps) return Array.from({ length: ex.reps }, (_, i) => [
		{
			type: "up",
			dur: UP,
			sound: "squeeze",
			ex: id,
			rep: i + 1
		},
		...ex.last && i === ex.reps - 1 ? [{
			type: "hold",
			dur: ex.last,
			sound: "prep",
			ex: id
		}] : [],
		{
			type: "down",
			dur: UP,
			sound: "release",
			ex: id,
			rep: i + 1
		}
	]).flat();
	return [{
		type: "hold",
		dur: holdFor(id, week),
		sound: "squeeze",
		ex: id
	}, ...ex.pe ? [{
		type: "down",
		dur: PE,
		sound: "release",
		ex: id,
		pe: true
	}] : []];
}
function buildFace(kind, week, { tongue = false } = {}) {
	const steps = [{
		type: "prep",
		dur: PREP,
		sound: "prep"
	}];
	SESSIONS[kind](tongue).forEach((id, k) => {
		const ex = FACE[id];
		if (k) steps.push({
			type: "breathe",
			dur: BREATHE,
			sound: "exhale",
			next: id
		});
		if (ex.timed) return steps.push({
			type: "timed",
			dur: ex.timed,
			sound: "prep",
			ex: id
		});
		for (let set = 1; set <= ex.sets; set++) {
			if (set > 1) steps.push({
				type: "pause",
				dur: PAUSE,
				sound: ex.reps ? "setEnd" : "release",
				ex: id
			});
			steps.push(...setSteps(id, ex, week).map((s) => ({
				...s,
				set,
				sets: ex.sets
			})));
		}
	});
	return timeline(steps);
}
var minutes = (steps) => Math.round(duration(steps) / 60);
var faceWeek = ({ face }, now) => face.start === null ? 1 : calendarWeek(face.start, now);
var yogaWeek = ({ face }, now) => face.yogaFrom === null || dayNumber(now) < dayNumber(face.yogaFrom) ? 0 : calendarWeek(face.yogaFrom, now);
var yogaKind = (week, learned) => week === 1 || !learned ? "yoga15" : "yoga30";
function yogaDay(week, now) {
	if (week === 0) return false;
	return week <= 8 || [
		0,
		1,
		3,
		5
	].includes((/* @__PURE__ */ new Date(now - 144e5)).getDay());
}
var startFace = (state, at) => state.face.start !== null ? state : {
	...state,
	face: {
		...state.face,
		start: at,
		yogaFrom: shiftDays(at, YOGA_DELAY)
	}
};
function afterFacePause(state, now) {
	const { face, faceSessions } = state;
	if (yogaWeek(state, now) === 0) return state;
	const last = faceSessions.findLast((s) => YOGA_KINDS.includes(s.kind))?.at ?? -Infinity;
	if (dayNumber(now) - dayNumber(Math.max(last, face.yogaFrom)) < YOGA_PAUSE) return state;
	return {
		...state,
		face: {
			...face,
			yogaFrom: shiftDays(now, 0)
		}
	};
}
function repeatFaceWeek(state, now) {
	const { face } = state;
	if (face.start === null) return state;
	const back = (from) => shiftDays(now, -(calendarWeek(from, now) - 1) * 7);
	const start = back(face.start);
	const yogaFrom = yogaWeek(state, now) ? back(face.yogaFrom) : shiftDays(start, YOGA_DELAY);
	return {
		...state,
		face: {
			...face,
			start,
			yogaFrom
		}
	};
}
//#endregion
//#region src/signals.js
var LEAD = .05;
var tone = (from, to, dur, delay = 0, wave = "sine", vol = .3) => ({
	from,
	to,
	dur,
	delay,
	wave,
	vol
});
var TONES = {
	prep: [tone(660, 660, .12)],
	squeeze: [tone(440, 700, .3)],
	release: [tone(700, 400, .4)],
	inhale: [tone(300, 360, .5, 0, "triangle", .15)],
	exhale: [tone(360, 280, .6, 0, "triangle", .15)],
	setEnd: [tone(880, 880, .12), tone(880, 880, .12, .2)],
	end: [
		tone(523, 523, .2),
		tone(659, 659, .2, .25),
		tone(784, 784, .5, .5)
	]
};
function createPlayer(Context = globalThis.AudioContext) {
	if (!Context) return null;
	const ctx = new Context();
	let out = null;
	function beep(dest, at, { from, to, dur, wave, vol }) {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = wave;
		osc.frequency.setValueAtTime(from, at);
		osc.frequency.exponentialRampToValueAtTime(to, at + dur);
		gain.gain.setValueAtTime(vol, at);
		gain.gain.exponentialRampToValueAtTime(.001, at + dur);
		osc.connect(gain).connect(dest);
		osc.start(at);
		osc.stop(at + dur);
	}
	const sound = (dest, name, at) => TONES[name].forEach((t) => beep(dest, at + t.delay, t));
	function group() {
		const g = ctx.createGain();
		g.connect(ctx.destination);
		return g;
	}
	return {
		ctx,
		resume: () => ctx.resume(),
		play(steps, from) {
			out = group();
			const t0 = ctx.currentTime + LEAD;
			const s0 = steps[from]?.start ?? duration(steps);
			steps.slice(from).forEach((s) => sound(out, s.sound, t0 + s.start - s0));
			sound(out, "end", t0 + duration(steps) - s0);
		},
		cancel() {
			out?.disconnect();
			out = null;
		},
		cue(name, after = 0) {
			sound(group(), name, ctx.currentTime + LEAD + after);
		},
		test() {
			this.cue("squeeze");
			this.cue("release", .6);
			this.cue("end", 1.4);
		},
		close: () => ctx.close()
	};
}
var BUZZ = {
	prep: 50,
	squeeze: 200,
	release: 60,
	setEnd: [
		100,
		100,
		100
	],
	end: [
		300,
		150,
		300
	]
};
function vibrate(sound) {
	const pattern = BUZZ[sound];
	if (pattern !== void 0) navigator.vibrate?.(pattern);
}
async function keepAwake() {
	try {
		return await navigator.wakeLock?.request("screen") ?? null;
	} catch (error) {
		console.warn("La pantalla podría apagarse: no se obtuvo el Wake Lock.", error);
		return null;
	}
}
//#endregion
//#region src/html.js
var esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
var capital = (s) => s[0].toUpperCase() + s.slice(1);
var check = (name, value, label, checked = false) => `<label class="check"><input type="checkbox" name="${name}" value="${value}"${checked ? " checked" : ""}><span>${label}</span></label>`;
var box = (kind, html) => `<div class="${kind}">${html}</div>`;
var emergencyBox = () => box("alert", `<p><strong>Emergencia:</strong> para, siéntate y llama al número de emergencias; no manejes tú mismo.</p>
  <ul>${EMERGENCY.map((e) => `<li>${e}</li>`).join("")}</ul>`);
var clock = (seconds) => {
	const s = Math.max(0, Math.round(seconds));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
//#endregion
//#region src/walk.js
var SAFETY = "Usa la llave de seguridad, súbete y bájate con la banda detenida, y detenla para voltear, agacharte o tomar algo. Brazos libres: si necesitas apoyo, sólo la punta de dos dedos.";
var WHERE$1 = {
	warm: "Calentamiento: caminata suave",
	moderate: "Bloque moderado",
	light: "Caminata ligera",
	test: "Encuentra tu velocidad moderada"
};
var HINT = {
	warm: "Camina suave para calentar.",
	moderate: "Debes poder hablar, pero no cantar. Durante el bloque conviene leer, hablar o dictar.",
	light: "Aquí sí puedes escribir y usar el mouse. Termina cuando quieras.",
	test: "Cada minuto sube 0.2 km/h. Toca \"Aquí\" cuando hablar cueste un poco y ya no puedas cantar."
};
var LEVEL = {
	moderate: "intensidad moderada.",
	near: "casi moderada; la prueba del habla decide.",
	light: "ligera. Si puedes hablar sin esfuerzo, sube un poco la velocidad."
};
var URGENT = "Busca atención médica urgente ahora: una urgencia detiene todos los módulos. Cuando te revisen, vuelve a contestar el cuestionario inicial.";
var PENDING = "En la revisión semanal marcaste una señal del cuestionario inicial. Contéstalo para saber con qué urgencia ir al médico; mientras, la caminadora queda en pausa.";
var SPEED = {
	min: 2.5,
	max: 8
};
var kmh = (v) => v.toFixed(1);
function walkScreens(app) {
	const state = () => app.state();
	const $ = (sel) => app.root.querySelector(sel);
	let countEnds = null;
	let unfinished = null;
	function item(now) {
		const s = state();
		if (!walkDay(now)) return "<li><span>Caminata libre</span><strong>opcional</strong></li>";
		const { moderate } = currentStage(s, now);
		const done = todayWalk(s.walks, now).moderate;
		const status = exerciseMode(s) !== "normal" ? "en pausa" : done >= moderate ? "✓ hecha" : done > 0 ? `${done} de ${moderate} min` : `${5 + moderate} min`;
		return `<li class="${status === "✓ hecha" ? "done" : ""}"><span>Caminadora: 5 min suave y ${moderate} min moderado</span><strong>${status}</strong></li>`;
	}
	function card(now) {
		const s = state();
		const m = exerciseMode(s);
		const stage = currentStage(s, now);
		const week = currentWeek(s, now);
		const [low, high] = totalTarget(week);
		const title = `<h2>Caminadora · Etapa ${stage.id}, semana ${week}</h2>`;
		if (m === "screen") return `<section class="card">${title}<p>Antes de caminar, contesta el cuestionario de ejercicio.</p>
        <button class="primary" data-do="rescreenExercise">Contestar el cuestionario</button></section>`;
		if (m === "urgent") return `<section class="card">${title}${box("alert", `<p>${s.screening?.urgency === "urgent" ? URGENT : PENDING}</p>`)}
        <button data-do="rescreen">Volver a contestar el cuestionario</button></section>`;
		if (m === "stop") return `<section class="card">${title}${box("alert", `<p>${EXERCISE_STOP}</p>`)}
        <button data-do="rescreenExercise">Volver a contestar el cuestionario de ejercicio</button></section>`;
		if (s.treadmill.speed === null) return `<section class="card">${title}<p>Primero encuentra tu velocidad moderada: empiezas a 3 km/h y subes 0.2 cada minuto.</p>
        <p class="small">${SAFETY}</p>
        <button class="primary" data-do="speedTest">Encontrar mi velocidad</button></section>`;
		const today = todayWalk(s.walks, now);
		return `<section class="card">${title}${walkDay(now) ? `<p>Hoy: 5 min suave y ${stage.moderate} min moderado a ${kmh(s.treadmill.speed)} km/h. Caminata total del día: de ${low} a ${high} min, en ratos; llevas ${today.total} min.</p>
        <button class="primary" data-do="walkStart">Empezar caminata</button>` : "<p>Sábado y domingo: caminata libre.</p>"}
      <button data-do="walkLight">Caminata ligera</button>
      <p class="small">${SAFETY}</p></section>`;
	}
	const weekLine = (now) => {
		const s = state();
		return `<p>Caminadora: ${weekModerate(s.walks, now)} de ${currentStage(s, now).moderate * 5} min moderados</p>`;
	};
	function progress(now) {
		const s = state();
		if (s.treadmill.start === null) return "";
		const stage = currentStage(s, now);
		const week = currentWeek(s, now);
		const [low, high] = totalTarget(week);
		const buttons = exerciseMode(s) !== "normal" ? "" : `<button data-do="repeatStage">Repetir esta etapa</button>
      <button data-do="speedTest">Volver a medir la velocidad</button>`;
		return `<section class="card"><h2>Caminadora · Etapa ${stage.id}</h2>
      <p>Semana ${week}. Bloque moderado de ${stage.moderate} min; caminata total del día de ${low} a ${high} min.</p>
      <p>Moderado esta semana: ${weekModerate(s.walks, now)} de ${stage.moderate * 5} min. Velocidad moderada: ${kmh(s.treadmill.speed)} km/h.</p>
      ${buttons}</section>`;
	}
	function start(kind) {
		const s = state();
		const now = Date.now();
		if (exerciseMode(s) !== "normal" || kind !== "test" && s.treadmill.speed === null) return app.go("home");
		const stage = currentStage(s, now);
		const steps = kind === "test" ? speedTest() : buildWalk(stage, {
			lightOnly: kind === "light",
			warm: kind !== "block"
		});
		const today = todayWalk(s.walks, now);
		const target = {
			test: kind === "test",
			end: duration(steps),
			guided: steps.at(-1).start,
			pending: kind === "light" && today.moderate < stage.moderate,
			before: today.total * 60,
			goal: walkDay(now) ? totalTarget(currentWeek(s, now)) : null
		};
		countEnds = null;
		app.go("walk");
		app.runSession({
			kind,
			steps,
			onEnd: (current) => {
				unfinished = current;
				if (kind !== "test") save(current, {
					upTo: current.steps.at(-1).start,
					quiet: true
				});
				app.go(kind === "test" ? "testEnded" : "walkEnded");
			},
			onHide: (current) => kind !== "test" && save(current, { quiet: true }),
			...screen(target)
		});
	}
	const shownSpeed = (step) => {
		if (step.type === "test") return step.speed;
		const speed = state().treadmill.speed;
		return step.type === "moderate" ? speed : warmSpeed(speed);
	};
	function screen(target) {
		return {
			onStep({ step }) {
				$(".session").dataset.type = step.type;
				$(".where").textContent = WHERE$1[step.type];
				$(".kmh").textContent = kmh(shownSpeed(step));
				$(".hint").textContent = HINT[step.type];
				$(".speedset").hidden = step.type !== "moderate";
				$("[data-do=\"countSteps\"]").hidden = step.type !== "moderate";
				$("[data-do=\"found\"]").hidden = step.type !== "test";
			},
			onTick({ step, left }) {
				$(".count").textContent = step.type === "light" ? `llevas ${clock(step.dur - left)}` : clock(left);
				showTotal(target, step.start + step.dur - left);
				if (countEnds !== null) countTick();
			}
		};
	}
	function showTotal({ test, end, guided, pending, before, goal }, t) {
		const bar = $(".session progress");
		const line = $(".total");
		if (test) {
			bar.max = end;
			bar.value = t;
			line.textContent = `Como máximo faltan ${clock(end - t)}`;
			return;
		}
		const sec = before + t;
		bar.hidden = !goal;
		if (!goal) {
			line.textContent = `Hoy llevas ${Math.floor(sec / 60)} min`;
			return;
		}
		const [low, high] = goal;
		const dayLeft = low * 60 - sec;
		const blockLeft = guided - t;
		bar.max = high * 60;
		bar.value = sec;
		const total = `Total de hoy: de ${low} a ${high} min · `;
		line.textContent = blockLeft > 0 && blockLeft > dayLeft ? `${total}el bloque termina en ${clock(blockLeft)}` : dayLeft > 0 ? `${total}faltan ${clock(dayLeft)}` : pending ? `${total}falta el bloque moderado` : sec < high * 60 ? `${total}ya puedes terminar` : `Ya caminaste los ${high} min de hoy`;
	}
	function countTick() {
		const left = Math.ceil((countEnds - Date.now()) / 1e3);
		if (left > 0) {
			$(".stepcount").innerHTML = `<p>Cuenta tus pasos: ${left} s</p>`;
			return;
		}
		countEnds = null;
		$(".stepcount").innerHTML = `<label class="field">¿Cuántos pasos contaste?
      <input type="number" name="stepCount" inputmode="numeric" min="0" max="150"></label>
      <button data-do="stepsCounted">Listo</button>`;
	}
	function save(current, { upTo = Infinity, quiet = false } = {}) {
		const s = state();
		const { moderate, light } = walked(current.steps, Math.min(current.runner.elapsed(), upTo));
		if (moderate + light < 1) return;
		const { at } = current;
		const walk = {
			at,
			day: dayKey(at),
			moderate,
			light,
			speed: s.treadmill.speed,
			stage: currentStage(s, at).id
		};
		if (!quiet) app.say(`Caminata guardada: ${moderate} min moderados y ${round1(moderate + light)} min en total.`);
		app.persist({
			...s,
			startedAt: s.startedAt ?? at,
			treadmill: {
				...s.treadmill,
				start: s.treadmill.start ?? at
			},
			walks: [...s.walks.filter((w) => w.at !== at), walk]
		});
	}
	function stopHere(next) {
		const current = app.session();
		if (!current) return;
		app.stopSession();
		if (current.kind !== "test") save(current);
		app.go(next);
	}
	function saveSpeed(speed) {
		const s = state();
		app.stopSession();
		app.say(`Tu velocidad moderada: ${kmh(speed)} km/h. Ajústala con la prueba del habla.`);
		app.commit({
			...s,
			treadmill: {
				...s.treadmill,
				speed
			}
		}, "home");
	}
	function adjust(delta) {
		const s = state();
		const speed = Math.min(SPEED.max, Math.max(SPEED.min, round1(s.treadmill.speed + delta)));
		app.persist({
			...s,
			treadmill: {
				...s.treadmill,
				speed
			}
		});
		$(".kmh").textContent = kmh(speed);
	}
	const raiseAlert = () => {
		const s = state();
		app.persist({
			...s,
			exerciseAlerts: [...s.exerciseAlerts, Date.now()]
		});
	};
	return {
		item,
		card,
		weekLine,
		progress,
		views: {
			exercise: () => `<h1>Antes de caminar</h1>
      <p>Cuestionario de ejercicio, basado en el de la ACSM. Marca lo que tengas o te hayan diagnosticado.</p>
      ${EXERCISE.map((i) => check("exercise", i.id, i.text, state().exercise?.ids.includes(i.id))).join("")}
      <button class="primary" data-do="exercised">Listo</button>
      ${state().exercise ? "<button data-do=\"home\">Volver</button>" : ""}`,
			exercised: () => {
				const { ok } = state().exercise;
				return `<h1>Resultado</h1>
        ${ok ? box("note", "<p>Puedes empezar. Sin señales no hace falta permiso médico para caminar a intensidad ligera o moderada.</p>") : box("alert", "<p>Ve al médico antes de empezar la caminadora y la pesa rusa, aunque no tengas síntomas. Mientras tanto sigue el piso pélvico.</p>")}
        ${ok ? "<p>Si no llevas 3 meses con al menos 30 minutos de actividad moderada 3 días por semana, empieza ligero y sube poco a poco: por eso la caminadora empieza con 10 minutos. Este plan no busca intensidad vigorosa.</p>" : ""}
        <button class="primary" data-do="next">Continuar</button>`;
			},
			walk: () => `<div class="session walk" data-type="warm">
        <div class="light"></div>
        <p class="where"></p>
        <p class="speed"><span class="kmh"></span> km/h</p>
        <div class="row speedset" hidden>
          <button data-do="slower" aria-label="Bajar 0.1 km/h">−0.1</button>
          <button data-do="faster" aria-label="Subir 0.1 km/h">+0.1</button>
        </div>
        <p class="count"></p>
        <progress aria-labelledby="walk-total"></progress>
        <p class="total" id="walk-total"></p>
        <p class="hint"></p>
        <div class="stepcount"></div>
        <button data-do="countSteps" hidden>Contar pasos (30 s)</button>
        <button class="primary" data-do="found" hidden>Aquí: puedo hablar, pero no cantar</button>
        <div class="actions">
          <button data-do="walkHurt">Me duele</button>
          <button data-do="unwell">Me siento mal</button>
          <button data-do="finishWalk">Terminar</button>
        </div>
      </div>`,
			walkEnded: () => `<h1>La caminata ligera llegó a 2 horas</h1>
      <p>¿Seguiste caminando todo ese tiempo?</p>
      <button class="primary" data-do="keepAll">Sí, guardar las 2 horas</button>
      <button data-do="home">No, guardar sólo el calentamiento y el bloque</button>`,
			testEnded: () => `<h1>Llegaste a 6.4 km/h sin tocar "Aquí"</h1>
      <p>Más rápido ya es trotar. ¿Todavía podías hablar y cantar sin esfuerzo?</p>
      <button class="primary" data-do="useTop">Sí, usar 6.4 km/h</button>
      <button data-do="speedTest">Repetir la prueba</button>
      <button data-do="home">Volver a Hoy</button>`,
			walkHurt: () => `<h1>¿Dónde duele?</h1>
      <button data-do="hurtWhere" data-where="chest">En el pecho</button>
      <button data-do="hurtWhere" data-where="upper">En la mandíbula, el cuello, un brazo o la espalda alta</button>
      <button data-do="hurtWhere" data-where="legs">En los pies o las rodillas</button>
      <button data-do="hurtWhere" data-where="other">En otro lugar</button>`,
			emergency: () => `<h1>Detente</h1>
      ${emergencyBox()}
      ${box("alert", `<p>Si se quita al descansar, es una señal del cuestionario de ejercicio. ${EXERCISE_STOP}</p>`)}
      <button class="primary" data-do="home">Volver a Hoy</button>`,
			unwell: () => `<h1>Detente y siéntate</h1>
      ${emergencyBox()}
      <p>Si no es una emergencia pero tuviste mareo, palpitaciones, falta de aire fuera de lo normal o dolor de pantorrilla, es una señal del cuestionario de ejercicio.</p>
      <button class="primary" data-do="exerciseSignal">Tuve una de esas señales</button>
      <button data-do="home">Ya estoy bien</button>`
		},
		actions: {
			walkStart: () => start("walk"),
			walkLight: () => start("light"),
			walkBlock: () => start("block"),
			speedTest: () => start("test"),
			faster: () => adjust(.1),
			slower: () => adjust(-.1),
			countSteps: () => {
				if (countEnds !== null) return;
				const audio = app.session()?.audio;
				countEnds = Date.now() + 3e4;
				audio?.cue("prep");
				audio?.cue("setEnd", 30);
				countTick();
			},
			stepsCounted: () => {
				const n = $("input[name=\"stepCount\"]").valueAsNumber;
				const c = cadence(n);
				$(".stepcount").innerHTML = Number.isInteger(n) && n >= 0 && n <= 150 ? `<p>${c.perMin} pasos por minuto: ${LEVEL[c.level]}</p>` : "<p>Escribe un número de 0 a 150.</p><button data-do=\"countSteps\">Contar otra vez</button>";
			},
			found: () => {
				const current = app.session();
				if (current) saveSpeed(stepAt(current.steps, current.runner.elapsed()).step.speed);
			},
			useTop: () => saveSpeed(6.4),
			keepAll: () => {
				if (unfinished) save(unfinished);
				unfinished = null;
				app.go("home");
			},
			finishWalk: () => stopHere("home"),
			walkHurt: () => stopHere("walkHurt"),
			unwell: () => stopHere("unwell"),
			hurtWhere: (el) => {
				const where = el.dataset.where;
				if (where === "chest" || where === "upper") {
					raiseAlert();
					return app.go("emergency");
				}
				if (where === "legs" && state().treadmill.start !== null) {
					app.say("Te quedas una semana más en esta etapa. Descansa; si el dolor sigue, consulta.");
					return app.commit(holdStage(state(), Date.now()), "home");
				}
				app.say("Descansa. Si se repite o no se quita, consulta.");
				app.go("home");
			},
			exerciseSignal: () => {
				raiseAlert();
				app.go("home");
			},
			exercised: () => {
				const ids = [...app.root.querySelectorAll("input[name=\"exercise\"]:checked")].map((i) => i.value);
				app.commit({
					...state(),
					exercise: {
						ok: ids.length === 0,
						ids,
						at: Date.now()
					}
				}, "exercised");
			},
			rescreenExercise: () => app.go("exercise"),
			repeatStage: () => {
				app.say("Empiezas de nuevo esta etapa de la caminadora.");
				app.commit(repeatStage(state(), Date.now()), "home");
			}
		}
	};
}
//#endregion
//#region src/lift.js
var WHERE = {
	warm: "Calentamiento: caminadora suave",
	practice: "Práctica sin peso",
	rest: "Descanso",
	ready: "Descanso"
};
var PICS = /* @__PURE__ */ new Set([
	"hinge",
	"squat",
	"deadlift",
	"goblet",
	"row",
	"floorPress",
	"carry",
	"lunge",
	"swing",
	"getup",
	"figureEight"
]);
var LABEL$2 = Object.fromEntries(RATINGS$1);
var CONSULT$1 = "Consulta antes de empezar la pesa rusa. Mientras tanto puedes caminar.";
var UNLOCK = "Cuando te den el visto bueno, vuelve a contestar las preguntas sin marcar esa señal.";
var NOTHING = "No terminaste ninguna serie: la pesa rusa no se guardó.";
var the = (id) => `${EXERCISES[id].art} ${EXERCISES[id].name.toLowerCase()}`;
var AFTER = `<p>Dolor muscular de 1 a 3 días es normal al empezar.</p>
  ${box("alert", "<p>Orina oscura (rojiza o café) en los días siguientes, aunque el dolor sea leve, sobre todo con debilidad o dificultad para caminar: ve a urgencias.</p>")}
  <p class="small">Un bulto nuevo en la ingle o el abdomen: deja la pesa rusa, márcalo en Ajustes (preguntas de la pesa rusa) y consulta. Si duele, hay náusea o vómito, o el abdomen se hincha, ve el mismo día.</p>`;
function liftScreens(app) {
	const state = () => app.state();
	const $ = (sel) => app.root.querySelector(sel);
	let current = null;
	const opts = (s, now, swing = false) => ({
		restart: s.kettlebell.restart,
		today: dayKey(now),
		walkUp: walkStepsUp(s, now),
		swing
	});
	const todayLift = (s, now) => s.lifts.find((l) => l.day === dayKey(now));
	const doneToday = (s, now) => Boolean(todayLift(s, now));
	const lastItem = (lifts, id) => lifts.findLast((l) => l.items.some((i) => i.id === id))?.items.find((i) => i.id === id);
	function leftover(s, rec) {
		const swing = rec.items.some((i) => i.id === "swing");
		const plan = liftPlan(s.lifts.filter((l) => l !== rec), {
			...opts(s, rec.at, swing),
			session: {
				week: rec.week,
				n: rec.n
			}
		});
		const total = rounds(plan);
		const done = Object.fromEntries(rec.items.map((i) => [i.id, i.sets]));
		const hurt = rec.items.filter((i) => i.hurt).map((i) => i.id);
		return {
			plan,
			total,
			done,
			hurt,
			items: plan.items.filter((i) => !hurt.includes(i.id)).map((i) => ({
				...i,
				sets: (i.sets ?? total) - (done[i.id] ?? 0)
			})).filter((i) => i.sets > 0)
		};
	}
	function dose(i, plan) {
		const ex = EXERCISES[i.id];
		if (i.secs) return `${plan.light ? `${i.sets} × ` : ""}${i.secs} s por lado${plan.light ? "" : " en cada vuelta"}`;
		return `${i.sets} × ${i.reps}${i.sides ? " por lado" : ""}${i.variant ? `, ${ex.variant}` : ""}${i.rest < 60 ? `, descanso de ${i.rest} s` : ""}`;
	}
	function item(now) {
		const s = state();
		if (!walkDay(now)) return "";
		const rec = todayLift(s, now);
		const plan = liftPlan(s.lifts, opts(s, now));
		const name = rec ? SESSIONS$1[rec.n - 1].name : plan.name;
		const done = rec && !leftover(s, rec).items.length;
		const status = liftMode(s) !== "normal" ? "en pausa" : done ? "✓ hecha" : rec ? "sin terminar" : `${minutes$1(buildLift(plan))} min`;
		return `<li class="${done ? "done" : ""}"><span>Pesa rusa: ${name}, con 5 min de caminadora suave</span><strong>${status}</strong></li>`;
	}
	function change(id) {
		const { alt, fixed } = EXERCISES[id];
		return alt === null ? "se omite" : alt ? `se cambió por ${the(alt)}` : fixed ? "" : "bajó un escalón";
	}
	function pains(all, last) {
		return Object.entries(all).filter(([id, e]) => e.hurt >= 2 && last?.items.some((i) => i.id === id && i.hurt)).map(([id]) => box("warn", `<p>${EXERCISES[id].name}: te dolió las dos últimas veces que lo hiciste${change(id) ? ` y ${change(id)}` : ""}. Si sigue una semana más, consulta.</p>`)).join("");
	}
	function card(now) {
		const s = state();
		if (!walkDay(now)) return "";
		const m = liftMode(s);
		const today = dayKey(now);
		const plan = liftPlan(s.lifts, opts(s, now));
		const title = `<h2>Pesa rusa · Semana ${plan.week}, sesión ${plan.n} de 5</h2>`;
		if (m === "consult") return `<section class="card">${title}${box("warn", `<p>${CONSULT$1} ${UNLOCK}</p>`)}
        <button data-do="liftCheck">Volver a contestar las preguntas</button></section>`;
		if (m !== "normal") return `<section class="card">${title}<p>En pausa, igual que la caminadora.</p></section>`;
		const all = ladderState(s.lifts, today);
		const last = s.lifts.at(-1);
		const rec = todayLift(s, now);
		if (rec) {
			const more = leftover(s, rec).items.length;
			return `<section class="card">${title}${pains(all, last)}
        ${more ? "<p>La sesión de hoy quedó sin terminar.</p><button class=\"primary\" data-do=\"liftContinue\">Seguir la sesión de hoy</button>" : `<p>Hecha hoy. La siguiente: ${plan.name}.</p>`}</section>`;
		}
		const before = last ? ladderState(s.lifts, last.day) : {};
		const paused = Object.entries(all).some(([id, e]) => e.step < before[id].step);
		const list = plan.items.map((i) => {
			const prev = lastItem(s.lifts, i.id);
			const before = prev?.rating ? ` · la vez pasada: ${LABEL$2[prev.rating].toLowerCase()}` : "";
			return `<li>${EXERCISES[i.id].name}: ${dose(i, plan)} · esfuerzo ${i.learning ? "2 a 4" : "5 a 7"}${before}</li>`;
		}).join("");
		const start = swingDue(s.lifts, opts(s, now)) ? `<p>Esta sesión puede entrar el swing con dos manos en lugar del peso muerto, sólo si tu peso muerto ya sale constante, con la espalda neutra.</p>
        <button class="primary" data-do="liftStart" data-swing="1">Empezar con swing</button>
        <button data-do="liftStart">Todavía con peso muerto</button>` : "<button class=\"primary\" data-do=\"liftStart\">Empezar pesa rusa</button>";
		return `<section class="card">${title}
      <p><strong>${plan.name}</strong> · unos ${minutes$1(buildLift(plan))} min, con 5 min de caminadora suave al empezar.</p>
      ${plan.held ? `<p class="small">Se repite la semana ${plan.week}: la caminadora sube de etapa esta semana y no conviene subir las dos a la vez.</p>` : ""}
      ${paused ? box("note", "<p>Después de 7 días o más sin pesa rusa, cada ejercicio bajó un escalón.</p>") : ""}
      ${pains(all, last)}
      <ul>${list}</ul>
      <p class="small">Esfuerzo sobre 10. Con 5 a 7, termina cada serie con 2 o 3 repeticiones de reserva. Exhala al hacer el esfuerzo y no aguantes el aire; entre series, el piso pélvico va suelto.</p>
      ${s.lifts.length ? "" : "<p class=\"small\">La pesa: la que te deja hacer 10 press en el piso con cada brazo y todavía te quedan 3. Para un hombre que empieza suele ser de 8 a 12 kg.</p>"}
      ${start}</section>`;
	}
	const weekLine = (now) => {
		const s = state();
		const { week, n } = liftPlan(s.lifts, opts(s, now));
		return `<p>Pesa rusa: semana ${week}, ${n - 1} de 5 sesiones</p>`;
	};
	function progress(now) {
		const s = state();
		if (!s.lifts.length) return "";
		const all = ladderState(s.lifts, dayKey(now));
		const { week } = liftPlan(s.lifts, opts(s, now));
		return `<section class="card"><h2>Pesa rusa · Semana ${week}</h2><ul>${Object.entries(all).filter(([id, e]) => !EXERCISES[id].fixed && !e.swapped).map(([id, e]) => {
			const p = prescription(id, e.step);
			const prev = lastItem(s.lifts, id);
			const what = p.secs ? `${p.secs} s por lado` : `${p.sets} × ${p.reps}`;
			return `<li>${EXERCISES[id].name}: escalón ${e.step} (${what})${prev?.rating ? ` · la vez pasada: ${LABEL$2[prev.rating].toLowerCase()}` : ""}</li>`;
		}).join("")}</ul>
      ${liftMode(s) === "normal" ? `<button data-do="liftRepeat">Repetir la semana ${s.lifts.at(-1).week}</button>` : ""}</section>`;
	}
	function start(swing) {
		const s = state();
		const now = Date.now();
		if (liftMode(s) !== "normal" || !walkDay(now) || doneToday(s, now)) return app.go("home");
		const plan = liftPlan(s.lifts, opts(s, now, swing));
		current = {
			at: now,
			plan,
			rounds: rounds(plan),
			done: {},
			warm: 0,
			hurt: [],
			ex: null,
			steps: null,
			index: 0
		};
		runSteps(buildLift(plan));
	}
	function resume() {
		const s = state();
		const rec = todayLift(s, Date.now());
		if (!rec || liftMode(s) !== "normal") return app.go("home");
		const { plan, total, done, hurt, items } = leftover(s, rec);
		const warm = (s.walks.find((w) => w.at === rec.at)?.light ?? 0) * 60;
		current = {
			at: rec.at,
			plan,
			rounds: total,
			done,
			warm,
			hurt,
			ex: null,
			steps: null,
			index: 0
		};
		runSteps(buildLift({
			...plan,
			items
		}, { resume: true }));
	}
	function runSteps(steps) {
		app.go("lift");
		app.runSession({
			kind: "lift",
			steps,
			onEnd: (session) => {
				current = tally(session);
				finish();
			},
			onHide: (session) => save(tally(session)),
			...screen(steps)
		});
	}
	function tally(session) {
		const elapsed = session.runner.elapsed();
		const now = setsDone(session.steps, elapsed);
		const done = Object.fromEntries([.../* @__PURE__ */ new Set([...Object.keys(current.done), ...Object.keys(now)])].map((id) => [id, (current.done[id] ?? 0) + (now[id] ?? 0)]));
		const warm = session.steps[0].type === "warm" ? Math.min(elapsed, session.steps[0].dur) : current.warm;
		return {
			...current,
			done,
			warm
		};
	}
	function save({ at, plan, done, hurt, warm }, ratings = {}) {
		const s = state();
		const items = plan.items.filter((i) => done[i.id] || hurt.includes(i.id)).map((i) => ({
			id: i.id,
			step: i.step,
			sets: done[i.id] ?? 0,
			rating: ratings[i.id] ?? null,
			hurt: hurt.includes(i.id)
		}));
		const walk = warm >= 60 ? [{
			at,
			day: dayKey(at),
			moderate: 0,
			light: round1(warm / 60),
			speed: s.treadmill.speed,
			stage: currentStage(s, at).id
		}] : [];
		if (!items.length && !walk.length) return;
		const record = {
			at,
			day: dayKey(at),
			week: plan.week,
			n: plan.n,
			items
		};
		app.persist({
			...s,
			startedAt: s.startedAt ?? at,
			kettlebell: items.length ? { restart: null } : s.kettlebell,
			lifts: items.length ? [...s.lifts.filter((l) => l.at !== at), record] : s.lifts,
			walks: [...s.walks.filter((w) => w.at !== at), ...walk]
		});
	}
	const rateable = () => current.plan.light ? [] : current.plan.items.filter((i) => !current.hurt.includes(i.id) && (current.done[i.id] ?? 0) >= (i.reps ? i.sets : current.rounds));
	function finish(note = NOTHING) {
		save(current);
		const saved = state().lifts.some((l) => l.at === current.at);
		if (!saved) app.say(note);
		app.go(!saved ? "home" : rateable().length ? "liftRate" : "liftDone");
	}
	function pause() {
		const session = app.session();
		if (!session) return;
		const { index, step } = stepAt(session.steps, session.runner.elapsed());
		const suspects = step?.ex ? [step.ex] : [...new Set([step?.prev, step?.next].filter(Boolean))];
		current = {
			...tally(session),
			steps: session.steps,
			index,
			suspects
		};
		app.stopSession();
		save(current);
	}
	function screen(steps) {
		const s = state();
		const plan = current.plan;
		const total = Math.max(...steps.map((st) => st.round ?? 1));
		$(".pic").onerror = (e) => {
			e.target.hidden = true;
		};
		return {
			onStep({ step }) {
				const ex = EXERCISES[step.ex];
				$(".session").dataset.type = step.type;
				$(".where").textContent = ex ? ex.name : WHERE[step.type];
				const shown = step.ex ?? step.next;
				const pic = $(".pic");
				pic.hidden = !PICS.has(shown);
				if (!pic.hidden) {
					pic.src = `/keggelatto/lift/${shown}.webp`;
					pic.alt = `Dibujo: ${EXERCISES[shown].name}`;
				}
				$(".left").textContent = step.type === "side" ? "Cambia de lado" : ex ? `${[
					"",
					"Primer lado · ",
					"Segundo lado · "
				][step.side]}Vuelta ${step.round} de ${total}${step.reps ? " · repeticiones" : ""}` : step.next ? `Sigue: ${EXERCISES[step.next].name}` : "";
				const item = plan.items.find((i) => i.id === step.ex);
				$(".hint").textContent = step.type === "warm" ? `${s.treadmill.speed ? `A ${warmSpeed(s.treadmill.speed).toFixed(1)} km/h. ` : ""}Después, práctica sin peso.` : step.type === "practice" ? "De 2 a 3 minutos: bisagra de cadera y sentadilla, sin peso. Toca \"Listo\" al terminar." : step.talk ? "Sigue cuando ya puedas hablar con frases completas." : step.type === "rest" ? "Entre series, el piso pélvico va suelto." : step.type === "ready" ? "Prepárate." : ex ? `${ex.cue}${item?.variant ? ` Variante: ${ex.variant}.` : ""}` : "";
				$("[data-do=\"liftNext\"]").hidden = !step.until;
			},
			onTick({ step, left }) {
				$(".count").textContent = step.type === "set" ? String(step.reps) : step.until ? `llevas ${clock(step.dur - left)}` : clock(left + (step.type === "rest" ? 3 : 0));
			}
		};
	}
	return {
		item,
		card,
		weekLine,
		progress,
		views: {
			liftCheck: () => `<h1>Antes de la pesa rusa</h1>
      <p>Marca lo que tengas. Si marcas algo, consulta antes de empezar la pesa rusa; mientras tanto puedes caminar.</p>
      ${LIFT_CHECK.map((i) => check("lift", i.id, i.text, state().liftCheck?.ids.includes(i.id))).join("")}
      <button class="primary" data-do="liftChecked">Listo</button>
      ${state().liftCheck ? "<button data-do=\"home\">Volver</button>" : ""}`,
			lift: () => `<div class="session lift" data-type="warm">
        <div class="light"></div>
        <p class="where"></p>
        <img class="pic" alt="" hidden>
        <p class="count"></p>
        <p class="left"></p>
        <p class="hint"></p>
        <button class="primary" data-do="liftNext" hidden>Listo</button>
        <div class="actions">
          <button data-do="liftHurt">Me duele</button>
          <button data-do="liftUnwell">Me siento mal</button>
          <button data-do="liftStop">Terminar</button>
        </div>
      </div>`,
			liftRate: () => `<h1>¿Cómo te fue?</h1>
      <p>La sesión ya quedó guardada. Califica cada ejercicio: dos sesiones seguidas con "fácil" o "bien" suben un escalón.</p>
      ${rateable().map((i) => `<fieldset class="scale rate"><legend>${EXERCISES[i.id].name}</legend>
        ${RATINGS$1.map(([id, label]) => `<label><input type="radio" name="rate-${i.id}" value="${id}"> ${label}</label>`).join("")}</fieldset>`).join("")}
      <button class="primary" data-do="liftRated">Guardar</button>`,
			liftDone: () => {
				const s = state();
				const now = Date.now();
				const stage = currentStage(s, now);
				const block = exerciseMode(s) === "normal" && s.treadmill.speed !== null && walkDay(now) && todayWalk(s.walks, now).moderate < stage.moderate;
				return `<h1>Pesa rusa guardada</h1>
        ${block ? `<p>Lo ideal es hacer el bloque moderado 3 horas o más después; si no se puede, va justo ahora.</p>
          <button class="primary" data-do="walkBlock">Seguir con el bloque moderado</button>` : ""}
        ${AFTER}
        <button class="${block ? "" : "primary"}" data-do="home">Volver a Hoy</button>`;
			},
			liftHurtWhere: () => `<h1>¿Dónde duele?</h1>
      <button data-do="hurtWhere" data-where="chest">En el pecho</button>
      <button data-do="hurtWhere" data-where="upper">Opresión en la mandíbula, el cuello, un brazo o la espalda alta</button>
      <button data-do="liftJoint">Punzante, o en una articulación</button>
      <button data-do="liftResume" data-keep="1">Es ardor o cansancio del músculo: seguir</button>`,
			liftWhich: () => `<h1>¿Con qué ejercicio?</h1>
      ${current.suspects.map((id) => `<button data-do="liftJoint" data-ex="${id}">${EXERCISES[id].name}</button>`).join("")}`,
			liftJointed: () => {
				const { alt, fixed } = EXERCISES[current.ex];
				const prior = state().lifts.filter((l) => l.at !== current.at);
				const next = alt === null ? "se omite" : alt ? `cambia por ${the(alt)}` : fixed ? "" : "baja un escalón";
				const more = current.steps.slice(current.index).some((st) => (st.type === "set" || st.type === "timed") && st.ex !== current.ex);
				return `<h1>Terminamos ${the(current.ex)}</h1>
        <p>${lastItem(prior, current.ex)?.hurt ? `Te dolió las dos últimas veces que lo hiciste${next ? `: la próxima vez ${next}` : ""}. Si sigue una semana más, consulta.` : "Si vuelve a doler la próxima vez que lo hagas, baja un escalón o cambia a su alternativa."}</p>
        ${more ? "<button class=\"primary\" data-do=\"liftResume\">Seguir con la sesión</button>" : ""}
        <button data-do="liftStop">Terminar aquí</button>`;
			}
		},
		actions: {
			liftStart: (el) => start(Boolean(el.dataset.swing)),
			liftNext: () => {
				const session = app.session();
				if (!session) return;
				const { step, left } = stepAt(session.steps, session.runner.elapsed());
				if (step?.until && step.dur - left >= 1) session.runner.next();
			},
			liftStop: () => {
				pause();
				finish();
			},
			liftUnwell: () => {
				pause();
				app.go("unwell");
			},
			liftHurt: () => {
				pause();
				app.go("liftHurtWhere");
			},
			liftJoint: (el) => {
				const { suspects } = current;
				if (!suspects.length) return finish("Descansa. Si se repite o no se quita, consulta.");
				const ex = el.dataset.ex ?? (suspects.length === 1 ? suspects[0] : null);
				if (!ex) return app.go("liftWhich");
				current = {
					...current,
					ex,
					hurt: [...current.hurt, ex]
				};
				save(current);
				app.go("liftJointed");
			},
			liftResume: (el) => {
				const { steps, index, ex } = current;
				const rest = steps.slice(index);
				runSteps(timeline(el.dataset.keep ? rest : rest.filter((st) => st.ex !== ex && st.next !== ex)));
			},
			liftContinue: resume,
			liftRated: () => {
				const ratings = Object.fromEntries(rateable().map((i) => [i.id, app.root.querySelector(`input[name="rate-${i.id}"]:checked`)?.value]).filter(([, r]) => r));
				save(current, ratings);
				app.go("liftDone");
			},
			liftCheck: () => app.go("liftCheck"),
			liftChecked: () => {
				const ids = [...app.root.querySelectorAll("input[name=\"lift\"]:checked")].map((i) => i.value);
				if (ids.length) app.say(CONSULT$1);
				app.onward({ liftCheck: {
					ok: ids.length === 0,
					ids,
					at: Date.now()
				} });
			},
			liftRepeat: () => {
				const s = state();
				app.say(`Empiezas de nuevo la semana ${s.lifts.at(-1).week} de la pesa rusa.`);
				app.commit({
					...s,
					kettlebell: { restart: s.lifts.at(-1).week }
				}, "home");
			}
		}
	};
}
//#endregion
//#region src/face-screens.js
var DAY$1 = 864e5;
var PHOTO_EVERY = 30;
var CONSULT = "Consulta antes de empezar la cara y cuello. Cuando te den el visto bueno, vuelve a contestar las preguntas sin marcar esa señal.";
var NECK = "Deja los ejercicios de cuello y consulta. Si empezó de repente, o viene con la cara caída o dificultad para hablar, es una emergencia: llama al número de emergencias. Cuando te revisen, vuelve a contestar las preguntas de cara y cuello.";
var TITLE = {
	posture: "Postura y cuello",
	tongue: "Lengua contra el paladar",
	yoga15: "Yoga facial",
	yoga30: "Yoga facial"
};
var LABEL$1 = {
	prep: "Prepárate",
	up: "Sube",
	down: "Baja",
	hold: "Sostén",
	pause: "Suelta y descansa",
	breathe: "Respira normal",
	timed: ""
};
var FACE_EXPECT = [
	"La postura y el cuello mejoran la postura de la cabeza y activan más los músculos bajo la barbilla.",
	"El yoga facial podría llenar un poco las mejillas, pero la evidencia es débil y casi no incluye hombres.",
	"Ningún ejercicio ha demostrado reducir la papada: la grasa de esa zona baja con la pérdida de grasa general, y la piel floja no responde al ejercicio."
];
var EXPECT = `<details><summary>Qué esperar</summary><ul>${FACE_EXPECT.map((e) => `<li>${e}</li>`).join("")}</ul></details>`;
function faceScreens(app) {
	const state = () => app.state();
	const $ = (sel) => app.root.querySelector(sel);
	const did = (s, now, kinds) => s.faceSessions.some((x) => x.day === dayKey(now) && x.full && kinds.includes(x.kind));
	const dose = (id, week) => `${FACE[id].name.toLowerCase()} ${FACE[id].sets}\u00a0×\u00a0${holdFor(id, week)}\u00a0s`;
	const learned = (s) => s.faceSessions.some((x) => YOGA_KINDS.includes(x.kind));
	function item(now) {
		const s = state();
		const week = faceWeek(s, now);
		const yw = yogaWeek(s, now);
		const paused = faceMode(s) !== "normal";
		const li = (label, kinds, steps, stop = paused) => {
			const done = did(s, now, kinds);
			return `<li class="${done ? "done" : ""}"><span>${label}</span><strong>${stop ? "en pausa" : done ? "✓ hecha" : `${minutes(steps)} min`}</strong></li>`;
		};
		const neck = paused || neckStopped(s);
		return (walkDay(now) ? li("Cara y cuello: postura y cuello", ["posture"], buildFace("posture", week, { tongue: s.prefs.tongue }), neck) : s.prefs.tongue ? li("Cara y cuello: lengua contra el paladar", ["tongue"], buildFace("tongue", week), neck) : "") + (yogaDay(yw, now) ? li("Yoga facial", YOGA_KINDS, buildFace(yogaKind(yw, learned(s)), week)) : "");
	}
	function postureCard(s, now, week) {
		if (neckStopped(s)) return box("alert", `<p>${NECK}</p>`);
		if (walkDay(now)) {
			if (did(s, now, ["posture"])) return "<p>Postura y cuello: hecha hoy.</p>";
			return `<p>Postura y cuello: ${postureIds(s.prefs.tongue).map((id) => dose(id, week)).join(", ")}.</p>
        <button class="primary" data-do="faceStart" data-kind="posture">Empezar postura y cuello</button>`;
		}
		if (!s.prefs.tongue) return "";
		return did(s, now, ["tongue"]) ? "<p>Lengua contra el paladar: hecha hoy.</p>" : `<p>Sábado y domingo, sólo la lengua contra el paladar: ${dose("tongue", week)}.</p>
        <button data-do="faceStart" data-kind="tongue">Empezar lengua contra el paladar</button>`;
	}
	function yogaCard(s, now, week) {
		const yw = yogaWeek(s, now);
		if (!yw) return `<p>El yoga facial empieza en la semana 3${s.face.start === null ? ", dos semanas después de tu primera sesión" : ""}.</p>`;
		if (!yogaDay(yw, now)) return "<p>Hoy no toca yoga facial: desde su semana 9 va lunes, miércoles, viernes y domingo.</p>";
		if (did(s, now, YOGA_KINDS)) return "<p>Yoga facial: hecho hoy.</p>";
		const kind = yogaKind(yw, learned(s));
		return `<p>Yoga facial · semana ${yw}: ${kind === "yoga15" ? "la sesión corta, para aprender los ejercicios" : "la sesión completa"}, ${minutes(buildFace(kind, week))} min.</p>
      <button class="primary" data-do="faceStart" data-kind="yoga">Empezar yoga facial</button>`;
	}
	function card(now) {
		const s = state();
		const m = faceMode(s);
		const week = faceWeek(s, now);
		const section = (html) => `<section class="card"><h2>Cara y cuello · Semana ${week}</h2>${html}</section>`;
		if (m === "urgent") return section(`<p>En pausa ${s.screening?.urgency === "urgent" ? "por la urgencia del cuestionario inicial" : "mientras falta volver a contestar el cuestionario inicial por una señal de la revisión semanal"}.</p><button data-do="rescreen">Volver a contestar el cuestionario</button>`);
		if (m === "paused") return section(`${box("warn", `<p>${JAW_ADVICE}</p>`)}<button data-do="faceCleared">Ya se me quitó</button>`);
		if (m !== "normal") return section(`${m === "consult" ? box("warn", `<p>${CONSULT}</p>`) : ""}<button data-do="faceCheck">Volver a contestar las preguntas de cara y cuello</button>`);
		return section(`${s.face.photoAt === null || now - s.face.photoAt >= PHOTO_EVERY * DAY$1 ? box("note", `<p>Foto del mes: de frente y de perfil, con la misma luz, distancia y ángulo. La app no guarda fotos.</p>
        <button data-do="facePhoto">Ya la tomé</button>`) : ""}${postureCard(s, now, week)}${yogaCard(s, now, week)}
      <p class="small">Lávate las manos antes. Presión de los dedos firme, sin dolor. Entre ejercicios, dientes separados y mandíbula suelta. No aprietes los dientes ni gires o truenes el cuello.</p>
      ${EXPECT}`);
	}
	const weekLine = (now) => {
		const s = state();
		const days = weekDays(now);
		const count = (kinds) => s.faceSessions.filter((x) => x.full && days.includes(x.day) && kinds.includes(x.kind)).length;
		const yw = yogaWeek(s, now);
		return `<p>Cara y cuello: postura ${count(["posture"])} de 5${yw ? `, yoga facial ${count(YOGA_KINDS)}` : ""}</p>`;
	};
	function progress(now) {
		const s = state();
		if (s.face.start === null) return "";
		const week = faceWeek(s, now);
		const yw = yogaWeek(s, now);
		const ago = Math.floor((now - s.face.photoAt) / DAY$1);
		const photo = s.face.photoAt === null ? "todavía no la tomas" : ago < 1 ? "hoy" : `la última, hace ${ago} ${ago === 1 ? "día" : "días"}`;
		return `<section class="card"><h2>Cara y cuello · Semana ${week}</h2>
      <p>Barbilla hacia atrás: 10 × ${holdFor("chinTuck", week)} s.</p>
      <p>${yw ? `Yoga facial: semana ${yw}, ${yw <= 8 ? "todos los días" : "lunes, miércoles, viernes y domingo"}.` : "El yoga facial empieza en la semana 3."}</p>
      <p>Foto del mes: ${photo}.</p>
      ${faceMode(s) === "normal" ? "<button data-do=\"faceRepeat\">Repetir esta semana de cara y cuello</button>" : ""}</section>`;
	}
	function start(asked) {
		const s = state();
		const now = Date.now();
		const yw = yogaWeek(s, now);
		const kind = asked === "yoga" ? yogaKind(yw, learned(s)) : asked;
		if (faceMode(s) !== "normal" || (asked === "yoga" ? !yogaDay(yw, now) : neckStopped(s))) return app.go("home");
		const steps = buildFace(kind, faceWeek(s, now), { tongue: s.prefs.tongue });
		app.go("face");
		app.runSession({
			kind,
			steps,
			onEnd: (current) => {
				save(current, true);
				app.say("Sesión guardada.");
				app.go("home");
			},
			onHide: (current) => save(current, false),
			...screen(kind)
		});
	}
	function save({ at, kind, steps, runner }, full) {
		const s = state();
		const seconds = full ? duration(steps) : runner.elapsed();
		if (!full && seconds < 60) return;
		const record = {
			at,
			day: dayKey(at),
			kind,
			minutes: round1(seconds / 60),
			full
		};
		const next = YOGA_KINDS.includes(kind) ? s : startFace(s, at);
		app.persist({
			...next,
			startedAt: s.startedAt ?? at,
			faceSessions: [...s.faceSessions.filter((x) => x.at !== at), record]
		});
	}
	function stopHere(next) {
		const current = app.session();
		if (current) {
			app.stopSession();
			save(current, false);
		}
		app.go(next);
	}
	function screen(kind) {
		const yoga = YOGA_KINDS.includes(kind);
		return {
			onStep({ step }) {
				const ex = FACE[step.ex];
				const el = $(".session");
				el.dataset.type = step.type;
				el.style.setProperty("--t", `${step.type === "up" || step.type === "down" ? step.dur : .5}s`);
				$(".where").textContent = step.type === "breathe" ? `Sigue: ${FACE[step.next].name}` : !ex ? TITLE[kind] : step.sets > 1 ? `${ex.name} · ${ex.reps ? "serie " : ""}${step.set} de ${step.sets}` : ex.name;
				$(".label").textContent = step.pe ? "Exhala: \"PE\"" : LABEL$1[step.type];
				$(".left").textContent = step.rep ? `Repetición ${step.rep} de ${ex.reps}` : "";
				$(".hint").textContent = ex ? ex.how : step.type === "breathe" ? `${yoga ? "Vuelve a la media sonrisa, con" : "Con"} los dientes separados y la mandíbula suelta.` : yoga ? "Lávate las manos antes. Presión firme, sin dolor." : "Siéntate derecho, con los hombros sueltos.";
			},
			onTick({ left }) {
				$(".count").textContent = Math.ceil(left);
			}
		};
	}
	return {
		item,
		card,
		weekLine,
		progress,
		views: {
			faceCheck: () => `<h1>Antes de cara y cuello</h1>
      <p>Marca lo que tengas. Si marcas algo, consulta antes de empezar; el resto del plan sigue.</p>
      ${FACE_CHECK.map((i) => check("face", i.id, i.text, state().faceCheck?.ids.includes(i.id))).join("")}
      <button class="primary" data-do="faceChecked">Listo</button>
      ${state().faceCheck ? "<button data-do=\"home\">Volver</button>" : ""}`,
			face: () => `<div class="session face" data-type="prep">
        <div class="light"></div>
        <p class="where"></p>
        <p class="label"></p>
        <p class="count"></p>
        <p class="left"></p>
        <p class="hint"></p>
        <div class="actions">
          <button data-do="faceHurt">Me duele</button>
          <button data-do="faceStop">Detener</button>
        </div>
      </div>`,
			faceHurt: () => `<h1>Paramos la sesión</h1>
      ${emergencyBox()}
      <p>Si no es una emergencia, ¿qué pasó?</p>
      <button data-do="facePain">Dolor de mandíbula, chasquido con dolor o bloqueo; dolor de cara, cuello o cabeza; o mareo</button>
      <button data-do="faceNeck">Hormigueo, adormecimiento, debilidad o frío en un brazo o una mano</button>
      <button data-do="home">Otra cosa: volver a Hoy</button>
      <p class="small">Un chasquido sin dolor es común y no cuenta.</p>`
		},
		actions: {
			faceStart: (el) => start(el.dataset.kind),
			faceStop: () => stopHere("home"),
			faceHurt: () => stopHere("faceHurt"),
			facePain: () => {
				const s = state();
				app.commit({
					...s,
					facePains: [...s.facePains, Date.now()]
				}, "home");
			},
			faceNeck: () => {
				const s = state();
				app.commit({
					...s,
					face: {
						...s.face,
						neckStop: Date.now()
					}
				}, "home");
			},
			faceCleared: () => {
				const s = state();
				app.commit({
					...s,
					face: {
						...s.face,
						clearedAt: Date.now()
					}
				}, "home");
			},
			facePhoto: () => {
				const s = state();
				app.commit({
					...s,
					face: {
						...s.face,
						photoAt: Date.now()
					}
				}, "home");
			},
			faceRepeat: () => {
				const s = state();
				app.say(`Empiezas de nuevo la semana ${faceWeek(s, Date.now())} de cara y cuello.`);
				app.commit(repeatFaceWeek(s, Date.now()), "home");
			},
			faceCheck: () => app.go("faceCheck"),
			faceChecked: () => {
				const ids = [...app.root.querySelectorAll("input[name=\"face\"]:checked")].map((i) => i.value);
				if (ids.length) app.say(CONSULT);
				app.onward({ faceCheck: {
					ok: ids.length === 0,
					ids,
					at: Date.now()
				} });
			}
		}
	};
}
//#endregion
//#region src/app.js
var DAY = 864e5;
var CUES = [
	"Mete el pene hacia adentro y sube los testículos, como si cortaras la orina, pero sólo imaginándolo.",
	"Acorta el pene.",
	"Sube los testículos.",
	"Aprieta como si aguantaras un gas."
];
var SHORT_POSITION = {
	acostado: "Acostado",
	sentado: "Sentado",
	pie: "De pie"
};
var RATINGS = [
	"fácil",
	"bien",
	"difícil",
	"no pude terminar"
];
var CHECKLIST = [
	["release", "En cada repetición sentí que los músculos soltaban por completo"],
	["mirror", "La señal del espejo se ve en todas las posiciones de la fase"],
	["nopain", "No hubo dolor"]
];
var LABEL = {
	prep: "Prepárate",
	hold: "Aprieta y sube",
	rest: "Suelta",
	quick: "Rápida: aprieta",
	quickRest: "Suelta",
	inhale: "Inhala",
	exhale: "Exhala"
};
var FADE = {
	prep: .5,
	hold: .4,
	rest: .8,
	quick: .25,
	quickRest: .6
};
var BREATH_BLOCKS = [
	"pause",
	"close",
	"relax"
];
var pauses = (s, now) => afterFacePause(afterWalkPause(afterPause(s, now), now), now);
function mount(root, { storage, player = createPlayer }) {
	let flash = "";
	let state = reload();
	let data = {};
	let session = null;
	const app = {
		root,
		state: () => state,
		session: () => session,
		persist,
		commit,
		go,
		onward,
		say: (text) => {
			flash = text;
		},
		runSession,
		stopSession
	};
	const walk = walkScreens(app);
	const lift = liftScreens(app);
	const face = faceScreens(app);
	let view = firstView();
	function firstView() {
		if (!state.screening) return "screening";
		if (!state.exercise) return "exercise";
		if (!state.liftCheck) return "liftCheck";
		if (!state.faceCheck) return "faceCheck";
		if (!state.learned) return "learn";
		if (!state.expectSeen) return "expect";
		if (!state.alarmsSet) return "alarms";
		return "home";
	}
	function write(next) {
		try {
			save(next, storage);
		} catch (error) {
			console.error("No se pudo guardar el registro", error);
			flash = "No se pudo guardar en el celular. Exporta un respaldo desde Ajustes.";
		}
	}
	function persist(next) {
		state = next;
		write(next);
	}
	function reload() {
		const { damaged, ...loaded } = load(storage);
		if (damaged) flash = "El registro guardado estaba dañado: se guardó una copia aparte y se empezó de cero.";
		const next = pauses(loaded, Date.now());
		if (next !== loaded) write(next);
		return next;
	}
	function go(next, extra = {}) {
		view = next;
		data = extra;
		root.innerHTML = (flash ? `<p class="note" role="status">${esc(flash)}</p>` : "") + VIEWS[view]();
		flash = "";
	}
	function commit(next, nextView) {
		persist(next);
		go(nextView);
	}
	function onward(change) {
		persist({
			...state,
			...change
		});
		go(firstView());
	}
	const picked = (name) => [...root.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
	function where(step) {
		if (step.block === "prep") return step.position ? POSITIONS[step.position] : "Relajación";
		if (step.block === "pause") return `Respira y cambia de posición: ${POSITIONS[step.position]}`;
		if (step.block === "close") return "Cierre: respiración lenta";
		if (step.block === "relax") return "Relajación";
		return `Serie ${step.set} de ${step.sets} · ${POSITIONS[step.position]}`;
	}
	function remaining(step) {
		if (step.block === "hold") return `Sostenidas: quedan ${step.left}`;
		if (step.block === "quick") return `Rápidas: quedan ${step.left}`;
		return BREATH_BLOCKS.includes(step.block) ? `Respiraciones: quedan ${step.left}` : "";
	}
	function hint(step, phase) {
		if (step.type === "hold") return `${CUES[state.prefs.cue]} ${phase.strong ? "Fuerte, sin aguantar el aire ni apretar los glúteos." : "Firme pero cómoda."}`;
		if (step.type === "rest" || step.type === "quickRest") return "Deja que baje y se suelte por completo.";
		if (step.type === "inhale") return "Al inhalar, deja que el piso pélvico baje y se suelte.";
		if (step.type !== "prep") return "";
		return step.position ? "Sigue respirando durante toda la sesión." : "Al inhalar, deja que el piso pélvico baje y se suelte.";
	}
	function sessionScreen(phase) {
		const $ = (sel) => root.querySelector(sel);
		const el = $(".session");
		return {
			onStep({ step }) {
				el.dataset.type = step.type;
				el.style.setProperty("--t", `${FADE[step.type] ?? step.dur}s`);
				$(".where").textContent = where(step);
				$(".label").textContent = LABEL[step.type];
				$(".left").textContent = remaining(step);
				$(".hint").textContent = hint(step, phase);
				$("[data-do=\"cut\"]").hidden = !["hold", "quick"].includes(step.block);
			},
			onTick({ left }) {
				$(".count").textContent = Math.ceil(left);
			}
		};
	}
	function runSession({ kind, steps, discreet = false, onStep, onTick, onEnd, onHide }) {
		const audio = discreet ? null : player();
		audio?.resume();
		const current = {
			kind,
			steps,
			audio,
			lock: null,
			at: Date.now(),
			onHide
		};
		session = current;
		current.runner = run(steps, {
			audio,
			discreet,
			vibrate: state.prefs.vibrate ? vibrate : void 0,
			onStep,
			onTick,
			onEnd: () => {
				stopSession({ ended: true });
				onEnd(current);
			}
		});
		awake(current);
		return current;
	}
	function start(kind) {
		const phase = phaseById(state.phase.id);
		const position = kind === "short" ? root.querySelector("select[name=\"position\"]").value : void 0;
		const steps = kind === "relax" ? buildRelax() : buildSession(phase.id, {
			position,
			longClose: state.prefs.longClose
		});
		go("session");
		runSession({
			kind,
			steps,
			discreet: state.prefs.discreet,
			onEnd: ended,
			...sessionScreen(phase)
		});
	}
	async function awake(current) {
		const lock = await keepAwake();
		if (session === current) current.lock = lock;
		else lock?.release();
	}
	function stopSession({ ended = false } = {}) {
		if (!session) return;
		const { runner, audio, lock } = session;
		session = null;
		lock?.release();
		if (ended) return void setTimeout(() => audio?.close(), 3e3);
		runner.stop();
		audio?.close();
	}
	function ended({ kind, at }) {
		const phase = phaseById(state.phase.id);
		const record = {
			at,
			day: dayKey(at),
			slot: slot(at),
			kind,
			phase: phase.id,
			hold: phase.hold,
			rating: null
		};
		const since = kind === "relax" ? state.phase.since : state.phase.since ?? at;
		if (kind === "relax") flash = "Relajación guardada.";
		commit({
			...state,
			startedAt: state.startedAt ?? at,
			phase: {
				...state.phase,
				since
			},
			sessions: [...state.sessions, record]
		}, kind === "relax" ? "home" : "rate");
	}
	function onVisibility() {
		if (!session) {
			if (document.hidden) return;
			state = reload();
			if (view === "home") go("home");
			return;
		}
		const current = session;
		current.runner.visibility(document.hidden);
		if (document.hidden) current.onHide?.(current);
		else if (session === current) awake(current);
	}
	document.addEventListener("visibilitychange", onVisibility);
	function modeBox(m) {
		const s = state.screening;
		const last = state.reviews.at(-1);
		const rescreen = "<button data-do=\"rescreen\">Volver a contestar el cuestionario</button>";
		if (m === "stop") return box("alert", `<p>${esc(stopReview(state)?.advice.join(" ") ?? SCREEN_RESULT[s.urgency])}</p>${rescreen}`);
		if (m !== "relax") return "";
		return box("warn", `<p><strong>Modo sólo relajación.</strong> ${esc([
			s.result === "B" && SCREEN_RESULT.B,
			s.result === "A" && `${SCREEN_RESULT.normal} Mientras llega la consulta, sólo relajación.`,
			last?.mode === "relax" && last.advice.join(" "),
			state.pains.some((t) => t > (last?.at ?? -Infinity)) && "Tocaste \"Me duele\": hasta la siguiente revisión semanal, sólo relajación."
		].filter(Boolean).join(" "))}</p>
      <p>Consulta a una fisioterapeuta de piso pélvico${s.result === "A" ? " y al médico" : ""}.</p>${s.result === "C" ? "" : rescreen}`);
	}
	function banners(now) {
		const next = phaseById(state.phase.id + 1);
		const first = programStart(state);
		return [
			canAdvance(state, now) && box("note", `<p>Puedes pasar a la fase ${next.id}: ${next.name}.</p>
        <button class="primary" data-do="advance">Revisar</button>`),
			checkDue(state, now) && box("note", `<p>Chequeo mensual: haz 5 contracciones de 10 s de pie. ¿Pudiste sostenerlas todas?</p>
        <div class="row"><button data-do="check" data-ok="1">Sí</button><button data-do="check">No</button></div>`),
			first !== null && !state.week12Seen && now - first >= 84 * DAY && box("note", `<p>Semana 12: repasa la técnica y los síntomas. Las fuentes piden al menos 3 meses antes de juzgar los resultados.</p>
        <div class="row"><button data-do="technique">Repasar la técnica</button><button data-do="week12">Entendido</button></div>`)
		].filter(Boolean).join("");
	}
	function startButtons(m, phase) {
		if (m === "stop" || m === "screen") return "";
		if (m === "relax") return "<button class=\"primary\" data-do=\"start\" data-kind=\"relax\">Empezar relajación</button>";
		return `<button class="primary" data-do="start" data-kind="full">Empezar sesión</button>${phase.positions.length < 2 ? "" : `<div class="row"><select name="position" aria-label="Posición de la sesión corta">
      ${phase.positions.map((p) => `<option value="${p}">${SHORT_POSITION[p]}</option>`).join("")}</select>
      <button data-do="start" data-kind="short">Sesión corta</button></div>`}`;
	}
	const alarmFields = () => state.alarms.map((a, i) => {
		const when = i ? "la noche" : "la mañana";
		return `<label class="field">Hora de ${when} <input type="time" data-alarm="${i}" name="time" value="${esc(a.time)}"></label>
      <label class="field">Rutina de ${when} <input type="text" data-alarm="${i}" name="routine" maxlength="60" value="${esc(a.routine)}" placeholder="después de…"></label>`;
	}).join("");
	const VIEWS = {
		screening: () => `<h1>Antes de empezar</h1>
      <p>Marca lo que tengas ahora. La app habla de posibles señales, nunca de diagnósticos.</p>
      ${LEVELS.map(({ level, title }) => `<h2>${title}</h2>
        ${SCREENING.filter((i) => i.level === level).map((i) => check("screen", i.id, i.text, state.screening?.ids?.includes(i.id))).join("")}`).join("")}
      <button class="primary" data-do="screened">Listo</button>
      ${state.screening ? "<button data-do=\"home\">Volver</button>" : ""}`,
		screened: () => {
			const s = state.screening;
			const kind = {
				A: "alert",
				B: "warn",
				C: "note"
			}[s.result];
			return `<h1>Resultado</h1>${box(kind, `<p>${SCREEN_RESULT[s.result === "A" ? s.urgency : s.result]}</p>`)}
        ${s.result === "A" ? `<p>Cuando el médico te revise, vuelve a contestar el cuestionario desde Ajustes.${s.relaxOffered ? " Mientras llega la consulta por el dolor, puedes usar el modo de sólo relajación." : ""}</p>` : ""}
        ${s.result === "C" ? "<p>Recomendación: una revisión con una fisioterapeuta de piso pélvico al empezar, para confirmar la técnica. La app no puede comprobar si la contracción es la correcta.</p>" : ""}
        <button class="primary" data-do="next">Continuar</button>`;
		},
		learn: () => `<h1>Aprende la contracción</h1>
      <p>Elige la frase que te dé la señal más clara frente al espejo:</p>
      ${CUES.map((c, i) => `<label class="check"><input type="radio" name="cue" value="${i}"${state.prefs.cue === i ? " checked" : ""}><span>${c}</span></label>`).join("")}
      <h2>Compruébalo</h2>
      <p>Frente a un espejo, la base del pene se mete y el escroto sube. También puedes notar con los dedos cómo sube el periné.</p>
      <h2>Cuida la técnica</h2>
      <ul>
        <li>Aprieta y sube; nunca empujes ni pujes.</li>
        <li>Sigue respirando. Contar en voz alta ayuda a no aguantar el aire.</li>
        <li>No aprietes glúteos, muslos ni abdomen. Que la parte baja del vientre se tense un poco es normal.</li>
        <li>Si una contracción se desvanece antes de tiempo, suelta y descansa.</li>
        <li>Nunca practiques cortando el chorro de orina.</li>
      </ul>
      <h2>Soltar</h2>
      <p>Después de cada contracción, deja que el piso pélvico baje y se suelte por completo, sin empujar. Relajar es parte del entrenamiento. Fuera de los ejercicios, el piso pélvico va relajado.</p>
      ${state.learned ? "<button class=\"primary\" data-do=\"home\">Volver</button>" : `
        <p><strong>¿Sentiste que el músculo sube y luego se suelta?</strong></p>
        ${data.tries === 1 ? box("warn", "<p>Repite frente al espejo, con calma.</p>") : ""}
        ${data.tries > 1 ? box("warn", "<p>Si sigue sin sentirse, conviene ir a una fisioterapeuta de piso pélvico.</p>") : ""}
        <button class="primary" data-do="learned">Sí</button>
        <button data-do="notYet">No</button>
        ${data.tries > 1 ? "<button data-do=\"learned\">Continuar de todos modos</button>" : ""}`}`,
		expect: () => `<h1>Qué esperar</h1>
      <ul>
        <li>De 4.5 a 9.5 minutos, dos veces al día.</li>
        <li>Los primeros cambios, más control y conciencia del músculo, suelen notarse en unas semanas. Espera de 3 a 6 meses antes de juzgar.</li>
        <li>El resultado depende de hacerlo.</li>
        <li>Los ejercicios no deben doler. Si algo duele, toca "Me duele".</li>
      </ul>
      <h2>Cara y cuello</h2>
      <ul>${FACE_EXPECT.map((e) => `<li>${e}</li>`).join("")}</ul>
      <button class="primary" data-do="expectSeen">Continuar</button>`,
		alarms: () => `<h1>Tus dos horas</h1>
      <p>La app no manda notificaciones. Elige dos horas ligadas a una rutina y ponlas en la alarma del celular.</p>
      ${alarmFields()}
      <button class="primary" data-do="alarmsSet">Listo</button>`,
		home: () => {
			const now = Date.now();
			const m = mode(state);
			const phase = phaseById(state.phase.id);
			const minutes = Math.round(duration(buildSession(phase.id, { longClose: state.prefs.longClose })) / 30) / 2;
			const today = state.sessions.filter((s) => s.day === dayKey(now));
			const week = weekSummary([
				...state.sessions,
				...state.walks,
				...state.lifts,
				...state.faceSessions
			], now);
			const pelvic = (i) => {
				const turn = i ? "noche" : "mañana";
				const a = state.alarms[i];
				const alarm = a.time ? ` · ${esc(a.time)}${a.routine ? `, ${esc(a.routine)}` : ""}` : "";
				const done = today.some((s) => s.slot === turn);
				return `<li class="${done ? "done" : ""}"><span>Piso pélvico, ${turn}${alarm}</span><strong>${done ? "✓ hecha" : `${minutes} min`}</strong></li>`;
			};
			return `<h1>Hoy</h1>
        ${reviewDue(state, now) ? box("note", `<p>Toca la revisión semanal: un minuto de preguntas de sí o no.</p>
          <button class="primary" data-do="review">Hacer la revisión semanal</button>`) : ""}
        <ol class="today">${pelvic(0)}${lift.item(now)}${walk.item(now)}${face.item(now)}${pelvic(1)}</ol>
        <section class="card">
          <h2>Piso pélvico · Fase ${phase.id}: ${phase.name}</h2>
          ${modeBox(m)}
          ${m === "normal" ? banners(now) : ""}
          ${startButtons(m, phase)}
        </section>
        ${lift.card(now)}
        ${walk.card(now)}
        ${face.card(now)}
        <section class="card">
          <h2>Esta semana</h2>
          <p>Piso pélvico: ${week.full} de 14 sesiones${week.full >= 12 ? " · vas bien" : week.fullDays >= 3 ? " · llevas el mínimo" : ""}</p>
          ${lift.weekLine(now)}
          ${walk.weekLine(now)}
          ${face.weekLine(now)}
          <div class="week">${[..."LMMJVSD"].map((d, i) => `<span class="${week.days[i] ? "done" : ""}${i === week.today ? " today" : ""}">${d}</span>`).join("")}</div>
        </section>
        <nav class="row"><button data-do="progress">Progreso</button><button data-do="technique">Técnica</button><button data-do="settings">Ajustes</button></nav>`;
		},
		session: () => `<div class="session" data-type="prep">
        <div class="light"></div>
        <p class="where"></p>
        <p class="label"></p>
        <p class="count"></p>
        <p class="left"></p>
        <p class="hint"></p>
        <div class="actions">
          <button data-do="hurt">Me duele</button>
          <button data-do="cut">Cortar serie</button>
          <button data-do="stop">Detener</button>
        </div>
      </div>`,
		rate: () => `<h1>¿Cómo te fue?</h1>
      <p>La sesión ya quedó guardada. Tu calificación decide cuándo subes de fase.</p>
      ${RATINGS.map((r) => `<button data-do="rated" data-rating="${r}">${capital(r)}</button>`).join("")}`,
		hurt: () => `<h1>Paramos las contracciones</h1>
      <p>Los ejercicios no deben doler. Hasta la siguiente revisión semanal, la app sólo ofrece relajación.</p>
      <p>Si te duele la espalda baja, el abdomen o la cabeza, probablemente trabajan otros músculos o aguantas el aire: repasa la técnica.</p>
      ${emergencyBox()}
      <button class="primary" data-do="start" data-kind="relax">Hacer relajación ahora</button>
      <button data-do="home">Volver a Hoy</button>`,
		review: () => `<h1>Revisión semanal</h1>
      <p>En los últimos 7 días, ¿tuviste…?</p>
      ${REVIEW.map((q) => check("review", q.id, q.text)).join("")}
      <details><summary>Ver las señales del cuestionario inicial</summary>
        ${LEVELS.filter(({ level }) => level !== "B").map(({ level, title }) => `<h2>${title}</h2>
          <ul>${SCREENING.filter((i) => i.level === level).map((i) => `<li>${i.text}</li>`).join("")}</ul>`).join("")}</details>
      <details><summary>Ver el cuestionario de ejercicio</summary>
        <ul>${EXERCISE.map((i) => `<li>${i.text}</li>`).join("")}</ul></details>
      <fieldset class="scale"><legend>Del 1 al 5, ¿cuánto control o fuerza sientes?</legend>
        ${[
			1,
			2,
			3,
			4,
			5
		].map((n) => `<label><input type="radio" name="control" value="${n}"> ${n}</label>`).join("")}</fieldset>
      ${emergencyBox()}
      <button class="primary" data-do="saveReview">Guardar</button>
      <button data-do="home">Ahora no</button>`,
		reviewed: () => {
			const r = state.reviews.at(-1);
			const joint = jointAdvice(r.yes, state.reviews.at(-2)?.yes);
			return `<h1>Revisión guardada</h1>
        ${r.mode ? box(r.mode === "stop" ? "alert" : "warn", `<ul>${r.advice.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`) : ""}
        ${r.exercise ? box("alert", `<p>${EXERCISE_STOP}</p>`) : ""}
        ${joint ? box("warn", `<p>${joint}</p>`) : ""}
        ${r.yes.includes("jaw") ? box("warn", `<p>${JAW_ADVICE}</p>`) : ""}
        ${r.mode || r.exercise || joint || r.yes.includes("jaw") ? "" : box("note", "<p>Todo en orden: sigue con tu plan.</p>")}
        ${r.yes.includes("a") ? "<button class=\"primary\" data-do=\"rescreen\">Contestar el cuestionario ahora</button>" : ""}
        <button class="${r.yes.includes("a") ? "" : "primary"}" data-do="home">Volver a Hoy</button>`;
		},
		advance: () => {
			const next = phaseById(state.phase.id + 1);
			return `<h1>Pasar a la fase ${next.id}: ${next.name}</h1>
        <p>Cumpliste el tiempo, las sesiones y las calificaciones que pide la fase. Confirma:</p>
        ${CHECKLIST.map(([id, label]) => check("ready", id, label)).join("")}
        <button class="primary" data-do="confirmAdvance">Confirmar</button>
        <button data-do="home">Ahora no</button>`;
		},
		progress: () => {
			const phase = phaseById(state.phase.id);
			const days = state.phase.since === null ? 0 : Math.floor((Date.now() - state.phase.since) / DAY);
			const controls = state.reviews.filter((r) => r.control);
			const sets = phase.positions.length;
			return `<h1>Progreso</h1>
        <section class="card"><h2>Fase ${phase.id}: ${phase.name}</h2>
          <p>Contracción de ${phase.hold} s y descanso de ${phase.rest} s; ${sets} ${sets > 1 ? "series" : "serie"} por sesión; intensidad ${phase.strong ? "fuerte" : "firme pero cómoda"}.</p>
          <p>Llevas ${days} días y ${sessionsInPhase(state).length} de 15 sesiones en esta fase.</p>
          <p>Contracción más larga completada: ${longestHold(state)} s.</p></section>
        <section class="card"><h2>Control o fuerza (1 a 5)</h2>
          ${controls.length ? `<div class="bars">${controls.slice(-12).map((r) => `<span style="height:${Number(r.control) * 20}%" title="${esc(r.control)}"></span>`).join("")}</div>` : "<p>Aparece después de la primera revisión semanal.</p>"}
          <button data-do="repeatPhase">Repetir esta fase</button></section>
        ${lift.progress(Date.now())}
        ${walk.progress(Date.now())}
        ${face.progress(Date.now())}
        <button class="primary" data-do="home">Volver</button>`;
		},
		settings: () => `<h1>Ajustes</h1>
      <label class="check"><input type="checkbox" data-pref="discreet"${state.prefs.discreet ? " checked" : ""}><span>Modo discreto: sólo luz y vibración, sin sonido. La pantalla debe quedarse encendida.</span></label>
      <label class="check"><input type="checkbox" data-pref="vibrate"${state.prefs.vibrate ? " checked" : ""}><span>Vibración</span></label>
      <button data-do="testSound">Probar el sonido</button>
      <label class="check"><input type="checkbox" data-pref="longClose"${state.prefs.longClose ? " checked" : ""}><span>Cierre largo: 5 minutos de respiración al final de cada sesión.</span></label>
      <label class="check"><input type="checkbox" data-pref="tongue"${state.prefs.tongue ? " checked" : ""}><span>Lengua contra el paladar: opcional, todos los días (cara y cuello).</span></label>
      <h2>Alarmas</h2>${alarmFields()}
      <h2>Registro</h2>
      <p>El navegador puede borrar los datos guardados. Exporta un respaldo de vez en cuando.</p>
      <button data-do="exportLog">Exportar registro</button>
      <label class="button">Importar registro<input type="file" accept=".json,application/json" data-import hidden></label>
      <h2>Seguridad</h2>
      <button data-do="rescreen">Volver a contestar el cuestionario</button>
      <button data-do="rescreenExercise">Volver a contestar el cuestionario de ejercicio</button>
      <button data-do="liftCheck">Volver a contestar las preguntas de la pesa rusa</button>
      <button data-do="faceCheck">Volver a contestar las preguntas de cara y cuello</button>
      <button class="primary" data-do="home">Volver</button>`,
		...walk.views,
		...lift.views,
		...face.views
	};
	const ACTIONS = {
		screened: () => {
			const ids = picked("screen");
			commit({
				...state,
				screening: {
					...screen(ids),
					ids,
					at: Date.now()
				}
			}, "screened");
		},
		next: () => go(firstView()),
		learned: () => onward({ learned: true }),
		notYet: () => go("learn", { tries: (data.tries ?? 0) + 1 }),
		expectSeen: () => onward({ expectSeen: true }),
		alarmsSet: () => onward({ alarmsSet: true }),
		home: () => go("home"),
		technique: () => go("learn"),
		progress: () => go("progress"),
		settings: () => go("settings"),
		rescreen: () => go("screening"),
		review: () => go("review"),
		advance: () => go("advance"),
		start: (el) => start(el.dataset.kind),
		cut: () => session?.runner.cut(),
		stop: () => {
			stopSession();
			go("home");
		},
		hurt: () => {
			stopSession();
			commit({
				...state,
				pains: [...state.pains, Date.now()]
			}, "hurt");
		},
		rated: (el) => {
			const last = state.sessions.length - 1;
			flash = "Sesión guardada.";
			commit({
				...state,
				sessions: state.sessions.map((s, i) => i === last ? {
					...s,
					rating: el.dataset.rating
				} : s)
			}, "home");
		},
		saveReview: () => {
			const yes = picked("review");
			const control = Number(picked("control")[0]) || null;
			const result = review(yes, state.reviews.at(-1)?.yes);
			commit({
				...state,
				reviews: [...state.reviews, {
					at: Date.now(),
					yes,
					control,
					...result
				}]
			}, "reviewed");
		},
		confirmAdvance: () => {
			const ok = picked("ready");
			const now = Date.now();
			if (ok.length === CHECKLIST.length) {
				const next = advance(state, now);
				flash = `Ahora estás en la fase ${next.phase.id}: ${phaseById(next.phase.id).name}.`;
				return commit(next, "home");
			}
			flash = `Sigues una semana más en esta fase.${!(ok.includes("release") && ok.includes("mirror")) && suggestPhysio(state, now) ? " Si no sientes que los músculos aprietan o sueltan, conviene ir a una fisioterapeuta de piso pélvico." : ""}`;
			commit(defer(state, now), "home");
		},
		check: (el) => {
			const ok = Boolean(el.dataset.ok);
			if (!ok) flash = "Regresas a la fase 5 para recuperar la fuerza.";
			commit(monthlyCheck(state, ok, Date.now()), "home");
		},
		week12: () => commit({
			...state,
			week12Seen: true
		}, "home"),
		repeatPhase: () => {
			flash = `Empiezas de nuevo la fase ${state.phase.id}.`;
			commit({
				...state,
				phase: {
					...state.phase,
					since: Date.now(),
					deferUntil: null
				}
			}, "home");
		},
		testSound: () => {
			const p = player();
			if (!p) {
				flash = "Este navegador no puede reproducir los sonidos de la app.";
				return go(view);
			}
			p.resume();
			p.test();
			setTimeout(() => p.close(), 3e3);
		},
		exportLog: () => {
			const url = URL.createObjectURL(new Blob([exportJson(state)], { type: "application/json" }));
			Object.assign(document.createElement("a"), {
				href: url,
				download: `keggelatto-${dayKey(Date.now())}.json`
			}).click();
			setTimeout(() => URL.revokeObjectURL(url), 1e3);
		},
		...walk.actions,
		...lift.actions,
		...face.actions
	};
	async function importFile(file) {
		const before = state;
		try {
			const now = Date.now();
			const next = pauses(parse(await file.text()), now);
			flash = "Registro importado.";
			persist(next);
			go(firstView());
		} catch (error) {
			console.error("No se pudo importar el registro", error);
			persist(before);
			flash = /Keggelatto/.test(error.message) ? error.message : "No se pudo leer el archivo.";
			go("settings");
		}
	}
	function onClick(e) {
		const el = e.target.closest("[data-do]");
		if (el) ACTIONS[el.dataset.do](el);
	}
	function onChange({ target: el }) {
		if (el.name === "cue") persist({
			...state,
			prefs: {
				...state.prefs,
				cue: Number(el.value)
			}
		});
		else if (el.dataset.pref) persist({
			...state,
			prefs: {
				...state.prefs,
				[el.dataset.pref]: el.checked
			}
		});
		else if (el.dataset.alarm) {
			const field = el.name === "time" ? "time" : "routine";
			const alarms = state.alarms.map((a, i) => i === Number(el.dataset.alarm) ? {
				...a,
				[field]: el.value.trim().slice(0, 60)
			} : a);
			persist({
				...state,
				alarms
			});
		} else if ("import" in el.dataset && el.files[0]) importFile(el.files[0]);
	}
	root.addEventListener("click", onClick);
	root.addEventListener("change", onChange);
	go(view);
	return () => {
		stopSession();
		document.removeEventListener("visibilitychange", onVisibility);
		root.removeEventListener("click", onClick);
		root.removeEventListener("change", onChange);
	};
}
//#endregion
//#region src/main.js
mount(document.querySelector("#app"), { storage: localStorage });
navigator.storage?.persist?.().catch((error) => console.warn("No se pudo pedir almacenamiento persistente.", error));
if ("serviceWorker" in navigator) navigator.serviceWorker.register(`/keggelatto/sw.js`).catch((error) => console.error("No se pudo registrar el service worker; no habrá modo sin conexión.", error));
//#endregion
