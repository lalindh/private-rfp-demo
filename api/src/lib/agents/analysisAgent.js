const { buildAnalysisPrompt } = require('../prompts/analysisPrompt');

function extractTextFromOpenRouterResponse(data) {
  const choice = Array.isArray(data?.choices) ? data.choices[0] : null;

  if (!choice) {
    return '';
  }

  if (typeof choice.text === 'string' && choice.text.trim()) {
    return choice.text.trim();
  }

  const content = choice?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        return part?.text || part?.content || '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return '';
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

function isRetryableOpenRouterError(status, bodyText) {
  if (.includes(status)) {
    return true;
  }

  const text = String(bodyText || '').toLowerCase();

  return (
    text.includes('rate limit') ||
    text.includes('overloaded') ||
    text.includes('temporarily unavailable') ||
    text.includes('high demand')
  );
}

async function callOpenRouter(model, apiKey, prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'private-rfp-demo'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2
    })
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(`OpenRouter API call failed: ${response.status} ${text}`);
    error.status = response.status;
    error.bodyText = text;
    throw error;
  }

  const data = JSON.parse(text);
  const extracted = extractTextFromOpenRouterResponse(data);

  return safeJsonParse(extracted);
}

async function tryModelWithRetry(model, apiKey, prompt, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await callOpenRouter(model, apiKey, prompt);
    } catch (error) {
      lastError = error;

      if (!isRetryableOpenRouterError(error.status, error.bodyText) || attempt === maxRetries) {
        break;
      }

      const delayMs = Math.pow(2, attempt - 1) * 1500;
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function runAnalysisAgent(documentPackage) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const primaryModel = process.env.OPENROUTER_MODEL || 'openrouter/free';
  const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'openrouter/free';

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY configuration.');
  }

  const prompt = buildAnalysisPrompt(documentPackage);

  try {
    return await tryModelWithRetry(primaryModel, apiKey, prompt, 3);
  } catch (primaryError) {
    const shouldTryFallback = fallbackModel && fallbackModel !== primaryModel;

    if (!shouldTryFallback) {
      throw new Error(`OpenRouter API call failed: ${primaryError.message}`);
    }

    try {
      return await tryModelWithRetry(fallbackModel, apiKey, prompt, 2);
    } catch (fallbackError) {
      throw new Error(
        `OpenRouter API call failed. Primary model (${primaryModel}) error: ${primaryError.message}. Fallback model (${fallbackModel}) error: ${fallbackError.message}`
      );
    }
  }
}

module.exports = {
  runAnalysisAgent
};
