import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Robust Gemini API caller utilizing active free-tier Google Generative AI models.
 * Uses https agent with SSL resilience and fallback model chain.
 */
export const callGemini = async (
  messages,
  preferredModel = 'gemini-3.6-flash',
  responseMimeType = null,
  temperature = 0.3
) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in server/.env');
    return null;
  }

  // Model fallback chain: gemini-3.6-flash -> gemini-flash-lite-latest -> gemini-3.5-flash -> gemini-3.5-flash-lite
  const modelsToTry = [
    preferredModel,
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite'
  ].filter((v, i, a) => a.indexOf(v) === i); // unique

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
            agent: agent,
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
        // Extract all text parts, omitting thought metadata
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
      console.warn(`callGemini [${model}] error:`, err.message);
      // continue to next fallback model
    }
  }

  return null;
};

export const getGeminiEmbedding = async (text) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text?.trim()) return [];

  const postData = JSON.stringify({
    model: 'models/text-embedding-004',
    content: {
      parts: [{ text: text.substring(0, 4000) }]
    }
  });

  try {
    const responseText = await new Promise((resolve, reject) => {
      const req = https.request(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          agent: agent,
          timeout: 10000
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) resolve(body);
            else reject(new Error(`Embedding status ${res.statusCode}`));
          });
        }
      );
      req.on('error', (err) => reject(err));
      req.write(postData);
      req.end();
    });

    const data = JSON.parse(responseText);
    return data.embedding?.values || [];
  } catch (err) {
    console.warn('getGeminiEmbedding fallback:', err.message);
    return [];
  }
};

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

  // 3. Extract bracketed JSON
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
