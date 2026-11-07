"""Seed script for realistic Indian demo data across 4 months (Aug 2026 - Nov 2026).

Usage:
    python scripts/seed_demo_data.py
"""
import os
import sys
from datetime import date
from decimal import Decimal

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.domain.currency import rupees_to_paise
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User


def seed():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Create or get Demo User
        demo_email = "demo@pennypilot.in"
        user = db.query(User).filter(User.email == demo_email).first()
        if not user:
            print(f"Creating demo user: {demo_email}")
            user = User(
                email=demo_email,
                password_hash=hash_password("DemoPassword123!"),
                display_name="Aarav Sharma",
                timezone="Asia/Kolkata",
                currency="INR",
            )
            user.email_verified = True
            user.onboarding_completed = True
            user.tutorial_completed = True
            user.monthly_savings_target_paise = rupees_to_paise(25000)
            db.add(user)
            db.flush()
        else:
            print(f"Re-using existing demo user: {demo_email}")

        # 2. Setup Categories
        categories_data = [
            ("Salary", "income", "banknote", "emerald"),
            ("Freelance", "income", "briefcase", "teal"),
            ("Housing & Rent", "expense", "home", "indigo"),
            ("Groceries", "expense", "shopping-cart", "emerald"),
            ("Dining & Food", "expense", "utensils", "amber"),
            ("Utilities & Bills", "expense", "zap", "blue"),
            ("Transportation", "expense", "car", "cyan"),
            ("Healthcare", "expense", "heart-pulse", "rose"),
            ("Entertainment", "expense", "film", "purple"),
            ("Shopping", "expense", "shopping-bag", "orange"),
        ]

        cats = {}
        for name, kind, icon, color in categories_data:
            cat = db.query(Category).filter(Category.user_id == user.id, Category.name == name, Category.kind == kind).first()
            if not cat:
                cat = Category(user_id=user.id, name=name, kind=kind, icon=icon, color_token=color)
                db.add(cat)
                db.flush()
            cats[name] = cat

        # 3. Clear old transactions for clean replay
        db.query(Transaction).filter(Transaction.user_id == user.id).delete()
        db.query(Budget).filter(Budget.user_id == user.id).delete()

        # 4. Set Budgets for November 2026
        nov_1 = date(2026, 11, 1)
        budgets_data = [
            (cats["Housing & Rent"].id, 20000),
            (cats["Groceries"].id, 12000),
            (cats["Dining & Food"].id, 8000),
            (cats["Utilities & Bills"].id, 5000),
            (cats["Transportation"].id, 4000),
            (cats["Shopping"].id, 6000),
        ]
        for cat_id, limit_rs in budgets_data:
            b = Budget(user_id=user.id, category_id=cat_id, month=nov_1, limit_paise=rupees_to_paise(limit_rs))
            db.add(b)

        # 5. Populate Transactions across August, September, October, and November 2026
        sample_transactions = [
            # August 2026
            ("Salary", "Monthly Salary - TechCorp", 85000, date(2026, 8, 1), "income", "manual"),
            ("Housing & Rent", "Flat Maintenance & Rent", 18500, date(2026, 8, 2), "expense", "manual"),
            ("Groceries", "DMart Monthly Supplies", 5200, date(2026, 8, 5), "expense", "manual"),
            ("Dining & Food", "Swiggy Dinner", 420, date(2026, 8, 7), "expense", "manual"),
            ("Transportation", "Metro Card Recharge", 1000, date(2026, 8, 10), "expense", "manual"),
            ("Utilities & Bills", "Electricity & Wi-Fi", 2800, date(2026, 8, 15), "expense", "manual"),

            # September 2026
            ("Salary", "Monthly Salary - TechCorp", 85000, date(2026, 9, 1), "income", "manual"),
            ("Housing & Rent", "Flat Maintenance & Rent", 18500, date(2026, 9, 2), "expense", "manual"),
            ("Groceries", "Nature's Basket", 4800, date(2026, 9, 4), "expense", "manual"),
            ("Dining & Food", "Zomato Biryani", 550, date(2026, 9, 12), "expense", "manual"),
            ("Transportation", "Uber Ride to Airport", 650, date(2026, 9, 18), "expense", "manual"),
            ("Utilities & Bills", "Electricity Bill", 2400, date(2026, 9, 20), "expense", "manual"),

            # October 2026
            ("Salary", "Monthly Salary - TechCorp", 85000, date(2026, 10, 1), "income", "manual"),
            ("Freelance", "UI Consulting Project", 25000, date(2026, 10, 15), "income", "manual"),
            ("Housing & Rent", "Flat Maintenance & Rent", 18500, date(2026, 10, 2), "expense", "manual"),
            ("Groceries", "Zepto Quick Delivery", 450, date(2026, 10, 5), "expense", "manual"),
            ("Dining & Food", "Cafe Coffee Day", 320, date(2026, 10, 8), "expense", "manual"),
            ("Entertainment", "Movie Tickets BookMyShow", 700, date(2026, 10, 12), "expense", "manual"),
            ("Shopping", "Diwali Clothes Myntra", 4500, date(2026, 10, 22), "expense", "manual"),

            # November 2026 (Current Active Month)
            ("Salary", "Monthly Salary - TechCorp", 85000, date(2026, 11, 1), "income", "manual"),
            ("Housing & Rent", "Flat Maintenance & Rent", 18500, date(2026, 11, 2), "expense", "manual"),
            ("Groceries", "Milk, Eggs & Bread", 180, date(2026, 11, 3), "expense", "nl"),
            ("Groceries", "Blinkit Vegetables", 650, date(2026, 11, 4), "expense", "nl"),
            ("Transportation", "Auto to Office", 80, date(2026, 11, 4), "expense", "nl"),
            ("Dining & Food", "Lunch Thali", 220, date(2026, 11, 5), "expense", "manual"),
            # DELIBERATE DEMO ANOMALY: Team Celebration Dinner (Spike for MAD engine)
            ("Dining & Food", "Team Celebration Dinner @ Toit", 6800, date(2026, 11, 5), "expense", "manual"),
        ]

        for cat_name, desc, amt_rs, occ_date, kind, src in sample_transactions:
            tx = Transaction(
                user_id=user.id,
                category_id=cats[cat_name].id,
                kind=kind,
                amount_paise=rupees_to_paise(amt_rs),
                occurred_on=occ_date,
                description=desc,
                source=src,
            )
            db.add(tx)

        db.commit()
        print(f"Successfully seeded {len(sample_transactions)} transactions for '{demo_email}'.")
        print("Demo Credentials: Email: demo@pennypilot.in | Password: DemoPassword123!")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
