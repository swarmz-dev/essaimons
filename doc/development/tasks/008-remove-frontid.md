# Task: Remove frontId and Use Native UUIDs

## Context
Currently, the codebase uses both `id` (UUID) and `frontId` (numeric ID) for users and other entities. This creates confusion and mismatches, as seen in the notification system where:
- Backend was broadcasting to `user/{UUID}/notifications`
- Frontend was subscribing to `user/{frontId}/notifications`

## Goal
Remove all `frontId` references and use native UUIDs throughout the application.

## Steps

### 1. Backend Changes

#### 1.1 Remove frontId from Models
- [ ] Remove `frontId` column from User model (`/back/app/models/user.ts`)
- [ ] Remove `frontId` column from other models (Proposition, Mandate, etc.)
- [ ] Update `apiSerialize()` methods to return `id` (UUID) instead of `frontId`
- [ ] Update `serialize()` methods similarly

#### 1.2 Database Migrations
- [ ] Create migration to drop `front_id` column from `users` table
- [ ] Create migration to drop `front_id` column from `propositions` table
- [ ] Create migration to drop `front_id` column from other tables that have it

#### 1.3 Update Controllers
- [ ] Search for all uses of `frontId` in controllers
- [ ] Replace with `id` (UUID)
- [ ] Update any queries that filter by `frontId`

#### 1.4 Update Services
- [ ] Search for all uses of `frontId` in services
- [ ] Replace with `id` (UUID)

#### 1.5 Update Repositories
- [ ] Search for `findByFrontId` methods
- [ ] Replace with `findById` using UUID
- [ ] Update any repository methods that use `frontId`

### 2. Frontend Changes

#### 2.1 Update API Calls
- [ ] Update all API calls to use UUID instead of numeric ID
- [ ] Search for URL patterns like `/api/users/${id}` and ensure they use UUID

#### 2.2 Update Stores
- [ ] Verify `SerializedUser` type expects `id: string` (UUID)
- [ ] Update any store logic that depends on numeric IDs

#### 2.3 Update Components
- [ ] Search for components that display or use user IDs
- [ ] Ensure they handle UUIDs properly
- [ ] Update any URL routing that uses numeric IDs to use UUIDs

#### 2.4 Update Routes
- [ ] Check SvelteKit routes that use `[id]` parameters
- [ ] Ensure they validate and handle UUIDs
- [ ] Update any route guards or parameter validation

### 3. Testing

#### 3.1 Backend Tests
- [ ] Update unit tests that create fixtures with `frontId`
- [ ] Update integration tests that query by `frontId`
- [ ] Run all backend tests and fix failures

#### 3.2 Frontend Tests
- [ ] Update E2E tests that use numeric IDs
- [ ] Update component tests
- [ ] Run all frontend tests and fix failures

#### 3.3 Manual Testing
- [ ] Test user profile page
- [ ] Test proposition detail pages
- [ ] Test notification system
- [ ] Test URL sharing (ensure UUIDs in URLs work)
- [ ] Test API endpoints directly

### 4. Documentation

- [ ] Update API documentation to reflect UUID usage
- [ ] Update development setup docs if needed
- [ ] Add migration guide for any existing data

## Files to Check

### Backend
```
/back/app/models/*.ts
/back/app/controllers/*.ts
/back/app/services/*.ts
/back/app/repositories/*.ts
/back/database/migrations/**/*.ts
```

### Frontend
```
/front/src/routes/**/*.svelte
/front/src/lib/services/*.ts
/front/src/lib/stores/*.ts
/front/src/lib/components/**/*.svelte
```

## Search Commands

```bash
# Find all frontId references in backend
cd back && grep -r "frontId" app/ --include="*.ts"

# Find all frontId references in frontend
cd front && grep -r "frontId" src/ --include="*.ts" --include="*.svelte"

# Find all front_id references (database column name)
cd back && grep -r "front_id" app/ database/ --include="*.ts"
```

## Risks and Considerations

1. **Breaking Changes**: This is a breaking change for any external API consumers
2. **URL Changes**: URLs will change from `/users/1` to `/users/uuid-here`
3. **Database Size**: UUIDs take more storage than integers
4. **Performance**: UUID indexes are slightly slower than integer indexes
5. **Human Readability**: UUIDs are harder to read/remember than numeric IDs

## Benefits

1. **Consistency**: Single ID system throughout
2. **Security**: UUIDs are not sequential, harder to guess
3. **Scalability**: UUIDs work better for distributed systems
4. **Simplicity**: Less code to maintain dual ID systems

## Rollback Plan

If issues arise:
1. Revert the migrations (database changes)
2. Revert the model changes
3. Restore `frontId` logic in `apiSerialize()` methods
4. Restore frontend to use numeric IDs

## Estimated Effort

- Backend changes: 3-4 hours
- Frontend changes: 2-3 hours
- Testing: 2-3 hours
- Total: 7-10 hours
