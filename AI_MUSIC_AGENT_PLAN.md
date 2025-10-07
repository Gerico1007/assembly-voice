
# Feature Plan: AI Music Assistant Agent for Musescore

## 1. Summary

This document outlines a plan to integrate the Assembly Voice chat interface with the Musescore notation software. The goal is to create an AI-powered assistant that can be controlled via natural language from the chat interface to perform composition and editing tasks directly within a Musescore project.

## 2. User Story

As a music composer, I want to interact with an AI agent through a chat window, so that I can get real-time assistance with my musical scores in Musescore. I want to be able to say things like "Add a C major chord in the first measure," "Transpose this section up a perfect fifth," or "Change the time signature to 3/4," and have the agent execute these commands instantly.

## 3. Proposed Architecture

The solution will consist of three main components:

1.  **Assembly Voice Frontend:** The existing React-based chat interface. It will send user prompts to the backend and display the agent's responses.
2.  **Musescore Plugin (New):** A new plugin built for Musescore using its native QML framework. This plugin will act as the bridge between the agent and the Musescore application. It will run a lightweight server (likely WebSocket) to listen for commands from our backend.
3.  **Agent Backend (Node.js):** The existing `server.cjs` (or a new service) will be enhanced to handle Musescore-specific requests. It will interpret the user's natural language prompt, translate it into a structured command, and send that command to the Musescore Plugin.

### Communication Flow:

`User Input (React Frontend) -> Agent Backend (Node.js) -> LLM for Intent Recognition -> Agent Backend formats command -> Musescore Plugin (via WebSocket) -> Musescore API Execution`

## 4. Technical Implementation Details

### Musescore Plugin

*   **Language:** QML (with JavaScript for logic).
*   **Functionality:**
    *   On activation, it will start a WebSocket server on a local port (e.g., `localhost:12345`).
    *   It will listen for incoming JSON messages that represent commands (e.g., `{ "command": "addNote", "params": { "pitch": "C4", "duration": "quarter" } }`).
    *   It will use the Musescore Plugin API (`MuseScore.api`) to interact with the score, executing actions like creating notes, changing clefs, adding dynamics, etc.
    *   It will send status messages (success, failure, or data) back to the Agent Backend.
*   **UI:** Initially, the plugin might not have a UI. In the future, it could have a small panel to show connection status or logs, as potentially inspired by your screenshot.

### Agent Backend

*   **Logic:**
    *   A new API endpoint (e.g., `/musescore-command`) will receive prompts from the frontend.
    *   The prompt will be sent to an LLM (like Gemini) with a specific system prompt designed to translate natural language into the structured JSON commands that the Musescore plugin understands.
    *   The backend will manage the WebSocket connection to the Musescore plugin.

## 5. High-Level Development Plan

### Phase 1: Musescore Plugin Proof of Concept (PoC)

1.  **Setup:** Familiarize with Musescore's Plugin Creator and QML.
2.  **Build Basic Plugin:** Create a plugin that can:
    *   Open a WebSocket server.
    *   Receive a hardcoded command (e.g., a specific `addNote` JSON).
    *   Execute that one command on the currently open score.
3.  **Test:** Create a simple script (e.g., a basic Node.js WebSocket client) to send the command to the plugin and verify a note is added to the score.

### Phase 2: Backend and Agent Integration

1.  **Develop Agent Logic:** Create the system prompt and logic for the LLM to translate musical requests into JSON commands.
2.  **Integrate WebSocket Client:** Add the WebSocket client from the PoC into the agent backend.
3.  **End-to-End Test:** Connect the backend to the Musescore plugin. Manually send a request to the backend's API endpoint and verify the command is executed in Musescore.

### Phase 3: Frontend Integration

1.  **Connect Frontend:** Update the React frontend to send relevant user prompts to the new `/musescore-command` backend endpoint.
2.  **Display Feedback:** Implement a way to show the user that the command was sent and whether it was successful.

## 6. Open Questions and Risks

*   **Musescore API Richness:** How comprehensive is the Musescore plugin API? We need to verify it can support the range of commands we envision.
*   **QML Networking:** What are the limitations of WebSocket/HTTP networking from within a QML plugin?
*   **State Management:** How can the agent be made aware of the current state of the score (e.g., selected measures, current key signature) to make commands more intuitive? This may require the plugin to send state information back to the backend.
*   **User Experience:** The final UI/UX, as hinted at in your screenshot, will need to be designed to feel seamless. This plan is a starting point for the underlying functionality.

This plan provides a technical foundation. Once you provide more details on your vision from the screenshot and any other configuration files, I can refine the UI/UX aspects and the specific agent capabilities.
