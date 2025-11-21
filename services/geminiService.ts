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
          type: { type: Type.STRING, enum: ['DAMAGE', 'SPEED', 'HEALTH', 'PROJECTILE', 'COOLDOWN', 'ELEMENTAL'] },
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
    { id: 'f1', name: 'Lâmina de Fogo', description: 'Chance de queimar inimigos.', type: 'ELEMENTAL', value: 1, rarity: 'Raro' },
    { id: 'f2', name: 'Pés Ligeiros', description: 'Aumenta sua velocidade de movimento.', type: 'SPEED', value: 0.5, rarity: 'Comum' },
    { id: 'f3', name: 'Vitalidade', description: 'Recupera vida e aumenta o máximo.', type: 'HEALTH', value: 20, rarity: 'Comum' },
  ];

  if (!process.env.API_KEY) {
    console.warn("API Key missing, using fallback upgrades.");
    return fallbackUpgrades;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const context = isBossReward 
      ? "O jogador derrotou um BOSS poderoso! Gere upgrades extremamente fortes (Raridade Lendário ou Divino)." 
      : `O jogador subiu para o nível ${level}.`;

    const prompt = `
      Contexto: ${context}
      Jogo: Roguelike 2D Pixel Art.
      
      Gere 3 cartas de upgrade em Português do Brasil.
      
      Tipos e Valores:
      - DAMAGE: + Dano (1-10)
      - SPEED: + Velocidade (0.2-1.0)
      - HEALTH: + Vida Máxima (20-100)
      - PROJECTILE: + Projéteis (1-2)
      - COOLDOWN: - Tempo de Recarga (2-15 frames)
      - ELEMENTAL: value = 1 (Adiciona efeito de Queimadura ou Congelamento aos ataques)
      
      Se for recompensa de Boss, seja exagerado no poder e na descrição.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: upgradeSchema,
        temperature: isBossReward ? 1.4 : 1.1,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    const parsed = JSON.parse(jsonText);
    
    if (!parsed.upgrades || !Array.isArray(parsed.upgrades)) {
      return fallbackUpgrades;
    }

    // Add IDs and ensure types match strictly
    return parsed.upgrades.map((u: any, index: number) => ({
      id: `gen-${Date.now()}-${index}`,
      name: u.name,
      description: u.description,
      type: u.type,
      value: u.value,
      rarity: u.rarity
    }));

  } catch (error) {
    console.error("Error generating upgrades:", error);
    return fallbackUpgrades;
  }
};