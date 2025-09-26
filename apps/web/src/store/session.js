import { reactive } from 'vue';
import { authApi } from '../api';

export const session = reactive({
  user: null,
  loading: false,
  error: '',
});

export async function loadSession() {
  session.loading = true;
  session.error = '';
  try {
    const { user } = await authApi.me();
    session.user = user;
  } catch (e) {
    session.user = null;
    session.error = String(e?.message || e);
  } finally {
    session.loading = false;
  }
}
