export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: Date;
}

export interface UserProfile {
  userId: number;
  username: string;
  avatar: string;
  status: string;
  bio: string;
  rating: number;
  lastAction: string;
}