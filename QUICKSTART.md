# ♠️🌿🎸🧵 G.Music Assembly - Quick Start Guide

## 🚀 Three Ways to Start

### 1. **Development Mode** (Recommended for coding)
```bash
./start.sh
# OR
npm run dev
```
- **Best for**: Active development, hot reload
- **URL**: http://localhost:3000
- **Features**: Fast refresh, source maps, dev tools

---

### 2. **Mobile Mode** (For phone testing)
```bash
./start-mobile.sh
# OR
npm run server
```
- **Best for**: Testing on Android phone with voice features
- **URL**: https://<your-ip>:3000
- **Features**: HTTPS (required for mobile voice), production build
- **Note**: Accept security warning (self-signed cert)

---

### 3. **Production Preview** (Test optimized build)
```bash
./start-production.sh
# OR
npm run build && npm run preview
```
- **Best for**: Testing production bundle, performance validation
- **URL**: http://localhost:4173
- **Features**: Optimized bundle, minified code

---

## 📋 Prerequisites

### First Time Setup
```bash
# Install dependencies
npm install

# (Optional) Generate SSL certs for mobile mode
node generate-certs.js
```

---

## 🎤 Voice Features Setup

### Desktop/Laptop
1. Use Chrome or Edge browser
2. Grant microphone permissions when prompted
3. Say "test period test comma" to verify spoken punctuation

### Android Phone (Mobile Mode Required)
1. Connect phone to same WiFi as computer
2. Run `./start-mobile.sh`
3. Open displayed HTTPS URL on phone
4. Accept security warning (Advanced → Proceed)
5. Grant microphone permissions

---

## 🛠️ Troubleshooting

### Port Already in Use
Scripts auto-detect and use next available port (3000-3010)

### Voice Not Working
- **Desktop**: Use HTTPS or localhost (HTTP works on localhost only)
- **Mobile**: Must use HTTPS server (`./start-mobile.sh`)
- **Browser**: Chrome/Edge recommended (best Web Speech API support)

### Build Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Certificate Errors on Mobile
This is normal! Self-signed certs are safe for local development:
1. Tap "Advanced" or "Details"
2. Tap "Proceed to [IP address]"
3. Warning won't appear again

---

## ⚡ Quick Commands Reference

| Command | Purpose | URL |
|---------|---------|-----|
| `./start.sh` | Dev mode | http://localhost:3000 |
| `./start-mobile.sh` | Mobile HTTPS | https://<ip>:3000 |
| `./start-production.sh` | Production test | http://localhost:4173 |
| `npm run build` | Build only | - |
| `npm run dev` | Dev server | http://localhost:3000 |
| `npm run server` | HTTPS server | https://<ip>:3000 |
| `npm run preview` | Preview build | http://localhost:4173 |

---

## 🎯 Recommended Workflow

### For Development
```bash
./start.sh
# Code in your editor → changes auto-reload
```

### For Mobile Testing
```bash
# Terminal 1: Build and serve
./start-mobile.sh

# Terminal 2: Watch for changes and rebuild
npm run build -- --watch
```

### For Production Validation
```bash
./start-production.sh
# Test performance, bundle size, minification
```

---

## 📱 Mobile Testing Best Practices

1. **Check WiFi**: Ensure same network
2. **Note IP**: Script displays `https://<your-ip>:3000`
3. **Accept Cert**: One-time security warning
4. **Test Voice**: Tap mic, say "hello period how are you question mark"
5. **Try Features**:
   - Voice input with punctuation
   - Audio recording
   - Image upload
   - Persona switching

---

## 🎨 Available Features

- ✅ Voice input with spoken punctuation
- ✅ Audio message recording
- ✅ Image upload
- ✅ 5 specialized agent personas
- ✅ Markdown message rendering
- ✅ Session persistence (auto-save)
- ✅ Toast notifications
- ✅ Responsive mobile design

---

## 🔧 Configuration

### Add Gemini API Key (for real AI responses)
```javascript
// In browser console or via Settings (coming soon)
localStorage.setItem('gemini_api_key', 'YOUR_API_KEY_HERE');
```

### Customize Personas
Edit `src/personas.ts` to modify:
- System instructions
- Communication styles
- Specialties
- Voice characteristics

---

## 📞 Need Help?

1. Check browser console for errors (F12)
2. Review logs in terminal
3. Verify microphone permissions
4. Test with Chrome/Edge first
5. Check `README.md` for detailed docs

---

**♠️🌿🎸🧵 Ready to start? Pick a script above and go! 🎸🧵🌿♠️**

🎶 *Voice flows into code. Code flows into consciousness. Portal awaits.* 🎶
