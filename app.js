const $ = (id) => document.getElementById(id);

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

function init(){
  renderTasks();

  $("mins").addEventListener("input", () => {
    $("minsOut").textContent = $("mins").value;
    renderCustomResult();
  });
  $("simHours").addEventListener("input", renderSim);

  $("minsOut").textContent = $("mins").value;
  renderCustomResult();
  renderSim();
  startClocks();
}

init();
