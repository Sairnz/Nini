import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import "./Letter.css";

const Letter = () => {
  const [isOpened, setIsOpened] = useState(false);
  const [isHappyJump, setIsHappyJump] = useState(false);
  const [isPenguinVisible, setIsPenguinVisible] = useState(true);
  const [isReturning, setIsReturning] = useState(false);

  // Particles / sound
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState([]);

  // Delivery configuration (ms)
  const DELIVERY_MS = 900; // adjust to make delivery longer/shorter
  const FLAP_MS = 600; // flap open duration (syncs with delivery)

  // Generate simple particle set
  const spawnParticles = (count = 10) => {
    const cols = ["#FFD166", "#06D6A0", "#118AB2", "#EF476F"];
    const parts = Array.from({ length: count }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      const x = Math.cos(angle) * dist * (Math.random() > 0.6 ? 1 : -1);
      const y = Math.sin(angle) * dist - (60 + Math.random() * 40);
      const size = Math.round(6 + Math.random() * 14);
      return { id: i + "-" + Date.now() + Math.random().toString(36).slice(2), x: Math.round(x), y: Math.round(y), color: cols[i % cols.length], size };
    });
    setParticles((prev) => prev.concat(parts));
    setShowParticles(true);
    setTimeout(() => {
      setShowParticles(false);
      setParticles([]);
    }, 900);
  };

  // interval ref for continuous trail particles while delivering
  const jumpIntervalRef = useRef(null);
  // animation controls for more reliable, imperative sequences
  const penguinControls = useAnimation();

  useEffect(() => {
    return () => {
      if (jumpIntervalRef.current) {
        clearInterval(jumpIntervalRef.current);
        jumpIntervalRef.current = null;
      }
    };
  }, []);

  // drive the penguinControls in response to state changes (non-happy sequences)
  useEffect(() => {
    if (isReturning) {
      penguinControls.start({
        y: [-80, -10, 0, -6, 0],
        opacity: [0, 1, 1, 1, 1],
        scale: [0.85, 1.05, 0.98, 1.02, 1],
        rotate: [-10, -6, 0, -2, 0],
        transition: { duration: 0.75, ease: "easeOut" }
      });
      return;
    }

    if (isOpened) {
      // small pose perched beside the opened letter
      penguinControls.start({ y: -40, rotate: -6, x: 18, scale: 1, opacity: 1 });
      return;
    }

    // default idle
    penguinControls.start({ y: 0, rotate: 0, x: 0, scale: 1, opacity: 1 });
  }, [isReturning, isOpened, penguinControls]);

  // Small chime for delivery using WebAudio
  const playDeliverySound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880; // start frequency
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      o.frequency.setValueAtTime(880, now);
      o.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      o.start(now);
      o.stop(now + 0.65);
    } catch (e) {
      // ignore if WebAudio unsupported
    }
  };

  return (
    <div className="container">
      <AnimatePresence>
        {(isPenguinVisible && !isOpened) && (<>
          <motion.div
            key="penguin"
            className="penguin"
            initial={{ y: -20, opacity: 0 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              if (isOpened) return; // ignore clicks while open; use close button to close

              // defensive cleanup
              if (jumpIntervalRef.current) {
                clearInterval(jumpIntervalRef.current);
                jumpIntervalRef.current = null;
              }

              // run a faster up-and-down jump (~900ms)
              const JUMP_MS = 900;

              setIsHappyJump(true);
              spawnParticles(6);
              playDeliverySound();

              // small particles during the jump to add life
              jumpIntervalRef.current = setInterval(() => spawnParticles(1), 350);

              // animate up-and-down quickly, then hide penguin and open letter
              await penguinControls.start({
                y: [0, -80, 0, -44, 0],
                x: [0, 8, 0, -6, 0],
                rotate: [0, -8, 0, 6, 0],
                scale: [1, 1.12, 1, 1.06, 1],
                opacity: [1, 1, 1, 1, 1],
                transition: { duration: JUMP_MS / 1000, ease: "easeInOut" }
              });

              // stop particles for the jump
              if (jumpIntervalRef.current) {
                clearInterval(jumpIntervalRef.current);
                jumpIntervalRef.current = null;
              }

              // hide penguin first so it won't sit above the letter, then show the letter
              setIsHappyJump(false);
              setIsPenguinVisible(false);
              // small tick to ensure unmount / layout update before mounting the letter
              await new Promise((res) => setTimeout(res, 40));
              setIsOpened(true);
            }}
            animate={penguinControls}
            onUpdate={() => {
              /* keep state-driven fallbacks in sync; nothing here for now */
            }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            // default spring for non-imperative animations
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            role="button"
            aria-label="Penguin delivering letter"
          >
            <span className="penguin-body">🐧</span>
            <span className="penguin-letter">✉️</span>
          </motion.div>

          {/* ensure penguin returns to base pose when certain states change */}
          {/** Use effect below to react to state changes and drive controls **/}

          </>)}
      </AnimatePresence> 

      {/* particles emitted at delivery point */}
      {showParticles && (
        <div className="particles-root" aria-hidden>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="particle"
              style={{ left: '50%', top: '50%', position: 'absolute', transform: 'translate(-50%, -50%)', width: p.size + 'px', height: p.size + 'px', background: p.color }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}

      <AnimatePresence onExitComplete={() => {
        setIsPenguinVisible(true);
        setIsReturning(true);
        // play a short hop-back animation
        setTimeout(() => setIsReturning(false), 750);
      }}>
        {isOpened && (
          <div className="letter"> {/* outer centered wrapper */}
            <motion.div
              key="letter-card"
              className="letter-card"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
              role="dialog"
              aria-label="Opened letter"
            >
            <motion.div
              className="letter-flap"
              initial={{ rotateX: 0 }}
              animate={{ rotateX: -180 }}
              transition={{ duration: FLAP_MS / 1000, ease: "easeOut" }}
              aria-hidden="true"
            />

            <button
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpened(false);
              }}
              aria-label="Close letter"
            >
              ✕
            </button>

            <p className="letter-heading">Nini</p>

            <p className="letter-content">
  Since our paths first crossed, <br />
  there’s been a quiet warmth in my days. <br />
  In calls, in games, or in the simple moments we share, <br />
  the time spent together has become something I truly appreciate.
</p>

<p className="letter-content">
  Even in silence, your presence is grounding. <br />
  No matter the distance or the hour, <br />
  knowing we can connect when needed brings a subtle ease to my days.
</p>

<p className="letter-content">
  There’s a natural ease to being around you, <br />
  a rhythm in our interactions that feels rare. <br />
  The moments we share leave a lasting impression, <br />
  lingering quietly after the call ends.
</p>

<p className="letter-content">
  As the year draws to a close and a new one begins, <br />
  I hope it brings you meaningful moments, calm, and small joys. <br />
  Thank you for the time and presence you’ve shared, <br />
  and Happy New Year, Nini.
</p>
            <p className="letter-signature">
              Warmly, <br />
              Renren
            </p>
          </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Letter;