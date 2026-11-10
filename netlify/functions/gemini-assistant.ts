import type { Context } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTIONS = `
You are the Kinfolk Family Assistant, a helpful and respectful in-app guide for the Kinfolk private family messenger.
Kinfolk is a private, lightweight family chat web application with NO phone numbers and NO stranger discovery.

Key features you can explain:
1. Invitations: Only the family owner can generate invitation codes (e.g., KIN-XXXX). Single-use or timed (1 day, 7 days, 30 days).
2. Screenshots & Privacy: When a member takes a screenshot, an alert is logged in the chat stream. Users can also enable 'Strict Privacy Mode' in Privacy Settings to protect message content.
3. Media & Voice: Users can record and send voice memos using the microphone button, share photos (with preview and full lightbox view), and share documents securely.
4. Privacy Controls: Users can toggle last seen, online presence, typing indicators, and read receipts in Settings.
5. Account Recovery: Every user receives a private 12-character emergency recovery code (KIN-XXXX-YYYY) when joining, which allows resetting their password without email or phone.
6. AI Privacy Guarantee: You ONLY answer help questions about the app and settings. You do NOT read private family chat conversations or store personal messages.

Respond warmly, concisely, and clearly in plain text.
`.trim();

const FALLBACK_KNOWLEDGE_BASE: Record<string, string> = {
  invite: "Only the family space owner can generate invitation codes. To invite someone, open Settings > Admin Dashboard > Invitations, then click 'Create New Invite'. You will get a 4-character code (like KIN-ABCD) with an expiration period that you can share with your family member.",
  screenshot: "Kinfolk includes screenshot detection. When someone takes a screenshot or prints the screen, a system alert is broadcast to the chat. You can also turn on 'Strict Privacy Mode' in Profile & Settings to block selection, copying, and blur when focus is lost.",
  voice: "To send a voice message, click or tap the microphone icon in the chat composer. Speak into your microphone and click the green checkmark to send, or the red X to cancel.",
  password: "If you lose your password, click 'Forgot Password / Recovery' on the login screen. Enter your username and the emergency recovery code (KIN-XXXX-YYYY) that was generated when your account was created.",
  privacy: "You can customize your privacy in Profile & Settings. Toggles include: Show Last Seen, Show Read Receipts (double checkmarks), Show Typing Indicator, and Strict Privacy Mode.",
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Netlify Functions 2.0 Web Request / Response API
export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const question = (body.question || '').trim();

    if (!question) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('placeholder')) {
      const lower = question.toLowerCase();
      let matchedAnswer: string | null = null;
      for (const [k, ans] of Object.entries(FALLBACK_KNOWLEDGE_BASE)) {
        if (lower.includes(k)) {
          matchedAnswer = ans;
          break;
        }
      }

      const defaultMsg = matchedAnswer
        ? `${matchedAnswer}\n\n(Tip: Configure your GEMINI_API_KEY in Netlify Site Configuration to enable full dynamic Gemini AI responses.)`
        : "Kinfolk is a private, lightweight family messenger with zero phone numbers, invite-only onboarding, and end-to-end privacy. Please configure GEMINI_API_KEY in your Netlify dashboard to enable dynamic AI responses.";

      return new Response(
        JSON.stringify({ answer: defaultMsg, source: 'fallback_guide' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTIONS,
    });

    const result = await model.generateContent(question);
    const responseText = result.response.text();

    return new Response(
      JSON.stringify({ answer: responseText.trim(), source: 'gemini_api' }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error handling Gemini request:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to generate AI response. Please check your API key configuration.',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};
