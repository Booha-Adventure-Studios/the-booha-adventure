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
window.BoohaSync = {
  checkpoint: function () { return Promise.resolve(true); },
  verifyTeacherPin: function (pin) {
    return Promise.resolve({ ok: String(pin) === '2468',
      reason: String(pin) === '2468' ? null : 'PIN_REJECTED' });
  }
};
window.BOOHA_SYNC_READY = true;
document.dispatchEvent(new Event('booha:syncReady'));
window.BOOHA_READY = true;
document.dispatchEvent(new Event('booha:ready'));
`;

const RESULTS_PREVIEW = `
<script>
(function previewResults() {
  if (!(window.JUKU && window.JUKU_RESULTS)) {
    setTimeout(previewResults, 50);
    return;
  }
  localStorage.setItem('booha_userid', 'preview-results');
  JUKU.selectSlot('slot-b');
  JUKU.patchWeek(function (week) {
    week.contentStatus = { ready: true, manifest: 'preview.vocab.sentences.juku' };
    week.survey = { expect: '70-79', hardest: 'reading', submitted: true };
    week.prediction = { expect: '80-89', worst: 'dictation' };
    week.teacherReview = {};
    week.finalReport = null;
    week.sections = {
      dictation: { total: 14, subTotals: { word: 8, sent: 6 }, items: [] },
      order: { total: 8, items: [] },
      vocab: { total: 15, subTotals: { mean: 8, def: 7 }, items: [] },
      mixed: {
        total: 7, reviewTotal: 2,
        subTotals: { comp: 3, read: 2, translate: 1, write: 2, openWriting: 1 },
        proveTotal: 2, items: []
      }
    };
    for (var i = 0; i < 8; i++) week.sections.dictation.items.push({ tier: 'word', ok: i < 7 });
    for (var j = 0; j < 6; j++) week.sections.dictation.items.push({ tier: 'sent', ok: j < 4 });
    for (var k = 0; k < 8; k++) week.sections.order.items.push({ ok: k < 7 });
    for (var m = 0; m < 8; m++) week.sections.vocab.items.push({ kind: 'mean', ok: m < 7 });
    for (var n = 0; n < 7; n++) week.sections.vocab.items.push({ kind: 'def', ok: n < 5 });
    ['comp','comp','comp','read','read','write','write']
      .forEach(function (kind, idx) {
        week.sections.mixed.items.push({ kind: kind, ok: idx !== 6 });
      });
    week.sections.mixed.items.push({
      kind: 'translate', reviewOnly: true, reviewStatus: 'pending',
      ans: 'A thoughtful alternative translation'
    });
    week.sections.mixed.items.push({
      kind: 'openWriting', reviewOnly: true, reviewStatus: 'pending',
      ans: 'Suddenly Booha heard a sound. Finally, he found Mimo.'
    });
    week.sections.mixed.items.push({ kind: 'mean', ok: true, proveIt: true });
    week.sections.mixed.items.push({ kind: 'order', ok: false, proveIt: true });
    week.report = null;
  });
  b_1730('20:26', 6);
})();
</script>`;

const READING_PREVIEW = `
<script>
(function previewReading() {
  if (!(window.JUKU && window.JUKU_TESTS)) {
    setTimeout(previewReading, 50);
    return;
  }
  localStorage.setItem('booha_userid', 'preview-reading');
  JUKU.selectSlot('slot-b');
  b_1730('19:16', 6);
})();
</script>`;

const LOBBY_PREVIEW = `
<script>
(function previewLobby() {
  if (!(window.JUKU && window.JUKU_TESTS)) {
    setTimeout(previewLobby, 50);
    return;
  }
  localStorage.setItem('booha_userid', 'preview-lobby');
  b_1730('18:56', 6);
})();
</script>`;

const DICTATION_PREVIEW = `
<script>
(function previewDictation() {
  if (!(window.JUKU && window.JUKU_TESTS)) {
    setTimeout(previewDictation, 50);
    return;
  }
  localStorage.setItem('booha_userid', 'preview-dictation');
  JUKU.selectSlot('slot-b');
  b_1730('19:01', 6);
})();
</script>`;

const PROFILE_PREVIEW = `
<script>
(function previewJukuProfile() {
  if (!(window.JUKU && window.BOOHA_READY)) {
    setTimeout(previewJukuProfile, 50);
    return;
  }
  localStorage.setItem('booha_userid', 'preview-profile');
  localStorage.setItem('booha_is_juku', '1');
  localStorage.setItem('booha_user_name', 'Preview Student');
  var key = JUKU.saveKey();
  var scores = {
    listeningWords: { missing:false, correct:7, total:8, percent:88 },
    listeningSentences: { missing:false, correct:4, total:6, percent:67 },
    sentenceOrder: { missing:false, correct:7, total:8, percent:88 },
    vocabMeaning: { missing:false, correct:7, total:8, percent:88 },
    vocabDefinition: { missing:false, correct:5, total:7, percent:71 },
    readingComprehension: { missing:false, correct:4, total:4, percent:100 },
    spellingBuild: { missing:false, correct:1, total:1, percent:100 }
  };
  var week = {
    weekId:'july-w4', weekStart:'2026-07-26', weekNumber:4,
    slot:'slot-b', curriculum:'br',
    sections:{
      mixed:{items:[
        {kind:'translate',reviewOnly:true,ans:'Meanwhile Booha looked for the door'},
        {kind:'openWriting',reviewOnly:true,
          ans:'Suddenly Booha heard a sound. Finally, he found Mimo.',
          targetsRequired:['suddenly','finally'],targetsUsed:['suddenly','finally']}
      ]}
    },
    teacherReview:{reading:{complete:true,
      scores:{accuracy:3,selfCorrection:2,phrasing:2,pace:3}}},
    report:{
      total:86,
      sections:{
        dictation:{correct:11,total:14,percent:79},
        order:{correct:7,total:8,percent:88},
        vocab:{correct:12,total:15,percent:80},
        mixed:{correct:5,total:5,percent:100}
      },
      skills:scores,
      proveIt:{correct:1,total:1},
      calibration:{after:'80-89',actual:86}
    },
    finalReport:{schema:1,status:'approved',curriculum:'br',
      slot:'slot-b',approvedAt:Date.now()}
  };
  var denied = {
    weekId:'july-w3', weekStart:'2026-07-19', weekNumber:3,
    slot:'slot-a', curriculum:'pb', report:{total:72},
    finalReport:{schema:1,status:'denied',curriculum:'pb',
      slot:'slot-a',deniedAt:Date.now()-1000}
  };
  localStorage.setItem(key, JSON.stringify({v:1,weeks:{preview:week,denied:denied}}));
  document.dispatchEvent(new Event('juku:saved'));
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

  if (pathname === '/juku.html' && url.searchParams.get('preview')) {
    const mode = url.searchParams.get('preview');
    const preview = mode === 'results' ? RESULTS_PREVIEW
      : mode === 'lobby' ? LOBBY_PREVIEW
      : mode === 'dictation' ? DICTATION_PREVIEW : READING_PREVIEW;
    const html = fs.readFileSync(path.join(WORK, 'juku.html'), 'utf8')
      .replace('</body>', preview + '\n</body>');
    res.writeHead(200, {
      'Content-Type': MIME['.html'],
      'Cache-Control': 'no-store'
    });
    res.end(html);
    return;
  }
  if (pathname === '/profile.html' && url.searchParams.get('preview') === 'juku') {
    const html = fs.readFileSync(path.join(WORK, 'profile.html'), 'utf8')
      .replace('</body>', PROFILE_PREVIEW + '\n</body>');
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
