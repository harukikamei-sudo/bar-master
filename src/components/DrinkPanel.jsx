import { useMemo, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

function DrinkModel({ modelPath, modelScale = 2 }) {
  const { scene: originalScene } = useGLTF(modelPath);
  const groupRef = useRef();

  const cloned = useMemo(() => {
    const s = originalScene.clone(true);
    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = modelScale / maxDim;
    s.scale.setScalar(scale);
    s.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    return s;
  }, [originalScene, modelScale]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

function RadarChart({ flavor }) {
  const labels = [
    { key: 'sweet', label: '甘味' },
    { key: 'bitter', label: '苦味' },
    { key: 'sour', label: '酸味' },
    { key: 'body', label: 'ボディ' },
    { key: 'aroma', label: '香り' },
  ];

  const cx = 100, cy = 100, r = 70;
  const angleStep = (Math.PI * 2) / labels.length;
  const startAngle = -Math.PI / 2;

  const points = useMemo(() => {
    return labels.map((l, i) => {
      const angle = startAngle + i * angleStep;
      const val = flavor[l.key] / 5;
      return {
        x: cx + Math.cos(angle) * r * val,
        y: cy + Math.sin(angle) * r * val,
        lx: cx + Math.cos(angle) * (r + 20),
        ly: cy + Math.sin(angle) * (r + 20),
        label: l.label,
        value: flavor[l.key],
      };
    });
  }, [flavor]);

  const polygon = points.map(p => `${p.x},${p.y}`).join(' ');

  const gridLines = [0.2, 0.4, 0.6, 0.8, 1.0].map(scale => {
    const pts = labels.map((_, i) => {
      const angle = startAngle + i * angleStep;
      return `${cx + Math.cos(angle) * r * scale},${cy + Math.sin(angle) * r * scale}`;
    }).join(' ');
    return pts;
  });

  return (
    <svg viewBox="0 0 200 200" className="radar-chart">
      {/* グリッド線 */}
      {gridLines.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      ))}
      {/* 軸線 */}
      {labels.map((_, i) => {
        const angle = startAngle + i * angleStep;
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(angle) * r}
            y2={cy + Math.sin(angle) * r}
            stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"
          />
        );
      })}
      {/* データ */}
      <polygon points={polygon} fill="rgba(212,162,78,0.3)" stroke="#D4A24E" strokeWidth="1.5" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#D4A24E" />
      ))}
      {/* ラベル */}
      {points.map((p, i) => (
        <text key={i} x={p.lx} y={p.ly}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.8)" fontSize="9"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

export default function DrinkPanel({ drink, onClose, onSelect, onNext }) {
  if (!drink) return null;

  return (
    <div className="drink-panel-overlay" onClick={onClose}>
      <div className="drink-panel" onClick={e => e.stopPropagation()}>
        <button className="panel-close" onClick={onClose}>×</button>

        {/* 3Dモデル表示エリア */}
        <div className="drink-3d-area">
          {drink.model ? (
            <Canvas
              camera={{ position: [0, 0, 3], fov: 45 }}
              gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
              style={{ width: '100%', height: '100%' }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[3, 3, 3]} intensity={1.2} />
              <directionalLight position={[-2, 2, -1]} intensity={0.4} />
              <Suspense fallback={null}>
                <DrinkModel modelPath={drink.model} modelScale={2.1} />
              </Suspense>
              <Environment preset="studio" />
            </Canvas>
          ) : (
            <div className="drink-placeholder" style={{ borderColor: drink.color }}>
              <span className="drink-emoji">🍷</span>
            </div>
          )}
        </div>

        <div className="drink-info">
          <span className={`drink-type-badge${drink.secret ? ' secret' : ''}`}>{drink.typeLabel}</span>
          <h2 className="drink-name">{drink.nameJa}</h2>
          <p className="drink-name-en">{drink.name}</p>

          <p className="drink-description">"{drink.description}"</p>

          <div className="drink-meta">
            <RadarChart flavor={drink.flavor} />
            <div className="drink-details">
              <div className="detail-row">
                <span className="detail-label">アルコール度数</span>
                <span className="detail-value">{drink.strength}%</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">産地</span>
                <span className="detail-value">{drink.origin}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">価格</span>
                {drink.originalPrice ? (
                  <span className="detail-value price">
                    <span className="price-original">{drink.originalPrice}</span>
                    <span className="price-discount">{drink.price}</span>
                  </span>
                ) : (
                  <span className="detail-value price">{drink.price}</span>
                )}
              </div>
              <div className="detail-row">
                <span className="detail-label">ペアリング</span>
                <span className="detail-value">{drink.pairing}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="drink-actions">
          <button className="btn-primary" onClick={onSelect}>これにする</button>
          <button className="btn-secondary" onClick={onNext}>他のを見る</button>
        </div>
      </div>
    </div>
  );
}
