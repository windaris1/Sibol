const SPORTS = [
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
    btn.innerHTML = `
      <span class="sport-icon">${sport.icon}</span>
      ${sport.name}
      ${count > 0 ? `<span class="badge">${count}</span>` : ''}
    `;
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
  activeLeague = type;
  popupTitle.innerText = title || (type === 'LIVE' ? 'Pertandingan LIVE' : type);
  renderPopupList();
  popupOverlay.classList.add('show');
  matchPopup.classList.add('show');
}
function closePopup() {
  popupOverlay.classList.remove('show');
  matchPopup.classList.remove('show');
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
    popupList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">Ga ada jadwal</div>';
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
        ${isLive ? '<div class="popup-match-live">● LIVE</div>' : ''}
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
    const res = await fetch('matches.json');
    if (!res.ok) throw new Error('matches.json 404');
    
    ALL_MATCHES = await res.json();
    renderLeagueBar();
    
    const firstLive = MATCHES.find(m => isMatchLive(m));
    if (firstLive) {
      selectMatch(firstLive);
    } else {
      playerPoster.classList.remove('hide');
      scoreboard.innerText = 'Pilih match dulu';
    }

    setInterval(() => {
      renderLeagueBar();
      if (matchPopup.classList.contains('show')) renderPopupList();
      if (currentMatch && !isMatchLive(currentMatch)) {
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

db.limitToLast(50).on('child_added', (data) => {
  const msg = data.val();
  if (!msg || !msg.name || !msg.text) return;
  
  const isAdmin = ADMIN_NAMES.includes(msg.name);
  const color = getUserColor(msg.name);
  const initial = msg.name.charAt(0).toUpperCase();
  const time = msg.time ? formatTime(msg.time) : '';
  
  const el = document.createElement('div');
  el.className = 'chat-msg';
  el.innerHTML = `
    <div class="chat-avatar" style="background:${color}">${initial}</div>
    <div class="chat-content">
      <div class="chat-header">
        <span class="chat-name" style="color:${color}">
          ${isAdmin ? '⭐ ' : ''}${msg.name}
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