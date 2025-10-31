# Test Data Seed

This directory contains scripts for seeding test data into the database for development and testing purposes.

## Scripts

### `seed-test-data.ts`
Generates realistic test data for the current month (October 2025) with the ability to easily rollback.

**Features:**
- Creates 5-10 customers per location (except WALK_IN)
- Generates 3-7 random sales per customer throughout October 2025
- Realistic data patterns:
  - Random business hours (6 AM - 8 PM)
  - Varying quantities (1-10 gallons)
  - 30% of customers have custom pricing
  - 80% of customers have phone numbers
  - Unique dates per customer (no duplicate sales on same day)
- Easy rollback using marker customer approach

## Usage

### Create Test Data

```bash
cd backend-v2
npm run seed:test
```

This will:
1. Create a hidden marker customer to track test data
2. Generate customers across all locations (BANAI, DOUBE_L, JOVIL_3, etc.)
3. Create random sales for each customer throughout October 2025
4. Display summary statistics

**Example Output:**
```
🎉 Test data seed completed!

📊 Summary:
   • Customers created: 75
   • Sales created: 412
   • Date range: October 1-31, 2025
   • Locations covered: 10

💡 To remove this test data, run: npm run seed:rollback
```

### Remove Test Data

```bash
npm run seed:rollback
```

This will:
1. Find the marker customer (created by seed:test)
2. Delete all customers and sales created after the marker
3. Display summary of deleted records

**Example Output:**
```
🎉 Rollback completed!

📊 Summary:
   • Customers removed: 76
   • Sales removed: 412
```

## Safety Features

- **Marker-based tracking**: Uses a special `TEST_DATA_MARKER` customer to identify test data
- **Timestamp-based cleanup**: Only deletes data created after the marker timestamp
- **Production-safe**: Won't affect existing production data if marker doesn't exist
- **Idempotent**: Can run rollback multiple times safely
- **Validation**: Checks for admin user and existing data before proceeding

## Data Characteristics

### Customers
- **Names**: Random Filipino names from predefined lists
- **Locations**: All 10 business locations (excluding WALK_IN for test data)
- **Phone Numbers**: Realistic format (0917-XXXXXXX, 0918-XXXXXXX, etc.)
- **Custom Pricing**: 30% chance of custom price (₱20-₱30 range)

### Sales
- **Quantity**: 1-10 gallons per sale
- **Dates**: Random dates throughout October 2025
- **Times**: Business hours (6:00 AM - 8:00 PM)
- **Uniqueness**: Each customer can only have one sale per day
- **Pricing**: Uses customer's custom price if set, otherwise global price (₱25.00)

## Integration with Dashboard

The test data is perfect for:
- Testing the Dashboard date filter (7D, 30D, 90D, 1Y)
- Verifying KPI calculations and sparklines
- Testing custom pricing features
- Checking location-based analytics
- Validating customer statistics

## Notes

- Always run the main seed first (`npm run prisma:seed`) to create admin user and settings
- Test data uses the same admin user for all creations
- The marker customer is hidden (`active: false`) and won't appear in UI
- Rollback is timestamp-based, so it's safe even if production data is added later

## Troubleshooting

**Error: "No admin user found"**
- Run `npm run prisma:seed` first to create the admin user

**Warning: "Test data already exists"**
- Run `npm run seed:rollback` first to remove existing test data

**No data deleted during rollback**
- Test data was already removed or never created
- This is safe and expected
