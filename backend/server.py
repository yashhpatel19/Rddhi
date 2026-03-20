from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import csv
import io
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import random
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from cryptography.fernet import Fernet

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Encryption
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', '')
if not ENCRYPTION_KEY:
    ENCRYPTION_KEY = Fernet.generate_key().decode()
fernet = Fernet(ENCRYPTION_KEY.encode())

JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret')
JWT_ALGORITHM = 'HS256'

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- Helpers ---
def encrypt_value(value):
    return fernet.encrypt(str(value).encode()).decode()

def decrypt_value(encrypted_value):
    try:
        return float(fernet.decrypt(encrypted_value.encode()).decode())
    except Exception:
        return 0.0

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request):
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')

def calculate_trade(cbm, official_bill_rate, supplier_total_rate, customer_sale_rate, risk_premium):
    cash_to_collect = (customer_sale_rate - official_bill_rate) * cbm
    supplier_cash_due = (supplier_total_rate - official_bill_rate) * cbm
    my_commission = (customer_sale_rate - supplier_total_rate) * cbm
    risk_premium_amount = my_commission * 0.10 if risk_premium else 0
    final_commission = my_commission + risk_premium_amount
    return {
        'cash_to_collect': round(cash_to_collect, 2),
        'supplier_cash_due': round(supplier_cash_due, 2),
        'my_commission': round(my_commission, 2),
        'risk_premium_amount': round(risk_premium_amount, 2),
        'final_commission': round(final_commission, 2),
    }

def format_trade(doc):
    return {
        'id': doc['id'],
        'user_id': doc['user_id'],
        'container_name': doc['container_name'],
        'cbm': doc['cbm'],
        'supplier_name': doc['supplier_name'],
        'customer_name': doc['customer_name'],
        'official_bill_rate': doc['official_bill_rate'],
        'supplier_total_rate': doc.get('supplier_total_rate', 0),
        'customer_sale_rate': doc.get('customer_sale_rate', 0),
        'risk_premium': doc.get('risk_premium', False),
        'cash_to_collect': decrypt_value(doc.get('cash_to_collect_enc', '')),
        'supplier_cash_due': decrypt_value(doc.get('supplier_cash_due_enc', '')),
        'my_commission': decrypt_value(doc.get('my_commission_enc', '')),
        'risk_premium_amount': decrypt_value(doc.get('risk_premium_amount_enc', '')),
        'final_commission': decrypt_value(doc.get('final_commission_enc', '')),
        'supplier_payment_due': doc.get('supplier_payment_due'),
        'customer_collection_date': doc.get('customer_collection_date'),
        'supplier_paid': doc.get('supplier_paid', False),
        'customer_collected': doc.get('customer_collected', False),
        'claims': doc.get('claims', 0),
        'status': doc.get('status', 'active'),
        'close_notes': doc.get('close_notes', ''),
        'closed_at': doc.get('closed_at'),
        'created_at': doc.get('created_at'),
        'updated_at': doc.get('updated_at'),
    }

def get_fy_range(fy_year: int):
    """Financial year: April of fy_year to March of fy_year+1"""
    start = datetime(fy_year, 4, 1, tzinfo=timezone.utc)
    end = datetime(fy_year + 1, 3, 31, 23, 59, 59, tzinfo=timezone.utc)
    return start, end

def get_current_fy():
    now = datetime.now(timezone.utc)
    return now.year if now.month >= 4 else now.year - 1

async def get_trades_for_fy(user_id: str, fy: int = None):
    if fy:
        start, end = get_fy_range(fy)
        query = {'user_id': user_id, 'created_at': {'$gte': start.isoformat(), '$lte': end.isoformat()}}
    else:
        query = {'user_id': user_id}
    return await db.trades.find(query, {'_id': 0}).to_list(5000)

# --- Models ---
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TradeCreate(BaseModel):
    container_name: str
    cbm: float
    supplier_name: str
    customer_name: str
    official_bill_rate: float
    supplier_total_rate: float
    customer_sale_rate: float
    risk_premium: bool = False
    supplier_payment_due: Optional[str] = None
    customer_collection_date: Optional[str] = None

class TradeUpdate(BaseModel):
    container_name: Optional[str] = None
    cbm: Optional[float] = None
    supplier_name: Optional[str] = None
    customer_name: Optional[str] = None
    official_bill_rate: Optional[float] = None
    supplier_total_rate: Optional[float] = None
    customer_sale_rate: Optional[float] = None
    risk_premium: Optional[bool] = None
    supplier_payment_due: Optional[str] = None
    customer_collection_date: Optional[str] = None
    supplier_paid: Optional[bool] = None
    customer_collected: Optional[bool] = None
    claims: Optional[int] = None
    status: Optional[str] = None

class CloseTradeRequest(BaseModel):
    claims: int = 0
    close_notes: str = ""

# --- Auth ---
@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    existing = await db.users.find_one({'email': req.email})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    user_id = str(uuid.uuid4())
    user = {
        'id': user_id,
        'name': req.name,
        'email': req.email,
        'password': hash_password(req.password),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_token(user_id, req.email)
    return {'token': token, 'user': {'id': user_id, 'name': req.name, 'email': req.email}}

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({'email': req.email}, {'_id': 0})
    if not user or not verify_password(req.password, user['password']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token = create_token(user['id'], user['email'])
    return {'token': token, 'user': {'id': user['id'], 'name': user['name'], 'email': user['email']}}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {'id': user['id'], 'name': user['name'], 'email': user['email']}

# --- Trades ---
@api_router.post("/trades", status_code=201)
async def create_trade(trade: TradeCreate, user=Depends(get_current_user)):
    calcs = calculate_trade(trade.cbm, trade.official_bill_rate, trade.supplier_total_rate, trade.customer_sale_rate, trade.risk_premium)
    trade_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        'id': trade_id,
        'user_id': user['id'],
        'container_name': trade.container_name,
        'cbm': trade.cbm,
        'supplier_name': trade.supplier_name,
        'customer_name': trade.customer_name,
        'official_bill_rate': trade.official_bill_rate,
        'supplier_total_rate': trade.supplier_total_rate,
        'customer_sale_rate': trade.customer_sale_rate,
        'risk_premium': trade.risk_premium,
        'cash_to_collect_enc': encrypt_value(calcs['cash_to_collect']),
        'supplier_cash_due_enc': encrypt_value(calcs['supplier_cash_due']),
        'my_commission_enc': encrypt_value(calcs['my_commission']),
        'risk_premium_amount_enc': encrypt_value(calcs['risk_premium_amount']),
        'final_commission_enc': encrypt_value(calcs['final_commission']),
        'supplier_payment_due': trade.supplier_payment_due,
        'customer_collection_date': trade.customer_collection_date,
        'supplier_paid': False,
        'customer_collected': False,
        'claims': 0,
        'status': 'active',
        'created_at': now,
        'updated_at': now,
    }
    await db.trades.insert_one(doc)
    return format_trade(doc)

@api_router.get("/trades")
async def get_trades(user=Depends(get_current_user)):
    trades = await db.trades.find({'user_id': user['id']}, {'_id': 0}).to_list(1000)
    return [format_trade(t) for t in trades]

@api_router.get("/trades/{trade_id}")
async def get_trade(trade_id: str, user=Depends(get_current_user)):
    trade = await db.trades.find_one({'id': trade_id, 'user_id': user['id']}, {'_id': 0})
    if not trade:
        raise HTTPException(status_code=404, detail='Trade not found')
    return format_trade(trade)

@api_router.put("/trades/{trade_id}")
async def update_trade(trade_id: str, update: TradeUpdate, user=Depends(get_current_user)):
    trade = await db.trades.find_one({'id': trade_id, 'user_id': user['id']}, {'_id': 0})
    if not trade:
        raise HTTPException(status_code=404, detail='Trade not found')
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    needs_recalc = any(k in update_data for k in ['cbm', 'official_bill_rate', 'supplier_total_rate', 'customer_sale_rate', 'risk_premium'])
    if needs_recalc:
        cbm = update_data.get('cbm', trade['cbm'])
        bill_rate = update_data.get('official_bill_rate', trade['official_bill_rate'])
        sup_rate = update_data.get('supplier_total_rate', trade['supplier_total_rate'])
        cust_rate = update_data.get('customer_sale_rate', trade['customer_sale_rate'])
        risk = update_data.get('risk_premium', trade['risk_premium'])
        calcs = calculate_trade(cbm, bill_rate, sup_rate, cust_rate, risk)
        update_data['cash_to_collect_enc'] = encrypt_value(calcs['cash_to_collect'])
        update_data['supplier_cash_due_enc'] = encrypt_value(calcs['supplier_cash_due'])
        update_data['my_commission_enc'] = encrypt_value(calcs['my_commission'])
        update_data['risk_premium_amount_enc'] = encrypt_value(calcs['risk_premium_amount'])
        update_data['final_commission_enc'] = encrypt_value(calcs['final_commission'])
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.trades.update_one({'id': trade_id}, {'$set': update_data})
    updated = await db.trades.find_one({'id': trade_id}, {'_id': 0})
    return format_trade(updated)

@api_router.delete("/trades/{trade_id}")
async def delete_trade(trade_id: str, user=Depends(get_current_user)):
    result = await db.trades.delete_one({'id': trade_id, 'user_id': user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Trade not found')
    return {'message': 'Trade deleted'}

# --- Dashboard ---
@api_router.get("/dashboard/summary")
async def dashboard_summary(user=Depends(get_current_user)):
    trades = await db.trades.find({'user_id': user['id'], 'status': 'active'}, {'_id': 0}).to_list(1000)
    total_trades = len(trades)
    total_commission = sum(decrypt_value(t.get('final_commission_enc', '')) for t in trades)
    total_cash_to_collect = sum(decrypt_value(t.get('cash_to_collect_enc', '')) for t in trades if not t.get('customer_collected'))
    total_supplier_due = sum(decrypt_value(t.get('supplier_cash_due_enc', '')) for t in trades if not t.get('supplier_paid'))
    pending_collections = len([t for t in trades if not t.get('customer_collected')])
    pending_payments = len([t for t in trades if not t.get('supplier_paid')])
    return {
        'total_trades': total_trades,
        'total_commission': round(total_commission, 2),
        'total_cash_to_collect': round(total_cash_to_collect, 2),
        'total_supplier_due': round(total_supplier_due, 2),
        'pending_collections': pending_collections,
        'pending_payments': pending_payments,
    }

@api_router.get("/dashboard/heatmap")
async def dashboard_heatmap(user=Depends(get_current_user)):
    trades = await db.trades.find(
        {'user_id': user['id'], 'status': 'active', 'customer_collected': False},
        {'_id': 0}
    ).to_list(1000)
    now = datetime.now(timezone.utc)
    heatmap = []
    for t in trades:
        if not t.get('customer_collection_date'):
            continue
        try:
            due_str = t['customer_collection_date']
            if due_str.endswith('Z'):
                due_str = due_str[:-1] + '+00:00'
            due = datetime.fromisoformat(due_str)
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        days_left = (due - now).days
        if days_left > 30:
            status = 'safe'
        elif days_left > 7:
            status = 'warning'
        else:
            status = 'danger'
        heatmap.append({
            'trade_id': t['id'],
            'container_name': t['container_name'],
            'customer_name': t['customer_name'],
            'amount': round(decrypt_value(t.get('cash_to_collect_enc', '')), 2),
            'due_date': t['customer_collection_date'],
            'days_left': days_left,
            'status': status,
        })
    heatmap.sort(key=lambda x: x['days_left'])
    return heatmap

# --- Analytics ---
@api_router.get("/analytics/suppliers")
async def supplier_rankings(fy: Optional[int] = None, user=Depends(get_current_user)):
    trades = await get_trades_for_fy(user['id'], fy)
    suppliers = {}
    for t in trades:
        name = t['supplier_name']
        if name not in suppliers:
            suppliers[name] = {'name': name, 'total_trades': 0, 'claims': 0, 'total_volume': 0, 'total_commission': 0}
        suppliers[name]['total_trades'] += 1
        suppliers[name]['claims'] += t.get('claims', 0)
        suppliers[name]['total_volume'] += t['cbm']
        suppliers[name]['total_commission'] += decrypt_value(t.get('final_commission_enc', ''))
    result = []
    for s in suppliers.values():
        claim_rate = (s['claims'] / s['total_trades'] * 100) if s['total_trades'] > 0 else 0
        quality_score = max(0, 100 - claim_rate * 10)
        result.append({
            'name': s['name'],
            'total_trades': s['total_trades'],
            'claims': s['claims'],
            'claim_rate': round(claim_rate, 1),
            'quality_score': round(quality_score, 1),
            'total_volume': round(s['total_volume'], 2),
            'total_commission': round(s['total_commission'], 2),
        })
    result.sort(key=lambda x: x['quality_score'], reverse=True)
    return result

@api_router.get("/analytics/customers")
async def customer_trust_scores(fy: Optional[int] = None, user=Depends(get_current_user)):
    trades = await get_trades_for_fy(user['id'], fy)
    customers = {}
    now = datetime.now(timezone.utc)
    for t in trades:
        name = t['customer_name']
        if name not in customers:
            customers[name] = {'name': name, 'total_trades': 0, 'collected': 0, 'delayed': 0, 'total_amount': 0, 'collected_amount': 0}
        customers[name]['total_trades'] += 1
        amt = decrypt_value(t.get('cash_to_collect_enc', ''))
        customers[name]['total_amount'] += amt
        if t.get('customer_collected'):
            customers[name]['collected'] += 1
            customers[name]['collected_amount'] += amt
        elif t.get('customer_collection_date'):
            try:
                due_str = t['customer_collection_date']
                if due_str.endswith('Z'):
                    due_str = due_str[:-1] + '+00:00'
                due = datetime.fromisoformat(due_str)
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                if now > due:
                    customers[name]['delayed'] += 1
            except Exception:
                pass
    result = []
    for c in customers.values():
        if c['total_trades'] > 0:
            collection_rate = (c['collected'] / c['total_trades']) * 100
            delay_penalty = (c['delayed'] / c['total_trades']) * 40
            trust_score = min(100, max(0, collection_rate - delay_penalty))
        else:
            trust_score = 50
        result.append({
            'name': c['name'],
            'total_trades': c['total_trades'],
            'collected': c['collected'],
            'delayed': c['delayed'],
            'trust_score': round(trust_score, 1),
            'total_amount': round(c['total_amount'], 2),
            'collected_amount': round(c['collected_amount'], 2),
        })
    result.sort(key=lambda x: x['trust_score'], reverse=True)
    return result

@api_router.get("/analytics/cashflow")
async def cash_flow_forecast(user=Depends(get_current_user)):
    trades = await db.trades.find({'user_id': user['id'], 'status': 'active'}, {'_id': 0}).to_list(1000)
    now = datetime.now(timezone.utc)
    thirty_days = now + timedelta(days=30)
    supplier_outflow = []
    customer_inflow = []
    for t in trades:
        if not t.get('supplier_paid') and t.get('supplier_payment_due'):
            try:
                due_str = t['supplier_payment_due']
                if due_str.endswith('Z'):
                    due_str = due_str[:-1] + '+00:00'
                due = datetime.fromisoformat(due_str)
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                if due <= thirty_days:
                    supplier_outflow.append({
                        'trade_id': t['id'],
                        'name': t['supplier_name'],
                        'container': t['container_name'],
                        'amount': round(decrypt_value(t.get('supplier_cash_due_enc', '')), 2),
                        'due_date': t['supplier_payment_due'],
                    })
            except Exception:
                pass
        if not t.get('customer_collected') and t.get('customer_collection_date'):
            try:
                due_str = t['customer_collection_date']
                if due_str.endswith('Z'):
                    due_str = due_str[:-1] + '+00:00'
                due = datetime.fromisoformat(due_str)
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                if due <= thirty_days:
                    customer_inflow.append({
                        'trade_id': t['id'],
                        'name': t['customer_name'],
                        'container': t['container_name'],
                        'amount': round(decrypt_value(t.get('cash_to_collect_enc', '')), 2),
                        'due_date': t['customer_collection_date'],
                    })
            except Exception:
                pass
    total_outflow = sum(x['amount'] for x in supplier_outflow)
    total_inflow = sum(x['amount'] for x in customer_inflow)
    return {
        'total_outflow': round(total_outflow, 2),
        'total_inflow': round(total_inflow, 2),
        'net_position': round(total_inflow - total_outflow, 2),
        'supplier_payments': sorted(supplier_outflow, key=lambda x: x['due_date']),
        'customer_collections': sorted(customer_inflow, key=lambda x: x['due_date']),
    }

# --- Notifications ---
@api_router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    notifications = await db.notifications.find(
        {'user_id': user['id']}, {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one(
        {'id': notification_id, 'user_id': user['id']},
        {'$set': {'read': True}}
    )
    return {'message': 'Notification marked as read'}

@api_router.put("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many(
        {'user_id': user['id'], 'read': False},
        {'$set': {'read': True}}
    )
    return {'message': 'All notifications marked as read'}

@api_router.post("/notifications/generate")
async def generate_notifications(user=Depends(get_current_user)):
    trades = await db.trades.find(
        {'user_id': user['id'], 'status': 'active', 'customer_collected': False},
        {'_id': 0}
    ).to_list(1000)
    now = datetime.now(timezone.utc)
    created_count = 0
    for t in trades:
        if not t.get('customer_collection_date'):
            continue
        try:
            due_str = t['customer_collection_date']
            if due_str.endswith('Z'):
                due_str = due_str[:-1] + '+00:00'
            due = datetime.fromisoformat(due_str)
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        days_left = (due - now).days
        amt = decrypt_value(t.get('cash_to_collect_enc', ''))
        triggers = []
        if 20 < days_left <= 30:
            triggers.append(('30_day', 'Monthly Check-in', f"30-day reminder: {t['container_name']} from {t['customer_name']} due in {days_left} days (${amt:,.2f})"))
        if 7 < days_left <= 20:
            triggers.append(('20_day', 'Cash Availability Check', f"20-day alert: Confirm cash for {t['container_name']} from {t['customer_name']} - ${amt:,.2f} due in {days_left} days"))
        if days_left <= 7:
            overdue_msg = f"overdue by {abs(days_left)} days" if days_left < 0 else f"due in {days_left} days"
            triggers.append(('7_day', 'Final Collection Setup', f"URGENT: {t['container_name']} from {t['customer_name']} {overdue_msg} - ${amt:,.2f}"))
        for trigger_type, title, message in triggers:
            existing = await db.notifications.find_one({
                'user_id': user['id'],
                'trade_id': t['id'],
                'trigger_type': trigger_type,
            })
            if not existing:
                notification = {
                    'id': str(uuid.uuid4()),
                    'user_id': user['id'],
                    'trade_id': t['id'],
                    'trigger_type': trigger_type,
                    'title': title,
                    'message': message,
                    'read': False,
                    'created_at': now.isoformat(),
                }
                await db.notifications.insert_one(notification)
                created_count += 1
    return {'generated': created_count}

# --- Seed Demo ---
@api_router.post("/seed-demo")
async def seed_demo_data(user=Depends(get_current_user)):
    existing = await db.trades.count_documents({'user_id': user['id']})
    if existing > 0:
        raise HTTPException(status_code=400, detail='You already have trade data. Delete existing trades first.')
    now = datetime.now(timezone.utc)
    demo_trades = [
        {'container_name': 'CNT-2025-001', 'cbm': 45.0, 'supplier_name': 'Guangzhou Timber Co.', 'customer_name': 'Dubai Wood Trading LLC', 'official_bill_rate': 550.0, 'supplier_total_rate': 700.0, 'customer_sale_rate': 720.0, 'risk_premium': False, 'supplier_payment_due': (now + timedelta(days=15)).isoformat(), 'customer_collection_date': (now + timedelta(days=25)).isoformat(), 'supplier_paid': False, 'customer_collected': False, 'claims': 0},
        {'container_name': 'CNT-2025-002', 'cbm': 32.0, 'supplier_name': 'Shanghai Steel Export', 'customer_name': 'Riyadh Construction Materials', 'official_bill_rate': 800.0, 'supplier_total_rate': 950.0, 'customer_sale_rate': 980.0, 'risk_premium': True, 'supplier_payment_due': (now + timedelta(days=5)).isoformat(), 'customer_collection_date': (now + timedelta(days=10)).isoformat(), 'supplier_paid': False, 'customer_collected': False, 'claims': 0},
        {'container_name': 'CNT-2025-003', 'cbm': 60.0, 'supplier_name': 'Guangzhou Timber Co.', 'customer_name': 'Karachi Import House', 'official_bill_rate': 500.0, 'supplier_total_rate': 650.0, 'customer_sale_rate': 670.0, 'risk_premium': False, 'supplier_payment_due': (now - timedelta(days=5)).isoformat(), 'customer_collection_date': (now + timedelta(days=3)).isoformat(), 'supplier_paid': True, 'customer_collected': False, 'claims': 1},
        {'container_name': 'CNT-2025-004', 'cbm': 28.0, 'supplier_name': 'Ningbo Ceramics Ltd', 'customer_name': 'Dubai Wood Trading LLC', 'official_bill_rate': 450.0, 'supplier_total_rate': 580.0, 'customer_sale_rate': 600.0, 'risk_premium': False, 'supplier_payment_due': (now + timedelta(days=45)).isoformat(), 'customer_collection_date': (now + timedelta(days=60)).isoformat(), 'supplier_paid': False, 'customer_collected': False, 'claims': 0},
        {'container_name': 'CNT-2025-005', 'cbm': 55.0, 'supplier_name': 'Shanghai Steel Export', 'customer_name': 'Lagos Trading Corp', 'official_bill_rate': 600.0, 'supplier_total_rate': 750.0, 'customer_sale_rate': 790.0, 'risk_premium': True, 'supplier_payment_due': (now + timedelta(days=18)).isoformat(), 'customer_collection_date': (now + timedelta(days=28)).isoformat(), 'supplier_paid': False, 'customer_collected': False, 'claims': 2},
        {'container_name': 'CNT-2024-012', 'cbm': 40.0, 'supplier_name': 'Guangzhou Timber Co.', 'customer_name': 'Karachi Import House', 'official_bill_rate': 520.0, 'supplier_total_rate': 680.0, 'customer_sale_rate': 710.0, 'risk_premium': False, 'supplier_payment_due': (now - timedelta(days=30)).isoformat(), 'customer_collection_date': (now - timedelta(days=15)).isoformat(), 'supplier_paid': True, 'customer_collected': True, 'claims': 0},
    ]
    for td in demo_trades:
        calcs = calculate_trade(td['cbm'], td['official_bill_rate'], td['supplier_total_rate'], td['customer_sale_rate'], td['risk_premium'])
        trade_id = str(uuid.uuid4())
        doc = {
            'id': trade_id, 'user_id': user['id'],
            **{k: v for k, v in td.items()},
            'cash_to_collect_enc': encrypt_value(calcs['cash_to_collect']),
            'supplier_cash_due_enc': encrypt_value(calcs['supplier_cash_due']),
            'my_commission_enc': encrypt_value(calcs['my_commission']),
            'risk_premium_amount_enc': encrypt_value(calcs['risk_premium_amount']),
            'final_commission_enc': encrypt_value(calcs['final_commission']),
            'status': 'completed' if td['customer_collected'] else 'active',
            'created_at': (now - timedelta(days=random.randint(1, 60))).isoformat(),
            'updated_at': now.isoformat(),
        }
        await db.trades.insert_one(doc)
    return {'message': f'Created {len(demo_trades)} demo trades', 'count': len(demo_trades)}

# --- Health ---
@api_router.get("/")
async def root():
    return {"message": "The Invisible Agent API"}

# --- Close Trade ---
@api_router.put("/trades/{trade_id}/close")
async def close_trade(trade_id: str, body: CloseTradeRequest, user=Depends(get_current_user)):
    trade = await db.trades.find_one({'id': trade_id, 'user_id': user['id']}, {'_id': 0})
    if not trade:
        raise HTTPException(status_code=404, detail='Trade not found')
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        'status': 'completed',
        'customer_collected': True,
        'supplier_paid': True,
        'claims': body.claims,
        'close_notes': body.close_notes,
        'closed_at': now,
        'updated_at': now,
    }
    await db.trades.update_one({'id': trade_id}, {'$set': update_data})
    updated = await db.trades.find_one({'id': trade_id}, {'_id': 0})
    return format_trade(updated)

# --- Reports ---
@api_router.get("/reports/commission")
async def commission_report(fy: Optional[int] = None, user=Depends(get_current_user)):
    if not fy:
        fy = get_current_fy()
    start, end = get_fy_range(fy)
    trades = await db.trades.find({
        'user_id': user['id'],
        'created_at': {'$gte': start.isoformat(), '$lte': end.isoformat()}
    }, {'_id': 0}).to_list(5000)
    monthly = {}
    for t in trades:
        created = t.get('created_at', '')
        try:
            dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
            month_key = f"{dt.year}-{dt.month:02d}"
        except Exception:
            continue
        if month_key not in monthly:
            monthly[month_key] = {'month': month_key, 'trades': 0, 'commission': 0, 'cash_collected': 0, 'supplier_paid': 0, 'cbm': 0}
        monthly[month_key]['trades'] += 1
        monthly[month_key]['commission'] += decrypt_value(t.get('final_commission_enc', ''))
        monthly[month_key]['cbm'] += t['cbm']
        if t.get('customer_collected'):
            monthly[month_key]['cash_collected'] += decrypt_value(t.get('cash_to_collect_enc', ''))
        if t.get('supplier_paid'):
            monthly[month_key]['supplier_paid'] += decrypt_value(t.get('supplier_cash_due_enc', ''))
    by_supplier = {}
    for t in trades:
        name = t['supplier_name']
        if name not in by_supplier:
            by_supplier[name] = {'name': name, 'trades': 0, 'commission': 0}
        by_supplier[name]['trades'] += 1
        by_supplier[name]['commission'] += decrypt_value(t.get('final_commission_enc', ''))
    by_customer = {}
    for t in trades:
        name = t['customer_name']
        if name not in by_customer:
            by_customer[name] = {'name': name, 'trades': 0, 'commission': 0}
        by_customer[name]['trades'] += 1
        by_customer[name]['commission'] += decrypt_value(t.get('final_commission_enc', ''))
    total_commission = sum(m['commission'] for m in monthly.values())
    months = sorted(monthly.values(), key=lambda x: x['month'])
    for m in months:
        m['commission'] = round(m['commission'], 2)
        m['cash_collected'] = round(m['cash_collected'], 2)
        m['supplier_paid'] = round(m['supplier_paid'], 2)
        m['cbm'] = round(m['cbm'], 2)
    return {
        'fy': fy,
        'fy_label': f"FY {fy}-{fy + 1}",
        'total_commission': round(total_commission, 2),
        'total_trades': len(trades),
        'total_cbm': round(sum(t['cbm'] for t in trades), 2),
        'monthly': months,
        'by_supplier': sorted([{**s, 'commission': round(s['commission'], 2)} for s in by_supplier.values()], key=lambda x: x['commission'], reverse=True),
        'by_customer': sorted([{**c, 'commission': round(c['commission'], 2)} for c in by_customer.values()], key=lambda x: x['commission'], reverse=True),
    }

@api_router.get("/reports/commission/export")
async def export_commission_csv(fy: Optional[int] = None, user=Depends(get_current_user)):
    if not fy:
        fy = get_current_fy()
    start, end = get_fy_range(fy)
    trades = await db.trades.find({
        'user_id': user['id'],
        'created_at': {'$gte': start.isoformat(), '$lte': end.isoformat()}
    }, {'_id': 0}).to_list(5000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Container', 'Supplier', 'Customer', 'CBM', 'Bill Rate', 'Supplier Rate', 'Sale Rate',
                     'Cash to Collect', 'Supplier Due', 'Commission', 'Final Commission', 'Risk Premium',
                     'Supplier Paid', 'Customer Collected', 'Claims', 'Status', 'Created'])
    for t in trades:
        writer.writerow([
            t['container_name'], t['supplier_name'], t['customer_name'],
            t['cbm'], t['official_bill_rate'], t.get('supplier_total_rate', 0), t.get('customer_sale_rate', 0),
            round(decrypt_value(t.get('cash_to_collect_enc', '')), 2),
            round(decrypt_value(t.get('supplier_cash_due_enc', '')), 2),
            round(decrypt_value(t.get('my_commission_enc', '')), 2),
            round(decrypt_value(t.get('final_commission_enc', '')), 2),
            t.get('risk_premium', False),
            t.get('supplier_paid', False), t.get('customer_collected', False),
            t.get('claims', 0), t.get('status', ''), t.get('created_at', '')
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=commission_report_fy{fy}_{fy + 1}.csv"}
    )

# --- Best Customers ---
@api_router.get("/analytics/best-customers")
async def best_customers(fy: Optional[int] = None, user=Depends(get_current_user)):
    if not fy:
        fy = get_current_fy()
    trades = await get_trades_for_fy(user['id'], fy)
    now = datetime.now(timezone.utc)
    customers = {}
    for t in trades:
        name = t['customer_name']
        if name not in customers:
            customers[name] = {'name': name, 'total_trades': 0, 'total_commission': 0, 'total_volume': 0,
                               'collected': 0, 'delayed': 0, 'total_cash': 0}
        customers[name]['total_trades'] += 1
        customers[name]['total_commission'] += decrypt_value(t.get('final_commission_enc', ''))
        customers[name]['total_volume'] += t['cbm']
        customers[name]['total_cash'] += decrypt_value(t.get('cash_to_collect_enc', ''))
        if t.get('customer_collected'):
            customers[name]['collected'] += 1
        if t.get('customer_collection_date') and not t.get('customer_collected'):
            try:
                due = datetime.fromisoformat(t['customer_collection_date'].replace('Z', '+00:00'))
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                if now > due:
                    customers[name]['delayed'] += 1
            except Exception:
                pass
    result = []
    for c in customers.values():
        result.append({
            **c,
            'total_commission': round(c['total_commission'], 2),
            'total_cash': round(c['total_cash'], 2),
            'total_volume': round(c['total_volume'], 2),
            'avg_commission_per_trade': round(c['total_commission'] / c['total_trades'], 2) if c['total_trades'] > 0 else 0,
        })
    result.sort(key=lambda x: x['total_commission'], reverse=True)
    return {'fy': fy, 'fy_label': f"FY {fy}-{fy + 1}", 'customers': result}

# --- Claims Analysis ---
@api_router.get("/analytics/claims")
async def claims_analysis(fy: Optional[int] = None, user=Depends(get_current_user)):
    if not fy:
        fy = get_current_fy()
    current_trades = await get_trades_for_fy(user['id'], fy)
    prev_trades = await get_trades_for_fy(user['id'], fy - 1)

    def analyze_claims(trades_list):
        suppliers = {}
        customers = {}
        total_claims = 0
        total_trades = len(trades_list)
        for t in trades_list:
            claims = t.get('claims', 0)
            total_claims += claims
            sname = t['supplier_name']
            if sname not in suppliers:
                suppliers[sname] = {'name': sname, 'trades': 0, 'claims': 0}
            suppliers[sname]['trades'] += 1
            suppliers[sname]['claims'] += claims
            cname = t['customer_name']
            if cname not in customers:
                customers[cname] = {'name': cname, 'trades': 0, 'claims': 0}
            customers[cname]['trades'] += 1
            customers[cname]['claims'] += claims
        for s in suppliers.values():
            s['claim_rate'] = round((s['claims'] / s['trades'] * 100) if s['trades'] > 0 else 0, 1)
        for c in customers.values():
            c['claim_rate'] = round((c['claims'] / c['trades'] * 100) if c['trades'] > 0 else 0, 1)
        return {
            'total_trades': total_trades,
            'total_claims': total_claims,
            'overall_rate': round((total_claims / total_trades * 100) if total_trades > 0 else 0, 1),
            'by_supplier': sorted(suppliers.values(), key=lambda x: x['claims'], reverse=True),
            'by_customer': sorted(customers.values(), key=lambda x: x['claims'], reverse=True),
        }

    current = analyze_claims(current_trades)
    previous = analyze_claims(prev_trades)
    trend = 'improving' if current['overall_rate'] < previous['overall_rate'] else ('worsening' if current['overall_rate'] > previous['overall_rate'] else 'stable')
    return {
        'fy': fy,
        'fy_label': f"FY {fy}-{fy + 1}",
        'current': current,
        'previous': {'fy_label': f"FY {fy - 1}-{fy}", **previous},
        'trend': trend,
    }

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
