import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { DrawingEngine } from '../modules/drawingEngine';
import { StrokeManager } from '../modules/strokeManager';
import { ShapeManager } from '../modules/shapeManager';
import { InteractionEngine } from '../modules/interactionEngine';
import { TransformEngine } from '../modules/transformEngine';

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
}, ref) => {
  const canvasRef      = useRef(null);
  const engineRef      = useRef(null);
  const managerRef     = useRef(null);
  const shapeManagerRef= useRef(null);
  const interactionRef = useRef(null);
  const transformRef   = useRef(null);

  // Freehand path
  const currentPathRef = useRef(null);
  const lastPointRef   = useRef(null);

  // Ghost shape (follows fingertip when a shape is selected)
  const ghostShapeRef  = useRef(null);

  // Whether we already placed a shape in this DRAW gesture
  const shapePlacedRef = useRef(false);

  // Control gesture ref for rendering
  const controlGestureRef = useRef('CTRL_IDLE');

  useImperativeHandle(ref, () => ({
    clear: () => {
      managerRef.current?.clear();
      shapeManagerRef.current?.clear();
    },
    undo: () => {
      // Undo last shape first, then last stroke
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
  }));

  // ── Setup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    managerRef.current      = new StrokeManager();
    shapeManagerRef.current = new ShapeManager();
    interactionRef.current  = new InteractionEngine(managerRef.current);
    transformRef.current    = new TransformEngine(managerRef.current, shapeManagerRef.current);
    engineRef.current       = new DrawingEngine(canvas);

    let animationFrameId;
    const renderLoop = () => {
      if (engineRef.current && managerRef.current && shapeManagerRef.current) {
        const selId   = transformRef.current?.getSelectedId()   ?? interactionRef.current?.getSelectedStrokeId() ?? null;
        const selType = transformRef.current?.getSelectedType() ?? (selId ? 'stroke' : null);

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
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const handleResize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const saveCurrentPath = () => {
    if (currentPathRef.current) {
      managerRef.current.addStroke(
        currentPathRef.current.points,
        currentPathRef.current.color,
        currentPathRef.current.lineWidth,
        currentPathRef.current.glowIntensity,
      );
      currentPathRef.current = null;
      lastPointRef.current   = null;
    }
  };

  // ── PRIMARY HAND: Drawing / shape placement ────────────────────────────────
  useEffect(() => {
    if (!landmark || !managerRef.current || !interactionRef.current) return;

    const x = (1 - landmark.x) * canvasRef.current.width;
    const y = landmark.y        * canvasRef.current.height;

    // ── Shape mode ──────────────────────────────────────────────────────────
    if (activeShape) {
      // Always update ghost
      ghostShapeRef.current = {
        shapeType: activeShape,
        x,
        y,
        size: DEFAULT_SHAPE_SIZE,
        color:     settings.color,
        lineWidth: settings.lineWidth,
        glowIntensity: settings.glowIntensity,
      };

      if (gesture === 'DRAW') {
        if (!shapePlacedRef.current) {
          // Place shape on first DRAW frame
          shapeManagerRef.current.addShape(
            activeShape, x, y,
            DEFAULT_SHAPE_SIZE,
            settings.color,
            settings.lineWidth,
            settings.glowIntensity,
          );
          shapePlacedRef.current = true;
        }
      } else {
        shapePlacedRef.current = false;
        // Erase still works on shapes
        if (gesture === 'ERASE') {
          // Remove shape if eraser overlaps its centre
          for (const shape of shapeManagerRef.current.getAllShapes()) {
            const cx = shape.x + shape.transform.tx;
            const cy = shape.y + shape.transform.ty;
            if (Math.hypot(x - cx, y - cy) < shape.size * shape.transform.scale + 30) {
              shapeManagerRef.current.removeShape(shape.id);
              break;
            }
          }
        }
        if (gesture === 'CLEAR') {
          shapeManagerRef.current.clear();
          managerRef.current.clear();
        }
      }
      return;
    }

    // ── Freehand mode ────────────────────────────────────────────────────────
    ghostShapeRef.current  = null;
    shapePlacedRef.current = false;

    switch (gesture) {
      case 'DRAW':
        if (!currentPathRef.current) {
          currentPathRef.current = {
            points: [{ x, y }],
            color:        settings.color,
            lineWidth:    settings.lineWidth,
            glowIntensity: settings.glowIntensity,
          };
          lastPointRef.current = { x, y };
        } else {
          const sf = 0.15;
          const sx = lastPointRef.current.x * sf + x * (1 - sf);
          const sy = lastPointRef.current.y * sf + y * (1 - sf);
          currentPathRef.current.points.push({ x: sx, y: sy });
          lastPointRef.current = { x: sx, y: sy };
        }
        break;

      case 'ERASE':
        saveCurrentPath();
        interactionRef.current.handleErase(x, y);
        // Also erase nearby shapes
        for (const shape of shapeManagerRef.current.getAllShapes()) {
          const cx = shape.x + shape.transform.tx;
          const cy = shape.y + shape.transform.ty;
          if (Math.hypot(x - cx, y - cy) < shape.size * shape.transform.scale + 30) {
            shapeManagerRef.current.removeShape(shape.id);
            break;
          }
        }
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

  // ── SECONDARY HAND: Control gestures ──────────────────────────────────────
  useEffect(() => {
    if (!transformRef.current) return;
    controlGestureRef.current = controlGesture || 'CTRL_IDLE';

    if (!controlLandmark) {
      transformRef.current.releaseAll();
      return;
    }

    const x = (1 - controlLandmark.x) * canvasRef.current.width;
    const y = controlLandmark.y        * canvasRef.current.height;

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
        top:           0,
        left:          0,
        zIndex:        10,
        pointerEvents: 'none',
      }}
    />
  );
});

export default DrawingCanvas;
