import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Settings, Trash2, Undo2, Redo2, Download,
  Eye, EyeOff, Zap, HelpCircle, Monitor, Video,
  Pen, Shapes, Wand2, Type,
} from 'lucide-react';

// ── Colour palette ──────────────────────────────────────────────────────────
const COLORS = ['#00ffff','#ff00ff','#ffff00','#00ff00','#ff0000','#ffffff'];

// ── Available fonts ─────────────────────────────────────────────────────────
const FONTS = [
  { family: 'Outfit',         label: 'Outfit',  sample: 'Aa' },
  { family: 'JetBrains Mono', label: 'Mono',    sample: 'Aa' },
  { family: 'Pacifico',       label: 'Pacifico',sample: 'Aa' },
];

// ── Shape type definitions ───────────────────────────────────────────────────
const SHAPES = [
  { type: 'circle',    label: 'Circle'   },
  { type: 'rectangle', label: 'Rect'     },
  { type: 'triangle',  label: 'Triangle' },
  { type: 'star',      label: 'Star'     },
  { type: 'pentagon',  label: 'Pentagon' },
  { type: 'diamond',   label: 'Diamond'  },
  { type: 'arrow',     label: 'Arrow'    },
];

// ── Mini SVG shape icons ─────────────────────────────────────────────────────
const ShapeIcon = ({ type, color = 'currentColor', size = 22 }) => {
  const h = size / 2, r = h * 0.82;
  switch (type) {
    case 'circle':
      return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"><circle cx={h} cy={h} r={r} stroke={color} strokeWidth="2"/></svg>;
    case 'rectangle':
      return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"><rect x={h-r} y={h-r*0.65} width={r*2} height={r*1.3} stroke={color} strokeWidth="2"/></svg>;
    case 'triangle':
      return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"><polygon points={`${h},${h-r} ${h+r*0.866},${h+r*0.5} ${h-r*0.866},${h+r*0.5}`} stroke={color} strokeWidth="2" strokeLinejoin="round"/></svg>;
    case 'star': {
      const pts = Array.from({length:10},(_,i)=>{const a=(i*Math.PI)/5-Math.PI/2,rad=i%2===0?r:r*0.4;return`${h+Math.cos(a)*rad},${h+Math.sin(a)*rad}`;});
      return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"><polygon points={pts.join(' ')} stroke={color} strokeWidth="2" strokeLinejoin="round"/></svg>;
    }
    case 'pentagon': {
      const pts = Array.from({length:5},(_,i)=>{const a=(i*2*Math.PI)/5-Math.PI/2;return`${h+Math.cos(a)*r},${h+Math.sin(a)*r}`;});
      return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"><polygon points={pts.join(' ')} stroke={color} strokeWidth="2" strokeLinejoin="round"/></svg>;
    }
    case 'diamond':
      return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"><polygon points={`${h},${h-r} ${h+r*0.6},${h} ${h},${h+r} ${h-r*0.6},${h}`} stroke={color} strokeWidth="2" strokeLinejoin="round"/></svg>;
    case 'arrow':
      return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"><polygon points={`${h},${h-r} ${h+r*0.55},${h} ${h+r*0.22},${h} ${h+r*0.22},${h+r} ${h-r*0.22},${h+r} ${h-r*0.22},${h} ${h-r*0.55},${h}`} stroke={color} strokeWidth="2" strokeLinejoin="round"/></svg>;
    default: return null;
  }
};

// ── Main component ───────────────────────────────────────────────────────────
const ControlPanel = ({
  settings, onSettingsChange,
  onClear, onUndo, onRedo, onSave,
  onToggleCamera, cameraVisible,
  gestureVisible, onToggleGestures,
  onHelp,
  canvasMode, onToggleCanvasMode,
  activeShape, onShapeSelect,
  autoRefine, onToggleAutoRefine,
  onAddText,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Text panel state
  const [textInput,   setTextInput]   = useState('');
  const [textFont,    setTextFont]    = useState('Outfit');
  const [textSize,    setTextSize]    = useState(48);
  const [textPanelOpen, setTextPanelOpen] = useState(false);

  const handlePlaceText = () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    onAddText({ text: trimmed, fontFamily: textFont, fontSize: textSize, color: settings.color });
    setTextInput('');
  };

  return (
    <div style={{
      position: 'fixed', right: '24px', top: '24px', zIndex: 100,
      display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end',
    }}>
      {/* Gear toggle */}
      <motion.button
        className="glass-meta"
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(v => !v)}
        style={{ width:'48px',height:'48px',borderRadius:'16px',display:'flex',justifyContent:'center',alignItems:'center',cursor:'pointer' }}
      >
        <Settings size={22}/>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="glass-meta"
            initial={{ opacity:0, x:20, scale:0.95 }}
            animate={{ opacity:1, x:0,  scale:1    }}
            exit   ={{ opacity:0, x:20, scale:0.95 }}
            style={{
              borderRadius:'24px', padding:'22px', width:'288px',
              color:'#fff', display:'flex', flexDirection:'column', gap:'20px',
              marginTop:'12px', maxHeight:'90vh', overflowY:'auto',
            }}
          >

            {/* ── Colour palette ─────────────────────────────────────────── */}
            <Section icon={<Palette size={14}/>} title="Color Palette">
              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px'}}>
                {COLORS.map(c => (
                  <motion.div key={c}
                    whileHover={{scale:1.2}} whileTap={{scale:0.9}}
                    onClick={() => onSettingsChange({ color:c, isEraser:false })}
                    style={{
                      width:'32px',height:'32px',borderRadius:'8px',
                      backgroundColor:c, cursor:'pointer',
                      border:    settings.color===c ? '2px solid #fff' : 'none',
                      boxShadow: settings.color===c ? `0 0 15px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
            </Section>

            {/* ── Auto-Refine toggle ─────────────────────────────────────── */}
            <Section icon={<Wand2 size={14}/>} title="Auto-Refine">
              <motion.button
                whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                onClick={onToggleAutoRefine}
                style={{
                  width:'100%', padding:'10px 14px', borderRadius:'12px',
                  display:'flex', alignItems:'center', gap:'10px',
                  fontSize:'12px', fontWeight:600, cursor:'pointer',
                  color: autoRefine ? '#fff' : 'rgba(255,255,255,0.45)',
                  background: autoRefine
                    ? `linear-gradient(135deg, ${settings.color}44, ${settings.color}18)`
                    : 'rgba(255,255,255,0.04)',
                  border: autoRefine
                    ? `1.5px solid ${settings.color}bb`
                    : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: autoRefine ? `0 0 16px ${settings.color}44` : 'none',
                  transition:'all 0.2s',
                }}
              >
                <Wand2 size={16}/>
                {autoRefine ? '✓ Smart Shape Snap ON' : 'Smart Shape Snap OFF'}
              </motion.button>
              <p style={{
                fontSize:'10px', color:'rgba(255,255,255,0.35)',
                margin:'6px 0 0', lineHeight:'1.45',
              }}>
                Draw a circle, triangle, or rectangle — it auto-snaps to a perfect shape.
              </p>
            </Section>

            {/* ── Shapes ────────────────────────────────────────────────── */}
            <Section icon={<Shapes size={14}/>} title="Shapes">
              {/* Freehand button */}
              <motion.button
                whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                onClick={() => onShapeSelect(null)}
                style={{
                  width:'100%', padding:'8px 12px', marginBottom:'10px',
                  borderRadius:'10px', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:'8px',
                  fontSize:'12px', fontWeight:600,
                  color: activeShape===null ? '#fff' : 'rgba(255,255,255,0.5)',
                  background: activeShape===null ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                  border: activeShape===null
                    ? '1px solid rgba(255,255,255,0.32)' : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: activeShape===null ? '0 0 12px rgba(255,255,255,0.12)' : 'none',
                  transition:'all 0.2s',
                }}
              >
                <Pen size={14}/> Freehand Draw
              </motion.button>

              {/* Shape grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px'}}>
                {SHAPES.map(({ type, label }) => {
                  const active = activeShape === type;
                  return (
                    <motion.button key={type}
                      whileHover={{scale:1.08}} whileTap={{scale:0.93}}
                      onClick={() => onShapeSelect(active ? null : type)}
                      style={{
                        borderRadius:'10px', padding:'8px 4px 6px', cursor:'pointer',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:'5px',
                        fontSize:'9px', fontWeight:600, letterSpacing:'0.03em',
                        color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                        background: active
                          ? `linear-gradient(135deg,${settings.color}33,${settings.color}11)`
                          : 'rgba(255,255,255,0.04)',
                        border: active ? `1.5px solid ${settings.color}aa` : '1px solid rgba(255,255,255,0.07)',
                        boxShadow: active ? `0 0 14px ${settings.color}55` : 'none',
                        transition:'all 0.2s',
                      }}
                    >
                      <ShapeIcon type={type} color={active ? settings.color : 'rgba(255,255,255,0.55)'} size={24}/>
                      {label}
                    </motion.button>
                  );
                })}
              </div>
            </Section>

            {/* ── Text ──────────────────────────────────────────────────── */}
            <Section icon={<Type size={14}/>} title="Add Text"
              headerRight={
                <motion.button
                  whileTap={{scale:0.9}}
                  onClick={() => setTextPanelOpen(v => !v)}
                  style={{
                    fontSize:'10px', padding:'3px 8px', borderRadius:'6px',
                    background: textPanelOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                    border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', color:'#fff',
                  }}
                >{textPanelOpen ? 'Close' : 'Open'}</motion.button>
              }
            >
              <AnimatePresence>
                {textPanelOpen && (
                  <motion.div
                    initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                    style={{overflow:'hidden'}}
                  >
                    <div style={{display:'flex',flexDirection:'column',gap:'12px',paddingTop:'4px'}}>
                      {/* Text input */}
                      <textarea
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        placeholder="Type your text here…"
                        rows={2}
                        style={{
                          width:'100%', boxSizing:'border-box',
                          padding:'10px 12px', borderRadius:'10px',
                          background:'rgba(255,255,255,0.07)',
                          border:'1px solid rgba(255,255,255,0.15)',
                          color:'#fff', fontSize:'13px', resize:'none',
                          fontFamily: textFont+', sans-serif',
                          outline:'none',
                        }}
                      />

                      {/* Font selector */}
                      <div>
                        <label style={{display:'block',fontSize:'10px',color:'rgba(255,255,255,0.45)',marginBottom:'6px'}}>
                          Font
                        </label>
                        <div style={{display:'flex',gap:'6px'}}>
                          {FONTS.map(f => (
                            <motion.button key={f.family}
                              whileTap={{scale:0.95}}
                              onClick={() => setTextFont(f.family)}
                              style={{
                                flex:1, padding:'7px 4px', borderRadius:'8px',
                                cursor:'pointer', fontSize:'11px', fontWeight:600,
                                fontFamily: f.family+', sans-serif',
                                color: textFont===f.family ? '#fff' : 'rgba(255,255,255,0.45)',
                                background: textFont===f.family
                                  ? `linear-gradient(135deg,${settings.color}44,${settings.color}18)`
                                  : 'rgba(255,255,255,0.05)',
                                border: textFont===f.family
                                  ? `1.5px solid ${settings.color}aa`
                                  : '1px solid rgba(255,255,255,0.08)',
                                transition:'all 0.2s',
                              }}
                            >{f.label}</motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Size slider */}
                      <div>
                        <label style={{display:'block',fontSize:'10px',color:'rgba(255,255,255,0.45)',marginBottom:'6px'}}>
                          Size: {textSize}px
                        </label>
                        <input type="range" min="18" max="120" value={textSize}
                          onChange={e => setTextSize(Number(e.target.value))}
                          style={{width:'100%', accentColor: settings.color}}
                        />
                      </div>

                      {/* Preview */}
                      <div style={{
                        padding:'10px 12px', borderRadius:'10px',
                        background:'rgba(0,0,0,0.3)',
                        border:`1px solid ${settings.color}33`,
                        textAlign:'center',
                        fontFamily: textFont+', sans-serif',
                        fontSize: Math.min(textSize, 32)+'px',
                        color: settings.color,
                        textShadow:`0 0 12px ${settings.color}`,
                        minHeight:'44px',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        overflow:'hidden', wordBreak:'break-all',
                      }}>
                        {textInput || <span style={{opacity:0.35,fontSize:'12px',fontFamily:'Outfit,sans-serif'}}>Preview</span>}
                      </div>

                      {/* Place button */}
                      <motion.button
                        whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                        onClick={handlePlaceText}
                        disabled={!textInput.trim()}
                        style={{
                          width:'100%', padding:'11px',
                          borderRadius:'10px', cursor: textInput.trim() ? 'pointer' : 'not-allowed',
                          fontSize:'13px', fontWeight:700,
                          color: textInput.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                          background: textInput.trim()
                            ? `linear-gradient(135deg,${settings.color}88,${settings.color}44)`
                            : 'rgba(255,255,255,0.04)',
                          border: textInput.trim()
                            ? `1.5px solid ${settings.color}cc`
                            : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: textInput.trim() ? `0 0 20px ${settings.color}44` : 'none',
                          transition:'all 0.2s',
                        }}
                      >
                        Place on Canvas
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>

            {/* ── Sliders ────────────────────────────────────────────────── */}
            <Section icon={null} title="Brush Settings">
              <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                <div>
                  <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.45)',marginBottom:'7px'}}>
                    {activeShape ? 'Shape Stroke:' : 'Brush Thickness:'} {settings.lineWidth}px
                  </label>
                  <input type="range" min="1" max="50" value={settings.lineWidth}
                    onChange={e => onSettingsChange({ lineWidth: parseInt(e.target.value) })}
                    style={{width:'100%', accentColor: settings.color}}
                  />
                </div>
                <div>
                  <label style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.45)',marginBottom:'7px'}}>
                    Glow Intensity: {settings.glowIntensity}
                  </label>
                  <input type="range" min="0" max="50" value={settings.glowIntensity}
                    onChange={e => onSettingsChange({ glowIntensity: parseInt(e.target.value) })}
                    style={{width:'100%', accentColor: settings.color}}
                  />
                </div>
              </div>
            </Section>

            {/* ── Action buttons ─────────────────────────────────────────── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <ActionButton icon={<Undo2 size={18}/>}    label="Undo"    onClick={onUndo}/>
              <ActionButton icon={<Redo2 size={18}/>}    label="Redo"    onClick={onRedo}/>
              <ActionButton icon={<Trash2 size={18}/>}   label="Clear"   onClick={onClear}/>
              <ActionButton icon={<Download size={18}/>} label="Save"    onClick={onSave}/>
              <ActionButton
                icon={cameraVisible ? <EyeOff size={18}/> : <Eye size={18}/>}
                label={cameraVisible ? 'Hide Cam' : 'Show Cam'}
                onClick={onToggleCamera}
              />
              <ActionButton
                icon={<Zap size={18}/>}
                label={gestureVisible ? 'Gestures On' : 'Gestures Off'}
                onClick={onToggleGestures}
                active={gestureVisible}
              />
              <ActionButton
                icon={canvasMode ? <Video size={18}/> : <Monitor size={18}/>}
                label={canvasMode ? 'Camera Mode' : 'Canvas Mode'}
                onClick={onToggleCanvasMode}
                active={canvasMode}
              />
              <ActionButton icon={<HelpCircle size={18}/>} label="Help" onClick={onHelp}/>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────────

const Section = ({ icon, title, children, headerRight }) => (
  <div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',fontWeight:600,color:'rgba(255,255,255,0.65)'}}>
        {icon}{title}
      </div>
      {headerRight}
    </div>
    {children}
  </div>
);

const ActionButton = ({ icon, label, onClick, active = false }) => (
  <motion.button
    className="glass-meta"
    whileHover={{scale:1.05}} whileTap={{scale:0.95}}
    onClick={onClick}
    style={{
      borderRadius:'12px', padding:'10px', color:'#fff',
      display:'flex', flexDirection:'column', alignItems:'center', gap:'4px',
      cursor:'pointer', fontSize:'10px', transition:'all 0.2s',
      boxShadow: active ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
      border:    active ? '1px solid rgba(255,255,255,0.4)' : undefined,
    }}
  >
    {icon}{label}
  </motion.button>
);

export default ControlPanel;
