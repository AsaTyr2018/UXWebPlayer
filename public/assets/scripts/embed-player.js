const root = document.getElementById('player-root');

if (root) {
  const slug = root.dataset.endpointSlug || window.__UX_EMBED_SLUG__;
  const subtitle = root.querySelector('.player-subtitle');
  const status = root.querySelector('.player-status p');

  if (!slug) {
    root.innerHTML = `
      <section class="player-status">
        <strong>Endpoint missing.</strong>
        Unable to determine the requested playlist.
      </section>
    `;
  } else {
    if (subtitle) {
      subtitle.textContent = `Endpoint ${slug}`;
    }

    if (status) {
      status.innerHTML = `
        <strong>Waiting for media.</strong>
        Connect this endpoint to a published playlist from the admin console to start playback.
      `;
    }
  }
}
