# Seeders and Factories Guide

## Overview

This document explains the difference between seeders and factories in AdonisJS and how to organize them properly.

## Seeders vs Factories

### Factories (`database/factories/`)
- **Purpose**: Generate fake/random data for testing
- **Usage**: Primarily in automated tests
- **Example**: Create 100 users with random emails
- **When to use**: In test files to create test data on-the-fly

### Seeders (`database/seeders/`)
- **Purpose**: Insert initial/baseline data into the database
- **Usage**: Data required for the application to function
- **Example**: Default categories, email templates, admin user
- **When to use**: For essential data needed in all environments

## Seeder Categories

### Production Seeders
These seeders should run in **all environments** including production:

1. **10_language_seeder.ts** - Core languages
2. **20_user_seeder.ts** - Admin and initial users from env vars
3. **30_proposition_category_seeder.ts** - Default categories
4. **email_template_seeder.ts** - Email templates

### Development/Test Seeders
These seeders should **ONLY** run in development/test environments:

1. **40_proposition_seeder.ts** - Sample propositions for testing
2. **deadline_reminder_test_seeder.ts** - Test data for deadline reminders

## How to Protect Production

### Method 1: Environment Check (Recommended)
Add an environment check at the beginning of the `run()` method:

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders';
import env from '#start/env';

export default class extends BaseSeeder {
    public async run(): Promise<void> {
        // Skip in production environment
        if (env.get('NODE_ENV') === 'production') {
            console.log('[MySeeder] Skipping in production environment');
            return;
        }

        // Your seeding logic here...
    }
}
```

### Method 2: Selective Execution
Run specific seeders instead of all:

```bash
# Production - Only run essential seeders
node ace db:seed --files=database/seeders/10_language_seeder.ts
node ace db:seed --files=database/seeders/20_user_seeder.ts
node ace db:seed --files=database/seeders/30_proposition_category_seeder.ts
node ace db:seed --files=database/seeders/email_template_seeder.ts

# Development - Run all seeders
node ace db:seed
```

## Current Implementation

All test/development seeders have been updated to check `NODE_ENV`:

- ✅ `40_proposition_seeder.ts` - Skips in production
- ✅ `deadline_reminder_test_seeder.ts` - Skips in production

## Best Practices

### 1. Naming Convention
- **Production seeders**: Start with numbers (10_, 20_, 30_) to control execution order
- **Test seeders**: Use descriptive names with `_test` suffix

### 2. Idempotency
All seeders should be idempotent (safe to run multiple times):

```typescript
// BAD - Will create duplicates
await User.create({ email: 'admin@example.com' });

// GOOD - Only creates if doesn't exist
await User.firstOrCreate(
    { email: 'admin@example.com' },
    { username: 'admin', password: 'xxx' }
);
```

### 3. Environment Variables
Use environment variables for production data:

```typescript
const adminEmail = env.get('ADMIN_EMAIL');
const additionalEmails = JSON.parse(env.get('ADDITIONAL_EMAILS'));
```

### 4. Clear Logging
Always log what the seeder is doing:

```typescript
console.log('[MySeeder] Creating 5 categories');
console.log('[MySeeder] Skipping in production environment');
```

## Testing Seeders

### In Development
```bash
# Run all seeders
node ace db:seed

# Run specific seeder
node ace db:seed --files=database/seeders/40_proposition_seeder.ts
```

### Before Production Deploy
```bash
# Set production environment
export NODE_ENV=production

# Try running seeders - test seeders should skip
node ace db:seed

# Reset environment
unset NODE_ENV
```

## Migration vs Seeder

### Use Migrations for:
- Database schema changes (tables, columns, indexes)
- Structural changes
- Data type changes

### Use Seeders for:
- Initial data population
- Reference data (categories, statuses, etc.)
- Default configurations
- Test data (development only)

## Common Pitfalls

❌ **Don't**: Create test data in production
❌ **Don't**: Hard-code production credentials in seeders
❌ **Don't**: Make seeders depend on specific user IDs
❌ **Don't**: Create seeders that aren't idempotent

✅ **Do**: Check environment before seeding test data
✅ **Do**: Use environment variables for production data
✅ **Do**: Use `firstOrCreate()` for idempotency
✅ **Do**: Log seeder actions clearly
