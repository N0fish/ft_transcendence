import { navigateTo } from "../../main.ts";
import { UserProfile } from "../../models/user.ts";
import {
    blockUser,
    checkPendingFriendRequest, getCurrentUser, getMyFriends, isUserBlocked, removeFriend, sendFriendRequest, unblockUser
} from "./user.handler.ts";


interface Friend {
    userId: number;
    username: string;
    avatar?: string;
    status?: string;
}

interface UserStats {
    totalMatches: number;
    wins: number;
    losses: number;
    winRatio: string;
    avgDurationSec: number;
    matchHistory: Array<{
        opponent: string;
        score: string;
        result: string;
        playedAt: string;
        opponentId: number;
    }>;
}

export function UserPage() {
    return `
    <div id="user-profile-content" class="max-w-4xl mx-auto mt-10 p-6 rounded-lg text-gray-900 dark:text-gray-100">
        <div id="notification-toast" class="fixed top-4 right-4 max-w-xs bg-green-500 text-white p-4 rounded-lg shadow-lg transform transition-transform duration-300 translate-x-full flex items-center">
            <span id="notification-message">Success!</span>
            <button class="ml-4 text-white" onclick="document.getElementById('notification-toast').classList.add('translate-x-full')">×</button>
        </div>
        
        <div class="flex flex-col md:flex-row items-center md:items-start gap-6">
            <img id="avatar" class="w-32 h-32 rounded-full border-2 border-gray-300 dark:border-gray-600" src="" alt="User Avatar" />
            <div class="flex flex-col items-center md:items-start">
                <div class="flex items-center"><h2 id="user-name" class="text-2xl font-bold">Loading...</h2><div id="user-online-status" class="disk ml-2 bg-red-500"></div></div>
                <div id="relationship-status" class="mt-2 text-sm"></div>
                <div class="flex gap-4 mt-4">
                    <button id="friend-btn" class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm transition cursor-pointer">Send Friend Request</button>
                    <button id="block-btn" class="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white text-sm transition cursor-pointer">Block</button>
                    <button id="invite-btn" class="px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white text-sm transition cursor-pointer">Invite to Game</button>
                </div>
                
                <div id="confirmation-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden">
                    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h3 id="modal-title" class="text-xl font-bold mb-4">Confirmation</h3>
                        <p id="modal-message" class="mb-6">Are you sure you want to proceed?</p>
                        <div class="flex justify-end gap-4">
                            <button id="modal-cancel" class="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-gray-800">Cancel</button>
                            <button id="modal-confirm" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-white">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-8" id="bio">
            <h3 class="text-xl font-semibold mb-4">About</h3>
            <p id="user-about" class="text-white">Loading...</p>
        </div>

        <div class="mt-8" id="history">
            <h3 class="text-xl font-semibold mb-4">Game Statistics</h3>
            <div id="game-stats" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>Rating: <span id="rating">0</span></div>
                <div>Wins: <span id="stat-wins">0</span></div>
                <div>Losses: <span id="stat-losses">0</span></div>
                <div>Matches Played: <span id="stat-matches">0</span></div>
                <div>Win Rate: <span id="stat-winrate">0%</span></div>
            </div>
            
            <div class="mt-8" id="match-history-section">
                <h3 class="text-xl font-semibold mb-4">Recent Matches</h3>
                <div id="match-history-container" class="overflow-hidden rounded-lg">
                    <div class="bg-gray-700 p-4 grid grid-cols-3 gap-4 font-bold">
                        <div>Opponent</div>
                        <div>Result</div>
                        <div>Score</div>
                    </div>
                    <div id="match-history-list" class="max-h-96 overflow-y-auto">
                        <!-- Match history items will be inserted here -->
                        <div class="text-center p-4 text-gray-400">Loading match history...</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;
}

export function initializeUserPage(userId: string) {
    const container = document.getElementById("user-profile-content");

    function getAvatarUrl(path?: string): string {
        if (!path || path ==='default_avatar.png') {
            return '/default_avatar.png';
        }
        if (path.startsWith('https') || path.startsWith('/api')) {
            return path;
        }
        return `/api/${path}`;
    }

    function showNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
        const toast = document.getElementById('notification-toast');
        const messageEl = document.getElementById('notification-message');

        if (!toast || !messageEl) return;

        messageEl.textContent = message;

        toast.className = toast.className.replace(/bg-\w+-500/g, '');
        if (type === 'success') {
            toast.classList.add('bg-green-500');
        } else if (type === 'error') {
            toast.classList.add('bg-red-500');
        } else {
            toast.classList.add('bg-blue-500');
        }

        toast.classList.remove('translate-x-full');

        setTimeout(() => {
            toast.classList.add('translate-x-full');
        }, 3000);
    }

    function showConfirmation(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmation-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalMessage = document.getElementById('modal-message');
            const confirmBtn = document.getElementById('modal-confirm');
            const cancelBtn = document.getElementById('modal-cancel');

            if (!modal || !modalTitle || !modalMessage || !confirmBtn || !cancelBtn) {
                resolve(false);
                return;
            }

            modalTitle.textContent = title;
            modalMessage.textContent = message;

            modal.classList.remove('hidden');

            const handleConfirm = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
        });
    }

    async function loadUserStats(userId: string): Promise<UserStats | null> {
        const historyListElement = document.getElementById("match-history-list");
        try {
            const url = `/stats-api/stats/user/${userId}`;
            
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) {
                console.error("Stats API error status:", res.status);
                throw new Error(`Failed to fetch stats: ${res.status}`);
            }
            
            const responseText = await res.text();
            if (!responseText.trim()) {
                throw new Error("Empty response from stats service");
            }
            
            let stats;
            try {
                stats = JSON.parse(responseText);
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                throw new Error("Invalid response format from stats service");
            }
            
            const statWins = document.getElementById("stat-wins");
            const statLosses = document.getElementById("stat-losses");
            const statMatches = document.getElementById("stat-matches");
            const statWinrate = document.getElementById("stat-winrate");
            
            if (statWins) statWins.innerText = stats.wins.toString();
            if (statLosses) statLosses.innerText = stats.losses.toString();
            if (statMatches) statMatches.innerText = stats.totalMatches.toString();
            if (statWinrate) statWinrate.innerText = `${(Number.parseFloat(stats.winRatio) * 100).toFixed(1)}%`;
            
            if (stats.matchHistory && Array.isArray(stats.matchHistory)) {
                displayMatchHistory(stats.matchHistory);
            }
            
            return stats;
        } catch (error) {
            console.error("Error fetching user stats:", error);
            showNotification("Failed to load game statistics", "error");
            
            if(historyListElement) {
                historyListElement.innerHTML = 
                '<div class="text-center p-4 text-red-400">Failed to load match history</div>';
            }
            return null;            
        }
    }
    
    function displayMatchHistory(matchHistory: Array<{
        opponent: string;
        score: string;
        result: string;
        playedAt: string;
        opponentId: number;
    }> = []) {
        const historyContainer = document.getElementById("match-history-list");
        if (!historyContainer) return;
        historyContainer.innerHTML = '';
        
        if (matchHistory.length === 0) {
            historyContainer.innerHTML = '<div class="text-center p-4 text-gray-400">No matches played yet</div>';
            return;
        }
        
        matchHistory.slice(0, 5).forEach(match => {
            const matchElement = document.createElement('div');
            matchElement.className = 'grid grid-cols-3 gap-4 p-4 border-b border-gray-600 hover:bg-gray-700';
            
            const opponentCol = document.createElement('div');
            const opponentLink = document.createElement('a');
            opponentLink.href = `/user?id=${match.opponentId}`;
            opponentLink.className = 'text-blue-400 hover:underline';
            opponentLink.textContent = match.opponent;
            opponentCol.appendChild(opponentLink);
            
            const resultCol = document.createElement('div');
            resultCol.className = match.result === 'Win' ? 'text-green-500' : 'text-red-500';
            resultCol.textContent = match.result;
            
            const scoreCol = document.createElement('div');
            scoreCol.textContent = match.score;
            
            matchElement.appendChild(opponentCol);
            matchElement.appendChild(resultCol);
            matchElement.appendChild(scoreCol);
            
            historyContainer.appendChild(matchElement);
        });
    }

    async function loadUser() {
        try {
            const res = await fetch(`api/users/${userId}`, {
                credentials: "include",
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
            });

            if (res.status === 404) return navigateTo("/not-found");
            if (res.status === 403) return navigateTo("/blocked");

            const user = await res.json();

            const [currentUser, blockStatus, myFriendList, requestStatus] = await Promise.all([
                getCurrentUser(),
                isUserBlocked(parseInt(userId)),
                getMyFriends(),
                checkPendingFriendRequest(parseInt(userId))
            ]);

            const isFriend = myFriendList.some((friend: Friend) => friend.userId === parseInt(userId));

            updateUI(user, currentUser, blockStatus, isFriend, requestStatus);
            await loadUserStats(userId);
        } catch (err) {
            console.error("Fetch error:", err);
            showNotification("Failed to load user data", "error");
        }
    }

    function updateUI(user: UserProfile, _currentUser: any, blockStatus: any, isFriend: boolean, requestStatus: any) {
        if (!container) return;

        const fiveMinAgo = +new Date() - (5 * 60 * 1000);
        const avatar = document.getElementById("avatar") as HTMLImageElement;
        avatar.src = getAvatarUrl(user.avatar);

        const userName = document.getElementById("user-name") as HTMLElement;
        userName.innerText = user.username;

        const userOnlineStatus = document.getElementById("user-online-status") as HTMLElement;
        if (+new Date(user.lastAction) > fiveMinAgo) {
            userOnlineStatus.classList.add("online");
        } else {
            userOnlineStatus.classList.add("offline");
        }
        const rating = document.getElementById("rating") as HTMLElement;
        rating.innerText = ""+user.rating || "0";

        const relationshipStatus = document.getElementById("relationship-status") as HTMLElement;
        const userHistory =  document.getElementById("history") as HTMLElement;
        const userBio = document.getElementById("bio") as HTMLElement;
        const friendButton = document.getElementById("friend-btn") as HTMLButtonElement;
        const blockButton = document.getElementById("block-btn") as HTMLButtonElement;
        const inviteButton = document.getElementById("invite-btn") as HTMLButtonElement;

        if (blockStatus.isBlocked) {
            if (blockStatus.direction === 'outgoing') {
                relationshipStatus.innerText = 'You have blocked this user';
                relationshipStatus.className = 'mt-2 text-sm text-red-500';
            } else {
                relationshipStatus.innerText = 'This user has blocked you';
                relationshipStatus.className = 'mt-2 text-sm text-red-500';
                userHistory.style.display = "none"
                userBio.style.display = "none"
            }
        } else if (isFriend) {
            relationshipStatus.innerText = 'Friend';
            relationshipStatus.className = 'mt-2 text-sm text-green-500';
        } else if (requestStatus.hasPendingRequest) {
            if (requestStatus.direction === 'outgoing') {
                relationshipStatus.innerText = 'Friend Request Sent';
                relationshipStatus.className = 'mt-2 text-sm text-yellow-500';
            } else {
                relationshipStatus.innerText = 'Friend Request Received';
                relationshipStatus.className = 'mt-2 text-sm text-yellow-500';
            }
        } else {
            relationshipStatus.innerText = 'Not in your friend list';
            relationshipStatus.className = 'mt-2 text-sm text-gray-400';
        }

        if (blockStatus.isBlocked) {
            if (blockStatus.direction === 'outgoing') {
                friendButton.style.display = 'none';
                inviteButton.style.display = 'none';
                blockButton.innerText = 'Unblock User';
                blockButton.onclick = handleUnblockUser;
                userHistory.style.display = "none"
                userBio.style.display = "none"
            } else {
                friendButton.style.display = 'none';
                blockButton.style.display = 'none';
                inviteButton.style.display = 'none';
                 userHistory.style.display = "none"
                userBio.style.display = "none"
            }
        } else {
            if (isFriend) {
                friendButton.innerText = "Remove from Friends";
                friendButton.onclick = handleRemoveFriend;
            } else if (requestStatus.hasPendingRequest) {
                if (requestStatus.direction === 'outgoing') {
                    friendButton.innerText = "Cancel Request";
                    friendButton.onclick = () => handleCancelRequest(requestStatus.requestId);
                } else {
                    friendButton.innerText = "Accept Request";
                    friendButton.onclick = () => handleAcceptRequest(requestStatus.requestId);

                    const declineBtn = document.createElement('button');
                    declineBtn.innerText = "Decline";
                    declineBtn.className = "px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white text-sm transition ml-2";
                    declineBtn.onclick = () => handleDeclineRequest(requestStatus.requestId);

                    friendButton.parentNode?.insertBefore(declineBtn, friendButton.nextSibling);
                }
            } else {
                friendButton.innerText = "Send Friend Request";
                friendButton.onclick = handleSendFriendRequest;
            }

            blockButton.innerText = "Block User";
            blockButton.onclick = handleBlockUser;

            inviteButton.onclick = handleGameInvite;
        }

        const userAbout = document.getElementById("user-about") as HTMLElement;
        userAbout.innerText = user.bio || "No bio available.";
    }

    async function handleSendFriendRequest() {
        try {
            await sendFriendRequest(parseInt(userId));
            showNotification('Friend request sent successfully', 'success');
            window.location.reload();
        } catch (error: any) {
            console.error("Error sending friend request:", error);
            showNotification(error.message || 'Failed to send friend request', 'error');
        }
    }

    async function handleRemoveFriend() {
        try {
            const confirmed = await showConfirmation(
                'Remove Friend',
                'Are you sure you want to remove this friend?'
            );

            if (confirmed) {
                await removeFriend(parseInt(userId));
                showNotification('Friend removed successfully', 'success');
                window.location.reload();
            }
        } catch (error: any) {
            console.error("Error removing friend:", error);
            showNotification(error.message || 'Failed to remove friend', 'error');
        }
    }

    async function handleBlockUser() {
        try {
            const confirmed = await showConfirmation(
                'Block User',
                'Are you sure you want to block this user? They will no longer be able to see your profile or interact with you.'
            );

            if (confirmed) {
                await blockUser(parseInt(userId));
                showNotification('User blocked successfully', 'success');
                window.location.reload();
            }
        } catch (error: any) {
            console.error("Error blocking user:", error);
            showNotification(error.message || 'Failed to block user', 'error');
        }
    }

    async function handleUnblockUser() {
        try {
            const confirmed = await showConfirmation(
                'Unblock User',
                'Are you sure you want to unblock this user?'
            );

            if (confirmed) {
                await unblockUser(parseInt(userId));
                showNotification('User unblocked successfully', 'success');
                window.location.reload();
            }
        } catch (error: any) {
            console.error("Error unblocking user:", error);
            showNotification(error.message || 'Failed to unblock user', 'error');
        }
    }

    async function handleGameInvite() {
        try {

            const res = await fetch(`/go/find-match`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
                body: JSON.stringify({
                    mode: "random",
                    opponentId: Number.parseInt(userId),
                })
            });
            if (!res.ok) {
                const err = await res.json();
                if (res.status === 408) {
                    showNotification(err.message || "Timeout waiting for opponent.", 'error');
                } else {
                    showNotification("Matchmaking failed.", 'error');
                }
                return;
            }
            navigateTo(`/waiting-room`);
        } catch (err) {
            console.error("Could not invite to game:", err);
            showNotification("Could not invite to game.", 'error');
        }
    }

    async function handleCancelRequest(_requestId: number) {
        try {
            const confirmed = await showConfirmation(
                'Cancel Request',
                'Are you sure you want to cancel your friend request?'
            );

            if (confirmed) {
                showNotification('Friend request canceled', 'success');
                window.location.reload();
            }
        } catch (error: any) {
            console.error("Error canceling request:", error);
            showNotification(error.message || 'Failed to cancel request', 'error');
        }
    }

    async function handleAcceptRequest(_requestId: number) {
        try {
            showNotification('Friend request accepted', 'success');
            window.location.reload();
        } catch (error: any) {
            console.error("Error accepting request:", error);
            showNotification(error.message || 'Failed to accept request', 'error');
        }
    }

    async function handleDeclineRequest(_requestId: number) {
        try {
            const confirmed = await showConfirmation(
                'Decline Request',
                'Are you sure you want to decline this friend request?'
            );

            if (confirmed) {
                showNotification('Friend request declined', 'success');
                window.location.reload();
            }
        } catch (error: any) {
            console.error("Error declining request:", error);
            showNotification(error.message || 'Failed to decline request', 'error');
        }
    }

    loadUser();
}