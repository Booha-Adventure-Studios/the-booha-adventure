/*
 * Karasuki Cards (カラスキーカード) — card registry.
 *
 * One entry per Wanderer card, in the FIXED host order. `no` is the number
 * printed on the card ("No. 01"); there is deliberately no total, because
 * Wanderers are still being added. Numbers are permanent once a card ships:
 * never renumber a shipped card, only append or fill a reserved slot.
 *
 * `art: null` reserves a number for a Wanderer whose Lv.1 art is not ready.
 * Unshipped cards are skipped by the host rotation until their art lands;
 * the moment one ships it becomes the next host for every student who has
 * not won it yet.
 *
 * `id` matches KARASUKI_WANDERER_DATA[name].id (js/karasuki-wanderer-data.js),
 * which also supplies the card's kind (friendly / mischievous / dangerous)
 * and flavour line, so the copy has one source of truth.
 *
 * Order after No. 04 is PROVISIONAL until Bryan confirms it.
 */
window.KARASUKI_CARDS = Object.freeze([
  { no: 1,  id: 'mister-happy',     name: 'Mister Happy',     art: 'assets/img/cards/karasuki-card-mister-happy-lv1.webp' },
  { no: 2,  id: 'tom-katsu',        name: 'Tom Katsu',        art: null },
  { no: 3,  id: 'kara-ageha',       name: 'Kara Ageha',       art: null },
  { no: 4,  id: 'jinguru-kan',      name: 'Jinguru Kan',      art: null },
  { no: 5,  id: 'uhibon',           name: 'Uhibon',           art: 'assets/img/cards/karasuki-card-uhibon-lv1.webp' },
  { no: 6,  id: 'october-moriyama', name: 'October Moriyama', art: 'assets/img/cards/karasuki-card-october-lv1.webp' },
  { no: 7,  id: 'jacki',            name: 'Jacki',            art: 'assets/img/cards/karasuki-card-jacki-lv1.webp' },
  { no: 8,  id: 'jamariko',         name: 'Jamariko',         art: 'assets/img/cards/karasuki-card-jamariko-lv1.webp' },
  { no: 9,  id: 'takachika-green',  name: 'Takachika Green',  art: 'assets/img/cards/karasuki-card-takachika-lv1.webp' },
  { no: 10, id: 'poopika',          name: 'Poopika',          art: 'assets/img/cards/karasuki-card-poopika-lv1.webp' },
  { no: 11, id: 'sumiyo-horaguchi', name: 'Sumiyo Horaguchi', art: 'assets/img/cards/karasuki-card-sumiyo-lv1.webp' },
].map(card => Object.freeze(card)));
