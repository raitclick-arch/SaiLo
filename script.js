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

    // Toast Popup function
    window.showToast = function(msg) {
        const toast = document.getElementById("toast-popup");
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = "block";
        toast.style.opacity = "1";
        setTimeout(() => {
            toast.style.display = "none";
        }, 3000);
    };

    window.triggerNotificationToast = function(msg) {
        const bellToast = document.getElementById("bell-toast-msg");
        if (bellToast) {
            bellToast.textContent = msg;
            bellToast.style.display = "block";
            setTimeout(() => {
                bellToast.style.display = "none";
            }, 3000);
        }
        window.showToast(msg);
    };

    const tabs = document.querySelectorAll(".tab-btn");
    const centerHub = document.getElementById("center-hub");
    const leftSidebar = document.getElementById("left-sidebar");
    const mainContainer = document.getElementById("main-container");

    const initialHomeHTML = centerHub ? centerHub.innerHTML : "";

    function closeAllDrawers() {
        const nd = document.getElementById("notif-drawer");
        const sd = document.getElementById("settings-drawer");
        const pd = document.getElementById("profile-drawer");
        if(nd) nd.classList.remove("open");
        if(sd) sd.classList.remove("open");
        if(pd) pd.classList.remove("open");
    }

    document.addEventListener("click", (e) => {
        const notifDrawer = document.getElementById("notif-drawer");
        const settingsDrawer = document.getElementById("settings-drawer");
        const profileDrawer = document.getElementById("profile-drawer");
        
        const notifBtn = document.getElementById("notif-btn");
        const settingsBtn = document.getElementById("settings-btn");
        const profileBtn = document.getElementById("profile-btn");

        const clickedInsideDrawer = (notifDrawer && notifDrawer.contains(e.target)) || 
                                    (settingsDrawer && settingsDrawer.contains(e.target)) || 
                                    (profileDrawer && profileDrawer.contains(e.target));
        const clickedTriggerBtn = (notifBtn && notifBtn.contains(e.target)) || 
                                  (settingsBtn && settingsBtn.contains(e.target)) || 
                                  (profileBtn && profileBtn.contains(e.target));

        if (!clickedInsideDrawer && !clickedTriggerBtn) {
            closeAllDrawers();
        }
    });

    function updateNotificationBadge() {
        const notifList = document.getElementById("notif-list");
        const notifBadge = document.getElementById("notif-badge");
        if (!notifList || !notifBadge) return;
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
        const homeTab = document.querySelector('[data-tab="home"]');
        if (homeTab) homeTab.classList.add("active");
        
        if (leftSidebar) leftSidebar.style.display = "flex";
        if (mainContainer) mainContainer.classList.remove("friends-active");

        if (centerHub) centerHub.innerHTML = initialHomeHTML;
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
        closeAllDrawers();
        if (leftSidebar) leftSidebar.style.display = "none";
        if (mainContainer) mainContainer.classList.add("friends-active");

        if (!centerHub) return;
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
                if(e.key === "Enter") window.sendFriendChatMsg();
            });
        }
    }

    window.openFriendChat = function(name) {
        playClickSound();
        const chatName = document.getElementById("active-chat-name");
        const chatAvatar = document.getElementById("active-chat-avatar");
        if (chatName) chatName.textContent = name;
        if (chatAvatar) chatAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;
    };

    window.sendFriendChatMsg = function() {
        const input = document.getElementById("friend-chat-input");
        if(input && input.value.trim() !== "") {
            playClickSound();
            const body = document.getElementById("friend-chat-msgs");
            if (body) {
                body.innerHTML += `<div class="f-bubble sent">${input.value}</div>`;
                body.scrollTop = body.scrollHeight;

                setTimeout(() => {
                    body.innerHTML += `<div class="f-bubble received">Nice! Let's go.</div>`;
                    body.scrollTop = body.scrollHeight;
                }, 1000);
            }
            input.value = "";
        }
    };

    window.searchFriendAction = function() {
        playClickSound();
        const searchInput = document.getElementById("friend-search-input");
        if (!searchInput) return;
        const query = searchInput.value.trim();
        if(!query) return;
        const container = document.getElementById("search-result-container");
        if (!container) return;
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
    };

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
                
                const mainHeader = document.getElementById("arcade-header");
                if (mainHeader) mainHeader.style.display = "none";

                // 0 Margin/Padding and 200:150 (4:3) Aspect Ratio Game Screen
                centerHub.innerHTML = `
                    <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #07090e; overflow: hidden; margin: 0; padding: 0; box-sizing: border-box;">
                        
                        <!-- Floating Exit Button -->
                        <button id="back-to-lobby-btn" style="position: absolute; top: 12px; left: 12px; z-index: 99; display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; background: rgba(0, 0, 0, 0.75); border: 1px solid var(--neon-blue); color: white; font-weight: 700; font-size: 0.8rem; cursor: pointer; backdrop-filter: blur(6px); box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                            <i class="fa-solid fa-arrow-left"></i> Exit
                        </button>

                        <!-- Aspect ratio: 200 (width) / 150 (height) = 4 / 3 with zero margin -->
                        <div style="height: 100%; width: 100%; max-height: 100%; aspect-ratio: 4 / 3; display: flex; justify-content: center; align-items: center; margin: 0; padding: 0; background: #000; overflow: hidden;">
                            ${gamePath ? `<iframe src="${gamePath}" style="width: 100\%; height: 100\%; border: none; display: block; margin: 0; padding: 0;" title="${gameTitle}"></iframe>` : `
                            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px;">
                                <i class="fa-solid fa-bolt-lightning" style="font-size:3rem; color: var(--neon-blue);"></i>
                                <h3 style="color:white; font-size: 1.1rem;">Game file not linked</h3>
                            </div>`}
                        </div>
                    </div>
                `;

                document.getElementById("back-to-lobby-btn").addEventListener("click", () => {
                    playClickSound();
                    if (mainHeader) mainHeader.style.display = "flex";
                    switchToHomeView();
                });
            });
        }
    }
    bindGameCardEvents();

    // Group Member Action Modal logic
    window.openMemberActionModal = function(name, isSelf) {
        playClickSound();
        if(isSelf) {
            window.showToast("That's you!");
            return;
        }
        const modal = document.getElementById("modal-backdrop");
        const actionModal = document.getElementById("member-action-modal");
        const title = document.getElementById("member-action-title");
        const btnContainer = document.getElementById("member-action-buttons");

        if (title) title.textContent = `Player: ${name}`;
        if (btnContainer) {
            btnContainer.innerHTML = `
                <button class="modal-btn-save" style="background:rgba(6,214,160,0.2); color:var(--neon-green); border:1px solid var(--neon-green); padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;" onclick="triggerNotificationToast('Friend request sent to ${name}'); closeAllModals();"><i class="fa-solid fa-user-plus"></i> Add Friend</button>
                <button class="modal-btn-exit" style="background:rgba(239,71,111,0.2); color:#ef476f; border:1px solid #ef476f; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;" onclick="showToast('Reported ${name}'); closeAllModals();"><i class="fa-solid fa-triangle-exclamation"></i> Report Player</button>
                <button class="modal-btn-exit" style="background:rgba(255,42,109,0.2); color:var(--neon-pink); border:1px solid var(--neon-pink); padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;" onclick="kickMemberByName('${name}'); closeAllModals();"><i class="fa-solid fa-user-slash"></i> Kick Player</button>
            `;
        }

        if (modal) modal.style.display = "flex";
        if (actionModal) actionModal.style.display = "flex";
    };

    window.kickMemberByName = function(name) {
        const members = document.querySelectorAll(".party-member");
        members.forEach(m => {
            if(m.textContent.includes(name)) {
                m.remove();
                window.showToast(`${name} kicked from group!`);
            }
        });
    };

    // Modal Global Closer
    const backdrop = document.getElementById("modal-backdrop");
    const inviteModal = document.getElementById("invite-modal");
    const memberActionModal = document.getElementById("member-action-modal");

    window.closeAllModals = function() {
        if(backdrop) backdrop.style.display = "none";
        if(inviteModal) inviteModal.style.display = "none";
        if(memberActionModal) memberActionModal.style.display = "none";
    };

    // Invite Modal Trigger
    const openInviteBtn = document.getElementById("open-invite-modal-btn");
    if(openInviteBtn) {
        openInviteBtn.addEventListener("click", () => {
            playClickSound();
            closeAllDrawers();
            if(backdrop) backdrop.style.display = "flex";
            if(inviteModal) inviteModal.style.display = "flex";
        });
    }

    const closeInviteBtn = document.getElementById("close-invite-modal");
    if(closeInviteBtn) {
        closeInviteBtn.addEventListener("click", () => {
            playClickSound();
            window.closeAllModals();
        });
    }

    const copyLinkBtn = document.getElementById("copy-link-btn");
    if(copyLinkBtn) {
        copyLinkBtn.addEventListener("click", () => {
            playClickSound();
            window.showToast("Room joining link copied!");
        });
    }

    // Header Controls
    const rotationToggleBtn = document.getElementById("rotation-toggle-btn");
    if(rotationToggleBtn) {
        rotationToggleBtn.addEventListener("click", () => {
            playClickSound();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {
                    window.showToast("Fullscreen mode not supported.");
                });
                rotationToggleBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
                rotationToggleBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
            }
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
                if(isPartyCollapsed) {
                    partyCollapseIcon.classList.remove("fa-chevron-up");
                    partyCollapseIcon.classList.add("fa-chevron-down");
                } else {
                    partyCollapseIcon.classList.remove("fa-chevron-down");
                    partyCollapseIcon.classList.add("fa-chevron-up");
                }
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
        const currentNameEl = document.getElementById("header-username");
        const currentName = currentNameEl ? currentNameEl.textContent : "RightClick";
        const displayName = (user === currentName || user === "RightClick") ? "You" : user;
        
        const micEl = document.getElementById(`mic-${user.toLowerCase().replace(/\s+/g, '')}`);
        if (micEl) {
            micEl.classList.add("active");
            setTimeout(() => micEl.classList.remove("active"), 2500);
        }

        if (chatMessages) {
            const msgDiv = document.createElement("div");
            msgDiv.classList.add("chat-msg");
            msgDiv.innerHTML = `<span class="c-user">${displayName}:</span> ${text}`;
            chatMessages.appendChild(msgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    if(sendChatBtn) {
        sendChatBtn.addEventListener("click", () => {
            if(chatInput && chatInput.value.trim() !== "") {
                playClickSound();
                const usernameEl = document.getElementById("header-username");
                const username = usernameEl ? usernameEl.textContent : "RightClick";
                addGroupChatMessage(username, chatInput.value);
                chatInput.value = "";
                if(emojiTray) emojiTray.classList.add("hidden-tray");
            }
        });
    }

    if(chatInput) {
        chatInput.addEventListener("keypress", (e) => {
            if(e.key === "Enter" && sendChatBtn) sendChatBtn.click();
        });
    }

    const emojiBtns = document.querySelectorAll(".emoji-btn");
    emojiBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            playClickSound();
            const usernameEl = document.getElementById("header-username");
            const username = usernameEl ? usernameEl.textContent : "RightClick";
            addGroupChatMessage(username, btn.getAttribute("data-emoji"));
            if(emojiTray) emojiTray.classList.add("hidden-tray");
        });
    });

    // Drawers Trigger
    const notifBtn = document.getElementById("notif-btn");
    const notifDrawer = document.getElementById("notif-drawer");
    if(notifBtn && notifDrawer) {
        notifBtn.addEventListener("click", () => {
            playClickSound();
            const isOpen = notifDrawer.classList.contains("open");
            closeAllDrawers();
            if(!isOpen) notifDrawer.classList.add("open");
        });
    }

    const clearNotifBtn = document.getElementById("clear-notif-btn");
    if(clearNotifBtn) {
        clearNotifBtn.addEventListener("click", () => {
            playClickSound();
            const nList = document.getElementById("notif-list");
            if(nList) nList.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:10px;">No notifications</p>';
            updateNotificationBadge();
        });
    }

    const settingsBtn = document.getElementById("settings-btn");
    const settingsDrawer = document.getElementById("settings-drawer");
    if(settingsBtn && settingsDrawer) {
        settingsBtn.addEventListener("click", () => {
            playClickSound();
            const isOpen = settingsDrawer.classList.contains("open");
            closeAllDrawers();
            if(!isOpen) settingsDrawer.classList.add("open");
        });
    }

    const closeSettingsBtn = document.getElementById("close-settings-drawer-btn");
    if(closeSettingsBtn && settingsDrawer) {
        closeSettingsBtn.addEventListener("click", () => {
            playClickSound();
            settingsDrawer.classList.remove("open");
        });
    }

    const profileBtn = document.getElementById("profile-btn");
    const profileDrawer = document.getElementById("profile-drawer");
    if(profileBtn && profileDrawer) {
        profileBtn.addEventListener("click", () => {
            playClickSound();
            const isOpen = profileDrawer.classList.contains("open");
            closeAllDrawers();
            if(!isOpen) profileDrawer.classList.add("open");
        });
    }

    const closeProfileBtn = document.getElementById("close-profile-drawer-btn");
    if(closeProfileBtn && profileDrawer) {
        closeProfileBtn.addEventListener("click", () => {
            playClickSound();
            profileDrawer.classList.remove("open");
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
                const hPic = document.getElementById("header-avatar-img");
                const pPic = document.getElementById("profile-drawer-pic");
                if (hPic) hPic.src = img.src;
                if (pPic) pPic.src = img.src;
            });
            avatarGrid.appendChild(img);
        });
    }

    const profileSaveBtn = document.getElementById("profile-save-btn");
    if(profileSaveBtn) {
        profileSaveBtn.addEventListener("click", () => {
            playClickSound();
            const usernameInput = document.getElementById("username-input");
            if (!usernameInput) return;
            let newName = usernameInput.value.trim();
            
            if(newName.length > 20) {
                window.showToast("Username must be max 20 characters!");
                return;
            }
            const regex = /^[a-zA-Z0-9\s]+$/;
            if(!regex.test(newName)) {
                window.showToast("Special characters are not allowed in username!");
                return;
            }

            if(newName) { 
                const hUser = document.getElementById("header-username");
                const pUser = document.getElementById("profile-drawer-name");
                if (hUser) hUser.textContent = newName; 
                if (pUser) pUser.textContent = newName;
            }
            window.showToast("Profile updated!");
            if (profileDrawer) profileDrawer.classList.remove("open");
        });
    }

    document.body.addEventListener('click', () => {
        if (musicToggle && musicToggle.checked && !isMusicPlaying) {
            startThemeMusic();
        }
    }, { once: true });
});