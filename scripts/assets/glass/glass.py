"""A bust portrait becomes a leaded window (docs/master-data.md#art, P81).

Pure image code: an RGBA bust and the Uma's two colours in, an RGB window out. bake.py runs it over the roster and
src/glass.ts decides what needs baking. Voronoi and superpixel filters ruin anime faces, so this works as a real window
is made: cel-shading bands become pieces, large pieces are cut along the hair, and the face stays one sheet with the art
kept on it as enamel.
"""
import cv2
import numpy as np
from scipy import ndimage as ndi
from skimage import color, measure, segmentation

SIZE = 1024


def keep_main(mask):
    """Drops crumbs of other limbs the square happened to catch."""
    lbl, n = ndi.label(mask)
    if n < 2:
        return mask
    area = np.bincount(lbl.ravel(), minlength=n + 1)
    area[0] = 0
    keep = np.nonzero(area >= max(area.max() * 0.04, mask.size * 0.015))[0]
    return np.isin(lbl, keep)


def upscale(rgba, size=SIZE):
    a = rgba[..., 3].astype(np.float32) / 255
    rgb = rgba[..., :3].astype(np.float32)
    idx = ndi.distance_transform_edt(a < 0.5, return_distances=False, return_indices=True)
    rgb = rgb[idx[0], idx[1]]
    rgb = cv2.resize(rgb, (size, size), interpolation=cv2.INTER_CUBIC)
    alpha = cv2.resize(a, (size, size), interpolation=cv2.INTER_CUBIC)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 3.0)
    return np.clip(rgb, 0, 255).astype(np.uint8), keep_main(alpha > 0.5)


def smooth_art(rgb):
    out = cv2.bilateralFilter(rgb, 9, 22, 7)
    out = cv2.pyrMeanShiftFiltering(out[..., ::-1], 13, 22)[..., ::-1]
    return cv2.bilateralFilter(out, 9, 14, 7)


def ink_lines(gray, sigma=1.3, k=2.2, eps=0.016, phi=34):
    """Only what is drawn darker than its surroundings, so shading and blush stay clean."""
    g = gray.astype(np.float32) / 255
    d = cv2.GaussianBlur(g, (0, 0), sigma) - cv2.GaussianBlur(g, (0, 0), sigma * k)
    return np.clip(-(d + eps) * phi, 0, 1)


def quantize(lab, mask, n):
    pts = lab[mask].astype(np.float32)
    rng = np.random.default_rng(7)
    sample = pts[rng.choice(len(pts), min(40000, len(pts)), replace=False)]
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.3)
    cv2.setRNGSeed(7)
    _, _, centers = cv2.kmeans(sample, n, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    d = ((lab[..., None, :].astype(np.float32) - centers[None, None]) ** 2).sum(-1)
    return cv2.medianBlur(d.argmin(-1).astype(np.uint8), 9)


def components(q, mask):
    L = np.zeros(q.shape, np.int32)
    next_id = 1
    for c in np.unique(q[mask]):
        lab_c, n = ndi.label((q == c) & mask)
        L[lab_c > 0] = lab_c[lab_c > 0] + next_id - 1
        next_id += n
    return L


def means(L, lab):
    n = L.max() + 1
    area = np.bincount(L.ravel(), minlength=n).astype(np.float64)
    m = np.stack([np.bincount(L.ravel(), lab[..., i].ravel(), minlength=n) for i in range(3)], 1)
    return area, m / np.maximum(area[:, None], 1)


def merge_small(L, lab, min_area, line=None, rounds=40, keep=26):
    """Folds pieces under min_area into the nearest neighbour by colour; a drawn line between two pieces costs extra."""
    for _ in range(rounds):
        area, mean = means(L, lab)
        small = [r for r in np.argsort(area) if r != 0 and 0 < area[r] < min_area]
        if not small:
            break
        taken = set()
        objects = ndi.find_objects(L)
        for r in small:
            if r in taken or objects[r - 1] is None:
                continue
            sl = objects[r - 1]
            box = tuple(slice(max(0, s.start - 2), s.stop + 2) for s in sl)
            sub = L[box]
            m = sub == r
            ring = cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~m
            ids, counts = np.unique(sub[ring], return_counts=True)
            best, cost = None, 1e18
            for i, c in zip(ids, counts):
                if i == 0 or i in taken:
                    continue
                d = np.linalg.norm(mean[r] - mean[i]) - 0.05 * min(c, 60)
                if line is not None:
                    d += 22 * line[box][ring & (sub == i)].mean()
                if d < cost:
                    best, cost = i, d
            if best is not None and not (area[r] >= min_area * 0.28 and cost > keep):
                sub[m] = best
                taken.add(r)
                taken.add(best)
    return measure.label(L, connectivity=1, background=0)


def merge_similar(L, lab, line, limit=13.0, rounds=12):
    """Shading bands of one colour become one sheet, unless a drawn line really divides them."""
    for _ in range(rounds):
        area, mean = means(L, lab)
        h = np.stack([L[:-1, :].ravel(), L[1:, :].ravel()], 1)
        v = np.stack([L[:, :-1].ravel(), L[:, 1:].ravel()], 1)
        pairs = np.concatenate([h, v])
        ink = np.concatenate([np.maximum(line[:-1, :], line[1:, :]).ravel(), np.maximum(line[:, :-1], line[:, 1:]).ravel()])
        keep = (pairs[:, 0] != pairs[:, 1]) & (pairs[:, 0] > 0) & (pairs[:, 1] > 0)
        pairs, ink = pairs[keep], ink[keep]
        lo, hi = pairs.min(1), pairs.max(1)
        key = lo.astype(np.int64) * (L.max() + 1) + hi
        uniq, inv, counts = np.unique(key, return_inverse=True, return_counts=True)
        mean_ink = np.bincount(inv, ink) / counts
        a_, b_ = uniq // (L.max() + 1), uniq % (L.max() + 1)
        d = np.linalg.norm(mean[a_] - mean[b_], axis=1) + mean_ink * 26
        pale = np.clip((np.minimum(mean[a_, 0], mean[b_, 0]) - 62) / 18, 0, 1)
        d = d * (1 - pale * 0.42)
        parent = np.arange(L.max() + 1)
        taken = np.zeros(L.max() + 1, bool)
        merged = 0
        for i in np.argsort(d):
            if d[i] >= limit:
                break
            a, b = a_[i], b_[i]
            if taken[a] or taken[b]:
                continue
            parent[b] = a
            taken[a] = taken[b] = True
            merged += 1
        L = parent[L]
        if merged == 0:
            break
    return measure.label(L, connectivity=1, background=0)


def flow_field(gray, sigma=12):
    """The direction strands run: across the strongest local gradient, averaged by a structure tensor."""
    g = cv2.GaussianBlur(gray.astype(np.float32), (0, 0), 1.6)
    ix = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
    iy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    j11 = cv2.GaussianBlur(ix * ix, (0, 0), sigma)
    j12 = cv2.GaussianBlur(ix * iy, (0, 0), sigma)
    j22 = cv2.GaussianBlur(iy * iy, (0, 0), sigma)
    theta = 0.5 * np.arctan2(2 * j12, j11 - j22)
    return np.cos(theta), np.sin(theta)  # across strands; along strands is (-sin, cos)


def trace(x, y, fx, fy, inside, sign, step=4.0, steps=260):
    h, w = inside.shape
    pts = [(x, y)]
    px, py = 0.0, 0.0
    for _ in range(steps):
        i, j = int(y), int(x)
        vx, vy = fx[i, j], fy[i, j]
        if px == 0 and py == 0:
            vx, vy = vx * sign, vy * sign
        elif vx * px + vy * py < 0:
            vx, vy = -vx, -vy
        px, py = vx, vy
        x, y = x + vx * step, y + vy * step
        pts.append((x, y))
        if not (0 <= int(x) < w and 0 <= int(y) < h) or not inside[int(y), int(x)]:
            break
    return pts


def cut_region(m, ax, ay, bx, by, min_area, strip=40):
    """One cut through a piece's widest point: along the strands if it's wide, across them if it's a long strip."""
    dist = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 5)
    y, x = np.unravel_index(dist.argmax(), dist.shape)
    wide = dist[y, x] * 2 > strip
    fx, fy = (ax, ay) if wide else (bx, by)
    pts = trace(float(x), float(y), fx, fy, m, 1)[::-1] + trace(float(x), float(y), fx, fy, m, -1)
    cut = np.zeros(m.shape, np.uint8)
    cv2.polylines(cut, [np.round(np.array(pts)).astype(np.int32)], False, 1, 3)
    lbl, n = ndi.label(m & (cut == 0))
    if n < 2:
        return None
    area = np.bincount(lbl.ravel())[1:]
    if np.sort(area)[-2] < min_area:
        return None
    idx = ndi.distance_transform_edt(lbl == 0, return_distances=False, return_indices=True)
    return lbl[idx[0], idx[1]] * m


def split_flow(L, gray, max_area, min_area, line):
    """Big pieces can't come from one sheet: cut them where a glazier would, along the hair and across long strips."""
    bx, by = flow_field(gray)
    ax, ay = -by, bx
    out = L.copy()
    next_id = L.max() + 1
    stack = [int(r) for r in np.nonzero(np.bincount(L.ravel()) > max_area)[0] if r != 0]
    guard = 0
    while stack and guard < 800:
        guard += 1
        r = stack.pop()
        m = out == r
        area = int(m.sum())
        if area <= max_area:
            continue
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        box = (slice(y0, y1), slice(x0, x1))
        res = cut_region(m[box], ax[box], ay[box], bx[box], by[box], min_area)
        if res is None:
            n = max(2, int(round(area / (max_area * 0.7))))
            res = segmentation.slic(np.dstack([m[box].astype(np.float32)] * 3), n_segments=n, compactness=0.2, mask=m[box], sigma=0, start_label=1)
        ids = [i for i in np.unique(res) if i != 0]
        if len(ids) < 2:
            continue
        sub = out[box]
        for i in ids[1:]:
            sub[res == i] = next_id
            stack.append(next_id)
            next_id += 1
        stack.append(r)
    return out


def smooth_labels(L, sigma):
    best = np.zeros(L.shape, np.float32)
    out = L.copy()
    pad = int(3 * sigma) + 2
    for i, sl in enumerate(ndi.find_objects(L), 1):
        if sl is None:
            continue
        box = tuple(slice(max(0, s.start - pad), s.stop + pad) for s in sl)
        g = cv2.GaussianBlur((L[box] == i).astype(np.float32), (0, 0), sigma)
        better = g > best[box]
        best[box][better] = g[better]
        out[box][better] = i
    return out


def best_chunk(skin, h):
    """The chunk of skin most like a face: big, in the upper middle, round, clear of the crop's edge. Arms are none of these."""
    wide = cv2.morphologyEx(skin, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45)))
    lbl, n = ndi.label(wide)
    if n == 0:
        return None
    score = np.bincount(lbl.ravel(), minlength=n + 1).astype(np.float64)
    score[0] = 0
    objects = ndi.find_objects(lbl)
    for i, (cy, _) in enumerate(ndi.center_of_mass(wide, lbl, range(1, n + 1)), 1):
        score[i] *= np.clip(1.25 - abs(cy / h - 0.55) * 3, 0.05, 1)
        sl = objects[i - 1]
        tall, broad = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if sl[0].start <= 2 or sl[1].start <= 2 or sl[0].stop >= h - 2 or sl[1].stop >= h - 2:
            score[i] *= 0.15
        if max(tall, broad) > 1.7 * min(tall, broad):
            score[i] *= 0.3
    return lbl == score.argmax()


def face_mask(lab, mask, pin=None):
    """Skin near the head, cut free of the neck and fringe by shape, not by rows, so a tilted head works too."""
    h = mask.shape[0]
    if pin:
        out = np.zeros(mask.shape, np.uint8)
        cv2.ellipse(out, (round(pin['cx'] * h), round(pin['cy'] * h)), (round(pin['rx'] * h), round(pin['ry'] * h)), pin.get('tilt', 0), 0, 360, 1, -1)
        return out.astype(bool) & mask
    L_, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    opened = lambda m: cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    skin = opened((L_ > 66) & (a > 1) & (a < 28) & (b > 2) & (b < 36) & mask)
    core = best_chunk(skin, h)
    if core is None:
        return np.zeros(mask.shape, bool)
    hull = np.zeros(mask.shape, np.uint8)
    cv2.fillConvexPoly(hull, cv2.convexHull(cv2.findNonZero(core.astype(np.uint8))), 1)
    grown = cv2.dilate(hull, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))).astype(bool)
    # The jaw is convex, so the hull draws it; the top follows the skin, so the fringe stays cut in lead.
    closed = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))).astype(bool)
    rows = np.nonzero(hull.any(1))[0]
    brow = int(rows[0] + (rows[-1] - rows[0]) * 0.24)
    out = cv2.dilate(hull, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))).astype(bool)
    out[:brow] = (closed & grown)[:brow]
    smooth = cv2.morphologyEx(out.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))).astype(bool)
    return ndi.binary_fill_holes(smooth) & mask


def hex_lab(h):
    rgb = np.array([[[int(h[i:i + 2], 16) for i in (0, 2, 4)]]], np.uint8)
    return color.rgb2lab(rgb)[0, 0]


def pick_tones(lab, mask, face, main, sub):
    """The background takes whichever of her two colours sits furthest from her hair, so the figure stands clear."""
    body = mask & ~face
    fig = lab[body].mean(0)
    def score(c):
        cos = (c[1:] @ fig[1:]) / max(np.hypot(*c[1:]) * np.hypot(*fig[1:]), 1e-3)
        return np.hypot(*(c[1:] - fig[1:])) * (1 - 0.5 * cos)
    return (main, sub) if score(main) >= score(sub) else (sub, main)


def glass_lab(mean, rng, night=(7.0, -24.0)):
    """Backlit glass: black stays near black with a night-blue depth, the middle tones get the most colour."""
    L_, a, b = mean[:, 0], mean[:, 1], mean[:, 2]
    C = np.hypot(a, b)
    dark = np.clip((60 - L_) / 28, 0, 1)
    neutral = np.clip((24 - C) / 18, 0, 1)
    w = dark * neutral
    bright = 12 + 0.92 * L_ + 3 * np.sin(L_ / 100 * np.pi)
    deep = 9 + 0.82 * L_
    L2 = bright * (1 - w) + deep * w
    gain = 1.3 + 0.5 * np.sin(np.clip(L_, 0, 100) / 100 * np.pi)
    a2 = a * gain * (1 - w) + night[0] * w
    b2 = b * gain * (1 - w) + night[1] * w
    jitter = rng.normal(0, 1, (len(L_), 3)) * [2.6, 2.0, 2.0]
    return np.stack([np.clip(L2 + jitter[:, 0], 0, 97), a2 + jitter[:, 1], b2 + jitter[:, 2]], 1)


def enamel_lab(lab, night=(7.0, -24.0)):
    """Paint on the face sheet: pale skin gains colour, tanned skin keeps its own, and dark hair meets the glass beside it."""
    L_, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.hypot(a, b)
    dark = np.clip((60 - L_) / 28, 0, 1)
    neutral = np.clip((24 - C) / 18, 0, 1)
    w = dark * neutral
    gain = 1 + 0.25 * np.clip((36 - C) / 16, 0, 1)
    light = 9 + 0.92 * L_
    deep = 9 + 0.82 * L_
    return np.stack([light * (1 - w) + deep * w, a * gain * (1 - w) + night[0] * w, b * gain * (1 - w) + night[1] * w], -1)


def noise(shape, cells, rng):
    n = rng.random((cells, cells), dtype=np.float32)
    return cv2.resize(n, shape[::-1], interpolation=cv2.INTER_CUBIC)


def mottle(shape, rng):
    f = sum(noise(shape, c, rng) * w for c, w in ((9, 1.0), (23, 0.6), (61, 0.35), (160, 0.18)))
    f = f - f.mean()
    return f / f.std()


def streaks(shape, rng, angles=6):
    fields = []
    big = int(max(shape) * 1.5)
    for i in range(angles):
        n = rng.random((big, big), dtype=np.float32)
        n = cv2.GaussianBlur(n, (0, 0), sigmaX=34, sigmaY=1.6)
        rot = cv2.getRotationMatrix2D((big / 2, big / 2), 180 * i / angles, 1)
        n = cv2.warpAffine(n, rot, (big, big), borderMode=cv2.BORDER_REFLECT)
        o = (big - shape[0]) // 2
        n = n[o:o + shape[0], o:o + shape[1]]
        fields.append((n - n.mean()) / n.std())
    return fields


def tone_at(tone, L_, chroma):
    h = np.arctan2(tone[2], tone[1])
    return np.array([L_, np.cos(h) * chroma, np.sin(h) * chroma], np.float64)


def background(size, cx, cy, tone, accent, rng, border=44):
    """A sunburst from behind her head: palest at the centre, deepening toward a border of short bars."""
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    dx, dy = xx - cx, yy - cy
    r = np.hypot(dx, dy)
    th = (np.arctan2(dy, dx) + np.pi) / (2 * np.pi)
    labels = np.zeros((size, size), np.int32)
    colours = {}
    nid = 1
    rings = [0, 300, 430, 560, 700, 2000]
    wedges = [18, 24, 30, 36, 42]
    light = [86, 76, 65, 54, 44]
    chroma = [34, 52, 66, 70, 62]
    for i in range(5):
        m = (r >= rings[i]) & (r < rings[i + 1])
        sect = np.floor((th + (0.5 / wedges[i]) * (i % 2)) % 1 * wedges[i]).astype(np.int32)
        for s in range(wedges[i]):
            part = m & (sect == s)
            if part.any():
                labels[part] = nid
                colours[nid] = tone_at(tone, light[i] + (6 if s % 2 else -6) + rng.normal(0, 1.5), chroma[i])
                nid += 1

    b = border
    outer = (xx < b) | (yy < b) | (xx >= size - b) | (yy >= size - b)
    corner = ((xx < b) | (xx >= size - b)) & ((yy < b) | (yy >= size - b))
    bars = 12
    span = (size - 2 * b) / bars
    deep = tone_at(accent if np.hypot(*accent[1:]) > 18 else tone, 40, 44)
    pale = tone_at(tone, 76, 44)
    for side, (m, pos) in enumerate((
        (yy < b, xx), (yy >= size - b, xx), (xx < b, yy), (xx >= size - b, yy),
    )):
        idx = np.floor((pos - b) / span).astype(np.int32)
        for i in range(bars):
            part = outer & ~corner & m & (idx == i)
            if part.any():
                labels[part] = nid
                colours[nid] = (pale if i % 2 == 0 else deep) + rng.normal(0, 1, 3) * [2, 1.5, 1.5]
                nid += 1
    for qx, qy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        part = corner & ((xx >= size / 2) == bool(qx)) & ((yy >= size / 2) == bool(qy))
        labels[part] = nid
        colours[nid] = np.array([86, 2, 62], np.float64)
        nid += 1
    return labels, colours, outer


def pane_order(labels, face, border, lead, offset, cx, cy):
    """Each pane's place in the reveal (`outfit-glass-order`, P84): 0 the lead, 255 the face, 1–250 the rest, outside in.

    The frame first, then the glass behind her from its rim toward her head, then her figure from the bottom up. A game
    lights every pane at or under 250 × lit ÷ (steps − 1), and the face with the last step.
    """
    n = int(labels.max()) + 1
    flat = labels.ravel()
    ys, xs = np.mgrid[0:labels.shape[0], 0:labels.shape[1]]
    area = np.bincount(flat, minlength=n).astype(np.float64)
    my = np.bincount(flat, ys.ravel(), minlength=n) / np.maximum(area, 1)
    mx = np.bincount(flat, xs.ravel(), minlength=n) / np.maximum(area, 1)
    in_face = (np.bincount(flat, face.ravel().astype(np.float64), minlength=n) > 0.5 * area) & (area > 0)
    framed = np.bincount(flat, border.ravel().astype(np.float64), minlength=n) > 0
    r = np.hypot(mx - cx, my - cy)

    def key(i):
        if i <= offset:
            return (2, -my[i], i)
        return (0 if framed[i] else 1, -r[i], i)

    ranked = sorted((i for i in range(1, n) if area[i] > 0 and not in_face[i]), key=key)
    value = np.zeros(n, np.uint8)
    for rank, i in enumerate(ranked):
        value[i] = int(np.ceil(250 * (rank + 1) / len(ranked)))
    value[in_face] = 255
    order = value[labels]
    order[lead] = 0
    return order


def render(rgba, main_hex, sub_hex, seed=3, n_colors=22, min_area=800, max_area=11000, sigma=4.5, pin=None):
    """The window, its pane map, and how it went: `face_share` outside about 0.03–0.2 means the face was misread and
    wants a pin."""
    rng = np.random.default_rng(seed)
    rgb, mask = upscale(rgba)
    soft = smooth_art(rgb)
    lab = color.rgb2lab(soft).astype(np.float32)
    gray = cv2.cvtColor(soft, cv2.COLOR_RGB2GRAY)
    line = ink_lines(gray)
    face = face_mask(lab, mask, pin)

    # Pieces: cel shading gives bands of near-flat colour, and each band is a natural piece of glass.
    L = components(quantize(lab, mask, n_colors), mask)
    L = merge_small(L, lab, min_area, line)
    L = merge_similar(L, lab, line)
    L = split_flow(L, gray, max_area, min_area, line)
    L = measure.label(L, connectivity=1, background=0)
    L = merge_small(L, lab, min_area, line)
    L = smooth_labels(L, sigma)

    # The face is one sheet with its features painted on, as a real window does it.
    if face.any():
        reach = cv2.dilate(face.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (71, 71))).astype(bool)
        sizes = np.bincount(L.ravel())
        near = np.bincount(L[reach], minlength=len(sizes))
        join = np.nonzero((sizes < 7000) & (near > sizes * 0.6))[0]
        join = join[join != 0]
        face = face | np.isin(L, join)
        face = cv2.morphologyEx(face.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)).astype(bool) & mask
        L[face] = L.max() + 1
    L = measure.label(L, connectivity=1, background=0)
    L = merge_small(L, lab, min_area // 2, line)
    L = smooth_labels(L, sigma * 0.75)
    fig = L > 0

    ys, xs = np.nonzero(face if face.any() else mask)
    cx, cy = float(xs.mean()), float(ys.mean()) - 90
    tone, accent = pick_tones(lab, mask, face, hex_lab(main_hex), hex_lab(sub_hex))
    bg, bg_col, border = background(SIZE, cx, cy, tone, accent, rng)

    labels = L.copy()
    offset = L.max()
    labels[~fig] = bg[~fig] + offset
    labels[border] = bg[border] + offset
    edge_in = segmentation.find_boundaries(labels, mode='inner')
    edge_fig = segmentation.find_boundaries(fig & ~border, mode='inner')
    d_in = cv2.distanceTransform((~edge_in).astype(np.uint8), cv2.DIST_L2, 5)
    d_fig = cv2.distanceTransform((~edge_fig).astype(np.uint8), cv2.DIST_L2, 5)
    lead = (d_in < 2.6) | (d_fig < 5.0)
    d_border = cv2.distanceTransform((~segmentation.find_boundaries(border, mode='inner')).astype(np.uint8), cv2.DIST_L2, 5)
    lead |= d_border < 6.5
    lead |= cv2.distanceTransform(np.pad(np.ones((SIZE - 2, SIZE - 2), np.uint8), 1), cv2.DIST_L2, 5) < 9

    area, mean = means(labels, lab)
    gl = glass_lab(mean, rng)
    for k, c in bg_col.items():
        if k + offset < len(gl):
            gl[k + offset] = c
    glass = gl[labels]

    # Light through the sheet: mottling, one streak direction a piece, and dimming toward the lead.
    mot = mottle((SIZE, SIZE), rng)
    fields = streaks((SIZE, SIZE), rng)
    pick = rng.integers(0, len(fields), len(gl))
    streak = np.zeros((SIZE, SIZE), np.float32)
    for i, f in enumerate(fields):
        m = pick[labels] == i
        streak[m] = f[m]
    d_glass = cv2.distanceTransform((~lead).astype(np.uint8), cv2.DIST_L2, 5)
    glow = 1 - 0.24 * np.exp(-d_glass / 14)
    face_soft = cv2.GaussianBlur(face.astype(np.float32), (0, 0), 3.0) if face.any() else np.zeros(mask.shape, np.float32)
    grain = 1 - 0.6 * face_soft
    glass[..., 0] = glass[..., 0] * glow + (mot * 2.8 + streak * 1.0) * grain

    # Paint: on the face the original survives as enamel; elsewhere only its heaviest lines do.
    enamel = enamel_lab(color.rgb2lab(cv2.GaussianBlur(cv2.bilateralFilter(rgb, 9, 26, 7), (0, 0), 1.1)).astype(np.float32))
    glass = glass * (1 - face_soft[..., None] * 0.94) + enamel * (face_soft[..., None] * 0.94)
    fine = cv2.cvtColor(cv2.bilateralFilter(rgb, 7, 20, 5), cv2.COLOR_RGB2GRAY)
    ink = ink_lines(fine, sigma=1.0) * face_soft * 0.85
    glass[..., 0] *= 1 - ink

    out = np.clip(color.lab2rgb(glass.astype(np.float64)), 0, 1).astype(np.float32)

    # Lead: dark, with a thin sheen where it faces the light.
    soft_lead = cv2.GaussianBlur(lead.astype(np.float32), (0, 0), 2.2)
    gx = cv2.Sobel(soft_lead, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(soft_lead, cv2.CV_32F, 0, 1, ksize=3)
    sheen = np.clip((gx + gy) * 0.5, 0, 1)
    came = np.array([0.06, 0.065, 0.08], np.float32) + sheen[..., None] * 0.2
    lead_a = cv2.GaussianBlur(lead.astype(np.float32), (0, 0), 0.7)[..., None]
    out = out * (1 - lead_a) + came * lead_a

    # Bloom: the brightest glass spills a little.
    bright = np.clip(out - 0.55, 0, 1)
    out = 1 - (1 - out) * (1 - cv2.GaussianBlur(bright, (0, 0), 18) * 0.7)
    out8 = (np.clip(out, 0, 1) * 255).astype(np.uint8)
    order = pane_order(labels, face, border, lead, offset, cx, cy)
    return out8, order, {'pieces': int(len(np.unique(labels))), 'face_share': round(float(face.mean()), 3)}
