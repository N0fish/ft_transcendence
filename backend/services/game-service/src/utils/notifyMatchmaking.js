import axios from 'axios';
export default async function notifyMatchmakingFinished(roomId) {
  const url = process.env.MATCHMAKING_URL || 'https://localhost:3003/match-result'; // /match-finished  не существует

  console.log(`[MATCHMAKING NOTIFY] POST ${url} — roomId=${roomId}`);

  try {
    const res = await axios.post(
      url,
      { roomId },
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true'
        }
      }
    );

    if (res.status >= 400) {
      throw new Error(`Failed to notify matchmaking: HTTPS ${res.status}`);
    }

    console.log(`Matchmaking notified about roomId=${roomId}`);
  } catch (err) {
    console.error('notifyMatchmakingFinished error:', err.message);
  }
}
