
(function(){

const root = document.getElementById("root");
if(!root || !window.CALENDAR) return;

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */

const MONTH_SHORT = {
  january:"jan", february:"feb", march:"mar", april:"apr",
  may:"may", june:"jun", july:"jul", august:"aug",
  september:"sep", october:"oct", november:"nov", december:"dec"
};

const MONTH_FOLDER = {
  jan:"january", feb:"february", mar:"march", apr:"april",
  may:"may", jun:"june", jul:"july", aug:"august",
  sep:"september", oct:"october", nov:"november", dec:"december"
};

const CURR_LABEL = {
  pb:"Pre-Boo",
  br:"Boo-riculum",
  bc:"Boo-continuum"
};

const TYPE_LABEL = {
  vocab:"Vocabulary",
  sentences:"Sentences",
  questions:"Questions"
};

/* ─────────────────────────────────────────
   WEEK HELPERS
───────────────────────────────────────── */

function getRelativeWeek(offset){

  const now = new Date();
  const shifted = new Date(now.getTime() + offset * 7 * 24 * 60 * 60 * 1000);

  const cw = window.CALENDAR.getCurrentCurriculumWeek(shifted);

  return {
    monthSlug:cw.monthSlug,
    monthLabel:cw.monthLabel,
    weekNumber:cw.weekNumber
  };
}

function buildWeekCode(curr, monthSlug, week){
  return `${curr}_${MONTH_SHORT[monthSlug]}_w${week}`;
}

function parseWeekCode(code){
  const m = code.match(/^([a-z]{2})_([a-z]{3})_w([1-4])$/i);
  if(!m) return null;

  return {
    curr:m[1],
    monthShort:m[2],
    week:Number(m[3]),
    monthFolder:MONTH_FOLDER[m[2]]
  };
}

function labelFromWeek(code){

  const p = parseWeekCode(code);
  if(!p) return code;

  const month = p.monthFolder.charAt(0).toUpperCase()+p.monthFolder.slice(1);

  return `${month} Week ${p.week}`;
}

/* ─────────────────────────────────────────
   LOCAL STORAGE (known items)
───────────────────────────────────────── */

function knownKey(week,curr,type){
  return `booha_hw_known_${week}_${curr}_${type}`;
}

function getKnown(week,curr,type){
  try{
    return new Set(JSON.parse(localStorage.getItem(knownKey(week,curr,type))||"[]"));
  }catch{
    return new Set();
  }
}

function saveKnown(week,curr,type,set){
  localStorage.setItem(knownKey(week,curr,type),JSON.stringify([...set]));
}

/* ─────────────────────────────────────────
   JSON LOADER
───────────────────────────────────────── */

async function loadCards(curr,weekCode,type){

  const p = parseWeekCode(weekCode);
  if(!p) return [];

  const path =
    `/the-booha-adventure/content/${curr}/${p.monthFolder}/${type}.json`;

  const res = await fetch(path,{cache:"no-store"});
  if(!res.ok) return [];

  const json = await res.json();
  const cards = json.cards || [];

  const start = (p.week-1)*15;

  return cards.slice(start,start+15);
}

/* ─────────────────────────────────────────
   WEEK PICKER
───────────────────────────────────────── */

function renderWeekPicker(){

  const last = getRelativeWeek(-1);
  const thisW = getRelativeWeek(0);
  const next = getRelativeWeek(1);

  root.innerHTML = `
  <div class="panel">
    <h2 class="section-title">Choose a Week</h2>

    <div class="grid">

      <button class="choice-btn week-last"
      data-week="${last.monthSlug}|${last.weekNumber}">
      LAST WEEK
      <span class="small-label">${last.monthLabel} Week ${last.weekNumber}</span>
      </button>

      <button class="choice-btn week-this"
      data-week="${thisW.monthSlug}|${thisW.weekNumber}">
      THIS WEEK
      <span class="small-label">${thisW.monthLabel} Week ${thisW.weekNumber}</span>
      </button>

      <button class="choice-btn week-next"
      data-week="${next.monthSlug}|${next.weekNumber}">
      NEXT WEEK
      <span class="small-label">${next.monthLabel} Week ${next.weekNumber}</span>
      </button>

    </div>
  </div>
  `;

  root.querySelectorAll("[data-week]").forEach(btn=>{
    btn.onclick=()=>{
      const [month,week]=btn.dataset.week.split("|");
      renderCurriculum(month,Number(week));
    };
  });
}

/* ─────────────────────────────────────────
   CURRICULUM PICKER
───────────────────────────────────────── */

function renderCurriculum(month,week){

  root.innerHTML=`
  <div class="panel">

  <div class="crumbs">
  <div class="crumb">${month} Week ${week}</div>
  </div>

  <h2 class="section-title">Choose Curriculum</h2>

  <div class="grid">
  <button class="choice-btn pb" data-curr="pb">PRE-BOO</button>
  <button class="choice-btn br" data-curr="br">BOO-RICULUM</button>
  <button class="choice-btn bc" data-curr="bc">BOO-CONTINUUM</button>
  </div>

  </div>
  `;

  root.querySelectorAll("[data-curr]").forEach(btn=>{
    btn.onclick=()=>{
      const curr=btn.dataset.curr;
      const weekCode=buildWeekCode(curr,month,week);
      renderTypePicker(weekCode,curr);
    };
  });
}

/* ─────────────────────────────────────────
   TYPE PICKER
───────────────────────────────────────── */

function renderTypePicker(weekCode,curr){

  root.innerHTML=`
  <div class="panel">

  <div class="crumbs">
  <div class="crumb">${labelFromWeek(weekCode)}</div>
  <div class="crumb">${CURR_LABEL[curr]}</div>
  </div>

  <h2 class="section-title">Choose Homework</h2>

  <div class="grid">
  <button class="choice-btn vocab" data-type="vocab">VOCABULARY</button>
  <button class="choice-btn sentences" data-type="sentences">SENTENCES</button>
  <button class="choice-btn questions" data-type="questions">QUESTIONS</button>
  </div>

  </div>
  `;

  root.querySelectorAll("[data-type]").forEach(btn=>{
    btn.onclick=()=>{
      renderSheet(weekCode,curr,btn.dataset.type,false);
    };
  });
}

/* ─────────────────────────────────────────
   HOMEWORK SHEET
───────────────────────────────────────── */

async function renderSheet(week,curr,type,hideKnown){

  const cards = await loadCards(curr,week,type);
  const known = getKnown(week,curr,type);

  root.innerHTML=`
  <div class="panel">

  <div class="crumbs">
  <div class="crumb">${labelFromWeek(week)}</div>
  <div class="crumb">${CURR_LABEL[curr]}</div>
  <div class="crumb">${TYPE_LABEL[type]}</div>
  </div>

  <div class="actions">
  <button class="action-btn alt" id="back">Back</button>
  <button class="action-btn" id="toggle">${hideKnown?"Show All":"Hide Known"}</button>
  </div>

  <div class="sheet" id="sheet"></div>

  </div>
  `;

  document.getElementById("back").onclick=()=>renderTypePicker(week,curr);

  document.getElementById("toggle").onclick=()=>{
    renderSheet(week,curr,type,!hideKnown);
  };

  const sheet=document.getElementById("sheet");

  sheet.innerHTML=`
  <div class="sheet-head">
  <h2 class="sheet-title">${CURR_LABEL[curr]} ${TYPE_LABEL[type]}</h2>
  <div class="sheet-meta">${labelFromWeek(week)}</div>
  </div>
  `;

  cards.forEach((card,i)=>{

    const n=i+1;

    if(hideKnown && known.has(n)) return;

    const el=document.createElement("div");
    el.className="hw-item";

        el.innerHTML=`
    <div class="hw-top">
      <div style="display:flex; align-items:flex-start; gap:10px; flex:1;">
        <div class="hw-num">${n}.</div>
        <div style="flex:1;">
          <div class="hw-en">${card.en||""}</div>
          <div class="hw-hira">${card.hira||""}</div>
          <div class="hw-jp">${card.jp||""}</div>
        </div>
      </div>
      <button class="hw-toggle">${known.has(n)?"Known ✓":"Hide"}</button>
    </div>
    `;

    const btn=el.querySelector(".hw-toggle");

    btn.onclick=()=>{
      const set=getKnown(week,curr,type);

      if(set.has(n)) set.delete(n);
      else set.add(n);

      saveKnown(week,curr,type,set);
      renderSheet(week,curr,type,hideKnown);
    };

    sheet.appendChild(el);

  });

}

/* ─────────────────────────────────────────
   START
───────────────────────────────────────── */

renderWeekPicker();

})();
