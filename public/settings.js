// Settings Management System
class SettingsManager {
    constructor() {
        this.currentTab = 'theme';
        this.settings = this.loadSettings();
        this.editingAgent = null;
        this.init();
    }

    // Initialize settings system
    init() {
        this.createSettingsUI();
        this.setupEventListeners();
        this.applySettings();
    }

    // Load settings from localStorage
    loadSettings() {
        const defaultSettings = {
            theme: {
                name: 'dark',
                backgroundStart: '#1a1a2e',
                backgroundEnd: '#0f0f1e',
                textPrimary: '#e0e0e0',
                textSecondary: '#a0a0a0',
                accent: '#76ff03',
                micGradientStart: '#667eea',
                micGradientEnd: '#764ba2'
            },
            layout: {
                fontSize: 'medium',
                compactMode: false,
                showHistory: true,
                showResponses: true
            },
            agentColors: {}
        };

        const saved = localStorage.getItem('gmusicAssemblySettings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    // Save settings to localStorage
    saveSettings() {
        localStorage.setItem('gmusicAssemblySettings', JSON.stringify(this.settings));
        this.applySettings();
    }

    // Reset to default settings
    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            localStorage.removeItem('gmusicAssemblySettings');
            this.settings = this.loadSettings();
            this.saveSettings();
            this.renderThemeTab();
            this.renderLayoutTab();
            alert('Settings reset to default!');
        }
    }

    // Apply settings to the UI
    applySettings() {
        const { theme, layout } = this.settings;

        // Apply theme
        document.body.style.background = `linear-gradient(135deg, ${theme.backgroundStart} 0%, ${theme.backgroundEnd} 100%)`;
        document.documentElement.style.setProperty('--text-primary', theme.textPrimary);
        document.documentElement.style.setProperty('--text-secondary', theme.textSecondary);
        document.documentElement.style.setProperty('--accent-color', theme.accent);

        // Apply layout
        document.body.classList.toggle('compact-mode', layout.compactMode);
        document.body.classList.toggle(`font-${layout.fontSize}`, true);

        // Toggle sections
        const historySection = document.querySelector('.history');
        const responsesSection = document.querySelector('.responses');
        if (historySection) historySection.style.display = layout.showHistory ? 'block' : 'none';
        if (responsesSection) responsesSection.style.display = layout.showResponses ? 'block' : 'none';
    }

    // Create settings UI
    createSettingsUI() {
        // Create settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'settings-button';
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.onclick = () => this.openSettings();
        document.body.appendChild(settingsBtn);

        // Create settings modal
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.id = 'settingsModal';
        modal.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <h2>⚙️ Settings</h2>
                    <button class="settings-close" onclick="settingsManager.closeSettings()">×</button>
                </div>

                <div class="settings-tabs">
                    <button class="settings-tab active" data-tab="theme">🎨 Theme</button>
                    <button class="settings-tab" data-tab="agents">♠️🌿🎸🧵 Agents</button>
                    <button class="settings-tab" data-tab="layout">📐 Layout</button>
                    <button class="settings-tab" data-tab="importexport">💾 Import/Export</button>
                </div>

                <div class="settings-body">
                    <div class="settings-tab-content active" id="theme-tab"></div>
                    <div class="settings-tab-content" id="agents-tab"></div>
                    <div class="settings-tab-content" id="layout-tab"></div>
                    <div class="settings-tab-content" id="importexport-tab"></div>
                </div>

                <div class="settings-footer">
                    <button class="settings-btn danger" onclick="settingsManager.resetSettings()">Reset to Default</button>
                    <button class="settings-btn secondary" onclick="settingsManager.closeSettings()">Cancel</button>
                    <button class="settings-btn primary" onclick="settingsManager.saveAndClose()">Save Changes</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Render tab contents
        this.renderThemeTab();
        this.renderAgentsTab();
        this.renderLayoutTab();
        this.renderImportExportTab();
    }

    // Setup event listeners
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Close modal on outside click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });
    }

    // Switch between tabs
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        this.currentTab = tabName;
    }

    // Render Theme Tab
    renderThemeTab() {
        const container = document.getElementById('theme-tab');
        const { theme } = this.settings;

        container.innerHTML = `
            <div class="settings-group">
                <h3>Pre-defined Themes</h3>
                <div class="theme-preview" id="themePresets"></div>
            </div>

            <div class="settings-group">
                <h3>Custom Colors</h3>
                <div class="settings-field-row">
                    <div class="settings-field">
                        <label>Background Start</label>
                        <input type="color" id="backgroundStart" value="${theme.backgroundStart}">
                    </div>
                    <div class="settings-field">
                        <label>Background End</label>
                        <input type="color" id="backgroundEnd" value="${theme.backgroundEnd}">
                    </div>
                </div>
                <div class="settings-field-row">
                    <div class="settings-field">
                        <label>Text Primary</label>
                        <input type="color" id="textPrimary" value="${theme.textPrimary}">
                    </div>
                    <div class="settings-field">
                        <label>Text Secondary</label>
                        <input type="color" id="textSecondary" value="${theme.textSecondary}">
                    </div>
                </div>
                <div class="settings-field-row">
                    <div class="settings-field">
                        <label>Accent Color</label>
                        <input type="color" id="accent" value="${theme.accent}">
                    </div>
                </div>
            </div>
        `;

        // Render theme presets
        this.renderThemePresets();

        // Add event listeners for color inputs
        ['backgroundStart', 'backgroundEnd', 'textPrimary', 'textSecondary', 'accent'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.settings.theme[id] = e.target.value;
                this.applySettings();
            });
        });
    }

    // Render theme preset cards
    renderThemePresets() {
        const presets = [
            { name: 'dark', label: 'Dark', bgStart: '#1a1a2e', bgEnd: '#0f0f1e', text: '#e0e0e0', accent: '#76ff03' },
            { name: 'light', label: 'Light', bgStart: '#f0f0f0', bgEnd: '#e0e0e0', text: '#1a1a1a', accent: '#4caf50' },
            { name: 'neon', label: 'Neon', bgStart: '#0a0a0a', bgEnd: '#1a0a1a', text: '#ff00ff', accent: '#00ffff' },
            { name: 'forest', label: 'Forest', bgStart: '#1a2e1a', bgEnd: '#0f1e0f', text: '#d0ffd0', accent: '#76ff76' },
            { name: 'ocean', label: 'Ocean', bgStart: '#0a1a2e', bgEnd: '#051020', text: '#d0e0ff', accent: '#00bfff' }
        ];

        const container = document.getElementById('themePresets');
        container.innerHTML = presets.map(preset => `
            <div class="theme-card ${this.settings.theme.name === preset.name ? 'active' : ''}"
                 onclick="settingsManager.applyThemePreset('${preset.name}')">
                <div class="theme-card-preview" style="background: linear-gradient(135deg, ${preset.bgStart}, ${preset.bgEnd})"></div>
                <div class="theme-card-name">${preset.label}</div>
            </div>
        `).join('');
    }

    // Apply theme preset
    applyThemePreset(presetName) {
        const presets = {
            dark: { backgroundStart: '#1a1a2e', backgroundEnd: '#0f0f1e', textPrimary: '#e0e0e0', textSecondary: '#a0a0a0', accent: '#76ff03' },
            light: { backgroundStart: '#f0f0f0', backgroundEnd: '#e0e0e0', textPrimary: '#1a1a1a', textSecondary: '#606060', accent: '#4caf50' },
            neon: { backgroundStart: '#0a0a0a', backgroundEnd: '#1a0a1a', textPrimary: '#ff00ff', textSecondary: '#ff00aa', accent: '#00ffff' },
            forest: { backgroundStart: '#1a2e1a', backgroundEnd: '#0f1e0f', textPrimary: '#d0ffd0', textSecondary: '#a0d0a0', accent: '#76ff76' },
            ocean: { backgroundStart: '#0a1a2e', backgroundEnd: '#051020', textPrimary: '#d0e0ff', textSecondary: '#a0b0d0', accent: '#00bfff' }
        };

        this.settings.theme = { ...presets[presetName], name: presetName };
        this.applySettings();
        this.renderThemeTab();
    }

    // Render Agents Tab
    renderAgentsTab() {
        const container = document.getElementById('agents-tab');

        container.innerHTML = `
            <div class="settings-group">
                <h3>Agent Embodiments</h3>
                <button class="settings-btn primary" onclick="settingsManager.createNewAgent()" style="margin-bottom: 20px;">
                    ➕ Create New Agent
                </button>
                <div id="agentEditor" class="agent-editor hidden"></div>
                <div class="agent-list" id="agentList"></div>
            </div>
        `;

        this.renderAgentList();
    }

    // Render agent list
    async renderAgentList() {
        const container = document.getElementById('agentList');

        if (!window.agents || Object.keys(window.agents).length === 0) {
            container.innerHTML = '<p style="color: #a0a0a0; text-align: center;">Loading agents...</p>';
            return;
        }

        container.innerHTML = Object.values(window.agents).map(agent => `
            <div class="agent-item">
                <div class="agent-item-info">
                    <div class="agent-item-symbol">${agent.symbol}</div>
                    <div class="agent-item-details">
                        <h4>${agent.name}</h4>
                        <p>${agent.role}</p>
                    </div>
                </div>
                <div class="agent-item-actions">
                    <button class="agent-item-btn edit" onclick="settingsManager.editAgent('${agent.id}')">
                        ✏️ Edit
                    </button>
                    <button class="agent-item-btn delete" onclick="settingsManager.deleteAgent('${agent.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Create new agent
    createNewAgent() {
        this.editingAgent = {
            id: `custom_${Date.now()}`,
            name: '',
            symbol: '🔮',
            role: '',
            description: '',
            personality: {
                style: '',
                focus: '',
                approach: ''
            },
            specialties: [],
            voiceCharacteristics: {
                tone: '',
                tempo: '',
                language: ''
            }
        };
        this.showAgentEditor();
    }

    // Edit existing agent
    editAgent(agentId) {
        this.editingAgent = { ...window.agents[agentId] };
        this.showAgentEditor();
    }

    // Show agent editor form
    showAgentEditor() {
        const editor = document.getElementById('agentEditor');
        const agent = this.editingAgent;

        editor.className = 'agent-editor';
        editor.innerHTML = `
            <div class="agent-editor-header">
                <h4>${agent.name ? 'Edit' : 'Create'} Agent</h4>
                <button class="settings-btn secondary" onclick="settingsManager.hideAgentEditor()">Cancel</button>
            </div>

            <div class="settings-field">
                <label>Agent ID</label>
                <input type="text" id="agentId" value="${agent.id}" ${agent.name ? 'disabled' : ''}>
            </div>

            <div class="settings-field-row">
                <div class="settings-field">
                    <label>Name</label>
                    <input type="text" id="agentName" value="${agent.name}" placeholder="Agent Name">
                </div>
                <div class="settings-field">
                    <label>Symbol</label>
                    <input type="text" id="agentSymbol" value="${agent.symbol}" placeholder="🔮" maxlength="3">
                </div>
            </div>

            <div class="settings-field">
                <label>Role</label>
                <input type="text" id="agentRole" value="${agent.role}" placeholder="e.g., The Mystic Guide">
            </div>

            <div class="settings-field">
                <label>Description</label>
                <textarea id="agentDescription" placeholder="Brief description of the agent...">${agent.description}</textarea>
            </div>

            <div class="settings-field-row">
                <div class="settings-field">
                    <label>Personality Style</label>
                    <input type="text" id="personalityStyle" value="${agent.personality.style}" placeholder="Speaking style...">
                </div>
                <div class="settings-field">
                    <label>Focus Area</label>
                    <input type="text" id="personalityFocus" value="${agent.personality.focus}" placeholder="Main focus...">
                </div>
            </div>

            <div class="settings-field">
                <label>Specialties (comma-separated)</label>
                <textarea id="agentSpecialties" placeholder="Specialty 1, Specialty 2, Specialty 3...">${agent.specialties.join(', ')}</textarea>
            </div>

            <button class="settings-btn primary" onclick="settingsManager.saveAgent()">
                💾 Save Agent
            </button>
        `;
    }

    // Hide agent editor
    hideAgentEditor() {
        document.getElementById('agentEditor').className = 'agent-editor hidden';
        this.editingAgent = null;
    }

    // Save agent
    async saveAgent() {
        const agent = {
            id: document.getElementById('agentId').value,
            name: document.getElementById('agentName').value,
            symbol: document.getElementById('agentSymbol').value,
            role: document.getElementById('agentRole').value,
            description: document.getElementById('agentDescription').value,
            personality: {
                style: document.getElementById('personalityStyle').value,
                focus: document.getElementById('personalityFocus').value,
                approach: this.editingAgent.personality.approach || 'Adaptive'
            },
            specialties: document.getElementById('agentSpecialties').value.split(',').map(s => s.trim()).filter(s => s),
            voiceCharacteristics: this.editingAgent.voiceCharacteristics
        };

        // Validate required fields
        if (!agent.name || !agent.symbol || !agent.role) {
            alert('Please fill in Name, Symbol, and Role fields!');
            return;
        }

        try {
            const response = await fetch(`/api/agents/${agent.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agent)
            });

            if (response.ok) {
                // Update local agents
                window.agents[agent.id] = agent;

                // Re-render UI
                if (window.renderAgentButtons) {
                    window.renderAgentButtons();
                }

                this.hideAgentEditor();
                this.renderAgentList();
                alert('Agent saved successfully!');
            } else {
                alert('Failed to save agent. Check console for details.');
            }
        } catch (error) {
            console.error('Error saving agent:', error);
            alert('Error saving agent: ' + error.message);
        }
    }

    // Delete agent
    async deleteAgent(agentId) {
        if (!confirm(`Are you sure you want to delete ${window.agents[agentId].name}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/agents/${agentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                delete window.agents[agentId];

                if (window.renderAgentButtons) {
                    window.renderAgentButtons();
                }

                this.renderAgentList();
                alert('Agent deleted successfully!');
            } else {
                alert('Failed to delete agent.');
            }
        } catch (error) {
            console.error('Error deleting agent:', error);
            alert('Error deleting agent: ' + error.message);
        }
    }

    // Render Layout Tab
    renderLayoutTab() {
        const container = document.getElementById('layout-tab');
        const { layout } = this.settings;

        container.innerHTML = `
            <div class="settings-group">
                <h3>Display Options</h3>

                <div class="settings-field">
                    <label>Font Size</label>
                    <select id="fontSize">
                        <option value="small" ${layout.fontSize === 'small' ? 'selected' : ''}>Small</option>
                        <option value="medium" ${layout.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="large" ${layout.fontSize === 'large' ? 'selected' : ''}>Large</option>
                    </select>
                </div>

                <div class="settings-field">
                    <label>
                        <input type="checkbox" id="compactMode" ${layout.compactMode ? 'checked' : ''}>
                        Compact Mode
                    </label>
                </div>

                <div class="settings-field">
                    <label>
                        <input type="checkbox" id="showHistory" ${layout.showHistory ? 'checked' : ''}>
                        Show Conversation History
                    </label>
                </div>

                <div class="settings-field">
                    <label>
                        <input type="checkbox" id="showResponses" ${layout.showResponses ? 'checked' : ''}>
                        Show Agent Responses
                    </label>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('fontSize').addEventListener('change', (e) => {
            this.settings.layout.fontSize = e.target.value;
            this.applySettings();
        });

        ['compactMode', 'showHistory', 'showResponses'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.settings.layout[id] = e.target.checked;
                this.applySettings();
            });
        });
    }

    // Render Import/Export Tab
    renderImportExportTab() {
        const container = document.getElementById('importexport-tab');

        container.innerHTML = `
            <div class="settings-group">
                <h3>Configuration Management</h3>

                <div class="settings-field">
                    <label>Export Configuration</label>
                    <p style="color: #a0a0a0; font-size: 0.9em; margin: 10px 0;">
                        Download your current settings and agent configurations as a JSON file.
                    </p>
                    <button class="settings-btn primary" onclick="settingsManager.exportConfig()">
                        📥 Export Configuration
                    </button>
                </div>

                <div class="settings-field">
                    <label>Import Configuration</label>
                    <p style="color: #a0a0a0; font-size: 0.9em; margin: 10px 0;">
                        Upload a previously exported configuration file to restore settings.
                    </p>
                    <input type="file" id="importFile" accept=".json" style="display: none;">
                    <button class="settings-btn secondary" onclick="document.getElementById('importFile').click()">
                        📤 Import Configuration
                    </button>
                </div>
            </div>
        `;

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importConfig(e.target.files[0]);
        });
    }

    // Export configuration
    exportConfig() {
        const config = {
            settings: this.settings,
            agents: window.agents,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gmusic-assembly-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import configuration
    async importConfig(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const config = JSON.parse(text);

            if (!config.settings || !config.agents) {
                alert('Invalid configuration file!');
                return;
            }

            if (confirm('This will replace your current settings and agents. Continue?')) {
                this.settings = config.settings;
                this.saveSettings();

                // TODO: Import agents via API
                alert('Configuration imported! Some features may require page reload.');
                location.reload();
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import configuration: ' + error.message);
        }
    }

    // Open settings modal
    openSettings() {
        document.getElementById('settingsModal').classList.add('open');
    }

    // Close settings modal
    closeSettings() {
        document.getElementById('settingsModal').classList.remove('open');
    }

    // Save and close
    saveAndClose() {
        this.saveSettings();
        this.closeSettings();
        alert('Settings saved successfully!');
    }
}

// Initialize settings manager when DOM is ready
let settingsManager;
document.addEventListener('DOMContentLoaded', () => {
    settingsManager = new SettingsManager();
});