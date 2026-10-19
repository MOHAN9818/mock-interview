import https from 'https';

/**
 * Robust Gemini API caller utilizing active Google Generative AI models.
 * Strictly maintains TLS verification and handles model fallback chains.
 */
export const callGemini = async (
  messages,
  preferredModel = 'gemini-3.6-flash',
  responseMimeType = null,
  temperature = 0.3
) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment.');
    return null;
  }

  const defaultModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const modelsToTry = [
    defaultModel,
    preferredModel,
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
    'gemini-3.7-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  const systemMessage = messages.find((m) => m.role === 'system');
  const otherMessages = messages.filter((m) => m.role !== 'system');
  const prompt = otherMessages
    .map((message) => `${message.role === 'assistant' ? 'model' : message.role}: ${message.content}`)
    .join('\n\n');

  const requestBodyObj = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: temperature,
      maxOutputTokens: 2500
    }
  };

  if (systemMessage) {
    requestBodyObj.systemInstruction = {
      parts: [{ text: systemMessage.content }]
    };
  }

  if (responseMimeType) {
    requestBodyObj.generationConfig.responseMimeType = responseMimeType;
  }

  const postData = JSON.stringify(requestBodyObj);

  for (const model of modelsToTry) {
    try {
      const responseText = await new Promise((resolve, reject) => {
        const req = https.request(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 25000
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(body);
              } else {
                reject(new Error(`Model ${model} returned status ${res.statusCode}: ${body.substring(0, 150)}`));
              }
            });
          }
        );

        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Timeout with model ${model}`));
        });

        req.on('error', (err) => reject(err));
        req.write(postData);
        req.end();
      });

      const data = JSON.parse(responseText);
      const candidates = data.candidates || [];
      if (candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        const textParts = parts
          .filter((p) => p.text && !p.thought)
          .map((p) => p.text)
          .join('\n');

        const finalText = textParts || parts[parts.length - 1]?.text || null;
        if (finalText && finalText.trim()) {
          return finalText.trim();
        }
      }
    } catch (err) {
      console.warn(`callGemini [${model}] fallback:`, err.message);
    }
  }

  return null;
};

/**
 * Generates vector embeddings using Gemini API (gemini-embedding-2 / gemini-embedding-001).
 */
export const getGeminiEmbedding = async (text) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text?.trim()) return [];

  const defaultEmbModel = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
  const modelsToTry = [
    defaultEmbModel,
    'gemini-embedding-2',
    'gemini-embedding-001',
    'gemini-embedding-2-preview'
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  for (const embeddingModel of modelsToTry) {
    const postData = JSON.stringify({
      model: `models/${embeddingModel}`,
      content: {
        parts: [{ text: text.substring(0, 4000) }]
      }
    });

    try {
      const responseText = await new Promise((resolve, reject) => {
        const req = https.request(
          `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              if (res.statusCode === 200) resolve(body);
              else reject(new Error(`Embedding status ${res.statusCode}: ${body.substring(0, 100)}`));
            });
          }
        );
        req.on('error', (err) => reject(err));
        req.write(postData);
        req.end();
      });

      const data = JSON.parse(responseText);
      const values = data.embedding?.values || [];
      if (values.length > 0) {
        return values;
      }
    } catch (err) {
      console.warn(`getGeminiEmbedding [${embeddingModel}] fallback:`, err.message);
    }
  }

  return [];
};

/**
 * Defensive and lenient JSON parser for LLM responses.
 */
export const parseJsonSafe = (rawText) => {
  if (!rawText) return null;

  // 1. Direct parse
  try {
    return JSON.parse(rawText.trim());
  } catch (e) {}

  // 2. Extract markdown code blocks
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {}
  }

  // 3. Extract bracketed JSON object or array
  const matched = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (matched) {
    try {
      return JSON.parse(matched[0].trim());
    } catch (parseError) {
      try {
        const cleaned = matched[0]
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');
        return JSON.parse(cleaned);
      } catch (lenientError) {
        return null;
      }
    }
  }

  return null;
};
