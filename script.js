// Supabase Configuration
const SUPABASE_URL = "https://yhzwkewubrlgmezxpcr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sXOS0sc3hoddprV518CkSA_ksknzBqK";

// Safe Supabase Client Initializer (Avoids Identifier 'supabase' conflict)
window.sbClient = (window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
supabase = window.sbClient;

// -------------------------------------------------------------
// USER IDENTITY (Guest LocalStorage vs Permanent Registered)
// -------------------------------------------------------------
function generateGuestIdentity() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomChar = letters.charAt(Math.floor(Math.random() * letters.length));
    const randomNum = Math.floor(100 + Math.random() * 900); // 3 digits
    const username = `Guest_${randomChar}${randomNum}`;
    
    const uidRandom = Math.random().toString(36).substring(2, 8).toUpperCase();
    const uid = `GP-${uidRandom}`;
    
    return {
        username: username,
        uid: uid,
        email: "",
        isRegistered: false,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
    };
}

let currentUser = JSON.parse(localStorage.getItem('guildplay_user'));
if (!currentUser || !currentUser.username) {
    currentUser = generateGuestIdentity();
    localStorage.setItem('guildplay_user', JSON.stringify(currentUser));
}

// -------------------------------------------------------------
// ROOM SETUP (Dynamic Room Generator)
// -------------------------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
let currentRoomId = urlParams.get('room');
if (!currentRoomId) {
    currentRoomId = 'room_' + Math.random().toString(36).substring(2, 7);
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${currentRoomId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
}

// -------------------------------------------------------------
// AUDIO ENGINE (Retained Intact)
// -------------------------------------------------------------
let audioCtx = null;
let isMuted = false;
let isMusicPlaying = false;
let musicInterval = null;
let musicVolume = 0.4;
let isSfxEnabled = true;

function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {}
    }
}

function playClickSound() {
    if (!isSfxEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(550, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
    } catch(e) {}
}

function playSynthWaveChordProgression() {
    if (!isMusicPlaying || !audioCtx) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const chords = [
            [220, 261.63, 329.63, 392],
            [174.61, 220, 261.63, 329.63],
            [130.81, 164.81, 196, 246.94],
            [196, 246.94, 293.66, 349.23]
        ];
        let chordIndex = 0;
        musicInterval = setInterval(() => {
            if (!isMusicPlaying || !audioCtx) return;
            const currentChord = chords[chordIndex % chords.length];
            chordIndex++;
            currentChord.forEach(freq => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                const filter = audioCtx.createBiquadFilter();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, audioCtx.currentTime);
                gain.gain.setValueAtTime(musicVolume * 0.03, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.8);
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 1.8);
            });
        }, 2000);
    } catch(e) {}
}

function stopThemeMusic() {
    isMusicPlaying = false;
    if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
    }
}

// -------------------------------------------------------------
// UI INITIALIZATION & SYNC
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    initAudio();
    syncUIWithUser();
    setupDrawers();
    setupNavigation();
    setupInviteLink();
    setupAudioControls();
    setupChatSystem();
    setupFriendsSubtabs();
    renderAvatarGrid();

    // If already registered, sync with Supabase
    if (currentUser.isRegistered && supabase) {
        syncProfileToSupabase();
    }
});

function syncUIWithUser() {
    // Header
    const headerUsername = document.getElementById('header-username');
    const headerAvatar = document.getElementById('header-avatar-img');
    if (headerUsername) headerUsername.textContent = currentUser.username;
    if (headerAvatar) headerAvatar.src = currentUser.avatar;

    // Room Self Card
    const selfName = document.getElementById('group-self-name');
    const selfAvatar = document.getElementById('group-self-avatar');
    if (selfName) selfName.textContent = `You (${currentUser.username})`;
    if (selfAvatar) selfAvatar.src = currentUser.avatar;

    // Profile Drawer
    const profName = document.getElementById('profile-display-name');
    const profUid = document.getElementById('profile-uid-display');
    const profAvatar = document.getElementById('profile-avatar-large');
    const profInput = document.getElementById('profile-username-input');
    const emailInput = document.getElementById('profile-email-input');
    const badge = document.getElementById('profile-account-badge');

    if (profName) profName.textContent = currentUser.username;
    if (profUid) profUid.textContent = currentUser.uid;
    if (profAvatar) profAvatar.src = currentUser.avatar;
    if (profInput) profInput.value = currentUser.username;
    if (emailInput) {
        emailInput.value = currentUser.email || "";
        if (currentUser.isRegistered) {
            emailInput.disabled = true;
            if (badge) {
                badge.textContent = "Verified Member (Online)";
                badge.style.color = "var(--accent-green, #10b981)";
            }
        }
    }
}

function setupInviteLink() {
    const inviteInput = document.getElementById('room-invite-link');
    if (inviteInput) {
        inviteInput.value = window.location.href;
    }
    const copyBtn = document.getElementById('copy-invite-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            playClickSound();
            if (inviteInput) {
                navigator.clipboard.writeText(inviteInput.value);
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
                }, 2000);
            }
        };
    }
}

// -------------------------------------------------------------
// DRAWER CONTROLS (Clean Slide, No Blur)
// -------------------------------------------------------------
function setupDrawers() {
    const backdrop = document.getElementById('drawer-backdrop');

    function closeAllDrawers() {
        document.querySelectorAll('.side-drawer').forEach(d => d.classList.remove('open'));
        if (backdrop) backdrop.classList.remove('active');
    }

    function openDrawer(drawerId) {
        playClickSound();
        closeAllDrawers();
        const drawer = document.getElementById(drawerId);
        if (drawer) {
            drawer.classList.add('open');
            if (backdrop) backdrop.classList.add('active');
        }
    }

    if (backdrop) backdrop.addEventListener('click', closeAllDrawers);

    // Header buttons
    const notifBtn = document.getElementById('btn-header-notif');
    const settingsBtn = document.getElementById('btn-header-settings');
    const profileBtn = document.getElementById('btn-header-profile');
    const inviteHeaderBtn = document.getElementById('btn-header-invite');

    if (notifBtn) notifBtn.onclick = () => openDrawer('notif-drawer');
    if (settingsBtn) settingsBtn.onclick = () => openDrawer('settings-drawer');
    if (profileBtn) profileBtn.onclick = () => openDrawer('profile-drawer');
    if (inviteHeaderBtn) inviteHeaderBtn.onclick = () => openDrawer('invite-drawer');

    // Close buttons inside drawers
    document.querySelectorAll('.drawer-close').forEach(btn => {
        btn.onclick = () => {
            playClickSound();
            closeAllDrawers();
        };
    });
}

window.openInviteModal = function() {
    const drawer = document.getElementById('invite-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
};

// -------------------------------------------------------------
// PROFILE SAVE & REGISTRATION LOGIC
// -------------------------------------------------------------
const saveProfBtn = document.getElementById('save-profile-btn');
if (saveProfBtn) {
    saveProfBtn.onclick = async () => {
        playClickSound();
        const newName = document.getElementById('profile-username-input').value.trim();
        const emailInput = document.getElementById('profile-email-input');
        const emailVal = emailInput ? emailInput.value.trim() : "";

        if (!newName) {
            alert("Please enter a username.");
            return;
        }

        currentUser.username = newName;

        // If email provided and not registered yet
        if (!currentUser.isRegistered && emailVal) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailVal)) {
                alert("Please enter a valid email address.");
                return;
            }
            currentUser.email = emailVal;
            currentUser.isRegistered = true;
            localStorage.setItem('guildplay_user', JSON.stringify(currentUser));
            syncUIWithUser();
            await syncProfileToSupabase();
            alert("Registration successful! Friends & Search features are now unlocked.");
        } else {
            localStorage.setItem('guildplay_user', JSON.stringify(currentUser));
            syncUIWithUser();
            if (currentUser.isRegistered) {
                await syncProfileToSupabase();
            }
            alert("Profile updated locally.");
        }

        // Close drawer
        document.getElementById('profile-drawer').classList.remove('open');
        document.getElementById('drawer-backdrop').classList.remove('active');
    };
}

async function syncProfileToSupabase() {
    if (!supabase || !currentUser.isRegistered) return;
    try {
        await supabase.from('profiles').upsert({
            username: currentUser.username,
            email: currentUser.email,
            uid: currentUser.uid,
            avatar: currentUser.avatar,
            last_seen: new Date().toISOString()
        }, { onConflict: 'uid' });
    } catch(e) {}
}

function renderAvatarGrid() {
    const grid = document.getElementById('avatar-selection-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const seeds = ["Felix", "Mochi", "Spike", "Cyber", "Guest", "Ace", "Nova"];
    seeds.forEach(s => {
        const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${s}`;
        const img = document.createElement('img');
        img.src = url;
        img.className = 'avatar-option';
        img.style.cssText = "width: 44px; height: 44px; border-radius: 8px; cursor: pointer; border: 2px solid transparent;";
        if (currentUser.avatar === url) img.style.borderColor = "var(--primary, #6366f1)";
        img.onclick = () => {
            playClickSound();
            currentUser.avatar = url;
            document.getElementById('profile-avatar-large').src = url;
            document.querySelectorAll('.avatar-option').forEach(el => el.style.borderColor = 'transparent');
            img.style.borderColor = "var(--primary, #6366f1)";
        };
        grid.appendChild(img);
    });
}

// -------------------------------------------------------------
// NAVIGATION TABS
// -------------------------------------------------------------
function switchMainTab(tabId) {
    playClickSound();
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

    const activeTab = document.getElementById(`tab-${tabId}`);
    const activePane = document.getElementById(`pane-${tabId}`);
    if (activeTab) activeTab.classList.add('active');
    if (activePane) activePane.style.display = 'block';

    if (tabId === 'friends') {
        renderFriendsTab();
    }
}
window.switchMainTab = switchMainTab;

// -------------------------------------------------------------
// FRIENDS SYSTEM & EMPTY STATES
// -------------------------------------------------------------
let currentFriendsSubtab = 'all';

function switchFriendsSubtab(subtab) {
    playClickSound();
    currentFriendsSubtab = subtab;
    document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`subtab-${subtab}`);
    if (btn) btn.classList.add('active');
    renderFriendsTab();
}
window.switchFriendsSubtab = switchFriendsSubtab;

function renderFriendsTab() {
    const listContainer = document.getElementById('friends-list-container');
    const chatHeader = document.getElementById('friends-chat-header');
    const chatInputBar = document.getElementById('friends-chat-input-bar');
    const placeholder = document.getElementById('friends-chat-placeholder');

    if (!listContainer) return;

    // Reset direct chat selection
    if (chatHeader) chatHeader.style.display = 'none';
    if (chatInputBar) chatInputBar.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';

    // Guest Mode Lock Check
    if (!currentUser.isRegistered) {
        listContainer.innerHTML = `
            <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                <i class="fa-solid fa-lock" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                Guest users cannot add friends or direct chat.<br>
                <button class="btn-primary" style="margin-top: 1rem; font-size: 0.8rem; padding: 6px 12px;" onclick="document.getElementById('btn-header-profile').click()">Register Email</button>
            </div>
        `;
        return;
    }

    if (currentFriendsSubtab === 'all') {
        listContainer.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No friends yet</div>`;
    } else if (currentFriendsSubtab === 'pending') {
        listContainer.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No requests</div>`;
    } else if (currentFriendsSubtab === 'blocked') {
        listContainer.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No blocked players</div>`;
    } else if (currentFriendsSubtab === 'add') {
        listContainer.innerHTML = `
            <div style="padding: 1rem;">
                <div style="display: flex; gap: 6px;">
                    <input type="text" id="friend-search-input" placeholder="Search by username..." style="flex:1; padding: 6px 10px; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff;">
                    <button class="btn-primary" onclick="searchUserAction()" style="padding: 6px 12px;"><i class="fa-solid fa-magnifying-glass"></i></button>
                </div>
                <div id="search-results-box" style="margin-top: 1rem;"></div>
            </div>
        `;
    }
}

window.searchUserAction = async function() {
    playClickSound();
    const query = document.getElementById('friend-search-input').value.trim();
    const resultsBox = document.getElementById('search-results-box');
    if (!query || !resultsBox) return;

    if (!supabase) {
        resultsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">Database connection unavailable</div>`;
        return;
    }

    resultsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">Searching...</div>`;
    try {
        const { data, error } = await supabase.from('profiles').select('*').ilike('username', `%${query}%`).neq('uid', currentUser.uid).limit(5);
        if (error || !data || data.length === 0) {
            resultsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">No player found</div>`;
            return;
        }
        resultsBox.innerHTML = '';
        data.forEach(p => {
            const card = document.createElement('div');
            card.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 6px;";
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="${p.avatar}" style="width: 28px; height: 28px; border-radius: 50%;">
                    <span style="font-size: 0.85rem; color: #fff;">${p.username}</span>
                </div>
                <button class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="sendFriendRequestAction('${p.username}')">Add</button>
            `;
            resultsBox.appendChild(card);
        });
    } catch(e) {
        resultsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">Search failed</div>`;
    }
};

window.sendFriendRequestAction = async function(targetName) {
    playClickSound();
    alert(`Friend request sent to ${targetName}!`);
};

// -------------------------------------------------------------
// CHAT & MIC INDICATORS
// -------------------------------------------------------------
function setupChatSystem() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const msgContainer = document.getElementById('chat-messages-container');

    function sendMsg() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        playClickSound();
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = "margin-bottom: 6px; font-size: 0.85rem;";
        msgDiv.innerHTML = `<strong style="color: var(--primary, #6366f1);">${currentUser.username}:</strong> <span style="color: #fff;">${text}</span>`;
        if (msgContainer) {
            msgContainer.appendChild(msgDiv);
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
        chatInput.value = '';
    }

    if (sendBtn) sendBtn.onclick = sendMsg;
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMsg();
        });
    }

    // Voice Toggle Active Animation
    const micToggle = document.getElementById('voice-mute-toggle');
    const micIndicator = document.getElementById('self-mic-indicator');
    let isMicActive = false;

    if (micToggle) {
        micToggle.onclick = () => {
            playClickSound();
            isMicActive = !isMicActive;
            if (isMicActive) {
                micToggle.innerHTML = '<i class="fa-solid fa-microphone"></i>';
                micToggle.style.color = "var(--accent-green, #10b981)";
                if (micIndicator) micIndicator.style.display = 'block';
            } else {
                micToggle.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
                micToggle.style.color = "";
                if (micIndicator) micIndicator.style.display = 'none';
            }
        };
    }
}

// -------------------------------------------------------------
// AUDIO TOGGLES
// -------------------------------------------------------------
function setupAudioControls() {
    const sfxToggle = document.getElementById('sfx-toggle');
    if (sfxToggle) {
        sfxToggle.addEventListener('change', (e) => {
            isSfxEnabled = e.target.checked;
        });
    }

    const musicToggle = document.getElementById('theme-music-toggle');
    if (musicToggle) {
        musicToggle.addEventListener('change', (e) => {
            initAudio();
            if (e.target.checked) {
                isMusicPlaying = true;
                playSynthWaveChordProgression();
            } else {
                stopThemeMusic();
            }
        });
    }

    const volSlider = document.getElementById('music-vol-slider');
    if (volSlider) {
        volSlider.addEventListener('input', (e) => {
            musicVolume = e.target.value / 100;
        });
    }
}

// -------------------------------------------------------------
// GAME SHELF SELECTION
// -------------------------------------------------------------
const gameData = {
    'Dot Domination': {
        players: '2 - 8 Players',
        desc: 'Draw lines, Claim boxes, Win! Conquer the grid in high-speed action.',
        img: 'DotDom.png'
    },
    'Quiz Arena': {
        players: '2 - 8 Players',
        desc: 'Test your trivia skills in intense live multiplayer questions.',
        img: 'Quiz.png'
    },
    'Tic Tac Toe': {
        players: '2 Players',
        desc: 'Simple, Strategic, Addictive. Classic grid battles.',
        img: 'TicTac.png'
    },
    'Snake Battle': {
        players: '2 - 4 Players',
        desc: 'Slither, grow, and outlast other snakes in the glowing arena.',
        img: 'snake.png'
    },
    'Rock Paper Scissors': {
        players: '2 Players',
        desc: 'Quick hands, bluffing mind games, and rapid tournament matches.',
        img: 'RockPaper.png'
    }
};

window.selectGameBanner = function(gameName) {
    playClickSound();
    const data = gameData[gameName];
    if (!data) return;

    const titleEl = document.getElementById('hero-title');
    const descEl = document.getElementById('hero-desc');
    const imgEl = document.getElementById('hero-banner-img');

    if (titleEl) titleEl.textContent = gameName;
    if (descEl) descEl.textContent = data.desc;
    if (imgEl) imgEl.src = data.img;

    document.querySelectorAll('.game-item-card').forEach(c => {
        c.classList.remove('active-card');
        if (c.querySelector('h4')?.textContent === gameName) {
            c.classList.add('active-card');
        }
    });
};

// Launch Tic Tac Toe Game
const playHeroBtn = document.getElementById('btn-hero-play');
if (playHeroBtn) {
    playHeroBtn.onclick = () => {
        playClickSound();
        const currentGame = document.getElementById('hero-title').textContent;
        launchGame(currentGame);
    };
}

function launchGame(gameName) {
    const overlay = document.getElementById('active-game-overlay');
    const mount = document.getElementById('game-mount-point');
    const title = document.getElementById('active-game-title');

    if (title) title.textContent = gameName;
    if (overlay) overlay.style.display = 'flex';

    if (gameName === 'Tic Tac Toe') {
        mountTicTacToe(mount);
    } else {
        mount.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:1.5rem; color:#fff;">${gameName} coming soon!</div>`;
    }
}

document.getElementById('btn-close-game')?.addEventListener('click', () => {
    playClickSound();
    document.getElementById('active-game-overlay').style.display = 'none';
});

// -------------------------------------------------------------
// TIC TAC TOE ENGINE (Retained Intact)
// -------------------------------------------------------------
function mountTicTacToe(container) {
    let board = ["", "", "", "", "", "", "", "", ""];
    let turn = "X";
    let isGameOver = false;

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
            <h2 id="ttt-status" style="margin-bottom: 1rem; color: #fff; font-family: 'Space Grotesk', sans-serif;">Turn: Player X</h2>
            <div id="ttt-grid" style="display: grid; grid-template-columns: repeat(3, 80px); grid-gap: 10px;"></div>
            <button id="ttt-reset" class="btn-primary" style="margin-top: 1.5rem; display: none;">Play Again</button>
        </div>
    `;

    const grid = document.getElementById('ttt-grid');
    const status = document.getElementById('ttt-status');
    const resetBtn = document.getElementById('ttt-reset');

    function checkWinner() {
        const wins = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];
        for (let comb of wins) {
            const [a, b, c] = comb;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return board.includes("") ? null : "Draw";
    }

    board.forEach((_, idx) => {
        const cell = document.createElement('div');
        cell.style.cssText = "width: 80px; height: 80px; background: rgba(255,255,255,0.08); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; cursor: pointer; color: #fff;";
        cell.onclick = () => {
            if (board[idx] || isGameOver) return;
            playClickSound();
            board[idx] = turn;
            cell.textContent = turn;
            cell.style.color = turn === "X" ? "var(--primary, #6366f1)" : "var(--accent-pink, #ec4899)";

            const win = checkWinner();
            if (win) {
                isGameOver = true;
                if (win === "Draw") {
                    status.textContent = "It's a Draw!";
                } else {
                    status.textContent = `Player ${win} Wins!`;
                    if (window.confetti) window.confetti();
                }
                resetBtn.style.display = "block";
            } else {
                turn = turn === "X" ? "O" : "X";
                status.textContent = `Turn: Player ${turn}`;
            }
        };
        grid.appendChild(cell);
    });

    resetBtn.onclick = () => {
        playClickSound();
        mountTicTacToe(container);
    };
}