const $ = (id) => document.getElementById(id);
// ===============================
// Firebase (Feedback Storage)
// ===============================
// Paste your config here from Firebase -> Project settings -> Your apps -> Web app
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCMNPUwMaKYx-2yePgZYbaOoomOgPzvQIE",
  authDomain: "regret-index.firebaseapp.com",
  projectId: "regret-index",
  storageBucket: "regret-index.firebasestorage.app",
  messagingSenderId: "1045622308120",
  appId: "1:1045622308120:web:df0f58cf21fe942a2a726d",
};

let db = null;

try {
  if (window.firebase && FIREBASE_CONFIG.projectId) {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    firebase.auth().signInAnonymously().catch(console.warn);
  }
} catch (e) {
  console.warn("Firebase init failed:", e);
  db = null;
}

// --- Safe "Interstellar-ish" ticking (Web Audio) ---
let audioCtx = null;
let tickOn = false;
let tickTimer = null;
let tickRateMs = 1333; // default tempo

function looksLikeSpamOrVulgar(text){
  const t = (text || "").toLowerCase();

  // Too many links
  const links = (t.match(/https?:\/\/|www\./g) || []).length;
  if (links >= 2) return true;

  // Repeated characters / nonsense
  if (/(.)\1\1\1\1/.test(t)) return true;

  // Common spam keywords
  const spamWords = [
    "crypto", "forex", "airdrop", "telegram", "whatsapp", "onlyfans",
    "free money", "click here", "buy now", "promo", "discount", "casino",
    "loan", "sex", "nudes"
  ];
  if (spamWords.some(w => t.includes(w))) return true;

  // Basic vulgarity list (lightweight; not exhaustive)
  const bad = [
    "fuck", "shit", "bitch", "asshole", "bastard", "cunt",
    "nigger", "faggot", "retard", "whore", "slut"
  ];
  if (bad.some(w => t.includes(w))) return true;

  return false;
}

async function sendFeedback(){
  const msg = $("fbMsg");
  const textRaw = $("fbText")?.value || "";
  const nameRaw = $("fbName")?.value || "";

  const text = safeTrim(textRaw, 800);
  const name = safeTrim(nameRaw, 40);

  if (!text){
    if (msg) msg.textContent = "Type something first 🙂";
    return;
  }

  // Client-side guardrails
  if (looksLikeSpamOrVulgar(text)){
    // “Deleted automatically” UX: we just refuse to submit
    if (msg) msg.textContent = "That message got eaten by the spam black hole 🕳️ Try rewording.";
    $("fbText").value = "";
    return;
  }

  // Needs Firebase db (like your likes/comments setup)
  if (!window.db){
    if (msg) msg.textContent = "Feedback storage isn’t connected (Firebase missing).";
    return;
  }

  if (msg) msg.textContent = "Sending…";

  // Basic anonymous fingerprint (not tracking-heavy)
  const anonId = (localStorage.getItem("anonId") || (() => {
    const id = "u_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
    localStorage.setItem("anonId", id);
    return id;
  })());

  try{
    await db.collection("feedback").add({
      text,
      name: name || null,
      anonId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 120)
    });

    $("fbText").value = "";
    $("fbName").value = "";
    if (msg) msg.textContent = "Sent ✅ If we ship it, you basically co-built this.";
  } catch(e){
    console.warn(e);
    if (msg) msg.textContent = "Failed to send (check Firestore rules).";
  }
}

function safeTrim(text, maxLen){
  const s = (text || "").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function ensureAudio(){
  if (!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playTick(){
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // Two-layer tick: low thump + high click (cinematic, not annoying)
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(tickIntensity, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t);
  osc.stop(t + 0.10);

  // click layer
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = "square";
  osc2.frequency.setValueAtTime(2100, t);
  gain2.gain.setValueAtTime(0.0001, t);
  gain2.gain.exponentialRampToValueAtTime(Math.min(0.055, tickIntensity * 0.35), t + 0.004);
  gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.start(t);
  osc2.stop(t + 0.035);
}

function startTicking(){
  stopTicking();
  tickTimer = setInterval(() => {
    if (!tickOn) return;
    playTick();
  }, tickRateMs);
}

function stopTicking(){
  if (tickTimer){
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

let tickIntensity = 0.10; // volume scaler (0.06–0.18 feels nice)

function setTickIntensityFromDilation(dilationFactor){
  // keep it subtle; clamp
  const f = Math.max(1, Math.min(30, dilationFactor));
  tickIntensity = 0.08 + (Math.sqrt(f) / Math.sqrt(30)) * 0.08; // ~0.08 → ~0.16
}

function lensRippleAt(element){
  const lens = $("lens");
  if (!lens || !element) return;

  const r = element.getBoundingClientRect();
  const x = r.left + r.width * 0.5;
  const y = r.top + r.height * 0.5;

  lens.style.setProperty("--rx", x + "px");
  lens.style.setProperty("--ry", y + "px");

  lens.classList.remove("rippling");
  // reflow to restart animation
  void lens.offsetWidth;
  lens.classList.add("rippling");
}

// Movie ratio: 1 Miller hour = 7 Earth years
const EARTH_YEARS_PER_MILLER_HOUR = 7;
const SECONDS_PER_YEAR = 365.2425 * 24 * 60 * 60;
const EARTH_SECONDS_PER_MILLER_SECOND = (EARTH_YEARS_PER_MILLER_HOUR * SECONDS_PER_YEAR) / (60 * 60);

const TASKS = [
  { name: "Brush teeth", mins: 2, vibe: "2 minutes there… years vanish here." },
  { name: "Shower", mins: 10, vibe: "A quick rinse. Earth just aged." },
  { name: "Make instant noodles", mins: 5, vibe: "Noodles done. Your friends are older." },
  { name: "Power nap", mins: 20, vibe: "Wake up. Earth changed." },
  { name: "Gym session", mins: 60, vibe: "One workout = a whole era." },
  { name: "Watch 1 episode", mins: 45, vibe: "Binge? More like time crime." },
];

function pad2(n){ return String(n).padStart(2,"0"); }

function formatEarthDurationFromSeconds(sec){
  const years = Math.floor(sec / SECONDS_PER_YEAR);
  sec -= years * SECONDS_PER_YEAR;
  const days = Math.floor(sec / (24*3600));
  sec -= days * 24*3600;
  const hours = Math.floor(sec / 3600);
  sec -= hours * 3600;
  const mins = Math.floor(sec / 60);
  const s = Math.floor(sec - mins * 60);

  // Human-ish compact formatting
  if (years >= 1) return `${years} year${years!==1?"s":""}, ${days} day${days!==1?"s":""}`;
  if (days >= 1) return `${days} day${days!==1?"s":""}, ${hours} hour${hours!==1?"s":""}`;
  if (hours >= 1) return `${hours}h ${mins}m`;
  if (mins >= 1) return `${mins}m ${s}s`;
  return `${s}s`;
}

function breakdownEarth(sec){
  const years = Math.floor(sec / SECONDS_PER_YEAR);
  sec -= years * SECONDS_PER_YEAR;
  const days = Math.floor(sec / (24*3600));
  sec -= days * 24*3600;
  const hours = Math.floor(sec / 3600);
  sec -= hours * 3600;
  const mins = Math.floor(sec / 60);
  const s = Math.floor(sec - mins * 60);
  return { years, days, hours, mins, s };
}

function millerMinutesToEarthSeconds(mins){
  const millerSeconds = mins * 60;
  return millerSeconds * EARTH_SECONDS_PER_MILLER_SECOND;
}

function renderTasks(){
  const grid = $("taskGrid");
  grid.innerHTML = "";
  TASKS.forEach(t => {
    const b = document.createElement("button");
    b.className = "task";
    b.type = "button";
    b.innerHTML = `<div class="t">${t.name}</div><div class="d">${t.mins} min on Miller • ${t.vibe}</div>`;
    b.addEventListener("click", () => {
      $("mins").value = String(t.mins);
      $("minsOut").textContent = String(t.mins);
      renderCustomResult();
      // tiny “pulse” feel
      b.animate([{transform:"translateY(-2px)"},{transform:"translateY(0px)"}], {duration:220, easing:"ease-out"});
    });
    grid.appendChild(b);
  });
}

function renderCustomResult(){
  const mins = Number($("mins").value);
  const earthSec = millerMinutesToEarthSeconds(mins);
  const pretty = formatEarthDurationFromSeconds(earthSec);
  const b = breakdownEarth(earthSec);

  $("earthResult").textContent = `On Earth: ${pretty}`;
  $("earthBreakdown").textContent =
    `≈ ${b.years}y ${b.days}d ${pad2(b.hours)}h:${pad2(b.mins)}m:${pad2(b.s)}s on Earth for ${mins}m on Miller.`;
}

function renderSim(){
  const hrs = Number($("simHours").value);
  $("simOut").textContent = hrs.toFixed(2);

  const millerTotalMins = Math.round(hrs * 60);
  const mh = Math.floor(millerTotalMins / 60);
  const mm = millerTotalMins % 60;

  const earthSec = millerMinutesToEarthSeconds(millerTotalMins);
  const b = breakdownEarth(earthSec);

  $("millerSim").textContent = `${mh}h ${mm}m`;
  $("earthSim").textContent = `${b.years}y ${b.days}d`;

  // fill bar (0–6 hours maps to 0–100%)
  const pct = Math.max(0, Math.min(100, (hrs / 24) * 100));
  $("fill").style.width = pct + "%";
  // Make ticking feel more intense as hours increase (0–24 => factor 1–25)
setTickIntensityFromDilation(1 + (hrs / 24) * 24);

}

function startClocks(){
  const start = Date.now();
  setInterval(() => {
    const earthElapsedSec = (Date.now() - start) / 1000;
    const millerElapsedSec = earthElapsedSec / EARTH_SECONDS_PER_MILLER_SECOND;

    $("earthNow").textContent = formatEarthDurationFromSeconds(earthElapsedSec);
    $("millerNow").textContent = `${millerElapsedSec.toFixed(6)} seconds`;
  }, 250);
}

function fmtHMS(totalSeconds){
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const remD = s - days * 86400;
  const h = Math.floor(remD / 3600);
  const remH = remD - h * 3600;
  const m = Math.floor(remH / 60);
  const sec = remH - m * 60;
  return { days, h, m, sec };
}

function formatEarthAge(sec){
  const b = breakdownEarth(sec);
  return {
    big: `${b.years}y ${b.days}d`,
    fine: `${b.years}y ${b.days}d ${pad2(b.hours)}:${pad2(b.mins)}:${pad2(b.s)} (Earth)`
  };
}

function formatMillerAgeFromEarthSeconds(earthSec){
  // Convert Earth seconds lived -> Miller seconds lived
  const millerSec = earthSec / EARTH_SECONDS_PER_MILLER_SECOND;

  const years = Math.floor(millerSec / SECONDS_PER_YEAR); // "Miller-years" using Earth-year length for display
  const remY = millerSec - years * SECONDS_PER_YEAR;

  const { days, h, m, sec } = fmtHMS(remY);

  return {
    big: `${years}y ${days}d`,
    fine: `${years}y ${days}d ${pad2(h)}:${pad2(m)}:${pad2(sec)} (Miller)`
  };
}

let bdayTimer = null;

function startBirthdayClock(){
  const input = $("bdayInput");
  if (!input) return;

  const v = input.value;
  if (!v) return;

  // datetime-local returns local time; treat it as local
  const birthMs = new Date(v).getTime();
  if (!Number.isFinite(birthMs)) return;

  clearInterval(bdayTimer);

  const tick = () => {
    const nowMs = Date.now();
    let earthSec = (nowMs - birthMs) / 1000;
    if (earthSec < 0) earthSec = 0;

    const e = formatEarthAge(earthSec);
    $("earthAge").textContent = e.big;
    $("earthAgeFine").textContent = e.fine;

    const m = formatMillerAgeFromEarthSeconds(earthSec);
    $("millerAge").textContent = m.big;
    $("millerAgeFine").textContent = m.fine;
  };

  tick();
  bdayTimer = setInterval(tick, 250); // updates multiple times per sec; display is per-second
}

// Fun Earth timeline events (mix: human + nature + cosmic)
const EARTH_EVENTS = [
  { label: "🟢 Right now (today)", type: "now" },

  // Ancient civilizations
  { label: "🧱 First cities (~3500 BCE)", year: -3500 },
  { label: "🏛️ Great Pyramid of Giza (~2560 BCE)", year: -2560 },
  { label: "⚔️ Persian Wars (~500 BCE)", year: -500 },
  { label: "⚔️ Roman Empire peak (117 CE)", year: 117 },

  // Middle Ages
  { label: "🏰 Viking Age begins (793 CE)", year: 793 },
  { label: "⚔️ First Crusade (1096 CE)", year: 1096 },
  { label: "🦠 Black Death (1347 CE)", year: 1347 },

  // Exploration & Revolution
  { label: "🧭 Columbus reaches Americas (1492)", year: 1492 },
  { label: "🔥 American Revolution (1776)", year: 1776 },
  { label: "⚔️ French Revolution (1789)", year: 1789 },

  // Industrial era
  { label: "🚂 Industrial Revolution (~1800)", year: 1800 },
  { label: "⚔️ American Civil War (1861)", year: 1861 },

  // World Wars
  { label: "🌍 World War I begins (1914)", year: 1914 },
  { label: "🌍 World War I ends (1918)", year: 1918 },
  { label: "🌍 World War II begins (1939)", year: 1939 },
  { label: "💣 Hiroshima & Nagasaki (1945)", year: 1945 },

  // Cold War / modern era
  { label: "🚀 First human in space (1961)", year: 1961 },
  { label: "🌕 Moon landing (1969)", year: 1969 },
  { label: "🧱 Berlin Wall falls (1989)", year: 1989 },
  { label: "🌍 9/11 attacks (2001)", year: 2001 },
  { label: "📱 First iPhone (2007)", year: 2007 },
  { label: "🦠 COVID-19 pandemic begins (2019)", year: 2019 },

  // Deep time
  { label: "🦖 Dinosaurs go extinct (66M years ago)", yearsAgo: 66_000_000 },
  { label: "🐟 First fish (~530M years ago)", yearsAgo: 530_000_000 },

  // Far future (fun)
  { label: "🌞 Sun brighter (~1B years from now)", yearsFromNow: 1_000_000_000 },
  { label: "🌌 Milky Way & Andromeda collide (~4.5B years)", yearsFromNow: 4_500_000_000 }
];


// Convert an event into a Date (or a duration in years) relative to now
function earthSecondsSinceEvent(ev){
  const now = new Date();

  if (ev.type === "now") return 0;

  // If absolute year given, assume Jan 1 of that year
  if (typeof ev.year === "number"){
    const d = new Date(ev.year, 0, 1);
    return Math.max(0, (now - d) / 1000);
  }

  // yearsAgo: just compute seconds
  if (typeof ev.yearsAgo === "number"){
    return ev.yearsAgo * SECONDS_PER_YEAR;
  }

  // yearsFromNow (future): show negative (we’ll clamp to 0 in display)
  if (typeof ev.yearsFromNow === "number"){
    return -ev.yearsFromNow * SECONDS_PER_YEAR;
  }

  // yearsAgoFromUniverse: interpret as years ago from “now” for a fun approximation
  if (typeof ev.yearsAgoFromUniverse === "number"){
    return ev.yearsAgoFromUniverse * SECONDS_PER_YEAR;
  }

  return 0;
}

function earthSecondsToMillerSeconds(earthSec){
  return earthSec / EARTH_SECONDS_PER_MILLER_SECOND;
}

function formatYearsCompact(years){
  if (years >= 1_000_000_000) return (years/1_000_000_000).toFixed(2) + "B years";
  if (years >= 1_000_000) return (years/1_000_000).toFixed(2) + "M years";
  if (years >= 1_000) return Math.round(years).toLocaleString() + " years";
  return years.toFixed(2) + " years";
}

function millerSecondsToPretty(millerSec){
  // treat “Miller-years” as Earth-year length for readability
  const years = Math.floor(millerSec / SECONDS_PER_YEAR);
  millerSec -= years * SECONDS_PER_YEAR;
  const days = Math.floor(millerSec / 86400);
  millerSec -= days * 86400;
  const h = Math.floor(millerSec / 3600);
  millerSec -= h * 3600;
  const m = Math.floor(millerSec / 60);
  const s = Math.floor(millerSec - m * 60);

  if (years > 0) return `${years}y ${days}d ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  if (days > 0) return `${days}d ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
let flyTimer = null;

function setFlyCaption(text){
  const el = $("flyCaption");
  if (el) el.textContent = text;
}

function renderSelectedEventStats(){
  const sel = $("eventSelect");
  if (!sel) return;

  const ev = EARTH_EVENTS[Number(sel.value)] || EARTH_EVENTS[0];
  let earthSec = earthSecondsSinceEvent(ev);

  // If it’s a future event, show “not happened yet”
  if (earthSec < 0){
    $("sinceEarth").textContent = "Not happened yet 🙂";
    $("sinceMiller").textContent = "—";
    setFlyCaption("Pick a past event to see the time warp!");
    return;
  }

  const earthYears = earthSec / SECONDS_PER_YEAR;
  const millerSec = earthSecondsToMillerSeconds(earthSec);

  $("sinceEarth").textContent =
    earthYears >= 1000 ? formatYearsCompact(earthYears) : formatEarthDurationFromSeconds(earthSec);

  $("sinceMiller").textContent =
    millerSec >= SECONDS_PER_YEAR ? millerSecondsToPretty(millerSec) : `${millerSec.toFixed(2)}s`;

  setFlyCaption(`Since “${ev.label}”: Earth raced by… while Miller barely blinked.`);
}

function startFly(){
  stopFly();

  const flyMins = Number($("flySlider")?.value || 10);
  $("flyMins").textContent = String(flyMins);

  const sel = $("eventSelect");
  const ev = EARTH_EVENTS[Number(sel?.value || 0)] || EARTH_EVENTS[0];

  // Base year to start from (for display)
  let startYear = 2000;
  if (typeof ev.year === "number") startYear = ev.year;
  else if (typeof ev.yearsAgo === "number") startYear = Math.max(1, Math.floor(new Date().getFullYear() - ev.yearsAgo));
  else startYear = 2000;

  const nowYear = new Date().getFullYear();

  // Total Earth seconds that pass when flyMins pass on Miller
  const earthSecTotal = millerMinutesToEarthSeconds(flyMins);
  const earthYearsTotal = earthSecTotal / SECONDS_PER_YEAR;

  // During fly mode, make ticks speed up based on years jumped
setTickIntensityFromDilation(1 + Math.min(30, earthYearsTotal / 5));

  // We animate by “years” for kid-friendly feel
  const durationMs = 2200; // animation length
  const t0 = performance.now();

  setFlyCaption("🚀 Warp engaged… watch the calendar melt.");
  $("meterFill").style.width = "0%";

  flyTimer = setInterval(() => {
    const t = (performance.now() - t0) / durationMs;
    const clamped = Math.max(0, Math.min(1, t));

    const yearsPassed = earthYearsTotal * clamped;
    const displayYear = Math.floor(startYear + yearsPassed);

    const yearBig = $("yearBig");
    const yearSub = $("yearSub");
    if (yearBig) yearBig.textContent = String(displayYear);
    if (yearSub){
      yearSub.textContent =
        `+${formatYearsCompact(yearsPassed)} on Earth in ${flyMins} Miller min`;
    }

    $("meterFill").style.width = (clamped * 100).toFixed(1) + "%";

    // little “pop” each time we cross a year boundary (fun for kids)
    if (yearBig && clamped < 1){
      yearBig.animate(
        [{ transform:"scale(1)" }, { transform:"scale(1.03)" }, { transform:"scale(1)" }],
        { duration: 180, easing:"ease-out" }
      );
    }

    if (clamped >= 1){
      clearInterval(flyTimer);
      flyTimer = null;

      // If it flies far beyond now, show a fun message
      if (startYear + earthYearsTotal > nowYear + 50){
        setFlyCaption("😳 You just time-skipped so hard you’re in the future.");
      } else {
        setFlyCaption("✅ Done. That’s what “a few minutes” costs near Gargantua.");
      }
    }
  }, 80);
}

function stopFly(){
  if (flyTimer){
    clearInterval(flyTimer);
    flyTimer = null;
  }
  $("meterFill").style.width = "0%";
  setTickIntensityFromDilation(1);
}

function looksLikeSpamOrVulgar(text){
  const t = (text || "").toLowerCase();

  const links = (t.match(/https?:\/\/|www\./g) || []).length;
  if (links >= 2) return true;

  if (/(.)\1\1\1\1/.test(t)) return true;

  const spamWords = ["crypto","forex","airdrop","telegram","whatsapp","free money","click here","buy now","casino"];
  if (spamWords.some(w => t.includes(w))) return true;

  const bad = ["fuck","shit","bitch","asshole","cunt","whore","slut","nigger","faggot","retard"];
  if (bad.some(w => t.includes(w))) return true;

  return false;
}

function safeTrim(text, maxLen){
  const s = (text || "").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

async function sendFeedback(){
  const msg = $("fbMsg");
  const textRaw = $("fbText")?.value || "";
  const nameRaw = $("fbName")?.value || "";

  const text = safeTrim(textRaw, 800);
  const name = safeTrim(nameRaw, 40);

  if (!text){
    if (msg) msg.textContent = "Type something first 🙂";
    return;
  }

  if (looksLikeSpamOrVulgar(text)){
    if (msg) msg.textContent = "That got swallowed by the spam black hole 🕳️ Try again.";
    $("fbText").value = "";
    return;
  }

  if (!db){
    if (msg) msg.textContent = "Feedback storage isn’t connected (Firebase missing).";
    return;
  }

  if (msg) msg.textContent = "Sending…";

  // anonymous id for basic abuse control later
  const anonId = (localStorage.getItem("anonId") || (() => {
    const id = "u_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
    localStorage.setItem("anonId", id);
    return id;
  })());

  try{
    await db.collection("feedback").add({
      text,
      name: name || null,
      anonId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    $("fbText").value = "";
    $("fbName").value = "";
    if (msg) msg.textContent = "Sent ✅ If we ship it, you basically helped build it.";
  } catch(e){
    console.warn(e);
    if (msg) msg.textContent = "Failed to send (check Firestore rules).";
  }
}

function init(){
  renderTasks();

  $("mins").addEventListener("input", () => {
    $("minsOut").textContent = $("mins").value;
    renderCustomResult();
  });
  $("simHours").addEventListener("input", (e) => {
  renderSim();
  lensRippleAt(e.target);
});

  $("minsOut").textContent = $("mins").value;
  renderCustomResult();
  renderSim();
  // Birthday module
$("bdayInput")?.addEventListener("input", () => {
  startBirthdayClock();
});

$("bdayNow")?.addEventListener("click", () => {
  const input = $("bdayInput");
  if (!input) return;
  const now = new Date();
  // set datetime-local value: YYYY-MM-DDTHH:MM
  const iso = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
  input.value = iso;
  startBirthdayClock();
});
  startClocks();

  // Earth timeline fun
const sel = $("eventSelect");
if (sel){
  sel.innerHTML = "";
  EARTH_EVENTS.forEach((ev, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = ev.label;
    sel.appendChild(opt);
  });

  sel.addEventListener("change", () => {
    renderSelectedEventStats();
    stopFly();
  });
}

$("jumpNow")?.addEventListener("click", () => {
  if (!$("eventSelect")) return;
  $("eventSelect").value = "0"; // "Right now"
  renderSelectedEventStats();
  stopFly();
});

$("flySlider")?.addEventListener("input", () => {
  $("flyMins").textContent = $("flySlider").value;
});

$("playFly")?.addEventListener("click", () => {
  renderSelectedEventStats();
  startFly();
});

$("stopFly")?.addEventListener("click", () => {
  stopFly();
  setFlyCaption("Stopped. Press Play to warp again 🚀");
});

// initial
renderSelectedEventStats();
$("flyMins").textContent = $("flySlider")?.value || "10";

// Sound toggle
$("soundBtn")?.addEventListener("click", async () => {
  ensureAudio();
  tickOn = !tickOn;

  const btn = $("soundBtn");
  if (tickOn){
    btn.textContent = "🔊 Sound";
    btn.classList.add("on");
    startTicking();
    playTick(); // instant feedback
  } else {
    btn.textContent = "🔇 Sound";
    btn.classList.remove("on");
    stopTicking();
  }
});

$("fbSend")?.addEventListener("click", sendFeedback);

}

init();
