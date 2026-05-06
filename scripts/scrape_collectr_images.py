"""
Looks up each card on the public Collectr website and saves image URLs to card_images.csv.

For each card SKU it:
  1. Opens https://app.getcollectr.com/explore in a headless browser
  2. Searches for the SKU
  3. Intercepts the API response to get the product ID
  4. Builds the image URL: https://public.getcollectr.com/public-assets/products/product_{id}.png

Requirements:
    pip install playwright python-dotenv
    playwright install chromium

Input:  card_numbers.txt  — one SKU per line (or pass --csv path/to/file.csv)
        Alternatively reads card numbers from .env.local SUPABASE config if supabase package installed.

Output: card_images.csv  (card_number, collectr_id, image_url, product_name)

Optional Supabase upload:
    pip install supabase
    Reads SUPABASE_URL + SUPABASE_KEY (or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) from .env.local
"""

import csv
import os
import re
import sys
import time
import argparse
from pathlib import Path

# Load .env.local
env_path = Path(__file__).parent.parent / ".env.local"
if env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(env_path)
    except ImportError:
        # Manual parse if python-dotenv not installed
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

try:
    from playwright.sync_api import sync_playwright, Page
except ImportError:
    print("ERROR: Run: pip install playwright && playwright install chromium")
    sys.exit(1)

IMAGE_BASE_URL = "https://public.getcollectr.com/public-assets/products/product_"
OUTPUT_CSV = Path(__file__).parent / "card_images.csv"
EXPLORE_URL = "https://app.getcollectr.com/explore"


def load_card_numbers(csv_path: str | None) -> list[str]:
    """Load card numbers from a CSV file, txt file, or card_numbers.txt."""
    if csv_path:
        p = Path(csv_path)
        if not p.exists():
            print(f"ERROR: File not found: {csv_path}")
            sys.exit(1)
        suffix = p.suffix.lower()
        if suffix == ".csv":
            with open(p, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                # Accept columns named: card_number, cardNumber, sku, SKU, Variant SKU
                for col in ("card_number", "cardNumber", "sku", "SKU", "Variant SKU"):
                    if col in (reader.fieldnames or []):
                        return [row[col].strip() for row in reader if row[col].strip()]
            print(f"ERROR: CSV has no recognised SKU column (card_number / sku / 'Variant SKU')")
            sys.exit(1)
        else:
            return [line.strip() for line in p.read_text().splitlines() if line.strip()]

    # Default: card_numbers.txt next to this script
    default_txt = Path(__file__).parent / "card_numbers.txt"
    if default_txt.exists():
        return [line.strip() for line in default_txt.read_text().splitlines() if line.strip()]

    print("No card numbers file found.")
    print("Create scripts/card_numbers.txt with one SKU per line, or pass --csv path/to/file.csv")
    sys.exit(1)


def search_card(page: Page, sku: str) -> dict | None:
    """
    Navigate to the Collectr explore page, search for the SKU,
    intercept the search API response, and return the first result.
    """
    result_holder: list[dict] = []

    def on_response(response):
        if "api-v2.getcollectr.com" not in response.url:
            return
        if response.status != 200:
            return
        try:
            data = response.json()
            items = data if isinstance(data, list) else data.get("items") or data.get("data") or data.get("results") or []
            if items:
                result_holder.extend(items[:3])
        except Exception:
            pass

    page.on("response", on_response)

    try:
        page.goto(EXPLORE_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(1000)

        # Find and fill the search box
        search_input = page.locator("input[type='search'], input[placeholder*='search' i], input[placeholder*='Search' i]").first
        search_input.fill("")
        search_input.type(sku, delay=50)
        page.wait_for_timeout(2000)  # wait for search results to load

        # Extract first result from intercepted responses
        if result_holder:
            item = result_holder[0]
            collectr_id = _extract_id(item)
            card_number = _extract_sku(item) or sku
            name = _extract_name(item)
            if collectr_id:
                return {
                    "card_number": card_number,
                    "collectr_id": collectr_id,
                    "image_url": f"{IMAGE_BASE_URL}{collectr_id}.png",
                    "product_name": name,
                }

        # Fallback: click first result and read the URL for the product ID
        first_result = page.locator("a[href*='/explore/product/']").first
        if first_result.count() == 0:
            return None
        href = first_result.get_attribute("href") or ""
        m = re.search(r"/explore/product/(\d+)", href)
        if m:
            cid = m.group(1)
            return {
                "card_number": sku,
                "collectr_id": cid,
                "image_url": f"{IMAGE_BASE_URL}{cid}.png",
                "product_name": "",
            }
    except Exception as e:
        print(f"    Error searching {sku}: {e}")
    finally:
        page.remove_listener("response", on_response)

    return None


def _extract_id(item: dict) -> str | None:
    for key in ("imageUrl", "image_url"):
        url = item.get(key, "")
        if url:
            m = re.search(r"product_(\d+)", url)
            if m:
                return m.group(1)
    for key in ("productId", "product_id", "id"):
        if item.get(key):
            return str(item[key])
    return None

def _extract_sku(item: dict) -> str | None:
    for key in ("cardNumber", "card_number", "sku"):
        if item.get(key):
            return str(item[key])
    return None

def _extract_name(item: dict) -> str:
    for key in ("productName", "product_name", "name", "title"):
        if item.get(key):
            return str(item[key])
    return ""


def main():
    parser = argparse.ArgumentParser(description="Scrape Collectr image URLs for a list of card SKUs")
    parser.add_argument("--csv", help="Path to CSV or TXT file with card numbers")
    parser.add_argument("--delay", type=float, default=0.5, help="Seconds between requests (default 0.5)")
    args = parser.parse_args()

    card_numbers = load_card_numbers(args.csv)
    print(f"Loaded {len(card_numbers)} card numbers")

    # Load already-processed results so we can resume
    existing: dict[str, dict] = {}
    if OUTPUT_CSV.exists():
        with open(OUTPUT_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row.get("card_number"):
                    existing[row["card_number"]] = row
        print(f"Resuming — {len(existing)} already done, {len(card_numbers) - len(existing)} remaining")

    todo = [c for c in card_numbers if c not in existing]

    if not todo:
        print("All cards already processed.")
    else:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            for i, sku in enumerate(todo):
                print(f"[{i+1}/{len(todo)}] {sku} ... ", end="", flush=True)
                result = search_card(page, sku)
                if result:
                    existing[sku] = result
                    print(f"found id={result['collectr_id']}")
                else:
                    existing[sku] = {"card_number": sku, "collectr_id": "", "image_url": "", "product_name": ""}
                    print("not found")

                # Save after every 10 cards so progress isn't lost
                if (i + 1) % 10 == 0:
                    _write_csv(existing)

                time.sleep(args.delay)

            browser.close()

    _write_csv(existing)
    found = sum(1 for r in existing.values() if r.get("collectr_id"))
    print(f"\nDone. {found}/{len(existing)} cards found. Written to {OUTPUT_CSV}")

    upload_to_supabase(list(existing.values()))


def _write_csv(data: dict[str, dict]):
    rows = sorted(data.values(), key=lambda r: r["card_number"])
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["card_number", "collectr_id", "image_url", "product_name"])
        writer.writeheader()
        writer.writerows(rows)


def upload_to_supabase(rows: list[dict]):
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("\nSkipping Supabase upload (no env vars). Import card_images.csv manually in the Supabase dashboard.")
        return

    try:
        from supabase import create_client
    except ImportError:
        print("\nSkipping Supabase upload (run: pip install supabase). Import card_images.csv manually.")
        return

    valid = [r for r in rows if r.get("collectr_id")]
    if not valid:
        print("\nNo valid rows to upload.")
        return

    print(f"\nUploading {len(valid)} rows to Supabase...")
    client = create_client(supabase_url, supabase_key)

    batch_size = 500
    for i in range(0, len(valid), batch_size):
        batch = valid[i:i + batch_size]
        client.table("card_images").upsert(batch, on_conflict="card_number").execute()
        print(f"  {min(i + batch_size, len(valid))}/{len(valid)}")

    print("Supabase upload complete.")


if __name__ == "__main__":
    main()
