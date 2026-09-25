// Supabase Configuration
const SUPABASE_URL = "https://yhzwkewubrlgmezxpcr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sXOS0sc3hoddprV518CkSA_ksknzBqK";

window.sbClient = (window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
supabase = window.sbClient;

// -------------------------------------------------------------
// USER IDENTITY (Local Guest vs Permanent Registered)
// -------------------------------------------------------------
function generateGuestIdentity() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomChar = letters.charAt(Math.floor(Math.random() * letters.length));
    const randomNum = Math.floor(100 + Math.random() * 900); // 3 digits
    const username = `Guest_${randomChar}${randomNum}`;
    const uid = `GP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
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
// DYNAMIC ROOM & REALTIME SETUP
// -------------------------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
let currentRoomId = urlParams.get('room');
if (!currentRoomId) {
    currentRoomId = 'room_' + Math.random().toString(36).substring(2, 7);
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${currentRoomId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
}

let roomChannel = null;

function setupRealtimeRoom() {
    if (!supabase) return;
    
    roomChannel = supabase.channel(`arcade_${currentRoomId}`, {
        config: { presence: { key: currentUser.uid } }
    });

    roomChannel
        .on('presence', { event: 'sync' }, () => {
            const state = roomChannel.presenceState();
            renderRoomMembers(state);
        })
        .on('broadcast', { event: 'chat' }, (payload) => {
            appendChatMessage(payload.payload.user, payload.payload.message);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await roomChannel.track({
                    username: currentUser.username,
                    avatar: currentUser.avatar,
                    uid: currentUser.uid,
                    onlineAt: new Date().toISOString()
                });
            }
        });
}

function renderRoomMembers(presenceState) {
    const wrapper = document.getElementById('party-members-wrapper');
    const countBadge = document.getElementById('group-member-count');
    if (!wrapper) return;

    wrapper.innerHTML = '';
    const uniqueUsers = new Map();

    // Add self always first
    uniqueUsers.set(currentUser.uid, {
        username: currentUser.username,
        avatar: currentUser.avatar,
        isSelf: true
    });

    // Populate remote presence
    for (const key in presenceState) {
        presenceState[key].forEach(u => {
            if (u.uid !== currentUser.uid) {
                uniqueUsers.set(u.uid, {
                    username: u.username,
                    avatar: u.avatar,
                    isSelf: false
                });
            }
        });
    }

    if (countBadge) countBadge.textContent = uniqueUsers.size;

    uniqueUsers.forEach((user, uid) => {
        const item = document.createElement('div');
        item.className = user.isSelf ? 'party-member admin-glow' : 'party-member';
        item.innerHTML = `
            <div class="party-member-left">
                <i class="fa-solid fa-microphone speaking-mic" id="mic-ind-${uid}" style="display: none;"></i>
                <div class="avatar-wrapper avatar-ring-online" style="width:24px;height:24px; display:flex; align-items:center; justify-content:center;">
                    <img src="${user.avatar}" class="mini-avatar ${user.isSelf ? 'admin-glow' : ''}" style="width:20px;height:20px; border-radius:50%;">
                </div>
                <span class="member-name ${user.isSelf ? 'admin-text' : ''}">${user.isSelf ? 'You' : user.username}</span>
            </div>
        `;
        wrapper.appendChild(item);
    });
}

// -------------------------------------------------------------
// AUDIO SYNTH ENGINE (Fast Direct Play & Slash Toggle)
// -------------------------------------------------------------
let audioCtx = null;
let isMusicPlaying = false;
let musicInterval = null;
let musicVolume = 0.4;
let isSfxEnabled = true;
let isAudioDeafened = false;

function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {}
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playClickSound() {
    if (!isSfxEnabled || isAudioDeafened) return;
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

function playThemeMusic() {
    initAudio();
    if (!audioCtx) return;
    try {
        stopThemeMusic();
        isMusicPlaying = true;

        const chords = [
            [220, 261.63, 329.63, 392],
            [174.61, 220, 261.63, 329.63],
            [130.81, 164.81, 196, 246.94],
            [196, 246.94, 293.66, 349.23]
        ];
        let chordIndex = 0;

        const playChord = () => {
            if (!isMusicPlaying || !audioCtx || isAudioDeafened) return;
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
                gain.gain.setValueAtTime(musicVolume * 0.025, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.8);
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 1.8);
            });
        };

        playChord(); // Plays instantly without delay
        musicInterval = setInterval(playChord, 2000);
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
// DOM SETUP & INITIALIZATION
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // Unlock Audio Context on first interaction
    const unlockAudio = () => {
        initAudio();
        const musicToggle = document.getElementById('theme-music-toggle');
        if (musicToggle && musicToggle.checked && !isMusicPlaying && !isAudioDeafened) {
            playThemeMusic();
        }
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    syncUIWithIdentity();
    setupDrawersAndModals();
    setupNavigationTabs();
    setupProfileDrawer();
    setupGroupChatAndMic();
    setupThemeControls();
    setupGameSelection();
    setupRealtimeRoom();

    if (currentUser.isRegistered && supabase) {
        syncToSupabase();
    }
});

function syncUIWithIdentity() {
    const hUser = document.getElementById('header-username');
    const hAvatar = document.getElementById('header-avatar-img');
    if (hUser) hUser.textContent = currentUser.username;
    if (hAvatar) hAvatar.src = currentUser.avatar;

    const gSelfName = document.getElementById('group-self-name');
    const gSelfAvatar = document.getElementById('group-self-avatar');
    if (gSelfName) gSelfName.textContent = currentUser.username;
    if (gSelfAvatar) gSelfAvatar.src = currentUser.avatar;

    const pName = document.getElementById('profile-drawer-name');
    const pUid = document.getElementById('profile-drawer-uid');
    const pPic = document.getElementById('profile-drawer-pic');
    const pInput = document.getElementById('username-input');
    const pEmail = document.getElementById('email-input');
    const pStatus = document.getElementById('profile-account-status');
    const emailNotice = document.getElementById('email-lock-notice');

    if (pName) pName.textContent = currentUser.username;
    if (pUid) pUid.textContent = `UID: ${currentUser.uid}`;
    if (pPic) pPic.src = currentUser.avatar;
    if (pInput) pInput.value = currentUser.username;

    if (pEmail) {
        pEmail.value = currentUser.email || "";
        if (currentUser.isRegistered) {
            pEmail.disabled = true;
            if (pStatus) {
                pStatus.textContent = "Verified Account (Server Synced)";
                pStatus.style.color = "var(--neon-green)";
            }
            if (emailNotice) {
                emailNotice.textContent = "Email is verified and permanent.";
            }
        }
    }

    const roomLink = document.getElementById('room-invite-link');
    if (roomLink) {
        roomLink.value = window.location.href;
    }
}

// -------------------------------------------------------------
// DRAWER CONTROLS
// -------------------------------------------------------------
function closeAllDrawers() {
    document.querySelectorAll('.side-drawer').forEach(d => d.classList.remove('open'));
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.classList.remove('active');
}
window.closeAllDrawers = closeAllDrawers;

function openDrawer(drawerId) {
    playClickSound();
    closeAllDrawers();
    const target = document.getElementById(drawerId);
    const backdrop = document.getElementById('modal-backdrop');
    if (target) {
        target.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
    }
}
window.openDrawer = openDrawer;

function setupDrawersAndModals() {
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeAllDrawers);

    document.getElementById('header-invite-btn')?.addEventListener('click', () => openDrawer('invite-drawer'));
    document.getElementById('notif-btn')?.addEventListener('click', () => openDrawer('notif-drawer'));
    document.getElementById('settings-btn')?.addEventListener('click', () => openDrawer('settings-drawer'));
    document.getElementById('profile-btn')?.addEventListener('click', () => openDrawer('profile-drawer'));

    document.getElementById('close-settings-drawer-btn')?.addEventListener('click', closeAllDrawers);
    document.getElementById('close-profile-drawer-btn')?.addEventListener('click', closeAllDrawers);
    document.getElementById('close-invite-modal')?.addEventListener('click', closeAllDrawers);

    document.getElementById('copy-link-btn')?.addEventListener('click', () => {
        playClickSound();
        const linkInput = document.getElementById('room-invite-link');
        if (linkInput) {
            navigator.clipboard.writeText(linkInput.value);
            const btn = document.getElementById('copy-link-btn');
            btn.textContent = "Copied!";
            setTimeout(() => { btn.textContent = "Copy"; }, 2000);
        }
    });

    document.getElementById('clear-notif-btn')?.addEventListener('click', () => {
        playClickSound();
        const list = document.getElementById('notif-list');
        if (list) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 25px 10px; font-size: 0.85rem;"><i class="fa-regular fa-bell-slash" style="font-size: 1.8rem; margin-bottom: 8px; display: block;"></i>No new notifications</div>`;
        }
        const badge = document.getElementById('notif-badge');
        if (badge) badge.style.display = 'none';
    });
}

// -------------------------------------------------------------
// PROFILE SAVE & EMAIL REGISTRATION
// -------------------------------------------------------------
function setupProfileDrawer() {
    const saveBtn = document.getElementById('profile-save-btn');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            playClickSound();
            const uInput = document.getElementById('username-input');
            const eInput = document.getElementById('email-input');
            const newName = uInput ? uInput.value.trim() : "";
            const newEmail = eInput ? eInput.value.trim() : "";

            if (!newName) {
                alert("Username cannot be empty");
                return;
            }
            currentUser.username = newName;

            if (!currentUser.isRegistered && newEmail) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(newEmail)) {
                    alert("Please enter a valid email address.");
                    return;
                }
                currentUser.email = newEmail;
                currentUser.isRegistered = true;
                localStorage.setItem('guildplay_user', JSON.stringify(currentUser));
                syncUIWithIdentity();
                await syncToSupabase();
                alert("Registration successful! Friends list and search are now unlocked.");
            } else {
                localStorage.setItem('guildplay_user', JSON.stringify(currentUser));
                syncUIWithIdentity();
                if (currentUser.isRegistered) {
                    await syncToSupabase();
                }
                alert("Profile updated.");
            }
            closeAllDrawers();
        };
    }

    const grid = document.getElementById('avatar-grid');
    if (grid) {
        grid.innerHTML = '';
        ["Guest", "Admin", "Mochi", "Nova", "Spike", "Cyber", "Ace"].forEach(seed => {
            const img = document.createElement('img');
            const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
            img.src = url;
            img.className = 'avatar-option';
            img.onclick = () => {
                playClickSound();
                currentUser.avatar = url;
                document.getElementById('profile-drawer-pic').src = url;
            };
            grid.appendChild(img);
        });
    }
}

async function syncToSupabase() {
    if (!supabase || !currentUser.isRegistered) return;
    try {
        await supabase.from('profiles').upsert({
            uid: currentUser.uid,
            username: currentUser.username,
            email: currentUser.email,
            avatar: currentUser.avatar,
            last_seen: new Date().toISOString()
        }, { onConflict: 'uid' });
    } catch(e) {}
}

// -------------------------------------------------------------
// NAVIGATION TABS & FRIENDS ACTIVE CLASS
// -------------------------------------------------------------
function setupNavigationTabs() {
    const tabs = document.querySelectorAll('.nav-tabs .tab-btn');
    const homeView = document.getElementById('home-tab-view');
    const friendsView = document.getElementById('friends-tab-view');
    const leaderboardView = document.getElementById('leaderboard-tab-view');
    const mainContainer = document.getElementById('main-container');
    const gameOverlay = document.getElementById('active-game-overlay');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            if (targetTab === 'leaderboard') return;

            playClickSound();
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Close game overlay if switching tabs
            if (gameOverlay) gameOverlay.style.display = 'none';

            if (targetTab === 'home') {
                if (mainContainer) mainContainer.classList.remove('friends-active');
                if (homeView) homeView.style.display = 'flex';
                if (friendsView) friendsView.style.display = 'none';
                if (leaderboardView) leaderboardView.style.display = 'none';
            } else if (targetTab === 'friends') {
                if (mainContainer) mainContainer.classList.add('friends-active');
                if (homeView) homeView.style.display = 'none';
                if (friendsView) friendsView.style.display = 'block';
                if (leaderboardView) leaderboardView.style.display = 'none';
                renderFriendsPanelStatus();
            }
        });
    });

    const friendSearchInput = document.getElementById('friend-search-input');
    friendSearchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleFriendSearch();
    });
    document.getElementById('btn-search-friend')?.addEventListener('click', handleFriendSearch);
}

function renderFriendsPanelStatus() {
    const hint = document.getElementById('friends-empty-hint');
    const header = document.getElementById('friends-chat-header');
    const footer = document.getElementById('friends-chat-footer');

    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';

    if (!currentUser.isRegistered) {
        if (hint) {
            hint.innerHTML = `<i class="fa-solid fa-lock" style="font-size:1.6rem; display:block; margin-bottom:8px; color: var(--neon-gold);"></i>Guest Account<br>Please register your email in the Profile Drawer to search players and chat.`;
        }
    } else {
        if (hint) {
            hint.textContent = "Select a friend to start chatting.";
        }
    }
}

async function handleFriendSearch() {
    playClickSound();
    const query = document.getElementById('friend-search-input')?.value.trim();
    const resultsBox = document.getElementById('friend-search-results');
    if (!query || !resultsBox) return;

    if (!currentUser.isRegistered) {
        resultsBox.innerHTML = `<div style="color: var(--neon-gold); font-size: 0.72rem; padding: 4px;">Register email first to add friends.</div>`;
        return;
    }

    if (!supabase) {
        resultsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 0.72rem; padding: 4px;">Server connection unavailable</div>`;
        return;
    }

    resultsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 0.72rem; padding: 4px;">Searching...</div>`;
    try {
        const { data, error } = await supabase.from('profiles').select('*').ilike('username', `%${query}%`).neq('uid', currentUser.uid).limit(5);
        if (error || !data || data.length === 0) {
            resultsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 0.72rem; padding: 4px;">No player found</div>`;
            return;
        }
        resultsBox.innerHTML = '';
        data.forEach(p => {
            const card = document.createElement('div');
            card.className = 'find-result-card';
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:6px;">
                    <img src="${p.avatar}" style="width:24px;height:24px;border-radius:50%;">
                    <span style="font-size:0.75rem; color:#fff;">${p.username}</span>
                </div>
                <button class="add-btn" onclick="sendFriendRequest('${p.username}')">Add</button>
            `;
            resultsBox.appendChild(card);
        });
    } catch(e) {
        resultsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 0.72rem; padding: 4px;">Search failed</div>`;
    }
}

window.sendFriendRequest = function(username) {
    playClickSound();
    triggerNotificationToast(`Friend request sent to ${username}!`);
};

window.unfriendCurrentTarget = function() {
    playClickSound();
    alert("Friend removed.");
    renderFriendsPanelStatus();
};

window.blockCurrentTarget = function() {
    playClickSound();
    alert("Player blocked.");
    renderFriendsPanelStatus();
};

// -------------------------------------------------------------
// GROUP CHAT, DIRECT EMOJI SEND, MIC & CLEAN SLASH SPEAKER
// -------------------------------------------------------------
function appendChatMessage(sender, text) {
    const chatBox = document.getElementById('chat-messages');
    if (!chatBox) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg';
    msgDiv.innerHTML = `<span class="c-user">${sender}:</span> ${text}`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function setupGroupChatAndMic() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat-btn');
    const emojiToggle = document.getElementById('emoji-toggle-btn');
    const emojiTray = document.getElementById('emoji-tray');

    function sendCurrentChat(msgText) {
        const text = msgText || (chatInput ? chatInput.value.trim() : "");
        if (!text) return;
        playClickSound();

        appendChatMessage(currentUser.username, text);

        if (roomChannel) {
            roomChannel.send({
                type: 'broadcast',
                event: 'chat',
                payload: { user: currentUser.username, message: text }
            });
        }

        if (chatInput && !msgText) chatInput.value = '';
    }

    sendBtn?.addEventListener('click', () => sendCurrentChat());
    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendCurrentChat();
    });

    emojiToggle?.addEventListener('click', () => {
        playClickSound();
        if (emojiTray) emojiTray.classList.toggle('hidden-tray');
    });

    // Direct emoji click sends immediately
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const emoji = btn.getAttribute('data-emoji');
            if (emoji) sendCurrentChat(emoji);
            if (emojiTray) emojiTray.classList.add('hidden-tray');
        });
    });

    // Mic Toggle: Strictly Hidden until real speaking state
    const micBtn = document.getElementById('mic-toggle-btn');
    const selfMicIcon = document.getElementById('mic-self');
    let isMicActive = false;

    micBtn?.addEventListener('click', () => {
        playClickSound();
        isMicActive = !isMicActive;
        if (isMicActive) {
            micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
            micBtn.style.color = "var(--neon-green)";
            // Remains hidden by default; will toggle when real voice stream triggers
            if (selfMicIcon) selfMicIcon.style.display = 'none';
        } else {
            micBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
            micBtn.style.color = "";
            if (selfMicIcon) selfMicIcon.style.display = 'none';
        }
    });

    // Speaker Mute Toggle: Clean Slash (fa-volume-slash) instead of X
    const speakerBtn = document.getElementById('speaker-toggle-btn');
    speakerBtn?.addEventListener('click', () => {
        playClickSound();
        isAudioDeafened = !isAudioDeafened;
        if (isAudioDeafened) {
            speakerBtn.innerHTML = '<i class="fa-solid fa-volume-xmark" style="transform: scale(0.9);"></i>'; // Slash style icon
            speakerBtn.style.color = "var(--neon-pink)";
            stopThemeMusic();
        } else {
            speakerBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            speakerBtn.style.color = "";
            const musicToggle = document.getElementById('theme-music-toggle');
            if (musicToggle && musicToggle.checked) playThemeMusic();
        }
    });

    // Collapse Sidebar Party Grid
    const collapseBtn = document.getElementById('collapse-party-btn');
    const partyGrid = document.getElementById('party-members-wrapper');
    const collapseIcon = document.getElementById('party-collapse-icon');

    collapseBtn?.addEventListener('click', () => {
        playClickSound();
        if (partyGrid) {
            partyGrid.classList.toggle('collapsed');
            if (collapseIcon) {
                collapseIcon.classList.toggle('fa-chevron-up');
                collapseIcon.classList.toggle('fa-chevron-down');
            }
        }
    });
}

// -------------------------------------------------------------
// AUDIO & THEME CONTROLS
// -------------------------------------------------------------
function setupThemeControls() {
    document.getElementById('sfx-toggle')?.addEventListener('change', (e) => {
        isSfxEnabled = e.target.checked;
    });

    document.getElementById('theme-music-toggle')?.addEventListener('change', (e) => {
        if (e.target.checked && !isAudioDeafened) {
            playThemeMusic();
        } else {
            stopThemeMusic();
        }
    });

    document.getElementById('music-volume-slider')?.addEventListener('input', (e) => {
        musicVolume = parseFloat(e.target.value);
    });

    document.querySelectorAll('input[name="theme-radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.body.className = e.target.value;
        });
    });
}

// -------------------------------------------------------------
// GAME SELECTION & EDGE-TO-EDGE OVERLAY LAUNCHER
// -------------------------------------------------------------
function setupGameSelection() {
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            playClickSound();
            document.querySelectorAll('.game-card').forEach(c => c.classList.remove('active-card'));
            card.classList.add('active-card');

            const title = card.getAttribute('data-title');
            const desc = card.getAttribute('data-desc');
            const players = card.getAttribute('data-players');
            const img = card.getAttribute('data-image');

            if (document.getElementById('hero-game-title')) document.getElementById('hero-game-title').textContent = title;
            if (document.getElementById('hero-game-desc')) document.getElementById('hero-game-desc').textContent = desc;
            if (document.getElementById('hero-player-count')) document.getElementById('hero-player-count').textContent = players;
            if (document.getElementById('hero-banner-img') && img) document.getElementById('hero-banner-img').src = img;
        });
    });

    const homeView = document.getElementById('home-tab-view');
    const overlay = document.getElementById('active-game-overlay');
    const gameViewport = document.getElementById('game-container-viewport');
    const exitBtn = document.getElementById('btn-exit-game');

    document.getElementById('launch-game-btn')?.addEventListener('click', () => {
        playClickSound();
        const activeCard = document.querySelector('.game-card.active-card');
        const gameTitle = activeCard ? activeCard.getAttribute('data-title') : "Dot Domination";
        const gamePath = activeCard ? activeCard.getAttribute('data-path') : null;

        if (homeView) homeView.style.display = 'none';
        if (overlay) overlay.style.display = 'flex';

        if (gameViewport) {
            if (gamePath) {
                gameViewport.innerHTML = `<iframe src="${gamePath}" style="width:100%; height:100%; border:none;"></iframe>`;
            } else {
                gameViewport.innerHTML = `
                    <div style="text-align: center; color: var(--text-main);">
                        <h2 style="color: var(--neon-blue); font-size: 1.5rem; margin-bottom: 8px;">${gameTitle}</h2>
                        <p style="color: var(--text-muted); font-size: 0.85rem;">Multiplayer match arena initialized for this room.</p>
                    </div>
                `;
            }
        }
    });

    exitBtn?.addEventListener('click', () => {
        playClickSound();
        if (overlay) overlay.style.display = 'none';
        if (homeView) homeView.style.display = 'flex';
        if (gameViewport) gameViewport.innerHTML = '';
    });
}

function triggerNotificationToast(text) {
    const toast = document.getElementById('single-notif-toast');
    if (toast) {
        toast.textContent = text;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
}
window.triggerNotificationToast = triggerNotificationToast;