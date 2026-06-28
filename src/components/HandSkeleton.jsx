import React from 'react';

// MediaPipe official hand landmark connections
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle (5-9 palm joint)
  [5, 9], [9, 10], [10, 11], [11, 12],
  // Ring (9-13 palm joint)
  [9, 13], [13, 14], [14, 15], [15, 16],
  // Pinky (13-17 palm joint + 0-17 wrist)
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

// Which landmark indices are fingertips (bigger dots)
const FINGERTIP_INDICES = new Set([4, 8, 12, 16, 20]);
// Wrist
const WRIST_INDEX = 0;

const HandSkeleton = ({ allLandmarks, color = '#00ffff', gesture }) => {
  if (!allLandmarks || allLandmarks.length < 21) return null;

  const W = window.innerWidth;
  const H = window.innerHeight;

  // Map normalised MediaPipe coords → screen pixels (mirrored X like the video)
  const toScreen = (lm) => ({
    x: (1 - lm.x) * W,
    y: lm.y * H,
  });

  const pts = allLandmarks.map(toScreen);

  // Colour shifts based on gesture
  const isErasing = gesture === 'ERASE';
  const lineColor  = isErasing ? 'rgba(255,60,60,0.55)'  : `${color}88`;  // 53% alpha
  const dotColor   = isErasing ? 'rgba(255,80,80,0.9)'   : color;
  const glowColor  = isErasing ? 'rgba(255,0,0,0.4)'     : `${color}66`;
  const wristGlow  = isErasing ? 'rgba(255,0,0,0.25)'    : `${color}33`;

  return (
    <svg
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 35,           // above canvas (10), below fingertip dots (40)
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Soft glow filter for bones */}
        <filter id="bone-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Stronger glow for joints */}
        <filter id="joint-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Bone connections */}
      {HAND_CONNECTIONS.map(([a, b], i) => {
        const pa = pts[a];
        const pb = pts[b];
        return (
          <line
            key={i}
            x1={pa.x} y1={pa.y}
            x2={pb.x} y2={pb.y}
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            filter="url(#bone-glow)"
          />
        );
      })}

      {/* Joint dots */}
      {pts.map((p, i) => {
        const isTip   = FINGERTIP_INDICES.has(i);
        const isWrist = i === WRIST_INDEX;

        const r = isWrist ? 7 : isTip ? 5.5 : 3.5;

        return (
          <g key={i} filter="url(#joint-glow)">
            {/* Outer glow halo */}
            <circle
              cx={p.x} cy={p.y}
              r={r + (isWrist ? 8 : isTip ? 6 : 4)}
              fill={isWrist ? wristGlow : glowColor}
            />
            {/* Core dot */}
            <circle
              cx={p.x} cy={p.y}
              r={r}
              fill={dotColor}
              opacity={isWrist ? 1 : isTip ? 0.95 : 0.75}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default HandSkeleton;
