"""
TeleBooks Migration & Seed Runner for Supabase PostgreSQL
"""

import os
import sys
import psycopg2

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.plunoacxwgwsjayzwmdl:vascodagama1998@aws-0-us-east-2.pooler.supabase.com:6543/postgres"
)

MIGRATIONS = [
    "database/migrations/00001_create_extensions_and_helpers.sql",
    "database/migrations/00002_create_profiles.sql",
    "database/migrations/00003_create_catalog_tables.sql",
    "database/migrations/00004_create_user_shelf_and_reading.sql",
    "database/migrations/00005_create_performance_indexes.sql",
    "database/migrations/00006_create_rls_policies.sql",
]

SEEDS = [
    "database/seeds/001_initial_genres.sql",
    "database/seeds/002_demo_catalog.sql",
]


def run():
    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"Connection error: {e}", file=sys.stderr)
        sys.exit(1)

    print("\n=== EXECUTING MIGRATIONS ===")
    for mig in MIGRATIONS:
        print(f"Running: {mig} ...", end=" ", flush=True)
        try:
            with open(mig, "r", encoding="utf-8") as f:
                sql = f.read()
            cur.execute(sql)
            print("OK")
        except Exception as e:
            print(f"FAILED!\nError: {e}", file=sys.stderr)
            conn.close()
            sys.exit(1)

    print("\n=== EXECUTING SEEDS ===")
    for seed in SEEDS:
        print(f"Running: {seed} ...", end=" ", flush=True)
        try:
            with open(seed, "r", encoding="utf-8") as f:
                sql = f.read()
            cur.execute(sql)
            print("OK")
        except Exception as e:
            print(f"FAILED!\nError: {e}", file=sys.stderr)
            conn.close()
            sys.exit(1)

    print("\n=== VERIFYING DATABASE STATE ===")
    # List public tables and row counts
    cur.execute("""
        SELECT table_name, rowsecurity
        FROM information_schema.tables t
        JOIN pg_tables p ON p.tablename = t.table_name AND p.schemaname = 'public'
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tables = cur.fetchall()

    print(f"\nFound {len(tables)} tables in 'public' schema:")
    print(f"{'Table':<25} | {'RLS Enabled':<12} | {'Row Count'}")
    print("-" * 55)

    for table, rls in tables:
        try:
            cur.execute(f'SELECT count(*) FROM public."{table}";')
            count = cur.fetchone()[0]
        except Exception:
            count = "N/A"
        print(f"{table:<25} | {str(rls):<12} | {count}")

    cur.close()
    conn.close()
    print("\nMigrations and seeds finished successfully!")


if __name__ == "__main__":
    run()
