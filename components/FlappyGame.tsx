"use client";

import { useEffect, useRef, useState } from "react";

const WIDTH = 320;
const HEIGHT = 420;
const GRAVITY = 0.1;
const FLAP_VELOCITY = -3.8;
const BIRD_X = 70;
const BIRD_RADIUS = 12;
const PIPE_WIDTH = 52;
const PIPE_GAP = 130;
const PIPE_SPEED = 1.8;
const PIPE_SPAWN_FRAMES = 130;
const BEST_SCORE_KEY = "flappy-best-score";

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

interface TrailDot {
  x: number;
  y: number;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
}

type GameState = "idle" | "playing" | "over";

function makeStars(count: number, speedMin: number, speedMax: number, sizeMin: number, sizeMax: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    size: sizeMin + Math.random() * (sizeMax - sizeMin),
    speed: speedMin + Math.random() * (speedMax - speedMin),
    alpha: 0.3 + Math.random() * 0.5,
  }));
}

export default function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<GameState>("idle");
  const [best, setBest] = useState(0);

  const birdY = useRef(HEIGHT / 2);
  const velocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const frame = useRef(0);
  const stateRef = useRef<GameState>("idle");
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const shakeFrames = useRef(0);
  const flapPulse = useRef(0);
  const trail = useRef<TrailDot[]>([]);
  const particles = useRef<Particle[]>([]);
  const starsFar = useRef<Star[]>(makeStars(25, 0.15, 0.35, 1, 1.8));
  const starsNear = useRef<Star[]>(makeStars(15, 0.5, 0.9, 1.5, 2.6));

  // โหลด High Score จาก localStorage ตอน mount (client-side เท่านั้น)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BEST_SCORE_KEY);
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านค่าจาก localStorage (external system) ตอน mount ครั้งเดียว ไม่ใช่ cascading state update
          setBest(n);
          bestRef.current = n;
        }
      }
    } catch {
      // localStorage ไม่พร้อมใช้งาน (private mode ฯลฯ) — ข้ามไปเงียบๆ ไม่กระทบการเล่น
    }
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const resetGame = () => {
    birdY.current = HEIGHT / 2;
    velocity.current = 0;
    pipes.current = [];
    frame.current = 0;
    scoreRef.current = 0;
    trail.current = [];
    particles.current = [];
    shakeFrames.current = 0;
  };

  const spawnFlapParticles = () => {
    for (let i = 0; i < 5; i++) {
      particles.current.push({
        x: BIRD_X - 8,
        y: birdY.current + 6,
        vx: -1.5 - Math.random() * 1.5,
        vy: (Math.random() - 0.5) * 2,
        alpha: 0.8,
      });
    }
  };

  const flap = () => {
    if (stateRef.current === "idle") {
      resetGame();
      setState("playing");
      stateRef.current = "playing";
      velocity.current = FLAP_VELOCITY;
      flapPulse.current = 8;
      spawnFlapParticles();
    } else if (stateRef.current === "playing") {
      velocity.current = FLAP_VELOCITY;
      flapPulse.current = 8;
      spawnFlapParticles();
    } else if (stateRef.current === "over") {
      resetGame();
      setState("playing");
      stateRef.current = "playing";
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const endGame = () => {
      stateRef.current = "over";
      setState("over");
      shakeFrames.current = 14;
      if (scoreRef.current > bestRef.current) {
        bestRef.current = scoreRef.current;
        setBest(scoreRef.current);
        try {
          localStorage.setItem(BEST_SCORE_KEY, String(scoreRef.current));
        } catch {
          // ข้ามถ้า localStorage ใช้ไม่ได้
        }
      }
    };

    const drawStars = (stars: Star[], playing: boolean) => {
      for (const s of stars) {
        if (playing) {
          s.x -= s.speed;
          if (s.x < 0) {
            s.x = WIDTH;
            s.y = Math.random() * HEIGHT;
          }
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      // คำนวณการสั่นของจอตอนชน (decay ลงเรื่อยๆ)
      let shakeX = 0;
      let shakeY = 0;
      if (shakeFrames.current > 0) {
        const magnitude = (shakeFrames.current / 14) * 6;
        shakeX = (Math.random() - 0.5) * magnitude;
        shakeY = (Math.random() - 0.5) * magnitude;
        shakeFrames.current--;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);
      ctx.clearRect(-10, -10, WIDTH + 20, HEIGHT + 20);

      // พื้นหลังไล่สีเข้ากับธีมแอป + ดาว parallax 2 ชั้น
      const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      bg.addColorStop(0, "#0f172a");
      bg.addColorStop(1, "#090d16");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      drawStars(starsFar.current, stateRef.current === "playing");
      drawStars(starsNear.current, stateRef.current === "playing");

      if (stateRef.current === "playing") {
        frame.current++;
        velocity.current += GRAVITY;
        birdY.current += velocity.current;

        if (flapPulse.current > 0) flapPulse.current--;

        // เก็บ trail ตำแหน่งนกไว้วาดหางเรืองแสงด้านหลัง
        trail.current.push({ x: BIRD_X, y: birdY.current, alpha: 0.5 });
        if (trail.current.length > 10) trail.current.shift();

        if (frame.current % PIPE_SPAWN_FRAMES === 0) {
          const gapY = 70 + Math.random() * (HEIGHT - 140);
          pipes.current.push({ x: WIDTH, gapY, passed: false });
        }

        for (const pipe of pipes.current) {
          pipe.x -= PIPE_SPEED;

          if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.passed = true;
            scoreRef.current += 1;
          }

          const withinPipeX = BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH;
          const hitsGap =
            birdY.current - BIRD_RADIUS < pipe.gapY - PIPE_GAP / 2 ||
            birdY.current + BIRD_RADIUS > pipe.gapY + PIPE_GAP / 2;
          if (withinPipeX && hitsGap) {
            endGame();
          }
        }
        pipes.current = pipes.current.filter((p) => p.x + PIPE_WIDTH > -10);

        if (birdY.current + BIRD_RADIUS > HEIGHT || birdY.current - BIRD_RADIUS < 0) {
          endGame();
        }
      }

      // อัปเดต + วาด particle ฝุ่นตอนกระพือปีก
      particles.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.045;
      });
      particles.current = particles.current.filter((p) => p.alpha > 0);
      for (const p of particles.current) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(165, 180, 252, ${Math.max(0, p.alpha)})`;
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // วาดท่อ (โทนสี indigo/cyan ให้เข้าธีม)
      for (const pipe of pipes.current) {
        const grad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
        grad.addColorStop(0, "#6366f1");
        grad.addColorStop(1, "#22d3ee");
        ctx.fillStyle = grad;
        const topHeight = pipe.gapY - PIPE_GAP / 2;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topHeight);
        ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP / 2, PIPE_WIDTH, HEIGHT - (pipe.gapY + PIPE_GAP / 2));
      }

      // วาดหางเรืองแสงตามเส้นทางที่นกบินผ่าน
      trail.current.forEach((t, i) => {
        const a = (i / trail.current.length) * 0.25;
        ctx.beginPath();
        ctx.fillStyle = `rgba(99, 102, 241, ${a})`;
        ctx.arc(t.x, t.y, BIRD_RADIUS * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // วาดนก — ขยายเล็กน้อยตอนกระพือปีกให้ดูมีชีวิตชีวา (flap pulse)
      const pulseScale = 1 + (flapPulse.current / 8) * 0.35;
      ctx.font = `${28 * pulseScale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tilt = Math.max(-0.5, Math.min(0.9, velocity.current / 10));
      ctx.save();
      ctx.translate(BIRD_X, birdY.current);
      ctx.rotate(tilt);
      ctx.fillText("🐤", 0, 0);
      ctx.restore();

      // ข้อความ overlay ตามสถานะ
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "center";
      if (stateRef.current === "idle") {
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("แตะ / กด Space เพื่อเริ่ม", WIDTH / 2, HEIGHT / 2 - 20);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("บินหลบท่อให้ได้นานที่สุด", WIDTH / 2, HEIGHT / 2 + 6);
      } else if (stateRef.current === "over") {
        ctx.font = "bold 18px sans-serif";
        ctx.fillText("💥 เกมจบแล้ว", WIDTH / 2, HEIGHT / 2 - 10);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("แตะ / กด Space เพื่อเล่นใหม่", WIDTH / 2, HEIGHT / 2 + 14);
      }

      // คะแนนมุมบน
      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "left";
      ctx.fillText(String(scoreRef.current), 14, 30);

      ctx.restore();

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="glass-panel rounded-3xl p-6 flex flex-col items-center gap-3 w-fit mx-auto">
      <div className="flex items-center justify-between w-full text-xs text-slate-400 px-1">
        <span>🎮 พักสายตาแป๊บ</span>
        <span>สถิติสูงสุด: {best}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onClick={flap}
        onTouchStart={(e) => {
          e.preventDefault();
          flap();
        }}
        className="rounded-2xl border border-slate-800 cursor-pointer touch-none select-none"
      />
      <p className="text-[11px] text-slate-500">คลิก/แตะ หรือกด Space เพื่อบิน</p>
    </div>
  );
}
