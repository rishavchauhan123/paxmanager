from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

# Enums
class UserRole(str, Enum):
    AGENT1 = "agent1"
    AGENT2 = "agent2"
    ACCOUNT = "account"
    ADMIN = "admin"

class BookingStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PENDING_VERIFICATION = "pending_verification"
    ACCOUNT_VERIFIED = "account_verified"
    ADMIN_VERIFIED = "admin_verified"
    BILLED = "billed"
    PAID = "paid"

class SectorType(str, Enum):
    ONE_WAY = "one_way"
    ROUND_TRIP = "round_trip"
    MULTIPLE = "multiple"

class PaymentType(str, Enum):
    FULL_PAYMENT = "full_payment"
    INSTALLMENTS = "installments"

class PaymentMode(str, Enum):
    CASH = "cash"
    CHEQUE = "cheque"
    CREDIT_CARD = "credit_card"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"

class ModificationType(str, Enum):
    DATE_CHANGE = "date_change"
    FLIGHT_CHANGE = "flight_change"
    CANCELLATION = "cancellation"

class BillingStatus(str, Enum):
    UNPAID = "unpaid"
    PARTIAL_PAID = "partial_paid"
    FULLY_PAID = "fully_paid"

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    is_active: bool = True
    created_at: datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Supplier Models
class SupplierCreate(BaseModel):
    name: str
    contact_info: Optional[str] = None

class Supplier(SupplierCreate):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime
    created_by: str

# Travel Detail Models
class TravelLeg(BaseModel):
    travel_date: str
    from_location: str
    to_location: str
    return_date: Optional[str] = None

class TravelDetails(BaseModel):
    sector_type: SectorType
    legs: List[TravelLeg]
    note: Optional[str] = None

# Payment Models
class PaymentInstallment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    payment_mode: PaymentMode
    payment_date: str
    reference_no: Optional[str] = None

class PaymentInstallmentCreate(BaseModel):
    amount: float
    payment_mode: PaymentMode
    payment_date: str
    reference_no: Optional[str] = None

# Booking Models
class BookingCreate(BaseModel):
    pax_name: str
    contact_person: Optional[str] = None
    contact_number: str
    pnr: str
    travel_details: TravelDetails
    airline: str
    supplier_id: str
    our_cost: float
    sale_price: float
    payment_type: PaymentType
    installments: Optional[List[PaymentInstallmentCreate]] = None

    @field_validator('contact_number')
    @classmethod
    def validate_contact_number(cls, v: str) -> str:
        # Remove spaces and special characters
        cleaned = ''.join(filter(str.isdigit, v))
        if len(cleaned) < 10:
            raise ValueError('Contact number must be at least 10 digits')
        return v

class BookingUpdate(BaseModel):
    supplier_id: Optional[str] = None
    our_cost: Optional[float] = None
    sale_price: Optional[float] = None
    installments: Optional[List[PaymentInstallmentCreate]] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    pax_name: str
    contact_person: Optional[str] = None
    contact_number: str
    pnr: str
    travel_details: TravelDetails
    airline: str
    supplier_id: str
    our_cost: float
    sale_price: float
    payment_type: PaymentType
    installments: Optional[List[PaymentInstallment]] = None
    status: BookingStatus
    created_by: str
    submitted_at: Optional[datetime] = None
    account_verified_by: Optional[str] = None
    account_verified_at: Optional[datetime] = None
    admin_verified_by: Optional[str] = None
    admin_verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    billing_status: BillingStatus = BillingStatus.UNPAID
    paid_amount_to_supplier: float = 0.0

# Modification Models
class CancellationDetails(BaseModel):
    payment_mode_was: PaymentMode
    total_paid_by_client: float
    refundable_amount: float
    old_margin: float
    committed_to_client: Optional[float] = None
    charge_from_client: Optional[float] = None
    refund_processed: bool = False
    remarks: str

class DateChangeDetails(BaseModel):
    new_travel_details: TravelDetails
    our_cost: float
    sale_price: float
    remarks: str

class FlightChangeDetails(BaseModel):
    new_travel_details: TravelDetails
    new_airline: str
    our_cost: float
    sale_price: float
    remarks: str

class BookingModificationCreate(BaseModel):
    booking_id: str
    modification_type: ModificationType
    cancellation_details: Optional[CancellationDetails] = None
    date_change_details: Optional[DateChangeDetails] = None
    flight_change_details: Optional[FlightChangeDetails] = None

class BookingModification(BookingModificationCreate):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_by: str
    created_at: datetime

# Audit Log Models
class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    user_role: UserRole
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    changes: Optional[Dict[str, Any]] = None
    timestamp: datetime

# Report Models
class BookingReportFilters(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    supplier_id: Optional[str] = None
    employee_id: Optional[str] = None
    status: Optional[BookingStatus] = None
    pending_verification: Optional[bool] = None

class OutstandingBalanceReport(BaseModel):
    booking_id: str
    pnr: str
    pax_name: str
    sale_price: float
    total_paid: float
    balance: float
    supplier_name: str
    created_at: str
