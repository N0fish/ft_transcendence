import { navigateTo } from "../../main.ts";
import {
    acceptFriendRequest,
    cancelFriendRequest,
    declineFriendRequest,
    getFriendRequests
} from "./user.handler";

export class FriendRequestsModal {
    private modal: HTMLDivElement;
    private tabButtons: HTMLDivElement;
    private receivedTab: HTMLButtonElement;
    private sentTab: HTMLButtonElement;
    private currentTab: 'received' | 'sent' = 'received';
    private requestsList: HTMLDivElement;
    private closeBtn: HTMLButtonElement;
    private refreshBtn: HTMLButtonElement;
    private loadingIndicator: HTMLDivElement;
    private emptyState: HTMLDivElement;
    private toastContainer: HTMLDivElement;

    constructor() {
        this.modal = document.createElement('div');
        this.modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center hidden transition-opacity duration-300 opacity-0';
        this.modal.id = 'friend-requests-modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'bg-white dark:bg-secondary rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden';

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700';

        const title = document.createElement('h3');
        title.className = 'text-lg font-medium text-gray-900 dark:text-accent';
        title.textContent = 'Friend Requests';

        this.closeBtn = document.createElement('button');
        this.closeBtn.className = 'text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-accent';
        this.closeBtn.innerHTML = '&times;';

        header.appendChild(title);
        header.appendChild(this.closeBtn);

        this.tabButtons = document.createElement('div');
        this.tabButtons.className = 'flex border-b border-gray-200 dark:border-gray-700';

        this.receivedTab = document.createElement('button');
        this.receivedTab.className = 'py-2 px-4 flex-1 border-b-2 border-accent font-medium text-accent';
        this.receivedTab.textContent = 'Received';

        this.sentTab = document.createElement('button');
        this.sentTab.className = 'py-2 px-4 flex-1 text-gray-500 dark:text-gray-400 font-medium';
        this.sentTab.textContent = 'Sent';

        this.tabButtons.appendChild(this.receivedTab);
        this.tabButtons.appendChild(this.sentTab);

        const actions = document.createElement('div');
        actions.className = 'flex justify-end p-2 border-b border-gray-200 dark:border-gray-700';

        this.refreshBtn = document.createElement('button');
        this.refreshBtn.className = 'text-sm text-accent hover:text-blue-700 dark:hover:text-blue-400 flex items-center';
        this.refreshBtn.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Refresh';

        actions.appendChild(this.refreshBtn);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'flex-1 overflow-y-auto p-4';

        this.requestsList = document.createElement('div');
        this.requestsList.className = 'space-y-3';

        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'flex justify-center items-center py-8';
        this.loadingIndicator.innerHTML = '<svg class="animate-spin h-8 w-8 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';

        this.emptyState = document.createElement('div');
        this.emptyState.className = 'text-center py-8 text-accent dark:text-gray-400 hidden';
        this.emptyState.innerHTML = '<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg><p class="mt-2">No friend requests to show.</p>';

        contentContainer.appendChild(this.requestsList);
        contentContainer.appendChild(this.loadingIndicator);
        contentContainer.appendChild(this.emptyState);

        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'fixed top-4 right-4 z-50';

        modalContent.appendChild(header);
        modalContent.appendChild(this.tabButtons);
        modalContent.appendChild(actions);
        modalContent.appendChild(contentContainer);
        this.modal.appendChild(modalContent);

        document.body.appendChild(this.modal);
        document.body.appendChild(this.toastContainer);

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.closeBtn.addEventListener('click', () => this.close());
        this.refreshBtn.addEventListener('click', () => this.loadRequests());

        this.receivedTab.addEventListener('click', () => this.switchTab('received'));
        this.sentTab.addEventListener('click', () => this.switchTab('sent'));

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

    private switchTab(tab: 'received' | 'sent') {
        if (this.currentTab === tab) return;

        this.currentTab = tab;

        if (tab === 'received') {
            this.receivedTab.className = 'py-2 px-4 flex-1 border-b-2 border-accent font-medium text-accent';
            this.sentTab.className = 'py-2 px-4 flex-1 text-gray-500 dark:text-gray-400 font-medium';
        } else {
            this.sentTab.className = 'py-2 px-4 flex-1 border-b-2 border-accent font-medium text-accent';
            this.receivedTab.className = 'py-2 px-4 flex-1 text-gray-500 dark:text-gray-400 font-medium';
        }

        this.loadRequests();
    }

    public open() {
        this.modal.classList.remove('hidden');
        setTimeout(() => {
            this.modal.classList.remove('opacity-0');
        }, 10);
        this.loadRequests();
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

    private async loadRequests() {
        this.requestsList.innerHTML = '';
        this.loadingIndicator.classList.remove('hidden');
        this.emptyState.classList.add('hidden');

        try {
            const requests = await getFriendRequests();

            this.loadingIndicator.classList.add('hidden');

            const currentTabRequests = this.currentTab === 'received' ? requests.received : requests.sent;

            if (!currentTabRequests || currentTabRequests.length === 0) {
                this.emptyState.classList.remove('hidden');
                this.emptyState.querySelector('p')!.textContent = `No ${this.currentTab} friend requests to show.`;
                return;
            }

            if (this.currentTab === 'received') {
                this.updateBadgeCount(currentTabRequests.length);

                currentTabRequests.forEach((request: any) => {
                    const requestItem = this.createReceivedRequestItem(request);
                    this.requestsList.appendChild(requestItem);
                });
            } else {
                currentTabRequests.forEach((request: any) => {
                    const requestItem = this.createSentRequestItem(request);
                    this.requestsList.appendChild(requestItem);
                });
            }
        } catch (error) {
            console.error('Error loading friend requests:', error);
            this.loadingIndicator.classList.add('hidden');
            this.showToast('Failed to load friend requests', 'error');
        }
    }

    private createReceivedRequestItem(request: any) {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-gray-50 dark:bg-secondary rounded-lg';
        item.dataset.requestId = request.id.toString();

        const userInfo = document.createElement('div');
        userInfo.className = 'flex items-center';

        const avatar = document.createElement('img');
        avatar.className = 'w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600';
        avatar.src = request.sender.avatar ? `/api/${request.sender.avatar}` : '/default_avatar.png';
        avatar.alt = `${request.sender.username}'s avatar`;

        const details = document.createElement('div');
        details.className = 'ml-3';

        const username = document.createElement('div');
        username.className = 'font-medium text-gray-900 dark:text-accent';
        username.textContent = request.sender.username;

        const status = document.createElement('div');
        status.className = 'text-xs text-gray-500 dark:text-gray-400';

        const date = new Date(request.createdAt);
        status.textContent = `Sent: ${date.toLocaleDateString()}`;

        details.appendChild(username);
        details.appendChild(status);

        userInfo.appendChild(avatar);
        userInfo.appendChild(details);

        const actions = document.createElement('div');
        actions.className = 'flex space-x-2';

        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'px-3 py-1 bg-green-500 text-accent text-sm rounded hover:bg-green-600 transition-colors';
        acceptBtn.textContent = 'Accept';

        const declineBtn = document.createElement('button');
        declineBtn.className = 'px-3 py-1 bg-red-500 text-accent text-sm rounded hover:bg-red-600 transition-colors';
        declineBtn.textContent = 'Decline';

        const viewProfileBtn = document.createElement('button');
        viewProfileBtn.className = 'p-1 text-accent hover:text-blue-700 dark:hover:text-blue-400';
        viewProfileBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>';
        viewProfileBtn.title = 'View Profile';

        acceptBtn.addEventListener('click', () => this.handleAcceptRequest(request));
        declineBtn.addEventListener('click', () => this.handleDeclineRequest(request));
        viewProfileBtn.addEventListener('click', () => {
            this.close();
             navigateTo(`/user?id=${request.sender.userId}`);
        });

        actions.appendChild(acceptBtn);
        actions.appendChild(declineBtn);
        actions.appendChild(viewProfileBtn);

        item.appendChild(userInfo);
        item.appendChild(actions);

        return item;
    }

    private createSentRequestItem(request: any) {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-gray-50 dark:bg-secondary rounded-lg';
        item.dataset.requestId = request.id.toString();

        const userInfo = document.createElement('div');
        userInfo.className = 'flex items-center';

        const avatar = document.createElement('img');
        avatar.className = 'w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600';
        avatar.src = request.receiver.avatar ? `/api/${request.receiver.avatar}` : '/default_avatar.png';
        avatar.alt = `${request.receiver.username}'s avatar`;

        const details = document.createElement('div');
        details.className = 'ml-3';

        const username = document.createElement('div');
        username.className = 'font-medium text-gray-900 dark:text-white';
        username.textContent = request.receiver.username;

        const status = document.createElement('div');
        status.className = 'text-xs text-gray-500 dark:text-gray-400';

        const date = new Date(request.createdAt);
        status.textContent = `Sent: ${date.toLocaleDateString()}`;

        details.appendChild(username);
        details.appendChild(status);

        userInfo.appendChild(avatar);
        userInfo.appendChild(details);

        const actions = document.createElement('div');
        actions.className = 'flex space-x-2';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors';
        cancelBtn.textContent = 'Cancel';

        const viewProfileBtn = document.createElement('button');
        viewProfileBtn.className = 'p-1 text-accent hover:text-blue-700 dark:hover:text-blue-400';
        viewProfileBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>';
        viewProfileBtn.title = 'View Profile';

        cancelBtn.addEventListener('click', () => this.handleCancelRequest(request));
        viewProfileBtn.addEventListener('click', () => {
            this.close();
            navigateTo(`/user?id=${request.receiver.userId}`);
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(viewProfileBtn);

        item.appendChild(userInfo);
        item.appendChild(actions);

        return item;
    }

    private async handleAcceptRequest(request: any) {
        try {
            console.log('Accepting request:', request.id);
            await acceptFriendRequest(request.id);
            this.showToast('Friend request accepted', 'success');

            const item = this.requestsList.querySelector(`[data-request-id="${request.id}"]`);
            if (item) {
                item.remove();
            }

            this.checkForEmptyList();

            this.updateBadgeCount(-1);
        } catch (error) {
            console.error('Error accepting friend request:', error);
            this.showToast('Failed to accept friend request', 'error');
        }
    }

    private async handleDeclineRequest(request: any) {
        if (await this.showConfirmation('Decline Request', `Are you sure you want to decline ${request.sender.username}'s friend request?`)) {
            try {
                console.log('Declining request:', request.id);
                await declineFriendRequest(request.id);
                this.showToast('Friend request declined', 'success');

                const item = this.requestsList.querySelector(`[data-request-id="${request.id}"]`);
                if (item) {
                    item.remove();
                }

                this.checkForEmptyList();

                this.updateBadgeCount(-1);
            } catch (error) {
                console.error('Error declining friend request:', error);
                this.showToast('Failed to decline friend request', 'error');
            }
        }
    }

    private async handleCancelRequest(request: any) {
        if (await this.showConfirmation('Cancel Request', `Are you sure you want to cancel your friend request to ${request.receiver.username}?`)) {
            try {
                console.log('Cancelling request:', request.id);
                await cancelFriendRequest(request.id);
                this.showToast('Friend request cancelled', 'success');

                const item = this.requestsList.querySelector(`[data-request-id="${request.id}"]`);
                if (item) {
                    item.remove();
                }

                this.checkForEmptyList();
            } catch (error) {
                console.error('Error cancelling friend request:', error);
                this.showToast('Failed to cancel friend request', 'error');
            }
        }
    }

    private checkForEmptyList() {
        if (this.requestsList.children.length === 0) {
            this.emptyState.classList.remove('hidden');
            this.emptyState.querySelector('p')!.textContent = `No ${this.currentTab} friend requests to show.`;
        }
    }

    private updateBadgeCount(change: number) {
        const badge = document.getElementById('request-badge');
        if (!badge) return;

        if (typeof change === 'number') {
            const currentCount = parseInt(badge.textContent || '0');
            const newCount = Math.max(0, currentCount + change);

            if (newCount > 0) {
                badge.textContent = newCount.toString();
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        } else {
            const count = change;
            if (count > 0) {
                badge.textContent = `${count}`;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
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
            content.className = 'bg-white dark:bg-secondary p-6 rounded-lg shadow-lg max-w-md w-full';

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
            confirmBtn.className = 'px-4 py-2 bg-accent hover:bg-blue-600 rounded text-white';
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