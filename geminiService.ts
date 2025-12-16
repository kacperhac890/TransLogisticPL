import { GoogleGenAI } from "@google/genai";
import { RouteResult, RouteAnalysisData, RoadType, GroundingSource } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const calculateRouteAnalysis = async (start: string, end: string, preCalculatedData?: RouteAnalysisData | null): Promise<RouteResult> => {
  try {
    let prompt = "";

    if (preCalculatedData) {
      // Prompt with strict data injection
      prompt = `
        Jako ekspert logistyczny, przygotuj podsumowanie dla trasy ciężarowej z "${start}" do "${end}".
        
        MAM JUŻ DOKŁADNE DANE TECHNICZNE Z SYSTEMU NAWIGACJI (NIE ZMIENIAJ TYCH LICZB):
        - Całkowity dystans: ${preCalculatedData.totalDistanceKm} km
        - Autostrady/Ekspresowe: ${preCalculatedData.segments.find(s => s.type === 'autostrada')?.distanceKm || 0} km
        - Drogi Krajowe: ${preCalculatedData.segments.find(s => s.type === 'krajowa')?.distanceKm || 0} km
        - Miasto/Lokalne: ${preCalculatedData.segments.find(s => s.type === 'miasto')?.distanceKm || 0} km
        - Przeprawy Promowe: ${preCalculatedData.segments.find(s => s.type === 'prom')?.distanceKm || 0} km

        Twoim zadaniem jest jedynie wygenerować JSON zawierający te dokładne dane oraz krótki opis słowny (summary).
        Jeśli występuje przeprawa promowa, koniecznie wspomnij o niej w podsumowaniu.
        
        Zwróć JSON w bloku markdown:
        \`\`\`json
        {
          "segments": [ ... użyj dostarczonych danych ... ],
          "totalDistanceKm": ${preCalculatedData.totalDistanceKm},
          "summary": "Napisz zwięzłe zdanie o głównych drogach (np. 'Trasa prowadzi autostradą A2, a następnie obejmuje przeprawę promową do Szwecji')."
        }
        \`\`\`
      `;
    } else {
      // Fallback prompt if calculation failed (Gemini estimates)
      prompt = `
        Jako ekspert logistyczny dla transportu ciężarowego, przeprowadź analizę trasy z punktu: "${start}" do punktu: "${end}".
        
        1. Znajdź najlepszą trasę.
        2. Oszacuj podział dystansu na:
           - "autostrada" (80km/h)
           - "krajowa" (64km/h)
           - "miasto" (30km/h)
           - "prom" (15km/h)
        
        Zwróć JSON w bloku markdown:
        \`\`\`json
        {
          "segments": [{ "type": "...", "distanceKm": 0 }],
          "totalDistanceKm": 0,
          "summary": "Krótki opis trasy."
        }
        \`\`\`
      `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || "";
    
    // Extract JSON
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    let data: RouteAnalysisData | null = null;

    if (jsonMatch && jsonMatch[1]) {
      try {
        data = JSON.parse(jsonMatch[1]);
        
        // Safety check: Ensure the returned data matches our pre-calculation if it existed
        // Sometimes LLMs hallucinate despite instructions. We prioritize hard data.
        if (preCalculatedData && data) {
           data.segments = preCalculatedData.segments;
           data.totalDistanceKm = preCalculatedData.totalDistanceKm;
           // Important: Restore detailed segments which LLM doesn't know about
           data.detailedSegments = preCalculatedData.detailedSegments;
        }
      } catch (e) {
        console.error("Failed to parse JSON from Gemini response", e);
        // Fallback to preCalculated if JSON parse fails but we have hard data
        if (preCalculatedData) data = preCalculatedData;
      }
    } else if (preCalculatedData) {
        // If LLM didn't return JSON but we have data, use it
        data = preCalculatedData;
        data.summary = text.slice(0, 150) + "..."; // Use raw text as summary roughly
    }

    // Extract grounding sources
    const sources: GroundingSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
        if (chunk.maps?.uri && chunk.maps?.title) {
             sources.push({ uri: chunk.maps.uri, title: chunk.maps.title });
        }
      });
    }

    return {
      data,
      sources,
      rawText: text,
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Even if Gemini fails, if we have hard calc data, return it
    if (preCalculatedData) {
        return {
            data: { ...preCalculatedData, summary: "Analiza techniczna (AI niedostępne)" },
            sources: [],
            rawText: "Błąd połączenia z AI."
        };
    }
    throw error;
  }
};
