/**
 * Kinfolk AI Help Assistant Service
 * Connects securely to serverless endpoint /api/gemini
 */

export interface AiHelpResponse {
  answer: string;
  source?: string;
  error?: string;
}

const FALLBACK_KNOWLEDGE_BASE: Record<string, string> = {
  invite: "Only the family space owner can generate invitation codes. To invite someone, open Settings > Admin Dashboard > Invitations, then click 'Create New Invite'. You will get a 4-character code (like KIN-ABCD) with an expiration period that you can share with your family member.",
  screenshot: "Kinfolk includes screenshot detection. When someone takes a screenshot or prints the screen, a system alert is broadcast to the chat. You can also turn on 'Strict Privacy Mode' in Profile & Settings to block selection, copying, and blur when focus is lost.",
  voice: "To send a voice message, click or tap the microphone icon in the chat composer. Speak into your microphone and click the green checkmark to send, or the red X to cancel.",
  password: "If you lose your password, click 'Forgot Password / Recovery' on the login screen. Enter your username and the emergency recovery code (KIN-XXXX-YYYY) that was generated when your account was created.",
  privacy: "You can customize your privacy in Profile & Settings. Toggles include: Show Last Seen, Show Read Receipts (double checkmarks), Show Typing Indicator, and Strict Privacy Mode.",
};

export async function askAiAssistant(question: string): Promise<string> {
  const cleanQ = question.trim();
  if (!cleanQ) return '';

  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: cleanQ }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.answer) {
        return data.answer;
      }
    }
  } catch (err) {
    console.warn('Network call to /api/gemini failed, using smart local guide fallback:', err);
  }

  // Smart in-browser fallback
  const lower = cleanQ.toLowerCase();
  for (const [key, answer] of Object.entries(FALLBACK_KNOWLEDGE_BASE)) {
    if (lower.includes(key)) {
      return answer;
    }
  }

  return "Kinfolk is a private, lightweight family messenger with zero phone numbers, invite-only onboarding, and end-to-end privacy. To enable full dynamic Gemini AI responses, make sure your GEMINI_API_KEY is configured in your Netlify dashboard or local .env file.";
}
