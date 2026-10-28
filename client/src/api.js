import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong';

export default api;