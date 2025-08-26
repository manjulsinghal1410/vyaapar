import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  database: {
    url: process.env.DATABASE_URL || 'postgres://localhost:5432/vibhanet_auth',
  },
  session: {
    ttlDays: parseInt(process.env.SESSION_TTL_DAYS || '14', 10),
    cookieName: 'sid',
  },
  argon2: {
    memoryMB: parseInt(process.env.ARGON2_MEMORY_MB || '64', 10),
    iterations: parseInt(process.env.ARGON2_ITERATIONS || '2', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
  },
  rateLimit: {
    loginPerIpPerMinute: 10,
    loginPerPhonePerMinute: 5,
    signupPerIpPerMinute: 3,
    lockoutThreshold: 6,
    lockoutWindowMinutes: 10,
    lockoutDurationMinutes: 15,
  },
} as const;