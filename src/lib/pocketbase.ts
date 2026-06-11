
import { PUBLIC_POCKETBASE_URL} from '$env/static/public';
import PocketBase from 'pocketbase';

export const pb = new PocketBase(PUBLIC_POCKETBASE_URL);

// ฟังก์ชันนี้จะรันบนเซิร์ฟเวอร์เท่านั้นเพื่อแลก Token
