Ini full js 

// LOCK HEIGHT BIAR GA KETARIK KEYBOARD
function lockHeight() {
  const vh = window.innerHeight;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
lockHeight();
window.addEventListener('resize', () => {
  if (Math.abs(window.innerHeight - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--vh'))) > 150) {
    lockHeight();
  }
});

// === MODAL TV CHANNELS ===
const tvModal = document.getElementById('tvModal');
const tvClose = document.getElementById('tvClose');
const tvModalContent = document.querySelector('.tv-modal-content');
const leftSidebar = document.querySelector('.left-sidebar');
let TV_CHANNELS = [];

async function openTVModal() {
  const sidebarHeight = leftSidebar.offsetHeight;
  tvModalContent.style.top = sidebarHeight + 'px';

  tvModal.classList.add('show');
  document.body.style.overflow = 'hidden';

  const grid = document.getElementById('tvGrid');
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#666;padding:20px;">Loading...</div>';

  try {
    if (TV_CHANNELS.length === 0) {
      const res = await fetch('chinel.json');
      TV_CHANNELS = await res.json();
    }

    grid.innerHTML = TV_CHANNELS.map(ch => `
      <div class="channel-card" onclick="selectTVChannel('${ch.url}', '${ch.name}')">
        <div class="channel-logo">
          <img src="${ch.logo}" alt="${ch.name}" loading="lazy">
          ${ch.status!== 'Online'? '<div class="offline-badge">OFF</div>' : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#ef4444;padding:20px;">Gagal load channel</div>';
  }
}

function closeTVModal() {
  tvModal.classList.remove('show');
  document.body.style.overflow = '';
}

tvClose.addEventListener('click', closeTVModal);
tvModal.addEventListener('click', (e) => {
  if (e.target === tvModal) closeTVModal();
});

function selectTVChannel(url, name) {
  closeTVModal();
  playerPoster.classList.add('hide');
  scoreboard.innerText = name;
  playerFrame.src = url;
  channelSelectBar.style.display = 'none';
  currentMatch = null;
}
// === END MODAL TV ===

const SPORTS = [
  { id: 'livetv', name: 'TV', icon:''},
  { id: 'football', name: 'Football', icon: '⚽' },
  { id: 'badminton', name: 'Badminton', icon: '🏸' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'motogp', name: 'MotoGP', icon: '🏍️' },
  { id: 'f1', name: 'Formula 1', icon: '🏎️' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' }
];

let MATCHES = [];
let ALL_MATCHES = [];
let currentMatch = null;
let currentChannelUrl = null;

const playerFrame = document.getElementById('playerFrame');
const leagueBar = document.getElementById('leagueBar');
const scoreboard = document.getElementById('scoreboard');
const popupOverlay = document.getElementById('popupOverlay');
const matchPopup = document.getElementById('matchPopup');
const popupTitle = document.getElementById('popupTitle');
const popupList = document.getElementById('popupList');
const popupClose = document.getElementById('popupClose');
const scrollLeftBtn = document.getElementById('scrollLeft');
const scrollRightBtn = document.getElementById('scrollRight');
const channelSelectBar = document.getElementById('channelSelectBar');
const playerPoster = document.getElementById('playerPoster');
let activeLeague = 'LIVE';

function isMatchLive(match) {
  const start = new Date(`${match.kickoff_date}T${match.kickoff_time}:00`);
  const end = new Date(start.getTime() + match.duration * 60000);
  const now = new Date();
  return now >= start && now <= end;
}

function filterActiveMatches() {
  const now = new Date();
  MATCHES = ALL_MATCHES.filter(m => {
    const end = new Date(`${m.kickoff_date}T${m.kickoff_time}:00`);
    end.setMinutes(end.getMinutes() + m.duration);
    return now <= end;
  });
}

function renderLeagueBar() {
  filterActiveMatches();
  leagueBar.innerHTML = '';
  const liveCount = MATCHES.filter(m => isMatchLive(m)).length;

  const liveBtn = document.createElement('div');
  liveBtn.className = 'league-item';
  liveBtn.dataset.league = 'LIVE';
  liveBtn.innerHTML = `<span class="dot"></span>LIVE<span class="badge">${liveCount}</span>`;
  liveBtn.onclick = () => openPopup('LIVE');
  leagueBar.appendChild(liveBtn);

  SPORTS.forEach(sport => {
    const count = MATCHES.filter(m => m.sport === sport.id).length;
    const btn = document.createElement('div');
    btn.className = 'league-item';
    btn.dataset.sport = sport.id;

    if (sport.id === 'livetv') {
      btn.innerHTML = `<span class="dot" style="background:#3b82f6;"></span>${sport.name}`;
    } else {
      btn.innerHTML = `
        <span class="sport-icon">${sport.icon}</span>
        ${sport.name}
        ${count > 0? `<span class="badge">${count}</span>` : ''}
      `;
    }

    btn.onclick = () => openPopup(sport.id, sport.name);
    leagueBar.appendChild(btn);
  });
  setTimeout(updateScrollButtons, 100);
}

function updateScrollButtons() {
  scrollLeftBtn.disabled = leagueBar.scrollLeft <= 0;
  scrollRightBtn.disabled = leagueBar.scrollLeft >= leagueBar.scrollWidth - leagueBar.clientWidth - 1;
}
scrollLeftBtn.onclick = () => leagueBar.scrollBy({ left: -200, behavior: 'smooth' });
scrollRightBtn.onclick = () => leagueBar.scrollBy({ left: 200, behavior: 'smooth' });
leagueBar.addEventListener('scroll', updateScrollButtons);

function openPopup(type, title = '') {
  if (type === 'livetv') {
    openTVModal();
    return;
  }

  activeLeague = type;
  popupTitle.innerText = title || (type === 'LIVE'? 'Sedang Berlangsung' : type);

  const sidebarHeight = leftSidebar.offsetHeight;
  matchPopup.style.top = sidebarHeight + 'px';

  renderPopupList();
  popupOverlay.classList.add('show');
  matchPopup.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closePopup() {
  popupOverlay.classList.remove('show');
  matchPopup.classList.remove('show');
  document.body.style.overflow = '';
}
popupOverlay.onclick = closePopup;
popupClose.onclick = closePopup;

function renderPopupList() {
  filterActiveMatches();
  popupList.innerHTML = '';
  let filtered = activeLeague === 'LIVE'
 ? MATCHES.filter(m => isMatchLive(m))
    : MATCHES.filter(m => m.sport === activeLeague);

  if (filtered.length === 0) {
    popupList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">Belum ada Pertandingan...</div>';
    return;
  }
  filtered.forEach(match => {
    const isLive = isMatchLive(match);
    const dateObj = new Date(`${match.kickoff_date}T00:00:00`);
    const tgl = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

    const item = document.createElement('div');
    item.className = 'popup-match-item';
    item.innerHTML = `
      <div class="popup-match-teams">
        <img src="${match.league_logo}" alt="${match.league}">
        <div class="popup-match-detail">
          <div class="popup-match-name">${match.team1.name} vs ${match.team2.name}</div>
          <div class="popup-match-league">${match.league} • ${tgl}</div>
        </div>
      </div>
      <div class="popup-match-info">
        ${isLive? '<div class="popup-match-live">● LIVE</div>' : ''}
        <div class="popup-match-time">${match.kickoff_time}</div>
      </div>
    `;
    item.onclick = () => selectMatch(match);
    popupList.appendChild(item);
  });
}

function selectMatch(match) {
  closePopup();
  currentMatch = match;
  scoreboard.innerText = `${match.team1.name} vs ${match.team2.name} | ${match.kickoff_time}`;
  renderChannelButtons(match.channels);
  playerPoster.classList.add('hide');
  if (match.channels.length > 0) {
    loadChannel(match.channels[0].url, match.channels[0].name);
  }
}

function renderChannelButtons(channels) {
  channelSelectBar.innerHTML = '';
  if (!channels || channels.length === 0) {
    channelSelectBar.style.display = 'none';
    playerFrame.src = '';
    return;
  }
  channelSelectBar.style.display = 'flex';
  channels.forEach((ch, i) => {
    const btn = document.createElement('button');
    btn.className = 'channel-btn';
    if (i === 0) btn.classList.add('active');
    btn.innerText = ch.name;
    btn.onclick = () => loadChannel(ch.url, ch.name);
    channelSelectBar.appendChild(btn);
  });
}

function loadChannel(url, name) {
  currentChannelUrl = url;
  playerFrame.src = url;
  document.querySelectorAll('.channel-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText === name);
  });
}

async function init() {
  try {
    // 1. List semua file JSON yang mau di-load
    const files = ['skod.json', 'minton.json']; // tambahin file lain di sini

    // 2. Fetch semua file barengan
    const allData = await Promise.all(
      files.map(async (file) => {
        const res = await fetch(file);
        if (!res.ok) throw new Error(`${file} 404`);
        return res.json();
      })
    );

    // 3. Gabungin semua array jadi 1
    ALL_MATCHES = allData.flat();

    // 4. Sort by tanggal + jam biar urut
    ALL_MATCHES.sort((a, b) => {
      const dateA = new Date(`${a.kickoff_date}T${a.kickoff_time}:00`);
      const dateB = new Date(`${b.kickoff_date}T${b.kickoff_time}:00`);
      return dateA - dateB;
    });

    renderLeagueBar();

    // 5. Cari match yang lagi live
    const firstLive = ALL_MATCHES.find(m => isMatchLive(m));
    if (firstLive) {
      selectMatch(firstLive);
    } else {
      playerPoster.classList.remove('hide');
      scoreboard.innerText = 'Pilih match dulu';
    }

    // 6. Interval update tiap menit
    setInterval(() => {
      renderLeagueBar();
      if (matchPopup.classList.contains('show')) renderPopupList();
      if (currentMatch &&!isMatchLive(currentMatch)) {
        playerFrame.src = '';
        channelSelectBar.style.display = 'none';
        playerPoster.classList.remove('hide');
        scoreboard.innerText = 'Jadwal habis';
        currentMatch = null;
      }
    }, 60000);

  } catch (err) {
    console.error('INIT GAGAL:', err);
    leagueBar.innerHTML = `<div style="padding:12px; color:#ef4444; font-size:12px;">Gagal load: ${err.message}</div>`;
  }
}

// FIREBASE CHAT
const firebaseConfig = {
  apiKey: "AIzaSyDkZDZfkueidOiRB1hPBUSXhhBJICGj-C4",
  authDomain: "sibaltv.firebaseapp.com",
  databaseURL: "https://sibaltv-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sibaltv",
  storageBucket: "sibaltv.firebasestorage.app",
  messagingSenderId: "625753841479",
  appId: "1:625753841479:web:e6281e31fdcc5deddd3662"
};

const ADMIN_NAMES = ["Admin", "SibalTV"];
const USER_COLORS = ['#14b8a6', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#ec4899', '#3b82f6', '#f97316'];
const CHAT_EXPIRE_DAYS = 2;

firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref('sibaltv_chat');

const msgInput = document.getElementById('chat-msg');
const nameInput = document.getElementById('chat-name');
const sendBtn = document.getElementById('chat-send');
const chatBox = document.getElementById('chatBox');

nameInput.value = localStorage.getItem('chatName') || '';
nameInput.onchange = () => localStorage.setItem('chatName', nameInput.value);

function getUserColor(name) {
  if (ADMIN_NAMES.includes(name)) return '#f59e0b';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}.${minutes} WIB`;
}

function cleanOldChat() {
  const cutoff = Date.now() - (CHAT_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
  db.orderByChild('time').endAt(cutoff).once('value', snapshot => {
    snapshot.forEach(child => {
      child.ref.remove();
    });
  });
}

cleanOldChat();
setInterval(cleanOldChat, 60 * 60 * 1000);

db.limitToLast(50).on('child_added', (data) => {
  const msg = data.val();
  if (!msg ||!msg.name ||!msg.text ||!msg.time) return;

  const cutoff = Date.now() - (CHAT_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
  if (msg.time < cutoff) return;

  const isAdmin = ADMIN_NAMES.includes(msg.name);
  const color = getUserColor(msg.name);
  const initial = msg.name.charAt(0).toUpperCase();
  const time = msg.time? formatTime(msg.time) : '';

  const el = document.createElement('div');
  el.className = 'chat-msg';
  el.innerHTML = `
    <div class="chat-avatar" style="background:${color}">${initial}</div>
    <div class="chat-content">
      <div class="chat-header">
        <span class="chat-name" style="color:${color}">
          ${isAdmin? '⭐ ' : ''}${msg.name}
        </span>
        <span class="chat-time">${time}</span>
      </div>
      <div class="chat-text">${msg.text}</div>
    </div>
  `;

  chatBox.prepend(el);
});

function sendChat() {
  const name = nameInput.value.trim() || 'Anon';
  const text = msgInput.value.trim();
  if (!text) return;

  db.push({
    name: name,
    text: text,
    time: Date.now()
  }).then(() => {
    msgInput.value = '';
  }).catch((error) => {
    console.error('GAGAL KIRIM:', error);
    alert('Gagal kirim chat: ' + error.message);
  });
}

sendBtn.onclick = sendChat;
msgInput.onkeydown = (e) => { if (e.key === 'Enter') sendChat(); };

init();