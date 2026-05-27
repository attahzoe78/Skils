import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "josenergy.db")


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # PAYGO Solar customers
        await db.execute("""
            CREATE TABLE IF NOT EXISTS solar_customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                address TEXT NOT NULL,
                package TEXT NOT NULL,
                deposit REAL NOT NULL,
                weekly_payment REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
                last_payment_at TEXT,
                next_due_at TEXT,
                total_paid REAL NOT NULL DEFAULT 0
            )
        """)

        # Payment records for solar
        await db.execute("""
            CREATE TABLE IF NOT EXISTS solar_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                paid_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (customer_id) REFERENCES solar_customers(id)
            )
        """)

        # E-Keke fleet
        await db.execute("""
            CREATE TABLE IF NOT EXISTS fleet (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keke_id TEXT NOT NULL UNIQUE,
                battery_level INTEGER NOT NULL DEFAULT 85,
                operator_name TEXT,
                operator_phone TEXT,
                checked_in_at TEXT,
                status TEXT NOT NULL DEFAULT 'available'
            )
        """)

        # Fleet hire records
        await db.execute("""
            CREATE TABLE IF NOT EXISTS fleet_hires (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keke_id TEXT NOT NULL,
                operator_name TEXT NOT NULL,
                operator_phone TEXT NOT NULL,
                hire_date TEXT NOT NULL DEFAULT (date('now')),
                revenue REAL NOT NULL DEFAULT 3500,
                checked_out_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # POS agents
        await db.execute("""
            CREATE TABLE IF NOT EXISTS pos_agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                terminal_id TEXT NOT NULL UNIQUE,
                agent_name TEXT NOT NULL,
                agent_phone TEXT NOT NULL,
                bank_partner TEXT NOT NULL,
                registered_at TEXT NOT NULL DEFAULT (datetime('now')),
                total_commission REAL NOT NULL DEFAULT 0
            )
        """)

        # POS transactions
        await db.execute("""
            CREATE TABLE IF NOT EXISTS pos_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id INTEGER NOT NULL,
                terminal_id TEXT NOT NULL,
                amount REAL NOT NULL,
                commission REAL NOT NULL,
                transacted_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (agent_id) REFERENCES pos_agents(id)
            )
        """)

        # Seed fleet if empty
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM fleet")
        row = await cursor.fetchone()
        if row["cnt"] == 0:
            await db.executemany(
                "INSERT INTO fleet (keke_id, battery_level, status) VALUES (?, ?, ?)",
                [
                    ("Keke-001", 92, "available"),
                    ("Keke-002", 67, "available"),
                    ("Keke-003", 45, "available"),
                ],
            )

        await db.commit()
