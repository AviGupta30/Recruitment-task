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

  /**
   * Find the nearest shape centre within `threshold` px.
   * Returns shape id or null.
   */
  findNearestShape(x, y, threshold) {
    let nearestId = null;
    let minDist = threshold;

    for (const shape of this.shapes) {
      const cx = shape.x + shape.transform.tx;
      const cy = shape.y + shape.transform.ty;
      const effectiveSize = shape.size * shape.transform.scale;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      // "grab" if within the shape's bounding circle
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
