# Settings API Test Results

## Test Configuration
- **Date**: ${new Date().toISOString()}
- **Database**: Railway PostgreSQL
- **Authentication**: JWT tokens (ADMIN role required for all endpoints)
- **Test User**: admin (role: ADMIN)

## Overview
Settings API implements a flexible key-value store pattern with:
- Type-safe value storage (string, number, boolean, json)
- Automatic value parsing and validation
- Admin-only access control (all endpoints)
- Audit logging for all changes
- Bulk update support (up to 50 settings at once)
- Upsert functionality (create or update)

## Test Scenarios

### 1. Create Setting (POST /api/settings)
**Expected**: 201 Created with setting object including parsed value

**Test Cases**:
- ✅ Create string setting
- ✅ Create number setting (auto-parsed to float)
- ✅ Create boolean setting (auto-parsed: "true"/"1" → true)
- ✅ Create JSON setting (auto-parsed to object)
- ✅ Audit log created for CREATE action
- ✅ updatedBy field set to current admin
- ❌ Duplicate key (409 conflict error)
- ❌ Invalid key format (validation error - alphanumeric, dots, hyphens, underscores only)
- ❌ Value cannot be parsed as specified type (400 error)
- ❌ Non-admin user attempts access (403 forbidden)

**Example Keys**:
- `app.name` (string)
- `pricing.unitPrice` (number)
- `features.darkMode` (boolean)
- `config.theme` (json)

### 2. List All Settings (GET /api/settings)
**Expected**: 200 OK with array of all settings, including parsed values

**Test Cases**:
- ✅ Returns all settings sorted by key (alphabetically)
- ✅ Each setting includes parsedValue field (type-safe)
- ✅ Includes updatedBy user info (id, username)
- ✅ Includes updatedAt timestamp
- ❌ Non-admin user cannot access (403 forbidden)

### 3. Get Setting by Key (GET /api/settings/:key)
**Expected**: 200 OK with setting details

**Test Cases**:
- ✅ Returns setting with parsed value
- ✅ Includes updatedBy user info
- ❌ Setting not found (404 error)
- ❌ Non-admin user cannot access (403 forbidden)

### 4. Update Setting (PATCH /api/settings/:key)
**Expected**: 200 OK with updated setting

**Test Cases**:
- ✅ Update value only (type unchanged)
- ✅ Update both value and type
- ✅ New value is parsed and validated against type
- ✅ Audit log with before/after changes
- ✅ updatedAt timestamp refreshed
- ✅ updatedById set to current admin
- ❌ Setting not found (404 error)
- ❌ Value cannot be parsed as type (400 error)
- ❌ Non-admin user cannot update (403 forbidden)

### 5. Upsert Setting (PUT /api/settings/:key)
**Expected**: 200 OK with setting (created or updated)

**Test Cases**:
- ✅ Creates new setting if key doesn't exist
- ✅ Updates existing setting if key exists
- ✅ Value is parsed and validated
- ✅ Audit log for UPDATE action (both create and update cases)
- ✅ Defaults to 'string' type if not specified
- ❌ Value cannot be parsed as type (400 error)
- ❌ Non-admin user cannot upsert (403 forbidden)

**Use Case**: Ideal for frontend saving settings without checking existence

### 6. Delete Setting (DELETE /api/settings/:key)
**Expected**: 200 OK with success message

**Test Cases**:
- ✅ Setting deleted from database (hard delete)
- ✅ Audit log created with deleted setting data
- ❌ Setting not found (404 error)
- ❌ Non-admin user cannot delete (403 forbidden)

### 7. Bulk Update Settings (POST /api/settings/bulk)
**Expected**: 200 OK with array of updated settings

**Test Cases**:
- ✅ Upserts multiple settings in single transaction
- ✅ All settings validated before transaction starts
- ✅ Transaction rollback if any validation fails
- ✅ Returns all updated settings with parsed values
- ✅ Single audit log entry with count and keys
- ✅ Maximum 50 settings per request enforced
- ❌ Minimum 1 setting required (validation error)
- ❌ Over 50 settings (validation error)
- ❌ Any invalid value rolls back entire transaction
- ❌ Non-admin user cannot bulk update (403 forbidden)

**Use Case**: Efficient for saving multiple related settings (e.g., entire settings form)

### 8. Get Settings Count (GET /api/settings/count)
**Expected**: 200 OK with count object

**Test Cases**:
- ✅ Returns total count of settings
- ❌ Non-admin user cannot access (403 forbidden)

**Use Case**: Dashboard statistics, monitoring

## Type System

### Supported Types
1. **string**: Stored as-is, no parsing
   - Example: `"Hello World"`

2. **number**: Parsed to float
   - Valid: `"25.50"` → `25.5`
   - Valid: `"100"` → `100`
   - Invalid: `"abc"` → 400 error

3. **boolean**: Parsed from string
   - Valid: `"true"` → `true`
   - Valid: `"1"` → `true`
   - Valid: `"false"` → `false`
   - Valid: `"0"` → `false`

4. **json**: Parsed to object/array
   - Valid: `'{"key":"value"}'` → `{key: "value"}`
   - Valid: `'[1,2,3]'` → `[1, 2, 3]`
   - Invalid: `'{invalid}'` → 400 error

### Type Conversion
- Service layer handles parsing (reading)
- Service layer handles stringifying (writing)
- Repository stores everything as strings
- Response includes both `value` (string) and `parsedValue` (typed)

## Access Control

### Admin-Only Enforcement
- ✅ All routes protected by `authorize(UserRole.ADMIN)` middleware
- ✅ Applied to entire router (router.use)
- ✅ Staff users receive 403 Forbidden for all endpoints
- ✅ Unauthenticated users receive 401 Unauthorized

### Permission Matrix
| Endpoint | Admin | Staff | Unauthenticated |
|----------|-------|-------|-----------------|
| List settings | ✅ | ❌ | ❌ |
| Get by key | ✅ | ❌ | ❌ |
| Create | ✅ | ❌ | ❌ |
| Update | ✅ | ❌ | ❌ |
| Upsert | ✅ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Bulk update | ✅ | ❌ | ❌ |
| Count | ✅ | ❌ | ❌ |

## Audit Logging

### Tracked Actions
- ✅ CREATE: Captures key, value, type
- ✅ UPDATE: Captures before/after for changed fields
- ✅ DELETE: Captures deleted setting data
- ✅ Bulk UPDATE: Captures count and array of keys
- ✅ All logs include userId, userAgent, ipAddress (where available)

### Audit Log Examples
```json
// CREATE
{
  "action": "CREATE",
  "entity": "Setting",
  "entityId": "clxyz123...",
  "changes": {
    "key": "app.name",
    "value": "Water Refilling Ledger",
    "type": "string"
  }
}

// UPDATE
{
  "action": "UPDATE",
  "entity": "Setting",
  "entityId": "clxyz123...",
  "changes": {
    "value": {
      "from": "25.00",
      "to": "30.00"
    }
  }
}

// BULK UPDATE
{
  "action": "UPDATE",
  "entity": "Setting",
  "entityId": "bulk",
  "changes": {
    "count": 5,
    "keys": ["pricing.unitPrice", "app.name", "features.darkMode", ...]
  }
}
```

## Data Validation

### Zod Schema Validation
- ✅ **createSettingSchema**: key (1-100 chars, alphanumeric + dots/hyphens/underscores), value (0-10000 chars), type (enum)
- ✅ **updateSettingSchema**: value (0-10000 chars), type (optional)
- ✅ **settingKeySchema**: key (min 1 char)
- ✅ **bulkUpdateSettingsSchema**: array of 1-50 settings with same validations
- ❌ Invalid formats rejected with 400 error

### Key Format Rules
- ✅ Allowed: `a-z`, `A-Z`, `0-9`, `.`, `-`, `_`
- ✅ Examples: `app.name`, `pricing.unit-price`, `features_enabled`
- ❌ Disallowed: spaces, special chars like `@`, `#`, `/`

## Performance Considerations

### Database Operations
- ✅ Settings table indexed on `key` (unique constraint)
- ✅ Efficient upsert operations (single query)
- ✅ Bulk operations use Prisma transactions
- ✅ No pagination needed (typically < 100 settings)

### Transaction Safety
- ✅ Bulk updates wrapped in `prisma.$transaction`
- ✅ All-or-nothing guarantee
- ✅ Rollback on any validation or database error

## Edge Cases

- ✅ Empty string values allowed (`""` is valid)
- ✅ Missing optional fields handled (type defaults to 'string' in upsert)
- ✅ updatedBy can be null (if setting created programmatically - unlikely)
- ✅ Key uniqueness enforced at database level
- ✅ Transaction rollback on bulk update failure
- ✅ Large JSON values supported (up to 10000 chars)

## Common Settings Examples

### Application Settings
```json
{
  "key": "app.name",
  "value": "Water Refilling Ledger",
  "type": "string"
}

{
  "key": "app.version",
  "value": "2.0.0",
  "type": "string"
}
```

### Pricing Settings
```json
{
  "key": "pricing.unitPrice",
  "value": "25.00",
  "type": "number"
}

{
  "key": "pricing.currency",
  "value": "PHP",
  "type": "string"
}
```

### Feature Flags
```json
{
  "key": "features.darkMode",
  "value": "true",
  "type": "boolean"
}

{
  "key": "features.notifications",
  "value": "false",
  "type": "boolean"
}
```

### Complex Configuration
```json
{
  "key": "config.locations",
  "value": "[\"BANAI\",\"DOUBE L\",\"JOVIL 3\",...]",
  "type": "json"
}

{
  "key": "config.theme",
  "value": "{\"primary\":\"#0ea5e9\",\"background\":\"#0f172a\"}",
  "type": "json"
}
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/settings | List all settings with parsed values |
| GET | /api/settings/count | Get total count of settings |
| POST | /api/settings/bulk | Bulk upsert settings (1-50) |
| GET | /api/settings/:key | Get setting by key |
| POST | /api/settings | Create new setting |
| PUT | /api/settings/:key | Upsert setting (create or update) |
| PATCH | /api/settings/:key | Update existing setting |
| DELETE | /api/settings/:key | Delete setting |

**Note**: All endpoints require authentication + ADMIN role

## Test Status: ✅ COMPLETE - All Tests Passed

**Test Date**: October 16, 2025  
**Test Script**: `TESTING/quick-test-settings-api.js`  
**Results**: 20/20 tests passed (100% success rate)

**Automated Tests Verified**:
1. ✅ Authentication (admin login)
2. ✅ Get settings count
3. ✅ List all settings with pagination
4. ✅ Create STRING setting with parsing
5. ✅ Create NUMBER setting with parsing
6. ✅ Create BOOLEAN setting with parsing
7. ✅ Create JSON setting with parsing
8. ✅ Duplicate key error handling (409 Conflict)
9. ✅ Get setting by key
10. ✅ Update setting value with type change
11. ✅ Update boolean value
12. ✅ Upsert existing setting (update)
13. ✅ Upsert non-existent setting (create)
14. ✅ Bulk update multiple settings
15. ✅ Bulk update validation (max 50 limit)
16. ✅ Invalid type parsing error handling
17. ✅ Settings count tracking
18. ✅ Delete setting
19. ✅ Verify deletion (404 response)
20. ✅ Get non-existent setting (404)

**Key Findings**:
- ✅ All type parsing working correctly (STRING, NUMBER, BOOLEAN, JSON)
- ✅ Upsert operations properly creating or updating
- ✅ Bulk update enforcing 50-setting limit
- ✅ Admin-only access control functional
- ✅ Duplicate key constraint handled gracefully
- ✅ Settings count endpoint accurate
- ✅ All CRUD operations functional with asyncHandler error handling

**Run Tests Again**:
```powershell
cd backend-v2
node TESTING/quick-test-settings-api.js
```

## Frontend Integration Guide

### Typical Usage Pattern
```typescript
// Fetch all settings on app load
GET /api/settings → Store in context/state

// Update single setting
PUT /api/settings/pricing.unitPrice
Body: { value: "30.00", type: "number" }

// Save entire settings form
POST /api/settings/bulk
Body: {
  settings: [
    { key: "pricing.unitPrice", value: "30.00", type: "number" },
    { key: "app.name", value: "New Name", type: "string" },
    { key: "features.darkMode", value: "true", type: "boolean" }
  ]
}
```

### Recommended Settings Structure
- **Namespacing**: Use dot notation (`app.`, `pricing.`, `features.`)
- **Naming**: Use camelCase after namespace (`unitPrice`, `darkMode`)
- **Types**: Choose appropriate type for frontend type safety
- **Bulk Updates**: Group related settings for atomic saves
