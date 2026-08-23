/*
 * Utsuroba episode loader.
 *
 * Story authors edit JSON under content/utsuroba/episodes/. The loader keeps
 * the runtime contract small and makes the same episode data available to
 * future tools, validators, and the reading UI.
 */
(function () {
  const INDEX_URL = './content/utsuroba/episodes/index.json';
  const episodes = Object.create(null);

  window.UTSUROBA_EPISODES = episodes;
  window.UTSUROBA_EPISODES_READY = fetch(INDEX_URL)
    .then(response => {
      if (!response.ok) throw new Error(`Episode index failed: ${response.status}`);
      return response.json();
    })
    .then(index => {
      if (!index || !Array.isArray(index.episodes)) {
        throw new Error('Episode index must contain an episodes array.');
      }
      window.UTSUROBA_EPISODE_INDEX = index;
      window.UTSUROBA_CONVERGENCE_EPISODE_IDS = Array.isArray(index.convergenceEpisodeIds)
        ? index.convergenceEpisodeIds.slice() : [];
      return Promise.all(index.episodes.map(entry => {
        if (!entry || !entry.id || !entry.file) {
          throw new Error('Episode index entry needs id and file.');
        }
        return fetch(`./content/utsuroba/episodes/${entry.file}`)
          .then(response => {
            if (!response.ok) throw new Error(`Episode ${entry.id} failed: ${response.status}`);
            return response.json();
          })
          .then(episode => {
            if (episode.id !== entry.id) throw new Error(`Episode id mismatch: ${entry.id}`);
            episodes[episode.id] = episode;
            return episode;
          });
      }));
    })
    .catch(error => {
      console.error('[Utsuroba] Episode loading failed:', error);
      throw error;
    });

  /*
   * Difficulty resolution — Fresh Memory / Deep Memory.
   *
   * Story authors may nest a "fresh" object inside an episode (same id,
   * same rooms/checks shape, simpler wording) as an easier on-ramp for
   * younger students. The episode's id, title, and worldEcho always stay
   * the canonical ones — only the reading content itself varies — so every
   * other part of the save (readingEchoes, readingJournal, convergence,
   * relationships) keeps working unchanged regardless of which tier a
   * student reads in.
   *
   * Defaults to 'deep' (today's content, unchanged) so existing saves and
   * students see no difference until they opt into Fresh Memory.
   */
  function getReadingDifficulty() {
    try {
      const save = window.BoohaAdventure && BoohaAdventure.save
        ? BoohaAdventure.save.load() : null;
      return (save && save.utsuroba && save.utsuroba.readingDifficulty === 'fresh')
        ? 'fresh' : 'deep';
    } catch (_) { return 'deep'; }
  }

  // difficultyOverride lets a caller resolve a *specific* tier (e.g. "what
  // did this student actually read when they completed this memory?") in
  // contexts like journal history, rather than whatever the live toggle
  // says right now. Omit it to resolve against the current save setting.
  function resolveEpisode(id, difficultyOverride) {
    const episode = episodes[id];
    if (!episode) return episode;
    const difficulty = difficultyOverride === 'fresh' || difficultyOverride === 'deep'
      ? difficultyOverride : getReadingDifficulty();
    if (difficulty === 'fresh' && episode.fresh) {
      const merged = Object.assign({}, episode, episode.fresh);
      delete merged.fresh;
      // mechanic and postcard mix shared branding (type/name; title/
      // instruction) with tier-specific copy. A fresh block only overrides
      // the copy, so these two go one level deeper instead of a flat
      // object replace — everything else in .fresh is a full parallel
      // array/object and replaces its base counterpart wholesale.
      if (episode.mechanic && episode.fresh.mechanic) {
        merged.mechanic = Object.assign({}, episode.mechanic, episode.fresh.mechanic);
      }
      if (episode.postcard && episode.fresh.postcard) {
        merged.postcard = Object.assign({}, episode.postcard, episode.fresh.postcard);
      }
      merged.difficulty = 'fresh';
      return merged;
    }
    return Object.assign({ difficulty: 'deep' }, episode);
  }

  window.UTSUROBA_READING_DIFFICULTY = getReadingDifficulty;
  window.UTSUROBA_EPISODES_RESOLVE = resolveEpisode;
})();
