/**
 * TransformEngine: Applies non-destructive move/scale/rotate transforms
 * to both freehand strokes AND geometric shapes.
 */
export class TransformEngine {
  constructor(strokeManager, shapeManager = null) {
    this.strokeManager = strokeManager;
    this.shapeManager = shapeManager;

    // Selection state
    this.selectedId   = null;
    this.selectedType = null; // 'stroke' | 'shape'
    this.lastX = null;
    this.lastY = null;
    this.moveThreshold = 80; // px

    // Inertia
    this.velocityX    = 0;
    this.velocityY    = 0;
    this.inertiaDecay = 0.92;
    this.inertiaActive = false;
    this._inertiaFrame = null;
  }

  // ─── backward-compat alias ────────────────────────────────────────────────
  get selectedStrokeId() { return this.selectedType === 'stroke' ? this.selectedId : null; }
  getSelectedStrokeId()  { return this.selectedType === 'stroke' ? this.selectedId : null; }
  getSelectedShapeId()   { return this.selectedType === 'shape'  ? this.selectedId : null; }
  getSelectedId()        { return this.selectedId; }
  getSelectedType()      { return this.selectedType; }

  // ========================
  // SELECTION
  // ========================

  selectNearest(x, y) {
    if (this.selectedId !== null) return; // already holding

    let closestId   = null;
    let closestType = null;
    let closestDist = this.moveThreshold;

    // --- Check strokes ---
    for (const stroke of this.strokeManager.getAllStrokes()) {
      const tPoints = TransformEngine.getTransformedPoints(stroke);
      for (let i = 0; i < tPoints.length - 1; i++) {
        const d = this._distToSegment(x, y, tPoints[i].x, tPoints[i].y, tPoints[i+1].x, tPoints[i+1].y);
        if (d < closestDist) { closestDist = d; closestId = stroke.id; closestType = 'stroke'; }
      }
      if (tPoints.length === 1) {
        const d = Math.hypot(x - tPoints[0].x, y - tPoints[0].y);
        if (d < closestDist) { closestDist = d; closestId = stroke.id; closestType = 'stroke'; }
      }
    }

    // --- Check shapes ---
    if (this.shapeManager) {
      for (const shape of this.shapeManager.getAllShapes()) {
        const cx = shape.x + shape.transform.tx;
        const cy = shape.y + shape.transform.ty;
        const d  = Math.hypot(x - cx, y - cy);
        // A shape is selectable if the pointer is within its bounding radius
        const bounding = shape.size * shape.transform.scale + 40;
        if (d < bounding && d < closestDist + bounding) {
          closestDist = d;
          closestId   = shape.id;
          closestType = 'shape';
        }
      }
    }

    if (closestId !== null) {
      this.selectedId   = closestId;
      this.selectedType = closestType;
      this.lastX = x;
      this.lastY = y;
      this._stopInertia();
    }
  }

  // ========================
  // MOVE
  // ========================

  handleMove(x, y) {
    if (this.selectedId === null) {
      this.selectNearest(x, y);
      return;
    }

    const item = this._getSelected();
    if (!item) return;

    if (this.lastX !== null && this.lastY !== null) {
      const dx = x - this.lastX;
      const dy = y - this.lastY;
      item.transform.tx += dx;
      item.transform.ty += dy;
      this.velocityX = dx;
      this.velocityY = dy;
    }
    this.lastX = x;
    this.lastY = y;
  }

  // ========================
  // SCALE
  // ========================

  handleScale(pinchDelta) {
    if (this.selectedId === null) return;
    const item = this._getSelected();
    if (!item) return;

    const scaleFactor = 1 + (pinchDelta * 8);
    item.transform.scale *= scaleFactor;
    item.transform.scale = Math.max(0.1, Math.min(5, item.transform.scale));
  }

  // ========================
  // ROTATE
  // ========================

  handleRotate(angleDelta) {
    if (this.selectedId === null) return;
    const item = this._getSelected();
    if (!item) return;
    item.transform.rotation += angleDelta;
  }

  snapRotation() {
    if (this.selectedId === null) return;
    const item = this._getSelected();
    if (!item) return;
    const snap = Math.PI / 4;
    item.transform.rotation = Math.round(item.transform.rotation / snap) * snap;
  }

  // ========================
  // RELEASE + INERTIA
  // ========================

  releaseAll() {
    if (this.selectedId !== null) {
      this.snapRotation();
      if (Math.abs(this.velocityX) > 0.5 || Math.abs(this.velocityY) > 0.5) {
        this._startInertia();
      }
    }
    this.selectedId   = null;
    this.selectedType = null;
    this.lastX = null;
    this.lastY = null;
  }

  // ========================
  // PRIVATE HELPERS
  // ========================

  _getSelected() {
    if (this.selectedType === 'stroke') return this.strokeManager.getStroke(this.selectedId);
    if (this.selectedType === 'shape' && this.shapeManager) return this.shapeManager.getShape(this.selectedId);
    return null;
  }

  _distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / (dx*dx + dy*dy)));
    return Math.hypot(px - (x1 + t*dx), py - (y1 + t*dy));
  }

  _startInertia() {
    const selId   = this.selectedId;
    const selType = this.selectedType;
    this.inertiaActive = true;

    const tick = () => {
      const item = selType === 'stroke'
        ? this.strokeManager.getStroke(selId)
        : this.shapeManager?.getShape(selId);
      if (!item || !this.inertiaActive) { this.inertiaActive = false; return; }

      this.velocityX *= this.inertiaDecay;
      this.velocityY *= this.inertiaDecay;
      item.transform.tx += this.velocityX;
      item.transform.ty += this.velocityY;

      if (Math.abs(this.velocityX) < 0.1 && Math.abs(this.velocityY) < 0.1) {
        this.inertiaActive = false;
        return;
      }
      this._inertiaFrame = requestAnimationFrame(tick);
    };
    this._inertiaFrame = requestAnimationFrame(tick);
  }

  _stopInertia() {
    this.inertiaActive = false;
    if (this._inertiaFrame) {
      cancelAnimationFrame(this._inertiaFrame);
      this._inertiaFrame = null;
    }
    this.velocityX = 0;
    this.velocityY = 0;
  }

  // ========================
  // STATIC UTILITY
  // ========================

  static getTransformedPoints(stroke) {
    const { tx, ty, scale, rotation } = stroke.transform;
    let cx = 0, cy = 0;
    for (const p of stroke.points) { cx += p.x; cy += p.y; }
    cx /= stroke.points.length;
    cy /= stroke.points.length;

    return stroke.points.map(p => {
      let x = (p.x - cx) * scale;
      let y = (p.y - cy) * scale;
      const cos = Math.cos(rotation), sin = Math.sin(rotation);
      return { x: x*cos - y*sin + cx + tx, y: x*sin + y*cos + cy + ty };
    });
  }
}
