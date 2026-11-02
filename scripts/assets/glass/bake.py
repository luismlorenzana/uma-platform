"""Bakes the outfit-glass family and its pane maps (`outfit-glass-order`): `bake.py <jobs.json>`. src/glass.ts writes
the jobs and reads one JSON result a line.

One process a core, each on one thread, so the same job gives the same bytes every time.
"""
import json
import os
import sys
import warnings
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image

import glass


def bake(job):
    warnings.filterwarnings('ignore')  # lab2rgb reports clipped colours, which is fine for a window
    cv2.setNumThreads(1)
    try:
        box = job['box']
        rgba = np.array(Image.open(job['source']).convert('RGBA'))
        rgba = rgba[box['top']:box['top'] + box['size'], box['left']:box['left'] + box['size']]
        out, order, stats = glass.render(rgba, job['main'], job['sub'], pin=job['pin'])
        temporary = f"{job['out']}.tmp"
        Image.fromarray(out).resize((job['size'], job['size']), Image.LANCZOS).save(temporary, format='WEBP', quality=job['quality'], method=6)
        os.replace(temporary, job['out'])
        # The map keeps one value a pane, so it shrinks by nearest neighbour; the lead hides the seams.
        temporary = f"{job['order']}.tmp"
        Image.fromarray(order).resize((job['size'], job['size']), Image.NEAREST).convert('RGB').save(temporary, format='WEBP', lossless=True, quality=100, method=6)
        os.replace(temporary, job['order'])
        return {'id': job['id'], **stats}
    except Exception as error:
        return {'id': job['id'], 'error': repr(error)}


if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf-8') as file:
        jobs = json.load(file)
    with Pool(min(os.cpu_count() or 4, 8)) as pool:
        for result in pool.imap_unordered(bake, jobs):
            print(json.dumps(result), flush=True)
