const Groq = require("groq-sdk");

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

/**
 * Calls Groq LLM to generate architectural explanation based on structural context.
 * @param {Object} promptContext - The JSON prompt context.
 * @returns {Promise<string>} LLM response.
 */
async function generateArchitecturalExplanation(promptContext) {
  if (!groq) {
    console.warn("[Groq AI] API Key not found. Skipping AI reasoning.");
    return "AI Explanation unavailable: Please configure GROQ_API_KEY in the environment.";
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: promptContext.instruction
        },
        {
          role: "user",
          content: JSON.stringify(promptContext, null, 2)
        }
      ],
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile", // Dynamic or fallback model
      temperature: 0.2,
      max_tokens: 3000,
      top_p: 1,
      stream: false,
      stop: null,
      response_format: { type: "text" }
    });

    return chatCompletion.choices[0].message.content;
  } catch (err) {
    console.error("[Groq AI] Error generating explanation:", err.message);
    return `AI Reasoning failed: ${err.message}`;
  }
}

module.exports = { generateArchitecturalExplanation };
