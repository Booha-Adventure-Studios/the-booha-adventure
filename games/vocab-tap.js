
const app = document.getElementById("app");
const ctx = window.BOOHA_GAME_CONTEXT;

function fail(message) {
  if (app) {
    app.innerHTML = `<div style="padding:24px;color:white;">${message}</div>`;
  }
  throw new Error(message);
}

async function init() {
  if (!ctx) fail("Missing BOOHA_GAME_CONTEXT.");
  if (!ctx.contentPath) fail("Missing contentPath.");

  const res = await fetch(ctx.contentPath, { cache: "no-store" });
  if (!res.ok) fail(`Could not load content: ../../content/${ctx.curriculum}/${ctx.monthDir}/${ctx.contentType}.json`);

  const data = await res.json();
  const allCards = Array.isArray(data.cards) ? data.cards : [];

  const weekCards = allCards.filter(card => Number(card.week) === ctx.contentWeek);

  if (!weekCards.length) {
    fail(`No vocab cards found for week ${ctx.contentWeek}.`);
  }

  app.innerHTML = `
    <div style="padding:24px;color:white;">
      <h1>${ctx.title}</h1>
      <p><strong>Week:</strong> ${ctx.weekId}</p>
      <p><strong>Content week:</strong> ${ctx.contentWeek}</p>
      <p><strong>Total cards loaded:</strong> ${weekCards.length}</p>
      <hr>
      ${weekCards.map(card => `
        <div style="margin:0 0 16px 0;">
          <div><strong>${card.en ?? ""}</strong></div>
          <div>${card.jp ?? ""}</div>
          <div>${card.hira ?? ""}</div>
          <div style="opacity:.7;">${card.mp3 ?? ""}</div>
        </div>
      `).join("")}
    </div>
  `;
}

init().catch(err => {
  console.error(err);
});
