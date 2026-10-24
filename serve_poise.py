#!/usr/bin/env python3
"""Serve the reviewed Poise build locally. No third-party Python packages needed."""
import functools
import http.server
import pathlib
import sys
import urllib.request
import webbrowser

URL = 'http://127.0.0.1:5173/'
ROOT = pathlib.Path(__file__).resolve().parent / 'App'
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
try:
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 5173), handler)
except OSError as error:
    try:
        with urllib.request.urlopen(URL + 'poise-local.txt', timeout=2) as response:
            is_poise = response.read().decode() == 'poise-local-audit-2026-10-23'
    except Exception:
        is_poise = False
    if not is_poise:
        print(f'Could not start Poise: {error}. Port 5173 may be in use by another app.')
        sys.exit(1)
    print('Poise is already running at ' + URL)
    if '--no-open' not in sys.argv:
        webbrowser.open(URL)
    sys.exit(0)

print('Poise is ready at ' + URL, flush=True)
print('Keep this window open while playing. Press Control-C to stop the server.', flush=True)
if '--no-open' not in sys.argv:
    webbrowser.open(URL)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
