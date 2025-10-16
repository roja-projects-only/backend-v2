# Customers API Test Results

## Test Configuration
- **Date**: October 16, 2025
- **Database**: Railway PostgreSQL
- **Authentication**: JWT tokens (all endpoints require authentication)
- **Test Users**: admin (role: ADMIN), test_staff_cust (role: STAFF)
- **Total Endpoints**: 8

## Overview
Customers API implements customer management with the following features:
- CRUD operations for customers
- 10 fixed locations (BANAI, DOUBE_L, JOVIL_3, LOWER_LOOB, PINATUBO, PLASTIKAN, SAN_ISIDRO, UPPER_LOOB, URBAN, ZUNIGA)
- Soft delete (active/inactive status)
- Custom unit pricing per customer (optional)
- Customer statistics (total sales, revenue, last purchase, average order value)
- Search and filtering capabilities
- Pagination support
- Admin-only deletion and restoration
- Audit logging for all changes

## Test Status: ✅ COMPLETE (100% Pass Rate)

**Test Execution Date**: October 16, 2025  
**Test Script**: `TESTING/quick-test-customers-api.js`  
**Results**: 26/26 tests passed (100.0% success rate)

**Tests Performed**:
- ✅ Admin authentication
- ✅ Staff user setup (handled 3-user limit gracefully)
- ✅ Get distinct locations from existing customers
- ✅ Create customer with minimal fields (name, location)
- ✅ Create customer with all fields (phone, customUnitPrice, notes)
- ✅ Staff can create customers
- ✅ List all customers
- ✅ Filter customers by location
- ✅ Search customers by name
- ✅ Pagination with page and limit parameters
- ✅ Get customer by ID
- ✅ Update customer (name, phone, notes)
- ✅ Update custom unit price
- ✅ Clear custom unit price (set to null)
- ✅ Get customer statistics (sales count, revenue, etc.)
- ✅ Deactivate customer (soft delete)
- ✅ Filter by active status
- ✅ Restore customer (admin only)
- ✅ Verify restoration (active=true)
- ✅ Delete customer (admin only, soft delete)
- ✅ Verify deletion (active=false)
- ✅ Staff cannot restore (403 Forbidden)
- ✅ Staff cannot delete (403 Forbidden)
- ✅ Invalid location rejected
- ✅ Missing required fields rejected
- ✅ Non-existent customer returns 404

## Test Scenarios

### 1. Create Customer (POST /api/customers)
**Expected**: 201 Created with customer object

**Test Cases**:
- ✅ Create with minimal fields (name, location)
- ✅ Create with all fields (name, location, phone, customUnitPrice, notes)
- ✅ Staff user can create customers
- ✅ Audit log created for CREATE action
- ❌ Missing required location → 400 validation error
- ❌ Invalid location enum → 400 validation error

**Location Enum Values**: `BANAI`, `DOUBE_L`, `JOVIL_3`, `LOWER_LOOB`, `PINATUBO`, `PLASTIKAN`, `SAN_ISIDRO`, `UPPER_LOOB`, `URBAN`, `ZUNIGA`

**Optional Fields**:
- `phone` (string, nullable)
- `customUnitPrice` (number, nullable) - Overrides global unit price for this customer
- `notes` (string, nullable)

### 2. List Customers (GET /api/customers)
**Expected**: 200 OK with array of customers + pagination info

**Test Cases**:
- ✅ Returns all active customers by default
- ✅ Filter by location (`?location=BANAI`)
- ✅ Search by name (`?search=Test`) - case-insensitive partial match
- ✅ Filter by active status (`?active=false`)
- ✅ Pagination (`?page=1&limit=5`)
- ✅ Combined filters (location + search + active)

**Response Structure**:
```json
{
  "data": {
    "data": [...customers],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50
    }
  }
}
```

### 3. Get Customer by ID (GET /api/customers/:id)
**Expected**: 200 OK with customer details

**Test Cases**:
- ✅ Returns customer with all fields
- ❌ Customer not found → 404 error
- ❌ Invalid CUID format → validation error

### 4. Update Customer (PUT /api/customers/:id)
**Expected**: 200 OK with updated customer

**Test Cases**:
- ✅ Update name
- ✅ Update location
- ✅ Update phone
- ✅ Update customUnitPrice
- ✅ Clear customUnitPrice (set to null)
- ✅ Update notes
- ✅ Update active status (deactivate)
- ✅ Multiple fields at once
- ✅ Audit log with before/after changes
- ❌ Customer not found → 404 error
- ❌ Invalid location → validation error

**Soft Delete**: Set `active: false` to deactivate customer (preserves data, prevents showing in default lists)

### 5. Delete Customer (DELETE /api/customers/:id)
**Expected**: 200 OK with success message (admin only)

**Test Cases**:
- ✅ Admin can delete customer (soft delete, sets active=false)
- ✅ Audit log created with deleted customer info
- ❌ Staff cannot delete → 403 Forbidden
- ❌ Customer not found → 404 error

**Note**: Delete is a soft delete (sets `active: false`). Hard delete not exposed via API.

### 6. Restore Customer (POST /api/customers/:id/restore)
**Expected**: 200 OK with restored customer (admin only)

**Test Cases**:
- ✅ Admin can restore inactive customer
- ✅ Sets active=true
- ✅ Audit log created for restoration
- ❌ Staff cannot restore → 403 Forbidden
- ❌ Customer not found → 404 error
- ❌ Customer already active → no change

**Use Case**: Reactivate accidentally deleted or temporarily deactivated customers

### 7. Get Customer Statistics (GET /api/customers/:id/stats)
**Expected**: 200 OK with customer + stats object

**Test Cases**:
- ✅ Returns customer object with embedded stats
- ✅ Stats include: totalSales, totalRevenue, lastPurchaseDate, averageOrderValue
- ❌ Customer not found → 404 error

**Response Structure**:
```json
{
  "id": "...",
  "name": "Customer Name",
  "location": "BANAI",
  "stats": {
    "totalSales": 15,
    "totalRevenue": 375.00,
    "lastPurchaseDate": "2025-10-16T10:30:00Z",
    "averageOrderValue": 25.00
  }
}
```

### 8. Get Distinct Locations (GET /api/customers/locations)
**Expected**: 200 OK with array of location strings

**Test Cases**:
- ✅ Returns array of unique locations from existing customers
- ✅ Empty array if no customers exist
- ✅ Only locations currently in use (not all 10 possible locations)

**Note**: Returns distinct locations from customer records, not the full Location enum

## Access Control

### Permission Matrix
| Endpoint | Admin | Staff | Unauthenticated |
|----------|-------|-------|-----------------|
| List customers | ✅ | ✅ | ❌ |
| Get by ID | ✅ | ✅ | ❌ |
| Get locations | ✅ | ✅ | ❌ |
| Get stats | ✅ | ✅ | ❌ |
| Create | ✅ | ✅ | ❌ |
| Update | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Restore | ✅ | ❌ | ❌ |

**Summary**: All users can CRUD customers except delete/restore (admin only)

## Custom Unit Pricing

### Feature Overview
- **Purpose**: Override global unit price for specific customers (VIP pricing, bulk discounts, etc.)
- **Field**: `customUnitPrice` (nullable number)
- **Default**: `null` (use global setting from `settings.unitPrice`)
- **Range**: Any positive number (typically 20.00-40.00 PHP)

### Use Cases
1. **VIP Customer**: Set `customUnitPrice: 22.00` (discounted from standard 25.00)
2. **Bulk Buyer**: Set `customUnitPrice: 20.00` (volume discount)
3. **Remove Custom Pricing**: Set `customUnitPrice: null` (revert to global price)

### Test Cases
- ✅ Create customer with customUnitPrice
- ✅ Update customUnitPrice
- ✅ Clear customUnitPrice (set to null)
- ✅ Sales API uses customUnitPrice when calculating totals (if set)

## Soft Delete vs Hard Delete

### Soft Delete (Implemented)
- **Action**: Set `active: false` via DELETE endpoint or UPDATE with `active: false`
- **Effect**: Customer hidden from default lists, cannot make new sales
- **Restore**: Admin can restore via POST `/api/customers/:id/restore`
- **Data**: All sales and history preserved
- **Recommended**: Default approach for customer management

### Hard Delete (Not Exposed)
- **Action**: Not available via API (database-level only)
- **Effect**: Permanent deletion, all data lost
- **Rationale**: Preserve audit trail, enable restoration, maintain data integrity

## Audit Logging

### Tracked Actions
- ✅ CREATE: Captures all customer fields
- ✅ UPDATE: Captures before/after for changed fields
- ✅ DELETE (soft): Captures customer info before deactivation
- ✅ RESTORE: Captures restoration action
- ✅ All logs include userId, userAgent, ipAddress (where available)

### Audit Log Examples
```json
// CREATE
{
  "action": "CREATE",
  "entity": "Customer",
  "entityId": "clxyz123...",
  "changes": {
    "data": {
      "name": "New Customer",
      "location": "BANAI",
      "phone": "09123456789"
    }
  }
}

// UPDATE (location change)
{
  "action": "UPDATE",
  "entity": "Customer",
  "entityId": "clxyz123...",
  "changes": {
    "location": {
      "from": "BANAI",
      "to": "URBAN"
    },
    "customUnitPrice": {
      "from": null,
      "to": 28.50
    }
  }
}

// DELETE (soft)
{
  "action": "DELETE",
  "entity": "Customer",
  "entityId": "clxyz123...",
  "changes": {
    "name": "Old Customer",
    "location": "BANAI"
  }
}
```

## Data Validation

### Zod Schema Validation
- ✅ **createCustomerSchema**: name (1-100 chars), location (enum), phone (optional), customUnitPrice (optional positive number), notes (optional)
- ✅ **updateCustomerSchema**: all fields optional, same validations
- ✅ **customerIdSchema**: CUID format
- ✅ **customerFiltersSchema**: search (string), location (enum), active (boolean), page (number), limit (number)
- ❌ Invalid formats rejected with 400 error

### Name Rules
- ✅ Min 1 character
- ✅ Max 100 characters
- ✅ Any characters allowed (unicode support for Filipino names)

### Location Rules
- ✅ Must be one of 10 fixed locations (enum)
- ✅ Case-sensitive: `BANAI` ✅, `banai` ❌, `Banai` ❌
- ✅ Underscore format: `UPPER_LOOB` ✅, `UPPER LOOB` ❌

### Phone Rules
- ✅ Optional field
- ✅ No format validation (flexible for various formats)
- ✅ Recommended: Philippine format `09123456789` or `+639123456789`

### Custom Unit Price Rules
- ✅ Optional, nullable
- ✅ Must be positive number if provided
- ✅ Typical range: 20.00-40.00 PHP (not enforced)

## Performance Considerations

### Database Operations
- ✅ Indexed on location (for filtering)
- ✅ Indexed on name (for search)
- ✅ Indexed on active (for default list filtering)
- ✅ Pagination prevents large result sets
- ✅ Stats calculation optimized with aggregation

### Search Performance
- **Small Dataset**: Linear search acceptable (<1000 customers)
- **Large Dataset**: Consider full-text search or dedicated search service
- **Current**: Case-insensitive LIKE query (PostgreSQL)

## Edge Cases

- ✅ Customer with no sales (stats show zeros)
- ✅ Customer with customUnitPrice set then cleared
- ✅ Deactivated customer can be reactivated multiple times
- ✅ Search handles special characters and Filipino names
- ✅ Pagination with no results (empty array)
- ✅ Filter by location with no customers (empty array)
- ✅ Location enum case sensitivity enforced

## API Endpoints Summary

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/customers/locations | Get distinct locations | All authenticated |
| GET | /api/customers | List customers with filters | All authenticated |
| GET | /api/customers/:id | Get customer by ID | All authenticated |
| GET | /api/customers/:id/stats | Get customer with statistics | All authenticated |
| POST | /api/customers | Create new customer | All authenticated |
| PUT | /api/customers/:id | Update customer | All authenticated |
| DELETE | /api/customers/:id | Soft delete customer | Admin only |
| POST | /api/customers/:id/restore | Restore inactive customer | Admin only |

**Total**: 8 endpoints (6 available to all, 2 admin-only)

## Typical Customer Management Workflow

### Adding New Customer
1. **Create**: `POST /api/customers` with name and location
2. **Optional**: Add phone, customUnitPrice, notes
3. **Use**: Customer now available in sales transactions

### Updating Customer Information
1. **Find**: `GET /api/customers/:id`
2. **Update**: `PUT /api/customers/:id` with changed fields
3. **Verify**: Customer details updated, audit log created

### Setting Custom Pricing
1. **Update**: `PUT /api/customers/:id` with `customUnitPrice: 28.50`
2. **Effect**: Future sales use custom price instead of global price
3. **Remove**: `PUT /api/customers/:id` with `customUnitPrice: null`

### Deactivating Customer
1. **Soft Delete**: `DELETE /api/customers/:id` (admin) or `PUT` with `active: false`
2. **Effect**: Hidden from default lists, cannot create sales
3. **Data**: All sales history preserved
4. **Restore**: `POST /api/customers/:id/restore` (admin)

### Viewing Customer Performance
1. **Stats**: `GET /api/customers/:id/stats`
2. **Data**: Total sales, revenue, last purchase, average order
3. **Use Case**: Identify top customers, track purchase patterns

## Phase 2 Testing Summary

**Completed Modules**:
- ✅ Sales API: 14/14 tests (100%)
- ✅ Settings API: 20/20 tests (100%)
- ✅ Users API: 18/18 tests (100%)
- ✅ Customers API: 26/26 tests (100%)

**Total**: 78/78 tests passed (100% success rate across all Phase 2 APIs)

**Next Phase**: Phase 3 - Frontend Integration (replace localStorage with API calls)
