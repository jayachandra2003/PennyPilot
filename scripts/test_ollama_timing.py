import asyncio
import time
import httpx

async def test():
    prompt = """User Question: "Where do I need to reduce my spending?"
Verified Fact Bundle:
{
  "period": "2026-11",
  "totals": {"income": "75000.00", "expense": "5180.00"},
  "top_category": {"category_name": "Utilities and Bills", "amount": "2500.00"}
}
Answer concisely in 2 sentences."""
    t0 = time.time()
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post('http://localhost:11434/api/generate', json={'model': 'qwen2.5:3b', 'prompt': prompt, 'stream': False})
            print('Time taken:', round(time.time() - t0, 2), 's')
            print('Response:', res.json().get('response'))
    except Exception as e:
        print('Error:', e)

if __name__ == '__main__':
    asyncio.run(test())
