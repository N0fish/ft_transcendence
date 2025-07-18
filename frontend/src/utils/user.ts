import { User, UserProfile } from "../models/user";

export const getLocalUser = (): User => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    throw "No user found";
  }
  return JSON.parse(userStr);
}

export const getRemoteUser = async (userId: number): Promise<UserProfile> => {
  try {
    const res = await fetch(`api/users/${userId}`, {
      credentials: "include",
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
    });
    if (!res.ok) {
      throw "getRemoteUser error: GET api/users/{userId}"
    }
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}