"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Playable GitHub Cosmos Background (ธีมอวกาศกลางคืนที่มีดาวเล่นได้จริง)
 *
 * คุณสมบัติ:
 * 1. ฟิสิกส์ดวงดาว 3D Parallax พร้อม Twinkle สีโทนอวกาศ (GitHub Universe Style)
 * 2. โหมดเล่นกับดวงดาว 4 รูปแบบ:
 *    - 🌌 "constellation" (วาดกลุ่มดาว): ลากเมาส์เชื่อมดาวเป็นกลุ่มดาวจริง บันทึกรูปทรงไว้บนฟ้า
 *    - 🌠 "meteor" (ยิงดาวตก/ดาวหาง): คลิกหรือลากสะบัดเพื่อยิงดาวหางพร้อมหางละอองเรืองแสง
 *    - 🌀 "gravity" (หลุมดำ / แรงโน้มถ่วง): คลิกค้างเพื่อดูดดาวรอบๆ เข้ามาหมุนวนรอบเคอร์เซอร์
 *    - 💥 "supernova" (ซูเปอร์โนวา): คลิกเพื่อจุดระเบิดดาว แตกสะเก็ดไฟอวกาศและคลื่นกระแทก
 * 3. GitHub Cosmos HUD: แถบควบคุมสไตล์ GitHub Dark (#161b22 / #30363d) ลอยอยู่ด้านล่าง
 *    มีตัวนับสถิติดวงดาว, ปุ่มยิงฝนดาวตก (Meteor Shower), ปุ่ม Big Bang, และย่อ/ขยายได้
 */

type PlayMode = "constellation" | "meteor" | "gravity" | "supernova";

interface Star {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  brightness: number;
  baseBrightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
  depth: number;
  color: string;
  isCustom?: boolean;
}

interface ConstellationLine {
  id: string;
  fromId: number;
  toId: number;
  color: string;
  alpha: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

const STAR_COLORS = [
  "240, 246, 252", // GitHub white
  "121, 192, 255", // GitHub blue #79c0ff
  "187, 160, 255", // GitHub purple #bba0ff
  "126, 231, 135", // GitHub green #7ee787
  "255, 223, 128", // GitHub gold
  "210, 168, 255", // Cosmos violet
];

function pickStarColor(): string {
  const r = Math.random();
  if (r < 0.45) return STAR_COLORS[0];
  if (r < 0.65) return STAR_COLORS[1];
  if (r < 0.80) return STAR_COLORS[2];
  if (r < 0.90) return STAR_COLORS[3];
  if (r < 0.96) return STAR_COLORS[4];
  return STAR_COLORS[5];
}

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const constellationsRef = useRef<ConstellationLine[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);

  const mouseRef = useRef({ x: -999, y: -999 });
  const mouseTargetRef = useRef({ x: -999, y: -999 });
  const isMouseDownRef = useRef(false);
  const dragStartStarRef = useRef<Star | null>(null);
  const currentDragLineRef = useRef<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);

  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const nextStarIdRef = useRef(1);

  // React state for HUD
  const [mode, setMode] = useState<PlayMode>("constellation");
  const modeRef = useRef<PlayMode>("constellation");

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const [stats, setStats] = useState({ stars: 0, constellations: 0, supernovas: 0 });
  const [isHudOpen, setIsHudOpen] = useState(true);
  const [hudMessage, setHudMessage] = useState<string>("คลิกหรือลากเมาส์บนท้องฟ้าเพื่อเล่นกับดวงดาว");

  const createInitialStars = useCallback((w: number, h: number) => {
    const count = Math.min(Math.floor((w * h) / 3800), 300);
    const stars: Star[] = [];

    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      const id = nextStarIdRef.current++;
      const x = Math.random() * w;
      const y = Math.random() * h;
      stars.push({
        id,
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        size: 0.6 + depth * 1.8 + Math.random() * 0.6,
        brightness: 0.2 + depth * 0.5 + Math.random() * 0.3,
        baseBrightness: 0.2 + depth * 0.5 + Math.random() * 0.3,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        depth,
        color: pickStarColor(),
      });
    }

    // Add a few prominent celestial giant stars
    for (let i = 0; i < Math.floor(count * 0.05); i++) {
      const id = nextStarIdRef.current++;
      const x = Math.random() * w;
      const y = Math.random() * h;
      stars.push({
        id,
        x,
        y,
        baseX: x,
        baseY: y,
        vx: 0,
        vy: 0,
        size: 2.2 + Math.random() * 1.6,
        brightness: 0.8 + Math.random() * 0.2,
        baseBrightness: 0.85,
        twinkleSpeed: 0.8 + Math.random() * 1.2,
        twinklePhase: Math.random() * Math.PI * 2,
        depth: 0.9,
        color: pickStarColor(),
      });
    }

    return stars;
  }, []);

  // Helper to trigger Supernova
  const triggerSupernova = useCallback((x: number, y: number) => {
    // Shockwave ring
    shockwavesRef.current.push({
      x,
      y,
      radius: 5,
      maxRadius: 130 + Math.random() * 50,
      alpha: 1,
      color: "121, 192, 255",
    });

    // 40 radiant stardust particles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: 1.5 + Math.random() * 2.5,
        color: pickStarColor(),
      });
    }

    // Spawn 1-2 new stars at explosion center
    if (starsRef.current.length < 500) {
      const newStar: Star = {
        id: nextStarIdRef.current++,
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 2.5,
        brightness: 1,
        baseBrightness: 0.8,
        twinkleSpeed: 2,
        twinklePhase: 0,
        depth: 0.9,
        color: "255, 223, 128",
        isCustom: true,
      };
      starsRef.current.push(newStar);
    }

    setStats((prev) => ({
      ...prev,
      supernovas: prev.supernovas + 1,
      stars: starsRef.current.length,
    }));
  }, []);

  // Helper to launch meteor / comet
  const launchMeteor = useCallback((startX: number, startY: number, targetX?: number, targetY?: number) => {
    let vx: number;
    let vy: number;

    if (targetX !== undefined && targetY !== undefined && (targetX !== startX || targetY !== startY)) {
      const dx = targetX - startX;
      const dy = targetY - startY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const speed = 8 + Math.random() * 6;
      vx = (dx / len) * speed;
      vy = (dy / len) * speed;
    } else {
      const angle = -Math.PI / 5 + (Math.random() - 0.5) * 0.6;
      const speed = 7 + Math.random() * 7;
      vx = Math.cos(angle) * speed * (Math.random() > 0.4 ? 1 : -1);
      vy = Math.sin(angle) * speed - 1;
    }

    shootingStarsRef.current.push({
      x: startX,
      y: startY,
      vx,
      vy,
      life: 1,
      maxLife: 1,
      size: 2 + Math.random() * 2,
      color: pickStarColor(),
    });
  }, []);

  // Meteor shower
  const triggerMeteorShower = useCallback(() => {
    const w = window.innerWidth;
    for (let i = 0; i < 14; i++) {
      setTimeout(() => {
        const x = Math.random() * w * 0.8 + 50;
        launchMeteor(x, -20, x + (Math.random() * 300 - 150), window.innerHeight + 100);
      }, i * 160);
    }
    setHudMessage("🌠 ฝนดาวตกกำลังพุ่งผ่านฟากฟ้า!");
  }, [launchMeteor]);

  // Big Bang / Spawn 50 stars
  const triggerBigBang = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    triggerSupernova(cx, cy);

    for (let i = 0; i < 25; i++) {
      const id = nextStarIdRef.current++;
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * (Math.min(w, h) * 0.4);
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      starsRef.current.push({
        id,
        x,
        y,
        baseX: x,
        baseY: y,
        vx: Math.cos(angle) * (1 + Math.random() * 2),
        vy: Math.sin(angle) * (1 + Math.random() * 2),
        size: 1.5 + Math.random() * 2,
        brightness: 0.9,
        baseBrightness: 0.8,
        twinkleSpeed: 1.5,
        twinklePhase: Math.random() * Math.PI * 2,
        depth: 0.8,
        color: pickStarColor(),
        isCustom: true,
      });
    }

    setStats((prev) => ({ ...prev, stars: starsRef.current.length }));
    setHudMessage("🌌 บิ๊กแบง! ให้กำเนิดดวงดาวใหม่ 25 ดวง");
  }, [triggerSupernova]);

  // Clear constellations
  const clearConstellations = useCallback(() => {
    const count = constellationsRef.current.length;
    const starsToRemove = starsRef.current.filter((s) => s.isCustom).length;
    const originalStars = starsRef.current.filter((s) => !s.isCustom);
    starsRef.current = originalStars;
    constellationsRef.current = [];
    setStats((prev) => ({
      ...prev,
      constellations: 0,
      stars: originalStars.length,
    }));
    setHudMessage(`🧹 ล้างกลุ่มดาว ${count} กลุ่ม และดาวใหม่ ${starsToRemove} ดวง เรียบร้อย`);
  }, []);

  // Main canvas animation loop & event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (starsRef.current.length === 0) {
        starsRef.current = createInitialStars(w, h);
        setStats((prev) => ({ ...prev, stars: starsRef.current.length }));
      }
    };

    resize();
    window.addEventListener("resize", resize);

    // Find nearest star to coordinates
    const findNearestStar = (x: number, y: number, maxDist = 80): Star | null => {
      let nearest: Star | null = null;
      let minDist = maxDist;
      for (const s of starsRef.current) {
        const dx = s.x - x;
        const dy = s.y - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) {
          minDist = d;
          nearest = s;
        }
      }
      return nearest;
    };

    // Pointer event handlers
    const handlePointerMove = (e: MouseEvent) => {
      mouseTargetRef.current = { x: e.clientX, y: e.clientY };

      if (isMouseDownRef.current) {
        const currentMode = modeRef.current;

        // In constellation mode, update the rubber-band line
        if (currentMode === "constellation" && dragStartStarRef.current) {
          currentDragLineRef.current = {
            from: { x: dragStartStarRef.current.x, y: dragStartStarRef.current.y },
            to: { x: e.clientX, y: e.clientY },
          };
        }
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      // Don't intercept clicks inside buttons/inputs or HUD dock
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("button") ||
        target?.closest("a") ||
        target?.closest("input") ||
        target?.closest("textarea") ||
        target?.closest("[data-cosmos-hud]")
      ) {
        return;
      }

      isMouseDownRef.current = true;
      mouseTargetRef.current = { x: e.clientX, y: e.clientY };
      const currentMode = modeRef.current;

      if (currentMode === "constellation") {
        // Find star near click or create one
        let targetStar = findNearestStar(e.clientX, e.clientY, 40);
        if (!targetStar) {
          targetStar = {
            id: nextStarIdRef.current++,
            x: e.clientX,
            y: e.clientY,
            baseX: e.clientX,
            baseY: e.clientY,
            vx: 0,
            vy: 0,
            size: 2.2,
            brightness: 0.95,
            baseBrightness: 0.9,
            twinkleSpeed: 1.2,
            twinklePhase: 0,
            depth: 0.8,
            color: "121, 192, 255", // GitHub blue
            isCustom: true,
          };
          starsRef.current.push(targetStar);
          setStats((prev) => ({ ...prev, stars: starsRef.current.length }));
        }
        dragStartStarRef.current = targetStar;
        currentDragLineRef.current = {
          from: { x: targetStar.x, y: targetStar.y },
          to: { x: e.clientX, y: e.clientY },
        };
      } else if (currentMode === "supernova") {
        triggerSupernova(e.clientX, e.clientY);
      } else if (currentMode === "meteor") {
        launchMeteor(e.clientX, e.clientY);
      }
    };

    const handlePointerUp = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;
      isMouseDownRef.current = false;
      const currentMode = modeRef.current;

      if (currentMode === "constellation" && dragStartStarRef.current) {
        const startStar = dragStartStarRef.current;
        let endStar = findNearestStar(e.clientX, e.clientY, 45);

        // If not dropped on existing star, create one if dragged more than 20px
        const dx = e.clientX - startStar.x;
        const dy = e.clientY - startStar.y;
        const dragDist = Math.sqrt(dx * dx + dy * dy);

        if (!endStar && dragDist > 25) {
          endStar = {
            id: nextStarIdRef.current++,
            x: e.clientX,
            y: e.clientY,
            baseX: e.clientX,
            baseY: e.clientY,
            vx: 0,
            vy: 0,
            size: 2.4,
            brightness: 1,
            baseBrightness: 0.9,
            twinkleSpeed: 1.5,
            twinklePhase: 0,
            depth: 0.85,
            color: "187, 160, 255", // GitHub purple
            isCustom: true,
          };
          starsRef.current.push(endStar);
          setStats((prev) => ({ ...prev, stars: starsRef.current.length }));
        }

        if (endStar && endStar.id !== startStar.id) {
          // Check if line already exists
          const exists = constellationsRef.current.some(
            (c) =>
              (c.fromId === startStar.id && c.toId === endStar!.id) ||
              (c.fromId === endStar!.id && c.toId === startStar.id)
          );
          if (!exists) {
            constellationsRef.current.push({
              id: `${startStar.id}-${endStar.id}`,
              fromId: startStar.id,
              toId: endStar.id,
              color: "121, 192, 255",
              alpha: 0.85,
            });

            // Burst small sparkles at connection point
            for (let i = 0; i < 8; i++) {
              particlesRef.current.push({
                x: endStar.x,
                y: endStar.y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 0.8,
                maxLife: 0.8,
                size: 1.5,
                color: "126, 231, 135", // Green
              });
            }

            setStats((prev) => ({ ...prev, constellations: constellationsRef.current.length }));
            setHudMessage(`✨ เชื่อมกลุ่มดาวสำเร็จ! (รวม ${constellationsRef.current.length} เส้น)`);
          }
        }

        dragStartStarRef.current = null;
        currentDragLineRef.current = null;
      }
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("mouseup", handlePointerUp);

    // Auto subtle shooting stars every 7-14s
    let autoShootTimer: ReturnType<typeof setTimeout>;
    const spawnAutoShoot = () => {
      const w = window.innerWidth;
      const startX = Math.random() * w * 0.8;
      launchMeteor(startX, -10, startX + (Math.random() * 400 - 200), window.innerHeight + 50);
      autoShootTimer = setTimeout(spawnAutoShoot, 7000 + Math.random() * 8000);
    };
    autoShootTimer = setTimeout(spawnAutoShoot, 3500);

    const CONSTELLATION_HOVER_RADIUS = 130;
    const CONSTELLATION_LINE_MAX = 140;

    // Render loop
    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      timeRef.current += 0.016;
      const t = timeRef.current;

      // Mouse smooth interpolation
      const mx = mouseRef.current;
      const mt = mouseTargetRef.current;
      mx.x += (mt.x - mx.x) * 0.1;
      mx.y += (mt.y - mx.y) * 0.1;

      ctx.clearRect(0, 0, w, h);

      const stars = starsRef.current;
      const starMap = new Map<number, Star>();

      // ─── Gravity well behavior (if holding in gravity mode) ───
      const isGravityActive = isMouseDownRef.current && modeRef.current === "gravity";

      // ─── 1. Update and Draw Stars ───
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        starMap.set(s.id, s);

        // Gravity pull if holding in gravity mode
        if (isGravityActive) {
          const dx = mx.x - s.x;
          const dy = mx.y - s.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          if (dist < 320 && dist > 15) {
            const force = (1 - dist / 320) * 1.8;
            // Tangential orbit + radial pull
            const normalX = dx / dist;
            const normalY = dy / dist;
            const tangentX = -normalY;
            const tangentY = normalX;

            s.vx += normalX * force * 0.5 + tangentX * force * 0.9;
            s.vy += normalY * force * 0.5 + tangentY * force * 0.9;
          }
        }

        // Apply velocity with air friction damping
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy *= 0.96;

        // Subtle return to baseX/baseY if not custom
        if (!s.isCustom && !isGravityActive) {
          s.x += (s.baseX - s.x) * 0.005;
          s.y += (s.baseY - s.y) * 0.005;
        }

        // Parallax depth shift from mouse
        const parallaxX = (mx.x - w / 2) * s.depth * 0.02;
        const parallaxY = (mx.y - h / 2) * s.depth * 0.02;
        const renderX = s.x + parallaxX;
        const renderY = s.y + parallaxY;

        // Twinkle calculation
        const twinkle = Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        const twinkleFactor = 0.75 + twinkle * 0.25;
        s.brightness = s.baseBrightness * twinkleFactor;

        // Cursor proximity boost
        const dx = renderX - mx.x;
        const dy = renderY - mx.y;
        const distToCursor = Math.sqrt(dx * dx + dy * dy);
        let proximityBoost = 0;
        if (distToCursor < CONSTELLATION_HOVER_RADIUS) {
          proximityBoost = (1 - distToCursor / CONSTELLATION_HOVER_RADIUS) * 0.6;
        }

        const alpha = Math.min(1, s.brightness + proximityBoost);
        const radius = s.size + proximityBoost * 1.5;

        // Outer glow for brighter stars or stars near cursor
        if (alpha > 0.4 || s.isCustom) {
          ctx.beginPath();
          ctx.arc(renderX, renderY, radius * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.color}, ${alpha * 0.12})`;
          ctx.fill();
        }

        // Star core
        ctx.beginPath();
        ctx.arc(renderX, renderY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
        ctx.fill();

        // Cross flare on bright custom stars
        if (s.isCustom || s.size > 2.5) {
          ctx.strokeStyle = `rgba(${s.color}, ${alpha * 0.35})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(renderX - radius * 2.5, renderY);
          ctx.lineTo(renderX + radius * 2.5, renderY);
          ctx.moveTo(renderX, renderY - radius * 2.5);
          ctx.lineTo(renderX, renderY + radius * 2.5);
          ctx.stroke();
        }
      }

      // ─── 2. Draw Permanent User-Created Constellation Lines ───
      const constellations = constellationsRef.current;
      for (let i = 0; i < constellations.length; i++) {
        const line = constellations[i];
        const s1 = starMap.get(line.fromId);
        const s2 = starMap.get(line.toId);

        if (s1 && s2) {
          const px1 = (mx.x - w / 2) * s1.depth * 0.02;
          const py1 = (mx.y - h / 2) * s1.depth * 0.02;
          const px2 = (mx.x - w / 2) * s2.depth * 0.02;
          const py2 = (mx.y - h / 2) * s2.depth * 0.02;

          const x1 = s1.x + px1;
          const y1 = s1.y + py1;
          const x2 = s2.x + px2;
          const y2 = s2.y + py2;

          // Glowing constellation line
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${line.color}, ${line.alpha * 0.75})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Ambient soft glow
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${line.color}, 0.15)`;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }

      // ─── 3. Rubber-band line while dragging in Constellation Mode ───
      const dragLine = currentDragLineRef.current;
      if (dragLine && modeRef.current === "constellation") {
        ctx.beginPath();
        ctx.moveTo(dragLine.from.x, dragLine.from.y);
        ctx.lineTo(dragLine.to.x, dragLine.to.y);
        ctx.strokeStyle = "rgba(121, 192, 255, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Reticle on target point
        ctx.beginPath();
        ctx.arc(dragLine.to.x, dragLine.to.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(187, 160, 255, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // ─── 4. Dynamic Cursor Constellations (hover lines) ───
      if (mx.x > 0 && mx.y > 0 && !isGravityActive) {
        const nearStars: { star: Star; rx: number; ry: number; dist: number }[] = [];
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const rx = s.x + (mx.x - w / 2) * s.depth * 0.02;
          const ry = s.y + (mx.y - h / 2) * s.depth * 0.02;
          const dx = rx - mx.x;
          const dy = ry - mx.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONSTELLATION_HOVER_RADIUS) {
            nearStars.push({ star: s, rx, ry, dist });
          }
        }

        // Draw connections between near stars
        for (let i = 0; i < nearStars.length; i++) {
          for (let j = i + 1; j < nearStars.length; j++) {
            const a = nearStars[i];
            const b = nearStars[j];
            const dx = a.rx - b.rx;
            const dy = a.ry - b.ry;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < CONSTELLATION_LINE_MAX) {
              const lineAlpha = (1 - d / CONSTELLATION_LINE_MAX) * 0.18;
              ctx.beginPath();
              ctx.moveTo(a.rx, a.ry);
              ctx.lineTo(b.rx, b.ry);
              ctx.strokeStyle = `rgba(121, 192, 255, ${lineAlpha})`;
              ctx.lineWidth = 0.7;
              ctx.stroke();
            }
          }

          // Gentle line to cursor
          const a = nearStars[i];
          const cursorLineAlpha = (1 - a.dist / CONSTELLATION_HOVER_RADIUS) * 0.22;
          ctx.beginPath();
          ctx.moveTo(a.rx, a.ry);
          ctx.lineTo(mx.x, mx.y);
          ctx.strokeStyle = `rgba(187, 160, 255, ${cursorLineAlpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // ─── 5. Gravity Well Vortex Visual Effect ───
      if (isGravityActive) {
        const pulse = Math.sin(t * 8) * 4;
        const rad = 28 + pulse;

        // Gravitational singularity event horizon
        const grad = ctx.createRadialGradient(mx.x, mx.y, 0, mx.x, mx.y, 160);
        grad.addColorStop(0, "rgba(88, 166, 255, 0.45)");
        grad.addColorStop(0.3, "rgba(137, 87, 229, 0.25)");
        grad.addColorStop(0.7, "rgba(56, 139, 253, 0.08)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx.x, mx.y, 160, 0, Math.PI * 2);
        ctx.fill();

        // Event horizon ring
        ctx.beginPath();
        ctx.arc(mx.x, mx.y, rad, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(240, 246, 252, 0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Accretion disk spinning spiral
        ctx.save();
        ctx.translate(mx.x, mx.y);
        ctx.rotate(t * 4);
        ctx.beginPath();
        ctx.ellipse(0, 0, 70, 25, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(121, 192, 255, 0.5)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      // ─── 6. Shooting Stars / Comets ───
      const shoots = shootingStarsRef.current;
      for (let i = shoots.length - 1; i >= 0; i--) {
        const ss = shoots[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.vy += 0.03;
        ss.life -= 0.014;

        if (ss.life <= 0 || ss.x < -60 || ss.x > w + 60 || ss.y > h + 60) {
          shoots.splice(i, 1);
          continue;
        }

        const trailLen = 8;
        for (let tr = 0; tr < trailLen; tr++) {
          const ratio = 1 - tr / trailLen;
          const trailAlpha = ss.life * ratio * 0.7;
          const trailSize = ss.size * ratio;
          const tx = ss.x - ss.vx * tr * 1.4;
          const ty = ss.y - ss.vy * tr * 1.4;

          ctx.beginPath();
          ctx.arc(tx, ty, trailSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${ss.color}, ${trailAlpha})`;
          ctx.fill();
        }

        // Sparkling stardust trail particles
        if (Math.random() < 0.35) {
          particlesRef.current.push({
            x: ss.x,
            y: ss.y,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            life: 0.6,
            maxLife: 0.6,
            size: 1.2,
            color: ss.color,
          });
        }
      }

      // ─── 7. Supernova Shockwaves ───
      const shockwaves = shockwavesRef.current;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.12 + 1.2;
        sw.alpha -= 0.022;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${sw.color}, ${sw.alpha * 0.8})`;
        ctx.lineWidth = 2.5 * sw.alpha;
        ctx.stroke();
      }

      // ─── 8. Particles (Supernova embers & trail sparks) ───
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= 0.02;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = (p.life / p.maxLife) * 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("mouseup", handlePointerUp);
      cancelAnimationFrame(animRef.current);
      clearTimeout(autoShootTimer);
    };
  }, [createInitialStars, launchMeteor, triggerSupernova]);

  return (
    <>
      {/* GitHub Cosmos Deep Night Sky Gradients */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(31, 111, 235, 0.18), transparent 70%), " +
            "radial-gradient(ellipse 60% 50% at 85% 85%, rgba(137, 87, 229, 0.14), transparent 60%), " +
            "radial-gradient(ellipse 50% 40% at 10% 40%, rgba(56, 139, 253, 0.10), transparent 50%), " +
            "linear-gradient(to bottom, #0d1117 0%, #090d16 50%, #010409 100%)",
        }}
      />

      {/* Subtle Cosmos Grid (GitHub style graph lines) */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(240, 246, 252, 0.3) 1px, transparent 1px), " +
            "linear-gradient(90deg, rgba(240, 246, 252, 0.3) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Interactive Cosmos Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0"
        style={{
          display: "block",
          cursor:
            mode === "constellation"
              ? "crosshair"
              : mode === "gravity"
              ? "grab"
              : "pointer",
        }}
      />

      {/* ─── GitHub Universe Cosmos Floating Dock (เล่นได้จริง!) ─── */}
      <div
        data-cosmos-hud
        className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 select-none"
      >
        {/* Helper Hint Toast */}
        {hudMessage && isHudOpen && (
          <div className="bg-[#161b22]/95 border border-[#30363d] backdrop-blur-md text-[#c9d1d9] px-3.5 py-1.5 rounded-lg text-xs font-mono shadow-xl flex items-center gap-2 max-w-sm animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse shrink-0" />
            <span className="truncate">{hudMessage}</span>
          </div>
        )}

        {/* Main Dock Container */}
        <div className="bg-[#161b22]/90 border border-[#30363d] backdrop-blur-lg rounded-2xl shadow-2xl p-2.5 flex flex-col gap-2 min-w-[280px]">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-1.5 pb-1 border-b border-[#21262d]">
            <div className="flex items-center gap-2">
              <span className="text-sm">🪐</span>
              <span className="text-xs font-semibold text-[#f0f6fc] tracking-tight">
                Cosmos Sandbox
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40">
                Playable
              </span>
            </div>
            <button
              onClick={() => setIsHudOpen(!isHudOpen)}
              className="text-[#8b949e] hover:text-[#f0f6fc] text-xs p-1 rounded hover:bg-[#21262d] transition-colors cursor-pointer"
              title={isHudOpen ? "ซ่อนแถบควบคุม" : "เปิดแถบควบคุม"}
            >
              {isHudOpen ? "✕" : "▲"}
            </button>
          </div>

          {isHudOpen && (
            <>
              {/* Interactive Tool Selector */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* 1. Constellation Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setMode("constellation");
                    setHudMessage("🕸️ วาดกลุ่มดาว: คลิกและลากเชื่อมดาวได้เลย!");
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    mode === "constellation"
                      ? "bg-[#1f6feb] text-white shadow-md font-semibold"
                      : "bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] hover:text-white"
                  }`}
                >
                  <span className="text-sm">🕸️</span>
                  <div>
                    <div className="leading-tight">วาดกลุ่มดาว</div>
                    <div className="text-[10px] opacity-75">ลากเชื่อมดาว</div>
                  </div>
                </button>

                {/* 2. Meteor Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setMode("meteor");
                    setHudMessage("🌠 ยิงดาวตก: คลิกหรือลากสะบัดเพื่อยิงดาวหาง!");
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    mode === "meteor"
                      ? "bg-[#1f6feb] text-white shadow-md font-semibold"
                      : "bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] hover:text-white"
                  }`}
                >
                  <span className="text-sm">🌠</span>
                  <div>
                    <div className="leading-tight">ยิงดาวตก</div>
                    <div className="text-[10px] opacity-75">คลิกปล่อยดาวหาง</div>
                  </div>
                </button>

                {/* 3. Gravity Vortex Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setMode("gravity");
                    setHudMessage("🌀 หลุมดำ: คลิกค้างไว้เพื่อดูดดาวเข้ามาโคจรรอบเมาส์!");
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    mode === "gravity"
                      ? "bg-[#8957e5] text-white shadow-md font-semibold"
                      : "bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] hover:text-white"
                  }`}
                >
                  <span className="text-sm">🌀</span>
                  <div>
                    <div className="leading-tight">หลุมดำดูดดาว</div>
                    <div className="text-[10px] opacity-75">คลิกค้างดูดดาว</div>
                  </div>
                </button>

                {/* 4. Supernova Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setMode("supernova");
                    setHudMessage("💥 ซูเปอร์โนวา: คลิกเพื่อจุดระเบิดดาวระยิบระยับ!");
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    mode === "supernova"
                      ? "bg-[#da3633] text-white shadow-md font-semibold"
                      : "bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] hover:text-white"
                  }`}
                >
                  <span className="text-sm">💥</span>
                  <div>
                    <div className="leading-tight">ซูเปอร์โนวา</div>
                    <div className="text-[10px] opacity-75">คลิกจุดระเบิด</div>
                  </div>
                </button>
              </div>

              {/* Quick Cosmic Actions */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={triggerMeteorShower}
                  className="flex-1 py-1 px-2 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white text-[11px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="เรียกฝนดาวตกพุ่งเต็มจอ"
                >
                  <span>☄️</span> ฝนดาวตก
                </button>
                <button
                  type="button"
                  onClick={triggerBigBang}
                  className="flex-1 py-1 px-2 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white text-[11px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="จุดระเบิดบิ๊กแบงเพิ่มดาว 25 ดวง"
                >
                  <span>🌌</span> บิ๊กแบง
                </button>
                <button
                  type="button"
                  onClick={clearConstellations}
                  className="py-1 px-2 rounded-md bg-[#21262d] hover:bg-red-900/30 hover:text-red-400 text-[#8b949e] text-[11px] font-mono transition-colors cursor-pointer"
                  title="ล้างกลุ่มดาวที่วาดไว้"
                >
                  🧹 ล้าง
                </button>
              </div>

              {/* Status Stats */}
              <div className="pt-1.5 border-t border-[#21262d] flex items-center justify-between text-[11px] text-[#8b949e] font-mono px-1">
                <span>⭐ ดาว: {stats.stars}</span>
                <span>🕸️ กลุ่มดาว: {stats.constellations}</span>
                <span>💥 ระเบิด: {stats.supernovas}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
