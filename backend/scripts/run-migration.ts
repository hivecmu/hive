#!/usr/bin/env tsx
/**
 * DEPRECATED: This script is deprecated and should not be used.
 *
 * Instead, use the proper migration system:
 *   npm run migrate
 *
 * This script was bypassing the migration system by directly applying
 * migration 005, which could cause inconsistent state and violate
 * migration ordering. The main migration runner properly tracks and
 * applies migrations in sequence.
 *
 * To check migration status:
 *   SELECT * FROM schema_migrations ORDER BY id;
 */

console.error('ERROR: This script is deprecated.');
console.error('Please use: npm run migrate');
console.error('');
console.error('Reason: Direct migration application bypasses the migration system');
console.error('and can cause inconsistent database state.');
process.exit(1);
