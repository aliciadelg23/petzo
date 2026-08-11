import Constants from 'expo-constants';

interface Env {
  apiUrl: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Env>;

if (!extra.apiUrl || typeof extra.apiUrl !== 'string') {
  throw new Error('[env] app.json > expo.extra.apiUrl não configurado');
}

export const env: Env = {
  apiUrl: extra.apiUrl.replace(/\/$/, ''),
};
