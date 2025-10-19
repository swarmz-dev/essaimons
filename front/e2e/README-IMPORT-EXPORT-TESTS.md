# Proposition Import/Export E2E Tests

This document explains how to run the comprehensive E2E tests for the proposition import/export feature.

## Overview

The import/export tests verify the complete workflow:
- **Export Flow**: Selecting propositions, configuring export options, downloading JSON files
- **Import Flow**: Uploading files, analyzing conflicts, resolving conflicts, executing imports
- **Accessibility**: ARIA labels, heading hierarchy, keyboard navigation
- **Error Handling**: Invalid files, network errors, validation errors

## Prerequisites

The tests require the **real backend** to be running because:
1. Admin authentication is required (mock server only supports regular users)
2. Export functionality needs actual proposition data
3. Import functionality needs to interact with the database

## Setup Instructions

### 1. Start the Backend Server

In the `back/` directory:

```bash
cd back
npm run dev
```

The backend should be running on `http://127.0.0.1:3333`

### 2. Ensure Database is Seeded

Make sure you have test data in your database:

```bash
cd back
node ace db:seed
```

This will create:
- Admin user: `superadmin` / `xxx`
- Regular users
- Sample propositions
- Categories

### 3. Run the E2E Tests

In the `front/` directory:

```bash
cd front
PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts
```

### Optional: Run with UI

To see the tests running in a browser:

```bash
PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts --headed
```

### Optional: Run Specific Test Suite

```bash
# Basic UI tests only
PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts -g "Basic UI"

# Full export workflow
PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts -g "Full Export Workflow"

# Full import workflow
PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts -g "Full Import Workflow"

# Accessibility tests
PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts -g "Accessibility"
```

### Optional: Debug Mode

To step through tests:

```bash
PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts --debug
```

## Test Structure

### 1. Basic UI Tests
- Verify export page loads with correct elements
- Verify import page loads with correct elements
- Test export options toggling
- Test proposition table display

### 2. Full Export Workflow Tests
- Select propositions and export to JSON
- Verify exported file structure and content
- Test select all/deselect all functionality
- Verify export includes selected options (status history, votes, etc.)

### 3. Full Import Workflow Tests
- Upload and analyze export file
- Navigate through 4-step wizard (Upload → Resolve → Execute → Complete)
- Resolve conflicts automatically
- Execute import and verify success
- Test error handling for invalid files

### 4. Accessibility Tests
- Verify proper heading hierarchy
- Test button accessible names
- Check ARIA labels on file inputs
- Verify progress indicator accessibility

## Troubleshooting

### Tests Skip Immediately

**Issue**: All tests are skipped
**Cause**: `PLAYWRIGHT_USE_REAL_BACKEND` environment variable not set
**Solution**: Always use `PLAYWRIGHT_USE_REAL_BACKEND=true` when running these tests

### "Cannot navigate to invalid URL"

**Issue**: Tests fail with protocol error
**Cause**: Frontend build/preview server not started
**Solution**: Playwright automatically starts the preview server, but make sure the build succeeds first:

```bash
cd front
npm run build
```

If build fails, fix any TypeScript/Svelte errors first.

### "Login failed" or Stuck on Login Page

**Issue**: Cannot login as admin
**Cause**: Backend not running or database not seeded
**Solution**:
1. Start backend: `cd back && npm run dev`
2. Seed database: `cd back && node ace db:seed`
3. Verify admin user exists in database

### "No propositions available" - Tests Skip

**Issue**: Export tests skip due to no data
**Cause**: Database not seeded with propositions
**Solution**: Run the proposition seeder:

```bash
cd back
node ace db:seed
```

### Import Tests Fail

**Issue**: Import workflow doesn't complete
**Cause**: Export file was not created (no propositions to export)
**Solution**: Ensure database has at least one proposition before running import tests

## Test Coverage

✅ **Covered**:
- Page loading and navigation
- User authentication (admin)
- Export file generation
- Export file validation
- Import file upload
- Conflict analysis
- Conflict resolution UI
- Import execution
- Success/error messaging
- Accessibility compliance

❌ **Not Covered** (Future Enhancements):
- Network error retry logic
- Large file handling (performance)
- Excel export format (currently JSON only)
- Concurrent imports
- Progress bars during long operations

## CI/CD Integration

To run these tests in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Start Backend
  run: cd back && npm run dev &

- name: Wait for Backend
  run: npx wait-on http://127.0.0.1:3333

- name: Seed Database
  run: cd back && node ace db:seed

- name: Run E2E Tests
  run: cd front && PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts
  env:
    PLAYWRIGHT_REAL_BACKEND_ORIGIN: http://127.0.0.1:3333
```

## Contributing

When adding new features to import/export:

1. **Add corresponding E2E tests** in the appropriate test suite
2. **Update this README** if new setup steps are required
3. **Ensure tests pass** with real backend before submitting PR
4. **Add accessibility tests** for any new UI components

## File Locations

- Test file: `front/e2e/proposition-import-export.test.ts`
- Import pages: `front/src/routes/admin/propositions/import/`
- Export page: `front/src/routes/admin/propositions/export/+page.svelte`
- Backend services: `back/app/services/proposition_*_service.ts`
- Backend controller: `back/app/controllers/admin/proposition_import_export_controller.ts`
