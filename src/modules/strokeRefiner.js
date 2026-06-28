/**
 * StrokeRefiner — detects if a freehand stroke looks like a geometric shape
 * and returns the cleaned-up shape parameters.
 *
 * Detects: circle, triangle, rectangle (square).
 * Returns null if the stroke doesn't confidently match anything.
 */
export class StrokeRefiner {
  /**
   * @param {Array<{x,y}>} points - raw freehand stroke points
   * @returns {{ shapeType, x, y, size } | null}
   */
  static refine(points) {
    if (!points || points.length < 10) return null;

    // ── Bounding box ───────────────────────────────────────────────────────
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    const span = Math.max(maxX - minX, maxY - minY);
    if (span < 60) return null; // too small

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // ── Closure check (is the stroke roughly closed?) ─────────────────────
    const closeDist = Math.hypot(
      points[0].x - points[points.length - 1].x,
      points[0].y - points[points.length - 1].y,
    );
    const isClosed = closeDist < span * 0.32;

    // ── 1. Circle ─────────────────────────────────────────────────────────
    if (isClosed) {
      const result = StrokeRefiner._tryCircle(points, cx, cy, span);
      if (result) return result;
    }

    // ── 2. Polygon (triangle / rectangle) ─────────────────────────────────
    if (isClosed) {
      const simplified = StrokeRefiner._simplify(points, span * 0.09);
      // Remove the trailing closure point if it's near the start
      const lastNearFirst = Math.hypot(
        simplified[0].x - simplified[simplified.length - 1].x,
        simplified[0].y - simplified[simplified.length - 1].y,
      ) < span * 0.2;
      const uniquePts = lastNearFirst ? simplified.slice(0, -1) : simplified;
      const n = uniquePts.length;

      if (n === 3) {
        const tri = StrokeRefiner._tryTriangle(uniquePts);
        if (tri) return tri;
      }
      if (n === 4) {
        const rect = StrokeRefiner._tryRectangle(uniquePts);
        if (rect) return rect;
        // Could still be a loose triangle
        const tri = StrokeRefiner._tryTriangle(uniquePts.slice(0, 3));
        if (tri) return tri;
      }
      if (n === 5) {
        const rect = StrokeRefiner._tryRectangle(uniquePts.slice(0, 4));
        if (rect) return rect;
      }
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shape detectors
  // ─────────────────────────────────────────────────────────────────────────

  static _tryCircle(points, cx, cy, span) {
    const dists = points.map(p => Math.hypot(p.x - cx, p.y - cy));
    const mean = dists.reduce((a, b) => a + b, 0) / dists.length;
    if (mean < 20) return null;
    const variance = dists.reduce((acc, d) => acc + (d - mean) ** 2, 0) / dists.length;
    const stddev = Math.sqrt(variance);
    const circularity = 1 - stddev / mean;

    if (circularity > 0.82) {
      return { shapeType: 'circle', x: cx, y: cy, size: mean };
    }
    return null;
  }

  static _tryTriangle(pts) {
    if (pts.length < 3) return null;
    const corners = pts.slice(0, 3);
    for (let i = 0; i < 3; i++) {
      const a = corners[(i + 2) % 3];
      const b = corners[i];
      const c = corners[(i + 1) % 3];
      const ang = StrokeRefiner._angleDeg(a, b, c);
      if (ang < 18 || ang > 152) return null; // degenerate
    }
    let cx = 0, cy = 0;
    for (const p of corners) { cx += p.x; cy += p.y; }
    cx /= 3; cy /= 3;
    let size = 0;
    for (const p of corners) size = Math.max(size, Math.hypot(p.x - cx, p.y - cy));
    return { shapeType: 'triangle', x: cx, y: cy, size };
  }

  static _tryRectangle(pts) {
    if (pts.length < 4) return null;
    const corners = pts.slice(0, 4);
    for (let i = 0; i < 4; i++) {
      const a = corners[(i + 3) % 4];
      const b = corners[i];
      const c = corners[(i + 1) % 4];
      const ang = StrokeRefiner._angleDeg(a, b, c);
      if (ang < 55 || ang > 125) return null; // not ~90°
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of corners) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const size = Math.max(maxX - minX, maxY - minY) / 2;
    return { shapeType: 'rectangle', x: cx, y: cy, size };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Math helpers
  // ─────────────────────────────────────────────────────────────────────────

  static _angleDeg(A, B, C) {
    const BAx = A.x - B.x, BAy = A.y - B.y;
    const BCx = C.x - B.x, BCy = C.y - B.y;
    const dot = BAx * BCx + BAy * BCy;
    const mag = Math.hypot(BAx, BAy) * Math.hypot(BCx, BCy);
    if (mag < 0.001) return 90;
    return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI);
  }

  /** Ramer–Douglas–Peucker polyline simplification */
  static _simplify(pts, epsilon) {
    if (pts.length <= 2) return pts;
    let maxD = 0, idx = 1;
    const first = pts[0], last = pts[pts.length - 1];
    for (let i = 1; i < pts.length - 1; i++) {
      const d = StrokeRefiner._distToSeg(pts[i], first, last);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > epsilon) {
      const L = StrokeRefiner._simplify(pts.slice(0, idx + 1), epsilon);
      const R = StrokeRefiner._simplify(pts.slice(idx), epsilon);
      return [...L.slice(0, -1), ...R];
    }
    return [first, last];
  }

  static _distToSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
}
