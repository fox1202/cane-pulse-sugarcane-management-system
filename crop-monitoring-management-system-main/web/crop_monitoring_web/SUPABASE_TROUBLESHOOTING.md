# Supabase Connection Troubleshooting Guide

## 🔗 Connection Test Overview

The **Supabase Connection Test** page provides comprehensive diagnostics to verify your web app's connection to Supabase and check data availability.

### Quick Start

1. **Login to the web app**
2. **Click "Supabase Connection"** in the left navigation menu
3. **Review the test results** and follow the appropriate solution below

---

## 📊 Understanding Test Results

### ✅ Passed Tests (Green)
These indicate successful components. No action needed.

### ⚠️ Warnings (Yellow)
Some tests passed but with caveats. Review the details but data may still be accessible.

### ❌ Failed Tests (Red)
Critical issues preventing data access. Follow the solutions below.

---

## 🔧 Common Issues & Solutions

### Issue: "VITE_SUPABASE_URL - Missing"
**Cause:** Environment variable not configured
**Solution:**
```bash
# Create/edit .env file in your project root
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```
Then restart the development server.

---

### Issue: "observations table does not exist"
**Cause:** Data is in a different table or schema
**Solution:**
1. Check the **📊 Database Tables** section in the test results
2. Look for similar table names:
   - `observations_raw`
   - `field_observations`
   - `observation`
   - `observation_images`
3. If you find data in a different table, it will be automatically detected by the fallback logic

---

### Issue: "No tables with data found"
**Cause:** Database is empty or web app isn't connecting
**Solution:**
1. **Check Supabase project:**
   - Log in to Supabase dashboard
   - Verify the project is active
   - Check if tables exist in the SQL editor
2. **Collect data with the mobile app:**
   - Use the mobile field observation app to create observations
   - Wait a few moments for data to sync
3. **Verify API key permissions:**
   - Ensure the Anon Key has `SELECT` permissions on observation tables

---

### Issue: "No active user session (using anon key)"
**Cause:** Normal behavior for unauthenticated access
**Solution:**
- This is expected when using the Anon Key
- The app will still work but with row-level security (RLS) policies limiting data access
- If you need authenticated access, ensure your RLS policies allow the anon key to read data

---

### Issue: "Failed to execute sample query"
**Cause:** Table exists but can't read data (likely RLS policy issue)
**Solution:**
1. **Check Row Level Security (RLS):**
   ```sql
   -- In Supabase SQL Editor, run:
   SELECT * FROM pg_policies WHERE table_name = 'observations';
   ```
2. **If RLS is blocking access, temporarily disable for testing:**
   - Go to Supabase Dashboard > Authentication > Policies
   - Disable RLS on observation tables temporarily
   - Test the app
   - Re-enable RLS with proper policies

---

## 📋 Verification Checklist

### Database
- [ ] `observations` table exists
- [ ] Table contains data (row count > 0)
- [ ] At least one of these tables has data:
  - [ ] crop_information
  - [ ] crop_monitoring
  - [ ] harvest

### Configuration
- [ ] VITE_SUPABASE_URL configured
- [ ] VITE_SUPABASE_ANON_KEY configured
- [ ] Values copied exactly (no extra spaces)

### Supabase Project
- [ ] Project is active
- [ ] Anon Key has SELECT permission
- [ ] RLS policies allow data access (or disabled for testing)

### Data Collection
- [ ] Mobile app has collected field observations
- [ ] Data has synced to Supabase (check in Supabase dashboard)
- [ ] Date/time on mobile device is correct

---

## 🐛 Debug Steps

### Step 1: Verify Data Exists
```sql
-- In Supabase SQL Editor:
SELECT COUNT(*) as observation_count FROM observations;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### Step 2: Check Connection
- Open Browser DevTools (F12)
- Go to Console tab
- Reload the page
- Look for logs starting with 🔍, 📊, 🔗

### Step 3: Test with Curl (if terminal available)
```bash
curl -X GET "https://your-project.supabase.co/rest/v1/observations?select=*&limit=1" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY"
```

---

## 📞 Still Need Help?

1. **Copy the test results:**
   - Click "📋 Copy to Console" button
   - Open Browser DevTools (F12)
   - Right-click > Save as to export logs

2. **Check the logs:**
   - Look at browser console for error messages
   - Check if table names match exactly

3. **Contact support with:**
   - Screenshot of test results
   - Table names from Database Tables section
   - Browser console error messages

---

## 📚 Related Pages

- **Field Records** (`/data`) - View all observations
- **Yield Analytics** (`/yield-analytics`) - Analyze observation data
- **Map View** (`/map`) - See observations on a map
- **Database Tables** (`/debug-db`) - List all database tables

---

Last Updated: 2026-03-09
