/* API key loaded from feed-config.js (gitignored) */
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
    avatar: '/assets/avatars/josh.png',
    url: 'https://www.youtube.com/@Joshespi',
  },
  {
    playlistId: 'UUD7M2v8IhRzAY901Q9sL_wQ',
    label: 'xanderman_luigi',
    member: 'xander',
    avatar: '/assets/avatars/xander.png',
    url: 'https://www.youtube.com/@xanderman_luigi',
  },
];

const YT = 'https://www.googleapis.com/youtube/v3';
const VIDEOS_PER_CHANNEL = 4;

async function getLatestVideos(playlistId) {
  const res = await fetch(`${YT}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${VIDEOS_PER_CHANNEL}&key=${API_KEY}`);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json();
  return data.items ?? [];
}

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  for (const [n, label] of [[31536000,'year'],[2592000,'month'],[604800,'week'],[86400,'day'],[3600,'hour'],[60,'minute']]) {
    const v = Math.floor(s / n);
    if (v >= 1) return `${v} ${label}${v > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

function colMsg(text) {
  return `<p class="text-zinc-500 col-span-full text-sm">${text}</p>`;
}

function skeletons() {
  return Array(VIDEOS_PER_CHANNEL).fill(`
    <div class="rounded-xl overflow-hidden animate-pulse">
      <div class="bg-zinc-800 aspect-video w-full"></div>
      <div class="p-3 space-y-2">
        <div class="bg-zinc-800 h-3 rounded w-full"></div>
        <div class="bg-zinc-800 h-3 rounded w-3/4"></div>
        <div class="bg-zinc-800 h-2 rounded w-1/3 mt-2"></div>
      </div>
    </div>
  `).join('');
}

function videoCards(items) {
  if (!items.length) return colMsg('No videos found.');
  return items.map(({ snippet }) => {
    const { title, publishedAt, resourceId, thumbnails } = snippet;
    const thumb = thumbnails?.medium?.url ?? thumbnails?.high?.url ?? thumbnails?.default?.url ?? '';
    return `
      <a href="https://www.youtube.com/watch?v=${resourceId.videoId}"
         target="_blank" rel="noopener noreferrer"
         class="rounded-xl overflow-hidden block no-underline group">
        <div class="aspect-video overflow-hidden bg-zinc-800">
          <img src="${thumb}" alt="" loading="lazy"
               class="w-full h-full object-cover transition duration-200 group-hover:scale-[1.04]" />
        </div>
        <div class="p-3">
          <p class="font-semibold text-sm leading-snug text-zinc-100 line-clamp-2">${title}</p>
          <p class="text-xs text-zinc-500 mt-1">${timeAgo(publishedAt)}</p>
        </div>
      </a>
    `;
  }).join('');
}

function channelSection(ch) {
  const avatarInner = ch.avatar
    ? `<img src="${ch.avatar}" alt="" class="w-full h-full object-cover" />`
    : `<span class="text-xs font-bold">${ch.initials ?? ''}</span>`;
  return `
    <section data-member="${ch.member}">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-4">
          <div class="avatar avatar-sm">${avatarInner}</div>
          <h2>${ch.label}</h2>
        </div>
        <a href="${ch.url}" target="_blank" rel="noopener noreferrer"
           class="btn-ghost !text-sm !px-4 !py-2">
          All videos <span aria-hidden="true">→</span>
        </a>
      </div>
      <div id="grid-${ch.member}" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${skeletons()}
      </div>
    </section>
  `;
}

async function loadChannel(ch) {
  const grid = document.getElementById(`grid-${ch.member}`);
  try {
    const videos = await getLatestVideos(ch.playlistId);
    grid.innerHTML = videoCards(videos);
  } catch (e) {
    grid.innerHTML = colMsg('Couldn\'t load videos.');
    console.error(ch.label, e);
  }
}

function init() {
  if (!API_KEY) {
    document.getElementById('feed-container').innerHTML =
      '<p class="text-zinc-500 text-sm text-center">Set FEED_API_KEY in feed-config.js to load videos.</p>';
    return;
  }
  const container = document.getElementById('feed-container');
  container.innerHTML = CHANNELS.map(channelSection).join('');
  CHANNELS.forEach(loadChannel);
}

init();
