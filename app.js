const $ = (id) => document.getElementById(id);

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
  const pct = Math.max(0, Math.min(100, (hrs / 6) * 100));
  $("fill").style.width = pct + "%";
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
}

init();
