import { BlockedUsersModal } from "../user/blocked.modal";
import { FriendRequestsModal } from "../user/friend-requests.modal";
import { FriendsModal } from "../user/friends.modal";
import { SearchUsersModal } from "../user/search.modal";
import { getPendingRequestsCount } from "../user/user.handler";

let friendsModal: FriendsModal | null = null;
let blockedModal: BlockedUsersModal | null = null;
let searchModal: SearchUsersModal | null = null;
let requestsModal: FriendRequestsModal | null = null;

export function ProfilePage() {
    return `
    <div class="w-full">
        <!-- Toast container for notifications -->
        <div id="profile-toast-container" class="fixed top-4 right-4 z-40"></div>
        
        <div class="max-w-[80%] mx-auto shadow-lg rounded-lg overflow-hidden">
            <div class="flex justify-between items-center py-6">
                <div class="p-6 space-y-4">
                  <div class="flex items-center">
                    <label for="profile-username" class="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                    <input id="profile-username" class="px-4 py-2 w-64 text-center bg-transparent border border-gray-400 rounded-lg focus:outline-none focus:border-blue-500" type="text" />
                  </div>
                  <div class="flex items-center">
                    <label for="profile-name" class="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <input id="profile-name" class="px-4 py-2 w-64 text-center bg-transparent border border-gray-400 rounded-lg focus:outline-none focus:border-blue-500" type="text" />
                  </div>
                  <div class="flex items-center">
                    <label for="status" class="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <input id="status" class="px-4 py-2 w-64 text-center bg-transparent border border-gray-400 rounded-lg focus:outline-none focus:border-blue-500" type="text" />
                  </div>
                </div>

                <div class="pr-10 flex flex-col items-center">
                    <img id="profile-avatar" class="w-40 h-40 rounded-full border-2 border-gray-200 dark:border-gray-600" src="" alt="Profile Avatar">
                    <input type="file" id="avatar-upload" class="hidden" accept="image/*">
                    <button id="change-avatar-btn" class="mt-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        Change Avatar
                    </button>
                </div>
            </div>
            <div class="p-6 border-t border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-medium">About</h3>
                <textarea id="profile-bio" class="mt-1 px-4 py-2 w-full border border-gray-400 rounded-lg bg-transparent focus:outline-none focus:border-blue-500 text-gray-700 dark:text-gray-300" rows="4"></textarea>
            </div>
            
            <div class="p-6 border-t border-gray-400 dark:border-gray-700">
                <button id="save-btn" class="w-full bg-secondary text-white py-2 rounded-md cursor-pointer hover:bg-secondary-light transition-colors">Save Profile</button>
            </div>
            <div id="profile-error" class="text-red-500 text-center pb-4 hidden"></div>
            <div id="profile-success" class="text-green-500 text-center pb-4 hidden"></div>
        </div>
        
        <!-- Modal buttons -->
        <div class="flex justify-center mt-8 mb-12">
            <div class="flex space-x-4">
                <button id="open-friends-modal" class="px-6 py-3 bg-blue-400 text-white font-medium rounded-lg hover:bg-blue-500 focus:outline-none transition-colors">
                    My Friends
                </button>
                <button id="open-blocked-modal" class="px-6 py-3 bg-purple-700 text-white font-medium rounded-lg hover:bg-purple-800 focus:outline-none transition-colors">
                    Blocked Users
                </button>
                <button id="open-requests-modal" class="px-6 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 focus:outline-none transition-colors relative">
                    Friend Requests
                    <span id="request-badge" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center hidden">
                        0
                    </span>
                </button>
                <button id="open-search-modal" class="px-6 py-3 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 focus:outline-none transition-colors">
                    Search Users
                </button>
            </div>
        </div>
    </div>
  `;
}

export function initializeProfile() {
    const profileUserName = document.getElementById('profile-username') as HTMLInputElement;
    const profileName = document.getElementById("profile-name") as HTMLInputElement;
    const profileAvatar = document.getElementById("profile-avatar") as HTMLImageElement;
    const profileBio = document.getElementById("profile-bio") as HTMLTextAreaElement;
    const saveButton = document.getElementById("save-btn") as HTMLButtonElement;
    const changeAvatarBtn = document.getElementById("change-avatar-btn") as HTMLButtonElement;
    const avatarUpload = document.getElementById("avatar-upload") as HTMLInputElement;
    const errorDiv = document.getElementById("profile-error") as HTMLDivElement;
    const successDiv = document.getElementById("profile-success") as HTMLDivElement;
    const status = document.getElementById("status") as HTMLInputElement;

    const openFriendsModalBtn = document.getElementById("open-friends-modal") as HTMLButtonElement;
    const openBlockedModalBtn = document.getElementById("open-blocked-modal") as HTMLButtonElement;
    const openRequestsModalBtn = document.getElementById("open-requests-modal") as HTMLButtonElement;
    const openSearchModalBtn = document.getElementById("open-search-modal") as HTMLButtonElement;
    const requestBadge = document.getElementById("request-badge") as HTMLSpanElement;

    function showError(message: string) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        successDiv.classList.add('hidden');
    }

    function showSuccess(message: string) {
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
    }

    function getAvatarUrl(path?: string): string {
        if (!path || path ==='default_avatar.png') {
            return '/default_avatar.png';
        }
        if (path.startsWith('https') || path.startsWith('/api')) {
            return path;
        }
        return `/api/${path}`;
    }

    async function loadProfile() {
        try {
            const response = await fetch('/api/profile', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
            });

            if (!response.ok) {
                console.error(response);
                throw new Error('Failed to load profile');
            }

            const profile = await response.json();

            profileUserName.value = profile.username || '';
            profileName.value = profile.name || '';
            profileBio.value = profile.bio || '';
            status.value = profile.status || '';
            profileAvatar.src = getAvatarUrl(profile.avatar);

            return profile;
        } catch (error) {
            console.error('Error loading profile:', error);
            showError('Failed to load profile. Please try again.');
            throw error;
        }
    }

    function setupAvatarUpload() {
        changeAvatarBtn.addEventListener('click', () => {
            avatarUpload.click();
        });

        avatarUpload.addEventListener('change', async (e) => {
            // @ts-ignore
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                showError('Image size should be less than 5MB');
                return;
            }

            if (!file.type.startsWith('image/')) {
                showError('Please upload an image file');
                return;
            }

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const response = await fetch('/api/profile', {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    credentials: 'include',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Failed to upload avatar');
                }

                await response.json();

                const reader = new FileReader();
                reader.onload = (event) => {
                    profileAvatar.src = event.target?.result as string;
                };
                reader.readAsDataURL(file);

                showSuccess('Avatar updated successfully!');
            } catch (error) {
                console.error('Error uploading avatar:', error);
                showError('Failed to update avatar. Please try again.');
            }
        });
    }

    async function updateProfile() {
        const username = profileUserName.value.trim();
        const name = profileName.value.trim();
        const bio = profileBio.value.trim();
        const userStatus = status.value.trim();

        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ username, name, bio, status: userStatus })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update profile');
            }

            showSuccess('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            showError('Failed to update profile. Please try again.');
        }
    }

    async function initModals() {
        friendsModal = new FriendsModal();
        blockedModal = new BlockedUsersModal();
        searchModal = new SearchUsersModal();
        requestsModal = new FriendRequestsModal();

        if (openFriendsModalBtn) {
            openFriendsModalBtn.addEventListener('click', () => {
                friendsModal?.open();
            });
        }

        if (openBlockedModalBtn) {
            openBlockedModalBtn.addEventListener('click', () => {
                blockedModal?.open();
            });
        }

        if (openRequestsModalBtn) {
            openRequestsModalBtn.addEventListener('click', () => {
                requestsModal?.open();
            });
        }

        if (openSearchModalBtn) {
            openSearchModalBtn.addEventListener('click', () => {
                searchModal?.open();
            });
        }

        await updateRequestBadge();
    }

    async function updateRequestBadge() {
        try {
            const count = await getPendingRequestsCount();

            if (count > 0) {
                requestBadge.textContent = count.toString();
                requestBadge.classList.remove('hidden');
            } else {
                requestBadge.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error getting pending requests count:', error);
        }
    }

    loadProfile();
    setupAvatarUpload();
    initModals();

    if (saveButton) {
        saveButton.addEventListener("click", updateProfile);
    } else {
        console.error("Save button not found!");
    }

    const badgeUpdateInterval = setInterval(updateRequestBadge, 30000);

    return function cleanup() {
        clearInterval(badgeUpdateInterval);

        if (friendsModal) {
            friendsModal.destroy();
            friendsModal = null;
        }

        if (blockedModal) {
            blockedModal.destroy();
            blockedModal = null;
        }

        if (searchModal) {
            searchModal.destroy();
            searchModal = null;
        }

        if (requestsModal) {
            requestsModal.destroy();
            requestsModal = null;
        }
    };
}

export function cleanupProfile() {
    if (friendsModal) {
        friendsModal.destroy();
        friendsModal = null;
    }

    if (blockedModal) {
        blockedModal.destroy();
        blockedModal = null;
    }

    if (searchModal) {
        searchModal.destroy();
        searchModal = null;
    }

    if (requestsModal) {
        requestsModal.destroy();
        requestsModal = null;
    }
}