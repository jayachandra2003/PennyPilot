
@echo off
title PennyPilot Cloudflare Tunnel
echo Starting PennyPilot Cloudflare Quick Tunnel using HTTP2...
echo Wait for the trycloudflare.com URL below.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --protocol http2 --url http://127.0.0.1:5174
pause
