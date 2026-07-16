import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
});

export const fetcher = (url: string) => api.get(url).then(res => res.data);

export const poster = (url: string, data: any) => api.post(url, data).then(res => res.data);

export default api;