#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
المِيزان — Arabic prosody (عروض) analyzer server.
Engine: pyarud (MIT). UI: RTL vanilla JS SPA on port 8096.
المنطق كله في prosody_core.py — مشترك مع خادم التطبيق داخل APK.
"""
import json
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

from prosody_core import METERS, analyze_text

PORT = 8096
ROOT = Path(__file__).parent


class Handler(SimpleHTTPRequestHandler):
    # الخطوط تُرفض إن قُدِّمت كـ application/octet-stream (المتصفح والـ WebView يتجاهلانها)
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.webmanifest': 'application/manifest+json',
        '.json': 'application/json; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != '/api/analyze':
            return self._json({'error': 'not found'}, 404)
        try:
            n = int(self.headers.get('Content-Length', 0))
            req = json.loads(self.rfile.read(n).decode('utf-8'))
        except Exception as e:
            return self._json({'error': f'bad request: {e}'}, 400)
        data = analyze_text(req.get('text', ''))
        if data is None:
            return self._json({'error': 'لا يوجد نص للتحليل'}, 400)
        return self._json(data)

    def do_GET(self):
        if self.path == '/api/health':
            return self._json({'ok': True, 'engine': 'pyarud', 'meters': len(METERS)})
        return super().do_GET()


if __name__ == '__main__':
    print(f'المِيزان prosody server on http://0.0.0.0:{PORT}')
    ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
