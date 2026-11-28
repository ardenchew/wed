"""Usage: python3 scripts/draw-golden-gate.py > public/golden-gate.svg

Generates an original line sketch of the Golden Gate Bridge (bridge receding left, hatched
headlands, water with rocks and a shoreline) as a single-colour SVG for use as a CSS mask."""
import random
import sys

random.seed(7)
W, H = 600, 240
HORIZON = 178
out = []


def f(v):
    return f'{v:.1f}'


def line(x1, y1, x2, y2, w=1.6):
    out.append(f'<path d="M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}" stroke-width="{w}"/>')


def path(d, w=1.6, fill=False):
    if fill:
        out.append(f'<path d="{d}" fill="#000" stroke-width="{w}"/>')
    else:
        out.append(f'<path d="{d}" stroke-width="{w}"/>')


def quad(p0, c, p1, t):
    return ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
            (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1])


def wobble(points, amp=0.6):
    """Hand-drawn polyline through points, nudged slightly."""
    pts = [(x + random.uniform(-amp, amp), y + random.uniform(-amp, amp)) for x, y in points]
    return 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts)


# Deck: rises gently to the right (the near end), with a second edge for its thickness.
deck_l, deck_r = (96, 166), (482, 147)


def deck_y(x):
    return deck_l[1] + (deck_r[1] - deck_l[1]) * (x - deck_l[0]) / (deck_r[0] - deck_l[0])


line(*deck_l, *deck_r, 2.2)
line(deck_l[0], deck_l[1] + 6, deck_r[0], deck_r[1] + 7, 1.6)
# Truss under the deck: a run of small V's.
x = deck_l[0] + 4
up = True
while x < deck_r[0] - 6:
    x2 = x + 7
    line(x, deck_y(x) + (0.8 if up else 6), x2, deck_y(x2) + (6 if up else 0.8), 1)
    x, up = x2, not up


def tower(x, top, bottom, leg_w, gap, portals):
    """Two tapering legs joined by portal struts, with the Art Deco set-backs suggested by
    short horizontal ticks."""
    for lx in (x, x + gap):
        path(f'M{f(lx)} {f(bottom)}L{f(lx + 0.6)} {f(top)}L{f(lx + leg_w - 0.6)} {f(top)}'
             f'L{f(lx + leg_w)} {f(bottom)}Z', 1, fill=True)
    for py in portals:
        path(f'M{f(x + leg_w)} {f(py)}H{f(x + gap)}V{f(py + 3)}H{f(x + leg_w)}Z', 0.8, fill=True)
    # Cap.
    line(x - 1.5, top, x + gap + leg_w + 1.5, top, 2)


# Near (big) tower on the right, far (small) tower on the left.
big = dict(x=302, top=8, bottom=HORIZON + 4, leg_w=5, gap=17)
small = dict(x=168, top=74, bottom=HORIZON + 2, leg_w=3.4, gap=10)
tower(**big, portals=[34, 62, 92, 120])
tower(**small, portals=[90, 112, 132])

big_top = (big['x'] + (big['gap'] + big['leg_w']) / 2, big['top'] + 2)
small_top = (small['x'] + (small['gap'] + small['leg_w']) / 2, small['top'] + 2)

# Main cables: far side span, main span (sagging to just above the deck), near side span.
spans = [
    ((60, deck_y(60) if 60 >= deck_l[0] else 168), (110, 150), small_top),
    (small_top, ((small_top[0] + big_top[0]) / 2, 186), big_top),
    (big_top, (400, 120), (498, 146)),
]
for p0, c, p1 in spans:
    path(f'M{f(p0[0])} {f(p0[1])}Q{f(c[0])} {f(c[1])} {f(p1[0])} {f(p1[1])}', 1.5)
    # Suspenders hang from the cable to the deck.
    n = int(abs(p1[0] - p0[0]) / 6)
    for i in range(1, n):
        cx, cy = quad(p0, c, p1, i / n)
        if deck_l[0] < cx < deck_r[0] and deck_y(cx) - cy > 3:
            line(cx, cy, cx, deck_y(cx), 0.7)

# An arch on the near shore carrying the approach (as at Fort Point).
path('M432 178V158Q452 128 472 158V178', 1.6)
path('M428 178V152M476 178V148', 1.4)

# Far headland on the left: a ridgeline with diagonal hatching.
ridge_l = [(8, HORIZON), (20, 160), (38, 146), (58, 150), (80, 141), (104, 152), (128, 160),
           (150, 170), (166, HORIZON)]
path(wobble(ridge_l), 1.6)


def ridge_y(pts, x):
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        if x1 <= x <= x2:
            return y1 + (y2 - y1) * (x - x1) / (x2 - x1)
    return None


for hx in range(14, 162, 4):
    ry = ridge_y(ridge_l, hx)
    if ry is None:
        continue
    top = ry + random.uniform(1.5, 4)
    bot = HORIZON - random.uniform(0, 3)
    if bot - top > 4:
        line(hx + 4, top, hx, bot, 0.8)

# Near headland on the right: steeper cliffs with denser hatching.
ridge_r = [(476, 150), (496, 140), (514, 132), (530, 136), (548, 124), (566, 130), (584, 138),
           (594, 150), (594, HORIZON)]
path(wobble(ridge_r), 1.6)
for hx in range(480, 592, 3):
    ry = ridge_y(ridge_r, hx)
    if ry is None:
        continue
    top = ry + random.uniform(1, 3)
    bot = HORIZON - random.uniform(0, 6)
    if bot - top > 4:
        line(hx + 5, top, hx, bot, 0.8)

# Waterline.
path(wobble([(6, HORIZON), (200, HORIZON + 0.5), (420, HORIZON), (596, HORIZON)], 0.4), 2)

# Water: short dashes, sparser and longer toward the viewer.
for row, y in enumerate(range(188, 232, 8)):
    x = random.uniform(10, 40)
    while x < 400 - row * 10:
        length = random.uniform(10, 26 + row * 4)
        line(x, y + random.uniform(-1, 1), x + length, y + random.uniform(-1, 1), 0.9)
        x += length + random.uniform(14, 34)

# Rocks in the water.
for cx, cy, rw, rh in [(232, 204, 30, 7), (300, 220, 22, 6), (352, 197, 12, 4)]:
    path(f'M{f(cx - rw / 2)} {f(cy)}Q{f(cx - rw / 4)} {f(cy - rh)} {f(cx)} {f(cy - rh * 0.8)}'
         f'Q{f(cx + rw / 3)} {f(cy - rh * 1.1)} {f(cx + rw / 2)} {f(cy)}Z', 1, fill=True)

# Shoreline sweeping down to the right, with a little surf.
path('M420 184C446 192 452 204 482 210S540 222 560 238', 1.6)
path('M396 192C420 198 430 210 462 216S520 230 536 240', 1)
for sx, sy in [(430, 204), (468, 222), (506, 234)]:
    path(f'M{sx} {sy}q6 -4 12 0t12 0', 0.9)

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" fill="none" '
       f'stroke="#000" stroke-linecap="round" stroke-linejoin="round">'
       + ''.join(out) + '</svg>\n')
sys.stdout.write(svg)
