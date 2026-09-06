/* API key loaded from feed-config.js (gitignored, see feed-config.example.js).
   The key ships to the browser by necessity -- restrict it to an espifam.com
   HTTP referrer in the Google Cloud console so the quota can't be drained. */
const API_KEY = typeof FEED_API_KEY !== 'undefined' ? FEED_API_KEY : '';

const CHANNELS = [
  {
    playlistId: 'UU4k7TZuvJilBxWKTJ31v6Ug',
    label: 'EspiFamily70',
    member: 'family',
    initials: 'EF',
    url: 'https://www.youtube.com/@EspiFamily70',
  },
  {
    playlistId: 'UUwK6CKzqcWb9bC7WcHvpbHw',
    label: 'Espi',
    member: 'josh',
    avatar: '/assets/avatars/josh.webp',
    url: 'https://www.youtube.com/@Joshespi',
  },
  {
    playlistId: 'UUD7M2v8IhRzAY901Q9sL_wQ',
    label: 'xanderman_luigi',
    member: 'xander',
    avatar: '/assets/avatars/xander.webp',
    url: 'https://www.youtube.com/@xanderman_luigi',
  },
];

const YT = 'https://www.googleapis.com/youtube/v3';
const VIDEOS_PER_CHANNEL = 4;
const CACHE_PREFIX = 'espifam-feed:';
const CACHE_TTL_MS = 60 * 60 * 1000;

// Props are assigned, never parsed -- textContent included -- so third-party
// video titles can't become markup.
const el = (tag, className, props) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return props ? Object.assign(node, props) : node;
};

function readCache(playlistId) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + playlistId);
    if (!raw) return null;
    const { at, items } = JSON.parse(raw);
    return Date.now() - at < CACHE_TTL_MS ? items : null;
  } catch {
    return null;
  }
}

function writeCache(playlistId, items) {
  try {
    localStorage.setItem(CACHE_PREFIX + playlistId, JSON.stringify({ at: Date.now(), items }));
  } catch { /* quota or private mode; caching is best-effort */ }
}

async function fetchVideos(playlistId) {
  const res = await fetch(
    `${YT}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${VIDEOS_PER_CHANNEL}&key=${API_KEY}`
  );
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json();

  const items = (data.items ?? []).map(({ snippet }) => ({
    title: snippet.title,
    publishedAt: snippet.publishedAt,
    videoId: snippet.resourceId?.videoId,
    thumb:
      snippet.thumbnails?.medium?.url ??
      snippet.thumbnails?.high?.url ??
      snippet.thumbnails?.default?.url ??
      '',
  }));
  // An empty result is usually transient; caching it would show "No videos yet."
  // for the full hour.
  if (items.length) writeCache(playlistId, items);
  return items;
}

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  for (const [n, label] of [[31536000,'year'],[2592000,'month'],[604800,'week'],[86400,'day'],[3600,'hour'],[60,'minute']]) {
    const v = Math.floor(s / n);
    if (v >= 1) return `${v} ${label}${v > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

const message = (text) => el('p', 'text-faint col-span-full text-sm', { textContent: text });

function skeleton() {
  const card = el('div', 'rounded-xl overflow-hidden');
  card.append(el('div', 'skeleton aspect-video w-full'));
  const body = el('div', 'p-3 space-y-2');
  body.append(
    el('div', 'skeleton h-3 rounded w-full'),
    el('div', 'skeleton h-3 rounded w-3/4'),
    el('div', 'skeleton h-2 rounded w-1/3 mt-2')
  );
  card.append(body);
  return card;
}

function videoCard({ title, publishedAt, videoId, thumb }) {
  const card = el('a', 'rounded-xl overflow-hidden block no-underline group', {
    href: `https://www.youtube.com/watch?v=${videoId}`,
    target: '_blank',
    rel: 'noopener noreferrer',
  });

  const frame = el('div', 'aspect-video overflow-hidden bg-line');
  frame.append(el('img', 'w-full h-full object-cover transition duration-200 group-hover:scale-[1.04]', {
    src: thumb, alt: '', loading: 'lazy', width: 320, height: 180,
  }));

  const body = el('div', 'p-3');
  body.append(
    el('p', 'font-semibold text-sm leading-snug text-body line-clamp-2', { textContent: title }),
    el('p', 'text-xs text-faint mt-1', { textContent: timeAgo(publishedAt) })
  );

  card.append(frame, body);
  return card;
}

const cardsFor = (videos) => (videos.length ? videos.map(videoCard) : [message('No videos yet.')]);

// `cached` renders real cards immediately; only a cold channel gets skeletons.
function channelSection(ch, cached) {
  const section = el('section');
  section.dataset.member = ch.member;

  const header = el('div', 'flex items-center justify-between gap-4 mb-5 flex-wrap');
  const identity = el('div', 'flex items-center gap-4');
  const avatar = el('div', 'avatar avatar-sm');
  avatar.append(ch.avatar
    ? el('img', null, { src: ch.avatar, alt: '', width: 48, height: 48 })
    : el('span', 'text-xs font-bold', { textContent: ch.initials ?? '' }));
  identity.append(avatar, el('h2', null, { textContent: ch.label }));

  header.append(identity, el('a', 'btn-ghost btn-sm', {
    href: ch.url,
    target: '_blank',
    rel: 'noopener noreferrer',
    textContent: `All videos from ${ch.label} →`,
  }));

  const grid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-4');
  grid.append(...(cached ? cardsFor(cached) : Array.from({ length: VIDEOS_PER_CHANNEL }, skeleton)));

  section.append(header, grid);
  return { section, grid };
}

async function loadChannel(ch, grid) {
  try {
    grid.replaceChildren(...cardsFor(await fetchVideos(ch.playlistId)));
  } catch (e) {
    grid.replaceChildren(message("Couldn't load videos right now."));
    console.error(ch.label, e);
  }
}

function init() {
  const container = document.getElementById('feed-container');
  const settled = () => container.removeAttribute('aria-busy');

  if (!API_KEY) {
    container.replaceChildren(message('Set FEED_API_KEY in feed-config.js to load videos.'));
    settled();
    return;
  }

  const cached = CHANNELS.map((ch) => readCache(ch.playlistId));
  const grids = new Map();
  container.replaceChildren(...CHANNELS.map((ch, i) => {
    const { section, grid } = channelSection(ch, cached[i]);
    grids.set(ch, grid);
    return section;
  }));

  // Stays busy until the skeletons are actually replaced.
  const cold = CHANNELS.filter((_, i) => !cached[i]);
  if (!cold.length) return settled();
  Promise.allSettled(cold.map((ch) => loadChannel(ch, grids.get(ch)))).then(settled);
}

init();
