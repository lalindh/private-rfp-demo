const { buildAnalysisPrompt } = require('../prompts/analysisPrompt');

function extractTextFromGeminiResponse(data) {
  const candidates = data?.candidates;

  if (!Array.isArray(candidates) || !candidates.length) {
    return '';
  }

  const parts = candidates[0]?.content?.parts;

  if (!Array.isArray(parts) || !parts.length) {
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

  const prompt = buildAnalysisPrompt(documentPackage);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API call failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = extractTextFromGeminiResponse(data);

  return safeJsonParse(text);
}

module.exports = {
  runAnalysisAgent
};
