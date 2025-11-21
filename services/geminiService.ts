
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UpgradeCard } from "../types";

// Define the strict schema for the upgrades
const upgradeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    upgrades: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['DAMAGE', 'SPEED', 'HEALTH', 'PROJECTILE', 'COOLDOWN', 'ELEMENTAL', 'AREA', 'METEOR', 'XP'] },
          value: { type: Type.NUMBER },
          rarity: { type: Type.STRING, enum: ['Comum', 'Raro', 'Épico', 'Lendário', 'Divino'] },
        },
        required: ['name', 'description', 'type', 'value', 'rarity'],
      },
    },
  },
  required: ['upgrades'],
};

export const generateUpgrades = async (level: number, isBossReward: boolean = false): Promise<UpgradeCard[]> => {
  // Fallback upgrades in case API key is missing or fails
  const fallbackUpgrades: UpgradeCard[] = [
    { id: 'f1', name: 'Nuvem Tóxica', description: 'Cria uma área de veneno ao seu redor.', type: 'AREA', value: 5, rarity: 'Raro' },
    { id: 'f2', name: 'Chuva de Meteoros', description: 'Invoca meteoros do céu.', type: 'METEOR', value: 1, rarity: 'Épico' },
    { id: 'f3', name: 'Sabedoria Antiga', description: 'Ganha mais XP dos monstros.', type: 'XP', value: 0.2, rarity: 'Comum' },
  ];

  if (!process.env.API_KEY) {
    console.warn("API Key not found. Using fallback upgrades.");
    return fallbackUpgrades;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const rarityContext = isBossReward 
      ? "Gere upgrades poderosos (Lendário ou Divino) como recompensa de Boss." 
      : "Gere upgrades variados (Comum a Épico) para subir de nível.";

    const prompt = `
      Você é o sistema de jogo de um Roguelike RPG.
      O jogador acabou de subir para o nível ${level}.
      ${rarityContext}
      
      Gere EXATAMENTE 3 opções de cartas de upgrade.
      
      Tipos de Upgrade Disponíveis:
      - DAMAGE: Aumenta dano base.
      - SPEED: Aumenta velocidade de movimento.
      - HEALTH: Cura e aumenta HP Maximo.
      - PROJECTILE: Adiciona mais projéteis ao ataque principal.
      - COOLDOWN: Diminui o tempo entre ataques.
      - ELEMENTAL: Adiciona chance de Queimadura (Fogo) ou Congelamento (Gelo).
      - AREA: Cria uma aura de veneno ao redor do player (dano por segundo).
      - METEOR: Invoca meteoros que caem do céu periodicamente.
      - XP: Aumenta a porcentagem de XP ganho.

      Exemplos de valores:
      - AREA: value 5 a 10 (dano).
      - METEOR: value 1 (nível da habilidade).
      - XP: value 0.1 a 0.5 (10% a 50%).
      
      Responda APENAS com o JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: upgradeSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");
    
    const parsed = JSON.parse(jsonText);
    
    // Add IDs to the generated cards
    return parsed.upgrades.map((u: any, index: number) => ({
      ...u,
      id: `ai-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Error generating upgrades:", error);
    return fallbackUpgrades;
  }
};
