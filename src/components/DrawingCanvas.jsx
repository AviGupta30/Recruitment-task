import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { DrawingEngine } from '../modules/drawingEngine';
import { StrokeManager } from '../modules/strokeManager';
import { ShapeManager } from '../modules/shapeManager';
import { InteractionEngine } from '../modules/interactionEngine';
import { TransformEngine } from '../modules/transformEngine';
import { StrokeRefiner } from '../modules/strokeRefiner';

const DEFAULT_SHAPE_SIZE = 80; // px radius when placing a shape

const DrawingCanvas = forwardRef(({
  settings,
  gesture,
  landmark,
  controlGesture,
  controlLandmark,
  controlPinchDelta,
  controlAngleDelta,
  activeShape,           // null = freehand; 'circle'|'rectangle'|etc = shape mode
  autoRefine,            // boolean — snap freehand → shape on gesture end
}, ref) => {
  const canvasRef       = useRef(null);
  const engineRef       = useRef(null);
  const managerRef      = useRef(null);
  const shapeManagerRef = useRef(null);
  const interactionRef  = useRef(null);
  const transformRef    = useRef(null);

  // Freehand path
  const currentPathRef  = useRef(null);
  const lastPointRef    = useRef(null);

  // Ghost shape (follows fingertip when a shape type is selected)
  const ghostShapeRef   = useRef(null);

  // Prevent placing a shape on every frame of DRAW gesture
  const shapePlacedRef  = useRef(false);

  // Refs so the render loop & effect closures stay in sync
  const controlGestureRef = useRef('CTRL_IDLE');
  const autoRefineRef     = useRef(autoRefine);
  useEffect(() => { autoRefineRef.current = autoRefine; }, [autoRefine]);

  // ── Imperative handle ────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    clear: () => {
      managerRef.current?.clear();
      shapeManagerRef.current?.clear();
    },
    undo: () => {
      // Prefer undoing last shape (most recent action)
      if (shapeManagerRef.current?.getAllShapes().length > 0) {
        shapeManagerRef.current.undo();
      } else {
        managerRef.current?.undo();
      }
    },
    redo: () => {
      managerRef.current?.redo();
      shapeManagerRef.current?.redo();
    },
    save: () => engineRef.current?.saveAsImage(),
    addText: ({ text, fontFamily, fontSize, color }) => {
      if (!shapeManagerRef.current || !canvasRef.current) return;
      const x = canvasRef.current.width  / 2;
      const y = canvasRef.current.height / 2;
      shapeManagerRef.current.addText(text, fontFamily, fontSize, x, y, color);
    },
  }));

  // ── Setup canvas + render loop ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    managerRef.current      = new StrokeManager();
    shapeManagerRef.current = new ShapeManager();
    interactionRef.current  = new InteractionEngine(managerRef.current);
    transformRef.current    = new TransformEngine(managerRef.current, shapeManagerRef.current);
    engineRef.current       = new DrawingEngine(canvas);

    let animId;
    const loop = () => {
      if (engineRef.current && managerRef.current && shapeManagerRef.current) {
        const selId   = transformRef.current?.getSelectedId()   ?? null;
        const selType = transformRef.current?.getSelectedType() ?? null;
        engineRef.current.draw(
          managerRef.current.getAllStrokes(),
          shapeManagerRef.current.getAllShapes(),
          currentPathRef.current,
          ghostShapeRef.current,
          selId,
          selType,
          controlGestureRef.current,
        );
      }
      animId = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(animId); };
  }, []);

  // ── Helper: finalise freehand path ──────────────────────────────────────
  const saveCurrentPath = () => {
    if (!currentPathRef.current) return;
    const path = currentPathRef.current;
    currentPathRef.current = null;
    lastPointRef.current   = null;
    if (path.points.length < 2) return;

    const stroke = managerRef.current.addStroke(
      path.points, path.color, path.lineWidth, path.glowIntensity,
    );

    // Auto-refine: try to replace with a clean geometric shape
    if (autoRefineRef.current) {
      const result = StrokeRefiner.refine(path.points);
      if (result) {
        managerRef.current.removeStroke(stroke.id);
        shapeManagerRef.current.addShape(
          result.shapeType, result.x, result.y, result.size,
          path.color, path.lineWidth, path.glowIntensity,
        );
      }
    }
  };

  // ── PRIMARY HAND: Drawing / erasing / shape placement ───────────────────
  useEffect(() => {
    if (!landmark || !managerRef.current) return;

    const canvas = canvasRef.current;
    const x = (1 - landmark.x) * canvas.width;
    const y =      landmark.y  * canvas.height;

    // ── Shape-placement mode ─────────────────────────────────────────────
    if (activeShape) {
      ghostShapeRef.current = {
        shapeType: activeShape, x, y,
        size: DEFAULT_SHAPE_SIZE,
        color:         settings.color,
        lineWidth:     settings.lineWidth,
        glowIntensity: settings.glowIntensity,
      };

      if (gesture === 'DRAW') {
        if (!shapePlacedRef.current) {
          shapeManagerRef.current.addShape(
            activeShape, x, y, DEFAULT_SHAPE_SIZE,
            settings.color, settings.lineWidth, settings.glowIntensity,
          );
          shapePlacedRef.current = true;
        }
      } else {
        shapePlacedRef.current = false;
        if (gesture === 'ERASE') _eraseNearShapes(x, y);
        if (gesture === 'CLEAR') { shapeManagerRef.current.clear(); managerRef.current.clear(); }
      }
      return;
    }

    // ── Freehand mode ────────────────────────────────────────────────────
    ghostShapeRef.current  = null;
    shapePlacedRef.current = false;

    switch (gesture) {
      case 'DRAW': {
        if (!currentPathRef.current) {
          currentPathRef.current = {
            points: [{ x, y }],
            color:         settings.color,
            lineWidth:     settings.lineWidth,
            glowIntensity: settings.glowIntensity,
          };
          lastPointRef.current = { x, y };
        } else {
          // Smooth interpolation
          const sf = 0.15;
          const sx = lastPointRef.current.x * sf + x * (1 - sf);
          const sy = lastPointRef.current.y * sf + y * (1 - sf);
          currentPathRef.current.points.push({ x: sx, y: sy });
          lastPointRef.current = { x: sx, y: sy };
        }
        break;
      }
      case 'ERASE':
        saveCurrentPath();
        interactionRef.current.handleErase(x, y);
        _eraseNearShapes(x, y);
        break;
      case 'CLEAR':
        saveCurrentPath();
        managerRef.current.clear();
        shapeManagerRef.current.clear();
        break;
      default:
        saveCurrentPath();
        break;
    }
  }, [gesture, landmark, settings, activeShape]);

  // Helper: erase shapes/text near point
  function _eraseNearShapes(x, y) {
    for (const shape of shapeManagerRef.current.getAllShapes()) {
      const cx = shape.x + shape.transform.tx;
      const cy = shape.y + shape.transform.ty;
      if (Math.hypot(x - cx, y - cy) < shape.size * shape.transform.scale + 35) {
        shapeManagerRef.current.removeShape(shape.id);
        break;
      }
    }
  }

  // ── SECONDARY HAND: Transform controls ──────────────────────────────────
  useEffect(() => {
    if (!transformRef.current) return;
    controlGestureRef.current = controlGesture || 'CTRL_IDLE';

    if (!controlLandmark) {
      transformRef.current.releaseAll();
      return;
    }

    const canvas = canvasRef.current;
    const x = (1 - controlLandmark.x) * canvas.width;
    const y =      controlLandmark.y  * canvas.height;

    switch (controlGesture) {
      case 'CTRL_MOVE':
        transformRef.current.handleMove(x, y);
        break;
      case 'CTRL_SCALE':
        transformRef.current.selectNearest(x, y);
        transformRef.current.handleScale(controlPinchDelta || 0);
        break;
      case 'CTRL_ROTATE':
        transformRef.current.selectNearest(x, y);
        transformRef.current.handleRotate(controlAngleDelta || 0);
        break;
      default:
        transformRef.current.releaseAll();
        break;
    }
  }, [controlGesture, controlLandmark, controlPinchDelta, controlAngleDelta]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        top: 0, left: 0,
        zIndex:        10,
        pointerEvents: 'none',
      }}
    />
  );
});

export default DrawingCanvas;
