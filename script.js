document.addEventListener("DOMContentLoaded", () => {
    let audioCtx = null;
    let musicInterval = null;
    let isMusicPlaying = false;
    let musicVolume = 0.4;
    let sfxEnabled = true;

    // Automatic Landscape Orientation Lock API (supported browsers)
    function enforceLandscapeLock() {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("landscape").catch(() => {});
        }
    }

    window.addEventListener("load", enforceLandscapeLock);
    window.addEventListener("orientationchange", enforceLandscapeLock);

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

    let notifTimeout = null;
    function showToast(msg) {
        const toast = document.getElementById("single-notif-toast");
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = "block";
        
        if (notifTimeout) clearTimeout(notifTimeout);
        notifTimeout = setTimeout(() => {
            toast.style.display = "none";
        }, 3000);
    }

    window.triggerNotificationToast = function(msg) {
        showToast(msg);
    };
    const tabs = document.querySelectorAll(".tab-btn");
    const centerHub = document.getElementById("center-hub");
    const leftSidebar = document.getElementById("left-sidebar");
    const mainContainer = document.getElementById("main-container");
    const backdrop = document.getElementById("modal-backdrop");

    // Close all sliding drawers
    window.closeAllDrawers = function() {
        document.getElementById("notif-drawer").classList.remove("open");
        document.getElementById("settings-drawer").classList.remove("open");
        document.getElementById("profile-drawer").classList.remove("open");
        
        const inviteDrawer = document.getElementById("invite-drawer");
        if (inviteDrawer) inviteDrawer.classList.remove("open");
        
        const memberDrawer = document.getElementById("member-action-drawer");
        if (memberDrawer) memberDrawer.classList.remove("open");

        if (backdrop) backdrop.style.display = "none";
    }

    if (backdrop) {
        backdrop.addEventListener("click", closeAllDrawers);
    }

    document.addEventListener("click", (e) => {
        const drawers = document.querySelectorAll(".side-drawer");
        const triggers = [
            document.getElementById("notif-btn"),
            document.getElementById("settings-btn"),
            document.getElementById("profile-btn"),
            document.getElementById("open-invite-modal-btn")
        ];

        let clickedInsideDrawer = false;
        drawers.forEach(d => {
            if (d && d.contains(e.target)) clickedInsideDrawer = true;
        });

        let clickedTriggerBtn = false;
        triggers.forEach(t => {
            if (t && t.contains(e.target)) clickedTriggerBtn = true;
        });

        const isPartyMember = e.target.closest(".party-member");

        if (!clickedInsideDrawer && !clickedTriggerBtn && !isPartyMember) {
            closeAllDrawers();
        }
    });

    function updateNotificationBadge() {
        const notifList = document.getElementById("notif-list");
        const notifBadge = document.getElementById("notif-badge");
        const items = notifList.querySelectorAll(".notif-item");
        const count = items.length;
        if (count > 0) {
            notifBadge.textContent = count;
            notifBadge.style.display = "inline-block";
        } else {
            notifBadge.textContent = "0";
            notifBadge.style.display = "none";
        }
    }
    updateNotificationBadge();

    function switchToHomeView() {
        playClickSound();
        closeAllDrawers();
        tabs.forEach(t => t.classList.remove("active"));
        document.querySelector('[data-tab="home"]').classList.add("active");
        
        leftSidebar.style.display = "flex";
        mainContainer.classList.remove("friends-active");

        centerHub.innerHTML = `
            <section class="hero-banner animated-bg" id="hero-banner">
                <div class="shooting-star"></div>
                <div class="shooting-star"></div>
                <div class="shooting-star"></div>
                <div class="random-dot" style="top: 20%; left: 15%; width: 3px; height: 3px;"></div>
                <div class="random-dot" style="top: 75%; left: 45%; width: 2px; height: 2px;"></div>
                <div class="random-dot" style="top: 30%; left: 70%; width: 4px; height: 4px;"></div>
                <div class="random-dot" style="top: 80%; left: 85%; width: 2px; height: 2px;"></div>
                <div class="gemini-star" style="top: 15%; left: 40%;"></div>
                <div class="gemini-star" style="top: 65%; left: 20%;"></div>
                <div class="gemini-star" style="top: 25%; left: 85%;"></div>

                <div class="hero-content">
                    <h1 id="hero-game-title">Dot Domination</h1>
                    <div class="hero-subtitle">
                        <span id="hero-player-count">👥 2 - 8 Players</span>
                        <span id="hero-game-desc">Draw lines. Claim boxes. Win! Conquer the grid and outsmart your opponents in high-speed multiplayer action.</span>
                    </div>
                    <button class="play-now-btn" id="launch-game-btn"><i class="fa-solid fa-play"></i> Play</button>
                </div>
                <img id="hero-banner-img" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300" alt="Banner Art">
            </section>
            <section class="games-section">
                <div class="games-section-header">
                    <h2>Games</h2>
                </div>
                <div class="games-grid" id="games-grid-container">
                    <div class="game-card active-card" data-game="dot-domination" data-title="Dot Domination" data-desc="Draw lines. Claim boxes. Win! Conquer the grid and outsmart your opponents in high-speed multiplayer action." data-players="👥 2 - 8 Players" data-image="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300">
                        <div class="card-thumb">
                            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300" alt="Dot Domination">
                        </div>
                        <h3>Dot Domination</h3>
                        <div class="game-card-meta">
                            <span>👥 2 - 8 Players</span>
                        </div>
                    </div>
                    <div class="game-card" data-game="quiz-arena" data-title="Quiz Arena" data-desc="Test your knowledge. Beat your friends in real-time trivia battles across multiple categories!" data-players="👥 2 - 6 Players" data-image="https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=300">
                        <div class="card-thumb">
                            <img src="https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=300" alt="Quiz Arena">
                        </div>
                        <h3>Quiz Arena</h3>
                        <div class="game-card-meta">
                            <span>👥 2 - 6 Players</span>
                        </div>
                    </div>
                    <div class="game-card" data-game="tictactoe" data-title="Tic Tac Toe" data-desc="Simple. Strategic. Addictive. Classic gameplay with futuristic neon styling and quick matchmaking!" data-path="TTto.html" data-players="👥 2 Players" data-image="TTtoIMG.png">
                        <div class="card-thumb">
                            <img src="TTtoIMG.png" alt="Tic Tac Toe">
                        </div>
                        <h3>Tic Tac Toe</h3>
                        <div class="game-card-meta">
                            <span>👥 2 Players</span>
                        </div>
                    </div>
                    <div class="game-card" data-game="snake-battle" data-title="Snake Battle" data-desc="Eat, grow, outlast. Navigate the arena and trap rival players in glowing neon trails!" data-players="👥 2 - 4 Players" data-image="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300">
                        <div class="card-thumb">
                            <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300" alt="Snake Battle">
                        </div>
                        <h3>Snake Battle</h3>
                        <div class="game-card-meta">
                            <span>👥 2 - 4 Players</span>
                        </div>
                    </div>
                    <div class="game-card" data-game="tictactoe" data-title="Tic Tac Toe" data-desc="Simple. Strategic. Addictive. Classic gameplay with futuristic neon styling and quick matchmaking!" data-players="👥 2 Players" data-image="TTtoIMG.png">
                        <div class="card-thumb">
                            <img src="TTtoIMG.png" alt="Tic Tac Toe">
                        </div>
                        <h3>Tic Tac Toe</h3>
                        <div class="game-card-meta">
                            <span>👥 2 Players</span>
                        </div>
                    </div>
                </div>
            </section>
        `;
        bindGameCardEvents();
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            if(tab.classList.contains("inactive-tab")) {
                showToast("Leaderboard coming soon in next update!");
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
        closeAllDrawers();
        leftSidebar.style.display = "none";
        mainContainer.classList.add("friends-active");

        centerHub.innerHTML = `
            <div class="friends-tab-layout">
                <div class="friends-list-panel">
                    <div class="friends-list-header">Friends</div>
                    <div class="friends-hub-list">
                        <div class="friend-hub-item" onclick="openFriendChat('PixelBunny')">
                            <div class="avatar-ring-online" style="width:30px;height:30px; display:flex; align-items:center; justify-content:center;">
                                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Bunny" style="width:24px;height:24px; border-radius:50%;">
                            </div>
                            <div style="display:flex; flex-direction:column; font-size:0.8rem;">
                                <span style="font-weight:600; color:var(--text-main);">PixelBunny</span>
                                <span style="font-size:0.68rem; color:var(--neon-green);">Online</span>
                            </div>
                        </div>
                        <div class="friend-hub-item" onclick="openFriendChat('ShadowFox')">
                            <div class="avatar-ring-online" style="width:30px;height:30px; display:flex; align-items:center; justify-content:center;">
                                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Shadow" style="width:24px;height:24px; border-radius:50%;">
                            </div>
                            <div style="display:flex; flex-direction:column; font-size:0.8rem;">
                                <span style="font-weight:600; color:var(--text-main);">ShadowFox</span>
                                <span style="font-size:0.68rem; color:var(--neon-gold);">In Lobby</span>
                            </div>
                        </div>
                        <div class="friend-hub-item" onclick="openFriendChat('AlphaKnight')">
                            <div class="avatar-ring-online" style="width:30px;height:30px; display:flex; align-items:center; justify-content:center;">
                                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Alpha" style="width:24px;height:24px; border-radius:50%;">
                            </div>
                            <div style="display:flex; flex-direction:column; font-size:0.8rem;">
                                <span style="font-weight:600; color:var(--text-main);">AlphaKnight</span>
                                <span style="font-size:0.68rem; color:var(--neon-blue);">In Game</span>
                            </div>
                        </div>
                        <div class="friend-hub-item" onclick="openFriendChat('GhostRider')">
                            <div class="avatar-ring-offline" style="width:30px;height:30px; display:flex; align-items:center; justify-content:center;">
                                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Ghost" style="width:24px;height:24px; border-radius:50%;">
                            </div>
                            <div style="display:flex; flex-direction:column; font-size:0.8rem;">
                                <span style="font-weight:600; color:var(--text-main);">GhostRider</span>
                                <span style="font-size:0.68rem; color:var(--text-muted);">45m ago</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="friends-content-wrapper">
                    <div class="friends-chat-window" id="friends-chat-window">
                        <div class="friends-chat-header">
                            <div class="friends-chat-header-left">
                                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Bunny" style="width:30px;height:30px;border-radius:50%;" id="active-chat-avatar">
                                <div>
                                    <span style="font-weight:700; font-size:0.85rem;" id="active-chat-name">PixelBunny</span>
                                </div>
                            </div>
                            <div class="friends-chat-actions">
                                <button class="action-chip unfried" onclick="showToast('User Unfriended')">Unfriend</button>
                                <button class="action-chip block" onclick="showToast('User Blocked')">Block</button>
                                <button class="action-chip report" onclick="showToast('User Reported')">Report</button>
                            </div>
                        </div>
                        <div class="friends-chat-messages-body" id="friend-chat-msgs">
                            <div class="f-bubble received">Hey! Ready for quiz?</div>
                            <div class="f-bubble sent">Haan bilkul, chalo start karte hain!</div>
                        </div>
                        <div class="friends-chat-footer">
                            <input type="text" id="friend-chat-input" placeholder="Type a message...">
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
                            <div class="find-result-card">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Alfa" style="width:26px;height:26px;border-radius:50%;">
                                    <span style="font-size:0.8rem; font-weight:600;">Alfa san</span>
                                </div>
                                <div style="display:flex; gap:6px;">
                                    <button class="add-btn" onclick="triggerNotificationToast('Friend request sent to Alfa san!')">Add</button>
                                    <button class="report-btn" onclick="showToast('Reported')">Report</button>
                                </div>
                            </div>
                            <div id="search-result-container"></div>
                        </div>

                        <div class="friends-panel-box">
                            <h3>Pending Friend Requests</h3>
                            <div class="req-card">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Queen" style="width:28px;height:28px;border-radius:50%;">
                                    <span style="font-size:0.8rem; font-weight:600;">PixelQueen</span>
                                </div>
                                <div class="req-actions">
                                    <button class="accept-btn" onclick="triggerNotificationToast('PixelQueen accepted your friend request!')">Accept</button>
                                    <button class="deny-btn" onclick="showToast('Request Denied')">Deny</button>
                                </div>
                            </div>
                        </div>

                        <div class="friends-panel-box">
                            <h3>BlockFriends</h3>
                            <div class="block-friend-row">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=BadGuy" style="width:28px;height:28px;border-radius:50%;">
                                    <span style="font-size:0.8rem; font-weight:600;">ToxicPlayer</span>
                                </div>
                                <button class="unblock-btn" onclick="showToast('User Unblocked')">Unblock</button>
                            </div>
                        </div>
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
    }

    window.openFriendChat = function(name) {
        playClickSound();
        document.getElementById("active-chat-name").textContent = name;
        document.getElementById("active-chat-avatar").src = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;
    }

    window.sendFriendChatMsg = function() {
        const input = document.getElementById("friend-chat-input");
        if(input && input.value.trim() !== "") {
            playClickSound();
            const body = document.getElementById("friend-chat-msgs");
            body.innerHTML += `<div class="f-bubble sent">${input.value}</div>`;
            input.value = "";
            body.scrollTop = body.scrollHeight;

            setTimeout(() => {
                body.innerHTML += `<div class="f-bubble received">Nice! Let's go.</div>`;
                body.scrollTop = body.scrollHeight;
            }, 1000);
        }
    }

    window.searchFriendAction = function() {
        playClickSound();
        const query = document.getElementById("friend-search-input").value.trim();
        if(!query) return;
        const container = document.getElementById("search-result-container");
        container.innerHTML = `
            <div class="find-result-card" style="margin-top: 5px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${query}" style="width:26px;height:26px;border-radius:50%;">
                    <span style="font-size:0.8rem; font-weight:600;">${query}</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="add-btn" onclick="triggerNotificationToast('Friend invite sent to ${query}!')">Add</button>
                    <button class="report-btn" onclick="showToast('Reported')">Report</button>
                </div>
            </div>
        `;
    }

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
                heroTitle.textContent = card.getAttribute("data-title");
                heroDesc.textContent = card.getAttribute("data-desc");
                heroPlayerCount.textContent = card.getAttribute("data-players");
                
                const imgPath = card.getAttribute("data-image");
                if(heroBannerImg && imgPath) {
                    heroBannerImg.src = imgPath;
                }
            });
        });

        if(launchBtn) {
            launchBtn.addEventListener("click", () => {
                playClickSound();
                enforceLandscapeLock();

                const activeCard = document.querySelector(".game-card.active-card");
                const gameTitle = activeCard ? activeCard.getAttribute("data-title") : "Arcade Game";
                const gamePath = activeCard ? activeCard.getAttribute("data-path") : "";
                
                document.getElementById("main-nav-tabs").style.display = "none";
                document.getElementById("profile-btn").style.display = "none";
                const settingsBtnEl = document.getElementById("settings-btn");
                if(settingsBtnEl) settingsBtnEl.style.display = "none";

                const openInviteModalBtn = document.getElementById("open-invite-modal-btn");
                if(openInviteModalBtn) openInviteModalBtn.style.display = "none";

                centerHub.innerHTML = `
                    <div class="inline-game-view">
                        <div class="game-nav-bar">
                            <button class="control-icon-btn" id="back-to-lobby-btn" title="Exit Game" style="width: auto; height: 35px; padding: 0 14px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color: var(--text-main); font-weight: 700; gap: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;"><i class="fa-solid fa-arrow-left"></i> Exit</button>
                            <span style="font-weight: 800; font-size: 1rem; color: var(--neon-blue); text-shadow: 0 0 10px rgba(76, 201, 240, 0.3);">${gameTitle}</span>
                            <div style="width: 60px;"></div>
                        </div>
                        <div class="game-canvas-box" style="padding: 0; background: #000;">
                            ${gamePath ? `<iframe src="${gamePath}" style="width: 100\%; height: 100\%; border: none;" title="${gameTitle}"></iframe>` : `
                            <div style="text-align:center; display:flex; flex-direction:column; gap:12px;">
                                <i class="fa-solid fa-bolt-lightning" style="font-size:3.5rem; color: var(--neon-blue);"></i>
                                <h2 style="color:white;">Playing ${gameTitle}</h2>
                            </div>`}
                        </div>
                    </div>
                `;

                document.getElementById("back-to-lobby-btn").addEventListener("click", () => {
                    playClickSound();
                    document.getElementById("main-nav-tabs").style.display = "flex";
                    document.getElementById("profile-btn").style.display = "flex";
                    if(settingsBtnEl) settingsBtnEl.style.display = "flex";
                    if(openInviteModalBtn) openInviteModalBtn.style.display = "flex";
                    switchToHomeView();
                });
            });
        }
    }
    bindGameCardEvents();

    // Group Member click opens right-side drawer
    window.openMemberActionModal = function(name, isSelf) {
        playClickSound();
        if(isSelf) {
            showToast("That's you!");
            return;
        }
        closeAllDrawers();
        const actionDrawer = document.getElementById("member-action-drawer");
        document.getElementById("member-action-title").textContent = `Player: ${name}`;
        
        const btnContainer = document.getElementById("member-action-buttons");
        btnContainer.innerHTML = `
            <button class="modal-btn-save" style="background:rgba(6,214,160,0.2); color:var(--neon-green); border:1px solid var(--neon-green);" onclick="triggerNotificationToast('Friend request sent to ${name}'); closeAllDrawers();"><i class="fa-solid fa-user-plus"></i> Add Friend</button>
            <button class="modal-btn-exit" style="background:rgba(239,71,111,0.2); color:#ef476f; border:1px solid #ef476f;" onclick="showToast('Reported ${name}'); closeAllDrawers();"><i class="fa-solid fa-triangle-exclamation"></i> Report Player</button>
            <button class="modal-btn-exit" style="background:rgba(255,42,109,0.2); color:var(--neon-pink); border:1px solid var(--neon-pink);" onclick="kickMemberByName('${name}'); closeAllDrawers();"><i class="fa-solid fa-user-slash"></i> Kick Player</button>
        `;

        actionDrawer.classList.add("open");
        if(backdrop) backdrop.style.display = "block";
    }

    window.kickMemberByName = function(name) {
        const members = document.querySelectorAll(".party-member");
        members.forEach(m => {
            if(m.textContent.includes(name)) {
                m.remove();
                showToast(`${name} kicked from group!`);
            }
        });
    }

    const collapsePartyBtn = document.getElementById("collapse-party-btn");
    const partyMembersWrapper = document.getElementById("party-members-wrapper");
    const partyCollapseIcon = document.getElementById("party-collapse-icon");
    let isPartyCollapsed = false;

    collapsePartyBtn.addEventListener("click", () => {
        playClickSound();
        isPartyCollapsed = !isPartyCollapsed;
        partyMembersWrapper.classList.toggle("collapsed");

        if(isPartyCollapsed) {
            partyCollapseIcon.classList.remove("fa-chevron-up");
            partyCollapseIcon.classList.add("fa-chevron-down");
        } else {
            partyCollapseIcon.classList.remove("fa-chevron-down");
            partyCollapseIcon.classList.add("fa-chevron-up");
        }
    });

    const micBtn = document.getElementById("mic-toggle-btn");
    const speakerBtn = document.getElementById("speaker-toggle-btn");
    let micMuted = false;
    let speakerMuted = false;

    micBtn.addEventListener("click", () => {
        playClickSound();
        micMuted = !micMuted;
        micBtn.classList.toggle("active-state", micMuted);
        showToast(micMuted ? "Microphone Muted" : "Microphone Active");
    });

    speakerBtn.addEventListener("click", () => {
        playClickSound();
        speakerMuted = !speakerMuted;
        speakerBtn.classList.toggle("active-state", speakerMuted);
        showToast(speakerMuted ? "Party Audio Muted" : "Party Audio Active");
    });

    const emojiToggleBtn = document.getElementById("emoji-toggle-btn");
    const emojiTray = document.getElementById("emoji-tray");
    const chatInput = document.getElementById("chat-input");
    const sendChatBtn = document.getElementById("send-chat-btn");
    const chatMessages = document.getElementById("chat-messages");

    emojiToggleBtn.addEventListener("click", () => {
        playClickSound();
        emojiTray.classList.toggle("hidden-tray");
    });

    function addGroupChatMessage(user, text) {
        const currentName = document.getElementById("header-username").textContent;
        const displayName = (user === currentName || user === "RightClick") ? "You" : user;
        
        const micEl = document.getElementById(`mic-${user.toLowerCase().replace(/\s+/g, '')}`);
        if (micEl) {
            micEl.classList.add("active");
            setTimeout(() => micEl.classList.remove("active"), 2500);
        }

        const msgDiv = document.createElement("div");
        msgDiv.classList.add("chat-msg");
        msgDiv.innerHTML = `<span class="c-user">${displayName}:</span> ${text}`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendChatBtn.addEventListener("click", () => {
        if(chatInput.value.trim() !== "") {
            playClickSound();
            const username = document.getElementById("header-username").textContent;
            addGroupChatMessage(username, chatInput.value);
            chatInput.value = "";
            emojiTray.classList.add("hidden-tray");
        }
    });

    chatInput.addEventListener("keypress", (e) => {
        if(e.key === "Enter") sendChatBtn.click();
    });

    const emojiBtns = document.querySelectorAll(".emoji-btn");
    emojiBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            playClickSound();
            const username = document.getElementById("header-username").textContent;
            addGroupChatMessage(username, btn.getAttribute("data-emoji"));
            emojiTray.classList.add("hidden-tray");
        });
    });

    const notifBtn = document.getElementById("notif-btn");
    const notifDrawer = document.getElementById("notif-drawer");
    notifBtn.addEventListener("click", () => {
        playClickSound();
        const isOpen = notifDrawer.classList.contains("open");
        closeAllDrawers();
        if(!isOpen) {
            notifDrawer.classList.add("open");
            if(backdrop) backdrop.style.display = "block";
        }
    });

    document.getElementById("clear-notif-btn").addEventListener("click", () => {
        playClickSound();
        document.getElementById("notif-list").innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:10px;">No notifications</p>';
        updateNotificationBadge();
    });

    const settingsBtn = document.getElementById("settings-btn");
    const settingsDrawer = document.getElementById("settings-drawer");
    settingsBtn.addEventListener("click", () => {
        playClickSound();
        const isOpen = settingsDrawer.classList.contains("open");
        closeAllDrawers();
        if(!isOpen) {
            settingsDrawer.classList.add("open");
            if(backdrop) backdrop.style.display = "block";
        }
    });

    document.getElementById("close-settings-drawer-btn").addEventListener("click", () => {
        playClickSound();
        closeAllDrawers();
    });

    const profileBtn = document.getElementById("profile-btn");
    const profileDrawer = document.getElementById("profile-drawer");
    profileBtn.addEventListener("click", () => {
        playClickSound();
        const isOpen = profileDrawer.classList.contains("open");
        closeAllDrawers();
        if(!isOpen) {
            profileDrawer.classList.add("open");
            if(backdrop) backdrop.style.display = "block";
        }
    });

    document.getElementById("close-profile-drawer-btn").addEventListener("click", () => {
        playClickSound();
        closeAllDrawers();
    });

    const themeRadios = document.querySelectorAll('input[name="theme-radio"]');
    themeRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            playClickSound();
            const selectedTheme = e.target.value;
            document.body.className = selectedTheme;
            showToast("Theme updated!");
        });
    });

    const musicToggle = document.getElementById("theme-music-toggle");
    const musicVolumeSlider = document.getElementById("music-volume-slider");
    const sfxToggle = document.getElementById("sfx-toggle");

    musicToggle.addEventListener("change", () => {
        playClickSound();
        if(musicToggle.checked) {
            startThemeMusic();
            showToast("Theme Music Enabled");
        } else {
            stopThemeMusic();
            showToast("Theme Music Disabled");
        }
    });

    musicVolumeSlider.addEventListener("input", (e) => {
        musicVolume = parseFloat(e.target.value);
    });

    sfxToggle.addEventListener("change", () => {
        sfxEnabled = sfxToggle.checked;
        showToast(sfxEnabled ? "SFX Enabled" : "SFX Muted");
    });

    // Group Invite Button opens right-side drawer
    const inviteDrawer = document.getElementById("invite-drawer");
    document.getElementById("open-invite-modal-btn").addEventListener("click", () => {
        playClickSound();
        closeAllDrawers();
        inviteDrawer.classList.add("open");
        if(backdrop) backdrop.style.display = "block";
    });

    document.getElementById("close-invite-modal").addEventListener("click", () => {
        playClickSound();
        closeAllDrawers();
    });

    document.getElementById("copy-link-btn").addEventListener("click", () => {
        playClickSound();
        showToast("Room joining link copied!");
    });

    const avatarGrid = document.getElementById("avatar-grid");
    const avatarSeeds = ["Male1", "Male2", "Male3", "Female1", "Female2", "Female3", "Cyborg", "Scorpion", "Dragon", "Alien"];
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

    document.getElementById("profile-save-btn").addEventListener("click", () => {
        playClickSound();
        const usernameInput = document.getElementById("username-input");
        let newName = usernameInput.value.trim();
        
        if(newName.length > 20) {
            showToast("Username must be max 20 characters!");
            return;
        }
        const regex = /^[a-zA-Z0-9\s]+$/;
        if(!regex.test(newName)) {
            showToast("Special characters are not allowed in username!");
            return;
        }

        if(newName) { 
            document.getElementById("header-username").textContent = newName; 
            document.getElementById("profile-drawer-name").textContent = newName;
        }
        showToast("Profile updated!");
        closeAllDrawers();
    });

    document.body.addEventListener('click', () => {
        enforceLandscapeLock();
        if (musicToggle && musicToggle.checked && !isMusicPlaying) {
            startThemeMusic();
        }
    }, { once: true });
});