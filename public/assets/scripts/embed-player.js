const root = document.getElementById('player-root');

const setSubtitle = (text) => {
  const subtitle = root?.querySelector('.player-subtitle');
  if (subtitle) {
    subtitle.textContent = text;
  }
};

const ensureStatusSection = () => {
  if (!root) {
    return null;
  }

  let statusSection = root.querySelector('.player-status');
  if (!statusSection) {
    statusSection = document.createElement('section');
    statusSection.className = 'player-status';
    root.appendChild(statusSection);
  }

  const playbackSection = root.querySelector('.player-playback');
  if (playbackSection) {
    playbackSection.remove();
  }

  return statusSection;
};

const renderStatus = (title, message) => {
  const statusSection = ensureStatusSection();
  if (!statusSection) {
    return;
  }

  statusSection.innerHTML = `
    <p>
      <strong>${title}</strong>
      ${message}
    </p>
  `;
};

const renderPlayback = (payload) => {
  if (!root) {
    return;
  }

  const existingStatus = root.querySelector('.player-status');
  if (existingStatus) {
    existingStatus.remove();
  }

  const existingPlayback = root.querySelector('.player-playback');
  if (existingPlayback) {
    existingPlayback.remove();
  }

  const playbackSection = document.createElement('section');
  playbackSection.className = 'player-playback';

  const nowPlaying = document.createElement('div');
  nowPlaying.className = 'now-playing';

  const nowPlayingHeading = document.createElement('strong');
  nowPlayingHeading.textContent = 'Now playing';

  const nowPlayingTrack = document.createElement('p');
  nowPlayingTrack.className = 'now-playing-track';

  nowPlaying.append(nowPlayingHeading, nowPlayingTrack);

  const audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'none';
  audio.className = 'player-audio';

  const feedback = document.createElement('p');
  feedback.className = 'playback-feedback';
  feedback.textContent = 'Press play to start the stream.';
  feedback.hidden = true;

  const list = document.createElement('ol');
  list.className = 'track-list';

  let currentIndex = 0;

  const updateActiveTrack = () => {
    const items = list.querySelectorAll('li');
    items.forEach((item, index) => {
      item.classList.toggle('active', index === currentIndex);
    });
  };

  const formatTrackLabel = (track) => {
    return track.artist ? `${track.title} — ${track.artist}` : track.title;
  };

  const setTrack = (index) => {
    currentIndex = index;
    const track = payload.tracks[currentIndex];
    audio.src = track.src;
    audio.setAttribute('data-track-id', track.id);
    audio.setAttribute('data-track-index', String(currentIndex));
    nowPlayingTrack.textContent = formatTrackLabel(track);
    updateActiveTrack();
  };

  const tryPlay = () => {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        feedback.hidden = false;
        feedback.dataset.persistent = 'false';
      });
    }
  };

  audio.addEventListener('play', () => {
    if (feedback.dataset.persistent === 'true') {
      return;
    }

    feedback.hidden = true;
  });

  audio.addEventListener('ended', () => {
    if (currentIndex < payload.tracks.length - 1) {
      setTrack(currentIndex + 1);
      tryPlay();
    }
  });

  payload.tracks.forEach((track, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = formatTrackLabel(track);
    button.addEventListener('click', () => {
      setTrack(index);
      tryPlay();
    });
    item.appendChild(button);
    list.appendChild(item);
  });

  playbackSection.append(nowPlaying, audio, feedback, list);
  root.appendChild(playbackSection);

  setTrack(0);
  tryPlay();
};

const initialize = async () => {
  if (!root) {
    return;
  }

  const slug = root.dataset.endpointSlug || window.__UX_EMBED_SLUG__;

  if (!slug) {
    renderStatus('Endpoint missing.', 'Unable to determine the requested playlist.');
    return;
  }

  setSubtitle(`Endpoint ${slug}`);
  renderStatus('Loading stream.', 'Fetching playlist metadata.');

  try {
    const response = await fetch(`/api/embed/${encodeURIComponent(slug)}/stream`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Unexpected response: ${response.status}`);
    }

    const payload = await response.json();
    const { endpoint, playlist, tracks } = payload;

    if (playlist) {
      setSubtitle(`${playlist.name} • ${endpoint.name}`);
    } else {
      setSubtitle(`${endpoint.name}`);
    }

    if (endpoint.status === 'disabled') {
      renderStatus('Endpoint disabled.', 'This endpoint has been deactivated in the admin console.');
      return;
    }

    if (!playlist) {
      renderStatus('Playlist required.', 'Assign a playlist to this endpoint to start playback.');
      return;
    }

    if (endpoint.status === 'pending') {
      renderStatus('Activation pending.', 'Enable this endpoint from the admin console to begin streaming.');
      return;
    }

    if (!Array.isArray(tracks) || tracks.length === 0) {
      renderStatus('No media available.', 'Upload ready tracks to the assigned playlist.');
      return;
    }

    renderPlayback(payload);

    if (endpoint.status === 'degraded') {
      const feedback = root.querySelector('.playback-feedback');
      if (feedback instanceof HTMLElement) {
        feedback.hidden = false;
        feedback.textContent = 'Streaming in degraded mode. Playback issues may occur.';
        feedback.dataset.persistent = 'true';
      }
    }
  } catch (error) {
    renderStatus('Playback unavailable.', 'The player could not reach the media service. Please try again later.');
  }
};

void initialize();
