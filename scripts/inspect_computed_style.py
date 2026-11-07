import asyncio
import json
import urllib.request
import websockets

async def test():
    try:
        meta = json.loads(urllib.request.urlopen('http://127.0.0.1:9290/json').read().decode())
    except Exception as e:
        print("Not running:", e)
        return
    ws_url = [t for t in meta if t.get('type') == 'page'][0]['webSocketDebuggerUrl']
    async with websockets.connect(ws_url) as ws:
        expr = """
            const el = document.querySelector('.glass-panel');
            const style = window.getComputedStyle(el);
            ({
                bg: style.backgroundColor,
                backdrop: style.backdropFilter,
                border: style.borderColor,
                boxShadow: style.boxShadow
            })
        """
        await ws.send(json.dumps({'id': 1, 'method': 'Runtime.evaluate', 'params': {'expression': expr, 'returnByValue': True}}))
        resp = json.loads(await ws.recv())
        print(resp.get('result', {}).get('result', {}).get('value'))

asyncio.run(test())
