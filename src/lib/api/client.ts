import axios from 'axios';
import axiosRetry from 'axios-retry';

export const REST_API_BASE = 'https://pokeapi.co/api/v2';
export const GRAPHQL_API_BASE = 'https://beta.pokeapi.co/graphql/v1beta';

const apiClient = axios.create({
  baseURL: REST_API_BASE,
  timeout: 10000,
});

const graphqlClient = axios.create({
  baseURL: 'https://beta.pokeapi.co',
  timeout: 60000,
});

axiosRetry(apiClient, {
  retries: 1,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});

axiosRetry(graphqlClient, {
  retries: 1,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});

export { graphqlClient };
export default apiClient;
