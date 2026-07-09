import React, { useEffect, useState } from 'react';
import './HandshakeMeme.css';

/**
 * Easter egg: handshake "67" meme animation
 * Появляется при создании привычки или категории.
 * Экран делится пополам, руки съезжаются и жмут друг другу.
 */
const HandshakeMeme = ({ onDone }) => {
  const [phase, setPhase] = useState('split'); // split → shake → done

  useEffect(() => {
    // Фаза 1: руки съезжаются (0.8s)
    const t1 = setTimeout(() => setPhase('shake'), 800);
    // Фаза 2: трясутся (0.7s)
    const t2 = setTimeout(() => setPhase('explode'), 1500);
    // Фаза 3: исчезают
    const t3 = setTimeout(() => onDone?.(), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className={`handshake-overlay phase-${phase}`}>
      {/* Левая половина экрана */}
      <div className="hs-half hs-left">
        <div className="hs-hand hs-hand-left">🤜</div>
      </div>

      {/* Правая половина экрана */}
      <div className="hs-half hs-right">
        <div className="hs-hand hs-hand-right">🤛</div>
      </div>

      {/* Число 67 по центру */}
      <div className="hs-number">
        <span>6</span><span>7</span>
      </div>
    </div>
  );
};

export default HandshakeMeme;
