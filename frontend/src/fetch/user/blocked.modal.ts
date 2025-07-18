import { getBlockedUsers, unblockUser } from "./user.handler.ts";

export class BlockedUsersModal {
    private modal: HTMLDivElement;
    private blockedList: HTMLDivElement;
    private closeBtn: HTMLButtonElement;
    private refreshBtn: HTMLButtonElement;
    private loadingIndicator: HTMLDivElement;
    private emptyState: HTMLDivElement;
    private toastContainer: HTMLDivElement;

    constructor() {
        this.modal = document.createElement('div');
        this.modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center hidden transition-opacity duration-300 opacity-0';
        this.modal.id = 'blocked-users-modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'bg-white dark:bg-secondary rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden';

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center p-4 border-b border-accent dark:border-gray-700';

        const title = document.createElement('h3');
        title.className = 'text-lg font-medium text-accent dark:text-accent';
        title.textContent = 'Blocked Users';

        this.closeBtn = document.createElement('button');
        this.closeBtn.className = 'text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white';
        this.closeBtn.innerHTML = '&times;';

        header.appendChild(title);
        header.appendChild(this.closeBtn);

        const actions = document.createElement('div');
        actions.className = 'flex justify-end p-2 border-b border-accent dark:border-gray-700';

        this.refreshBtn = document.createElement('button');
        this.refreshBtn.className = 'text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 flex items-center';
        this.refreshBtn.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Refresh';

        actions.appendChild(this.refreshBtn);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'flex-1 overflow-y-auto p-4';

        this.blockedList = document.createElement('div');
        this.blockedList.className = 'space-y-3';

        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'flex justify-center items-center py-8';
        this.loadingIndicator.innerHTML = '<svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';

        this.emptyState = document.createElement('div');
        this.emptyState.className = 'text-center py-8 text-gray-500 dark:text-gray-400 hidden';
        this.emptyState.innerHTML = '<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg><p class="mt-2">You haven\'t blocked any users yet.</p>';

        contentContainer.appendChild(this.blockedList);
        contentContainer.appendChild(this.loadingIndicator);
        contentContainer.appendChild(this.emptyState);

        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'fixed top-4 right-4 z-50';

        modalContent.appendChild(header);
        modalContent.appendChild(actions);
        modalContent.appendChild(contentContainer);
        this.modal.appendChild(modalContent);

        document.body.appendChild(this.modal);
        document.body.appendChild(this.toastContainer);

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.closeBtn.addEventListener('click', () => this.close());
        this.refreshBtn.addEventListener('click', () => this.loadBlockedUsers());

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    public open() {
        this.modal.classList.remove('hidden');
        setTimeout(() => {
            this.modal.classList.remove('opacity-0');
        }, 10);
        this.loadBlockedUsers();
    }

    public close() {
        this.modal.classList.add('opacity-0');
        setTimeout(() => {
            this.modal.classList.add('hidden');
        }, 300);
    }

    public destroy() {
        this.modal.remove();
        this.toastContainer.remove();
    }

    private async loadBlockedUsers() {
        this.blockedList.innerHTML = '';
        this.loadingIndicator.classList.remove('hidden');
        this.emptyState.classList.add('hidden');

        try {
            const blockedUsers = await getBlockedUsers();

            this.loadingIndicator.classList.add('hidden');

            if (blockedUsers.length === 0) {
                this.emptyState.classList.remove('hidden');
                return;
            }

            blockedUsers.forEach((user: any) => {
                const userItem = this.createBlockedUserItem(user);
                this.blockedList.appendChild(userItem);
            });
        } catch (error) {
            console.error('Error loading blocked users:', error);
            this.loadingIndicator.classList.add('hidden');
            this.showToast('Failed to load blocked users', 'error');
        }
    }

    private createBlockedUserItem(user: any) {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';

        const userInfo = document.createElement('div');
        userInfo.className = 'flex items-center';

        const avatar = document.createElement('img');
        avatar.className = 'w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600';
        avatar.src = user.avatar ? `/api/${user.avatar}` : '/default_avatar.png';
        avatar.alt = `${user.username}'s avatar`;

        const details = document.createElement('div');
        details.className = 'ml-3';

        const username = document.createElement('div');
        username.className = 'font-medium text-gray-900 dark:text-white';
        username.textContent = user.username;

        const blockedDate = document.createElement('div');
        blockedDate.className = 'text-xs text-gray-500 dark:text-gray-400';

        const date = new Date(user.blockedAt);
        blockedDate.textContent = `Blocked: ${date.toLocaleDateString()}`;

        details.appendChild(username);
        details.appendChild(blockedDate);

        userInfo.appendChild(avatar);
        userInfo.appendChild(details);

        const actions = document.createElement('div');
        actions.className = 'flex';

        const unblockBtn = document.createElement('button');
        unblockBtn.className = 'px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors';
        unblockBtn.textContent = 'Unblock';

        unblockBtn.addEventListener('click', async() => {
            if (await this.showConfirmation('Unblock User', `Are you sure you want to unblock ${user.username}?`)) {
                try {
                    await unblockUser(user.userId);
                    item.remove();
                    this.showToast('User unblocked successfully', 'success');

                    if (this.blockedList.children.length === 0) {
                        this.emptyState.classList.remove('hidden');
                    }
                } catch (error) {
                    console.error('Error unblocking user:', error);
                    this.showToast('Failed to unblock user', 'error');
                }
            }
        });

        actions.appendChild(unblockBtn);

        item.appendChild(userInfo);
        item.appendChild(actions);

        return item;
    }

    private showToast(message: string, type: 'success' | 'error' = 'success') {
        const toast = document.createElement('div');
        toast.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center transform transition-transform duration-300 translate-x-full ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'ml-auto text-white';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });

        toast.appendChild(messageSpan);
        toast.appendChild(closeBtn);

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 10);

        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    private showConfirmation(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const confirmationModal = document.createElement('div');
            confirmationModal.className = 'fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center';

            const content = document.createElement('div');
            content.className = 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full';

            const titleEl = document.createElement('h3');
            titleEl.className = 'text-xl font-bold mb-4 text-gray-900 dark:text-white';
            titleEl.textContent = title;

            const messageEl = document.createElement('p');
            messageEl.className = 'mb-6 text-gray-700 dark:text-gray-300';
            messageEl.textContent = message;

            const buttons = document.createElement('div');
            buttons.className = 'flex justify-end gap-4';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-gray-800';
            cancelBtn.textContent = 'Cancel';

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-white';
            confirmBtn.textContent = 'Confirm';

            buttons.appendChild(cancelBtn);
            buttons.appendChild(confirmBtn);

            content.appendChild(titleEl);
            content.appendChild(messageEl);
            content.appendChild(buttons);

            confirmationModal.appendChild(content);
            document.body.appendChild(confirmationModal);

            const cleanup = () => {
                confirmationModal.remove();
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            document.addEventListener('keydown', function handler(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handler);
                    cleanup();
                    resolve(false);
                }
            });
        });
    }
}