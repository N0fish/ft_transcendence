import { PlayerStats } from "../models/stats";

export const fetchPlayerStats = async (playerId: number): Promise<PlayerStats> => {
  try {
    const response = await fetch(`/stats-api/stats/user/${playerId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
    });

    return await response.json();
  } catch (error) {
    console.error('Error loading player stats:', error);
    throw error;
  }
}