// Supply clearly synthetic values before env.ts validates process.env in tests.
process.env.NODE_ENV ??= "test";
process.env.SESSION_SECRET ??= "s".repeat(48);
process.env.DATABASE_URL ??= "postgresql://localhost/zelosify_test";
process.env.JWT_SECRET ??= "j".repeat(48);
process.env.ENCRYPTION_KEY ??= "0".repeat(64);
process.env.DEFAULT_ADMIN_PASSWORD ??= "t".repeat(16);
