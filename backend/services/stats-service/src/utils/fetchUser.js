import https from 'https';
import axios from 'axios';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const http = axios.create({ httpsAgent });
export async function fetchUser(userId) {
  const url = `${process.env.USER_SERVICE_URL}/users/${userId}`;
  const { data } = await http.get(url);
  return data;
}
