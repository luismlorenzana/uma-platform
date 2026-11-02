"""Checks `pane_order` on a small made-up window: `.cache/glass-venv/bin/python -I glass/check_order.py` from
scripts/assets. No original art; it exits non-zero on a failure.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glass  # noqa: E402

# A 12 × 12 window: a frame of two bars (5, 6), two sky panes (3 near her head, 4 far), her figure's two panes (1 high,
# 2 low) and her face (7, a figure pane inside the face mask). The lead is one pixel between the sky panes.
L = np.full((12, 12), 3, np.int32)
L[:, 9:] = 4
L[0, :] = 5
L[11, :] = 6
L[3:6, 3:7] = 1
L[6:10, 3:7] = 2
L[1:3, 4:6] = 7
offset = 2  # labels 1 and 2 are the figure; the face (7) is ranked out by its mask
face = L == 7
border = np.zeros_like(face)
border[0, :] = border[11, :] = True
lead = np.zeros_like(face)
lead[5, 8] = True

order = glass.pane_order(L, face, border, lead, offset, cx=5.0, cy=1.0)
value = {int(i): int(order[L == i][~lead[L == i]][0]) for i in np.unique(L)}

assert order[5, 8] == 0, 'the lead is 0'
assert value[7] == 255, 'the face is 255'
assert all(1 <= value[i] <= 250 for i in (1, 2, 3, 4, 5, 6)), value
assert max(value[5], value[6]) < min(value[3], value[4]), f'the frame before the sky: {value}'
assert value[6] < value[5], f'the frame farthest from her head first: {value}'
assert value[4] < value[3], f'the sky from its rim inward: {value}'
assert max(value[3], value[4]) < min(value[1], value[2]), f'the sky before her figure: {value}'
assert value[2] < value[1], f'her figure from the bottom up: {value}'
assert value[1] == 250, f'the last pane before the face is 250: {value}'
print('pane_order: ok', value)
