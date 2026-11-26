#!/usr/bin/env python3
"""Generate the Ghost Protocol adaptive launcher icon and legacy fallbacks.

Run from anywhere: python3 tools/generate_icons.py
The vector XML is written once and the same geometry is rasterised into every
legacy mipmap, so the old and new launcher icons stay visually identical.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / 'apk_app' / 'res'

BG = [
    dict(d='M0,0L108,0L108,108L0,108Z', fill='#06121E'),
    dict(d='M54,0L108,54L54,108L0,54Z', fill='#0A2233'),
    dict(d='M54,10L98,54L54,98L10,54Z', fill='#0E3045'),
    dict(d='M54,22L86,54L54,86L22,54Z', fill='#071A28'),
    dict(d='M54,10L98,54L54,98L10,54Z', stroke='#1E6E88', width=1.4),
    dict(d='M0,54L108,54', stroke='#12455C', width=1),
    dict(d='M54,0L54,108', stroke='#12455C', width=1),
    dict(d='M10,54L54,10L98,54L54,98Z', stroke='#12455C', width=1),
]

FG = [
    dict(d='M54,29C40,29 29,38 27,50L25,66C24,75 32,82 43,83L65,83C76,82 84,75 83,66L81,50C79,38 68,29 54,29Z', fill='#0A1A27'),
    dict(d='M33,66L39,81L54,84L69,81L75,66C69,72 62,75 54,75C46,75 39,72 33,66Z', fill='#0C2B3D'),
    dict(d='M54,32C44,32 35,39 33,49L32,58C37,51 44,47 54,47C64,47 71,51 76,58L75,49C73,39 64,32 54,32Z', fill='#143A50'),
    dict(d='M37,53C39,45 45,40 54,40C63,40 69,45 71,53L69,65C66,72 61,76 54,76C47,76 42,72 39,65Z', fill='#04111A'),
    dict(d='M35,54L47,50L61,50L73,54L69,62L54,59L39,62Z', fill='#63E6FF'),
    dict(d='M40,55L48,52L60,52L68,55L65,59L54,57L43,59Z', fill='#08202D'),
    dict(d='M42,55L49,53L52,53L49,57L43,58Z', fill='#D9FCFF'),
    dict(d='M66,55L59,53L56,53L59,57L65,58Z', fill='#D9FCFF'),
    dict(d='M54,29C40,29 29,38 27,50L25,66C24,75 32,82 43,83L65,83C76,82 84,75 83,66L81,50C79,38 68,29 54,29Z',
         stroke='#63E6FF', width=2),
    dict(d='M54,65L60,69L58,76L50,76L48,69Z', fill='#0B2330', stroke='#63E6FF', width=1.5),
    dict(d='M54,68C57,68 59,71 57,73C55,76 52,75 51,73C50,70 52,68 54,68Z', fill='#8FF4FF'),
]

# Compact 5x7 stencil font keeps both title lines legible at launcher size.
FONT = {
 'M': ('10001','11011','10101','10101','10001','10001','10001'),
 'A': ('01110','10001','10001','11111','10001','10001','10001'),
 'S': ('01111','10000','10000','01110','00001','00001','11110'),
 'E': ('11111','10000','10000','11110','10000','10000','11111'),
 'F': ('11111','10000','10000','11110','10000','10000','10000'),
 'C': ('01111','10000','10000','10000','10000','10000','01111'),
 'T': ('11111','00100','00100','00100','00100','00100','00100'),
 'H': ('10001','10001','10001','11111','10001','10001','10001'),
 'G': ('01111','10000','10000','10111','10001','10001','01111'),
 'P': ('11110','10001','10001','11110','10000','10000','10000'),
 'R': ('11110','10001','10001','11110','10100','10010','10001'),
 'O': ('01110','10001','10001','10001','10001','10001','01110'),
 'L': ('10000','10000','10000','10000','10000','10000','11111'),
 'I': ('11111','00100','00100','00100','00100','00100','11111'),
 ' ': ('00000',)*7,
}


def text_width(text, scale=1):
    return (len(text) * 6 - 1) * scale


def text_path(text, x, y, scale=1):
    parts = []
    for ci, ch in enumerate(text.upper()):
        glyph = FONT[ch]
        ox = x + ci * 6 * scale
        for row, bits in enumerate(glyph):
            for col, bit in enumerate(bits):
                if bit != '1':
                    continue
                px, py = ox + col * scale, y + row * scale
                parts.append('M%g,%gL%g,%gL%g,%gL%g,%gZ' %
                             (px, py, px + scale, py, px + scale, py + scale,
                              px, py + scale))
    return ' '.join(parts)


FG.extend([
    dict(d='M22,17L86,17L88,26L20,26Z', fill='#04111A',
         stroke='#1E6E88', width=.8),
    dict(d='M18,82L90,82L88,90L20,90Z', fill='#04111A',
         stroke='#1E6E88', width=.8),
    dict(d=text_path('MASS EFFECT', (108 - text_width('MASS EFFECT')) / 2, 18.5),
         fill='#BDF6FF'),
    dict(d=text_path('GHOST PROTOCOL', (108 - text_width('GHOST PROTOCOL', .84)) / 2, 83, .84),
         fill='#7DDDF2'),
])

TOKENS = re.compile(r'[MLCZmlcz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)')


def flatten_cubic(p0, p1, p2, p3, steps=18):
    out = []
    for i in range(1, steps + 1):
        t = i / steps
        u = 1 - t
        out.append((
            u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
            u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
        ))
    return out


def parse_path(d):
    """Parse the small absolute M/L/C/Z subset used by the generated vectors."""
    tokens = TOKENS.findall(d)
    subpaths, current, cmd = [], [], None
    x = y = 0.0
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok in 'MLCZmlcz':
            cmd = tok.upper()
            i += 1
            if cmd == 'Z':
                if current:
                    subpaths.append(current + [current[0]])
                    current = []
                continue
        if cmd == 'M':
            x, y = float(tokens[i]), float(tokens[i + 1]); i += 2
            if current:
                subpaths.append(current)
            current = [(x, y)]
            cmd = 'L'
        elif cmd == 'L':
            x, y = float(tokens[i]), float(tokens[i + 1]); i += 2
            current.append((x, y))
        elif cmd == 'C':
            c1 = (float(tokens[i]), float(tokens[i + 1]))
            c2 = (float(tokens[i + 2]), float(tokens[i + 3]))
            x, y = float(tokens[i + 4]), float(tokens[i + 5])
            i += 6
            p0 = current[-1] if current else (x, y)
            current.extend(flatten_cubic(p0, c1, c2, (x, y)))
        else:
            raise ValueError('unsupported path token: ' + tok)
    if current:
        subpaths.append(current)
    return subpaths


def vector_xml(paths):
    lines = ['<?xml version="1.0" encoding="utf-8"?>',
             '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
             '    android:width="108dp" android:height="108dp"',
             '    android:viewportWidth="108" android:viewportHeight="108">']
    for p in paths:
        attrs = ['android:pathData="' + p['d'] + '"']
        if 'fill' in p:
            attrs.append('android:fillColor="' + p['fill'] + '"')
        else:
            attrs.append('android:fillColor="#00000000"')
        if 'stroke' in p:
            attrs.append('android:strokeColor="' + p['stroke'] + '"')
            attrs.append('android:strokeWidth="' + str(p['width']) + '"')
            attrs.append('android:strokeLineJoin="round"')
        lines.append('    <path ' + ' '.join(attrs) + '/>')
    lines.append('</vector>')
    return '\n'.join(lines) + '\n'


def adaptive_xml():
    return '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
'''


def draw_paths(draw, paths, scale):
    from PIL import ImageColor
    for p in paths:
        for sub in parse_path(p['d']):
            pts = [(int(round(x * scale)), int(round(y * scale))) for x, y in sub]
            if len(pts) < 2:
                continue
            if 'fill' in p:
                draw.polygon(pts, fill=ImageColor.getrgb(p['fill']))
            if 'stroke' in p:
                draw.line(pts + [pts[0]], fill=ImageColor.getrgb(p['stroke']),
                          width=max(1, int(round(p['width'] * scale))), joint='curve')


def write_legacy(size, round_icon=False):
    from PIL import Image, ImageDraw
    scale = 6
    big = size * scale
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_paths(d, BG, big / 108)
    draw_paths(d, FG, big / 108)
    if round_icon:
        mask = Image.new('L', (big, big), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)
        img.putalpha(mask)
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    name = 'ic_launcher_round.png' if round_icon else 'ic_launcher.png'
    img.save(ROOT / 'apk_app' / 'res' / {
        48: 'mipmap-mdpi', 72: 'mipmap-hdpi', 96: 'mipmap-xhdpi',
        144: 'mipmap-xxhdpi', 192: 'mipmap-xxxhdpi'}[size] / name,
        optimize=True)


def main():
    (RES / 'drawable').mkdir(parents=True, exist_ok=True)
    (RES / 'mipmap-anydpi-v26').mkdir(parents=True, exist_ok=True)
    (RES / 'drawable' / 'ic_launcher_background.xml').write_text(vector_xml(BG))
    (RES / 'drawable' / 'ic_launcher_foreground.xml').write_text(vector_xml(FG))
    for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        (RES / 'mipmap-anydpi-v26' / name).write_text(adaptive_xml())
    for size in (48, 72, 96, 144, 192):
        write_legacy(size)
        write_legacy(size, round_icon=True)
    print('generated adaptive launcher icon + legacy mipmaps')


if __name__ == '__main__':
    main()
