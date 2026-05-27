from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import aiosqlite
from datetime import datetime, timedelta, date
from database import get_db, init_db

app = FastAPI(title="JosEnergy Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


# ─────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────

class SolarCustomerCreate(BaseModel):
    name: str
    phone: str
    address: str
    package: str  # "50W" | "100W" | "200W"


class PaymentCreate(BaseModel):
    customer_id: int


class OperatorAssign(BaseModel):
    keke_id: str
    operator_name: str
    operator_phone: str


class FleetCheckout(BaseModel):
    keke_id: str


class BatteryUpdate(BaseModel):
    keke_id: str
    battery_level: int


class PosAgentCreate(BaseModel):
    agent_name: str
    agent_phone: str
    bank_partner: str


class PosTransactionCreate(BaseModel):
    agent_id: int
    amount: float


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

PACKAGES = {
    "50W":  {"deposit": 15000, "weekly": 2500},
    "100W": {"deposit": 25000, "weekly": 4000},
    "200W": {"deposit": 45000, "weekly": 7000},
}

COMMISSION_RATE = 0.0075
DAILY_HIRE = 3500.0


def next_due(from_dt: str) -> str:
    dt = datetime.fromisoformat(from_dt)
    return (dt + timedelta(days=7)).isoformat()


def row_to_dict(row) -> dict:
    return dict(row)


async def get_next_terminal_id(db) -> str:
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM pos_agents")
    row = await cursor.fetchone()
    n = row["cnt"] + 1
    return f"SPS-{n:03d}"


# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────

@app.get("/api/dashboard")
async def get_dashboard(db: aiosqlite.Connection = Depends(get_db)):
    # Weekly revenue (last 7 days)
    today = date.today()
    week_ago = today - timedelta(days=6)

    # Solar weekly
    cursor = await db.execute(
        """SELECT SUM(amount) as total FROM solar_payments
           WHERE date(paid_at) >= ?""",
        (week_ago.isoformat(),),
    )
    row = await cursor.fetchone()
    solar_weekly = row["total"] or 0.0

    # Fleet weekly
    cursor = await db.execute(
        """SELECT SUM(revenue) as total FROM fleet_hires
           WHERE date(checked_out_at) >= ?""",
        (week_ago.isoformat(),),
    )
    row = await cursor.fetchone()
    ekeke_weekly = row["total"] or 0.0

    # POS weekly
    cursor = await db.execute(
        """SELECT SUM(commission) as total FROM pos_transactions
           WHERE date(transacted_at) >= ?""",
        (week_ago.isoformat(),),
    )
    row = await cursor.fetchone()
    pos_weekly = row["total"] or 0.0

    # Daily breakdown for chart (last 7 days)
    chart_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.isoformat()
        label = day.strftime("%a")

        cur = await db.execute(
            "SELECT COALESCE(SUM(amount),0) as t FROM solar_payments WHERE date(paid_at) = ?",
            (day_str,),
        )
        r = await cur.fetchone()
        s_val = r["t"]

        cur = await db.execute(
            "SELECT COALESCE(SUM(revenue),0) as t FROM fleet_hires WHERE date(checked_out_at) = ?",
            (day_str,),
        )
        r = await cur.fetchone()
        e_val = r["t"]

        cur = await db.execute(
            "SELECT COALESCE(SUM(commission),0) as t FROM pos_transactions WHERE date(transacted_at) = ?",
            (day_str,),
        )
        r = await cur.fetchone()
        p_val = r["t"]

        chart_data.append({"day": label, "solar": s_val, "ekeke": e_val, "pos": p_val})

    # Overdue count
    cursor = await db.execute(
        "SELECT COUNT(*) as cnt FROM solar_customers WHERE status = 'overdue'"
    )
    row = await cursor.fetchone()
    overdue_count = row["cnt"]

    # Fleet status
    cursor = await db.execute("SELECT * FROM fleet")
    fleet_rows = await cursor.fetchall()
    fleet = [row_to_dict(r) for r in fleet_rows]

    return {
        "weekly_totals": {
            "solar": solar_weekly,
            "ekeke": ekeke_weekly,
            "pos": pos_weekly,
            "total": solar_weekly + ekeke_weekly + pos_weekly,
        },
        "chart_data": chart_data,
        "overdue_count": overdue_count,
        "fleet": fleet,
    }


# ─────────────────────────────────────────────
# PAYGO SOLAR
# ─────────────────────────────────────────────

@app.get("/api/solar/customers")
async def list_solar_customers(db: aiosqlite.Connection = Depends(get_db)):
    # Auto-update overdue status
    now_str = datetime.now().isoformat()
    await db.execute(
        """UPDATE solar_customers SET status = 'overdue'
           WHERE status = 'active' AND next_due_at IS NOT NULL AND next_due_at < ?""",
        (now_str,),
    )
    await db.commit()

    cursor = await db.execute(
        "SELECT * FROM solar_customers ORDER BY enrolled_at DESC"
    )
    rows = await cursor.fetchall()
    customers = [row_to_dict(r) for r in rows]

    # Totals
    cursor = await db.execute(
        "SELECT COALESCE(SUM(deposit),0) as deposits FROM solar_customers"
    )
    r = await cursor.fetchone()
    deposits_held = r["deposits"]

    cursor = await db.execute(
        "SELECT COALESCE(SUM(weekly_payment),0) as target FROM solar_customers WHERE status != 'locked'"
    )
    r = await cursor.fetchone()
    weekly_target = r["target"]

    cursor = await db.execute(
        "SELECT COUNT(*) as cnt FROM solar_customers WHERE status = 'overdue'"
    )
    r = await cursor.fetchone()
    overdue_count = r["cnt"]

    return {
        "customers": customers,
        "deposits_held": deposits_held,
        "weekly_target": weekly_target,
        "overdue_count": overdue_count,
    }


@app.post("/api/solar/customers")
async def create_solar_customer(
    payload: SolarCustomerCreate, db: aiosqlite.Connection = Depends(get_db)
):
    if payload.package not in PACKAGES:
        raise HTTPException(400, f"Invalid package. Choose from {list(PACKAGES.keys())}")

    pkg = PACKAGES[payload.package]
    now = datetime.now().isoformat()
    due = next_due(now)

    cursor = await db.execute(
        """INSERT INTO solar_customers
           (name, phone, address, package, deposit, weekly_payment, status, enrolled_at, next_due_at)
           VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)""",
        (
            payload.name,
            payload.phone,
            payload.address,
            payload.package,
            pkg["deposit"],
            pkg["weekly"],
            now,
            due,
        ),
    )
    await db.commit()
    new_id = cursor.lastrowid

    cursor = await db.execute(
        "SELECT * FROM solar_customers WHERE id = ?", (new_id,)
    )
    row = await cursor.fetchone()
    return row_to_dict(row)


@app.post("/api/solar/pay")
async def record_payment(
    payload: PaymentCreate, db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute(
        "SELECT * FROM solar_customers WHERE id = ?", (payload.customer_id,)
    )
    customer = await cursor.fetchone()
    if not customer:
        raise HTTPException(404, "Customer not found")

    customer = row_to_dict(customer)
    amount = customer["weekly_payment"]
    now = datetime.now().isoformat()
    due = next_due(now)

    await db.execute(
        "INSERT INTO solar_payments (customer_id, amount, paid_at) VALUES (?, ?, ?)",
        (payload.customer_id, amount, now),
    )
    await db.execute(
        """UPDATE solar_customers
           SET status = 'active', last_payment_at = ?, next_due_at = ?,
               total_paid = total_paid + ?
           WHERE id = ?""",
        (now, due, amount, payload.customer_id),
    )
    await db.commit()
    return {"success": True, "amount": amount, "next_due": due}


@app.post("/api/solar/lock/{customer_id}")
async def lock_customer(
    customer_id: int, db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute(
        "SELECT id FROM solar_customers WHERE id = ?", (customer_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Customer not found")

    await db.execute(
        "UPDATE solar_customers SET status = 'locked' WHERE id = ?", (customer_id,)
    )
    await db.commit()
    return {"success": True, "status": "locked"}


@app.post("/api/solar/unlock/{customer_id}")
async def unlock_customer(
    customer_id: int, db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute(
        "SELECT id FROM solar_customers WHERE id = ?", (customer_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Customer not found")

    now = datetime.now().isoformat()
    due = next_due(now)
    await db.execute(
        "UPDATE solar_customers SET status = 'active', next_due_at = ? WHERE id = ?",
        (due, customer_id),
    )
    await db.commit()
    return {"success": True, "status": "active"}


# ─────────────────────────────────────────────
# E-KEKE FLEET
# ─────────────────────────────────────────────

@app.get("/api/fleet")
async def get_fleet(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT * FROM fleet ORDER BY keke_id")
    rows = await cursor.fetchall()
    fleet = [row_to_dict(r) for r in rows]

    # Today's revenue
    today = date.today().isoformat()
    cursor = await db.execute(
        "SELECT COALESCE(SUM(revenue),0) as total FROM fleet_hires WHERE date(checked_out_at) = ?",
        (today,),
    )
    r = await cursor.fetchone()
    today_revenue = r["total"]

    # Recent hires (last 10)
    cursor = await db.execute(
        "SELECT * FROM fleet_hires ORDER BY checked_out_at DESC LIMIT 10"
    )
    rows = await cursor.fetchall()
    recent_hires = [row_to_dict(r) for r in rows]

    return {
        "fleet": fleet,
        "today_revenue": today_revenue,
        "recent_hires": recent_hires,
    }


@app.post("/api/fleet/assign")
async def assign_operator(
    payload: OperatorAssign, db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute(
        "SELECT * FROM fleet WHERE keke_id = ?", (payload.keke_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Keke not found")

    now = datetime.now().isoformat()
    await db.execute(
        """UPDATE fleet SET operator_name = ?, operator_phone = ?,
           checked_in_at = ?, status = 'on_hire' WHERE keke_id = ?""",
        (payload.operator_name, payload.operator_phone, now, payload.keke_id),
    )
    await db.commit()
    return {"success": True, "message": f"Operator assigned to {payload.keke_id}"}


@app.post("/api/fleet/checkout")
async def checkout_keke(
    payload: FleetCheckout, db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute(
        "SELECT * FROM fleet WHERE keke_id = ?", (payload.keke_id,)
    )
    keke = await cursor.fetchone()
    if not keke:
        raise HTTPException(404, "Keke not found")

    keke = row_to_dict(keke)
    if not keke.get("operator_name"):
        raise HTTPException(400, "No operator assigned to this keke")

    now = datetime.now().isoformat()
    await db.execute(
        """INSERT INTO fleet_hires (keke_id, operator_name, operator_phone, revenue, checked_out_at)
           VALUES (?, ?, ?, ?, ?)""",
        (keke["keke_id"], keke["operator_name"], keke["operator_phone"], DAILY_HIRE, now),
    )
    # Reduce battery a bit after hire
    new_battery = max(keke["battery_level"] - 15, 5)
    await db.execute(
        """UPDATE fleet SET operator_name = NULL, operator_phone = NULL,
           checked_in_at = NULL, status = 'available', battery_level = ?
           WHERE keke_id = ?""",
        (new_battery, payload.keke_id),
    )
    await db.commit()
    return {"success": True, "revenue": DAILY_HIRE, "keke_id": payload.keke_id}


@app.put("/api/fleet/battery")
async def update_battery(
    payload: BatteryUpdate, db: aiosqlite.Connection = Depends(get_db)
):
    if not (0 <= payload.battery_level <= 100):
        raise HTTPException(400, "Battery level must be 0-100")

    cursor = await db.execute(
        "SELECT id FROM fleet WHERE keke_id = ?", (payload.keke_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Keke not found")

    await db.execute(
        "UPDATE fleet SET battery_level = ? WHERE keke_id = ?",
        (payload.battery_level, payload.keke_id),
    )
    await db.commit()
    return {"success": True}


# ─────────────────────────────────────────────
# SISI PAY POS
# ─────────────────────────────────────────────

@app.get("/api/pos/agents")
async def list_pos_agents(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT * FROM pos_agents ORDER BY registered_at DESC"
    )
    rows = await cursor.fetchall()
    agents = [row_to_dict(r) for r in rows]

    # Portfolio total commission
    cursor = await db.execute(
        "SELECT COALESCE(SUM(commission),0) as total FROM pos_transactions"
    )
    r = await cursor.fetchone()
    total_commission = r["total"]

    # Transactions per agent
    for agent in agents:
        cursor = await db.execute(
            "SELECT * FROM pos_transactions WHERE agent_id = ? ORDER BY transacted_at DESC LIMIT 5",
            (agent["id"],),
        )
        tx_rows = await cursor.fetchall()
        agent["recent_transactions"] = [row_to_dict(t) for t in tx_rows]

    return {
        "agents": agents,
        "total_commission": total_commission,
        "commission_rate": COMMISSION_RATE,
    }


@app.post("/api/pos/agents")
async def register_pos_agent(
    payload: PosAgentCreate, db: aiosqlite.Connection = Depends(get_db)
):
    terminal_id = await get_next_terminal_id(db)

    cursor = await db.execute(
        """INSERT INTO pos_agents (terminal_id, agent_name, agent_phone, bank_partner)
           VALUES (?, ?, ?, ?)""",
        (terminal_id, payload.agent_name, payload.agent_phone, payload.bank_partner),
    )
    await db.commit()
    new_id = cursor.lastrowid

    cursor = await db.execute(
        "SELECT * FROM pos_agents WHERE id = ?", (new_id,)
    )
    row = await cursor.fetchone()
    return row_to_dict(row)


@app.post("/api/pos/transactions")
async def record_pos_transaction(
    payload: PosTransactionCreate, db: aiosqlite.Connection = Depends(get_db)
):
    if payload.amount <= 0:
        raise HTTPException(400, "Amount must be positive")

    cursor = await db.execute(
        "SELECT * FROM pos_agents WHERE id = ?", (payload.agent_id,)
    )
    agent = await cursor.fetchone()
    if not agent:
        raise HTTPException(404, "Agent not found")

    agent = row_to_dict(agent)
    commission = round(payload.amount * COMMISSION_RATE, 2)
    now = datetime.now().isoformat()

    await db.execute(
        """INSERT INTO pos_transactions (agent_id, terminal_id, amount, commission, transacted_at)
           VALUES (?, ?, ?, ?, ?)""",
        (payload.agent_id, agent["terminal_id"], payload.amount, commission, now),
    )
    await db.execute(
        "UPDATE pos_agents SET total_commission = total_commission + ? WHERE id = ?",
        (commission, payload.agent_id),
    )
    await db.commit()
    return {"success": True, "commission": commission, "amount": payload.amount}


@app.get("/api/pos/transactions/{agent_id}")
async def get_agent_transactions(
    agent_id: int, db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute(
        "SELECT * FROM pos_transactions WHERE agent_id = ? ORDER BY transacted_at DESC",
        (agent_id,),
    )
    rows = await cursor.fetchall()
    return [row_to_dict(r) for r in rows]


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "JosEnergy Hub API"}
