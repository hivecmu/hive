/**
 * Integration Test Configuration
 * Switches between localhost and cloud environments
 */

const isCloud = process.env.TEST_ENV === 'cloud';

export const config = {
  isCloud,
  baseUrl: isCloud
    ? 'http://hive-platform-alb-1542568641.us-east-1.elb.amazonaws.com/api'
    : 'http://localhost:3001/api',
  
  timeout: isCloud ? 30000 : 10000,
  
  testUser: {
    email: `integration-test-${Date.now()}@hive.test`,
    password: 'IntegrationTest123!',
    name: 'Integration Test User',
  },
  
  testWorkspace: {
    name: 'Integration Test Workspace',
    slug: `integration-test-ws-${Date.now()}`,
    type: 'company',
  },
  
  structureParams: {
    communitySize: 'medium',
    coreActivities: ['engineering', 'design', 'product'],
    moderationCapacity: 'moderate',
    channelBudget: 15,
  },
};

export function getUrl(endpoint: string): string {
  // Health routes are at root level, not under /api
  const isHealthRoute = endpoint.startsWith('/health');
  const base = isHealthRoute
    ? (isCloud 
        ? 'http://hive-platform-alb-1542568641.us-east-1.elb.amazonaws.com'
        : 'http://localhost:3001')
    : (config.baseUrl.endsWith('/') 
        ? config.baseUrl.slice(0, -1) 
        : config.baseUrl);
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

export function authHeader(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export function jsonHeader(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  };
}

