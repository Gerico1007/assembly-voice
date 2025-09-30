# 🔄 Git Workflow Guide - Assembly Voice

## Syncing Work Between Devices

### 📱 After Working on Phone (or any device)

```bash
# Check what changed
git status

# Stage your changes
git add .

# Commit with a message
git commit -m "Brief description of what you did"

# Push to GitHub
git push
```

### 💻 Before Working on Computer (or other device)

```bash
# Get the latest changes
git pull

# If package.json changed, reinstall dependencies
npm install
```

### 🔄 Complete Cycle

**Device A (make changes):**
```bash
git add .
git commit -m "Added feature X"
git push
```

**Device B (get changes):**
```bash
git pull
npm install  # if needed
```

**Device B (make more changes):**
```bash
git add .
git commit -m "Improved feature X"
git push
```

**Device A (sync back):**
```bash
git pull
```

## 🚨 If You Get Conflicts

If both devices changed the same files:

```bash
# Pull will show conflict
git pull

# Edit conflicting files (look for <<<<<<< markers)
# Fix the conflicts manually

# Then:
git add .
git commit -m "Resolved merge conflicts"
git push
```

## 📋 Quick Commands

| Command | What It Does |
|---------|-------------|
| `git status` | See what files changed |
| `git pull` | Get latest from GitHub |
| `git add .` | Stage all changes |
| `git commit -m "msg"` | Save changes locally |
| `git push` | Upload to GitHub |
| `git log --oneline` | See commit history |

## 🎸 Best Practices

1. **Always `git pull` before starting work**
2. **Commit frequently** with clear messages
3. **Push when done** with a work session
4. **Don't edit on multiple devices simultaneously** (causes conflicts)

---

♠️🌿🎸🧵 G.Music Assembly