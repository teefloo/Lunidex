import axios from 'axios';
import axiosRetry from 'axios-retry';
import { attachAxiosSentryInstrumentation } from '@/lib/sentry-observability';

export const REST_API_BASE = 'https://pokeapi.co/api/v2';
export const GRAPHQL_API_BASE = 'https://graphql.pokeapi.co';

const apiClient = axios.create({
  baseURL: REST_API_BASE,
  timeout: 10000,
});

const graphqlClient = axios.create({
  baseURL: GRAPHQL_API_BASE,
  timeout: 60000,
});

axiosRetry(apiClient, {
  retries: 1,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});

attachAxiosSentryInstrumentation(apiClient, { feature: 'pokemon', service: 'pokeapi' });

axiosRetry(graphqlClient, {
  retries: 1,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});

attachAxiosSentryInstrumentation(graphqlClient, { feature: 'graphql', service: 'pokeapi-graphql' });

export { graphqlClient };
export default apiClient;
