// Global state
let ws = null;
let agents = {};
let activeAgents = new Set();
let recognition = null;
let isListening = false;
let conversationHistory = [];

// DOM elements
const connectionStatus = document.getElementById('connectionStatus');
const agentButtons = document.getElementById('agentButtons');
const micButton = document.getElementById('micButton');
const voiceStatus = document.getElementById('voiceStatus');
const transcript = document.getElementById('transcript');
const responseContainer = document.getElementById('responseContainer');
const historyContainer = document.getElementById('historyContainer');

// Initialize the app
async function init() {
    try {
        // Load agents
        await loadAgents();

        // Setup WebSocket connection
        setupWebSocket();

        // Setup speech recognition
        setupSpeechRecognition();

        // Setup event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize app: ' + error.message);
    }
}

// Load agent embodiments
async function loadAgents() {
    try {
        const response = await fetch('/api/agents');
        agents = await response.json();

        // Render agent buttons
        renderAgentButtons();

        // Activate all agents by default
        Object.keys(agents).forEach(id => activeAgents.add(id));
        updateAgentButtons();

        console.log('Loaded agents:', agents);
    } catch (error) {
        console.error('Error loading agents:', error);
        throw error;
    }
}

// Render agent selection buttons
function renderAgentButtons() {
    agentButtons.innerHTML = '';

    Object.values(agents).forEach(agent => {
        const button = document.createElement('button');
        button.className = 'agent-button active';
        button.dataset.agentId = agent.id;
        button.innerHTML = `
            <span class="symbol">${agent.symbol}</span>
            <span class="name">${agent.name}</span>
        `;
        button.addEventListener('click', () => toggleAgent(agent.id));
        agentButtons.appendChild(button);
    });
}

// Toggle agent active state
function toggleAgent(agentId) {
    if (activeAgents.has(agentId)) {
        activeAgents.delete(agentId);
    } else {
        activeAgents.add(agentId);
    }
    updateAgentButtons();
}

// Update agent button states
function updateAgentButtons() {
    document.querySelectorAll('.agent-button').forEach(button => {
        const agentId = button.dataset.agentId;
        if (activeAgents.has(agentId)) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Setup WebSocket connection
function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        connectionStatus.textContent = 'Connected';
        connectionStatus.className = 'status connected';
        micButton.disabled = false;
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionStatus.textContent = 'Connection Error';
        connectionStatus.className = 'status disconnected';
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.className = 'status disconnected';
        micButton.disabled = true;

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
            console.log('Attempting to reconnect...');
            setupWebSocket();
        }, 3000);
    };
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    console.log('Received:', data);

    switch (data.type) {
        case 'connection':
            console.log(data.message);
            break;

        case 'agent_responses':
            displayAgentResponses(data.query, data.responses);
            addToHistory(data.query, data.responses, data.timestamp);
            break;

        case 'error':
            showError(data.message);
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
}

// Setup speech recognition
function setupSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showError('Speech recognition not supported in this browser');
        micButton.disabled = true;
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        micButton.classList.add('listening');
        voiceStatus.textContent = 'Listening...';
        voiceStatus.classList.add('listening');
        transcript.textContent = '';
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcriptPiece;
            } else {
                interimTranscript += transcriptPiece;
            }
        }

        if (finalTranscript) {
            transcript.textContent = finalTranscript;
            transcript.classList.remove('interim');
            sendVoiceQuery(finalTranscript);
        } else if (interimTranscript) {
            transcript.textContent = interimTranscript;
            transcript.classList.add('interim');
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        micButton.classList.remove('listening');
        voiceStatus.textContent = `Error: ${event.error}`;
        voiceStatus.classList.remove('listening');
    };

    recognition.onend = () => {
        isListening = false;
        micButton.classList.remove('listening');
        voiceStatus.textContent = '';
        voiceStatus.classList.remove('listening');
    };
}

// Setup event listeners
function setupEventListeners() {
    micButton.addEventListener('click', toggleListening);
}

// Toggle listening state
function toggleListening() {
    if (!recognition) return;

    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// Send voice query to server
function sendVoiceQuery(query) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        showError('Not connected to server');
        return;
    }

    const message = {
        type: 'voice_query',
        query: query,
        activeAgents: Array.from(activeAgents)
    };

    ws.send(JSON.stringify(message));
    voiceStatus.textContent = 'Processing...';
}

// Display agent responses
function displayAgentResponses(query, responses) {
    responseContainer.innerHTML = '';

    const queryDiv = document.createElement('div');
    queryDiv.className = 'query-display';
    queryDiv.innerHTML = `<strong>Your query:</strong> "${query}"`;
    queryDiv.style.marginBottom = '20px';
    queryDiv.style.padding = '15px';
    queryDiv.style.background = 'rgba(255, 255, 255, 0.1)';
    queryDiv.style.borderRadius = '10px';
    responseContainer.appendChild(queryDiv);

    Object.entries(responses).forEach(([agentId, response]) => {
        const responseDiv = document.createElement('div');
        responseDiv.className = `agent-response ${agentId}`;
        responseDiv.innerHTML = `
            <div class="agent-response-header">
                <span class="agent-response-symbol">${response.symbol}</span>
                <span class="agent-response-name">${response.agent}</span>
            </div>
            <div class="agent-response-content">${response.response}</div>
            <div class="agent-response-meta">${response.perspective}</div>
        `;
        responseContainer.appendChild(responseDiv);
    });

    voiceStatus.textContent = '';
}

// Add to conversation history
function addToHistory(query, responses, timestamp) {
    conversationHistory.unshift({ query, responses, timestamp });

    // Keep only last 10 conversations
    if (conversationHistory.length > 10) {
        conversationHistory = conversationHistory.slice(0, 10);
    }

    renderHistory();
}

// Render conversation history
function renderHistory() {
    historyContainer.innerHTML = '';

    conversationHistory.forEach(item => {
        const historyDiv = document.createElement('div');
        historyDiv.className = 'history-item';

        const queryDiv = document.createElement('div');
        queryDiv.className = 'history-query';
        queryDiv.textContent = `"${item.query}"`;

        const responsesDiv = document.createElement('div');
        responsesDiv.className = 'history-responses';
        responsesDiv.innerHTML = Object.values(item.responses)
            .map(r => `<div style="margin: 5px 0;">${r.symbol} ${r.agent}</div>`)
            .join('');

        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'history-timestamp';
        timestampDiv.textContent = new Date(item.timestamp).toLocaleString();

        historyDiv.appendChild(queryDiv);
        historyDiv.appendChild(responsesDiv);
        historyDiv.appendChild(timestampDiv);

        historyContainer.appendChild(historyDiv);
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.background = 'rgba(244, 67, 54, 0.3)';
    errorDiv.style.color = '#ff5252';
    errorDiv.style.padding = '15px';
    errorDiv.style.borderRadius = '10px';
    errorDiv.style.margin = '10px 0';
    errorDiv.textContent = message;

    responseContainer.insertBefore(errorDiv, responseContainer.firstChild);

    setTimeout(() => errorDiv.remove(), 5000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);