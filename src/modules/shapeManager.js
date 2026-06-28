/**
 * ShapeManager: Manages geometric shapes (circle, rect, triangle, etc.)
 * separately from freehand strokes so they retain mathematical properties.
 */
export class ShapeManager {
  constructor() {
    this.shapes = [];
    this.redoStack = [];
    this._nextId = 10000; // Start high so IDs don't clash with stroke IDs
  }

  addShape(shapeType, x, y, size, color, lineWidth, glowIntensity) {
    const shape = {
      id: this._nextId++,
      kind: 'shape',
      shapeType,
      x,
      y,
      size,
      color,
      lineWidth,
      glowIntensity,
      transform: { tx: 0, ty: 0, scale: 1, rotation: 0 },
    };
    this.shapes.push(shape);
    this.redoStack = [];
    return shape;
  }

  removeShape(id) {
    this.shapes = this.shapes.filter(s => s.id !== id);
  }

  getShape(id) {
    return this.shapes.find(s => s.id === id);
  }

  getAllShapes() {
    return this.shapes;
  }

  undo() {
    if (this.shapes.length > 0) {
      this.redoStack.push(this.shapes.pop());
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      this.shapes.push(this.redoStack.pop());
    }
  }

  clear() {
    this.shapes = [];
    this.redoStack = [];
  }

  addText(text, fontFamily, fontSize, x, y, color) {
    // Approximate bounding size for hit-test (half the text width)
    const size = Math.max(fontSize * text.length * 0.3, fontSize * 0.6);
    const obj = {
      id: this._nextId++,
      kind: 'text',
      text,
      fontFamily,
      fontSize,
      x,
      y,
      size,
      color,
      transform: { tx: 0, ty: 0, scale: 1, rotation: 0 },
    };
    this.shapes.push(obj);
    this.redoStack = [];
    return obj;
  }

  /**
   * Find the nearest shape OR text centre within `threshold` px.
   * Returns shape id or null.
   */
  findNearestShape(x, y, threshold) {
    let nearestId = null;
    let minDist = threshold;

    for (const shape of this.shapes) {
      const cx = shape.x + shape.transform.tx;
      const cy = shape.y + shape.transform.ty;
      const effectiveSize = shape.size * shape.transform.scale;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < Math.max(effectiveSize + 30, minDist)) {
        if (dist < minDist + effectiveSize) {
          minDist = dist;
          nearestId = shape.id;
        }
      }
    }

    return nearestId;
  }
}
