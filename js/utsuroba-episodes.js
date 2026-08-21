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
})();
