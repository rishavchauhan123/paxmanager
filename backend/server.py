from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone

from models import (
    User, UserCreate, UserLogin, Token, UserRole,
    Supplier, SupplierCreate,
    Booking, BookingCreate, BookingUpdate, BookingStatus,
    BookingModification, BookingModificationCreate,
    AuditLog, BookingReportFilters, OutstandingBalanceReport
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, RoleChecker
)
from database import Database
from reports import generate_booking_pdf, generate_booking_excel, generate_outstanding_balance_excel
from email_service import email_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db_client = client[os.environ['DB_NAME']]
database = Database(db_client)

# Create the main app
app = FastAPI(title="Booking Management System")

# Create API router
api_router = APIRouter(prefix="/api")

# Role checkers
allow_all_authenticated = RoleChecker([UserRole.AGENT1, UserRole.AGENT2, UserRole.ACCOUNT, UserRole.ADMIN])
allow_agent1_admin = RoleChecker([UserRole.AGENT1, UserRole.ADMIN])
allow_agent_manager = RoleChecker([UserRole.AGENT1, UserRole.AGENT2, UserRole.ADMIN])
allow_account_admin = RoleChecker([UserRole.ACCOUNT, UserRole.ADMIN])
allow_admin_only = RoleChecker([UserRole.ADMIN])

# =============== AUTH ROUTES ===============

@api_router.post("/auth/register", response_model=User)
async def register(user: UserCreate):
    """Register a new user (Admin only in production)"""
    existing_user = await database.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = get_password_hash(user.password)
    new_user = await database.create_user(user, password_hash)
    
    await database.create_audit_log(
        user_id=new_user.id,
        user_name=new_user.name,
        user_role=new_user.role,
        action="USER_CREATED",
        entity_type="user",
        entity_id=new_user.id
    )
    
    return new_user

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user"""
    user_data = await database.get_user_by_email(credentials.email)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_data["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_data.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is inactive")
    
    access_token = create_access_token(
        data={
            "sub": user_data["id"],
            "email": user_data["email"],
            "role": user_data["role"],
            "name": user_data["name"]
        }
    )
    
    user_data.pop("password_hash")
    user_data["created_at"] = datetime.fromisoformat(user_data["created_at"])
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=User(**user_data)
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    user = await database.get_user_by_id(current_user["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# =============== USER MANAGEMENT ROUTES ===============

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(allow_admin_only)):
    """Get all users (Admin only)"""
    return await database.get_all_users()

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: dict = Depends(allow_admin_only)):
    """Get user by ID (Admin only)"""
    user = await database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    update_data: dict,
    current_user: dict = Depends(allow_admin_only)
):
    """Update user (Admin only)"""
    user = await database.update_user(user_id, update_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action="USER_UPDATED",
        entity_type="user",
        entity_id=user_id,
        changes=update_data
    )
    
    return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(allow_admin_only)):
    """Deactivate user (Admin only)"""
    success = await database.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action="USER_DELETED",
        entity_type="user",
        entity_id=user_id
    )
    
    return {"message": "User deactivated successfully"}

# =============== SUPPLIER ROUTES ===============

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(
    supplier: SupplierCreate,
    current_user: dict = Depends(allow_admin_only)
):
    """Create supplier (Admin only)"""
    new_supplier = await database.create_supplier(supplier, current_user["sub"])
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action="SUPPLIER_CREATED",
        entity_type="supplier",
        entity_id=new_supplier.id
    )
    
    return new_supplier

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(current_user: dict = Depends(allow_all_authenticated)):
    """Get all suppliers"""
    return await database.get_suppliers()

@api_router.get("/suppliers/{supplier_id}", response_model=Supplier)
async def get_supplier(
    supplier_id: str,
    current_user: dict = Depends(allow_all_authenticated)
):
    """Get supplier by ID"""
    supplier = await database.get_supplier_by_id(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(
    supplier_id: str,
    update_data: dict,
    current_user: dict = Depends(allow_admin_only)
):
    """Update supplier (Admin only)"""
    supplier = await database.update_supplier(supplier_id, update_data)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action="SUPPLIER_UPDATED",
        entity_type="supplier",
        entity_id=supplier_id,
        changes=update_data
    )
    
    return supplier

# =============== BOOKING ROUTES ===============

@api_router.post("/bookings", response_model=Booking)
async def create_booking(
    booking: BookingCreate,
    current_user: dict = Depends(allow_agent1_admin)
):
    """Create booking (Agent1 and Admin only)"""
    # Check if PNR already exists
    existing = await database.get_booking_by_pnr(booking.pnr)
    if existing:
        raise HTTPException(status_code=400, detail="PNR already exists")
    
    # Verify supplier exists
    supplier = await database.get_supplier_by_id(booking.supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    new_booking = await database.create_booking(booking, current_user["sub"])
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action="BOOKING_CREATED",
        entity_type="booking",
        entity_id=new_booking.id
    )
    
    return new_booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(
    status: Optional[str] = None,
    current_user: dict = Depends(allow_all_authenticated)
):
    """Get all bookings with optional filters"""
    filters = {}
    if status:
        filters["status"] = status
    
    # Agent1 and Agent2 can only see their own bookings unless Admin/Account
    user_role = current_user["role"]
    if user_role in ["agent1", "agent2"]:
        filters["created_by"] = current_user["sub"]
    
    return await database.get_bookings(filters)

@api_router.get("/bookings/search/{search_term}")
async def search_bookings(
    search_term: str,
    current_user: dict = Depends(allow_all_authenticated)
):
    """Search bookings by PNR or contact number"""
    return await database.search_bookings(search_term)

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(
    booking_id: str,
    current_user: dict = Depends(allow_all_authenticated)
):
    """Get booking by ID"""
    booking = await database.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check permissions
    user_role = current_user["role"]
    if user_role in ["agent1", "agent2"] and booking.created_by != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
    
    return booking

@api_router.put("/bookings/{booking_id}/submit")
async def submit_booking(
    booking_id: str,
    current_user: dict = Depends(allow_agent1_admin)
):
    """Submit booking for verification (Agent1 only)"""
    booking = await database.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.created_by != current_user["sub"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if booking.status != BookingStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Booking already submitted")
    
    updated_booking = await database.update_booking(booking_id, {
        "status": BookingStatus.PENDING_VERIFICATION.value,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    })
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action="BOOKING_SUBMITTED",
        entity_type="booking",
        entity_id=booking_id
    )
    
    return updated_booking

@api_router.put("/bookings/{booking_id}/commercial")
async def update_booking_commercial(
    booking_id: str,
    update_data: BookingUpdate,
    current_user: dict = Depends(allow_agent_manager)
):
    """Update commercial fields (Agent1, Agent2, Admin before verification)"""
    booking = await database.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if booking is locked
    if booking.account_verified_by or booking.admin_verified_by:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Booking is verified and locked")
    
    # Agent2 cannot edit after Agent1 submits
    if current_user["role"] == "agent2" and booking.status != BookingStatus.DRAFT:
        raise HTTPException(status_code=403, detail="Cannot edit after submission")
    
    update_dict = update_data.model_dump(exclude_none=True)
    updated_booking = await database.update_booking(booking_id, update_dict)
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action="BOOKING_UPDATED_COMMERCIAL",
        entity_type="booking",
        entity_id=booking_id,
        changes=update_dict
    )
    
    return updated_booking

@api_router.put("/bookings/{booking_id}/verify-account")
async def verify_booking_account(
    booking_id: str,
    current_user: dict = Depends(allow_account_admin)
):
    """Verify booking by Account department"""
    booking = await database.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status != BookingStatus.PENDING_VERIFICATION:
        raise HTTPException(status_code=400, detail="Booking not ready for verification")
    
    updated_booking = await database.update_booking(booking_id, {
        "status": BookingStatus.ACCOUNT_VERIFIED.value,
        "account_verified_by": current_user["sub"],
        "account_verified_at": datetime.now(timezone.utc).isoformat()
    })
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action="BOOKING_VERIFIED_ACCOUNT",
        entity_type="booking",
        entity_id=booking_id
    )
    
    await email_service.send_verification_notification(
        to_email="notification@example.com",
        booking_pnr=booking.pnr,
        verified_by=current_user["name"]
    )
    
    return updated_booking

@api_router.put("/bookings/{booking_id}/verify-admin")
async def verify_booking_admin(
    booking_id: str,
    current_user: dict = Depends(allow_admin_only)
):
    """Verify booking by Admin"""
    booking = await database.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    updated_booking = await database.update_booking(booking_id, {
        "status": BookingStatus.ADMIN_VERIFIED.value,
        "admin_verified_by": current_user["sub"],
        "admin_verified_at": datetime.now(timezone.utc).isoformat()
    })
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action="BOOKING_VERIFIED_ADMIN",
        entity_type="booking",
        entity_id=booking_id
    )
    
    await email_service.send_verification_notification(
        to_email="notification@example.com",
        booking_pnr=booking.pnr,
        verified_by=current_user["name"]
    )
    
    return updated_booking

@api_router.put("/bookings/{booking_id}/billing")
async def update_booking_billing(
    booking_id: str,
    billing_data: dict,
    current_user: dict = Depends(allow_account_admin)
):
    """Update billing information (Account/Admin only)"""
    booking = await database.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    updated_booking = await database.update_booking(booking_id, billing_data)
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action="BOOKING_BILLING_UPDATED",
        entity_type="booking",
        entity_id=booking_id,
        changes=billing_data
    )
    
    return updated_booking

# =============== BOOKING MODIFICATIONS ===============

@api_router.post("/modifications", response_model=BookingModification)
async def create_modification(
    modification: BookingModificationCreate,
    current_user: dict = Depends(allow_all_authenticated)
):
    """Create booking modification (date change, flight change, cancellation)"""
    booking = await database.get_booking_by_id(modification.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    new_modification = await database.create_modification(modification, current_user["sub"])
    
    await database.create_audit_log(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        user_role=UserRole(current_user["role"]),
        action=f"BOOKING_{modification.modification_type.value.upper()}",
        entity_type="modification",
        entity_id=new_modification.id,
        changes={"booking_id": modification.booking_id}
    )
    
    return new_modification

@api_router.get("/modifications/booking/{booking_id}", response_model=List[BookingModification])
async def get_booking_modifications(
    booking_id: str,
    current_user: dict = Depends(allow_all_authenticated)
):
    """Get all modifications for a booking"""
    return await database.get_modifications_by_booking(booking_id)

# =============== AUDIT LOGS ===============

@api_router.get("/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(
    user_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    current_user: dict = Depends(allow_admin_only)
):
    """Get audit logs (Admin only, last 30 days)"""
    filters = {}
    if user_id:
        filters["user_id"] = user_id
    if entity_type:
        filters["entity_type"] = entity_type
    
    return await database.get_audit_logs(filters)

# =============== REPORTS ===============

@api_router.post("/reports/bookings/pdf")
async def generate_bookings_pdf_report(
    filters: BookingReportFilters,
    current_user: dict = Depends(allow_all_authenticated)
):
    """Generate PDF report for bookings"""
    bookings = await database.get_bookings(filters.model_dump(exclude_none=True))
    bookings_dict = [booking.model_dump() for booking in bookings]
    
    # Convert datetime objects to strings for PDF
    for booking in bookings_dict:
        booking["created_at"] = booking["created_at"].isoformat() if isinstance(booking["created_at"], datetime) else booking["created_at"]
    
    pdf_buffer = generate_booking_pdf(bookings_dict, filters.model_dump(exclude_none=True))
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=bookings_report.pdf"}
    )

@api_router.post("/reports/bookings/excel")
async def generate_bookings_excel_report(
    filters: BookingReportFilters,
    current_user: dict = Depends(allow_all_authenticated)
):
    """Generate Excel report for bookings"""
    bookings = await database.get_bookings(filters.model_dump(exclude_none=True))
    
    # Enrich with supplier and user names
    bookings_dict = []
    for booking in bookings:
        booking_dict = booking.model_dump()
        
        # Get supplier name
        supplier = await database.get_supplier_by_id(booking.supplier_id)
        booking_dict["supplier_name"] = supplier.name if supplier else "N/A"
        
        # Get creator name
        creator = await database.get_user_by_id(booking.created_by)
        booking_dict["created_by_name"] = creator.name if creator else "N/A"
        
        # Format dates
        booking_dict["created_at"] = booking.created_at.strftime("%Y-%m-%d %H:%M") if booking.created_at else ""
        
        bookings_dict.append(booking_dict)
    
    excel_buffer = generate_booking_excel(bookings_dict, filters.model_dump(exclude_none=True))
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=bookings_report.xlsx"}
    )

@api_router.get("/reports/outstanding-balance")
async def get_outstanding_balance_report(
    current_user: dict = Depends(allow_account_admin)
):
    """Get outstanding balance report"""
    # Get all bookings with balance
    all_bookings = await database.get_bookings({})
    
    report_data = []
    for booking in all_bookings:
        # Calculate total paid
        total_paid = 0
        if booking.installments:
            total_paid = sum(inst.amount for inst in booking.installments)
        
        balance = booking.sale_price - total_paid
        
        if balance > 0:
            supplier = await database.get_supplier_by_id(booking.supplier_id)
            report_data.append({
                "booking_id": booking.id,
                "pnr": booking.pnr,
                "pax_name": booking.pax_name,
                "sale_price": booking.sale_price,
                "total_paid": total_paid,
                "balance": balance,
                "supplier_name": supplier.name if supplier else "N/A",
                "created_at": booking.created_at.strftime("%Y-%m-%d")
            })
    
    return report_data

@api_router.post("/reports/outstanding-balance/excel")
async def generate_outstanding_balance_excel_report(
    current_user: dict = Depends(allow_account_admin)
):
    """Generate Excel report for outstanding balances"""
    # Get all bookings with balance
    all_bookings = await database.get_bookings({})
    
    report_data = []
    for booking in all_bookings:
        total_paid = 0
        if booking.installments:
            total_paid = sum(inst.amount for inst in booking.installments)
        
        balance = booking.sale_price - total_paid
        
        if balance > 0:
            supplier = await database.get_supplier_by_id(booking.supplier_id)
            report_data.append({
                "pnr": booking.pnr,
                "pax_name": booking.pax_name,
                "sale_price": booking.sale_price,
                "total_paid": total_paid,
                "balance": balance,
                "supplier_name": supplier.name if supplier else "N/A",
                "created_at": booking.created_at.strftime("%Y-%m-%d")
            })
    
    excel_buffer = generate_outstanding_balance_excel(report_data)
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=outstanding_balance_report.xlsx"}
    )

# =============== DASHBOARD STATS ===============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(allow_all_authenticated)):
    """Get dashboard statistics"""
    user_role = current_user["role"]
    
    filters = {}
    if user_role in ["agent1", "agent2"]:
        filters["created_by"] = current_user["sub"]
    
    all_bookings = await database.get_bookings(filters)
    
    stats = {
        "total_bookings": len(all_bookings),
        "pending_verification": len([b for b in all_bookings if b.status == BookingStatus.PENDING_VERIFICATION]),
        "account_verified": len([b for b in all_bookings if b.status == BookingStatus.ACCOUNT_VERIFIED]),
        "admin_verified": len([b for b in all_bookings if b.status == BookingStatus.ADMIN_VERIFIED]),
        "total_revenue": sum(b.sale_price for b in all_bookings),
        "total_cost": sum(b.our_cost for b in all_bookings),
        "total_margin": sum(b.sale_price - b.our_cost for b in all_bookings)
    }
    
    # Calculate outstanding balance
    outstanding = 0
    for booking in all_bookings:
        total_paid = 0
        if booking.installments:
            total_paid = sum(inst.amount for inst in booking.installments)
        outstanding += (booking.sale_price - total_paid)
    
    stats["outstanding_balance"] = outstanding
    
    return stats

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
