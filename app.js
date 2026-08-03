import { WORDS } from "./words.js";

const STORE_KEY = "frenchophile.v1";
const DAY = 86400000;
// Leitner intervals: box 0 repeats this session, then 1d, 3d, 7d, 16d, 35d.
const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];
const LEARNED_BOX = 3;

const $ = (id) => document.getElementById(id);
const el = {
  category: $("category"),
  settingsToggle: $("settings-toggle"),
  settings: $("settings"),
  autospeak: $("opt-autospeak"),
  reverse: $("opt-reverse"),
  reset: $("reset-progress"),
  stats: $("stats"),
  card: $("card"),
  front: $("card-front"),
  meta: $("card-meta"),
  back: $("card-back"),
  hint: $("card-hint"),
  again: $("btn-again"),
  good: $("btn-good"),
  speak: $("btn-speak"),
  done: $("done"),
  doneMsg: $("done-msg"),
  studyAhead: $("btn-study-ahead"),
  bar: $("progress-bar"),
  note: $("footer-note"),
};

// --- persistence -----------------------------------------------------------

const defaults = { progress: {}, category: "All", autospeak: false, reverse: false };

function load() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch {
    return { ...defaults };
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // private mode / quota: keep running in-memory
  }
}

const state = load();

const cardState = (word) => state.progress[word.fr] || { box: 0, due: 0 };

// --- deck ------------------------------------------------------------------

let queue = [];
let current = null;
let revealed = false;
let studyingAhead = false;

const deck = () =>
  state.category === "All" ? WORDS : WORDS.filter((w) => w.cat === state.category);

const isDue = (w, now) => cardState(w).due <= now;

function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildQueue({ ahead = false } = {}) {
  const now = Date.now();
  studyingAhead = ahead;
  const due = deck().filter((w) => isDue(w, now));
  if (due.length) {
    // Unseen words trail behind reviews so they don't crowd out due material.
    const reviews = shuffle(due.filter((w) => state.progress[w.fr]));
    const fresh = shuffle(due.filter((w) => !state.progress[w.fr]));
    queue = [...reviews, ...fresh];
  } else if (ahead) {
    queue = deck()
      .slice()
      .sort((a, b) => cardState(a).due - cardState(b).due)
      .slice(0, 20);
  } else {
    queue = [];
  }
}

function grade(known) {
  if (!current || !revealed) return;
  const prev = cardState(current);
  const box = known ? Math.min(prev.box + 1, INTERVALS.length - 1) : 0;
  state.progress[current.fr] = {
    box,
    due: Date.now() + INTERVALS[box],
    // Studying ahead shouldn't lose the fact that a card was already learned.
    seen: (prev.seen || 0) + 1,
  };
  save();
  if (!known) {
    // Reinsert a few cards down so it comes back before the session ends.
    queue.splice(Math.min(4, queue.length), 0, current);
  }
  next();
}

function next() {
  current = queue.shift() || null;
  revealed = false;
  render();
  if (current && state.autospeak) speak();
}

// --- rendering -------------------------------------------------------------

function render() {
  const now = Date.now();
  const all = deck();
  const learned = all.filter((w) => cardState(w).box >= LEARNED_BOX).length;
  const dueCount = all.filter((w) => isDue(w, now)).length;

  el.stats.textContent = "";
  el.stats.append(
    stat("due", studyingAhead ? queue.length + (current ? 1 : 0) : dueCount),
    stat("learned", `${learned}/${all.length}`),
  );
  el.bar.style.width = `${all.length ? (learned / all.length) * 100 : 0}%`;

  const hasCard = Boolean(current);
  el.card.hidden = !hasCard;
  el.done.hidden = hasCard;
  el.again.disabled = el.good.disabled = !hasCard || !revealed;
  el.speak.disabled = !hasCard;

  if (!hasCard) {
    const nextDue = all
      .map((w) => cardState(w).due)
      .filter((d) => d > now)
      .sort((a, b) => a - b)[0];
    el.doneMsg.textContent = nextDue
      ? `Nothing due right now. Next review ${formatWhen(nextDue - now)}.`
      : "No cards in this category.";
    el.studyAhead.hidden = !nextDue;
    el.note.textContent = "";
    return;
  }

  const front = state.reverse ? current.nl : current.fr;
  const back = state.reverse ? current.fr : current.nl;
  el.front.textContent = front;
  el.meta.textContent = `${current.pos} · ${current.cat}`;
  el.back.textContent = back;
  el.back.hidden = !revealed;
  el.card.classList.toggle("revealed", revealed);
  el.card.setAttribute("aria-label", revealed ? `${front} — ${back}` : front);
  el.front.lang = state.reverse ? "nl" : "fr";
  el.back.lang = state.reverse ? "fr" : "nl";
  el.note.textContent = studyingAhead ? "studying ahead — schedule still updates" : "";
}

function stat(label, value) {
  const span = document.createElement("span");
  span.append(`${label} `, Object.assign(document.createElement("b"), { textContent: value }));
  return span;
}

function formatWhen(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${Math.max(1, mins)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

// --- speech ----------------------------------------------------------------

let frenchVoice = null;

function pickVoice() {
  const voices = speechSynthesis.getVoices();
  frenchVoice =
    voices.find((v) => v.lang.replace("_", "-").toLowerCase() === "fr-fr") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("fr")) ||
    null;
}

function speak() {
  if (!current || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(current.fr);
  u.lang = "fr-FR";
  u.rate = 0.9;
  if (frenchVoice) u.voice = frenchVoice;
  speechSynthesis.speak(u);
}

if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.addEventListener("voiceschanged", pickVoice);
} else {
  el.speak.hidden = true;
}

// --- wiring ----------------------------------------------------------------

function reveal() {
  if (!current || revealed) return;
  revealed = true;
  render();
}

el.card.addEventListener("click", reveal);
el.again.addEventListener("click", () => grade(false));
el.good.addEventListener("click", () => grade(true));
el.speak.addEventListener("click", (e) => {
  e.stopPropagation();
  speak();
});

el.studyAhead.addEventListener("click", () => {
  buildQueue({ ahead: true });
  next();
});

el.settingsToggle.addEventListener("click", () => {
  const open = el.settings.hidden;
  el.settings.hidden = !open;
  el.settingsToggle.setAttribute("aria-expanded", String(open));
});

el.autospeak.addEventListener("change", () => {
  state.autospeak = el.autospeak.checked;
  save();
});

el.reverse.addEventListener("change", () => {
  state.reverse = el.reverse.checked;
  save();
  render();
});

el.category.addEventListener("change", () => {
  state.category = el.category.value;
  save();
  buildQueue();
  next();
});

el.reset.addEventListener("click", () => {
  if (!confirm("Erase all progress on this device?")) return;
  state.progress = {};
  save();
  buildQueue();
  next();
});

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, select, textarea")) return;
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    reveal();
  } else if (e.key === "ArrowRight") {
    grade(true);
  } else if (e.key === "ArrowLeft") {
    grade(false);
  } else if (e.key.toLowerCase() === "s") {
    speak();
  }
});

// --- init ------------------------------------------------------------------

const categories = ["All", ...new Set(WORDS.map((w) => w.cat))];
if (!categories.includes(state.category)) state.category = "All";
for (const cat of categories) {
  el.category.append(new Option(cat, cat, false, cat === state.category));
}
el.autospeak.checked = state.autospeak;
el.reverse.checked = state.reverse;

buildQueue();
next();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("sw.js", import.meta.url)).catch(() => {});
  });
}
