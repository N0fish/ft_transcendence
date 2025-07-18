import { Modal } from './modal.component';
import { searchUsers, blockUser, isUserBlocked } from './user.handler.ts';

export class SearchUsersModal extends Modal {
    private searchInput!: HTMLInputElement;
    private searchResults: any[] = [];
    private searchTimeoutId: number | null = null;
    
    constructor() {
        super('Search Users');
        this.renderSearchForm();
    }
    private renderSearchForm() {
        this.setContent(`
            <div class="search-container">
                <div class="mb-4">
                    <input type="text" id="user-search" class="w-full px-4 py-2 bg-secondary border border-secondary rounded-lg focus:outline-none focus:border-blue-500 text-white" placeholder="Search by username..." />
                </div>
                <div id="search-results" class="mt-4"></div>
            </div>
        `);
        
        setTimeout(() => {
            this.searchInput = document.getElementById('user-search') as HTMLInputElement;
            if (this.searchInput) {
                this.searchInput.addEventListener('input', () => this.handleSearch());
            }
        }, 0);
    }
    
    private handleSearch() {
        const query = this.searchInput?.value.trim();
        
        if (this.searchTimeoutId !== null) {
            clearTimeout(this.searchTimeoutId);
        }
        if (!query) {
            this.renderSearchResults([]);
            return;
        }
        
        this.searchTimeoutId = setTimeout(async () => {
            try {
                const results = await searchUsers(query);
                this.searchResults = results;
                this.renderSearchResults(results);
            } catch (error) {
                console.error('Error searching users:', error);
                const resultsDiv = document.getElementById('search-results');
                if (resultsDiv) {
                    resultsDiv.innerHTML = '<p class="text-red-500">Error searching users. Please try again.</p>';
                }
            }
        }, 300) as unknown as number;
    }
    
    private async renderSearchResults(results: any[]) {
        const resultsDiv = document.getElementById('search-results');
        if (!resultsDiv) return;
        
        if (results.length === 0) {
            resultsDiv.innerHTML = '<p class="text-gray-400 text-center">No users found.</p>';
            return;
        }
        
        let resultsHtml = '<div class="space-y-4">';
        
        for (const user of results) {
            const blockStatus = await isUserBlocked(user.userId);
            
            let actionButtons = '';
            
            if (blockStatus.isBlocked) {
                if (blockStatus.direction === 'outgoing') {
                    actionButtons = `
                        <div class="text-sm text-red-500">Blocked</div>
                    `;
                } else {
                    actionButtons = `
                        <div class="text-sm text-red-500">You are blocked</div>
                    `;
                }
            }
            
            resultsHtml += `
                <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div class="flex items-center">
                        <img src="${this.getAvatarUrl(user.avatar)}" alt="${user.username}" class="w-10 h-10 rounded-full mr-3" />
                        <div>
                            <h4 class="font-medium text-white">${user.username}</h4>
                            <div class="text-sm ${user.status === 'online' ? 'text-green-500' : 'text-gray-400'}">
                                ${user.status || 'offline'}
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <a href="/user?id=${user.userId}" class="px-2 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600">Profile</a>
                        ${actionButtons}
                    </div>
                </div>
            `;
        }
        
        resultsHtml += '</div>';
        resultsDiv.innerHTML = resultsHtml;
        
        setTimeout(() => {
            const blockButtons = document.querySelectorAll('.search-block-btn');
            blockButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const userId = (e.currentTarget as HTMLElement).dataset.userId;
                    if (userId) {
                        this.blockUserHandler(parseInt(userId));
                    }
                });
            });
        }, 0);
    }
    
    private getAvatarUrl(path?: string): string {
        if (!path || path ==='default_avatar.png') {
            return '/default_avatar.png';
        }
        if (path.startsWith('https') || path.startsWith('/api')) {
            return path;
        }
        return `/api/${path}`;
    }
    
    private async blockUserHandler(userId: number) {
        if (confirm('Are you sure you want to block this user?')) {
            try {
                await blockUser(userId);
                alert('User blocked successfully!');
                // Refresh search results
                this.handleSearch();
            } catch (error) {
                console.error('Error blocking user:', error);
                alert('Failed to block user. Please try again.');
            }
        }
    }
}