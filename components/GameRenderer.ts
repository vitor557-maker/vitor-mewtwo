
import { Enemy, Player, Projectile, XpOrb, FloatingText, Decoration } from "../types";

const PIXEL_SIZE = 4;

// Helper to draw a pixel art sprite defined by a grid
const drawSprite = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorMap: Record<number, string>,
  sprite: number[][],
  scale: number = 1
) => {
  const rows = sprite.length;
  const cols = sprite[0].length;
  const currentPixelSize = PIXEL_SIZE * scale;
  const width = cols * currentPixelSize;
  const height = rows * currentPixelSize;
  
  // Center the drawing
  const startX = x - width / 2;
  const startY = y - height / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const colorCode = sprite[r][c];
      if (colorCode !== 0) {
        ctx.fillStyle = colorMap[colorCode];
        ctx.fillRect(startX + c * currentPixelSize, startY + r * currentPixelSize, currentPixelSize, currentPixelSize);
      }
    }
  }
};

// Sprite Definitions (0 is transparent)
const PLAYER_SPRITE = [
  [0, 1, 1, 1, 0],
  [0, 1, 2, 1, 0],
  [1, 1, 1, 1, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1]
];
const PLAYER_COLORS = { 1: '#3b82f6', 2: '#fbbf24' }; // Blue armor, gold face

const SLIME_SPRITE = [
  [0, 0, 3, 3, 0, 0],
  [0, 3, 3, 3, 3, 0],
  [3, 4, 3, 4, 3, 3],
  [3, 3, 3, 3, 3, 3],
];
const SLIME_COLORS = { 3: '#22c55e', 4: '#000' }; // Green body

const BAT_SPRITE = [
  [5, 0, 0, 0, 5],
  [5, 5, 6, 5, 5],
  [0, 5, 5, 5, 0],
];
const BAT_COLORS = { 5: '#a855f7', 6: '#fff' }; // Purple

const BOSS_COLORS = { 3: '#dc2626', 4: '#fbbf24' }; // Red body, gold eyes for boss

// --- Decoration Sprites ---
const PILLAR_SPRITE = [
  [0, 10, 10, 10, 0],
  [0, 10, 11, 10, 0],
  [0, 10, 11, 10, 0],
  [0, 10, 11, 10, 0],
  [0, 10, 11, 10, 0],
  [0, 10, 11, 10, 0],
  [10, 10, 11, 10, 10], // Base
  [10, 11, 11, 11, 10], // Base bottom
];
const PILLAR_COLORS = { 10: '#57534e', 11: '#78716c' }; // Stone Grays

const ROCK_SPRITE = [
  [0, 10, 10, 0],
  [10, 11, 11, 10],
  [10, 11, 11, 10],
  [0, 10, 10, 0],
];
const ROCK_COLORS = { 10: '#57534e', 11: '#78716c' }; // Stone Grays

const FLOWER_SPRITE = [
  [0, 12, 0],
  [12, 13, 12],
  [0, 14, 0]
];
const FLOWER_COLORS = { 12: '#f472b6', 13: '#fef08a', 14: '#22c55e' }; // Pink petals, yellow center, green stem

const GRASS_SPRITE = [
  [0, 15, 0],
  [15, 15, 15],
];
const GRASS_COLORS = { 15: '#365314' }; // Dark green grass

export const renderGame = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  player: Player,
  enemies: Enemy[],
  projectiles: Projectile[],
  xpOrbs: XpOrb[],
  floatingTexts: FloatingText[],
  decorations: Decoration[],
  gameTime: number
) => {
  // 1. Clear Canvas & Draw Forest Floor
  ctx.fillStyle = '#1b2618'; // Deep dark forest green
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const camX = player.pos.x - canvas.width / 2;
  const camY = player.pos.y - canvas.height / 2;

  ctx.save();
  ctx.translate(-camX, -camY);

  // 2. Draw Decorations (Scenery)
  // Simple visibility culling
  decorations.forEach(dec => {
    // Check if in view (with some padding)
    if (
      dec.pos.x > camX - 100 && dec.pos.x < camX + canvas.width + 100 &&
      dec.pos.y > camY - 100 && dec.pos.y < camY + canvas.height + 100
    ) {
      if (dec.type === 'PILLAR') {
        drawSprite(ctx, dec.pos.x, dec.pos.y, PILLAR_COLORS, PILLAR_SPRITE, dec.scale);
      } else if (dec.type === 'ROCK') {
        drawSprite(ctx, dec.pos.x, dec.pos.y, ROCK_COLORS, ROCK_SPRITE, dec.scale);
      } else if (dec.type === 'FLOWER') {
        drawSprite(ctx, dec.pos.x, dec.pos.y, FLOWER_COLORS, FLOWER_SPRITE, dec.scale);
      } else {
        drawSprite(ctx, dec.pos.x, dec.pos.y, GRASS_COLORS, GRASS_SPRITE, dec.scale);
      }
    }
  });

  // 3. Draw XP Orbs
  xpOrbs.forEach(orb => {
    if (orb.isBossDrop) {
      ctx.fillStyle = '#ec4899'; // Pink for boss drop
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ec4899';
      ctx.beginPath();
      ctx.arc(orb.pos.x, orb.pos.y, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#fbbf24';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#fbbf24';
      ctx.beginPath();
      ctx.arc(orb.pos.x, orb.pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  });

  // 3.5 Draw Poison Aura if active
  if (player.poisonDamage > 0) {
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)'; // Transparent Green
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.poisonRange, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 4. Draw Projectiles
  projectiles.forEach(proj => {
    if (proj.type === 'meteor') {
      // Meteor Visual
      ctx.fillStyle = '#ea580c'; // Orange/Red
      ctx.beginPath();
      ctx.arc(proj.pos.x, proj.pos.y, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Trail
      ctx.fillStyle = 'rgba(251, 146, 60, 0.5)';
      ctx.beginPath();
      ctx.arc(proj.pos.x, proj.pos.y - 10, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Standard
      if (proj.effect === 'BURN') ctx.fillStyle = '#f97316'; // Orange
      else if (proj.effect === 'FREEZE') ctx.fillStyle = '#06b6d4'; // Cyan
      else ctx.fillStyle = '#fff';
      
      ctx.beginPath();
      ctx.arc(proj.pos.x, proj.pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 5. Draw Enemies
  enemies.forEach(enemy => {
    const isFrozen = enemy.freezeTimer > 0;
    const isBurning = enemy.burnTimer > 0;

    if (enemy.isBoss) {
      // Boss - Reusing Slime Sprite but Big and Red
      drawSprite(ctx, enemy.pos.x, enemy.pos.y, BOSS_COLORS, SLIME_SPRITE, 5); // 5x Scale
    } else if (enemy.type === 'slime') {
      drawSprite(ctx, enemy.pos.x, enemy.pos.y, SLIME_COLORS, SLIME_SPRITE);
    } else {
      drawSprite(ctx, enemy.pos.x, enemy.pos.y, BAT_COLORS, BAT_SPRITE);
    }

    // Status Visuals
    if (isFrozen) {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.beginPath();
      const radius = enemy.isBoss ? 40 : 10;
      ctx.arc(enemy.pos.x, enemy.pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (isBurning) {
       // Simple particle effect for burn
       ctx.fillStyle = '#ef4444';
       ctx.fillRect(enemy.pos.x + (Math.random() * 10 - 5), enemy.pos.y - 15, 4, 4);
    }
    
    // Enemy HP Bar
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    const barWidth = enemy.isBoss ? 60 : 20;
    const barOffset = enemy.isBoss ? 50 : 15;
    
    ctx.fillStyle = 'red';
    ctx.fillRect(enemy.pos.x - barWidth/2, enemy.pos.y - barOffset, barWidth, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(enemy.pos.x - barWidth/2, enemy.pos.y - barOffset, barWidth * hpPct, 4);
  });

  // 6. Draw Player
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(player.pos.x, player.pos.y + 10, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  drawSprite(ctx, player.pos.x, player.pos.y, PLAYER_COLORS, PLAYER_SPRITE);

  // 7. Draw Floating Text
  floatingTexts.forEach(txt => {
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = txt.color;
    ctx.fillText(txt.text, txt.pos.x, txt.pos.y);
  });

  ctx.restore();

  // 8. Draw Vignette (Overlay)
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height / 3,
    canvas.width / 2, canvas.height / 2, canvas.height
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 9. Draw UI (Timer) - Absolute position on screen, not world
  const totalSeconds = Math.floor(gameTime / 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  ctx.font = '20px "Press Start 2P"';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(timeString, canvas.width / 2, 40);
  ctx.textAlign = 'left'; // Reset
};
