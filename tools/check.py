#!/usr/bin/env python3
"""TKB Studio layout check (no screenshots). Usage:
  python3 tools/check.py            # all layouts x sizes x viewports
  python3 tools/check.py --quick    # 3 layouts only
Prints one compact line per case + a summary; exit code 1 if any problem.
Needs: pip install playwright && python3 -m playwright install chromium
"""
import json, os, sys, threading, functools, http.server, socketserver

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUICK = '--quick' in sys.argv
VIEWPORTS = {'phone-9:20': (412, 915), 'desk-16:9': (1600, 900)}
SIZES = {'9:20': (9, 20), '16:9': (16, 9), '21:9': (21, 9)}
# place variants: default, mini, big. Keys not present in cfg.place are ignored by older code.
PLACES = {
    'default': {},
    'mini': {'width': 0.2, 'zoom': 0.4, 'cx': 0.85, 'cy': 0.2, 'preset': None},
    'big': {'width': 1, 'zoom': 2.5, 'preset': None},
}

JS_CASE = """async ([size, place, layout]) => {
  const ui = TKB.ui;
  const done = new Promise(r => { let t = setTimeout(r, 1500); ui.on('rendered', () => { clearTimeout(t); setTimeout(r, 30); }); });
  ui.update(c => { c.size = {w: size[0], h: size[1]}; c.look.layout = layout; Object.assign(c.place, place); });
  await done;
  const sc = document.getElementById('screen').getBoundingClientRect();
  const db = document.getElementById('dragbox'), b = db.getBoundingClientRect();
  const cv = document.getElementById('cv');
  const m = TKB.render.measure(ui.get(), cv.width, cv.height);
  const tol = 1.5;
  return {
    hidden: db.hidden,
    inside: b.left >= sc.left - tol && b.top >= sc.top - tol && b.right <= sc.right + tol && b.bottom <= sc.bottom + tol,
    boxPct: [+(b.width / sc.width * 100).toFixed(1), +(b.height / sc.height * 100).toFixed(1)],
    measPct: [+(m.w / cv.width * 100).toFixed(1), +(m.h / cv.height * 100).toFixed(1)],
    // dragbox must match the measured block (same placement code path)
    match: Math.abs(b.width / sc.width - m.w / cv.width) < 0.01 && Math.abs(b.height / sc.height - m.h / cv.height) < 0.01,
    pageOverflowX: document.documentElement.scrollWidth > innerWidth + 1
  };
}"""


def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    h = functools.partial(Q, directory=ROOT)
    s = socketserver.TCPServer(('127.0.0.1', 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


def main():
    srv = serve()
    url = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
    bad = 0
    with sync_playwright() as p:
        br = p.chromium.launch()
        for vname, (vw, vh) in VIEWPORTS.items():
            pg = br.new_page(viewport={'width': vw, 'height': vh})
            errs = []
            # external fonts may be blocked offline: only same-origin HTTP failures count
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
            pg.on('response', lambda r: errs.append('%d %s' % (r.status, r.url)) if r.status >= 400 and r.url.startswith(url.rsplit('/', 1)[0]) else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(url)
            pg.wait_for_function('window.TKB && TKB.ui && TKB.ui.get && TKB.ui.get()')
            layouts = [l['id'] for l in pg.evaluate('TKB.render.layouts')]
            if QUICK:
                layouts = layouts[:3]
            for sname, sz in SIZES.items():
                for pname, pl in PLACES.items():
                    for lay in layouts:
                        r = pg.evaluate(JS_CASE, [list(sz), pl, lay])
                        ok = (not r['hidden']) and r['inside'] and r['match'] and not r['pageOverflowX']
                        if not ok:
                            bad += 1
                        print(('OK ' if ok else 'BAD'), vname, sname, pname, lay, json.dumps(r, separators=(',', ':')))
            if errs:
                bad += 1
                print('CONSOLE', vname, json.dumps(errs[:5], ensure_ascii=False))
            pg.close()
        br.close()
    srv.shutdown()
    print('SUMMARY bad=%d' % bad)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
