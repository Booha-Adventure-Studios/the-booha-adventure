
const app = document.getElementById("app");
const ctx = window.BOOHA_GAME_CONTEXT;

app.innerHTML = `
  <div style="padding:24px;color:white;">
    <h1>${ctx.title}</h1>
    <p>${ctx.weekId}</p>
    <p>${ctx.contentPath}</p>
  </div>
`;
