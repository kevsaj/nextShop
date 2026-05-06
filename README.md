# nextjs-shopify-app

A Next.js tool for managing a Shopify trading card store. Fetches products from Shopify, matches them against the Collectr catalog, compares market prices over time, and exports Shopify-ready CSVs with updated prices and card images.

## Stack

- Next.js / React / TypeScript
- Supabase (product matching database + CSV baseline storage)
- Shopify REST API
- Collectr API

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root:
   ```
   SHOPIFY_STORE_DOMAIN=
   SHOPIFY_ACCESS_TOKEN=
   COLLECTR_API_BASE_URL=
   COLLECTR_API_KEY=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

## Features

**Price comparison** — upload a fresh Collectr portfolio export and compare it against the saved baseline to see which cards changed in price. Filter by direction (up/down) and minimum change amount, then download either a standard CSV or a Shopify-formatted CSV ready for import.

**Shopify CSV export** — the Shopify export includes product handles, new prices, and card image URLs so your friend can import it directly into Shopify to update prices and images in bulk.

**Product matching** — fetch products from Shopify and match them to their corresponding Collectr catalog entries. Matches are saved to Supabase and used to resolve image URLs and Shopify handles during CSV export.

**SKU search** — look up individual cards in the Collectr catalog by SKU.

## Contact

kisstudios98@gmail.com
