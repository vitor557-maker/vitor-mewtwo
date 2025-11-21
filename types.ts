export enum GameState {
  MENU,
  PLAYING,
  LEVEL_UP,
  GAME_OVER
}

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  pos: Position;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number; // Frames between attacks
  attackRange: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  projectileCount: number;
  // New Elemental stats
  burnChance: number; // 0 to 1
  freezeChance: number; // 0 to 1
}

export interface Enemy {
  id: string;
  pos: Position;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: 'slime' | 'bat' | 'skeleton' | 'boss';
  isBoss: boolean;
  // Status effects
  freezeTimer: number;
  burnTimer: number;
}

export interface Projectile {
  id: string;
  pos: Position;
  velocity: Position;
  damage: number;
  duration: number; // Frames to live
  effect?: 'BURN' | 'FREEZE';
}

export interface XpOrb {
  id: string;
  pos: Position;
  value: number;
  isBossDrop: boolean;
}

export interface FloatingText {
  id: string;
  pos: Position;
  text: string;
  color: string;
  life: number;
  velocity: Position;
}

export interface UpgradeCard {
  id: string;
  name: string;
  description: string;
  type: 'DAMAGE' | 'SPEED' | 'HEALTH' | 'PROJECTILE' | 'COOLDOWN' | 'ELEMENTAL';
  value: number;
  rarity: 'Comum' | 'Raro' | 'Épico' | 'Lendário' | 'Divino';
}

export interface Decoration {
  id: string;
  pos: Position;
  type: 'PILLAR' | 'ROCK' | 'GRASS' | 'FLOWER';
  scale: number;
  variation: number; // To pick slightly different colors/shapes if implemented
}