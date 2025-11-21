
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { renderGame } from './GameRenderer';
import { GameState, Player, Enemy, Projectile, XpOrb, FloatingText, UpgradeCard, Position, Decoration } from '../types';
import { generateUpgrades } from '../services/geminiService';
import { Loader2, Heart, Zap, Swords, Flame, Snowflake, Skull, CloudFog, CloudRain, GraduationCap } from 'lucide-react';

// --- Constants ---
const PLAYER_SPEED_BASE = 3;
const MAP_BOUNDS = { width: 2000, height: 2000 };
const SPAWN_RATE_INITIAL = 60; // frames
const BOSS_SPAWN_TIME = 5 * 60 * 60; // 5 minutes * 60 seconds * 60 frames

interface GameLogicProps {
  onGameStateChange: (state: GameState) => void;
  mobileMode: boolean;
}

const GameLogic: React.FC<GameLogicProps> = ({ onGameStateChange, mobileMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Joystick Refs
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDraggingJoystick, setIsDraggingJoystick] = useState(false);

  // React State for UI Overlays (updates less frequently)
  const [uiState, setUiState] = useState<{
    hp: number;
    maxHp: number;
    xp: number;
    xpNext: number;
    level: number;
    score: number;
  }>({ hp: 100, maxHp: 100, xp: 0, xpNext: 50, level: 1, score: 0 });

  const [gameState, setLocalGameState] = useState<GameState>(GameState.MENU);
  const [upgrades, setUpgrades] = useState<UpgradeCard[]>([]);
  const [loadingUpgrades, setLoadingUpgrades] = useState(false);
  const [isBossReward, setIsBossReward] = useState(false);

  // Mutable Game State (updates 60fps)
  const gameRef = useRef({
    keys: {} as Record<string, boolean>,
    inputVector: { x: 0, y: 0 }, // Joystick input
    player: {
      pos: { x: MAP_BOUNDS.width / 2, y: MAP_BOUNDS.height / 2 },
      hp: 100,
      maxHp: 100,
      speed: PLAYER_SPEED_BASE,
      damage: 10,
      attackCooldown: 30,
      attackRange: 200,
      level: 1,
      xp: 0,
      xpToNextLevel: 50,
      projectileCount: 1,
      burnChance: 0,
      freezeChance: 0,
      poisonDamage: 0,
      poisonRange: 150,
      meteorLevel: 0,
      xpMultiplier: 1
    } as Player,
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    xpOrbs: [] as XpOrb[],
    floatingTexts: [] as FloatingText[],
    decorations: [] as Decoration[],
    frame: 0,
    gameTime: 0,
    spawnRate: SPAWN_RATE_INITIAL,
    score: 0
  });

  // --- Initialization ---
  useEffect(() => {
    // Generate Map Decorations once
    const decorations: Decoration[] = [];
    
    // Stone Pillars (Few and scattered far apart)
    for (let i = 0; i < 25; i++) {
      decorations.push({
        id: `pillar-${i}`,
        pos: { x: Math.random() * MAP_BOUNDS.width, y: Math.random() * MAP_BOUNDS.height },
        type: 'PILLAR',
        scale: 3 + Math.random() * 1, // Large scale
        variation: 0
      });
    }

    // Grass/Flowers (Keep for ground detail)
    for (let i = 0; i < 600; i++) {
      decorations.push({
        id: `grass-${i}`,
        pos: { x: Math.random() * MAP_BOUNDS.width, y: Math.random() * MAP_BOUNDS.height },
        type: Math.random() > 0.8 ? 'FLOWER' : 'GRASS',
        scale: 1,
        variation: 0
      });
    }
    
    // Rocks
    for (let i = 0; i < 50; i++) {
       decorations.push({
        id: `rock-${i}`,
        pos: { x: Math.random() * MAP_BOUNDS.width, y: Math.random() * MAP_BOUNDS.height },
        type: 'ROCK',
        scale: 1 + Math.random(),
        variation: 0
      });
    }

    gameRef.current.decorations = decorations;
  }, []);

  // --- Input Handling (Keyboard) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { gameRef.current.keys[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { gameRef.current.keys[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Joystick Handling ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDraggingJoystick(true);
    updateJoystick(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDraggingJoystick) {
      updateJoystick(e);
    }
  };

  const handleTouchEnd = () => {
    setIsDraggingJoystick(false);
    setJoystickPos({ x: 0, y: 0 });
    gameRef.current.inputVector = { x: 0, y: 0 };
  };

  const updateJoystick = (e: React.TouchEvent) => {
    if (!joystickRef.current) return;

    const touch = e.touches[0];
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const maxRadius = rect.width / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize if outside radius
    if (distance > maxRadius) {
      const ratio = maxRadius / distance;
      dx *= ratio;
      dy *= ratio;
    }

    setJoystickPos({ x: dx, y: dy });
    
    // Set input vector (-1 to 1)
    gameRef.current.inputVector = {
      x: dx / maxRadius,
      y: dy / maxRadius
    };
  };

  // --- Core Game Loop ---
  const update = useCallback(() => {
    const state = gameRef.current;
    const { player, enemies, projectiles, xpOrbs, floatingTexts, keys, decorations, inputVector } = state;

    if (player.hp <= 0) {
      setLocalGameState(GameState.GAME_OVER);
      onGameStateChange(GameState.GAME_OVER);
      return; // Stop updating
    }

    state.frame++;
    state.gameTime++;

    // 1. Player Movement
    let dx = 0;
    let dy = 0;
    
    // Keyboard Input
    if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) dy += 1;
    if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dx += 1;

    // Joystick Input (Overrides keyboard if active)
    if (inputVector.x !== 0 || inputVector.y !== 0) {
      dx = inputVector.x;
      dy = inputVector.y;
    } else if (dx !== 0 || dy !== 0) {
      // Normalize keyboard vector
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
    }

    // Apply Movement
    player.pos.x += dx * player.speed;
    player.pos.y += dy * player.speed;

    // Boundary check
    player.pos.x = Math.max(20, Math.min(MAP_BOUNDS.width - 20, player.pos.x));
    player.pos.y = Math.max(20, Math.min(MAP_BOUNDS.height - 20, player.pos.y));

    // 2. Enemy Spawning
    
    // BOSS SPAWN LOGIC
    if (state.gameTime > 0 && state.gameTime % BOSS_SPAWN_TIME === 0) {
       addFloatingText(player.pos, "BOSS CHEGOU!", '#dc2626');
       enemies.push({
          id: `boss-${state.gameTime}`,
          pos: { x: player.pos.x + 300, y: player.pos.y }, // Spawn relatively close
          hp: 1000 + (player.level * 100),
          maxHp: 1000 + (player.level * 100),
          speed: 1.5,
          damage: 30 + player.level,
          type: 'boss',
          isBoss: true,
          freezeTimer: 0,
          burnTimer: 0
       });
    }
    
    // Regular Spawn
    const currentSpawnRate = Math.max(10, SPAWN_RATE_INITIAL - Math.floor(player.level * 2));
    const bossAlive = enemies.some(e => e.isBoss);
    
    if (state.frame % (bossAlive ? currentSpawnRate * 3 : currentSpawnRate) === 0) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 400;
      const ex = player.pos.x + Math.cos(angle) * radius;
      const ey = player.pos.y + Math.sin(angle) * radius;
      
      if (ex > 0 && ex < MAP_BOUNDS.width && ey > 0 && ey < MAP_BOUNDS.height) {
        const maxHp = 10 + (player.level * 5);
        enemies.push({
          id: `e-${state.frame}`,
          pos: { x: ex, y: ey },
          hp: maxHp,
          maxHp: maxHp,
          speed: 1 + (player.level * 0.1),
          damage: 5 + player.level,
          type: Math.random() > 0.7 ? 'bat' : 'slime',
          isBoss: false,
          freezeTimer: 0,
          burnTimer: 0
        });
      }
    }

    // 3. Passive Skills (Poison & Meteor)
    
    // Poison Area Logic
    if (player.poisonDamage > 0 && state.frame % 60 === 0) {
      enemies.forEach((enemy, idx) => {
        const dist = Math.hypot(player.pos.x - enemy.pos.x, player.pos.y - enemy.pos.y);
        if (dist <= player.poisonRange) {
          enemy.hp -= player.poisonDamage;
          addFloatingText(enemy.pos, `${player.poisonDamage}`, '#10b981'); // Green text
          if (enemy.hp <= 0) handleEnemyDeath(idx);
        }
      });
    }

    // Meteor Rain Logic
    if (player.meteorLevel > 0) {
      // Chance per frame to spawn a meteor. Higher level = more frequent.
      // Level 1 ~ every 3 seconds (180 frames). 
      // Chance = 1/180.
      const meteorChance = 0.005 * player.meteorLevel;
      if (Math.random() < meteorChance) {
        // Spawn random meteor near player
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 300;
        const targetX = player.pos.x + Math.cos(angle) * dist;
        const targetY = player.pos.y + Math.sin(angle) * dist;
        
        projectiles.push({
          id: `meteor-${state.frame}-${Math.random()}`,
          pos: { x: targetX, y: targetY - 300 }, // Start "high up" visually (y offset handled in renderer usually, but here we simulate travel)
          velocity: { x: 0, y: 10 }, // Fast fall down
          damage: player.damage * 3,
          duration: 30, // Quick life
          type: 'meteor',
          blastRadius: 60,
          effect: 'BURN'
        });
      }
    }

    // 4. Enemy Logic
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      
      // Skip dead enemies (handled in poison logic)
      if (enemy.hp <= 0) continue; 

      let currentSpeed = enemy.speed;
      
      if (enemy.freezeTimer > 0) {
        enemy.freezeTimer--;
        currentSpeed *= 0.5;
      }
      
      if (enemy.burnTimer > 0) {
        enemy.burnTimer--;
        if (state.frame % 30 === 0) {
          const burnDmg = Math.ceil(player.damage * 0.2);
          enemy.hp -= burnDmg;
          addFloatingText(enemy.pos, `${burnDmg}`, '#f97316');
          if (enemy.hp <= 0) {
             handleEnemyDeath(i);
             continue;
          }
        }
      }

      const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
      enemy.pos.x += Math.cos(angle) * currentSpeed;
      enemy.pos.y += Math.sin(angle) * currentSpeed;

      const dist = Math.hypot(player.pos.x - enemy.pos.x, player.pos.y - enemy.pos.y);
      const collisionRadius = enemy.isBoss ? 50 : 20;
      
      if (dist < collisionRadius) {
        if (state.frame % 30 === 0) {
          player.hp -= enemy.damage;
          addFloatingText(player.pos, `-${enemy.damage}`, '#ef4444');
        }
      }
    }

    // 5. Auto Attack Logic
    if (state.frame % player.attackCooldown === 0) {
      let closest: Enemy | null = null;
      let minDst = Infinity;
      
      enemies.forEach(e => {
        const d = Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y);
        if (d < player.attackRange && d < minDst) {
          minDst = d;
          closest = e;
        }
      });

      if (closest) {
        const target: Enemy = closest;
        for (let p = 0; p < player.projectileCount; p++) {
          const angle = Math.atan2(target.pos.y - player.pos.y, target.pos.x - player.pos.x) + (p - (player.projectileCount-1)/2) * 0.2;
          
          let effect: 'BURN' | 'FREEZE' | undefined = undefined;
          if (player.burnChance > 0 && Math.random() < player.burnChance) effect = 'BURN';
          else if (player.freezeChance > 0 && Math.random() < player.freezeChance) effect = 'FREEZE';

          projectiles.push({
            id: `p-${state.frame}-${p}`,
            pos: { ...player.pos },
            velocity: { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 },
            damage: player.damage,
            duration: 120,
            effect,
            type: 'standard',
            blastRadius: 0
          });
        }
      }
    }

    // 6. Projectile Logic
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.pos.x += p.velocity.x;
      p.pos.y += p.velocity.y;
      p.duration--;

      if (p.duration <= 0) {
        // If meteor expires (hits ground essentially), explode
        if (p.type === 'meteor') {
           // Blast damage
           enemies.forEach((e, eIdx) => {
              const d = Math.hypot(p.pos.x - e.pos.x, p.pos.y - e.pos.y);
              if (d < p.blastRadius) {
                 e.hp -= p.damage;
                 addFloatingText(e.pos, `${p.damage.toFixed(0)}`, '#f59e0b');
                 if (e.hp <= 0) handleEnemyDeath(eIdx);
              }
           });
        }
        projectiles.splice(i, 1);
        continue;
      }

      // Standard Projectile Collision
      if (p.type === 'standard') {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (e.hp <= 0) continue;

          const hitRadius = e.isBoss ? 40 : 20;
          const dist = Math.hypot(p.pos.x - e.pos.x, p.pos.y - e.pos.y);
          
          if (dist < hitRadius) {
            e.hp -= p.damage;
            addFloatingText(e.pos, `${p.damage.toFixed(0)}`, '#fff');
            
            if (p.effect === 'BURN') e.burnTimer = 180;
            if (p.effect === 'FREEZE') e.freezeTimer = 120;

            if (e.hp <= 0) {
              handleEnemyDeath(j);
            }
            
            projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    // 7. XP Collection
    for (let i = xpOrbs.length - 1; i >= 0; i--) {
      const orb = xpOrbs[i];
      const dist = Math.hypot(player.pos.x - orb.pos.x, player.pos.y - orb.pos.y);
      
      if (dist < 100) {
        orb.pos.x += (player.pos.x - orb.pos.x) * 0.1;
        orb.pos.y += (player.pos.y - orb.pos.y) * 0.1;
      }

      if (dist < 20) {
        // Apply XP Multiplier
        const xpValue = orb.value * player.xpMultiplier;
        player.xp += xpValue;
        xpOrbs.splice(i, 1);
        
        if (orb.isBossDrop) {
            triggerLevelUp(true);
        } else if (player.xp >= player.xpToNextLevel) {
            triggerLevelUp(false);
        }
      }
    }

    // 8. Floating Text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.pos.y -= 0.5;
      ft.life--;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    if (state.frame % 10 === 0) {
      setUiState({
        hp: player.hp,
        maxHp: player.maxHp,
        xp: player.xp,
        xpNext: player.xpToNextLevel,
        level: player.level,
        score: state.score
      });
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) renderGame(ctx, canvasRef.current, player, enemies, projectiles, xpOrbs, floatingTexts, decorations, state.gameTime);
    }

    requestRef.current = requestAnimationFrame(update);
  }, [gameState]); 

  const handleEnemyDeath = (enemyIndex: number) => {
      const state = gameRef.current;
      // Double check existence because loops might cause race conditions if splicing wrong index
      if (!state.enemies[enemyIndex]) return;
      
      const enemy = state.enemies[enemyIndex];
      
      if (enemy.isBoss) {
         state.xpOrbs.push({ id: `xp-boss-${state.frame}`, pos: { ...enemy.pos }, value: state.player.xpToNextLevel, isBossDrop: true });
         state.score += 1000;
         addFloatingText(enemy.pos, "BOSS DERROTADO!", '#ffd700');
      } else {
         state.xpOrbs.push({ id: `xp-${state.frame}-${enemyIndex}`, pos: { ...enemy.pos }, value: 10 + state.player.level, isBossDrop: false });
         state.score += 10;
      }
      state.enemies.splice(enemyIndex, 1);
  };

  const addFloatingText = (pos: Position, text: string, color: string) => {
    gameRef.current.floatingTexts.push({
      id: Math.random().toString(),
      pos: { x: pos.x, y: pos.y - 20 },
      text,
      color,
      life: 40,
      velocity: { x: 0, y: -1 }
    });
  };

  const triggerLevelUp = async (bossReward: boolean) => {
    setLocalGameState(GameState.LEVEL_UP);
    onGameStateChange(GameState.LEVEL_UP); 
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    setLoadingUpgrades(true);
    setIsBossReward(bossReward);
    
    setIsDraggingJoystick(false);
    setJoystickPos({x: 0, y: 0});
    gameRef.current.inputVector = {x: 0, y: 0};

    const newUpgrades = await generateUpgrades(gameRef.current.player.level + 1, bossReward);
    setUpgrades(newUpgrades);
    setLoadingUpgrades(false);
  };

  const applyUpgrade = (card: UpgradeCard) => {
    const player = gameRef.current.player;
    
    switch (card.type) {
      case 'DAMAGE': player.damage += card.value; break;
      case 'SPEED': player.speed += card.value; break;
      case 'HEALTH': 
        player.maxHp += card.value; 
        player.hp = player.maxHp;
        break;
      case 'PROJECTILE': player.projectileCount += card.value; break;
      case 'COOLDOWN': player.attackCooldown = Math.max(5, player.attackCooldown - card.value); break;
      case 'ELEMENTAL':
         if (card.description.toLowerCase().includes('queimadura') || card.name.toLowerCase().includes('fogo')) {
            player.burnChance = 1.0; 
         } else {
            player.freezeChance = 1.0;
         }
         break;
      case 'AREA':
         player.poisonDamage += card.value;
         player.poisonRange += 20; // Expand range slightly too
         break;
      case 'METEOR':
         player.meteorLevel += card.value;
         break;
      case 'XP':
         player.xpMultiplier += card.value;
         break;
    }

    player.level++;
    player.xp = 0; 
    player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.5);
    
    setIsBossReward(false);
    setLocalGameState(GameState.PLAYING);
    onGameStateChange(GameState.PLAYING);
  };

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      requestRef.current = requestAnimationFrame(update);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, update]);

  useEffect(() => {
    setLocalGameState(GameState.PLAYING);
  }, []);
  
  return (
    <div className="relative w-full h-full bg-black touch-none select-none">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="block"
      />

      {/* HUD */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        {/* HP Bar */}
        <div className="w-64 h-6 bg-gray-800 border-2 border-gray-600 relative">
          <div 
            className="h-full bg-red-600 transition-all duration-200"
            style={{ width: `${Math.max(0, (uiState.hp / uiState.maxHp) * 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold drop-shadow-md">
            HP {Math.ceil(uiState.hp)}/{uiState.maxHp}
          </span>
        </div>

        {/* XP Bar */}
        <div className="w-64 h-4 bg-gray-800 border-2 border-gray-600 relative">
          <div 
            className="h-full bg-blue-500 transition-all duration-200"
            style={{ width: `${Math.min(100, (uiState.xp / uiState.xpNext) * 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow-md">
            LVL {uiState.level}
          </span>
        </div>
        
        <div className="text-white text-sm mt-2">Score: {uiState.score}</div>
      </div>

      {/* MOBILE JOYSTICK */}
      {mobileMode && gameState === GameState.PLAYING && (
        <div 
          ref={joystickRef}
          className="absolute bottom-12 left-12 w-32 h-32 rounded-full bg-white/20 border-2 border-white/30 backdrop-blur-sm touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
           <div 
             className="absolute w-12 h-12 bg-white/80 rounded-full shadow-lg pointer-events-none"
             style={{
               top: '50%',
               left: '50%',
               transform: `translate(calc(-50% + ${joystickPos.x}px), calc(-50% + ${joystickPos.y}px))`
             }}
           />
        </div>
      )}

      {/* Level Up Modal */}
      {gameState === GameState.LEVEL_UP && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="w-full max-w-4xl p-6 text-center">
            <h2 className={`text-3xl mb-8 animate-pulse ${isBossReward ? 'text-red-500 font-extrabold tracking-widest' : 'text-yellow-400'}`}>
              {isBossReward ? 'RECOMPENSA DO BOSS!' : 'LEVEL UP!'}
            </h2>
            
            {loadingUpgrades ? (
              <div className="flex flex-col items-center justify-center text-white gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
                <p className="text-sm text-gray-400">Forjando destino...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {upgrades.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => applyUpgrade(card)}
                    className={`
                      relative p-6 border-4 rounded-lg bg-gray-900 hover:-translate-y-2 transition-transform text-left group
                      ${card.rarity === 'Divino' ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.8)] bg-gray-800' :
                        card.rarity === 'Lendário' ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]' : 
                        card.rarity === 'Épico' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' :
                        card.rarity === 'Raro' ? 'border-blue-500' : 'border-gray-500'}
                    `}
                  >
                    <div className="absolute -top-3 -right-3 px-3 py-1 bg-black text-xs border border-white text-white rounded-full">
                      {card.rarity}
                    </div>
                    
                    <div className="mb-4 flex justify-center">
                      {card.type === 'HEALTH' && <Heart className="w-12 h-12 text-red-500" />}
                      {card.type === 'SPEED' && <Zap className="w-12 h-12 text-yellow-400" />}
                      {card.type === 'DAMAGE' && <Swords className="w-12 h-12 text-blue-500" />}
                      {card.type === 'PROJECTILE' && <Swords className="w-12 h-12 text-green-500" />}
                      {card.type === 'COOLDOWN' && <Zap className="w-12 h-12 text-purple-500" />}
                      {card.type === 'ELEMENTAL' && (card.name.includes('Fogo') ? <Flame className="w-12 h-12 text-orange-500"/> : <Snowflake className="w-12 h-12 text-cyan-400"/>)}
                      {card.type === 'AREA' && <CloudFog className="w-12 h-12 text-green-500" />}
                      {card.type === 'METEOR' && <CloudRain className="w-12 h-12 text-orange-600" />}
                      {card.type === 'XP' && <GraduationCap className="w-12 h-12 text-yellow-300" />}
                    </div>

                    <h3 className="text-xl text-white mb-2 font-bold">{card.name}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{card.description}</p>
                    
                    <div className="mt-4 text-xs text-gray-500 uppercase font-bold tracking-wider">
                      +{card.value} {card.type}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <h2 className="text-4xl mb-4 text-red-500 drop-shadow-[2px_2px_0_#000]">VOCÊ MORREU</h2>
            <Skull className="w-16 h-16 mx-auto mb-4 text-white/50" />
            <p className="mb-8 text-xl">Level Alcançado: {uiState.level}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-white text-black font-bold hover:bg-gray-200 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1"
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLogic;
