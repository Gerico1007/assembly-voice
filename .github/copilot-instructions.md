# Copilot Instructions for Assembly Voice Portal

## Project Overview
- **React/TypeScript voice-enabled AI portal** for interacting with G.Music Assembly agents.
- Modular architecture: agents, personas, hooks, services, and UI components.
- Supports multimodal input (voice, text, image, audio) and persona-driven conversations.

## Key Files & Structure
- `src/components/`: UI components (e.g., `ChatInput.tsx` for multimodal input)
- `src/hooks/`: Custom hooks for voice, synthesis, and toasts
- `src/services/`: Business logic (e.g., `GeminiService.ts` for AI integration)
- `src/personas.ts`: Persona definitions and system instructions
- `agents/`: JSON agent definitions
- `server.js`: Express HTTPS server for mobile access

## Developer Workflows
- **Dev server:** `npm run dev` (Vite, hot reload)
- **Production build:** `npm run build` & `npm run preview`
- **HTTPS server:** `node generate-certs.js` (first time), then `npm run server` or `./start-server.sh`
- **TypeScript check:** `npx tsc --noEmit`
- **Reset build:** `rm -rf node_modules package-lock.json && npm install`

## Integration Points
- **Gemini API:** Set key via browser console: `localStorage.setItem('gemini_api_key', 'YOUR_API_KEY_HERE')`
- **Persona customization:** Edit `src/personas.ts` for agent instructions, specialties, and voice traits
- **Voice features:** Uses Web Speech API (browser compatibility required)

## Project-Specific Patterns
- **Spoken punctuation:** Speech input maps words like "period" to `.` (see `useSpeechRecognition.ts`)
- **Session persistence:** Uses localStorage for conversation history
- **Toast notifications:** Centralized via `useToasts.ts` and UI feedback
- **Streaming AI responses:** Token-by-token display (see `GeminiService.ts`)
- **Mobile access:** Requires HTTPS and self-signed certs for voice features

## Conventions & Best Practices
- Use TypeScript throughout; keep types in `src/types.ts`
- UI logic is component-driven; business logic in services
- Persona/agent logic is separated for easy extension
- Follow Tailwind CSS for styling
- Prefer hooks for cross-cutting concerns (voice, toasts)

## Troubleshooting
- **Speech not working:** Use HTTPS, check browser, grant mic permissions
- **Build errors:** Reset node_modules and reinstall
- **Mobile issues:** Ensure same WiFi, accept cert, check firewall

## References
- See `README.md` for full architecture, roadmap, and agent details
- Inspired by EchoThreads and Mia Gem Chat Studio

---
*For AI agents: Prioritize persona-driven, multimodal, and voice-centric features. Maintain modularity and extendability. Reference key files for patterns and conventions.*
