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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGeminiError(status, text) {
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = null;
  }

  const message =
    parsed?.error?.message ||
    text ||
    `Gemini API call failed with status ${status}`;

  const code = parsed?.error?.code || status;
  const apiStatus = parsed?.error?.status || 'UNKNOWN';

  return {
    code,
    status: apiStatus,
    message
  };
}

function isRetryableGeminiError(error) {
  return (
    error &&
    (
      error.code === 503 ||
      error.code === 429 ||
      error.status === 'UNAVAILABLE' ||
      error.status === 'RESOURCE_EXHAUSTED'
    )
  );
}

async function callGemini(model, apiKey, prompt) {
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
    throw parseGeminiError(response.status, errorText);
  }

  const data = await response.json();
  const text = extractTextFromGeminiResponse(data);

  return safeJsonParse(text);
}

async function tryModelWithRetry(model, apiKey, prompt, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await callGemini(model, apiKey, prompt);
    } catch (error) {
      lastError = error;

      if (!isRetryableGeminiError(error) || attempt === maxRetries) {
        break;
      }

      const delayMs = Math.pow(2, attempt - 1) * 1500;
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function runAnalysisAgent(documentPackage) {
  const apiKey = process.env.GEMINI_API_KEY;
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY configuration.');
  }

  const prompt = buildAnalysisPrompt(documentPackage);

  try {
    return await tryModelWithRetry(primaryModel, apiKey, prompt, 3);
  } catch (primaryError) {
    const shouldTryFallback = isRetryableGeminiError(primaryError) && fallbackModel && fallbackModel !== primaryModel;

    if (!shouldTryFallback) {
      throw new Error(`Gemini API call failed: ${primaryError.message}`);
    }

    try {
      return await tryModelWithRetry(fallbackModel, apiKey, prompt, 2);
    } catch (fallbackError) {
      throw new Error(
        `Gemini API call failed. Primary model (${primaryModel}) error: ${primaryError.message}. Fallback model (${fallbackModel}) error: ${fallbackError.message}`
      );
    }
  }
}

module.exports = {
  runAnalysisAgent
};
