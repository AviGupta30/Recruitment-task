import { TransformEngine } from './transformEngine';

export class DrawingEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Main render call.
   * @param {Array}       strokes         - committed freehand strokes
   * @param {Array}       shapes          - committed geometric shapes
   * @param {Object|null} currentPath     - in-progress freehand stroke
   * @param {Object|null} ghostShape      - preview shape following fingertip
   * @param {string|null} selectedId      - id of selected stroke or shape
   * @param {string}      selectedType    - 'stroke' | 'shape' | null
   * @param {string}      controlGesture  - for visual guides
   */
  draw(strokes, shapes = [], currentPath = null, ghostShape = null, selectedId = null, selectedType = null, controlGesture = 'CTRL_IDLE') {
    this.clearCanvas();
    const ctx = this.ctx;

    // ── Freehand strokes ────────────────────────────────────────────────────
    const allStrokes = [...strokes];
    if (currentPath) allStrokes.push(currentPath);

    allStrokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return;
      const points = stroke.transform
        ? TransformEngine.getTransformedPoints(stroke)
        : stroke.points;
      if (points.length < 1) return;

      const isSelected = selectedType === 'stroke' && selectedId !== null && stroke.id === Number(selectedId);

      ctx.save();
      ctx.beginPath();

      if (points.length === 1) {
        ctx.arc(points[0].x, points[0].y, stroke.lineWidth / 2, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#ffffff' : stroke.color;
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);

      ctx.strokeStyle = isSelected ? '#ffffff' : stroke.color;
      ctx.lineWidth   = stroke.lineWidth * (stroke.transform?.scale || 1);
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.shadowBlur  = isSelected ? (stroke.glowIntensity || 15) * 2.5 : (stroke.glowIntensity || 0);
      ctx.shadowColor = isSelected ? '#ffffff' : stroke.color;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      if (isSelected) this._drawSelectionGuides(ctx, points, stroke, controlGesture);
      ctx.restore();
    });

    // ── Geometric shapes ────────────────────────────────────────────────────
    shapes.forEach(shape => {
      if (shape.kind === 'text') {
        const isSelected = selectedType === 'shape' && selectedId !== null && shape.id === Number(selectedId);
        this._drawText(ctx, shape, isSelected, controlGesture);
        return;
      }
      const isSelected = selectedType === 'shape' && selectedId !== null && shape.id === Number(selectedId);
      this._drawShape(ctx, shape, isSelected, controlGesture);
    });

    // ── Ghost shape preview ──────────────────────────────────────────────────
    if (ghostShape) {
      this._drawGhostShape(ctx, ghostShape);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shape rendering
  // ─────────────────────────────────────────────────────────────────────────

  _drawShape(ctx, shape, isSelected = false, controlGesture = 'CTRL_IDLE') {
    const { x, y, size, color, lineWidth, glowIntensity, transform, shapeType } = shape;
    const { tx, ty, scale, rotation } = transform;

    const cx = x + tx;
    const cy = y + ty;
    const r  = size * scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    const drawColor  = isSelected ? '#ffffff' : color;
    const drawGlow   = isSelected ? (glowIntensity || 15) * 2 : (glowIntensity || 10);

    ctx.strokeStyle = drawColor;
    ctx.lineWidth   = lineWidth * scale;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.shadowBlur  = drawGlow;
    ctx.shadowColor = isSelected ? '#ffffff' : color;

    ctx.beginPath();
    this._buildShapePath(ctx, shapeType, r);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (isSelected) {
      // Selection ring
      ctx.beginPath();
      ctx.arc(0, 0, r + 18, 0, 2 * Math.PI);
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Mode indicator dot at top
      ctx.beginPath();
      ctx.arc(0, -(r + 18), 5, 0, 2 * Math.PI);
      ctx.fillStyle = controlGesture === 'CTRL_ROTATE' ? 'rgba(255,165,0,0.9)'
                    : controlGesture === 'CTRL_SCALE'  ? 'rgba(0,255,200,0.9)'
                    : controlGesture === 'CTRL_MOVE'   ? 'rgba(100,180,255,0.9)'
                    : 'rgba(255,255,255,0.6)';
      ctx.fill();
    }

    ctx.restore();
  }

  _drawText(ctx, obj, isSelected = false, controlGesture = 'CTRL_IDLE') {
    const { x, y, text, fontFamily, fontSize, color, transform } = obj;
    const { tx, ty, scale, rotation } = transform;
    const cx = x + tx;
    const cy = y + ty;
    const scaledSize = fontSize * scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    const drawColor = isSelected ? '#ffffff' : color;
    ctx.font        = `600 ${scaledSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle   = drawColor;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur  = isSelected ? 35 : 18;
    ctx.shadowColor = isSelected ? '#ffffff' : color;

    ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0;

    if (isSelected) {
      const metrics = ctx.measureText(text);
      const w = metrics.width + 24;
      const h = scaledSize + 24;
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Control mode dot
      const dotColor = controlGesture === 'CTRL_ROTATE' ? 'rgba(255,165,0,0.9)'
                     : controlGesture === 'CTRL_SCALE'  ? 'rgba(0,255,200,0.9)'
                     : controlGesture === 'CTRL_MOVE'   ? 'rgba(100,180,255,0.9)'
                     : 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(0, -(h / 2 + 10), 5, 0, 2 * Math.PI);
      ctx.fillStyle = dotColor;
      ctx.fill();
    }

    ctx.restore();
  }

  _drawGhostShape(ctx, ghost) {
    const { shapeType, x, y, size, color, lineWidth } = ghost;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineWidth;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.shadowBlur  = 20;
    ctx.shadowColor = color;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    this._buildShapePath(ctx, shapeType, size);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** Build a shape path centred at (0,0) with given radius r. */
  _buildShapePath(ctx, shapeType, r) {
    switch (shapeType) {
      case 'circle':
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        break;

      case 'rectangle':
        ctx.rect(-r, -r * 0.65, r * 2, r * 1.3);
        break;

      case 'triangle':
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.866, r * 0.5);
        ctx.lineTo(-r * 0.866, r * 0.5);
        ctx.closePath();
        break;

      case 'star': {
        const outerR = r, innerR = r * 0.4, points = 5;
        for (let i = 0; i < points * 2; i++) {
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const rad   = i % 2 === 0 ? outerR : innerR;
          i === 0
            ? ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
            : ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
        }
        ctx.closePath();
        break;
      }

      case 'pentagon': {
        const pts = 5;
        for (let i = 0; i < pts; i++) {
          const angle = (i * 2 * Math.PI) / pts - Math.PI / 2;
          i === 0
            ? ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
            : ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        break;
      }

      case 'diamond':
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.6, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.6, 0);
        ctx.closePath();
        break;

      case 'arrow':
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.55, 0);
        ctx.lineTo(r * 0.22, 0);
        ctx.lineTo(r * 0.22, r);
        ctx.lineTo(-r * 0.22, r);
        ctx.lineTo(-r * 0.22, 0);
        ctx.lineTo(-r * 0.55, 0);
        ctx.closePath();
        break;

      default:
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Selection guides for freehand strokes
  // ─────────────────────────────────────────────────────────────────────────

  _drawSelectionGuides(ctx, points, stroke, controlGesture) {
    let cx = 0, cy = 0;
    for (const p of points) { cx += p.x; cy += p.y; }
    cx /= points.length;
    cy /= points.length;

    let maxR = 0;
    for (const p of points) {
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d > maxR) maxR = d;
    }
    const guideRadius = maxR + 20;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, guideRadius, 0, 2 * Math.PI);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    if (controlGesture === 'CTRL_ROTATE') {
      const angle = stroke.transform?.rotation || 0;
      ctx.beginPath();
      ctx.arc(cx, cy, guideRadius + 8, -Math.PI / 2, -Math.PI / 2 + angle, angle < 0);
      ctx.strokeStyle = 'rgba(255,165,0,0.7)';
      ctx.lineWidth   = 3;
      ctx.stroke();
      const ax = cx + (guideRadius + 8) * Math.cos(-Math.PI / 2 + angle);
      const ay = cy + (guideRadius + 8) * Math.sin(-Math.PI / 2 + angle);
      ctx.beginPath(); ctx.arc(ax, ay, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,165,0,0.9)'; ctx.fill();
    } else if (controlGesture === 'CTRL_SCALE') {
      const scale = stroke.transform?.scale || 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, guideRadius * (0.5 + i * 0.2), 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(0,255,200,${0.15 * (4 - i)})`;
        ctx.lineWidth   = 1; ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,255,200,0.8)';
      ctx.font      = '12px monospace';
      ctx.fillText(`${(scale * 100).toFixed(0)}%`, cx - 15, cy - guideRadius - 12);
    } else if (controlGesture === 'CTRL_MOVE') {
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(100,180,255,0.6)'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
      ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
      ctx.strokeStyle = 'rgba(100,180,255,0.5)';
      ctx.lineWidth   = 1; ctx.stroke();
    }
    ctx.restore();
  }

  saveAsImage() {
    return this.canvas.toDataURL('image/png');
  }
}
