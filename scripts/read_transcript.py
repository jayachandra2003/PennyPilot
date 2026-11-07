import os, json, sys

sys.stdout.reconfigure(encoding='utf-8')
conv_id = 'c57dd9d8-efcb-43fc-a7c4-d18e8d653693'
p = os.path.expanduser(f'~/.gemini/antigravity/brain/{conv_id}/.system_generated/logs/transcript_full.jsonl')
with open(p, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT' or data.get('source') == 'USER_EXPLICIT':
            step = data.get('step_index', 0)
            if step > 10000:
                content = data.get('content', '')
                print(f"=== User Input Step {step} ===")
                print(content[:600])
                print("-" * 50)
