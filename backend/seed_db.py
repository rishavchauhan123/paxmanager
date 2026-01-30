import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from datetime import datetime, timezone
import uuid

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Seeding database...")
    
    # Create admin user
    admin_exists = await db.users.find_one({"email": "admin@pax.com"})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@pax.com",
            "name": "Admin User",
            "role": "admin",
            "password_hash": pwd_context.hash("admin123"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        print("✓ Created admin user (admin@pax.com / admin123)")
    
    # Create agent user
    agent_exists = await db.users.find_one({"email": "agent@pax.com"})
    if not agent_exists:
        agent_user = {
            "id": str(uuid.uuid4()),
            "email": "agent@pax.com",
            "name": "Agent User",
            "role": "agent1",
            "password_hash": pwd_context.hash("agent123"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(agent_user)
        print("✓ Created agent user (agent@pax.com / agent123)")
    
    # Create account user
    account_exists = await db.users.find_one({"email": "account@pax.com"})
    if not account_exists:
        account_user = {
            "id": str(uuid.uuid4()),
            "email": "account@pax.com",
            "name": "Account User",
            "role": "account",
            "password_hash": pwd_context.hash("account123"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(account_user)
        print("✓ Created account user (account@pax.com / account123)")
    
    # Create sample suppliers
    supplier_count = await db.suppliers.count_documents({})
    if supplier_count == 0:
        suppliers = [
            {
                "id": str(uuid.uuid4()),
                "name": "Emirates Airlines",
                "contact_info": "+971-4-123-4567",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Qatar Airways",
                "contact_info": "+974-4-456-7890",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Etihad Airways",
                "contact_info": "+971-2-234-5678",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system"
            }
        ]
        await db.suppliers.insert_many(suppliers)
        print(f"✓ Created {len(suppliers)} sample suppliers")
    
    print("\nDatabase seeding completed!")
    print("\nYou can now login with:")
    print("  Admin: admin@pax.com / admin123")
    print("  Agent: agent@pax.com / agent123")
    print("  Account: account@pax.com / account123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
