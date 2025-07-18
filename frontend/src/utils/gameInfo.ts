import { GameInfo } from "../models/game";
import { getRemoteUser } from "./user";

export async function buildGameInfoFromUserIds(
  roomId: string,
  player1UserId: number,
  player2UserId: number
): Promise<GameInfo> {
  try {
    const user1 = await getRemoteUser(player1UserId);
    const user2 = await getRemoteUser(player2UserId);
    return {
      roomId,
      status: "ready",
      player1: {
        id: user1.userId,
        username: user1.username,
        avatar: user1.avatar,
        rating: user1.rating,
      },
      player2: {
        id: user2.userId,
        username: user2.username,
        avatar: user2.avatar,
        rating: user2.rating,
      }
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}