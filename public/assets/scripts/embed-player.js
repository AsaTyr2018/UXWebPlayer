const root = document.getElementById('player-root');
const PLAYER_VARIANTS = ['large', 'medium', 'small', 'background'];

const normalizeVariant = (value) => {
  if (typeof value === 'string' && PLAYER_VARIANTS.includes(value)) {
    return value;
  }

  return 'medium';
};

const applyPlayerVariant = (variant) => {
  if (!root) {
    return;
  }

  root.dataset.playerVariant = variant;
  if (document.body) {
    document.body.dataset.playerVariant = variant;
  }
};

const setSubtitle = (text) => {
  const subtitle = root?.querySelector('.player-subtitle');
  if (subtitle) {
    subtitle.textContent = text;
  }
};

const removePlaybackSection = () => {
  if (!root) {
    return;
  }

  const playbackSection = root.querySelector('.player-playback');
  if (playbackSection) {
    playbackSection.remove();
  }
};

const ensureStatusSection = () => {
  if (!root) {
    return null;
  }

  removePlaybackSection();

  let statusSection = root.querySelector('.player-status');
  if (!statusSection) {
    statusSection = document.createElement('section');
    statusSection.className = 'player-status';
    root.appendChild(statusSection);
  }

  return statusSection;
};

const renderStatus = (title, message) => {
  applyPlayerVariant('medium');

  const ambient = root?.querySelector('.background-audio');
  if (ambient) {
    ambient.remove();
  }

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

const renderBackgroundPlayback = (payload) => {
  if (!root) {
    return;
  }

  applyPlayerVariant('background');

  const statusSection = root.querySelector('.player-status');
  if (statusSection) {
    statusSection.remove();
  }

  removePlaybackSection();

  let audio = root.querySelector('.background-audio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.className = 'background-audio';
    audio.controls = false;
    audio.preload = 'auto';
    audio.autoplay = true;
    audio.setAttribute('aria-hidden', 'true');
    root.appendChild(audio);
  }

  const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];

  if (tracks.length === 0) {
    audio.removeAttribute('src');
    return;
  }

  let currentIndex = 0;

  const setTrack = (index) => {
    currentIndex = index;
    const track = tracks[currentIndex];
    audio.src = track.src;
    audio.dataset.trackId = track.id;
    audio.dataset.trackIndex = String(currentIndex);
  };

  audio.onended = () => {
    if (tracks.length === 0) {
      return;
    }

    const nextIndex = (currentIndex + 1) % tracks.length;
    setTrack(nextIndex);
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  };

  setTrack(0);

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      console.warn('Background playback requires user interaction before audio can start.');
    });
  }
};

const renderStandardPlayback = (payload, variant) => {
  if (!root) {
    return;
  }

  applyPlayerVariant(variant);

  const statusSection = root.querySelector('.player-status');
  if (statusSection) {
    statusSection.remove();
  }

  removePlaybackSection();

  const ambient = root.querySelector('.background-audio');
  if (ambient) {
    ambient.remove();
  }

  const playbackSection = document.createElement('section');
  playbackSection.className = 'player-playback';
  playbackSection.dataset.variant = variant;

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

  if (variant === 'small') {
    audio.controlsList = 'nodownload noplaybackrate';
  }

  const feedback = document.createElement('p');
  feedback.className = 'playback-feedback';
  feedback.textContent = variant === 'small' ? 'Press play to start.' : 'Press play to start the stream.';
  feedback.hidden = true;

  const list = document.createElement('ol');
  list.className = 'track-list';

  const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
  let currentIndex = 0;
  let visualizationContainer = null;
  let artworkImage = null;
  let visualizationStage = null;
  let artworkFadeTimeoutId = 0;

  const updateActiveTrack = () => {
    const items = list.querySelectorAll('li');
    items.forEach((item, index) => {
      item.classList.toggle('active', index === currentIndex);
    });
  };

  const formatTrackLabel = (track) => {
    return track.artist ? `${track.title} — ${track.artist}` : track.title;
  };

  const clearArtworkFade = () => {
    if (artworkFadeTimeoutId) {
      window.clearTimeout(artworkFadeTimeoutId);
      artworkFadeTimeoutId = 0;
    }
  };

  const updateVisualizationArtwork = (track) => {
    if (!visualizationContainer || !visualizationStage) {
      return;
    }

    clearArtworkFade();

    const hasArtwork = typeof track.artworkUrl === 'string' && track.artworkUrl.length > 0;

    if (!hasArtwork) {
      if (artworkImage) {
        artworkImage.removeAttribute('src');
        artworkImage.alt = '';
      }

      visualizationContainer.classList.remove('has-artwork', 'show-artwork', 'artwork-faded');
      return;
    }

    visualizationContainer.classList.add('has-artwork');
    visualizationContainer.classList.remove('artwork-faded');

    if (artworkImage) {
      artworkImage.src = track.artworkUrl;
      artworkImage.alt = track.title ? `Cover art for ${track.title}` : 'Cover art';
    }

    requestAnimationFrame(() => {
      visualizationContainer.classList.add('show-artwork');
      artworkFadeTimeoutId = window.setTimeout(() => {
        visualizationContainer.classList.add('artwork-faded');
      }, 5000);
    });
  };

  const setTrack = (index) => {
    currentIndex = index;
    const track = tracks[currentIndex];
    audio.src = track.src;
    audio.setAttribute('data-track-id', track.id);
    audio.setAttribute('data-track-index', String(currentIndex));
    nowPlayingTrack.textContent = formatTrackLabel(track);
    updateActiveTrack();
    updateVisualizationArtwork(track);
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
    if (currentIndex < tracks.length - 1) {
      setTrack(currentIndex + 1);
      tryPlay();
    }
  });

  tracks.forEach((track, index) => {
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

  if (variant === 'large') {
    const playlistColumn = document.createElement('div');
    playlistColumn.className = 'player-large-playlist';
    playlistColumn.appendChild(list);

    visualizationContainer = document.createElement('div');
    visualizationContainer.className = 'player-visualization';

    const artworkWrapper = document.createElement('div');
    artworkWrapper.className = 'player-artwork';

    artworkImage = document.createElement('img');
    artworkImage.alt = '';
    artworkImage.decoding = 'async';
    artworkImage.loading = 'eager';
    artworkWrapper.appendChild(artworkImage);

    visualizationStage = document.createElement('div');
    visualizationStage.className = 'player-visualization-stage';
    visualizationStage.dataset.state = 'placeholder';
    visualizationStage.innerHTML = '<span aria-hidden="true">Visualization coming soon</span>';

    visualizationContainer.append(artworkWrapper, visualizationStage);

    const transport = document.createElement('div');
    transport.className = 'player-transport';
    transport.append(nowPlaying, audio, feedback);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'player-large-right';
    rightColumn.append(visualizationContainer, transport);

    playbackSection.append(playlistColumn, rightColumn);
  } else {
    playbackSection.append(nowPlaying, audio, feedback, list);
  }

  root.appendChild(playbackSection);

  setTrack(0);
  tryPlay();
};

const renderPlayback = (payload, variant) => {
  const normalizedVariant = normalizeVariant(variant);

  if (normalizedVariant === 'background') {
    renderBackgroundPlayback(payload);
    return;
  }

  renderStandardPlayback(payload, normalizedVariant);
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
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Unexpected response: ${response.status}`);
    }

    const payload = await response.json();
    const { endpoint, playlist, tracks } = payload;
    const variant = normalizeVariant(endpoint?.playerVariant);

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

    renderPlayback(payload, variant);

    if (endpoint.status === 'degraded') {
      const feedback = root.querySelector('.playback-feedback');
      if (feedback instanceof HTMLElement) {
        feedback.hidden = false;
        feedback.textContent = 'Streaming in degraded mode. Playback issues may occur.';
        feedback.dataset.persistent = 'true';
      } else if (variant === 'background') {
        console.warn('Background playback is running in degraded mode.');
      }
    }
  } catch (error) {
    renderStatus('Playback unavailable.', 'The player could not reach the media service. Please try again later.');
  }
};

void initialize();
