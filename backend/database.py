from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from models import (
    User, UserCreate, Supplier, SupplierCreate, Booking, BookingCreate,
    BookingUpdate, BookingModification, BookingModificationCreate,
    AuditLog, UserRole, BookingStatus, PaymentInstallment
)
import uuid

class Database:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users = db.users
        self.suppliers = db.suppliers
        self.bookings = db.bookings
        self.modifications = db.modifications
        self.audit_logs = db.audit_logs

    # User Operations
    async def create_user(self, user: UserCreate, password_hash: str) -> User:
        user_dict = {
            "id": str(uuid.uuid4()),
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "password_hash": password_hash,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.users.insert_one(user_dict)
        user_dict.pop("password_hash")
        user_dict["created_at"] = datetime.fromisoformat(user_dict["created_at"])
        return User(**user_dict)

    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        user = await self.users.find_one({"email": email}, {"_id": 0})
        return user

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        user = await self.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if user:
            user["created_at"] = datetime.fromisoformat(user["created_at"])
            return User(**user)
        return None

    async def get_all_users(self) -> List[User]:
        cursor = self.users.find({}, {"_id": 0, "password_hash": 0})
        users = await cursor.to_list(1000)
        for user in users:
            user["created_at"] = datetime.fromisoformat(user["created_at"])
        return [User(**user) for user in users]

    async def update_user(self, user_id: str, update_data: Dict) -> Optional[User]:
        result = await self.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        if result.modified_count:
            return await self.get_user_by_id(user_id)
        return None

    async def delete_user(self, user_id: str) -> bool:
        result = await self.users.update_one(
            {"id": user_id},
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0

    # Supplier Operations
    async def create_supplier(self, supplier: SupplierCreate, created_by: str) -> Supplier:
        supplier_dict = {
            "id": str(uuid.uuid4()),
            "name": supplier.name,
            "contact_info": supplier.contact_info,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": created_by
        }
        await self.suppliers.insert_one(supplier_dict)
        supplier_dict["created_at"] = datetime.fromisoformat(supplier_dict["created_at"])
        return Supplier(**supplier_dict)

    async def get_suppliers(self) -> List[Supplier]:
        cursor = self.suppliers.find({}, {"_id": 0})
        suppliers = await cursor.to_list(1000)
        for supplier in suppliers:
            supplier["created_at"] = datetime.fromisoformat(supplier["created_at"])
        return [Supplier(**supplier) for supplier in suppliers]

    async def get_supplier_by_id(self, supplier_id: str) -> Optional[Supplier]:
        supplier = await self.suppliers.find_one({"id": supplier_id}, {"_id": 0})
        if supplier:
            supplier["created_at"] = datetime.fromisoformat(supplier["created_at"])
            return Supplier(**supplier)
        return None

    async def update_supplier(self, supplier_id: str, update_data: Dict) -> Optional[Supplier]:
        result = await self.suppliers.update_one(
            {"id": supplier_id},
            {"$set": update_data}
        )
        if result.modified_count:
            return await self.get_supplier_by_id(supplier_id)
        return None

    # Booking Operations
    async def create_booking(self, booking: BookingCreate, created_by: str) -> Booking:
        now = datetime.now(timezone.utc)
        booking_dict = booking.model_dump()
        booking_dict["id"] = str(uuid.uuid4())
        booking_dict["status"] = BookingStatus.DRAFT.value
        booking_dict["created_by"] = created_by
        booking_dict["created_at"] = now.isoformat()
        booking_dict["updated_at"] = now.isoformat()
        booking_dict["billing_status"] = "unpaid"
        booking_dict["paid_amount_to_supplier"] = 0.0
        
        if booking_dict.get("installments"):
            for inst in booking_dict["installments"]:
                if "id" not in inst:
                    inst["id"] = str(uuid.uuid4())
        
        await self.bookings.insert_one(booking_dict)
        return await self.get_booking_by_id(booking_dict["id"])

    async def get_booking_by_id(self, booking_id: str) -> Optional[Booking]:
        booking = await self.bookings.find_one({"id": booking_id}, {"_id": 0})
        if booking:
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])
            booking["updated_at"] = datetime.fromisoformat(booking["updated_at"])
            if booking.get("submitted_at"):
                booking["submitted_at"] = datetime.fromisoformat(booking["submitted_at"])
            if booking.get("account_verified_at"):
                booking["account_verified_at"] = datetime.fromisoformat(booking["account_verified_at"])
            if booking.get("admin_verified_at"):
                booking["admin_verified_at"] = datetime.fromisoformat(booking["admin_verified_at"])
            return Booking(**booking)
        return None

    async def get_booking_by_pnr(self, pnr: str) -> Optional[Booking]:
        booking = await self.bookings.find_one({"pnr": pnr}, {"_id": 0})
        if booking:
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])
            booking["updated_at"] = datetime.fromisoformat(booking["updated_at"])
            if booking.get("submitted_at"):
                booking["submitted_at"] = datetime.fromisoformat(booking["submitted_at"])
            if booking.get("account_verified_at"):
                booking["account_verified_at"] = datetime.fromisoformat(booking["account_verified_at"])
            if booking.get("admin_verified_at"):
                booking["admin_verified_at"] = datetime.fromisoformat(booking["admin_verified_at"])
            return Booking(**booking)
        return None

    async def get_bookings(self, filters: Dict = {}) -> List[Booking]:
        query = {}
        if filters.get("status"):
            query["status"] = filters["status"]
        if filters.get("created_by"):
            query["created_by"] = filters["created_by"]
        if filters.get("supplier_id"):
            query["supplier_id"] = filters["supplier_id"]
        
        cursor = self.bookings.find(query, {"_id": 0}).sort("created_at", -1)
        bookings = await cursor.to_list(1000)
        
        for booking in bookings:
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])
            booking["updated_at"] = datetime.fromisoformat(booking["updated_at"])
            if booking.get("submitted_at"):
                booking["submitted_at"] = datetime.fromisoformat(booking["submitted_at"])
            if booking.get("account_verified_at"):
                booking["account_verified_at"] = datetime.fromisoformat(booking["account_verified_at"])
            if booking.get("admin_verified_at"):
                booking["admin_verified_at"] = datetime.fromisoformat(booking["admin_verified_at"])
        
        return [Booking(**booking) for booking in bookings]

    async def update_booking(self, booking_id: str, update_data: Dict) -> Optional[Booking]:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await self.bookings.update_one(
            {"id": booking_id},
            {"$set": update_data}
        )
        if result.modified_count:
            return await self.get_booking_by_id(booking_id)
        return None

    async def search_bookings(self, search_term: str) -> List[Booking]:
        # Search by PNR or contact number
        query = {
            "$or": [
                {"pnr": {"$regex": search_term, "$options": "i"}},
                {"contact_number": {"$regex": search_term}}
            ]
        }
        cursor = self.bookings.find(query, {"_id": 0}).sort("created_at", -1)
        bookings = await cursor.to_list(100)
        
        for booking in bookings:
            booking["created_at"] = datetime.fromisoformat(booking["created_at"])
            booking["updated_at"] = datetime.fromisoformat(booking["updated_at"])
            if booking.get("submitted_at"):
                booking["submitted_at"] = datetime.fromisoformat(booking["submitted_at"])
            if booking.get("account_verified_at"):
                booking["account_verified_at"] = datetime.fromisoformat(booking["account_verified_at"])
            if booking.get("admin_verified_at"):
                booking["admin_verified_at"] = datetime.fromisoformat(booking["admin_verified_at"])
        
        return [Booking(**booking) for booking in bookings]

    # Modification Operations
    async def create_modification(self, modification: BookingModificationCreate, created_by: str) -> BookingModification:
        mod_dict = modification.model_dump()
        mod_dict["id"] = str(uuid.uuid4())
        mod_dict["created_by"] = created_by
        mod_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.modifications.insert_one(mod_dict)
        mod_dict["created_at"] = datetime.fromisoformat(mod_dict["created_at"])
        return BookingModification(**mod_dict)

    async def get_modifications_by_booking(self, booking_id: str) -> List[BookingModification]:
        cursor = self.modifications.find({"booking_id": booking_id}, {"_id": 0}).sort("created_at", -1)
        modifications = await cursor.to_list(100)
        
        for mod in modifications:
            mod["created_at"] = datetime.fromisoformat(mod["created_at"])
        
        return [BookingModification(**mod) for mod in modifications]

    # Audit Log Operations
    async def create_audit_log(self, user_id: str, user_name: str, user_role: UserRole, 
                               action: str, entity_type: str, entity_id: Optional[str] = None,
                               changes: Optional[Dict] = None):
        log_dict = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_name": user_name,
            "user_role": user_role.value,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "changes": changes,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await self.audit_logs.insert_one(log_dict)

    async def get_audit_logs(self, filters: Dict = {}) -> List[AuditLog]:
        query = {}
        if filters.get("user_id"):
            query["user_id"] = filters["user_id"]
        if filters.get("entity_type"):
            query["entity_type"] = filters["entity_type"]
        
        # Get logs from last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        query["timestamp"] = {"$gte": thirty_days_ago.isoformat()}
        
        cursor = self.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1)
        logs = await cursor.to_list(1000)
        
        for log in logs:
            log["timestamp"] = datetime.fromisoformat(log["timestamp"])
        
        return [AuditLog(**log) for log in logs]

from datetime import timedelta
