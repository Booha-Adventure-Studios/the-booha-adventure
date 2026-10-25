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
 * `nameJP` / `nameFurigana` match Karasuki's Wanderer list (js/karasuki.js) so
 * the binder can draw a card on pages that never load Karasuki.
 *
 * `id` matches KARASUKI_WANDERER_DATA[name].id (js/karasuki-wanderer-data.js),
 * which also supplies the card's kind (friendly / mischievous / dangerous)
 * and flavour line, so the copy has one source of truth.
 *
 * Art: 300×450 or 600×900 WebP (2:3), ~50 KB; budget line in PERFORMANCE-BUDGETS.md.
 */
// Live for students from Pass 2c. Set to false to hide the whole feature
// (map host, teaser, challenge); the dev panel can still turn it on.
window.KARASUKI_CARDS_ENABLED = true;

// One shared back for every card: shown face down on the map and in the
// introduction until the card is won.
window.KARASUKI_CARD_BACK = 'assets/img/cards/karasuki-card-back.webp';

window.KARASUKI_CARDS = Object.freeze([
  { no: 1,  id: 'mister-happy',     name: 'Mister Happy', nameJP: 'ミスター・ハッピー', art: 'assets/img/cards/karasuki-card-mister-happy-lv1.webp' },
  { no: 2,  id: 'tom-katsu',        name: 'Tom Katsu', nameJP: 'トム・カツ', art: 'assets/img/cards/karasuki-card-tom-katsu-lv1.webp' },
  { no: 3,  id: 'kara-ageha',       name: 'Kara Ageha', nameJP: 'カラ・アゲハ', art: 'assets/img/cards/karasuki-card-kara-ageha-lv1.webp' },
  { no: 4,  id: 'jinguru-kan',      name: 'Jinguru Kan', nameJP: 'ジングル・カン', art: 'assets/img/cards/karasuki-card-jinguru-kan-lv1.webp' },
  { no: 5,  id: 'uhibon',           name: 'Uhibon', nameJP: 'ウヒボン', art: 'assets/img/cards/karasuki-card-uhibon-lv1.webp' },
  { no: 6,  id: 'october-moriyama', name: 'October Moriyama', nameJP: '森山オクトーバー', nameFurigana: { "森山": "もりやま" }, art: 'assets/img/cards/karasuki-card-october-lv1.webp' },
  { no: 7,  id: 'jacki',            name: 'Jacki', nameJP: 'ジャッキー', art: 'assets/img/cards/karasuki-card-jacki-lv1.webp' },
  { no: 8,  id: 'jamariko',         name: 'Jamariko', nameJP: 'ジャマリコ', art: 'assets/img/cards/karasuki-card-jamariko-lv1.webp' },
  { no: 9,  id: 'takachika-green',  name: 'Takachika Green', nameJP: 'グリーン・タカチカ', art: 'assets/img/cards/karasuki-card-takachika-lv1.webp' },
  { no: 10, id: 'poopika',          name: 'Poopika', nameJP: 'プピカ', art: 'assets/img/cards/karasuki-card-poopika-lv1.webp' },
  { no: 11, id: 'sumiyo-horaguchi', name: 'Sumiyo Horaguchi', nameJP: '洞口すみよ', nameFurigana: { "洞口": "ほらぐち" }, art: 'assets/img/cards/karasuki-card-sumiyo-lv1.webp' },
  { no: 12, id: 'jubei-tsukigase',  name: 'Jubei Tsukigase', nameJP: '月ヶ瀬寿兵衛', nameFurigana: { "月ヶ瀬寿兵衛": "つきがせじゅべえ" }, art: 'assets/img/cards/karasuki-card-jubei-tsukigase-lv1.webp' },
].map(card => Object.freeze(card)));
