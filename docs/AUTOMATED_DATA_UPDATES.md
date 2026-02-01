# Automated Data Updates Setup Guide

This guide explains how to set up automated stock and SEC data updates for SnoopTrade using free services.

## Overview

SnoopTrade needs to periodically update:
- **Stock price data** from Yahoo Finance
- **SEC Form 4 insider trading data** from SEC EDGAR

**In-app scheduler (every 24 hours):** When the backend is running (e.g. on DigitalOcean App Platform), it runs a built-in scheduler that updates **stock data daily at 6:00 AM EST** and **SEC Form 4 data daily at 7:00 AM EST**. So stock and SEC data are refreshed automatically every 24 hours without any external cron.

Due to memory constraints on free hosting tiers (like Render's 512MB limit), we also provide multiple options for running these updates externally.

## Option 1: GitHub Actions (Recommended)

GitHub Actions provides **2000 free minutes/month** and runs on GitHub's infrastructure with no memory constraints.

### Setup Steps

1. **Add MongoDB URI as GitHub Secret**
   - Go to your GitHub repository
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `MONGODB_URI`
   - Value: Your MongoDB connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/...`)

2. **The workflow file is already created at:**
   ```
   .github/workflows/update-data.yml
   ```

3. **Default Schedule:**
   - Stock data: Every 15 minutes during market hours (9 AM - 5 PM EST, Mon-Fri)
   - SEC data: Runs after stock updates
   - Daily full update: 6 AM EST

4. **Customize the Schedule:**
   Edit `.github/workflows/update-data.yml` and modify the cron expressions:
   ```yaml
   on:
     schedule:
       # Every 15 minutes during market hours (UTC time)
       - cron: '*/15 14-22 * * 1-5'
       # Daily at 6 AM EST (11:00 UTC)
       - cron: '0 11 * * *'
   ```

5. **Manual Trigger:**
   - Go to **Actions** tab in GitHub
   - Select "Update Stock & SEC Data" workflow
   - Click **Run workflow**
   - Optionally specify a single ticker or update type

### Verifying Setup
1. Go to **Actions** tab
2. You should see scheduled runs appearing
3. Click on a run to see logs for each ticker

---

## Option 2: External Cron Service (cron-job.org)

Use a free external cron service to call your API endpoints.

### Setup Steps

1. **Set Admin API Key on Render**
   - Go to your Render dashboard
   - Select your backend service
   - Go to **Environment** tab
   - Add: `ADMIN_API_KEY` = `your-secure-random-key`
   - Generate a key: `openssl rand -hex 32`

2. **Create Account on cron-job.org**
   - Go to [cron-job.org](https://cron-job.org)
   - Create a free account

3. **Create Cron Jobs for Each Ticker**
   
   Create 20 jobs for stock updates (staggered by 2 minutes). Use the same URL pattern for each of: AAPL, NVDA, META, GOOGL, MSFT, AMZN, TSLA, NFLX, JPM, JNJ, V, UNH, HD, DIS, BAC, XOM, PG, MA, PEP, WMT.
   
   Example: `https://your-api.onrender.com/admin/update/stock/AAPL?key=YOUR_KEY` with schedule `*/15 * * * *` (or stagger minutes for each ticker).

4. **For SEC Data (run daily, not every 15 min):**
   
   Create 20 jobs for SEC updates (run at 7 AM EST, staggered by 5 minutes). Same tickers as above; use `/admin/update/sec/{ticker}?key=YOUR_KEY`.

### API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/update/stock/{ticker}` | GET | Update single stock |
| `/admin/update/sec/{ticker}` | GET | Update single SEC data |
| `/admin/update/all-sequential` | GET | Update all (memory-safe) |
| `/admin/health` | GET | Health check |
| `/admin/jobs` | GET | List scheduled jobs |

### Authentication
- Pass API key as query parameter: `?key=YOUR_API_KEY`
- Or as header: `X-API-Key: YOUR_API_KEY`

---

## Option 3: Render Cron Jobs (Paid)

If you upgrade to Render's paid tier, you can use their native cron jobs feature:

1. Create a new **Cron Job** service on Render
2. Set it to run your Python script directly
3. Schedule as needed

---

## Memory Optimization Notes

The scripts have been optimized to:
- Process one ticker at a time
- Use lazy database connections
- Clear memory with `gc.collect()` after each operation
- Process data in batches
- Use shorter data periods (3 months default instead of 1 year)

### Command-line Usage

**Stock data script:**
```bash
# Update single ticker (3 months of data)
python scripts/stock_finance_data_extracton_script.py --ticker AAPL

# Update single ticker (1 year for initial load)
python scripts/stock_finance_data_extracton_script.py --ticker AAPL --period 1y

# Update all tickers
python scripts/stock_finance_data_extracton_script.py
```

**SEC data script:**
```bash
# Update single ticker (last 365 days)
python scripts/sec_filing_data_extraction_script.py --ticker AAPL

# Update single ticker (last 90 days for frequent updates)
python scripts/sec_filing_data_extraction_script.py --ticker AAPL --days 90

# Update all tickers
python scripts/sec_filing_data_extraction_script.py
```

---

## Troubleshooting

### "Out of memory" errors
- Use the per-ticker endpoints instead of bulk updates
- Reduce `--days` parameter for SEC data
- Ensure you're not running multiple updates simultaneously

### Rate limiting from SEC
- SEC allows ~10 requests per second
- Scripts include built-in delays
- If you see 429 errors, increase delays in the scripts

### GitHub Actions failing
- Check that `MONGODB_URI` secret is correctly set
- View the workflow logs for detailed error messages
- Ensure your MongoDB allows connections from GitHub's IP ranges

### Data not updating
- Check Render logs for errors
- Verify API key is correctly set
- Test endpoints manually in browser/Postman

---

## Recommended Setup

For most users, we recommend:

1. **Use GitHub Actions** for primary scheduled updates
2. **Keep per-ticker API endpoints** as backup/manual trigger option
3. **Set up basic monitoring** using GitHub Actions run history

This provides reliable, free automated updates without memory constraints.
