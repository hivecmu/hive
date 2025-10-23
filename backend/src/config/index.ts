import 'dotenv/config';

/**
 * Application configuration
 * Loads and validates environment variables
 */

interface Config {
  // Server
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  corsOrigin: string;

  // Database
  databaseUrl: string;
  databasePoolMin: number;
  databasePoolMax: number;

  // Redis
  redisUrl: string;

  // S3
  s3Endpoint: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3Bucket: string;
  s3Region: string;
  s3ForcePathStyle: boolean;

  // OpenAI
  openaiApiKey: string;
  openaiModel: string;
  openaiEmbeddingModel: string;

  // Auth
  jwtSecret: string;
  jwtExpiresIn: string | number;

  // Feature Flags
  useRealAI: boolean;
  dryRunApply: boolean;

  // Observability
  logLevel: string;
  enableTelemetry: boolean;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer value for ${key}: ${value}`);
  }
  return parsed;
}

export const config: Config = {
  // Server
  nodeEnv: (process.env.NODE_ENV || 'development') as Config['nodeEnv'],
  port: getEnvInt('PORT', 3001),
  corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),

  // Database
  databaseUrl: getEnvVar('DATABASE_URL'),
  databasePoolMin: getEnvInt('DATABASE_POOL_MIN', 2),
  databasePoolMax: getEnvInt('DATABASE_POOL_MAX', 10),

  // Redis
  redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),

  // S3
  s3Endpoint: getEnvVar('S3_ENDPOINT', 'http://localhost:9000'),
  s3AccessKeyId: getEnvVar('S3_ACCESS_KEY_ID', 'minioadmin'),
  s3SecretAccessKey: getEnvVar('S3_SECRET_ACCESS_KEY', 'minioadmin'),
  s3Bucket: getEnvVar('S3_BUCKET', 'hive-artifacts'),
  s3Region: getEnvVar('S3_REGION', 'us-east-1'),
  s3ForcePathStyle: getEnvBool('S3_FORCE_PATH_STYLE', true),

  // OpenAI
  openaiApiKey: getEnvVar('OPENAI_API_KEY', ''),
  openaiModel: getEnvVar('OPENAI_MODEL', 'gpt-4-turbo-preview'),
  openaiEmbeddingModel: getEnvVar('OPENAI_EMBEDDING_MODEL', 'text-embedding-ada-002'),

  // Auth
  jwtSecret: getEnvVar('JWT_SECRET'),
  jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),

  // Feature Flags
  useRealAI: getEnvBool('USE_REAL_AI', true),
  dryRunApply: getEnvBool('DRY_RUN_APPLY', false),

  // Observability
  logLevel: getEnvVar('LOG_LEVEL', 'info'),
  enableTelemetry: getEnvBool('ENABLE_TELEMETRY', false),
};

// Validate critical config
if (config.nodeEnv === 'production' && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

export default config;
