const { GoogleGenAI } = require('@google/genai');
const { buildAnalysisPrompt } = require('../prompts/analysisPrompt');

function extractText(response) {
  if (response?.text) return response.text;

  const candidates = response?.candidates;
  if (!Array.isArray(candidates) || !candidates.length) {
    return '';
  }

  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .map((part) => part?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function safeJsonParse(text) {
  const trimmed = String(text || '').trim();

  if (!trimmed) {
    throw new Error('Model returned empty content.');
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const cleaned = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (innerError) {
      throw new Error(`Model did not return valid JSON: ${innerError.message}`);
    }
  }
}

async function runAnalysisAgent(documentPackage) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY configuration.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildAnalysisPrompt(documentPackage);

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  });

  const text = extractText(response);
  return safeJsonParse(text);
}

module.exports = {
  runAnalysisAgent
};
