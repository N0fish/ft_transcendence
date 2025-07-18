export interface ProfileApiResponse {
    userId: number;
    username: string;
    email?: string;
    avatar?: string | null;
    status?: string;
    rating?: number;
}

export interface UserProfile {
    userId: number;
    username: string;
    email: string;
    avatar: string | null;
    status: string;
    rating: number;
}
