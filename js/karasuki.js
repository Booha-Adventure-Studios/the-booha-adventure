
(() => {
  const DATA = window.KARASUKI_DATA;
  if (!DATA || !DATA.rooms) { console.error("KARASUKI_DATA not found."); return; }

  /* ═══════════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════════ */
  const WORLD_W         = 1536;
  const WORLD_H         = 1024;
  const GHOST_R         = 26;
  const GHOST_RADIUS    = 18;
  const BASE_SPEED      = 3.2;
  const FADE_MS         = 600;
  const CLICK_STOP_DIST = 6;
  const HOVER_AMP       = 9;
  const HOVER_PERIOD    = 1500;
  const TRAIL_MAX       = 90;

  const TARGET_DT       = 1000 / 60;
  let   lastTickTime    = 0;
  let   SPEED           = BASE_SPEED;

  const PORTAL = { x: 357, y: 342, r: 40, href: "adventure-profile.html" };

  const MAZE_EXIT = {
    roomId  : "room_03",
    x       : 738,
    y       : 808,
    r       : 44,
    mazeUrl : "maze.html",
    treeIX  : 535,
    treeIY  : 300,
  };

  /* ── Utsuroba portal — room_15 ── */
  const UTSUROBA_PORTAL = {
    roomId  : "room_15",
    x       : 381,
    y       : 264,
    r       : 48,
    videoSrc: "assets/video/utsuroba_intro.mp4",
    href    : "utsuroba.html",
  };

  const ARRIVAL_ARROW_DELAY_MS        = 2000;
  const ARRIVAL_ARROW_BACK_MULTIPLIER = 3;
  const TRANSITION_COOLDOWN_MS        = 1400;
  const ARROW_MOVE_THRESHOLD          = 30;
  const PORTAL_TRIGGER_R              = 36;

  /* ── Popup re-open cooldown ── */
  const POPUP_COOLDOWN_MS = 900;
  let   bonusPopCooldownUntil       = 0;
  let   wandererPopCooldownUntil    = 0;
  let   utsurobaCooldownUntil       = 0;

  /* ═══════════════════════════════════════════
     DEV MODE
  ═══════════════════════════════════════════ */
  const DEV_MODE = true; // ← FLIP TO false BEFORE DEPLOYING

  const MONTH_COLORS = [
    ['#ff3bbd','#ff79d7'],['#ff6b3b','#ffaa5e'],['#3bc8ff','#a8edff'],
    ['#3bffee','#b2ffda'],['#ffd700','#fff176'],['#3b6fff','#90aaff'],
    ['#a03bff','#d49aff'],['#ff9f3b','#ffd08a'],['#3bffee','#a8fff8'],
    ['#c8ff3b','#e8ffaa'],['#ff3b6f','#ff85a1'],['#ff3bbd','#ff79d7'],
  ];

  function monthPrimary(w)   { return MONTH_COLORS[Math.max(0,Math.min(11,Math.floor((w-1)/4)))][0]; }
  function monthSecondary(w) { return MONTH_COLORS[Math.max(0,Math.min(11,Math.floor((w-1)/4)))][1]; }

  function roomColorPair(roomId) {
    const n = parseInt((roomId || "room_01").replace(/\D/g,""), 10) || 1;
    return MONTH_COLORS[(n - 1) % MONTH_COLORS.length];
  }

  const boohaWeek = parseInt(sessionStorage.getItem('booha_active_week') || '1', 10);
  const primary   = monthPrimary(boohaWeek);
  const secondary = monthSecondary(boohaWeek);

  const NPP_RADIUS = 40;

  const NPP = {
    room_01: [
      { dir: "right", x: 1340, y: 658,  to: "room_02", spawn: "fromLeft"  },
      { dir: "up",    x: 1084, y: 250,  to: "room_06", spawn: "fromDown"  }
    ],
    room_02: [
      { dir: "left",  x: 260,  y: 255,  to: "room_01", spawn: "fromRight" },
      { dir: "right", x: 1340, y: 727,  to: "room_03", spawn: "fromLeft"  },
      { dir: "up",    x: 765,  y: 230,  to: "room_07", spawn: "fromDown"  }
    ],
    room_03: [
      { dir: "left",  x: 320,  y: 328,  to: "room_02", spawn: "fromRight" },
      { dir: "right", x: 1170, y: 237,  to: "room_04", spawn: "fromLeft"  },
      { dir: "up",    x: 785,  y: 270,  to: "room_08", spawn: "fromDown"  }
    ],
    room_04: [
      { dir: "left",  x: 210,  y: 635,  to: "room_03", spawn: "fromRight" },
      { dir: "right", x: 1330, y: 734,  to: "room_05", spawn: "fromLeft"  },
      { dir: "up",    x: 548,  y: 270,  to: "room_09", spawn: "fromDown"  }
    ],
    room_05: [
      { dir: "left",  x: 212,  y: 642,  to: "room_04", spawn: "fromRight" },
      { dir: "up",    x: 435,  y: 310,  to: "room_10", spawn: "fromDown"  }
    ],
    room_06: [
      { dir: "right", x: 1229, y: 652,  to: "room_07", spawn: "fromLeft"  },
      { dir: "up",    x: 1065, y: 239,  to: "room_11", spawn: "fromDown"  },
      { dir: "down",  x: 623,  y: 840,  to: "room_01", spawn: "fromUp"    }
    ],
    room_07: [
      { dir: "left",  x: 160,  y: 687,  to: "room_06", spawn: "fromRight" },
      { dir: "right", x: 1220, y: 614,  to: "room_08", spawn: "fromLeft"  },
      { dir: "up",    x: 555,  y: 250,  to: "room_12", spawn: "fromDown"  },
      { dir: "down",  x: 901,  y: 800,  to: "room_02", spawn: "fromUp"    }
    ],
    room_08: [
      { dir: "left",  x: 190,  y: 776,  to: "room_07", spawn: "fromRight" },
      { dir: "right", x: 1390, y: 592,  to: "room_09", spawn: "fromLeft"  },
      { dir: "up",    x: 984,  y: 240,  to: "room_13", spawn: "fromDown"  },
      { dir: "down",  x: 848,  y: 847,  to: "room_03", spawn: "fromUp"    }
    ],
    room_09: [
      { dir: "left",  x: 160,  y: 702,  to: "room_08", spawn: "fromRight" },
      { dir: "right", x: 1365, y: 224,  to: "room_10", spawn: "fromLeft"  },
      { dir: "up",    x: 449,  y: 270,  to: "room_14", spawn: "fromDown"  },
      { dir: "down",  x: 918,  y: 800,  to: "room_04", spawn: "fromUp"    }
    ],
    room_10: [
      { dir: "left",  x: 160,  y: 702,  to: "room_09", spawn: "fromRight" },
      { dir: "up",    x: 838,  y: 270,  to: "room_15", spawn: "fromDown"  },
      { dir: "down",  x: 776,  y: 800,  to: "room_05", spawn: "fromUp"    }
    ],
    room_11: [
      { dir: "right", x: 1250, y: 312,  to: "room_12", spawn: "fromLeft"  },
      { dir: "down",  x: 804,  y: 800,  to: "room_06", spawn: "fromUp"    }
    ],
    room_12: [
      { dir: "left",  x: 290,  y: 344,  to: "room_11", spawn: "fromRight" },
      { dir: "right", x: 1251, y: 671,  to: "room_13", spawn: "fromLeft"  },
      { dir: "down",  x: 751,  y: 820,  to: "room_07", spawn: "fromUp"    }
    ],
    room_13: [
      { dir: "left",  x: 200,  y: 568,  to: "room_12", spawn: "fromRight" },
      { dir: "right", x: 1310, y: 242,  to: "room_14", spawn: "fromLeft"  },
      { dir: "down",  x: 910,  y: 820,  to: "room_08", spawn: "fromUp"    }
    ],
    room_14: [
      { dir: "left",  x: 303,  y: 631,  to: "room_13", spawn: "fromRight" },
      { dir: "right", x: 1370, y: 716,  to: "room_15", spawn: "fromLeft"  },
      { dir: "down",  x: 751,  y: 820,  to: "room_09", spawn: "fromUp"    }
    ],
    room_15: [
      { dir: "left",  x: 200,  y: 568,  to: "room_14", spawn: "fromRight" },
      { dir: "down",  x: 663,  y: 800,  to: "room_10", spawn: "fromUp"    }
    ]
  };

  const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

  let arrivalArrowHiddenUntil     = 0;
  let arrivalArrowBackHiddenUntil = 0;

  /* ═══════════════════════════════════════════
     WANDERER DEFINITIONS
  ═══════════════════════════════════════════ */
  const WANDERER_DEFS = [
    { index:0, roomId:'room_01', x:642, y:496, type:'stay', frames:['ichi-1.png','ichi-2.png'], color:'#ff79d7', size:52, name:'Ichi', nameJP:'イチ', desc:'The first of three and as mean as can be. Ichi was planted under the Karasuki tree by Mister Happy. He picks on everyone, as mean as can be.', descJP:'三人のうちの最初で、とても意地悪なやつ。イチはミスター・ハッピーによってカラスキーの木の下に植えられた。誰にでもちょっかいを出して、いつも困らせている。' },
    { index:1, roomId:'room_01', x:798, y:418, type:'stay', frames:['mr_happy-1.png','mr_happy-2.png'], color:'#ffd166', size:110, name:'Mister Happy', nameJP:'ミスター・ハッピー', desc:'Mister Happy lives in Karasuki, you see, and swears he knows it perfectly. And no, that shine is not makeup on his skin—that\'s just the way he\'s always been.', descJP:'ミスター・ハッピーはカラスキーに住んでいて、すべてを完璧に知っていると言い張る。そして、その顔の色は化粧ではない——それが彼の本来の姿なのだ。' },
    { index:2, roomId:'room_02', x:882, y:263, type:'stay', frames:['tom_katsu-1.png','tom_katsu-2.png'], color:'#ffaa5e', size:62, name:'Tom Katsu', nameJP:'トムカツ', desc:'Tom Katsu the pig from a circus past, watched bright balloons pop too fast. Now one floats with him wherever he goes—a quiet little fix for a sadness he knows.', descJP:'かつてサーカスにいた豚、トムカツ。風船が弾けるたびに悲しみを覚えていた。今はいつも一つの風船がそばに浮かび、その小さな悲しみを静かに和らげている。' },
    { index:3, roomId:'room_03', x:546, y:308, type:'stay', frames:['uhibon-1.png','uhibon-2.png'], color:'#a8edff', size:72, name:'Uhibon', nameJP:'ウヒボン', desc:'Nobody knows Uhibon—not even he, he came from somewhere beyond Karasuki. He knows there was a time before the bone… but that part of him is lost and gone.', descJP:'誰もウヒボンのことを知らない。本人でさえも。彼はカラスキーの外から来たらしい。骨になる前の記憶があったことはわかっているが、その記憶はすでに失われている。' },
    { index:4, roomId:'room_04', x:888, y:422, type:'stay', frames:['jacki-1.png','jacki-2.png'], color:'#b2ffda', size:110, name:'Jacki', nameJP:'ジャッキー', desc:'Jacki\'s from the West, where Karasuki still grows, a mirror to Mister Happy, or so the story goes. He wanders the paths where the lost things roam—watching, waiting, far from home.', descJP:'ジャッキーは西のカラスキーから来た存在で、ミスター・ハッピーに似ているとも言われている。失われたものがさまよう道を歩きながら、静かに見守り続けている。' },
    { index:5, roomId:'room_05', x:1054, y:354, type:'stay', frames:['jamariko-1.png','jamariko-2.png'], color:'#fff176', size:70, name:'Jamariko', nameJP:'ジャマリコ', desc:'Jamariko\'s the cutest, sweet as can be, but always stands where you need to see. Step to the left or step to the right—it\'s still in your way, day or night.', descJP:'ジャマリコはとても可愛らしいが、必ず見たい場所に立っている。左に動いても右に動いても、昼でも夜でも、いつも邪魔になる。' },
    { index:6, roomId:'room_05', x:1029, y:502, type:'stay', frames:['san-1.png','san-2.png'], color:'#ffd08a', size:52, name:'San', nameJP:'参', desc:'The third of three and as crazy as can, San bit Karasuki before it began. He never turned orange, not even one day—just wild and laughing along the way.', descJP:'三人のうちの最後で、とても狂っている。参は始まる前にカラスキーをかじってしまった。オレンジ色になることもなく、ただ笑いながら荒々しく動き回っている。' },
    { index:7, roomId:'room_06', x:781, y:207, type:'stay', frames:['gorogane-1.png','gorogane-2.png'], color:'#a8fff8', size:120, name:'Gorogui', nameJP:'ゴログイ', desc:'Once they were people with food on their mind, now hunger\'s the only thing they can find. If you see one move, don\'t trust what you see—something much worse is pulling the strings.', descJP:'かつては食べ物のことばかり考えていた人間だった。しかし今は飢えだけが残っている。もし動いているのを見ても信じてはいけない——背後にはもっと恐ろしい何かが潜んでいる。' },
    { index:8, roomId:'room_06', x:522, y:350, type:'drift', frames:['sumiyo_horaguchi-1.png','sumiyo_horaguchi-2.png'], color:'#90aaff', size:85, name:'Sumiyo Horaguchi', nameJP:'洞口すみよ', desc:'If you see one of these—don\'t turn your back, one glance away and she\'s on your track. If you don\'t look, she\'ll follow you through—and once she\'s in, you\'ll start losing you.', descJP:'もし見かけたら、決して背を向けてはいけない。一瞬でも目を離せば、すぐ後ろにいる。見ていないとどこまでも追ってきて、一度入り込まれると、少しずつ自分を失っていく。' },
    { index:9, roomId:'room_07', x:815, y:398, type:'stay', frames:['amekuro-1.png','amekuro-2.png'], color:'#d49aff', size:52, name:'Amekuro', nameJP:'アメクロ', desc:'Amekuro are cute, owl-like cats, chatty and sweet, always talking to anyone they happen to meet. But show them some candy and it won\'t last long—it\'s gone in a second, and they\'ll keep talking on.', descJP:'アメクロはフクロウのような猫で、おしゃべりで甘いものが大好き。誰にでも話しかけてくるが、お菓子を見せると一瞬で食べ尽くし、それでも話し続ける。' },
    { index:10, roomId:'room_07', x:456, y:470, type:'stay', frames:['snakuma-1.png','snakuma-2.png'], color:'#88ff88', size:150, name:'Snakuma', nameJP:'スナクマ', desc:'Snakuma are giant bears who gather what they see, wearing lost things like they\'re meant to be. No one goes looking, no one asks why—the things just stay… as the bears pass by.', descJP:'スナクマは巨大な熊で、見つけたものを集めて身につける。まるでそれが元からそこにあったかのように。誰も探さず、理由も問わないまま、物だけが残り、熊は通り過ぎていく。' },
    { index:11, roomId:'room_08', x:979, y:397, type:'stay', frames:['robert-1.png','robert-2.png'], color:'#ffaa88', size:72, name:'Robert', nameJP:'ロバート', desc:'Robert the eldest, old and worn, sees through the mask that others adorn. He tricks when he wants, helps when he may—but only if he cares that day.', descJP:'ロバートは三兄弟の長男で、古く静かな存在。他人がかぶる仮面の奥まで見抜く。だますことも助けることもあるが、それはすべてその日の気分次第だ。' },
    { index:12, roomId:'room_08', x:1113, y:409, type:'stay', frames:['jeffrey-1.png','jeffrey-2.png'], color:'#ffcc44', size:65, name:'Jeffrey', nameJP:'ジェフリー', desc:'Jeffrey the middle, sharp with a grin, says what he sees with a bite tucked in. He\'ll twist what\'s real just to make his point—then laugh when the truth feels out of joint.', descJP:'ジェフリーは次男で、皮肉な笑みを浮かべる。見たものをそのまま言うが、少し歪めて伝える。真実をねじ曲げ、その違和感を楽しんでいる。' },
    { index:13, roomId:'room_08', x:1256, y:444, type:'stay', frames:['johnny-1.png','johnny-2.png'], color:'#ff8844', size:70, name:'Johnny', nameJP:'ジョニー', desc:'Johnny the youngest, quick on his feet, hates standing still or waiting to meet. He\'ll rush a trick or cut it in two—"Hurry it up… I\'m done with you."', descJP:'ジョニーは末っ子で、落ち着きがない。立ち止まることも待つことも嫌いだ。すぐに行動し、すぐに飽きる。「早くしろよ…もういいや」と投げ出す。' },
    { index:14, roomId:'room_09', x:843, y:413, type:'stay', frames:['nulvane-1.png','nulvane-2.png'], color:'#c8aaff', size:160, name:'Nulvane', nameJP:'ヌルヴェイン', desc:'Nulvane are people who never took form, caught in between what\'s real and not born. They flicker through lives they almost knew—not quite someone, not quite you.', descJP:'ヌルヴェインは形を得られなかった人間。現実と未完成のあいだを漂っている。なりかけた存在を揺らしながら、誰かのようで誰でもない存在だ。' },
    { index:15, roomId:'room_10', x:1233, y:452, type:'stay', frames:['ni-1.png','ni-2.png'], color:'#e8ffaa', size:52, name:'Ni', nameJP:'ニ', nameKanji:'弐', desc:'The second of three and as dumb as can be, always the last one to leave the tree. Covered in white from the crows up above—he doesn\'t mind… he just sits there, dumb.', descJP:'三人のうちの二番目で、とても鈍い。いつも木から降りるのが最後で、上のカラスに汚されても気にしない。ただぼんやり座っている。' },
    { index:16, roomId:'room_11', x:935, y:397, type:'stay', frames:['columbus-1.png','columbus-2.png'], color:'#ff85a1', size:58, name:'Columbus', nameJP:'コロンバス', desc:'Columbus the beagle loves belly-side scratches, but throw him a ball and he slips all your catches. He runs the wrong way, tail high in the air—a game of fetch… that goes nowhere.', descJP:'コロンバスはお腹を撫でられるのが大好きなビーグル犬。しかしボールを投げると、まったく違う方向へ走っていく。取ってこいのはずなのに、どこかへ消えてしまう。' },
    { index:17, roomId:'room_12', x:700, y:270, type:'stay', frames:['october_moriyama-1.png','october_moriyama-2.png'], color:'#ff79d7', size:75, name:'October Moriyama', nameJP:'オクトーバー・森山', desc:'October Moriyama, never impressed, shrugs things off like she knows best. She says she\'s not scared, not even a little—but something inside keeps things unsettled.', descJP:'オクトーバー・森山は何事にも動じない様子で、すべてを見透かしているかのように振る舞う。怖くないと言い張るが、内側では何かがざわついている。' },
    { index:18, roomId:'room_13', x:407, y:387, type:'stay', frames:['takachika_green-1.png','takachika_green-2.png'], color:'#7fffd4', size:77, name:'Takachika Green', nameJP:'タカチカ・グリーン', desc:'Takachika wished to see something more, so he opened a quiet, unseen door. He\'s scared, but he walks where others won\'t—because he wants to see… what others don\'t.', descJP:'タカチカは「何か」を見たいと願い、静かな見えない扉を開いた。怖がりながらも、他の誰も行かない道を進む——見えないものを見るために。' },
    { index:19, roomId:'room_13', x:609, y:642, type:'stay', frames:['pugoo-1.png','pugoo-2.png'], color:'#ffcc66', size:55, name:'Pugoo', nameJP:'パグー', desc:'Pugoo the cat stays close behind, with quiet eyes that always find. He doesn\'t stray, he doesn\'t delay—and keeps the dark things far away.', descJP:'プグーはいつもそばにいる猫。静かな目であらゆるものを見つめている。離れることなく寄り添い、暗いものから守ってくれる存在だ。' },
    { index:20, roomId:'room_14', x:930, y:318, type:'drift', frames:['ena_yamakage-1.png','ena_yamakage-2.png'], color:'#ffb3d9', size:81, name:'Ena Yamakage', nameJP:'山影えな', desc:'Ena appears when the night feels thin, and if she sees you, she\'ll see within. She points and laughs at all you hide—and if it goes on… it won\'t subside.', descJP:'えなは不気味な夜に現れる。目が合えば、内側まで見抜かれてしまう。隠しているものを指差して笑い、その笑いは決して消えない。' },
    { index:21, roomId:'room_15', x:1064, y:434, type:'drift', frames:['tsukigase_jubei-1.png','tsukigase_jubei-2.png'], color:'#ffcc66', size:100, name:'Jubei Tsukigase', nameJP:'月ヶ瀬 寿兵衛', desc:'Jubei worked and worked, he never would stop, no time for home, no time to drop. The years moved on and took it all—now something else begins to call.', descJP:'寿兵衛は働き続け、休むことを知らなかった。家にも戻らず、手を止めることもなかった。気づけば時はすべてを奪い去り、今は何か別のものに呼ばれている。' },
  ];

  const WANDERER_IMG_BASE = 'https://booha-adventure-studios.github.io/the-booha-adventure/assets/img/wanderers/';

  const DRIFT_SPEED      = 0.28;
  const DRIFT_STOP_DIST  = 90;

  /* ═══════════════════════════════════════════
     WANDERER GLITTER SYSTEM
  ═══════════════════════════════════════════ */
  const GLITTER_MAX        = 6;
  const GLITTER_SPAWN_MS   = 380;
  const GLITTER_LIFE_MS    = 2200;
  const GLITTER_SPEED_Y    = 0.18;
  const GLITTER_WOBBLE     = 0.08;

  function spawnGlitter(w, now) {
    if (!w.glitter) w.glitter = [];
    if (!w.glitterNextAt) w.glitterNextAt = now;
    if (now < w.glitterNextAt) return;
    if (w.glitter.length >= GLITTER_MAX) return;
    const sz    = w.size || WANDERER_SIZE;
    const ox    = (Math.random() - 0.5) * sz * 1.4;
    const oy    = (Math.random() - 0.8) * sz * 1.2;
    const roll  = Math.random();
    const color = roll < 0.5 ? '#ffffff' : roll < 0.75 ? '#fff8d0' : w.color;
    w.glitter.push({ x: w.rx + ox, y: w.ry + oy, vx: (Math.random() - 0.5) * GLITTER_WOBBLE, vy: -(GLITTER_SPEED_Y + Math.random() * 0.12), size: 0.6 + Math.random() * 1.1, color, born: now, phase: Math.random() * Math.PI * 2 });
    w.glitterNextAt = now + GLITTER_SPAWN_MS + Math.random() * 180;
  }

  function updateGlitter(w, now) {
    if (!w.glitter) return;
    w.glitter = w.glitter.filter(p => (now - p.born) < GLITTER_LIFE_MS);
    w.glitter.forEach(p => { p.x += p.vx; p.y += p.vy; p.vx += (Math.random() - 0.5) * 0.012; p.vx *= 0.96; });
  }

  function drawGlitter(w, now) {
    if (!w.glitter || !w.glitter.length) return;
    const sec = now / 1000;
    w.glitter.forEach(p => {
      const age = (now - p.born) / GLITTER_LIFE_MS;
      const fadeIn = Math.min(1, age * 6);
      const fadeOut = 1 - Math.pow(age, 1.8);
      const alpha = fadeIn * fadeOut;
      const twinkle = 0.55 + 0.45 * Math.abs(Math.sin(sec * 9 + p.phase));
      ctx.save();
      ctx.globalAlpha = alpha * twinkle * 0.88;
      ctx.shadowBlur = 4 + p.size * 2; ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     WANDERER RUNTIME
  ═══════════════════════════════════════════ */
  let activeWanderers  = [];
  const wandererImages = {};
  const WANDERER_SIZE  = 22;

  function preloadWandererImages() {
    WANDERER_DEFS.forEach(def => {
      if (!def.frames) return;
      def.frames.forEach(filename => {
        if (wandererImages[filename]) return;
        const img = new Image();
        img.src = WANDERER_IMG_BASE + filename;
        wandererImages[filename] = img;
      });
    });
  }

  function refreshWanderersForRoom() {
    let unlockedIndices = [];
    if (window.__devAllWanderers) {
      unlockedIndices = WANDERER_DEFS.map(d => d.index);
    } else {
      try {
        const data = window.BoohaAdventure && BoohaAdventure.save ? BoohaAdventure.save.load() : null;
        if (data && data.weekly && data.weekly.wanderers) unlockedIndices = data.weekly.wanderers;
      } catch (_) {}
    }
    activeWanderers = WANDERER_DEFS
      .filter(def => def.roomId === state.roomId && unlockedIndices.includes(def.index))
      .map(def => ({ ...def, rx: def.x, ry: def.y, wobblePhase: Math.random() * Math.PI * 2, pose: 0, frozen: false, glitter: [], glitterNextAt: 0, images: (def.frames || []).map(f => wandererImages[f]).filter(Boolean) }));
  }

  function initWanderers() { preloadWandererImages(); refreshWanderersForRoom(); }
  function onRoomChanged() { refreshWanderersForRoom(); }

  function updateWanderers(now) {
    if (!activeWanderers.length) return;
    activeWanderers.forEach(w => {
      if (w.type === 'drift' && !w.frozen) {
        const dx = state.x - w.rx, dy = state.y - w.ry;
        const dist = Math.hypot(dx, dy);
        if (dist > DRIFT_STOP_DIST) { const step = DRIFT_SPEED * (SPEED / BASE_SPEED); w.rx += (dx / dist) * step; w.ry += (dy / dist) * step; }
      }
      spawnGlitter(w, now);
      updateGlitter(w, now);
    });
  }

  /* ── Wanderer popup ── */
  let wandererPopOverlay = null;
  let currentPopWanderer = null;

  function injectWandererPopOverlay() {
    if (wandererPopOverlay) return;
    wandererPopOverlay = document.createElement('div');
    wandererPopOverlay.id = 'wanderer-pop-overlay';
    wandererPopOverlay.style.cssText = `display:none;position:fixed;inset:0;z-index:9200;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.3s ease;`;
    wandererPopOverlay.innerHTML = `
      <div id="wanderer-pop-box" style="background:#080810;border-radius:8px;padding:0 0 28px;max-width:min(360px,90vw);width:90vw;text-align:center;font-family:'Georgia',serif;position:relative;animation:portalAppear 0.25s ease-out;max-height:85vh;overflow-y:auto;overflow-x:hidden;">
        <button id="wanderer-pop-close" style="position:sticky;top:10px;float:right;margin-right:12px;background:transparent;border:none;cursor:pointer;font-size:1.1rem;line-height:1;padding:4px 8px;z-index:10;color:rgba(255,255,255,.45);transition:color .18s;">✕</button>
        <div id="wanderer-pop-portrait" style="width:100%;height:160px;position:relative;overflow:hidden;border-radius:8px 8px 0 0;flex-shrink:0;margin-bottom:18px;background:#0a0a18;display:flex;align-items:center;justify-content:center;">
          <img id="wanderer-pop-img" src="" alt="" style="max-width:90%;max-height:150px;width:auto;height:auto;object-fit:contain;display:none;"/>
          <div id="wanderer-pop-portrait-fade" style="position:absolute;bottom:0;left:0;right:0;height:50px;background:linear-gradient(to bottom,transparent,#080810);pointer-events:none;"></div>
        </div>
        <div style="padding:0 28px;">
          <h2 id="wanderer-pop-name" style="font-size:clamp(1.2rem,4vw,1.5rem);margin:0 0 4px;letter-spacing:.06em;"></h2>
          <p id="wanderer-pop-jp" style="font-size:clamp(.82rem,2.6vw,.96rem);margin:0 0 2px;opacity:.72;letter-spacing:.08em;font-family:'Georgia',serif;color:#ffffff;"></p>
          <p id="wanderer-pop-kanji" style="font-size:clamp(.7rem,2.2vw,.82rem);margin:0 0 20px;opacity:.38;letter-spacing:.14em;color:#ffffff;"></p>
          <p id="wanderer-pop-desc" style="font-size:clamp(.84rem,2.8vw,.98rem);line-height:1.7;opacity:.85;margin:0 0 12px;font-family:'Georgia',serif;text-align:left;color:#ffffff;"></p>
          <p id="wanderer-pop-desc-jp" style="font-size:clamp(.76rem,2.4vw,.88rem);line-height:1.7;opacity:.55;margin:0;font-family:'Georgia',serif;text-align:left;color:#ffffff;display:none;"></p>
        </div>
      </div>`;
    document.body.appendChild(wandererPopOverlay);
    document.getElementById('wanderer-pop-close').addEventListener('click', closeWandererPop);
    wandererPopOverlay.addEventListener('click', e => { if (e.target === wandererPopOverlay) closeWandererPop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWandererPop(); });
  }

  function openWandererPop(w) {
    if (!w.name) return;
    currentPopWanderer = w;
    w.pose = 1;
    if (w.type === 'drift') w.frozen = true;
    const box = document.getElementById('wanderer-pop-box');
    const portrait = document.getElementById('wanderer-pop-portrait');
    const imgEl = document.getElementById('wanderer-pop-img');
    const portraitFade = document.getElementById('wanderer-pop-portrait-fade');
    const nameEl = document.getElementById('wanderer-pop-name');
    const jpEl = document.getElementById('wanderer-pop-jp');
    const kanjiEl = document.getElementById('wanderer-pop-kanji');
    const descEl = document.getElementById('wanderer-pop-desc');
    const descJpEl = document.getElementById('wanderer-pop-desc-jp');
    const closeEl = document.getElementById('wanderer-pop-close');
    const c = w.color;
    box.style.border = `1px solid ${c}44`;
    box.style.boxShadow = `0 0 0 1px ${c}33,0 0 30px ${c}55,0 0 70px ${c}22`;
    const poseImg = (w.images && w.images.length > 1 && w.images[1].complete && w.images[1].naturalWidth > 0) ? w.images[1] : (w.images && w.images[0] && w.images[0].complete ? w.images[0] : null);
    portrait.style.background = '#0a0a18';
    portrait.style.borderBottom = `1px solid ${c}22`;
    portraitFade.style.background = `linear-gradient(to bottom,transparent,#080810)`;
    if (poseImg) { imgEl.src = poseImg.src; imgEl.style.display = 'block'; imgEl.style.filter = `drop-shadow(0 0 14px ${c}bb) drop-shadow(0 0 6px ${c}66)`; } else { imgEl.style.display = 'none'; portrait.style.background = `radial-gradient(circle at 50% 60%,${c}22,#0a0a18)`; }
    closeEl.style.color = c;
    nameEl.style.color = c;
    nameEl.style.textShadow = `0 0 18px ${c}88`;
    nameEl.textContent = w.name || '';
    jpEl.textContent = w.nameJP ? `「${w.nameJP}」` : '';
    kanjiEl.textContent = w.nameKanji || '';
    descEl.textContent = w.desc || '';
    if (w.descJP) { descJpEl.textContent = w.descJP; descJpEl.style.display = 'block'; } else { descJpEl.style.display = 'none'; }
    wandererPopOverlay.style.display = 'flex';
    wandererPopOverlay.style.background = 'rgba(0,0,0,0.82)';
    state.clickTarget = null;
  }

  function closeWandererPop() {
    if (currentPopWanderer) { currentPopWanderer.pose = 0; if (currentPopWanderer.type === 'drift') currentPopWanderer.frozen = false; currentPopWanderer = null; }
    wandererPopCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
    wandererPopOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { wandererPopOverlay.style.display = 'none'; }, 300);
  }

  function isWandererPopOpen() { return wandererPopOverlay && wandererPopOverlay.style.display === 'flex'; }

  function clickCheckWanderers(worldX, worldY) {
    if (performance.now() < wandererPopCooldownUntil) return false;
    for (const w of activeWanderers) {
      if (!w.name || !w.frames) continue;
      const sz = w.size || WANDERER_SIZE;
      if (Math.abs(worldX - w.rx) <= sz * 1.5 && Math.abs(worldY - w.ry) <= sz * 1.5) { openWandererPop(w); return true; }
    }
    return false;
  }

  function drawWanderers(now) {
    if (!activeWanderers.length) return;
    const sec = now / 1000;
    activeWanderers.forEach(w => {
      const sz = w.size || WANDERER_SIZE;
      const imgIdx = w.pose === 1 ? 1 : 0;
      const rawImg = w.images && w.images.length > imgIdx ? w.images[imgIdx] : (w.images && w.images[0]);
      const img = (rawImg && rawImg.complete && rawImg.naturalWidth > 0) ? rawImg : null;
      const pulse = 0.5 + 0.5 * Math.sin(sec * 1.6 + w.wobblePhase);
      const glowR = sz * 2.4;
      ctx.save();
      const halo = ctx.createRadialGradient(w.rx, w.ry, 0, w.rx, w.ry, glowR);
      halo.addColorStop(0, w.color + '38'); halo.addColorStop(0.5, w.color + '14'); halo.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.30 + pulse * 0.18; ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(w.rx, w.ry, glowR, 0, Math.PI * 2); ctx.fill();
      if (img) {
        const rat = img.naturalWidth / (img.naturalHeight || 1);
        const dw = rat >= 1 ? sz * 2 : sz * 2 * rat;
        const dh = rat >= 1 ? sz * 2 / rat : sz * 2;
        ctx.globalAlpha = 0.96; ctx.shadowBlur = 14 + pulse * 8; ctx.shadowColor = w.color;
        ctx.drawImage(img, w.rx - dw / 2, w.ry - dh / 2, dw, dh);
        ctx.shadowBlur = 0;
      } else {
        const ig = ctx.createRadialGradient(w.rx - sz * 0.3, w.ry - sz * 0.3, 0, w.rx, w.ry, sz);
        ig.addColorStop(0, '#ffffff'); ig.addColorStop(0.4, w.color); ig.addColorStop(1, w.color + 'aa');
        ctx.globalAlpha = 0.88 + pulse * 0.1; ctx.shadowBlur = 16; ctx.shadowColor = w.color;
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(w.rx, w.ry, sz, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      drawGlitter(w, now);
    });
  }

  /* ═══════════════════════════════════════════
     BONUS TREES
  ═══════════════════════════════════════════ */
  const BONUS_TREES = [
    { id:'booha_invaders', roomId:'room_07', x:1019, y:381, r:44, url:'booha_invaders.html', label:'INVADERS', color:'#44ff88', theme:'invaders', nameEN:'Booha Invaders', nameJP:'ブーハ・インベーダーズ', nameKanji:'侵略者', descUnlocked:'You\'ve unlocked this game! Do you want to play?', descUnlockedJP:'このゲームがつかえます！あそびますか？', descUnlockedKanji:'このゲームが使えます。遊びますか？', descLocked:'This game is locked. You need to play more games in the maze.', descLockedJP:'このゲームはまだロックされています。めいろでもっとゲームをしてください。', descLockedKanji:'このゲームはまだロックされています。迷路でもっとゲームをして下さい。' },
    { id:'booha_blocks', roomId:'room_02', x:1084, y:365, r:44, url:'booha_blocks.html', label:'BLOCKS', color:'#44aaff', theme:'blocks', nameEN:'Booha Blocks', nameJP:'ブーハ・ブロック', nameKanji:'積木', descUnlocked:'You\'ve unlocked this game! Do you want to play?', descUnlockedJP:'このゲームがつかえます！あそびますか？', descUnlockedKanji:'このゲームが使えます。遊びますか？', descLocked:'This game is locked. You need to play more games in the maze.', descLockedJP:'このゲームはまだロックされています。めいろでもっとゲームをしてください。', descLockedKanji:'このゲームはまだロックされています。迷路でもっとゲームをして下さい。' },
    { id:'bonus_placeholder_1', roomId:'room_12', x:993, y:362, r:44, url:'bonus_game_1.html', label:'???', color:'#cc88ff', theme:'mystery', nameEN:'???', nameJP:'？？？', nameKanji:'謎', descUnlocked:'You\'ve unlocked this game! Do you want to play?', descUnlockedJP:'このゲームがつかえます！あそびますか？', descUnlockedKanji:'このゲームが使えます。遊びますか？', descLocked:'This game is locked. You need to play more games in the maze.', descLockedJP:'このゲームはまだロックされています。めいろでもっとゲームをしてください。', descLockedKanji:'このゲームはまだロックされています。迷路でもっとゲームをして下さい。' },
    { id:'bonus_placeholder_2', roomId:'room_14', x:491, y:328, r:44, url:'bonus_game_2.html', label:'???', color:'#ffcc44', theme:'mystery', nameEN:'???', nameJP:'？？？', nameKanji:'謎', descUnlocked:'You\'ve unlocked this game! Do you want to play?', descUnlockedJP:'このゲームがつかえます！あそびますか？', descUnlockedKanji:'このゲームが使えます。遊びますか？', descLocked:'This game is locked. You need to play more games in the maze.', descLockedJP:'このゲームはまだロックされています。めいろでもっとゲームをしてください。', descLockedKanji:'このゲームはまだロックされています。迷路でもっとゲームをして下さい。' },
    { id:'bonus_placeholder_3', roomId:'room_10', x:344, y:392, r:44, url:'bonus_game_3.html', label:'???', color:'#ff9966', theme:'mystery', nameEN:'???', nameJP:'？？？', nameKanji:'謎', descUnlocked:'You\'ve unlocked this game! Do you want to play?', descUnlockedJP:'このゲームがつかえます！あそびますか？', descUnlockedKanji:'このゲームが使えます。遊びますか？', descLocked:'This game is locked. You need to play more games in the maze.', descLockedJP:'このゲームはまだロックされています。めいろでもっとゲームをしてください。', descLockedKanji:'このゲームはまだロックされています。迷路でもっとゲームをして下さい。' },
  ];

  let bonusPopOverlay     = null;
  let bonusPopCurrentTree = null;

  const BONUS_THEMES = {
    invaders: { bg:'#060e0a', border:'#1a3d20', accent1:'#44ff88', accent2:'#ff9922', accent3:'#22ffcc', glow1:'rgba(68,255,136,.55)', glow2:'rgba(255,153,34,.35)', btnBorder:'rgba(68,255,136,.85)', btnColor:'#ccffdd', orbColors:['#44ff88','#22bb55','#ff9922'] },
    blocks:   { bg:'#060812', border:'#1a1a40', accent1:'#44aaff', accent2:'#aa44ff', accent3:'#88ddff', glow1:'rgba(68,170,255,.60)', glow2:'rgba(170,68,255,.40)', btnBorder:'rgba(68,170,255,.85)', btnColor:'#cce8ff', orbColors:['#44aaff','#aa44ff','#88ddff'] },
    mystery:  { bg:'#080810', border:'#3a1055', accent1:'#cc88ff', accent2:'#ffcc44', accent3:'#ffaacc', glow1:'rgba(160,40,220,.55)', glow2:'rgba(255,200,68,.3)', btnBorder:'rgba(160,70,210,.9)', btnColor:'#e8d8ff', orbColors:['#cc88ff','#aa44cc','#ffcc44'] },
  };

  function injectBonusPopOverlay() {
    if (bonusPopOverlay) return;
    bonusPopOverlay = document.createElement('div');
    bonusPopOverlay.id = 'bonus-pop-overlay';
    bonusPopOverlay.style.cssText = `display:none;position:fixed;inset:0;z-index:9150;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.3s ease;`;
    bonusPopOverlay.innerHTML = `
      <div id="bonus-pop-box" style="border-radius:8px;padding:36px 40px 30px;max-width:min(420px,92vw);width:92vw;text-align:center;font-family:'Georgia',serif;position:relative;animation:portalAppear 0.25s ease-out;">
        <div id="bp-corner-tl" style="position:absolute;top:10px;left:10px;width:18px;height:18px;border-style:solid;border-width:1.5px 0 0 1.5px;"></div>
        <div id="bp-corner-br" style="position:absolute;bottom:10px;right:10px;width:18px;height:18px;border-style:solid;border-width:0 1.5px 1.5px 0;"></div>
        <button id="bonus-pop-close" style="position:absolute;top:10px;right:14px;background:transparent;border:none;cursor:pointer;font-size:1.1rem;line-height:1;padding:4px 8px;opacity:.5;transition:opacity .18s;">✕</button>
        <div id="bonus-pop-orb" style="width:60px;height:60px;border-radius:50%;margin:0 auto 18px;position:relative;"></div>
        <div id="bonus-pop-lock" style="font-size:1.6rem;margin-bottom:8px;display:none;">🔒</div>
        <h2 id="bonus-pop-name" style="font-size:clamp(1.1rem,3.5vw,1.4rem);margin:0 0 3px;letter-spacing:.08em;"></h2>
        <p id="bonus-pop-jp" style="font-size:clamp(.78rem,2.4vw,.9rem);margin:0 0 2px;opacity:.7;letter-spacing:.08em;"></p>
        <p id="bonus-pop-kanji" style="font-size:clamp(.68rem,2vw,.8rem);margin:0 0 20px;opacity:.4;letter-spacing:.14em;"></p>
        <p id="bonus-pop-desc" style="font-size:clamp(.82rem,2.6vw,.95rem);line-height:1.65;margin:0 0 8px;opacity:.88;"></p>
        <p id="bonus-pop-desc-jp" style="font-size:clamp(.74rem,2.2vw,.85rem);line-height:1.6;margin:0 0 4px;opacity:.6;"></p>
        <p id="bonus-pop-desc-kanji" style="font-size:clamp(.66rem,1.9vw,.78rem);line-height:1.55;margin:0 0 26px;opacity:.35;"></p>
        <div id="bonus-pop-btns" style="display:none;gap:16px;justify-content:center;flex-wrap:wrap;">
          <button id="bonus-pop-yes" class="bonus-pop-btn" style="background:transparent;font-family:'Georgia',serif;font-size:clamp(.8rem,2.6vw,.92rem);letter-spacing:.12em;cursor:pointer;padding:8px 28px;border-radius:3px;transition:all .18s;">はい / Yes</button>
          <button id="bonus-pop-no" class="bonus-pop-btn" style="background:transparent;font-family:'Georgia',serif;font-size:clamp(.8rem,2.6vw,.92rem);letter-spacing:.12em;cursor:pointer;padding:8px 28px;border-radius:3px;transition:all .18s;">いいえ / No</button>
        </div>
        <button id="bonus-pop-ok" style="background:transparent;font-family:'Georgia',serif;font-size:.9rem;letter-spacing:.12em;cursor:pointer;padding:8px 30px;border-radius:3px;display:none;transition:all .18s;">OK</button>
      </div>`;
    document.body.appendChild(bonusPopOverlay);
    document.getElementById('bonus-pop-close').addEventListener('click', closeBonusPop);
    document.getElementById('bonus-pop-ok').addEventListener('click', closeBonusPop);
    document.getElementById('bonus-pop-no').addEventListener('click', closeBonusPop);
    document.getElementById('bonus-pop-yes').addEventListener('click', () => { if (bonusPopCurrentTree) window.location.href = bonusPopCurrentTree.url; });
    bonusPopOverlay.addEventListener('click', e => { if (e.target === bonusPopOverlay) closeBonusPop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBonusPop(); });
  }

  function openBonusPop(tree) {
    bonusPopCurrentTree = tree;
    const unlocked = _bonusUnlocked(tree.id);
    const t = BONUS_THEMES[tree.theme] || BONUS_THEMES.mystery;
    const box = document.getElementById('bonus-pop-box');
    box.style.background = t.bg; box.style.border = `1px solid ${t.border}`;
    box.style.boxShadow = `0 0 0 1px ${t.accent1}44,0 0 35px ${t.glow1},0 0 80px ${t.glow2},inset 0 0 40px rgba(0,0,0,.5)`;
    ['bp-corner-tl','bp-corner-br'].forEach(id => { document.getElementById(id).style.borderColor = `${t.accent1}88`; });
    document.getElementById('bonus-pop-close').style.color = t.accent1;
    const orb = document.getElementById('bonus-pop-orb');
    orb.textContent = '🧿'; orb.style.fontSize = '1.8rem'; orb.style.lineHeight = '60px';
    if (tree.theme === 'invaders') { orb.style.background = `radial-gradient(circle at 35% 35%,#ccffdd,#44ff88,#005522)`; } else if (tree.theme === 'blocks') { orb.style.background = `radial-gradient(circle at 35% 35%,#cce8ff,#44aaff,#002244)`; } else { orb.style.background = `radial-gradient(circle at 35% 35%,#fff,${t.orbColors[0]},${t.orbColors[1]})`; }
    orb.style.boxShadow = `0 0 14px ${t.orbColors[0]}cc,0 0 32px ${t.orbColors[0]}88,0 0 60px ${t.orbColors[1]}55`;
    document.getElementById('bonus-pop-lock').style.display = unlocked ? 'none' : 'block';
    const nameEl = document.getElementById('bonus-pop-name');
    nameEl.textContent = tree.nameEN; nameEl.style.color = t.accent1; nameEl.style.textShadow = `0 0 16px ${t.accent1}99`;
    document.getElementById('bonus-pop-jp').textContent = tree.nameJP; document.getElementById('bonus-pop-jp').style.color = t.accent3;
    document.getElementById('bonus-pop-kanji').textContent = tree.nameKanji;
    const descEl = document.getElementById('bonus-pop-desc'); const descJpEl = document.getElementById('bonus-pop-desc-jp'); const descKEl = document.getElementById('bonus-pop-desc-kanji');
    if (unlocked) { descEl.textContent = tree.descUnlocked; descJpEl.textContent = tree.descUnlockedJP; descKEl.textContent = tree.descUnlockedKanji; } else { descEl.textContent = tree.descLocked; descJpEl.textContent = tree.descLockedJP; descKEl.textContent = tree.descLockedKanji; }
    descEl.style.color = '#ffffff'; descJpEl.style.color = '#ffffff'; descKEl.style.color = '#ffffff';
    const btnsEl = document.getElementById('bonus-pop-btns'); const okEl = document.getElementById('bonus-pop-ok');
    const yesEl = document.getElementById('bonus-pop-yes'); const noEl = document.getElementById('bonus-pop-no');
    if (unlocked) { btnsEl.style.display = 'flex'; okEl.style.display = 'none'; yesEl.style.border = `1.5px solid ${t.btnBorder}`; yesEl.style.color = t.btnColor; noEl.style.border = `1.5px solid ${t.accent1}44`; noEl.style.color = `${t.accent3}99`; } else { btnsEl.style.display = 'none'; okEl.style.display = 'inline-block'; okEl.style.border = `1.5px solid ${t.btnBorder}`; okEl.style.color = t.btnColor; }
    bonusPopOverlay.style.display = 'flex'; bonusPopOverlay.style.background = 'rgba(0,0,0,0.85)';
    state.clickTarget = null;
  }

  function closeBonusPop() {
    bonusPopOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { bonusPopOverlay.style.display = 'none'; }, 300);
    bonusPopCurrentTree = null;
    bonusPopCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
  }

  function isBonusPopOpen() { return bonusPopOverlay && bonusPopOverlay.style.display === 'flex'; }

  function _bonusUnlocked(bonusId) {
    if (window.__devAllGames) return true;
    try { if (window.BoohaAdventure && BoohaAdventure.unlocks) return BoohaAdventure.unlocks.isBonusGameUnlocked(bonusId); } catch (_) {}
    return false;
  }

  function handleBonusTreeInteraction(tree) { openBonusPop(tree); }

  function checkBonusTrees() {
    if (performance.now() < bonusPopCooldownUntil) return;
    const trees = BONUS_TREES.filter(t => t.roomId === state.roomId);
    if (!trees.length || state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    for (const tree of trees) {
      if (Math.hypot(state.x - tree.x, state.y - tree.y) <= tree.r) { handleBonusTreeInteraction(tree); state.clickTarget = null; return; }
    }
  }

  function clickBonusTree(worldX, worldY) {
    if (performance.now() < bonusPopCooldownUntil) return false;
    const trees = BONUS_TREES.filter(t => t.roomId === state.roomId);
    for (const tree of trees) { if (Math.hypot(worldX - tree.x, worldY - tree.y) <= tree.r) { handleBonusTreeInteraction(tree); return true; } }
    return false;
  }

  function drawBonusTrees(now) {
    const trees = BONUS_TREES.filter(t => t.roomId === state.roomId);
    if (!trees.length) return;
    const sec = now / 1000;
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    trees.forEach(tree => {
      const unlocked = _bonusUnlocked(tree.id);
      const t = BONUS_THEMES[tree.theme] || BONUS_THEMES.mystery;
      const pulse = 0.5 + 0.5 * Math.sin(sec * 2.1);
      const pulse2 = 0.5 + 0.5 * Math.sin(sec * 1.4 + 1.1);
      const bounce = Math.sin(sec * 1.8) * 6;
      ctx.save();
      if (unlocked) {
        const cloud = ctx.createRadialGradient(tree.x, tree.y + bounce, 0, tree.x, tree.y + bounce, 88);
        cloud.addColorStop(0, t.accent1 + '55'); cloud.addColorStop(0.4, t.accent1 + '22'); cloud.addColorStop(0.7, t.accent2 + '11'); cloud.addColorStop(1, 'transparent');
        ctx.globalAlpha = moveReveal * (0.55 + pulse * 0.3); ctx.fillStyle = cloud;
        ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, 88, 0, Math.PI * 2); ctx.fill();
        const mid = ctx.createRadialGradient(tree.x, tree.y + bounce, 14, tree.x, tree.y + bounce, 52);
        mid.addColorStop(0, 'transparent'); mid.addColorStop(0.4, t.accent2 + '33'); mid.addColorStop(0.7, t.accent2 + '55'); mid.addColorStop(1, 'transparent');
        ctx.globalAlpha = moveReveal * (0.4 + pulse2 * 0.3); ctx.fillStyle = mid;
        ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, 52, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 6; i++) {
          const ring = i < 3 ? 28 : 42; const speed = i < 3 ? 0.9 : -0.6;
          const angle = sec * speed + (i / 3) * Math.PI * 2;
          const sx = tree.x + Math.cos(angle) * ring; const sy = tree.y + bounce + Math.sin(angle) * ring;
          const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(sec * 5.5 + i * 1.3));
          const sCol = i % 2 === 0 ? t.accent1 : t.accent2;
          ctx.globalAlpha = moveReveal * twinkle * (0.7 + pulse * 0.25);
          ctx.fillStyle = sCol; ctx.shadowBlur = 8; ctx.shadowColor = sCol;
          ctx.beginPath(); ctx.arc(sx, sy, 1.8 + pulse * 0.8, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
        const coreR = 10 + pulse * 5;
        const core = ctx.createRadialGradient(tree.x - 2, tree.y + bounce - 2, 0, tree.x, tree.y + bounce, coreR * 1.8);
        core.addColorStop(0, '#ffffff'); core.addColorStop(0.25, t.accent1); core.addColorStop(0.6, t.accent2 + 'aa'); core.addColorStop(1, 'transparent');
        ctx.globalAlpha = moveReveal * (0.92 + pulse * 0.07); ctx.shadowBlur = 24 + pulse * 18; ctx.shadowColor = t.accent1;
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, coreR * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        const lockGlow = ctx.createRadialGradient(tree.x, tree.y, 0, tree.x, tree.y, 40);
        lockGlow.addColorStop(0, 'rgba(110,110,110,0.22)'); lockGlow.addColorStop(0.6, 'rgba(80,80,80,0.08)'); lockGlow.addColorStop(1, 'transparent');
        ctx.globalAlpha = moveReveal * 0.55; ctx.fillStyle = lockGlow;
        ctx.beginPath(); ctx.arc(tree.x, tree.y, 40, 0, Math.PI * 2); ctx.fill();
        const dotG = ctx.createRadialGradient(tree.x, tree.y, 0, tree.x, tree.y, 7);
        dotG.addColorStop(0, 'rgba(160,160,160,0.45)'); dotG.addColorStop(1, 'transparent');
        ctx.globalAlpha = moveReveal * 0.45; ctx.fillStyle = dotG;
        ctx.beginPath(); ctx.arc(tree.x, tree.y, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     UTSUROBA PORTAL — canvas marker + popup
  ═══════════════════════════════════════════ */

  /* Drip particles — downward, heavy, viscous */
  const DRIP_MAX       = 10;
  const DRIP_SPAWN_MS  = 340;
  const DRIP_LIFE_MS   = 1800;
  let   utsurobaDrips  = [];
  let   dripNextAt     = 0;

  function spawnDrip(now, cx, cy) {
    if (now < dripNextAt) return;
    if (utsurobaDrips.length >= DRIP_MAX) return;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6; // downward cone
    const speed = 0.08 + Math.random() * 0.14;
    utsurobaDrips.push({
      x    : cx + (Math.random() - 0.5) * 28,
      y    : cy + 6 + Math.random() * 10,
      vx   : Math.cos(angle) * speed,
      vy   : Math.sin(angle) * speed,
      size : 1.4 + Math.random() * 2.2,
      born : now,
      phase: Math.random() * Math.PI * 2,
    });
    dripNextAt = now + DRIP_SPAWN_MS + Math.random() * 200;
  }

  function updateDrips(now) {
    utsurobaDrips = utsurobaDrips.filter(p => (now - p.born) < DRIP_LIFE_MS);
    utsurobaDrips.forEach(p => {
      p.vy  += 0.006; // slow gravity
      p.x   += p.vx;
      p.y   += p.vy;
      p.vx  *= 0.98;
    });
  }

  function drawDrips(now, unlocked) {
    if (!utsurobaDrips.length) return;
    utsurobaDrips.forEach(p => {
      const age     = (now - p.born) / DRIP_LIFE_MS;
      const fadeIn  = Math.min(1, age * 4);
      const fadeOut = 1 - Math.pow(age, 1.4);
      const alpha   = fadeIn * fadeOut;
      const col     = unlocked ? '#3a0000' : '#1a0020';
      ctx.save();
      ctx.globalAlpha = alpha * 0.72;
      ctx.fillStyle   = col;
      ctx.shadowBlur  = 6; ctx.shadowColor = unlocked ? '#880022' : '#330055';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  /* Eye — drawn in canvas strokes, no emoji */
  function drawEye(cx, cy, alpha, pulse, unlocked, sec) {
    const ew   = 22 + pulse * 4;  // eye width half
    const eh   = 8  + pulse * 3;  // eye height half
    const pupR = 4  + pulse * 1.5;
    const eyeCol    = unlocked ? '#cc0022' : '#5500aa';
    const pupilCol  = unlocked ? '#ff0033' : '#aa00ff';
    const glowCol   = unlocked ? '#ff002244' : '#7700cc44';

    ctx.save();
    ctx.globalAlpha = alpha;

    // outer glow
    ctx.shadowBlur  = 18 + pulse * 12;
    ctx.shadowColor = eyeCol;

    // eyelid shape — top and bottom arcs meeting at corners
    ctx.beginPath();
    ctx.moveTo(cx - ew, cy);
    ctx.quadraticCurveTo(cx, cy - eh * 1.6, cx + ew, cy);
    ctx.quadraticCurveTo(cx, cy + eh * 1.6, cx - ew, cy);
    ctx.closePath();
    ctx.fillStyle   = '#080808';
    ctx.fill();
    ctx.strokeStyle = eyeCol;
    ctx.lineWidth   = 1.2;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // crack lines radiating from eye — 4 lines
    const crackAngles = [0.2, 0.85, Math.PI - 0.3, Math.PI + 0.6];
    crackAngles.forEach((a, i) => {
      const len = 12 + i * 4;
      const ex  = cx + Math.cos(a) * ew * 0.9;
      const ey  = cy + Math.sin(a) * eh * 0.9;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(a) * len, ey + Math.sin(a) * len);
      ctx.strokeStyle = eyeCol + '66';
      ctx.lineWidth   = 0.8;
      ctx.globalAlpha = alpha * 0.5;
      ctx.stroke();
    });

    // pupil
    ctx.globalAlpha = alpha;
    ctx.shadowBlur  = 10 + pulse * 8;
    ctx.shadowColor = pupilCol;
    ctx.beginPath();
    ctx.ellipse(cx, cy, pupR * 0.55, pupR, 0, 0, Math.PI * 2);
    ctx.fillStyle = pupilCol;
    ctx.fill();
    ctx.shadowBlur = 0;

    // slow vertical pupil twitch
    const twitch = Math.sin(sec * 0.7 + 1.4) * eh * 0.35;
    ctx.beginPath();
    ctx.ellipse(cx, cy + twitch * 0.3, pupR * 0.28, pupR * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = alpha * 0.25;
    ctx.fill();

    ctx.restore();
  }

  /* Main draw for utsuroba portal marker */
  function drawUtsurobPortalMarker(now) {
    if (state.roomId !== UTSUROBA_PORTAL.roomId) return;
    const sec        = now / 1000;
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    if (moveReveal <= 0) return;

    const cx       = UTSUROBA_PORTAL.x;
    const cy       = UTSUROBA_PORTAL.y;
    const unlocked = _utsurobaCurriculumUnlocked();
    const pulse    = 0.5 + 0.5 * Math.sin(sec * 0.9);     // slow breath
    const pulse2   = 0.5 + 0.5 * Math.sin(sec * 1.3 + 1.1);
    const rot      = sec * 0.18;                            // very slow vortex spin

    ctx.save();
    ctx.globalAlpha = moveReveal;

    /* ── outermost void cloud ── */
    const voidR  = 68 + pulse * 8;
    const voidG  = ctx.createRadialGradient(cx, cy, 0, cx, cy, voidR);
    const voidC1 = unlocked ? 'rgba(50,0,0,0.55)'   : 'rgba(20,0,40,0.55)';
    const voidC2 = unlocked ? 'rgba(20,0,0,0.18)'   : 'rgba(8,0,20,0.18)';
    voidG.addColorStop(0,   voidC1);
    voidG.addColorStop(0.6, voidC2);
    voidG.addColorStop(1,   'transparent');
    ctx.globalAlpha = moveReveal * (0.6 + pulse * 0.25);
    ctx.fillStyle   = voidG;
    ctx.beginPath(); ctx.arc(cx, cy, voidR, 0, Math.PI * 2); ctx.fill();

    /* ── rotating vortex wisps — 5 arms ── */
    for (let i = 0; i < 5; i++) {
      const baseAngle = rot + (i / 5) * Math.PI * 2;
      const armLen    = 38 + pulse2 * 10;
      const segments  = 8;
      const armCol    = unlocked ? '#550011' : '#220033';
      const armGlow   = unlocked ? '#880022' : '#440066';

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(baseAngle);
      ctx.globalAlpha = moveReveal * (0.28 + pulse * 0.18);
      ctx.strokeStyle = armCol;
      ctx.lineWidth   = 1.4 - i * 0.1;
      ctx.shadowBlur  = 8; ctx.shadowColor = armGlow;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let s = 1; s <= segments; s++) {
        const t     = s / segments;
        const r     = t * armLen;
        const curve = Math.sin(t * Math.PI) * 14 * (i % 2 === 0 ? 1 : -1);
        ctx.lineTo(r, curve);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    /* ── inner dark core with faint pulsing ring ── */
    const coreR = 16 + pulse * 5;
    const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    const coreC = unlocked ? '#1a0000' : '#0d0018';
    coreG.addColorStop(0,    '#000000');
    coreG.addColorStop(0.55, coreC);
    coreG.addColorStop(1,    'transparent');
    ctx.globalAlpha = moveReveal * (0.82 + pulse * 0.12);
    ctx.fillStyle   = coreG;
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();

    /* ── ring around core ── */
    const ringCol = unlocked ? '#660011' : '#330055';
    ctx.globalAlpha = moveReveal * (0.30 + pulse * 0.28);
    ctx.strokeStyle = ringCol;
    ctx.lineWidth   = 0.8;
    ctx.shadowBlur  = 12; ctx.shadowColor = ringCol;
    ctx.beginPath(); ctx.arc(cx, cy, coreR + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur  = 0;

    ctx.restore();

    /* ── eye ── drawn separately so alpha is fresh */
    const eyeAlpha = moveReveal * (0.55 + pulse2 * 0.38);
    drawEye(cx, cy, eyeAlpha, pulse, unlocked, sec);

    /* ── drip particles ── */
    if (state.roomId === UTSUROBA_PORTAL.roomId) {
      spawnDrip(now, cx, cy);
      updateDrips(now);
      drawDrips(now, unlocked);
    }
  }

  /* ── Utsuroba popup ── */
  let utsurubaPopOverlay = null;

  function injectUtsuobaPopOverlay() {
    if (utsurubaPopOverlay) return;
    utsurubaPopOverlay = document.createElement('div');
    utsurubaPopOverlay.id = 'utsuroba-pop-overlay';
    utsurubaPopOverlay.style.cssText = `
      display:none; position:fixed; inset:0; z-index:9300;
      align-items:center; justify-content:center;
      background:rgba(0,0,0,0); transition:background 0.4s ease;`;

    utsurubaPopOverlay.innerHTML = `
      <div id="utsuroba-pop-box" style="
        background:linear-gradient(160deg,#06000f 0%,#0c0018 60%,#04000a 100%);
        border:1px solid rgba(120,0,200,.45);
        border-radius:8px;
        padding:0 0 clamp(22px,4vw,36px);
        max-width:min(420px,94vw); width:94vw;
        text-align:center;
        box-shadow:
          0 0 0 1px rgba(100,0,160,.4),
          0 0 50px rgba(60,0,110,.85),
          0 0 110px rgba(30,0,70,.6),
          0 0 200px rgba(15,0,40,.4),
          inset 0 0 80px rgba(0,0,0,.6);
        font-family:'Georgia',serif;
        position:relative;
        overflow:hidden;
        animation:utsuPopAppear 0.4s cubic-bezier(.22,.8,.36,1) both;">

        <!-- animated shimmer bar at very top -->
        <div style="height:2px;width:100%;background:linear-gradient(90deg,transparent,rgba(180,80,255,.9),rgba(100,200,255,.7),rgba(180,80,255,.9),transparent);animation:utsuShimmer 2.4s ease-in-out infinite;"></div>

        <!-- corner brackets -->
        <div style="position:absolute;top:12px;left:12px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-right:none;border-bottom:none;"></div>
        <div style="position:absolute;top:12px;right:12px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-left:none;border-bottom:none;"></div>
        <div style="position:absolute;bottom:12px;left:12px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-right:none;border-top:none;"></div>
        <div style="position:absolute;bottom:12px;right:12px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-left:none;border-top:none;"></div>

        <button id="utsuroba-pop-close" style="
          position:absolute;top:12px;right:14px;
          background:transparent;border:none;cursor:pointer;
          font-size:1rem;color:rgba(160,80,255,.4);
          transition:color .18s;padding:4px 8px;z-index:2;">✕</button>

        <!-- icon area -->
        <div id="utsuroba-pop-icon-wrap" style="
          padding:clamp(20px,4vw,32px) 0 clamp(10px,2vw,16px);
          position:relative;">
          <div style="
            position:absolute;inset:0;
            background:radial-gradient(ellipse at 50% 60%,rgba(120,0,200,.35),transparent 70%);
            pointer-events:none;"></div>
          <img id="utsuroba-pop-icon" src="assets/img/utsuroba_icon.png" alt=""
            style="width:clamp(64px,16vw,96px);height:clamp(64px,16vw,96px);
            object-fit:contain;position:relative;z-index:1;
            filter:drop-shadow(0 0 18px rgba(180,80,255,.8)) drop-shadow(0 0 40px rgba(100,0,200,.5));
            animation:utsuIconPulse 2.8s ease-in-out infinite;" />
        </div>

        <!-- locked state -->
        <div id="utsuroba-locked" style="display:none;padding:0 clamp(20px,6vw,40px);">
          <p style="font-size:clamp(.7rem,2vw,.78rem);color:rgba(140,80,200,.6);
            letter-spacing:.22em;margin:0 0 14px;text-transform:uppercase;">— 封印 —</p>
          <p id="utsuroba-locked-en" style="
            font-size:clamp(.86rem,2.8vw,1rem);color:#7a5a8a;
            margin:0 0 10px;line-height:1.65;letter-spacing:.04em;white-space:pre-line;"></p>
          <p id="utsuroba-locked-jp" style="
            font-size:clamp(.76rem,2.4vw,.9rem);color:#5a3a6a;
            margin:0 0 6px;letter-spacing:.06em;white-space:pre-line;"></p>
          <p id="utsuroba-locked-kanji" style="
            font-size:clamp(.68rem,2vw,.8rem);color:#3a2044;
            margin:0 0 22px;letter-spacing:.1em;opacity:.55;white-space:pre-line;"></p>
          <button id="utsuroba-locked-ok" style="
            background:transparent;font-family:'Georgia',serif;
            font-size:clamp(.8rem,2.5vw,.9rem);letter-spacing:.14em;cursor:pointer;
            padding:8px 28px;border-radius:2px;
            border:1px solid rgba(80,0,120,.5);color:#6a3a8a;
            transition:all .2s;">— 閉じる —</button>
        </div>

        <!-- unlocked state -->
        <div id="utsuroba-unlocked" style="display:none;padding:0 clamp(20px,6vw,40px);">
          <p style="font-size:clamp(.68rem,1.9vw,.76rem);color:rgba(180,120,255,.7);
            letter-spacing:.22em;margin:0 0 12px;text-transform:uppercase;
            text-shadow:0 0 12px rgba(180,80,255,.4);">— 新しい世界 —</p>
          <p id="utsuroba-unlocked-en" style="
            font-size:clamp(.9rem,3vw,1.08rem);color:#d8b8f8;
            margin:0 0 8px;line-height:1.6;letter-spacing:.04em;
            text-shadow:0 0 24px rgba(180,80,255,.45);white-space:pre-line;"></p>
          <p id="utsuroba-unlocked-jp" style="
            font-size:clamp(.78rem,2.5vw,.92rem);color:#a880d0;
            margin:0 0 4px;letter-spacing:.07em;white-space:pre-line;"></p>
          <p id="utsuroba-unlocked-kanji" style="
            font-size:clamp(.7rem,2.1vw,.82rem);color:#7050a8;
            margin:0 0 24px;letter-spacing:.12em;opacity:.7;white-space:pre-line;"></p>
          <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
            <button id="utsuroba-yes" style="
              background:rgba(60,0,100,.35);font-family:'Georgia',serif;
              font-size:clamp(.82rem,2.6vw,.94rem);letter-spacing:.12em;
              cursor:pointer;padding:10px 32px;border-radius:3px;
              border:1px solid rgba(160,60,255,.75);color:#e0c0ff;
              box-shadow:0 0 18px rgba(140,40,220,.3);
              transition:all .22s;">はい / Yes</button>
            <button id="utsuroba-no" style="
              background:transparent;font-family:'Georgia',serif;
              font-size:clamp(.82rem,2.6vw,.94rem);letter-spacing:.12em;
              cursor:pointer;padding:10px 32px;border-radius:3px;
              border:1px solid rgba(60,20,80,.65);color:#7a5a8a;
              transition:all .22s;">いいえ / No</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(utsurubaPopOverlay);

    document.getElementById('utsuroba-pop-close').addEventListener('click', closeUtsurobaPopClose);
    document.getElementById('utsuroba-locked-ok').addEventListener('click', closeUtsurobaPopClose);
    document.getElementById('utsuroba-no').addEventListener('click', closeUtsurobaPopClose);
    document.getElementById('utsuroba-yes').addEventListener('click', startUtsuobaTransition);
    utsurubaPopOverlay.addEventListener('click', e => { if (e.target === utsurubaPopOverlay) closeUtsurobaPopClose(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isUtsuobaPopOpen()) closeUtsurobaPopClose(); });
  }

  /* Locked copy — cryptic, no emoji */
  const UTSUROBA_LOCKED_COPY = {
    en    : 'Something waits behind this mark.\nComplete nine lessons in one path\nbefore it will open to you.',
    jp    : 'この印の奥に、何かが待っている。\nひとつの道で九つの学びを終えよ。\nそれまで、ここは開かない。',
    kanji : '此の印の奥に、何かが待つ。\n一道にて九学を終えよ。\nされど今は、開かぬ。',
  };

  const UTSUROBA_UNLOCKED_COPY = {
    en    : 'A new world has opened.\nDo you want to enter Utsuroba?',
    jp    : '新しい世界が開いた。\nうつろばに入りますか？',
    kanji : '新世界が開かれた。\n空洞場へ参りますか？',
  };

  function openUtsuobaPopup() {
    const unlocked = _utsurobaCurriculumUnlocked();

    const lockedEl   = document.getElementById('utsuroba-locked');
    const unlockedEl = document.getElementById('utsuroba-unlocked');

    if (unlocked) {
      lockedEl.style.display   = 'none';
      unlockedEl.style.display = 'block';
      document.getElementById('utsuroba-unlocked-en').textContent    = UTSUROBA_UNLOCKED_COPY.en;
      document.getElementById('utsuroba-unlocked-jp').textContent    = UTSUROBA_UNLOCKED_COPY.jp;
      document.getElementById('utsuroba-unlocked-kanji').textContent = UTSUROBA_UNLOCKED_COPY.kanji;
    } else {
      lockedEl.style.display   = 'block';
      unlockedEl.style.display = 'none';
      document.getElementById('utsuroba-locked-en').textContent    = UTSUROBA_LOCKED_COPY.en;
      document.getElementById('utsuroba-locked-jp').textContent    = UTSUROBA_LOCKED_COPY.jp;
      document.getElementById('utsuroba-locked-kanji').textContent = UTSUROBA_LOCKED_COPY.kanji;
    }

    utsurubaPopOverlay.style.display    = 'flex';
    utsurubaPopOverlay.style.background = 'rgba(0,0,0,0.88)';
    state.clickTarget = null;
  }

  function closeUtsurobaPopClose() {
    utsurobaCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
    utsurubaPopOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { utsurubaPopOverlay.style.display = 'none'; }, 400);
  }

  function isUtsuobaPopOpen() {
    return utsurubaPopOverlay && utsurubaPopOverlay.style.display === 'flex';
  }

  function startUtsuobaTransition() {
    utsurubaPopOverlay.style.background = 'rgba(0,0,0,0)';
    utsurubaPopOverlay.style.display    = 'none';
    state.clickTarget = null;
    state.moving      = false;

    try { music.pause(); music.currentTime = 0; } catch (_) {}

    const fadeEl = document.getElementById('kara-fade');
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`;
    fadeEl.style.opacity    = '1';

    setTimeout(() => {
      try { sessionStorage.setItem('utsuroba_return_room', 'room_15'); } catch (_) {}
      _playUtsuobaIntroVideo();
    }, FADE_MS + 60);
  }

  function _playUtsuobaIntroVideo() {
    // Inject fullscreen video overlay
    let vOverlay = document.getElementById('utsuroba-video-overlay');
    if (!vOverlay) {
      vOverlay = document.createElement('div');
      vOverlay.id = 'utsuroba-video-overlay';
      vOverlay.style.cssText = `
        position:fixed; inset:0; z-index:99999; background:#000;
        display:flex; align-items:center; justify-content:center;`;
      const vid = document.createElement('video');
      vid.id            = 'utsuroba-intro-vid';
      vid.src           = UTSUROBA_PORTAL.videoSrc;
      vid.autoplay      = true;
      vid.playsInline   = true;
      vid.muted         = false;
      vid.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
      vOverlay.appendChild(vid);
      document.body.appendChild(vOverlay);

      function goToUtsuroba() {
        window.location.href = UTSUROBA_PORTAL.href;
      }

      vid.addEventListener('ended',  goToUtsuroba);
      vid.addEventListener('error',  goToUtsuroba);     // if video fails, navigate anyway
      vid.play().catch(goToUtsuroba);                    // if autoplay blocked, navigate anyway

      // Safety: navigate after 30s no matter what
      setTimeout(goToUtsuroba, 30000);
    }
  }

  function checkUtsuobaPortal() {
    if (state.roomId !== UTSUROBA_PORTAL.roomId) return;
    if (performance.now() < utsurobaCooldownUntil) return;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    if (Math.hypot(state.x - UTSUROBA_PORTAL.x, state.y - UTSUROBA_PORTAL.y) <= UTSUROBA_PORTAL.r) {
      state.clickTarget = null;
      state.moving      = false;
      openUtsuobaPopup();
    }
  }

  function clickCheckUtsuobaPortal(worldX, worldY) {
    if (state.roomId !== UTSUROBA_PORTAL.roomId) return false;
    if (performance.now() < utsurobaCooldownUntil) return false;
    if (Math.hypot(worldX - UTSUROBA_PORTAL.x, worldY - UTSUROBA_PORTAL.y) <= UTSUROBA_PORTAL.r) {
      openUtsuobaPopup();
      return true;
    }
    return false;
  }

  /* ═══════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════ */
  const state = {
    roomId: (() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('room') || DATA.startRoom;
    })(),
    spawnId             : "default",
    x                   : 742,
    y                   : 717,
    spawnX              : 742,
    spawnY              : 717,
    arrivalDir          : null,
    transitioning       : false,
    transitionReadyAt   : 0,
    clickTarget         : null,
    moving              : false,
    distMovedSinceSpawn : 0,
    mazeExiting         : false,
    coordMode           : false,
    musicStarted        : false,
    lastTrailT          : 0
  };

  (function checkReturnFromProfile() {
    try {
      const ret = sessionStorage.getItem('karasuki_return_room');
      if (ret === 'room_08') { state.roomId = 'room_08'; state.spawnId = 'default'; sessionStorage.removeItem('karasuki_return_room'); }
    } catch (_) {}
  })();

  /* Check return from utsuroba */
  (function checkReturnFromUtsuroba() {
    try {
      const ret = sessionStorage.getItem('utsuroba_return_room');
      if (ret) { state.roomId = ret; state.spawnId = 'default'; sessionStorage.removeItem('utsuroba_return_room'); }
    } catch (_) {}
  })();

  let pins    = [];
  let trail   = [];
  let ripples = [];

  const ghostImg = new Image();
  ghostImg.src   = "assets/img/booha_ghost.png";
  const music    = new Audio("assets/audio/karasuki-music.mp3");
  music.loop     = true;
  music.volume   = 0.65;

  let app, stage, canvas, ctx, roomLayer, coordToggle, coordReadout, pinLog;
  let portalOverlay = null;

  /* ═══════════════════════════════════════════
     STYLES
  ═══════════════════════════════════════════ */
  function injectStyles() {
    const s = document.createElement("style");
    s.textContent = `
      html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}
      body{display:grid;place-items:center;}
      #karasuki-app{position:relative;width:100vw;height:100vh;overflow:hidden;background:#000;}
      #karasuki-stage{position:absolute;left:50%;top:50%;width:${WORLD_W}px;height:${WORLD_H}px;transform-origin:50% 50%;overflow:hidden;cursor:crosshair;}
      #karasuki-room-layer{position:absolute;inset:0;}
      .karasuki-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block;pointer-events:none;user-select:none;}
      #kara-canvas{position:absolute;inset:0;z-index:10;pointer-events:none;}
      #kara-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:20;}
      #rotate-overlay{display:none;position:fixed;inset:0;z-index:9999;background:#000;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:32px;}
      @media screen and (orientation:portrait) and (max-width:1023px){#rotate-overlay{display:flex !important;}}
      .rotate-phone{font-size:64px;display:block;animation:rotatehint 2.4s ease-in-out infinite;transform-origin:center;}
      @keyframes rotatehint{0%,100%{transform:rotate(0deg);}40%,60%{transform:rotate(-90deg);}}
      .rotate-bar{width:120px;height:3px;border-radius:999px;background:linear-gradient(90deg,#ff3bbd,#ff79d7,#ff3bbd);background-size:200%;animation:barshimmer 2s linear infinite;box-shadow:0 0 14px rgba(255,59,189,.5);}
      @keyframes barshimmer{0%{background-position:0%}100%{background-position:200%}}
      .rotate-title{font-family:system-ui,-apple-system,sans-serif;font-size:clamp(18px,5vw,28px);font-weight:900;letter-spacing:1px;color:#fff;margin:0;text-shadow:0 0 28px rgba(255,140,255,.7);}
      .rotate-sub{font-size:14px;color:rgba(255,255,255,.55);margin:0;line-height:1.7;}
      #coord-toggle{position:fixed;bottom:18px;right:18px;z-index:200;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.80);color:#ff8ae2;font:700 11px/1 monospace;padding:7px 13px;border-radius:20px;cursor:pointer;border:1px solid rgba(255,138,226,.40);user-select:none;letter-spacing:.06em;}
      .toggle-pill{width:30px;height:16px;border-radius:8px;background:rgba(255,138,226,.18);position:relative;transition:background .2s;}
      .toggle-pill::after{content:"";position:absolute;top:3px;left:3px;width:10px;height:10px;border-radius:50%;background:#ff8ae2;transition:transform .2s;}
      #coord-toggle.active .toggle-pill{background:rgba(255,138,226,.55);}
      #coord-toggle.active .toggle-pill::after{transform:translateX(14px);}
      #coord-readout{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:200;background:rgba(0,0,0,.80);color:#ff8ae2;font:700 13px/1.4 monospace;padding:6px 16px;border-radius:20px;pointer-events:none;border:1px solid rgba(255,138,226,.30);letter-spacing:.05em;opacity:0;transition:opacity .2s;white-space:nowrap;text-align:center;}
      #coord-readout.show{opacity:1;}
      #coord-readout .hint{font-size:10px;color:rgba(255,138,226,.55);display:block;margin-top:2px;}
      #pin-log{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:200;max-height:60vh;overflow-y:auto;background:rgba(0,0,0,.85);border:1px solid rgba(255,138,226,.25);border-radius:14px;padding:10px 12px;font:700 11px/1.6 monospace;color:#ff8ae2;letter-spacing:.04em;display:none;min-width:160px;}
      #pin-log.show{display:block;}
      #pin-log .pin-row{display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,138,226,.12);cursor:pointer;}
      #pin-log .pin-row:last-child{border-bottom:none;}
      #pin-log .pin-row:hover{color:#fff;}
      #pin-log .pin-idx{min-width:18px;text-align:right;color:rgba(255,138,226,.55);font-size:10px;}
      #pin-log .pin-coords{flex:1;}
      #pin-log .pin-copy{font-size:9px;color:rgba(255,138,226,.45);padding:1px 5px;border-radius:6px;border:1px solid rgba(255,138,226,.2);}
      #pin-log .pin-row:hover .pin-copy{color:#fff;border-color:rgba(255,138,226,.6);}
      #pin-log .log-header{font-size:9px;color:rgba(255,138,226,.45);letter-spacing:.12em;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;}
      #pin-log .clear-btn{font-size:9px;color:rgba(255,138,226,.4);cursor:pointer;padding:1px 6px;border-radius:6px;border:1px solid rgba(255,138,226,.18);}
      #pin-log .clear-btn:hover{color:#fff;border-color:rgba(255,138,226,.6);}
      #copy-toast{position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:300;background:rgba(20,0,30,.92);color:#fff;font:700 12px/1 monospace;padding:6px 18px;border-radius:20px;pointer-events:none;opacity:0;transition:opacity .18s;letter-spacing:.05em;}
      #copy-toast.show{opacity:1;}
      #portal-overlay{display:none;position:fixed;inset:0;z-index:9000;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.3s ease;}
      #portal-overlay.active{display:flex;background:rgba(0,0,0,0.82);}
      #portal-box{background:#080810;border:1px solid #3a1055;border-radius:6px;padding:clamp(24px,5vw,44px) clamp(20px,6vw,52px) clamp(20px,4vw,36px);max-width:min(440px,92vw);width:92vw;text-align:center;box-shadow:0 0 0 1px rgba(160,40,220,.6),0 0 40px rgba(160,40,220,.7),0 0 90px rgba(120,0,180,.45),0 0 160px rgba(100,0,160,.2),inset 0 0 50px rgba(0,0,0,.5);font-family:'Georgia',serif;position:relative;animation:portalAppear 0.25s ease-out;}
      @keyframes portalAppear{from{opacity:0;transform:scale(0.92) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);}}
      @keyframes utsuPopAppear{from{opacity:0;transform:scale(0.88) translateY(12px);}to{opacity:1;transform:scale(1) translateY(0);}}
      @keyframes utsuShimmer{0%,100%{opacity:.4;transform:translateX(-30%);}50%{opacity:1;transform:translateX(30%);}}
      @keyframes utsuIconPulse{0%,100%{filter:drop-shadow(0 0 18px rgba(180,80,255,.8)) drop-shadow(0 0 40px rgba(100,0,200,.5));transform:scale(1);}50%{filter:drop-shadow(0 0 28px rgba(200,120,255,1)) drop-shadow(0 0 60px rgba(140,0,255,.7));transform:scale(1.06);}}
      #portal-box::before,#portal-box::after{content:"";position:absolute;width:20px;height:20px;border-color:rgba(180,80,220,.7);border-style:solid;}
      #portal-box::before{top:10px;left:10px;border-width:1.5px 0 0 1.5px;}
      #portal-box::after{bottom:10px;right:10px;border-width:0 1.5px 1.5px 0;}
      #portal-en{font-size:clamp(.9rem,3.5vw,1.1rem);margin:0 0 10px;letter-spacing:.04em;color:#f0e8ff;line-height:1.55;text-shadow:0 0 20px rgba(200,180,255,.5);}
      #portal-ja{font-size:clamp(.78rem,3vw,.92rem);margin:0 0 6px;color:#cdb8e8;letter-spacing:.05em;}
      #portal-kanji{font-size:clamp(.72rem,2.5vw,.84rem);margin:0 0 clamp(18px,4vw,32px);color:#a888cc;letter-spacing:.08em;}
      .portal-btn{background:transparent;font-family:'Georgia',serif;font-size:clamp(.82rem,3vw,.95rem);letter-spacing:.12em;cursor:pointer;transition:color .18s,border-color .18s,box-shadow .18s,background .18s;padding:clamp(6px,2vw,10px) clamp(20px,5vw,34px);border-radius:3px;}
      #portal-yes{border:1.5px solid rgba(160,70,210,.9);color:#e8d8ff;margin-right:16px;background:rgba(100,30,150,.15);}
      #portal-yes:hover{color:#fff;border-color:rgba(210,120,255,1);background:rgba(140,50,200,.3);box-shadow:0 0 20px rgba(180,80,240,.6),0 0 40px rgba(140,40,200,.3);}
      #portal-no{border:1.5px solid rgba(70,45,90,.8);color:#b8a8c8;background:rgba(40,25,60,.2);}
      #portal-no:hover{color:#ddd0ff;border-color:rgba(130,90,160,.9);background:rgba(70,45,100,.3);}
      #wanderer-pop-box::-webkit-scrollbar{width:4px;}
      #wanderer-pop-box::-webkit-scrollbar-track{background:transparent;}
      #wanderer-pop-box::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:4px;}
      /* utsuroba popup text whitespace */
      #utsuroba-locked-en, #utsuroba-locked-jp, #utsuroba-locked-kanji,
      #utsuroba-unlocked-en, #utsuroba-unlocked-jp, #utsuroba-unlocked-kanji {
        white-space: pre-line;
      }
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════
     DEV PANEL
  ═══════════════════════════════════════════ */
  function injectDevPanel() {
    if (document.getElementById('dev-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'dev-panel';
    panel.style.cssText = `position:fixed;bottom:60px;right:18px;z-index:9999;pointer-events:auto;background:rgba(0,0,0,.88);border:1px solid rgba(255,200,0,.4);border-radius:10px;padding:10px 14px;font:700 11px/1.8 monospace;color:#ffd700;letter-spacing:.06em;min-width:160px;box-shadow:0 0 20px rgba(255,200,0,.2);`;
    panel.innerHTML = `
      <div style="font-size:9px;color:rgba(255,200,0,.5);letter-spacing:.14em;margin-bottom:6px;">DEV MODE</div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="dev-all-wanderers"> All wanderers</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="dev-all-games"> All games unlocked</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="dev-utsuroba"> Utsuroba unlocked</label>
      <div id="dev-room-info" style="font-size:9px;color:rgba(255,200,0,.45);margin-top:8px;"></div>`;
    document.body.appendChild(panel);
    window.__devAllGames     = false;
    window.__devAllWanderers = false;
    window.__devUtsuroba     = false;
    document.getElementById('dev-all-games').addEventListener('change', function() { window.__devAllGames = this.checked; });
    document.getElementById('dev-all-wanderers').addEventListener('change', function() { window.__devAllWanderers = this.checked; refreshWanderersForRoom(); });
    document.getElementById('dev-utsuroba').addEventListener('change', function() { window.__devUtsuroba = this.checked; });
    setInterval(() => { const el = document.getElementById('dev-room-info'); if (el) el.textContent = `room: ${state.roomId} | moved: ${Math.round(state.distMovedSinceSpawn)}`; }, 200);
  }

  /* Patch _utsurobaCurriculumUnlocked to also respect dev flag */
  /* _utsurobaCurriculumUnlocked redeclared here so __devUtsuroba is in scope */

  function _utsurobaCurriculumUnlocked() {
    if (window.__devAllGames || window.__devUtsuroba) return true;
    try {
      if (window.BoohaAdventure && BoohaAdventure.scores) {
        const curricula = ['bc', 'br', 'pb'];
        for (const c of curricula) {
          if (BoohaAdventure.scores.weeklyCompletedFor(c) >= 9) return true;
        }
      }
    } catch (_) {}
    return false;
  }

  /* ═══════════════════════════════════════════
     DOM BUILD
  ═══════════════════════════════════════════ */
  function buildApp() {
    app       = document.createElement("div"); app.id = "karasuki-app";
    stage     = document.createElement("div"); stage.id = "karasuki-stage";
    roomLayer = document.createElement("div"); roomLayer.id = "karasuki-room-layer";
    canvas    = document.createElement("canvas"); canvas.id = "kara-canvas";
    const fade = document.createElement("div"); fade.id = "kara-fade";

    stage.appendChild(roomLayer); stage.appendChild(canvas); stage.appendChild(fade);
    app.appendChild(stage);

    coordToggle = document.createElement("div");
    coordToggle.id = "coord-toggle";
    coordToggle.innerHTML = `<span>COORDS</span><div class="toggle-pill"></div>`;
    if (DEV_MODE) coordToggle.addEventListener("click", toggleCoordMode);

    coordReadout = document.createElement("div");
    coordReadout.id = "coord-readout";
    coordReadout.innerHTML = `<span id="coord-xy">—</span><span class="hint">click to pin · hover to read</span>`;

    pinLog = document.createElement("div");
    pinLog.id = "pin-log";
    pinLog.innerHTML = `<div class="log-header"><span>PINS — ${state.roomId}</span><span class="clear-btn" id="clear-pins">CLEAR</span></div><div id="pin-rows"></div>`;

    const toast = document.createElement("div");
    toast.id = "copy-toast"; toast.textContent = "copied!";

    portalOverlay = document.createElement("div");
    portalOverlay.id = "portal-overlay";
    portalOverlay.innerHTML = `
      <div id="portal-box">
        <p id="portal-en">Do you want to go to your profile page?</p>
        <p id="portal-ja">プロフィールページに行きますか？</p>
        <p id="portal-kanji">貴方の横顔の頁へ参りますか？</p>
        <button class="portal-btn" id="portal-yes">Yes</button>
        <button class="portal-btn" id="portal-no">No</button>
      </div>`;

    document.body.innerHTML = "";
    document.body.appendChild(app);

    if (DEV_MODE) {
      document.body.appendChild(coordToggle);
      document.body.appendChild(coordReadout);
      document.body.appendChild(pinLog);
    }

    document.body.appendChild(toast);
    document.body.appendChild(portalOverlay);

    injectBonusPopOverlay();
    injectWandererPopOverlay();
    injectUtsuobaPopOverlay();

    if (DEV_MODE) injectDevPanel();

    const rotateOverlay = document.createElement("div");
    rotateOverlay.id = "rotate-overlay";
    rotateOverlay.innerHTML = `
      <span class="rotate-phone">📱</span>
      <div class="rotate-bar"></div>
      <p class="rotate-title">横にして遊ぼう！</p>
      <p class="rotate-sub">カラスキは<strong style="color:#ff79d7">横画面</strong>で遊べるよ。<br>スマホを横にしてね。</p>`;
    document.body.appendChild(rotateOverlay);

    ctx = canvas.getContext("2d");

    document.getElementById("clear-pins").addEventListener("click", () => { pins = []; renderPinLog(); });
    document.getElementById("portal-yes").addEventListener("click", () => {
      try { sessionStorage.setItem('karasuki_return_room', 'room_08'); } catch (_) {}
      window.location.href = PORTAL.href;
    });
    document.getElementById("portal-no").addEventListener("click", closePortal);
    portalOverlay.addEventListener("click", (e) => { if (e.target === portalOverlay) closePortal(); });
  }

  function openPortal()  { portalOverlay.classList.add("active"); state.clickTarget = null; }
  function closePortal() { portalOverlay.classList.remove("active"); }
  function isPortalOpen(){ return portalOverlay.classList.contains("active"); }

  function exitToMaze() {
    if (state.mazeExiting) return;
    state.mazeExiting = true; state.clickTarget = null;
    try { music.pause(); music.currentTime = 0; } catch (_) {}
    try {
      sessionStorage.setItem('booha_return_to_checkpoint', '1');
      const storedWeek  = sessionStorage.getItem('booha_active_week');
      const storedGhost = sessionStorage.getItem('booha_active_ghost');
      if (storedWeek)  sessionStorage.setItem('booha_return_week',  storedWeek);
      if (storedGhost) sessionStorage.setItem('booha_return_ghost', storedGhost);
      sessionStorage.setItem('booha_return_ix', String(MAZE_EXIT.treeIX));
      sessionStorage.setItem('booha_return_iy', String(MAZE_EXIT.treeIY));
    } catch (_) {}
    const fadeEl = document.getElementById("kara-fade");
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`;
    fadeEl.style.opacity    = "1";
    setTimeout(() => { window.location.href = MAZE_EXIT.mazeUrl; }, FADE_MS + 60);
  }

  /* ═══════════════════════════════════════════
     CANVAS / FIT
  ═══════════════════════════════════════════ */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width  = WORLD_W + "px"; canvas.style.height = WORLD_H + "px";
    canvas.width  = Math.round(WORLD_W * dpr); canvas.height = Math.round(WORLD_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function fitStage() {
    const scale = Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  /* ═══════════════════════════════════════════
     COORD MODE
  ═══════════════════════════════════════════ */
  function toggleCoordMode() {
    state.coordMode = !state.coordMode;
    coordToggle.classList.toggle("active", state.coordMode);
    coordReadout.classList.toggle("show", state.coordMode);
    pinLog.classList.toggle("show", state.coordMode);
    pinLog.querySelector(".log-header span").textContent = `PINS — ${state.roomId}`;
  }

  function dropPin(wx, wy) {
    const label = `${Math.round(wx)}, ${Math.round(wy)}`;
    pins.push({ x: wx, y: wy, label }); renderPinLog(); copyText(label); showToast(`pinned ${label}`);
  }

  function renderPinLog() {
    const rows = document.getElementById("pin-rows"); if (!rows) return;
    rows.innerHTML = pins.map((p, i) => `<div class="pin-row" data-i="${i}"><span class="pin-idx">${i + 1}</span><span class="pin-coords">${p.label}</span><span class="pin-copy">copy</span></div>`).join("");
    rows.querySelectorAll(".pin-row").forEach(row => { row.addEventListener("click", () => { const pin = pins[+row.dataset.i]; if (pin) { copyText(pin.label); showToast(`copied ${pin.label}`); } }); });
  }

  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById("copy-toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1400);
  }

  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); return; } catch (_) {}
    try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch (_) {}
  }

  /* ═══════════════════════════════════════════
     ROOM HELPERS
  ═══════════════════════════════════════════ */
  function getRoom()  { return DATA.rooms[state.roomId]; }

  function getSpawn(room, spawnId) {
    return room.spawns?.[spawnId] || room.spawns?.default || { x: 480, y: 270 };
  }

  function placeGhost(x, y) { state.x = x; state.y = y; }

  function makeBg(src) {
    const img = document.createElement("img"); img.className = "karasuki-bg"; img.src = src; return img;
  }

  let currentBg;
  function renderInitialRoom() {
    const room = getRoom(); currentBg = makeBg(room.bg); roomLayer.appendChild(currentBg);
    const spawn = getSpawn(room, state.spawnId); placeGhost(spawn.x, spawn.y);
    state.spawnX = spawn.x; state.spawnY = spawn.y;
    const now = performance.now();
    state.transitionReadyAt = now + TRANSITION_COOLDOWN_MS;
    arrivalArrowHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS;
    arrivalArrowBackHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER;
    state.distMovedSinceSpawn = 0; state.clickTarget = null; state.moving = false;
    state.spawnLockUntil = now + 500;
  }

  /* ═══════════════════════════════════════════
     COLLISION
  ═══════════════════════════════════════════ */
  function clampToWorld(nx, ny) { return { x: Math.max(GHOST_RADIUS, Math.min(WORLD_W - GHOST_RADIUS, nx)), y: Math.max(GHOST_RADIUS, Math.min(WORLD_H - GHOST_RADIUS, ny)) }; }
  function pointInRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }
  function canMoveTo(nx, ny) { const rects = getRoom()?.collisions || []; if (!rects.length) return true; for (const r of rects) { if (pointInRect(nx, ny, r)) return true; } return false; }
  function tryMove(nx, ny) {
    const c = clampToWorld(nx, ny);
    if (canMoveTo(c.x, c.y)) { placeGhost(c.x, c.y); return true; }
    const tx = clampToWorld(nx, state.y); if (canMoveTo(tx.x, tx.y)) { placeGhost(tx.x, tx.y); return true; }
    const ty = clampToWorld(state.x, ny); if (canMoveTo(ty.x, ty.y)) { placeGhost(ty.x, ty.y); return true; }
    return false;
  }

  /* ═══════════════════════════════════════════
     FADE TRANSITION
  ═══════════════════════════════════════════ */
  function transitionTo(exit) {
    if (!exit?.to || state.transitioning) return;
    const nextRoom = DATA.rooms[exit.to]; if (!nextRoom) return;
    state.transitioning = true; state.clickTarget = null;
    const fadeEl = document.getElementById("kara-fade");
    fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-in`; fadeEl.style.opacity = "1";
    setTimeout(() => {
      const nextBg = makeBg(nextRoom.bg); roomLayer.innerHTML = ""; roomLayer.appendChild(nextBg); currentBg = nextBg;
      state.roomId = exit.to; onRoomChanged(); state.spawnId = exit.spawn || "default";
      const spawn = getSpawn(nextRoom, state.spawnId); placeGhost(spawn.x, spawn.y);
      state.spawnX = spawn.x; state.spawnY = spawn.y; state.arrivalDir = exit.dir || null;
      trail = []; pins = [];
      const now = performance.now();
      state.transitionReadyAt = now + TRANSITION_COOLDOWN_MS;
      arrivalArrowHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS;
      arrivalArrowBackHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER;
      state.distMovedSinceSpawn = 0;
      const lh = pinLog.querySelector(".log-header span"); if (lh) lh.textContent = `PINS — ${state.roomId}`;
      renderPinLog();
      fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-out`; fadeEl.style.opacity = "0";
      setTimeout(() => { state.transitioning = false; }, FADE_MS / 2 + 30);
    }, FADE_MS / 2 + 20);
  }

  function getNPPExit(now) {
    if (now < state.transitionReadyAt) return null;
    const npps = NPP[state.roomId]; if (!npps) return null;
    const OPPOSITE = { left:'right', right:'left', up:'down', down:'up' };
    const arrivalExit = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    for (const npp of npps) {
      if (Math.hypot(state.x - npp.x, state.y - npp.y) <= NPP_RADIUS) {
        if (npp.dir === arrivalExit && now < arrivalArrowBackHiddenUntil) return null;
        return npp;
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════
     TRAIL
  ═══════════════════════════════════════════ */
  function addTrailParticle(x, y, now) {
    if (now - state.lastTrailT < 45) return; state.lastTrailT = now;
    const [col1, col2] = roomColorPair(state.roomId);
    trail.push({ x: x + (Math.random() - 0.5) * 10, y: y + GHOST_R * 0.55 + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 0.4, vy: -Math.random() * 0.5, life: 1, size: 2 + Math.random() * 4.5, color: Math.random() > 0.5 ? col1 : col2 });
    if (trail.length > TRAIL_MAX) trail.shift();
  }

  /* ═══════════════════════════════════════════
     DRAW EXIT ARROWS
  ═══════════════════════════════════════════ */
  function drawExitArrows(now) {
    const npps = NPP[state.roomId]; if (!npps) return;
    const moved = state.distMovedSinceSpawn; const moveReveal = Math.min(1, moved / ARROW_MOVE_THRESHOLD);
    if (moveReveal <= 0) return;
    const sec = now / 1000; const [col1, col2] = roomColorPair(state.roomId);
    const OPPOSITE = { left: "right", right: "left", up: "down", down: "up" };
    const arrivalExit = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    npps.forEach((npp, i) => {
      if (!npp.dir) return;
      const isBackDir = (npp.dir === arrivalExit);
      const hiddenUntil = isBackDir ? arrivalArrowBackHiddenUntil : arrivalArrowHiddenUntil;
      const delayRemaining = hiddenUntil - now;
      if (delayRemaining > 400) return;
      const revealFade = Math.min(1, Math.max(0, 1 - (delayRemaining / (isBackDir ? ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER : ARRIVAL_ARROW_DELAY_MS))));
      const angle = DIR_ANGLE[npp.dir] ?? 0; const pulse = 0.5 + 0.5 * Math.sin(sec * 2.2 + i * 1.3);
      const bounce = Math.sin(sec * 2.2 + i * 1.3) * 6;
      const ax = npp.x + Math.cos(angle) * bounce; const ay = npp.y + Math.sin(angle) * bounce;
      const fadeAlpha = revealFade * moveReveal;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(angle);
      const ga = ctx.createRadialGradient(0, 0, 0, 0, 0, 40); ga.addColorStop(0, col1); ga.addColorStop(1, "transparent");
      ctx.globalAlpha = fadeAlpha * (0.10 + pulse * 0.08); ctx.fillStyle = ga;
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
      [{ ox: -11, a: 0.65 }, { ox: 4, a: 1.0 }].forEach(({ ox, a }) => {
        ctx.globalAlpha = fadeAlpha * a * (0.38 + pulse * 0.32); ctx.strokeStyle = col1; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowBlur = 12; ctx.shadowColor = col2;
        ctx.beginPath(); ctx.moveTo(ox - 7, -10); ctx.lineTo(ox + 7, 0); ctx.lineTo(ox - 7, 10); ctx.stroke(); ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = fadeAlpha * (0.60 + pulse * 0.38); ctx.fillStyle = "#fff"; ctx.shadowBlur = 14; ctx.shadowColor = col1;
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     DRAW PORTAL ORB
  ═══════════════════════════════════════════ */
  const PORTAL_COLORS = ['#8b00ff','#00bfff','#ff007f','#00ff99','#ffaa00','#aa00ff'];

  function drawPortalOrb(now) {
    if (state.roomId !== "room_08") return;
    const sec = now / 1000;
    const cycleT = (sec * 0.28) % PORTAL_COLORS.length;
    const idx0 = Math.floor(cycleT) % PORTAL_COLORS.length;
    const idx1 = (idx0 + 1) % PORTAL_COLORS.length;
    const t = cycleT - Math.floor(cycleT);
    const col = lerpHex(PORTAL_COLORS[idx0], PORTAL_COLORS[idx1], t);
    const col2 = lerpHex(PORTAL_COLORS[(idx1 + 1) % PORTAL_COLORS.length], PORTAL_COLORS[(idx1 + 2) % PORTAL_COLORS.length], t);
    const pulse = 0.5 + 0.5 * Math.sin(sec * 2.6); const pulse2 = 0.5 + 0.5 * Math.sin(sec * 1.8 + 1.2);
    ctx.save();
    const ambient = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, 72);
    ambient.addColorStop(0, col + "00"); ambient.addColorStop(0.3, col + "28"); ambient.addColorStop(0.6, col + "44"); ambient.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.55 + pulse * 0.35; ctx.fillStyle = ambient; ctx.beginPath(); ctx.arc(PORTAL.x, PORTAL.y, 72, 0, Math.PI * 2); ctx.fill();
    const cloud2 = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, 52);
    cloud2.addColorStop(0, col2 + "00"); cloud2.addColorStop(0.25, col2 + "22"); cloud2.addColorStop(0.55, col2 + "38"); cloud2.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.4 + pulse2 * 0.3; ctx.fillStyle = cloud2; ctx.beginPath(); ctx.arc(PORTAL.x, PORTAL.y, 52, 0, Math.PI * 2); ctx.fill();
    const innerR = 10 + pulse * 6;
    const energy = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, innerR * 2.8);
    energy.addColorStop(0, "transparent"); energy.addColorStop(0.25, col + "55"); energy.addColorStop(0.55, col + "cc"); energy.addColorStop(0.75, col + "66"); energy.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.85 + pulse * 0.13; ctx.shadowBlur = 18 + pulse * 16; ctx.shadowColor = col; ctx.fillStyle = energy; ctx.beginPath(); ctx.arc(PORTAL.x, PORTAL.y, innerR * 2.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    const dotCount = 8;
    for (let d = 0; d < dotCount; d++) {
      const ringR = 18 + pulse * 4 + (d % 2) * 8; const speed = d % 2 === 0 ? 0.7 : -0.5;
      const angle = (sec * speed) + (d / dotCount) * Math.PI * 2;
      const dx = PORTAL.x + Math.cos(angle) * ringR; const dy = PORTAL.y + Math.sin(angle) * ringR;
      const sparkA = 0.3 + 0.7 * Math.abs(Math.sin(sec * 2.5 + d * 0.8)); const sparkR = 1.2 + pulse * 1.0;
      ctx.globalAlpha = sparkA; const sparkCol = d % 2 === 0 ? col : col2;
      ctx.fillStyle = sparkCol; ctx.shadowBlur = 8; ctx.shadowColor = sparkCol;
      ctx.beginPath(); ctx.arc(dx, dy, sparkR, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    const wispCount = 3;
    for (let w = 0; w < wispCount; w++) {
      const wAngle = (sec * 0.4) + (w / wispCount) * Math.PI * 2; const wR = 14 + pulse2 * 5;
      ctx.globalAlpha = 0.18 + pulse * 0.14; ctx.strokeStyle = w % 2 === 0 ? col : col2; ctx.lineWidth = 1.5; ctx.shadowBlur = 10; ctx.shadowColor = col;
      ctx.beginPath(); ctx.arc(PORTAL.x, PORTAL.y, wR, wAngle, wAngle + Math.PI * 0.7); ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  /* ═══════════════════════════════════════════
     DRAW MAZE EXIT ARROW
  ═══════════════════════════════════════════ */
  function drawMazeExitArrow(now) {
    if (state.roomId !== MAZE_EXIT.roomId) return;
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD); if (moveReveal <= 0) return;
    const sec = now / 1000; const pulse = 0.5 + 0.5 * Math.sin(sec * 2.4); const bounce = Math.sin(sec * 2.4) * 7;
    const ax = MAZE_EXIT.x; const ay = MAZE_EXIT.y + bounce;
    const col1 = "#44ff88"; const col2 = "#aa44ff"; const col3 = "#aaffcc";
    ctx.save(); ctx.globalAlpha = moveReveal;
    const ambient = ctx.createRadialGradient(ax, ay, 0, ax, ay, 56);
    ambient.addColorStop(0, col1 + "44"); ambient.addColorStop(0.5, col2 + "22"); ambient.addColorStop(1, "transparent");
    ctx.globalAlpha = moveReveal * (0.18 + pulse * 0.14); ctx.fillStyle = ambient; ctx.beginPath(); ctx.arc(ax, ay, 56, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.PI / 2);
    [{ ox: -12, a: 0.55 }, { ox: 5, a: 1.0 }].forEach(({ ox, a }) => {
      ctx.globalAlpha = moveReveal * a * (0.42 + pulse * 0.38); ctx.strokeStyle = col1; ctx.lineWidth = 3.0; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowBlur = 16; ctx.shadowColor = col2;
      ctx.beginPath(); ctx.moveTo(ox - 9, -12); ctx.lineTo(ox + 9, 0); ctx.lineTo(ox - 9, 12); ctx.stroke(); ctx.shadowBlur = 0;
    });
    ctx.restore();
    ctx.globalAlpha = moveReveal * (0.70 + pulse * 0.28); ctx.shadowBlur = 18; ctx.shadowColor = col1;
    const dotG = ctx.createRadialGradient(ax, ay, 0, ax, ay, 7);
    dotG.addColorStop(0, col3); dotG.addColorStop(0.5, col1); dotG.addColorStop(1, "transparent");
    ctx.fillStyle = dotG; ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.globalAlpha = moveReveal * (0.55 + pulse * 0.25); ctx.font = "bold 13px monospace"; ctx.fillStyle = col3; ctx.textAlign = "center"; ctx.shadowBlur = 10; ctx.shadowColor = col1;
    ctx.fillText("MAZE", ax, ay - 28); ctx.shadowBlur = 0; ctx.textAlign = "left"; ctx.restore();
  }

  function lerpHex(a, b, t) {
    const ah = parseInt(a.replace('#',''), 16), bh = parseInt(b.replace('#',''), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const rr = Math.round(ar + (br - ar) * t), rg = Math.round(ag + (bg - ag) * t), rb = Math.round(ab + (bb - ab) * t);
    return '#' + [rr, rg, rb].map(v => v.toString(16).padStart(2,'0')).join('');
  }

  /* ═══════════════════════════════════════════
     DRAW PINS
  ═══════════════════════════════════════════ */
  function drawPins(now) {
    if (!state.coordMode || !pins.length) return;
    const sec = now / 1000;
    pins.forEach((p, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(sec * 3 + i);
      ctx.save();
      ctx.globalAlpha = 0.80 + pulse * 0.18; ctx.strokeStyle = "#ff8ae2"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(p.x - 14, p.y); ctx.lineTo(p.x + 14, p.y); ctx.moveTo(p.x, p.y - 14); ctx.lineTo(p.x, p.y + 14); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.fillStyle = "#ff4fc8"; ctx.shadowBlur = 8; ctx.shadowColor = "#ff8ae2";
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = "bold 10px monospace"; const tw = ctx.measureText(p.label).width; const bx = p.x + 10, by = p.y - 18;
      ctx.globalAlpha = 0.88; ctx.fillStyle = "rgba(0,0,0,.75)";
      ctx.beginPath(); ctx.roundRect(bx - 4, by - 11, tw + 10, 15, 5); ctx.fill();
      ctx.fillStyle = "#ff8ae2"; ctx.globalAlpha = 1; ctx.fillText(`${i + 1}. ${p.label}`, bx + 1, by);
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     MAIN DRAW FRAME
  ═══════════════════════════════════════════ */
  function drawFrame(now) {
    ctx.clearRect(0, 0, WORLD_W, WORLD_H);
    const sec = now / 1000;
    const [col1, col2] = roomColorPair(state.roomId);

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i]; rp.life -= 0.038; if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = rp.life * 0.72; ctx.strokeStyle = "rgba(255,138,226,.95)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, (1 - rp.life) * 38 + 5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }

    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
      gr.addColorStop(0, p.color); gr.addColorStop(1, "transparent");
      ctx.globalAlpha = p.life * 0.48; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = p.life * 0.90; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; p.life -= 0.022; p.x += p.vx; p.y += p.vy;
    }
    trail = trail.filter(p => p.life > 0);

    drawPortalOrb(now);
    drawExitArrows(now);
    drawMazeExitArrow(now);
    drawBonusTrees(now);
    drawUtsurobPortalMarker(now);
    drawWanderers(now);

    const bobFreq = (Math.PI * 2) / (HOVER_PERIOD / 1000); const bobPhase = sec * bobFreq;
    const bob = Math.sin(bobPhase) * HOVER_AMP; const wobble = Math.sin(bobPhase * 2) * 2.2;
    const gx = state.x, gy = state.y + bob;
    const pulse = 0.5 + 0.5 * Math.sin(sec * 2.1);
    const stretchY = 1 + Math.sin(bobPhase) * 0.10; const stretchX = 1 - Math.sin(bobPhase) * 0.07;
    const sx = stretchX, sy = stretchY * (state.moving ? 1.08 : 1.0);

    ctx.save();
    ctx.globalAlpha = 0.22 + pulse * 0.12;
    const halo = ctx.createRadialGradient(gx, gy + 3, 0, gx, gy + 3, GHOST_R * 2.2);
    halo.addColorStop(0, col1); halo.addColorStop(0.5, col2); halo.addColorStop(1, "transparent");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(gx, gy + 3, GHOST_R * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.18 + pulse * 0.07;
    const shd = ctx.createRadialGradient(gx, gy + GHOST_R * 0.85, 0, gx, gy + GHOST_R * 0.85, GHOST_R * 0.9);
    shd.addColorStop(0, "rgba(0,0,0,.65)"); shd.addColorStop(1, "transparent");
    ctx.fillStyle = shd; ctx.beginPath(); ctx.arc(gx, gy + GHOST_R * 0.85, GHOST_R * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save(); ctx.translate(gx, gy); ctx.rotate(wobble * Math.PI / 180); ctx.scale(sx, sy);
    if (ghostImg.complete && ghostImg.naturalWidth > 0) { ctx.drawImage(ghostImg, -GHOST_R, -GHOST_R, GHOST_R * 2, GHOST_R * 2); }
    else { ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, GHOST_R * 0.7, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();

    drawPins(now);
  }

  /* ═══════════════════════════════════════════
     MOVEMENT
  ═══════════════════════════════════════════ */
  function handleClickMovement(now) {
    if (!state.clickTarget) { state.moving = false; return; }
    const tx = state.clickTarget.x, ty = state.clickTarget.y;
    const dx = tx - state.x, dy = ty - state.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= CLICK_STOP_DIST) { state.clickTarget = null; state.moving = false; return; }
    const prevX = state.x, prevY = state.y;
    const moved = tryMove(state.x + (dx / dist) * SPEED, state.y + (dy / dist) * SPEED);
    state.moving = moved;
    if (!moved) { state.clickTarget = null; state.moving = false; }
    else { state.distMovedSinceSpawn += Math.hypot(state.x - prevX, state.y - prevY); addTrailParticle(state.x, state.y, now); }
  }

  /* ═══════════════════════════════════════════
     MAIN LOOP
  ═══════════════════════════════════════════ */
  function tick(now) {
    const dt = Math.min(50, Math.max(8, now - (lastTickTime || now)));
    lastTickTime = now;
    SPEED = BASE_SPEED * (dt / TARGET_DT);

    const anyModalOpen =
      state.transitioning ||
      isPortalOpen() ||
      state.mazeExiting ||
      isBonusPopOpen() ||
      isWandererPopOpen() ||
      isUtsuobaPopOpen();

    if (!anyModalOpen) {
      handleClickMovement(now);
      updateWanderers(now);

      const spawnUnlocked =
        now >= (state.spawnLockUntil || 0) &&
        state.distMovedSinceSpawn >= ARROW_MOVE_THRESHOLD;

      if (state.roomId === "room_08" && state.moving) {
        const dPortal = Math.hypot(state.x - PORTAL.x, state.y - PORTAL.y);
        if (dPortal <= PORTAL_TRIGGER_R) { state.clickTarget = null; state.moving = false; openPortal(); }
      }

      if (spawnUnlocked && state.roomId === MAZE_EXIT.roomId) {
        const dMaze = Math.hypot(state.x - MAZE_EXIT.x, state.y - MAZE_EXIT.y);
        if (dMaze <= MAZE_EXIT.r) { state.clickTarget = null; state.moving = false; exitToMaze(); }
      }

      /* Utsuroba portal proximity check */
      if (spawnUnlocked) checkUtsuobaPortal();

      if (spawnUnlocked) {
        const exit = getNPPExit(now);
        if (exit) { state.clickTarget = null; state.moving = false; transitionTo(exit); }
      }
    }

    drawFrame(now);
    requestAnimationFrame(tick);
  }

  /* ═══════════════════════════════════════════
     MUSIC
  ═══════════════════════════════════════════ */
  function startMusic() {
    if (state.musicStarted) return;
    state.musicStarted = true;
    music.play().catch(() => {});
  }

  /* ═══════════════════════════════════════════
     INPUT
  ═══════════════════════════════════════════ */
  function stagePointToWorld(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width)  * WORLD_W;
    const y = ((clientY - rect.top)  / rect.height) * WORLD_H;
    return clampToWorld(x, y);
  }

  function isNearPortal(p) {
    return state.roomId === "room_08" && Math.hypot(p.x - PORTAL.x, p.y - PORTAL.y) <= PORTAL.r;
  }

  function bindInput() {
    stage.addEventListener("mousemove", (e) => {
      if (!DEV_MODE || !state.coordMode) return;
      const p = stagePointToWorld(e.clientX, e.clientY);
      const el = document.getElementById("coord-xy"); if (el) el.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
    });

    stage.addEventListener("click", (e) => {
      startMusic();
      if (state.transitioning) return;
      const p = stagePointToWorld(e.clientX, e.clientY);
      if (state.coordMode) { dropPin(p.x, p.y); ripples.push({ x: p.x, y: p.y, life: 1 }); return; }
      if (isNearPortal(p)) { openPortal(); ripples.push({ x: p.x, y: p.y, life: 1 }); return; }
      if (clickCheckUtsuobaPortal(p.x, p.y)) { ripples.push({ x: p.x, y: p.y, life: 1 }); return; }
      if (clickCheckWanderers(p.x, p.y)) { ripples.push({ x: p.x, y: p.y, life: 1 }); return; }
      if (clickBonusTree(p.x, p.y)) { ripples.push({ x: p.x, y: p.y, life: 1 }); return; }
      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
    });

    stage.addEventListener("touchend", (e) => {
      startMusic();
      if (state.transitioning || !e.changedTouches.length) return;
      const t0 = e.changedTouches[0];
      const p  = stagePointToWorld(t0.clientX, t0.clientY);
      if (state.coordMode) { dropPin(p.x, p.y); ripples.push({ x: p.x, y: p.y, life: 1 }); e.preventDefault(); return; }
      if (isNearPortal(p)) { openPortal(); ripples.push({ x: p.x, y: p.y, life: 1 }); e.preventDefault(); return; }
      if (clickCheckUtsuobaPortal(p.x, p.y)) { ripples.push({ x: p.x, y: p.y, life: 1 }); e.preventDefault(); return; }
      if (clickCheckWanderers(p.x, p.y)) { ripples.push({ x: p.x, y: p.y, life: 1 }); e.preventDefault(); return; }
      if (clickBonusTree(p.x, p.y)) { ripples.push({ x: p.x, y: p.y, life: 1 }); e.preventDefault(); return; }
      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
      e.preventDefault();
    }, { passive: false });

    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePortal(); });
    document.addEventListener("click",    startMusic, { once: false });
    document.addEventListener("touchend", startMusic, { once: false, passive: true });
  }

  /* ═══════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════ */
  function init() {
    injectStyles();
    buildApp();
    fitStage();
    resizeCanvas();
    renderInitialRoom();
    initWanderers();
    bindInput();
    window.addEventListener("resize", () => { fitStage(); resizeCanvas(); });
    requestAnimationFrame(tick);
  }

  init();
})();
