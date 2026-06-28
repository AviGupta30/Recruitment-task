import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Settings,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Eye,
  EyeOff,
  Zap,
  HelpCircle,
  Monitor,
  Video,
  Pen,
  Shapes,
} from 'lucide-react';

const COLORS = [
  '#00ffff',
  '#ff00ff',
  '#ffff00',
  '#00ff00',
  '#ff0000',
  '#ffffff',
];

// SVG mini-previews for each shape (drawn at 28×28)
const ShapeIcon = ({ type, color = 'currentColor', size = 22 }) => {
  const s = size;
  const h = s / 2;
  const r = h * 0.82;
  switch (type) {
    case 'circle':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <circle cx={h} cy={h} r={r} stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'rectangle':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <rect x={h - r} y={h - r * 0.65} width={r * 2} height={r * 1.3} stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <polygon
            points={`${h},${h - r} ${h + r * 0.866},${h + r * 0.5} ${h - r * 0.866},${h + r * 0.5}`}
            stroke={color} strokeWidth="2" strokeLinejoin="round"
          />
        </svg>
      );
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const rad   = i % 2 === 0 ? r : r * 0.4;
        pts.push(`${h + Math.cos(angle) * rad},${h + Math.sin(angle) * rad}`);
      }
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <polygon points={pts.join(' ')} stroke={color} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    }
    case 'pentagon': {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        pts.push(`${h + Math.cos(angle) * r},${h + Math.sin(angle) * r}`);
      }
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <polygon points={pts.join(' ')} stroke={color} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    }
    case 'diamond':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <polygon
            points={`${h},${h - r} ${h + r * 0.6},${h} ${h},${h + r} ${h - r * 0.6},${h}`}
            stroke={color} strokeWidth="2" strokeLinejoin="round"
          />
        </svg>
      );
    case 'arrow':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <polygon
            points={`
              ${h},${h - r}
              ${h + r * 0.55},${h}
              ${h + r * 0.22},${h}
              ${h + r * 0.22},${h + r}
              ${h - r * 0.22},${h + r}
              ${h - r * 0.22},${h}
              ${h - r * 0.55},${h}
            `}
            stroke={color} strokeWidth="2" strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
};

const SHAPES = [
  { type: 'circle',    label: 'Circle'  },
  { type: 'rectangle', label: 'Rect'    },
  { type: 'triangle',  label: 'Triangle'},
  { type: 'star',      label: 'Star'    },
  { type: 'pentagon',  label: 'Pentagon'},
  { type: 'diamond',   label: 'Diamond' },
  { type: 'arrow',     label: 'Arrow'   },
];

const ControlPanel = ({
  settings,
  onSettingsChange,
  onClear,
  onUndo,
  onRedo,
  onSave,
  onToggleCamera,
  cameraVisible,
  gestureVisible,
  onToggleGestures,
  onHelp,
  canvasMode,
  onToggleCanvasMode,
  activeShape,
  onShapeSelect,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{
      position:      'fixed',
      right:         '24px',
      top:           '24px',
      zIndex:        100,
      display:       'flex',
      flexDirection: 'column',
      gap:           '12px',
      alignItems:    'flex-end',
    }}>
      <motion.button
        className="glass-meta"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '48px', height: '48px',
          borderRadius: '16px',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <Settings size={22} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="glass-meta"
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            style={{
              borderRadius:  '24px',
              padding:       '24px',
              width:         '280px',
              color:         '#fff',
              display:       'flex',
              flexDirection: 'column',
              gap:           '24px',
              marginTop:     '12px',
            }}
          >
            {/* ── Color Palette ── */}
            <div>
              <SectionLabel icon={<Palette size={14} />} text="Color Palette" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                {COLORS.map(c => (
                  <motion.div
                    key={c}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSettingsChange({ color: c, isEraser: false })}
                    style={{
                      width: '32px', height: '32px',
                      borderRadius: '8px',
                      backgroundColor: c,
                      cursor: 'pointer',
                      border:     settings.color === c ? '2px solid #fff' : 'none',
                      boxShadow:  settings.color === c ? `0 0 15px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ── Shapes ── */}
            <div>
              <SectionLabel icon={<Shapes size={14} />} text="Shapes" />
              {/* Freehand toggle */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onShapeSelect(null)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '12px', fontWeight: 600,
                  color: activeShape === null ? '#fff' : 'rgba(255,255,255,0.5)',
                  background: activeShape === null
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  border: activeShape === null
                    ? '1px solid rgba(255,255,255,0.35)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: activeShape === null ? '0 0 12px rgba(255,255,255,0.15)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Pen size={14} />
                Freehand Draw
              </motion.button>

              {/* Shape grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {SHAPES.map(({ type, label }) => {
                  const isActive = activeShape === type;
                  return (
                    <motion.button
                      key={type}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => onShapeSelect(isActive ? null : type)}
                      style={{
                        borderRadius: '10px',
                        padding: '8px 4px 6px',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '5px',
                        fontSize: '9px', fontWeight: 600,
                        letterSpacing: '0.03em',
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                        background: isActive
                          ? `linear-gradient(135deg, ${settings.color}33, ${settings.color}11)`
                          : 'rgba(255,255,255,0.04)',
                        border: isActive
                          ? `1.5px solid ${settings.color}aa`
                          : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: isActive ? `0 0 14px ${settings.color}55` : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      <ShapeIcon type={type} color={isActive ? settings.color : 'rgba(255,255,255,0.6)'} size={24} />
                      {label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── Sliders ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                  {activeShape ? 'Shape Stroke:' : 'Brush Thickness:'} {settings.lineWidth}px
                </label>
                <input
                  type="range" min="1" max="50"
                  value={settings.lineWidth}
                  onChange={e => onSettingsChange({ lineWidth: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: settings.color }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                  Glow Intensity: {settings.glowIntensity}
                </label>
                <input
                  type="range" min="0" max="50"
                  value={settings.glowIntensity}
                  onChange={e => onSettingsChange({ glowIntensity: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: settings.color }}
                />
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <ActionButton icon={<Undo2 size={18} />}    label="Undo"    onClick={onUndo} />
              <ActionButton icon={<Redo2 size={18} />}    label="Redo"    onClick={onRedo} />
              <ActionButton icon={<Trash2 size={18} />}   label="Clear"   onClick={onClear} />
              <ActionButton icon={<Download size={18} />} label="Save"    onClick={onSave} />
              <ActionButton
                icon={cameraVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                label={cameraVisible ? 'Hide Cam' : 'Show Cam'}
                onClick={onToggleCamera}
              />
              <ActionButton
                icon={<Zap size={18} />}
                label={gestureVisible ? 'Gestures On' : 'Gestures Off'}
                onClick={onToggleGestures}
                active={gestureVisible}
              />
              <ActionButton
                icon={canvasMode ? <Video size={18} /> : <Monitor size={18} />}
                label={canvasMode ? 'Camera Mode' : 'Canvas Mode'}
                onClick={onToggleCanvasMode}
                active={canvasMode}
              />
              <ActionButton icon={<HelpCircle size={18} />} label="Help" onClick={onHelp} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SectionLabel = ({ icon, text }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '6px',
    marginBottom: '12px',
    fontSize: '13px', fontWeight: 600,
    color: 'rgba(255,255,255,0.65)',
  }}>
    {icon} {text}
  </div>
);

const ActionButton = ({ icon, label, onClick, active = false }) => (
  <motion.button
    className="glass-meta"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{
      borderRadius: '12px', padding: '10px',
      color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
      cursor: 'pointer', fontSize: '10px', transition: 'all 0.2s',
      boxShadow: active ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
      border:    active ? '1px solid rgba(255,255,255,0.4)' : undefined,
    }}
  >
    {icon}
    {label}
  </motion.button>
);

export default ControlPanel;
