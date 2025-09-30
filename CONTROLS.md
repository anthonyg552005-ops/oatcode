# 🎮 Business Controls - Pause/Resume/Stop

## Overview

Your autonomous business runs **continuously** until you manually stop or pause it. You have full control whenever you want.

---

## 🔄 Operation Mode: CONTINUOUS

**Configured in `.env`**:
```bash
OPERATION_MODE=continuous  # Runs forever until stopped
```

**What this means**:
- Business runs 24/7 indefinitely
- Doesn't stop after 30 days (or any duration)
- Keeps generating leads, closing sales, supporting customers
- Only stops when YOU tell it to

---

## 🎛️ Control Options

### **1. PAUSE** ⏸️
Temporarily stop all operations

**What happens**:
- All autonomous loops pause
- Current tasks complete gracefully
- No new leads generated
- No new emails sent
- Existing customers still supported
- Can resume anytime

**When to use**:
- Need to make changes
- Want to review performance
- Testing something
- Taking a break
- Troubleshooting an issue

### **2. RESUME** ▶️
Continue operations after pause

**What happens**:
- All systems restart immediately
- Picks up where it left off
- Resumes lead generation
- Resumes outreach
- Logs pause duration

**When to use**:
- After making changes
- Ready to continue
- Testing complete

### **3. STOP** 🛑
Completely stop the business

**What happens**:
- All operations stop gracefully
- Final statistics calculated
- Current tasks complete
- Logs total uptime
- Requires restart to resume

**When to use**:
- Ending operations
- Major system changes
- Moving to different server
- Done for the day/week/month

---

## 🖥️ How To Control

### **Method 1: API Calls** (Programmatic)

**Pause**:
```bash
curl -X POST http://localhost:3000/api/control/pause
```

**Resume**:
```bash
curl -X POST http://localhost:3000/api/control/resume
```

**Stop**:
```bash
curl -X POST http://localhost:3000/api/control/stop
```

**Get Status**:
```bash
curl http://localhost:3000/api/control/status
```

### **Method 2: Dashboard** (Visual)

Visit: `http://localhost:3000/autonomous-dashboard`

Click buttons to:
- ⏸️ Pause
- ▶️ Resume
- 🛑 Stop
- 📊 View Status

### **Method 3: Terminal** (Direct)

**Stop Everything**:
```bash
# Press Ctrl+C in the terminal where it's running
```

**Or use npm**:
```bash
npm stop  # If you set up a stop script
```

---

## 📊 Status Information

### **GET /api/control/status**

Returns:
```json
{
  "isRunning": true,
  "isPaused": false,
  "operationMode": "continuous",
  "pausedAt": null,
  "startedAt": 1234567890000,
  "uptime": 3600000,
  "stats": {
    "leadsGenerated": 150,
    "emailsSent": 120,
    "demosCreated": 120,
    "customersSigned": 12,
    "revenue": 2364,
    "supportTicketsResolved": 45,
    "websitesDeployed": 12,
    "startedAt": 1234567890000,
    "totalUptime": 3600000
  }
}
```

**Fields**:
- `isRunning`: Business is active
- `isPaused`: Currently paused
- `operationMode`: "continuous" or "duration"
- `pausedAt`: When pause started (null if not paused)
- `startedAt`: When business started
- `uptime`: Milliseconds running
- `stats`: All business metrics

---

## 🎯 Common Scenarios

### **Pause for the night**:
```bash
# 5 PM - Pause
curl -X POST http://localhost:3000/api/control/pause

# 9 AM - Resume
curl -X POST http://localhost:3000/api/control/resume
```

### **Check if running**:
```bash
curl http://localhost:3000/api/control/status | json_pp
```

### **Emergency stop**:
```bash
# Method 1: API
curl -X POST http://localhost:3000/api/control/stop

# Method 2: Terminal
# Press Ctrl+C

# Method 3: Kill process
pkill -f "node src/autonomous-engine.js"
```

### **Restart after changes**:
```bash
# 1. Stop
curl -X POST http://localhost:3000/api/control/stop

# 2. Make changes to code/config

# 3. Restart
npm start
```

---

## ⚙️ Configuration

### **Change to Duration Mode** (stops after X days):
```bash
# .env
OPERATION_MODE=duration
OPERATION_DURATION_DAYS=30
```

### **Stay in Continuous Mode** (recommended):
```bash
# .env
OPERATION_MODE=continuous
```

---

## 🔐 Security

**API endpoints are currently open**. For production, add authentication:

```javascript
// In app.js
const API_KEY = process.env.CONTROL_API_KEY;

app.use('/api/control/*', (req, res, next) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

Then use:
```bash
curl -H "X-API-Key: your-secret-key" -X POST http://localhost:3000/api/control/pause
```

---

## 📱 Mobile Control

### **Using shortcuts** (iOS/Android):
Create shortcuts that call the API:

**Pause Business**:
- URL: `http://your-server:3000/api/control/pause`
- Method: POST

**Resume Business**:
- URL: `http://your-server:3000/api/control/resume`
- Method: POST

**Check Status**:
- URL: `http://your-server:3000/api/control/status`
- Method: GET

---

## 🤖 Automated Control

### **Pause every night at 10 PM**:
```bash
# crontab
0 22 * * * curl -X POST http://localhost:3000/api/control/pause
0 8 * * * curl -X POST http://localhost:3000/api/control/resume
```

### **Stop after reaching revenue goal**:
```javascript
// Custom script
setInterval(async () => {
  const status = await fetch('http://localhost:3000/api/control/status').then(r => r.json());

  if (status.stats.revenue >= 10000) {
    await fetch('http://localhost:3000/api/control/stop', { method: 'POST' });
    console.log('Revenue goal reached! Business stopped.');
  }
}, 60000); // Check every minute
```

---

## 📊 Monitoring While Paused

Even when paused:
- ✅ Dashboard still works
- ✅ Can view stats
- ✅ API endpoints respond
- ✅ Can check status
- ❌ No new leads generated
- ❌ No new emails sent
- ❌ No autonomous operations

---

## 🎉 Summary

### **Your Control Options**:
1. **Pause** - Temporary stop, resume anytime
2. **Resume** - Continue after pause
3. **Stop** - Complete shutdown
4. **Status** - Check current state

### **Access Methods**:
1. API calls (`curl`)
2. Dashboard (browser)
3. Terminal (Ctrl+C)

### **Operation Mode**:
- **CONTINUOUS** (default) - Runs forever
- **DURATION** - Stops after X days

### **Current Setup**:
- ✅ Runs continuously
- ✅ Full control via API
- ✅ Can pause/resume anytime
- ✅ Can stop whenever needed

**You're in complete control!** 🎮

---

## 📞 Examples

### **Quick Commands**:
```bash
# Pause
curl -X POST http://localhost:3000/api/control/pause

# Resume
curl -X POST http://localhost:3000/api/control/resume

# Stop
curl -X POST http://localhost:3000/api/control/stop

# Status
curl http://localhost:3000/api/control/status

# Status (formatted)
curl -s http://localhost:3000/api/control/status | json_pp
```

### **From JavaScript**:
```javascript
// Pause
await fetch('http://localhost:3000/api/control/pause', { method: 'POST' });

// Resume
await fetch('http://localhost:3000/api/control/resume', { method: 'POST' });

// Stop
await fetch('http://localhost:3000/api/control/stop', { method: 'POST' });

// Status
const status = await fetch('http://localhost:3000/api/control/status').then(r => r.json());
console.log(status);
```

---

**Status**: ✅ Fully Implemented
**Last Updated**: 2025-09-30
**Contact**: anthonyg552005@gmail.com