// Supabase Configuration
const SUPABASE_URL = "https://yhzwkewubrllgmezxpcr.supabase.co"; // आपकी स्क्रीन पर दिख रहा URL
const SUPABASE_ANON_KEY = "sb_publishable_sXOS0sc3hoddprV518CkSA_ksknzBqK"; // आपकी कॉपी की गई anon key

// Initialize Supabase Client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Dynamic Room ID Query Setup (URL query e.g., ?room=arcade99)
const urlParams = new URLSearchParams(window.location.search);
let currentRoomId = urlParams.get('room') || 'default-hub';
let roomChannel = null;

document.addEventListener("DOMContentLoaded", () => {
    let audioCtx = null;
    let musicInterval = null;
    let isMusicPlaying = false;
    let musicVolume = 0.4;
    let sfxEnabled = true;

    function initAudio() {
        if (audioCtx) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {}
    }

    function playClickSound() {
        if (!sfxEnabled) return;
        try {
            initAudio();
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(550, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.04);
        } catch(e) {}
    }

    function playSynthWaveChordProgression() {
        if (!audioCtx || !isMusicPlaying) return;
        if (audioCtx.state === 'suspended') { audioCtx.resume(); }
        const notes = [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 523.25];
        let noteIndex = 0;
        if (musicInterval) clearInterval(musicInterval);
        musicInterval = setInterval(() => {
            if (!isMusicPlaying || !audioCtx) return;
            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(notes[noteIndex], audioCtx.currentTime);
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1200, audioCtx.currentTime);
                gain.gain.setValueAtTime(musicVolume * 0.08, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.6);
                noteIndex = (noteIndex + 1) % notes.length;
            } catch(e) {}
        }, 375);
    }

    function startThemeMusic() {
        const musicToggle = document.getElementById("theme-music-toggle");
        if (!musicToggle || !musicToggle.checked) return;
        if (isMusicPlaying) return;
        try {
            initAudio();
            isMusicPlaying = true;
            playSynthWaveChordProgression();
        } catch(e) {}
    }

    function stopThemeMusic() {
        isMusicPlaying = false;
        if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
    }

    window.showToast = function(msg) {
        const toast = document.getElementById("single-notif-toast");
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = "block";
        setTimeout(() => { toast.style.display = "none"; }, 3000);
    };

    window.triggerNotificationToast = function(msg) {
        window.showToast(msg);
    };

    const tabs = document.querySelectorAll(".tab-btn");
    const centerHub = document.getElementById("center-hub");
    const leftSidebar = document.getElementById("left-sidebar");
    const mainContainer = document.getElementById("main-container");
    const backdrop = document.getElementById("modal-backdrop");
    const mainHeader = document.getElementById("arcade-header");

    const initialHomeHTML = centerHub.innerHTML;

    window.closeAllDrawers = function() {
        document.querySelectorAll(".side-drawer").forEach(d => d.classList.remove("open"));
        if (backdrop) backdrop.style.display = "none";
    };

    if (backdrop) {
        backdrop.addEventListener("click", () => {
            window.closeAllDrawers();
        });
    }

    document.addEventListener("click", (e) => {
        const sideDrawers = document.querySelectorAll(".side-drawer");
        const triggerBtns = document.querySelectorAll("#notif-btn, #settings-btn, #profile-btn, #open-invite-modal-btn");
        
        let clickedInsideDrawer = false;
        sideDrawers.forEach(d => { if (d.contains(e.target)) clickedInsideDrawer = true; });
        
        let clickedTrigger = false;
        triggerBtns.forEach(b => { if (b.contains(e.target)) clickedTrigger = true; });

        if (!clickedInsideDrawer && !clickedTrigger && !e.target.closest(".party-member")) {
            if (e.target !== backdrop) {
                window.closeAllDrawers();
            }
        }
    });

    function updateNotificationBadge() {
        const notifList = document.getElementById("notif-list");
        const notifBadge = document.getElementById("notif-badge");
        if (!notifList || !notifBadge) return;
        const count = notifList.querySelectorAll(".notif-item").length;
        if (count > 0) {
            notifBadge.textContent = count;
            notifBadge.style.display = "inline-block";
        } else {
            notifBadge.textContent = "0";
            notifBadge.style.display = "none";
        }
    }
    updateNotificationBadge();

    // ==========================================
    // SUPABASE: REALTIME ROOM & LIVE PRESENCE
    // ==========================================
    const inviteInput = document.getElementById("room-invite-link");
    if (inviteInput) {
        const fullInviteUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
        inviteInput.value = fullInviteUrl;
    }

    async function syncMyProfile() {
        if (!supabase) return;
        const myName = document.getElementById("header-username").textContent.trim();
        const myAvatar = document.getElementById("header-avatar-img").src;

        try {
            await supabase.from('profiles').upsert({
                username: myName,
                avatar: myAvatar,
                status: 'online',
                last_seen: new Date().toISOString()
            });
        } catch(err) {
            console.error("Profile sync error:", err);
        }
    }

    function setupRealtimeRoom() {
        if (!supabase) return;

        const myUsername = document.getElementById("header-username").textContent.trim() || "Player";
        const myAvatar = document.getElementById("header-avatar-img").src;

        if (roomChannel) {
            supabase.removeChannel(roomChannel);
        }

        roomChannel = supabase.channel(`room-${currentRoomId}`, {
            config: {
                presence: { key: myUsername }
            }
        });

        roomChannel.on('presence', { event: 'sync' }, () => {
            const state = roomChannel.presenceState();
            renderPartyMembersFromPresence(state, myUsername);
        });

        roomChannel.on('broadcast', { event: 'chat-msg' }, (payload) => {
            if (payload && payload.payload) {
                const { user, text } = payload.payload;
                addGroupChatMessage(user, text);
            }
        });

        roomChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await roomChannel.track({
                    username: myUsername,
                    avatar: myAvatar,
                    online_at: new Date().toISOString()
                });
                window.showToast("Connected to live room!");
            }
        });
    }

    function renderPartyMembersFromPresence(presenceState, myName) {
        const wrapper = document.getElementById("party-members-wrapper");
        const countBadge = document.getElementById("group-member-count");
        if (!wrapper) return;

        let allPlayers = [];
        Object.keys(presenceState).forEach(key => {
            const list = presenceState[key];
            if (list && list.length > 0) {
                allPlayers.push(list[0]);
            }
        });

        if (countBadge) countBadge.textContent = allPlayers.length;

        wrapper.innerHTML = "";
        allPlayers.forEach(p => {
            const isSelf = (p.username === myName);
            const memberEl = document.createElement("div");
            memberEl.className = "party-member";
            memberEl.setAttribute("data-username", p.username);
            memberEl.onclick = () => window.openMemberActionModal(p.username, isSelf);

            memberEl.innerHTML = `
                <div class="party-member-left">
                    <i class="fa-solid fa-microphone speaking-mic" id="mic-${p.username.toLowerCase()}"></i>
                    <div class="avatar-wrapper avatar-ring-online" style="width:24px;height:24px; display:flex; align-items:center; justify-content:center;">
                        <img src="${p.avatar}" class="mini-avatar ${isSelf ? 'admin-glow' : ''}" style="width:20px;height:20px; border-radius:50%;">
                    </div>
                    <span class="member-name ${isSelf ? 'admin-text' : ''}">${isSelf ? 'You' : p.username}</span>
                </div>
            `;
            wrapper.appendChild(memberEl);
        });
    }

    // ==========================================
    // SUPABASE: FRIENDS SYSTEM (SEARCH, REQ, BLOCK)
    // ==========================================
    window.searchFriendAction = async function() {
        playClickSound();
        const input = document.getElementById("friend-search-input");
        const container = document.getElementById("search-result-container");
        if (!input || !container) return;

        const query = input.value.trim();
        if (!query) return;

        const myName = document.getElementById("header-username").textContent.trim();
        if (query.toLowerCase() === myName.toLowerCase()) {
            window.showToast("You cannot search yourself!");
            return;
        }

        container.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted); padding:4px;">Searching...</span>`;

        if (!supabase) {
            window.showToast("Supabase not linked!");
            return;
        }

        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${query}%`)
            .limit(5);

        if (error || !users || users.length === 0) {
            container.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:4px;">No user found</span>`;
            return;
        }

        container.innerHTML = "";
        users.forEach(u => {
            if (u.username === myName) return;
            const card = document.createElement("div");
            card.className = "find-result-card";
            card.style.marginTop = "5px";
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="${u.avatar}" style="width:26px;height:26px;border-radius:50%;">
                    <span style="font-size:0.8rem; font-weight:600;">${u.username}</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="add-btn" onclick="sendFriendRequestDB('${u.username}')">Add</button>
                </div>
            `;
            container.appendChild(card);
        });
    };

    window.sendFriendRequestDB = async function(targetUser) {
        playClickSound();
        const myName = document.getElementById("header-username").textContent.trim();
        if (!supabase) return;

        const { error } = await supabase.from('friendships').insert({
            sender: myName,
            receiver: targetUser,
            status: 'pending'
        });

        if (error) {
            window.showToast("Request already sent or error!");
        } else {
            window.showToast(`Request sent to ${targetUser}!`);
        }
    };

    window.acceptFriendRequestDB = async function(senderUser) {
        playClickSound();
        const myName = document.getElementById("header-username").textContent.trim();
        if (!supabase) return;

        await supabase.from('friendships')
            .update({ status: 'accepted' })
            .match({ sender: senderUser, receiver: myName });

        window.showToast(`Accepted ${senderUser}!`);
        fetchFriendsAndRequests();
    };

    window.denyFriendRequestDB = async function(senderUser) {
        playClickSound();
        const myName = document.getElementById("header-username").textContent.trim();
        if (!supabase) return;

        await supabase.from('friendships')
            .delete()
            .match({ sender: senderUser, receiver: myName, status: 'pending' });

        window.showToast(`Request Denied`);
        fetchFriendsAndRequests();
    };

    window.blockUserDB = async function(targetUser) {
        playClickSound();
        const myName = document.getElementById("header-username").textContent.trim();
        if (!supabase) return;

        await supabase.from('friendships').upsert({
            sender: myName,
            receiver: targetUser,
            status: 'blocked'
        });

        window.showToast(`Blocked ${targetUser}`);
        fetchFriendsAndRequests();
    };

    window.unblockUserDB = async function(targetUser) {
        playClickSound();
        const myName = document.getElementById("header-username").textContent.trim();
        if (!supabase) return;

        await supabase.from('friendships')
            .delete()
            .match({ sender: myName, receiver: targetUser, status: 'blocked' });

        window.showToast(`Unblocked ${targetUser}`);
        fetchFriendsAndRequests();
    };

    async function fetchFriendsAndRequests() {
        if (!supabase) return;
        const myName = document.getElementById("header-username").textContent.trim();

        // 1. Pending Requests Fetch
        const { data: requests } = await supabase
            .from('friendships')
            .select('*')
            .eq('receiver', myName)
            .eq('status', 'pending');

        const panels = document.querySelectorAll(".friends-panel-box");
        if (panels.length >= 2 && requests) {
            const reqContainer = panels[1];
            let reqHTML = `<h3>Pending Friend Requests</h3>`;
            if (requests.length === 0) {
                reqHTML += `<span style="font-size:0.75rem; color:var(--text-muted);">No pending requests</span>`;
            } else {
                requests.forEach(r => {
                    reqHTML += `
                        <div class="req-card">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${r.sender}" style="width:28px;height:28px;border-radius:50%;">
                                <span style="font-size:0.8rem; font-weight:600;">${r.sender}</span>
                            </div>
                            <div class="req-actions">
                                <button class="accept-btn" onclick="acceptFriendRequestDB('${r.sender}')">Accept</button>
                                <button class="deny-btn" onclick="denyFriendRequestDB('${r.sender}')">Deny</button>
                            </div>
                        </div>
                    `;
                });
            }
            reqContainer.innerHTML = reqHTML;
        }

        // 2. Block List Fetch
        const { data: blockedList } = await supabase
            .from('friendships')
            .select('*')
            .eq('sender', myName)
            .eq('status', 'blocked');

        if (panels.length >= 3 && blockedList) {
            const blockContainer = panels[2];
            let blockHTML = `<h3>BlockFriends</h3>`;
            if (blockedList.length === 0) {
                blockHTML += `<span style="font-size:0.75rem; color:var(--text-muted);">No blocked players</span>`;
            } else {
                blockedList.forEach(b => {
                    blockHTML += `
                        <div class="block-friend-row">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${b.receiver}" style="width:28px;height:28px;border-radius:50%;">
                                <span style="font-size:0.8rem; font-weight:600;">${b.receiver}</span>
                            </div>
                            <button class="unblock-btn" onclick="unblockUserDB('${b.receiver}')">Unblock</button>
                        </div>
                    `;
                });
            }
            blockContainer.innerHTML = blockHTML;
        }

        // 3. Accepted Friends Fetch (Left Friends Hub List)
        const { data: acceptedRows } = await supabase
            .from('friendships')
            .select('*')
            .or(`sender.eq.${myName},receiver.eq.${myName}`)
            .eq('status', 'accepted');

        const friendsHubList = document.querySelector(".friends-hub-list");
        if (friendsHubList && acceptedRows) {
            let friendsHTML = "";
            if (acceptedRows.length === 0) {
                friendsHTML = `<span style="font-size:0.75rem; color:var(--text-muted); padding:5px;">No friends added yet</span>`;
            } else {
                acceptedRows.forEach(f => {
                    const friendName = (f.sender === myName) ? f.receiver : f.sender;
                    friendsHTML += `
                        <div class="friend-hub-item" onclick="openFriendChat('${friendName}')">
                            <div class="avatar-ring-online" style="width:30px;height:30px; display:flex; align-items:center; justify-content:center;">
                                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${friendName}" style="width:24px;height:24px; border-radius:50%;">
                            </div>
                            <div style="display:flex; flex-direction:column; font-size:0.8rem;">
                                <span style="font-weight:600; color:var(--text-main);">${friendName}</span>
                                <span style="font-size:0.68rem; color:var(--neon-green);">Online</span>
                            </div>
                        </div>
                    `;
                });
            }
            friendsHubList.innerHTML = friendsHTML;
        }
    }

    // ==========================================
    // NAVIGATION & VIEW SWITCHING
    // ==========================================
    function switchToHomeView() {
        playClickSound();
        window.closeAllDrawers();
        if (mainHeader) mainHeader.style.display = "flex";
        tabs.forEach(t => t.classList.remove("active"));
        const homeTab = document.querySelector('[data-tab="home"]');
        if (homeTab) homeTab.classList.add("active");
        
        leftSidebar.style.display = "flex";
        mainContainer.classList.remove("friends-active");

        centerHub.innerHTML = initialHomeHTML;
        bindGameCardEvents();
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            if(tab.classList.contains("inactive-tab")) {
                window.showToast("Leaderboard coming soon in next update!");
                return;
            }
            playClickSound();
            const targetTab = tab.getAttribute("data-tab");
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            if(targetTab === "home") {
                switchToHomeView();
            } else if(targetTab === "friends") {
                loadFriendsTabView();
            }
        });
    });

    function loadFriendsTabView() {
        window.closeAllDrawers();
        if (mainHeader) mainHeader.style.display = "flex";
        leftSidebar.style.display = "none";
        mainContainer.classList.add("friends-active");

        centerHub.innerHTML = `
            <div class="friends-tab-layout">
                <div class="friends-list-panel">
                    <div class="friends-list-header">Friends</div>
                    <div class="friends-hub-list">
                        <span style="font-size:0.75rem; color:var(--text-muted); padding:5px;">Loading friends...</span>
                    </div>
                </div>

                <div class="friends-chat-window" id="friends-chat-window">
                    <div class="friends-chat-header">
                        <div class="friends-chat-header-left">
                            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Friend" style="width:30px;height:30px;border-radius:50%;" id="active-chat-avatar">
                            <div>
                                <span style="font-weight:700; font-size:0.85rem;" id="active-chat-name">Select a friend</span>
                            </div>
                        </div>
                        <div class="friends-chat-actions">
                            <button class="action-chip unfried" onclick="showToast('User Unfriended')">Unfriend</button>
                            <button class="action-chip block" onclick="blockActiveFriend()">Block</button>
                            <button class="action-chip report" onclick="showToast('User Reported')">Report</button>
                        </div>
                    </div>
                    <div class="friends-chat-messages-body" id="friend-chat-msgs">
                        <div class="f-bubble received">Select a friend from the left list to chat.</div>
                    </div>
                    <div class="friends-chat-footer">
                        <input type="text" id="friend-chat-input" maxlength="100" placeholder="Type a message...">
                        <button class="send-msg-btn" onclick="sendFriendChatMsg()"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                </div>

                <div class="friends-right-column">
                    <div class="friends-panel-box">
                        <h3>Search friend</h3>
                        <div class="search-friend-input-row">
                            <input type="text" id="friend-search-input" placeholder="Unique name...">
                            <button class="find-btn" onclick="searchFriendAction()">Find</button>
                        </div>
                        <div id="search-result-container"></div>
                    </div>

                    <div class="friends-panel-box">
                        <h3>Pending Friend Requests</h3>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Loading requests...</span>
                    </div>

                    <div class="friends-panel-box">
                        <h3>BlockFriends</h3>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Loading blocked players...</span>
                    </div>
                </div>
            </div>
        `;

        const fInput = document.getElementById("friend-chat-input");
        if(fInput) {
            fInput.addEventListener("keypress", (e) => {
                if(e.key === "Enter") sendFriendChatMsg();
            });
        }

        fetchFriendsAndRequests();
    }

    window.openFriendChat = function(name) {
        playClickSound();
        document.getElementById("active-chat-name").textContent = name;
        document.getElementById("active-chat-avatar").src = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;
        document.getElementById("friend-chat-msgs").innerHTML = `<div class="f-bubble received">Direct chat with ${name} ready.</div>`;
    };

    window.blockActiveFriend = function() {
        const activeName = document.getElementById("active-chat-name").textContent.trim();
        if (activeName && activeName !== "Select a friend") {
            window.blockUserDB(activeName);
        } else {
            window.showToast("Select a friend first!");
        }
    };

    window.sendFriendChatMsg = function() {
        const input = document.getElementById("friend-chat-input");
        if(input && input.value.trim() !== "") {
            playClickSound();
            const body = document.getElementById("friend-chat-msgs");
            
            const msgBubble = document.createElement("div");
            msgBubble.className = "f-bubble sent";
            msgBubble.textContent = input.value.trim();
            body.appendChild(msgBubble);
            
            input.value = "";
            body.scrollTop = body.scrollHeight;
        }
    };

    // ==========================================
    // GAME CARDS & LAUNCH LOGIC
    // ==========================================
    function bindGameCardEvents() {
        const gameCards = document.querySelectorAll(".game-card");
        const heroTitle = document.getElementById("hero-game-title");
        const heroDesc = document.getElementById("hero-game-desc");
        const heroPlayerCount = document.getElementById("hero-player-count");
        const heroBannerImg = document.getElementById("hero-banner-img");
        const launchBtn = document.getElementById("launch-game-btn");

        gameCards.forEach(card => {
            card.addEventListener("click", () => {
                playClickSound();
                gameCards.forEach(c => c.classList.remove("active-card"));
                card.classList.add("active-card");
                if (heroTitle) heroTitle.textContent = card.getAttribute("data-title");
                if (heroDesc) heroDesc.textContent = card.getAttribute("data-desc");
                if (heroPlayerCount) heroPlayerCount.textContent = card.getAttribute("data-players");
                
                const imgPath = card.getAttribute("data-image");
                if(heroBannerImg && imgPath) {
                    heroBannerImg.src = imgPath;
                }
            });
        });

        if(launchBtn) {
            launchBtn.addEventListener("click", () => {
                playClickSound();
                const activeCard = document.querySelector(".game-card.active-card");
                const gameTitle = activeCard ? activeCard.getAttribute("data-title") : "Arcade Game";
                const gamePath = activeCard ? activeCard.getAttribute("data-path") : "";
                
                if (mainHeader) mainHeader.style.display = "none";

                centerHub.style.padding = "0";
                centerHub.style.overflow = "hidden";

                centerHub.innerHTML = `
                    <div style="position: relative; width: 100%; height: 100%; margin: 0; padding: 0; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                        
                        <button id="back-to-lobby-btn" style="position: absolute; top: 10px; left: 10px; z-index: 99; display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; background: rgba(0, 0, 0, 0.75); border: 1px solid var(--neon-blue); color: white; font-weight: 700; font-size: 0.8rem; cursor: pointer; backdrop-filter: blur(6px); box-shadow: 0 4px 15px rgba(0,0,0,0.6);">
                            <i class="fa-solid fa-arrow-left"></i> Exit
                        </button>

                        <div style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; overflow: hidden;">
                            ${gamePath ? `<iframe src="${gamePath}" style="width: 100\%; height: 100\%; border: none; display: block; margin: 0; padding: 0;" title="${gameTitle}"></iframe>` : `
                            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; gap:12px; background:#07090e;">
                                <i class="fa-solid fa-bolt-lightning" style="font-size:3rem; color: var(--neon-blue);"></i>
                                <h3 style="color:white; font-size: 1.1rem;">Game file not linked</h3>
                            </div>`}
                        </div>
                    </div>
                `;

                document.getElementById("back-to-lobby-btn").addEventListener("click", () => {
                    playClickSound();
                    if (mainHeader) mainHeader.style.display = "flex";
                    centerHub.style.padding = "20px";
                    centerHub.style.overflow = "auto";
                    switchToHomeView();
                });
            });
        }
    }
    bindGameCardEvents();

    // ==========================================
    // MEMBER ACTIONS & DRAWERS
    // ==========================================
    window.openMemberActionModal = function(name, isSelf) {
        playClickSound();
        if(isSelf) {
            window.showToast("That's you!");
            return;
        }
        window.closeAllDrawers();
        const actionDrawer = document.getElementById("member-action-drawer");
        document.getElementById("member-action-title").textContent = `Player: ${name}`;
        
        const btnContainer = document.getElementById("member-action-buttons");
        btnContainer.innerHTML = `
            <button class="modal-btn-save" style="background:rgba(6,214,160,0.2); color:var(--neon-green); border:1px solid var(--neon-green);" onclick="sendFriendRequestDB('${name}'); closeAllDrawers();"><i class="fa-solid fa-user-plus"></i> Add Friend</button>
            <button class="modal-btn-exit" style="background:rgba(239,71,111,0.2); color:#ef476f; border:1px solid #ef476f;" onclick="showToast('Reported ${name}'); closeAllDrawers();"><i class="fa-solid fa-triangle-exclamation"></i> Report Player</button>
            <button class="modal-btn-exit" style="background:rgba(255,42,109,0.2); color:var(--neon-pink); border:1px solid var(--neon-pink);" onclick="kickMemberByName('${name}'); closeAllDrawers();"><i class="fa-solid fa-user-slash"></i> Kick Player</button>
        `;

        if (actionDrawer) actionDrawer.classList.add("open");
        if (backdrop) backdrop.style.display = "block";
    };

    window.kickMemberByName = function(name) {
        const members = document.querySelectorAll(".party-member");
        members.forEach(m => {
            if(m.getAttribute("data-username") === name) {
                m.remove();
                window.showToast(`${name} kicked from group!`);
            }
        });
    };

    const openInviteBtn = document.getElementById("open-invite-modal-btn");
    const inviteDrawer = document.getElementById("invite-drawer");
    if(openInviteBtn && inviteDrawer) {
        openInviteBtn.addEventListener("click", () => {
            playClickSound();
            window.closeAllDrawers();
            inviteDrawer.classList.add("open");
            if (backdrop) backdrop.style.display = "block";
        });
    }

    const closeInviteBtn = document.getElementById("close-invite-modal");
    if(closeInviteBtn) {
        closeInviteBtn.addEventListener("click", () => {
            playClickSound();
            window.closeAllDrawers();
        });
    }

    const copyLinkBtn = document.getElementById("copy-link-btn");
    if(copyLinkBtn) {
        copyLinkBtn.addEventListener("click", () => {
            playClickSound();
            const inviteLink = document.getElementById("room-invite-link");
            if (inviteLink) {
                navigator.clipboard.writeText(inviteLink.value);
            }
            window.showToast("Room link copied!");
        });
    }

    const collapsePartyBtn = document.getElementById("collapse-party-btn");
    const partyMembersWrapper = document.getElementById("party-members-wrapper");
    const partyCollapseIcon = document.getElementById("party-collapse-icon");
    let isPartyCollapsed = false;

    if(collapsePartyBtn && partyMembersWrapper) {
        collapsePartyBtn.addEventListener("click", () => {
            playClickSound();
            isPartyCollapsed = !isPartyCollapsed;
            partyMembersWrapper.classList.toggle("collapsed");

            if(partyCollapseIcon) {
                partyCollapseIcon.className = isPartyCollapsed ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up";
            }
        });
    }

    const micBtn = document.getElementById("mic-toggle-btn");
    const speakerBtn = document.getElementById("speaker-toggle-btn");
    let micMuted = false;
    let speakerMuted = false;

    if(micBtn) {
        micBtn.addEventListener("click", () => {
            playClickSound();
            micMuted = !micMuted;
            micBtn.classList.toggle("active-state", micMuted);
            window.showToast(micMuted ? "Microphone Muted" : "Microphone Active");
        });
    }

    if(speakerBtn) {
        speakerBtn.addEventListener("click", () => {
            playClickSound();
            speakerMuted = !speakerMuted;
            speakerBtn.classList.toggle("active-state", speakerMuted);
            window.showToast(speakerMuted ? "Party Audio Muted" : "Party Audio Active");
        });
    }

    // ==========================================
    // CHAT SYSTEM (LOCAL + SUPABASE BROADCAST)
    // ==========================================
    const emojiToggleBtn = document.getElementById("emoji-toggle-btn");
    const emojiTray = document.getElementById("emoji-tray");
    const chatInput = document.getElementById("chat-input");
    const sendChatBtn = document.getElementById("send-chat-btn");
    const chatMessages = document.getElementById("chat-messages");

    if(emojiToggleBtn && emojiTray) {
        emojiToggleBtn.addEventListener("click", () => {
            playClickSound();
            emojiTray.classList.toggle("hidden-tray");
        });
    }

    function addGroupChatMessage(user, text) {
        const currentName = document.getElementById("header-username").textContent.trim();
        const displayName = (user === currentName || user === "RightClick") ? "You" : user;
        
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("chat-msg");
        
        const userSpan = document.createElement("span");
        userSpan.className = "c-user";
        userSpan.textContent = `${displayName}: `;
        
        const textNode = document.createTextNode(String(text || ''));
        
        msgDiv.appendChild(userSpan);
        msgDiv.appendChild(textNode);
        
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    if(sendChatBtn && chatInput) {
        sendChatBtn.addEventListener("click", () => {
            const val = chatInput.value.trim();
            if(val !== "") {
                playClickSound();
                const username = document.getElementById("header-username").textContent.trim();
                
                addGroupChatMessage(username, val);

                if (roomChannel) {
                    roomChannel.send({
                        type: 'broadcast',
                        event: 'chat-msg',
                        payload: { user: username, text: val }
                    });
                }

                chatInput.value = "";
                if(emojiTray) emojiTray.classList.add("hidden-tray");
            }
        });

        chatInput.addEventListener("keypress", (e) => {
            if(e.key === "Enter") sendChatBtn.click();
        });
    }

    const emojiBtns = document.querySelectorAll(".emoji-btn");
    emojiBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            playClickSound();
            const username = document.getElementById("header-username").textContent.trim();
            const emoji = btn.getAttribute("data-emoji");
            
            addGroupChatMessage(username, emoji);

            if (roomChannel) {
                roomChannel.send({
                    type: 'broadcast',
                    event: 'chat-msg',
                    payload: { user: username, text: emoji }
                });
            }

            if(emojiTray) emojiTray.classList.add("hidden-tray");
        });
    });

    // ==========================================
    // NOTIFICATIONS, SETTINGS & PROFILE
    // ==========================================
    const notifBtn = document.getElementById("notif-btn");
    const notifDrawer = document.getElementById("notif-drawer");
    if(notifBtn && notifDrawer) {
        notifBtn.addEventListener("click", () => {
            playClickSound();
            const isOpen = notifDrawer.classList.contains("open");
            window.closeAllDrawers();
            if(!isOpen) {
                notifDrawer.classList.add("open");
                if (backdrop) backdrop.style.display = "block";
            }
        });
    }

    const clearNotifBtn = document.getElementById("clear-notif-btn");
    if(clearNotifBtn) {
        clearNotifBtn.addEventListener("click", () => {
            playClickSound();
            document.getElementById("notif-list").innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:10px;">No notifications</p>';
            updateNotificationBadge();
        });
    }

    const settingsBtn = document.getElementById("settings-btn");
    const settingsDrawer = document.getElementById("settings-drawer");
    if(settingsBtn && settingsDrawer) {
        settingsBtn.addEventListener("click", () => {
            playClickSound();
            const isOpen = settingsDrawer.classList.contains("open");
            window.closeAllDrawers();
            if(!isOpen) {
                settingsDrawer.classList.add("open");
                if (backdrop) backdrop.style.display = "block";
            }
        });
    }

    const closeSettingsBtn = document.getElementById("close-settings-drawer-btn");
    if(closeSettingsBtn) {
        closeSettingsBtn.addEventListener("click", () => {
            playClickSound();
            window.closeAllDrawers();
        });
    }

    const profileBtn = document.getElementById("profile-btn");
    const profileDrawer = document.getElementById("profile-drawer");
    if(profileBtn && profileDrawer) {
        profileBtn.addEventListener("click", () => {
            playClickSound();
            const isOpen = profileDrawer.classList.contains("open");
            window.closeAllDrawers();
            if(!isOpen) {
                profileDrawer.classList.add("open");
                if (backdrop) backdrop.style.display = "block";
            }
        });
    }

    const closeProfileBtn = document.getElementById("close-profile-drawer-btn");
    if(closeProfileBtn) {
        closeProfileBtn.addEventListener("click", () => {
            playClickSound();
            window.closeAllDrawers();
        });
    }

    const themeRadios = document.querySelectorAll('input[name="theme-radio"]');
    themeRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            playClickSound();
            document.body.className = e.target.value;
            window.showToast("Theme updated!");
        });
    });

    const musicToggle = document.getElementById("theme-music-toggle");
    const musicVolumeSlider = document.getElementById("music-volume-slider");
    const sfxToggle = document.getElementById("sfx-toggle");

    if(musicToggle) {
        musicToggle.addEventListener("change", () => {
            playClickSound();
            if(musicToggle.checked) {
                startThemeMusic();
                window.showToast("Theme Music Enabled");
            } else {
                stopThemeMusic();
                window.showToast("Theme Music Disabled");
            }
        });
    }

    if(musicVolumeSlider) {
        musicVolumeSlider.addEventListener("input", (e) => {
            musicVolume = parseFloat(e.target.value);
        });
    }

    if(sfxToggle) {
        sfxToggle.addEventListener("change", () => {
            sfxEnabled = sfxToggle.checked;
            window.showToast(sfxEnabled ? "SFX Enabled" : "SFX Muted");
        });
    }

    const avatarGrid = document.getElementById("avatar-grid");
    const avatarSeeds = ["Male1", "Male2", "Male3", "Female1", "Female2", "Female3", "Cyborg", "Scorpion", "Dragon", "Alien"];
    if(avatarGrid) {
        avatarGrid.innerHTML = "";
        avatarSeeds.forEach((seed, index) => {
            const img = document.createElement("img");
            img.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
            img.classList.add("avatar-option");
            if(index === 0) img.classList.add("selected");
            img.addEventListener("click", () => {
                playClickSound();
                document.querySelectorAll(".avatar-option").forEach(a => a.classList.remove("selected"));
                img.classList.add("selected");
                document.getElementById("header-avatar-img").src = img.src;
                document.getElementById("profile-drawer-pic").src = img.src;
            });
            avatarGrid.appendChild(img);
        });
    }

    const profileSaveBtn = document.getElementById("profile-save-btn");
    if(profileSaveBtn) {
        profileSaveBtn.addEventListener("click", async () => {
            playClickSound();
            const usernameInput = document.getElementById("username-input");
            let newName = usernameInput.value.trim();
            
            if(newName.length > 20) {
                window.showToast("Username must be max 20 characters!");
                return;
            }
            const regex = /^[a-zA-Z0-9\s]+$/;
            if(!regex.test(newName)) {
                window.showToast("Special characters not allowed!");
                return;
            }

            if(newName) { 
                document.getElementById("header-username").textContent = newName;
                document.getElementById("profile-drawer-name").textContent = newName;
                await syncMyProfile();
                setupRealtimeRoom();
            }
            window.showToast("Profile updated!");
            window.closeAllDrawers();
        });
    }

    // Audio Autoplay Policy Fix: Mobile touch/click detection
    ['click', 'touchstart'].forEach(evt => {
        document.body.addEventListener(evt, () => {
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            if (musicToggle && musicToggle.checked && !isMusicPlaying) {
                startThemeMusic();
            }
        }, { once: true });
    });

    // Initialize Active Live Room & Register Profile
    syncMyProfile();
    setupRealtimeRoom();
});