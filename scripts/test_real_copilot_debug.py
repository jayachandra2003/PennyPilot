import asyncio
import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath('backend'))

from app.db.session import SessionLocal
from app.domain.copilot import FactBundleBuilder, IntentClassifier, FactBundleVerifier
from app.services.ai_client import ai_service
from app.models.category import Category

async def main():
    db = SessionLocal()
    user_id = '515638d8-4430-4c18-8dfd-240ee5654570'
    categories = db.query(Category).filter(Category.user_id == user_id, Category.is_archived == False).all()
    cat_dicts = [{'id': c.id, 'name': c.name, 'kind': c.kind} for c in categories]
    
    questions = [
        "Where do I need to reduce my spending?",
        "Am I good at saving money?",
        "Why did my expenses increase this month?",
        "Which transactions look unusual?"
    ]
    
    for q in questions:
        print("\n" + "="*60)
        print("QUESTION:", q)
        intent, target_cat = IntentClassifier.classify(q, cat_dicts)
        print("CLASSIFIED INTENT:", intent, "TARGET CAT:", target_cat)
        facts = FactBundleBuilder.build(db=db, user_id=user_id, year=2026, month=11, question=q)
        
        # Test what Ollama generates directly
        user_prompt = f"User Question: \"{q}\"\nDetected Intent: {intent}\nFacts:\n{facts['totals']}\nTop Category: {facts.get('top_category')}"
        ai_raw = await ai_service.tier2_local.generate(user_prompt)
        print("RAW OLLAMA OUTPUT:\n", ai_raw)
        
        if ai_raw:
            sanitized, is_valid = FactBundleVerifier.verify(ai_raw, facts)
            print("VERIFIER RESULT: is_valid =", is_valid)
            if not is_valid:
                print("REASON FOR INVALIDATION (Verifier rejected raw output)")
        
        result = await ai_service.generate_grounded_answer(
            question=q,
            facts=facts,
            intent=intent,
            target_cat=target_cat
        )
        print("FINAL DELIVERED ANSWER (Provider:", result['provider'], "Tier:", result['tier'], "):\n", result['answer'])

    db.close()

if __name__ == '__main__':
    asyncio.run(main())
