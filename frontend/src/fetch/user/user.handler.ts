import { navigateTo } from "../../main.ts";

export async function getCurrentUser() {
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
            throw new Error('Failed to load profile');
        }

        return await response.json();
    } catch (error) {
        navigateTo("/not-found");
        throw error;
    }
}

export async function getMyFriends() {
    try {
        const response = await fetch('/api/friends', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
        });

        if (!response.ok) {
            throw new Error('Failed to load friends');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching friends:', error);
        return [];
    }
}

export async function getBlockedUsers() {
    try {
        const response = await fetch('/api/friends/blocked', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
        });

        if (!response.ok) {
            throw new Error('Failed to load blocked users');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching blocked users:', error);
        return [];
    }
}

export async function searchUsers(query: string) {
    try {
        const response = await fetch(`/api/users?search=${encodeURIComponent(query)}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
        });

        if (!response.ok) {
            throw new Error('Failed to search users');
        }

        const data = await response.json();
        return data.users || [];
    } catch (error) {
        console.error('Error searching users:', error);
        return [];
    }
}

export async function addFriend(userId: number) {
    try {
        const response = await fetch(`/api/friends/${userId}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add friend');
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding friend:', error);
        throw error;
    }
}

export async function removeFriend(userId: number) {
    try {
        const response = await fetch(`/api/friends/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to remove friend');
        }

        return await response.json();
    } catch (error) {
        console.error('Error removing friend:', error);
        throw error;
    }
}

export async function blockUser(userId: number) {
    try {
        const response = await fetch(`/api/friends/block/${userId}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to block user');
        }

        return await response.json();
    } catch (error) {
        console.error('Error blocking user:', error);
        throw error;
    }
}

export async function unblockUser(userId: number) {
    try {
        const response = await fetch(`/api/friends/block/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to unblock user');
        }

        return await response.json();
    } catch (error) {
        console.error('Error unblocking user:', error);
        throw error;
    }
}

export async function isUserBlocked(userId: number) {
    try {
        const response = await fetch(`/api/friends/is-blocked/${userId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
        });

        if (!response.ok) {
            throw new Error('Failed to check block status');
        }

        return await response.json();
    } catch (error) {
        console.error('Error checking block status:', error);
        return { isBlocked: false };
    }
}

export async function checkFriendStatus(userId: number) {
    try {
        const friends = await getMyFriends();
        return friends.some((friend: any) => friend.userId === userId);
    } catch (error) {
        console.error('Error checking friend status:', error);
        return false;
    }
}

export async function getFriendRequests() {
    try {
        const response = await fetch('/api/friends/requests', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
        });

        if (!response.ok) {
            throw new Error('Failed to load friend requests');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching friend requests:', error);
        return { sent: [], received: [] };
    }
}

export async function sendFriendRequest(userId: number) {
    try {
        const response = await fetch('/api/friends/requests', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ receiverId: userId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send friend request');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw error;
    }
}

export async function acceptFriendRequest(requestId: number) {
    try {
        const response = await fetch(`/api/friends/requests/${requestId}/accept`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to accept friend request');
        }

        return await response.json();
    } catch (error) {
        console.error('Error accepting friend request:', error);
        throw error;
    }
}

export async function declineFriendRequest(requestId: number) {
    try {
        const response = await fetch(`/api/friends/requests/${requestId}/decline`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to decline friend request');
        }

        return await response.json();
    } catch (error) {
        console.error('Error declining friend request:', error);
        throw error;
    }
}

export async function cancelFriendRequest(requestId: number) {
    try {
        const response = await fetch(`/api/friends/requests/${requestId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to cancel friend request');
        }

        return await response.json();
    } catch (error) {
        console.error('Error canceling friend request:', error);
        throw error;
    }
}

export async function getPendingRequestsCount() {
    try {
        const response = await fetch('/api/friends/requests/pending-count', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get pending requests count');
        }

        const data = await response.json();
        return data.count || 0;
    } catch (error) {
        console.error('Error getting pending requests count:', error);
        return 0;
    }
}

export async function checkPendingFriendRequest(userId: number) {
    try {
        const requests = await getFriendRequests();

        const pendingSentRequest = requests.sent.find(
            (req: any) => req.receiver.userId === userId
        );

        const pendingReceivedRequest = requests.received.find(
            (req: any) => req.sender.userId === userId
        );

        return {
            hasPendingRequest: !!pendingSentRequest || !!pendingReceivedRequest,
            requestId: pendingSentRequest?.id || pendingReceivedRequest?.id,
            direction: pendingSentRequest ? 'outgoing' : (pendingReceivedRequest ? 'incoming' : null)
        };
    } catch (error) {
        console.error('Error checking pending friend request:', error);
        return { hasPendingRequest: false, requestId: null, direction: null };
    }
}

export async function pingSelf() {
    try {
        const response = await fetch('/api/ping', {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get pending requests count');
        }

        const data = await response.json();
        return data.count || 0;
    } catch (error) {
        console.error('Error getting pending requests count:', error);
        return 0;
    }
}