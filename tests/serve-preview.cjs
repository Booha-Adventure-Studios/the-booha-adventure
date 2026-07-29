#!/usr/bin/env node
// CommonJS on purpose: the Desktop parent project declares ESM globally.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const WORK = path.resolve(__dirname, '..');
const ORIGINAL = process.env.JUKU_PREVIEW_FALLBACK
  ? path.resolve(process.env.JUKU_PREVIEW_FALLBACK)
  : WORK;
const PORT = Number(process.env.JUKU_PREVIEW_PORT || 8127);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg'
};

const TOKEN_STUB = `
localStorage.setItem('booha_userid', 'preview-student');
localStorage.setItem('booha_is_juku', '1');
localStorage.setItem('booha_first_name', 'Preview');
window.BOOHA_IDENTITY_READY = true;
document.documentElement.classList.remove('token-checking');
document.dispatchEvent(new Event('booha:identityReady'));
`;

const SYNC_STUB = `
window.BoohaSync = { checkpoint: function () {} };
window.BOOHA_SYNC_READY = true;
document.dispatchEvent(new Event('booha:syncReady'));
`;

const RESULTS_PREVIEW = `
<script>
(function previewResults() {
  if (!(window.JUKU && window.JUKU_RESULTS)) {
    setTimeout(previewResults, 50);
    return;
  }
  JUKU.selectSlot('slot-b');
  JUKU.patchWeek(function (week) {
    week.contentStatus = { ready: true, manifest: 'preview.vocab.sentences.juku' };
    week.survey = { expect: '70-79', hardest: 'reading', submitted: true };
    week.prediction = { expect: '80-89', worst: 'dictation' };
    week.sections = {
      dictation: { total: 27, subTotals: { word: 15, sent: 12 }, items: [] },
      order: { total: 8, items: [] },
      vocab: { total: 15, subTotals: { mean: 8, def: 7 }, items: [] },
      mixed: {
        total: 9, subTotals: { comp: 3, read: 2, translate: 2, write: 2 },
        proveTotal: 2, items: []
      }
    };
    for (var i = 0; i < 15; i++) week.sections.dictation.items.push({ tier: 'word', ok: i < 13 });
    for (var j = 0; j < 12; j++) week.sections.dictation.items.push({ tier: 'sent', ok: j < 8 });
    for (var k = 0; k < 8; k++) week.sections.order.items.push({ ok: k < 7 });
    for (var m = 0; m < 8; m++) week.sections.vocab.items.push({ kind: 'mean', ok: m < 7 });
    for (var n = 0; n < 7; n++) week.sections.vocab.items.push({ kind: 'def', ok: n < 5 });
    ['comp','comp','comp','read','read','translate','translate','write','write']
      .forEach(function (kind, idx) {
        week.sections.mixed.items.push({ kind: kind, ok: idx !== 6 });
      });
    week.sections.mixed.items.push({ kind: 'mean', ok: true, proveIt: true });
    week.sections.mixed.items.push({ kind: 'order', ok: false, proveIt: true });
    week.report = null;
  });
  b_1730('20:26', 6);
})();
</script>`;

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/juku.html';

  if (pathname === '/js/token.js') {
    res.writeHead(200, { 'Content-Type': MIME['.js'] });
    res.end(TOKEN_STUB);
    return;
  }
  if (pathname === '/js/sync-client.js') {
    res.writeHead(200, { 'Content-Type': MIME['.js'] });
    res.end(SYNC_STUB);
    return;
  }

  if (pathname === '/juku.html' && url.searchParams.get('preview') === 'results') {
    const html = fs.readFileSync(path.join(WORK, 'juku.html'), 'utf8')
      .replace('</body>', RESULTS_PREVIEW + '\n</body>');
    res.writeHead(200, {
      'Content-Type': MIME['.html'],
      'Cache-Control': 'no-store'
    });
    res.end(html);
    return;
  }

  const relative = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]/, '');
  const candidates = [path.join(WORK, relative), path.join(ORIGINAL, relative)];
  const filename = candidates.find(file => file.startsWith(WORK) || file.startsWith(ORIGINAL))
    && candidates.find(file => fs.existsSync(file) && fs.statSync(file).isFile());

  if (!filename) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filename).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(filename).pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Juku preview: http://127.0.0.1:${PORT}/juku.html`);
});
