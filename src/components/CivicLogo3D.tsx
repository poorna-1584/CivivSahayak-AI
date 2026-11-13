import React, { useEffect } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';

interface CivicLogo3DProps {
  /** Changing this key triggers a smooth 3D Y-axis emblem flip (e.g., switching Sign In / Create Account) */
  spinKey?: string;
  size?: 'sm' | 'lg';
  variant?: 'citizen' | 'admin';
  label?: string;
}

export function CivicLogo3D({
  spinKey = 'login',
  size = 'lg',
  variant = 'citizen',
  label = 'CivicSahayak AI 3D Emblem',
}: CivicLogo3DProps) {
  const prefersReducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const spinDegrees = useMotionValue(0);

  const springConfig = { stiffness: 170, damping: 18, mass: 0.7 };
  const rotateYBase = useSpring(useTransform(pointerX, [-0.5, 0.5], [-22, 22]), springConfig);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [18, -18]), springConfig);
  const spinSpring = useSpring(spinDegrees, { stiffness: 95, damping: 16 });
  const combinedRotateY = useTransform([rotateYBase, spinSpring], ([a, b]) => Number(a) + Number(b));

  useEffect(() => {
    if (prefersReducedMotion) return;
    spinDegrees.set(spinDegrees.get() + 360);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey, prefersReducedMotion]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(x);
    pointerY.set(y);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const isSmall = size === 'sm';
  const boxDim = isSmall ? 'w-24 h-24' : 'w-44 h-44 sm:w-48 sm:h-48';
  const ringAccent = variant === 'admin' ? '#F59E0B' : '#14B8A6';
  const secondaryAccent = variant === 'admin' ? '#38BDF8' : '#F59E0B';

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-label={label}
      className={`relative select-none mx-auto flex items-center justify-center ${boxDim}`}
      style={{ perspective: 1100 }}
    >
      {/* Ambient soft depth aura behind the 3D object */}
      <div
        aria-hidden="true"
        className="absolute inset-4 rounded-full blur-2xl opacity-45 pointer-events-none"
        style={{
          background:
            variant === 'admin'
              ? 'radial-gradient(circle, rgba(245,158,11,0.45), rgba(15,118,110,0.22), transparent 72%)'
              : 'radial-gradient(circle, rgba(20,184,166,0.48), rgba(217,119,6,0.2), transparent 72%)',
        }}
      />

      {/* Interactive 3D Stage */}
      <motion.div
        style={{
          rotateX: prefersReducedMotion ? 0 : rotateX,
          rotateY: prefersReducedMotion ? 0 : combinedRotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={
          prefersReducedMotion
            ? undefined
            : {
                y: [0, -6, 0],
              }
        }
        transition={{
          y: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {/* Back Extrusion Depth Plate (translateZ -16px) */}
        <div
          aria-hidden="true"
          className="absolute inset-5 rounded-3xl border border-teal-400/20 bg-[#071A21]/90 shadow-2xl"
          style={{ transform: 'translateZ(-16px)' }}
        />

        {/* 3D Tilted Outer Gyro Ring 1 */}
        <motion.div
          aria-hidden="true"
          animate={prefersReducedMotion ? undefined : { rotateZ: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-1 rounded-full border-[1.5px] border-dashed opacity-70 pointer-events-none"
          style={{
            borderColor: ringAccent,
            transform: 'rotateX(64deg) rotateY(-18deg) translateZ(6px)',
          }}
        />

        {/* 3D Tilted Inner Gyro Ring 2 */}
        <motion.div
          aria-hidden="true"
          animate={prefersReducedMotion ? undefined : { rotateZ: -360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-3 rounded-full border-[1.5px] opacity-65 pointer-events-none"
          style={{
            borderColor: secondaryAccent,
            transform: 'rotateX(-58deg) rotateY(24deg) translateZ(14px)',
          }}
        >
          {/* Orbiting light prism node */}
          <span
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full shadow-md"
            style={{ backgroundColor: secondaryAccent }}
          />
        </motion.div>

        {/* Core Sculpted Shield Plate (translateZ 22px) */}
        <div
          className={`relative flex items-center justify-center rounded-3xl border border-white/25 shadow-xl ${
            isSmall ? 'w-16 h-16' : 'w-28 h-28 sm:w-32 sm:h-32'
          }`}
          style={{
            transform: 'translateZ(22px)',
            background:
              variant === 'admin'
                ? 'linear-gradient(145deg, #134E4A 0%, #0B252E 58%, #1E293B 100%)'
                : 'linear-gradient(145deg, #0F766E 0%, #0D4B52 55%, #09262E 100%)',
          }}
        >
          {/* Diagonal Glass Specular Reflection */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-3xl pointer-events-none opacity-35"
            style={{
              background:
                'linear-gradient(125deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 42%, transparent 65%)',
            }}
          />

          {/* Floating Emblem SVG (translateZ 36px) */}
          <svg
            viewBox="0 0 96 96"
            className={isSmall ? 'w-10 h-10' : 'w-18 h-18 sm:w-20 sm:h-20'}
            style={{ transform: 'translateZ(18px)' }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="civicShieldGrad" x1="16" y1="12" x2="80" y2="86" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>

            {/* Outer Civic Shield Contour */}
            <path
              d="M48 10L78 21V46C78 65.5 65.2 80.2 48 86C30.8 80.2 18 65.5 18 46V21L48 10Z"
              stroke="url(#civicShieldGrad)"
              strokeWidth="3.2"
              fill="rgba(255,255,255,0.06)"
            />

            {/* Inner Sovereign Arch & Pillar Motif */}
            <path
              d="M32 62H64M36 62V43C36 36.3726 41.3726 31 48 31C54.6274 31 60 36.3726 60 43V62"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Harvest Leaf / Citizen Growth Crest */}
            <path
              d="M48 58V40M48 47C44.5 44 41.5 44 39.5 46C41.5 49 44.5 50 48 49.5M48 45C51.5 42 54.5 42 56.5 44C54.5 47 51.5 48 48 47.5"
              stroke="#6EE7B7"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Apex Beacon Vertex */}
            <circle cx="48" cy="23" r="3.4" fill="#FBBF24" />
          </svg>
        </div>

        {/* Front Floating Specular Crest Badge (translateZ 44px) */}
        {!isSmall && (
          <div
            aria-hidden="true"
            className="absolute -bottom-1 px-3 py-1 rounded-lg bg-white/95 border border-teal-200 shadow-lg text-[11px] font-display font-bold tracking-tight text-teal-900"
            style={{ transform: 'translateZ(44px)' }}
          >
            {variant === 'admin' ? 'Admin Vault' : 'CivicSahayak AI'}
          </div>
        )}
      </motion.div>
    </div>
  );
}
