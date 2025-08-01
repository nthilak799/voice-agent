# 🚀 Pharmacy Voice Agent - Quick Start Guide

## ✅ Current Status: READY TO RUN!

Your pharmacy voice agent is successfully set up and running. Here's how to test and use it:

## 🏁 Running the System

### 1. **Start the Server**
```bash
npm install
npm start
```

**Expected Output:**
```
🚀 Pharmacy Voice Agent Server running on port 3000
📋 Health check: http://localhost:3000/health
🏥 Pharmacies API: http://localhost:3000/api/pharmacies
📞 Call logs API: http://localhost:3000/api/calls
🎙️  Voice agent: http://localhost:3000/voice-agent
🧪 Test endpoint: http://localhost:3000/api/test/call-pharmacy
⚠️  Twilio credentials not found or invalid. Call functionality will be simulated.
✅ Pharmacy data initialized
```

## 🧪 Testing the System

### 2. **Test Components (No API Keys Required)**
```bash
# Run comprehensive component test
node src/test-direct.js
```

This will test:
- ✅ Pharmacy directory lookup
- ✅ Individual pharmacy lookup  
- ✅ Simulated pharmacy calls
- ✅ Call status checking

### 3. **Test API Endpoints**

#### Health Check
```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"...","service":"pharmacy-voice-agent"}
```

#### View Available Pharmacies
```bash
curl http://localhost:3000/api/pharmacies
```

**Expected Response:**
```json
[
  {
    "id": "cvs_main_st",
    "name": "CVS Pharmacy - Main Street",
    "phone": "+1234567890",
    "address": "123 Main St, Anytown, USA",
    "zipCode": "12345",
    "hours": "8:00 AM - 10:00 PM",
    "specialty": "general"
  },
  // ... more pharmacies
]
```

#### Check Call Logs
```bash
curl http://localhost:3000/api/calls
# Shows any pharmacy calls made
```

## 🎙️ Using the Voice Agent

### 4. **Chat Interface (Requires OpenAI API Key)**

Set your OpenAI API key in `.env`:
```bash
OPENAI_API_KEY=your_actual_openai_api_key_here
```

Then test the chat interface:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi, I need to check if any pharmacies have Lisinopril 10mg in stock in zip code 12345"}'
```

### 5. **Testing Pharmacy Calls (Simulation Mode)**

Without Twilio credentials, calls are simulated:

```bash
curl -X POST http://localhost:3000/api/test/call-pharmacy \
  -H "Content-Type: application/json" \
  -d '{
    "pharmacyId": "cvs_main_st",
    "medicationName": "Lisinopril",
    "dosage": "10mg",
    "quantity": "30 tablets"
  }'
```

## 📞 Real Phone Calls (Optional)

### 6. **Set Up Twilio for Real Calls**

1. Sign up for Twilio account
2. Get your credentials from Twilio Console
3. Add to `.env`:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

4. Restart the server - calls will now be real!

## 🎭 What Happens in Simulation Mode

When Twilio credentials aren't set (current state):

1. **User Request**: "Check if CVS has Lisinopril in stock"
2. **Agent Finds Pharmacy**: Uses local pharmacy directory
3. **Simulated Call**: Instead of real phone call, logs:
   ```
   📞 SIMULATED CALL to CVS Pharmacy - Main Street for Lisinopril
      Pharmacy: CVS Pharmacy - Main Street (+1234567890)
      Medication: Lisinopril 10mg
      Call SID: SIM_1754069521030_rvojb5sq0
   ```
4. **Simulated Response**: Returns realistic pharmacy response:
   ```
   "Yes, we have that medication in stock. We have 50+ tablets available at $15.99"
   ```

## 🛠️ Available Features

### Current Working Features:
- ✅ **Pharmacy Directory**: Find pharmacies by location and specialty
- ✅ **Call Simulation**: Simulates phone calls to pharmacies
- ✅ **Response Parsing**: Extracts availability info from responses
- ✅ **Call Tracking**: Logs all calls and responses locally
- ✅ **Pickup Scheduling**: Helps schedule medication pickups
- ✅ **REST API**: Full API for integration

### With API Keys:
- 🎙️ **Voice Chat**: Natural language conversation
- 📞 **Real Phone Calls**: Actual calls to pharmacies via Twilio

## 📊 Local Data Storage

All data is stored locally in JSON files:

- `data/pharmacies.json` - Pharmacy directory
- `data/call_logs.json` - Call history and responses

## 🚨 Example Conversation Flow

**Patient**: "I need to check if any pharmacy near 12345 has my blood pressure medication"

**Agent**: 
1. Uses `findPharmacies` tool → finds CVS and Walgreens
2. "I found 2 pharmacies in your area. What's the medication name?"

**Patient**: "Lisinopril 10mg, 30 tablets"

**Agent**:
1. Uses `checkMedicationAvailability` tool → calls CVS
2. "I'm calling CVS now to check availability..."
3. Call completes with simulated response
4. "CVS confirmed they have Lisinopril 10mg in stock, 50+ tablets available at $15.99"

**Patient**: "Great! Can you schedule a pickup?"

**Agent**:
1. Uses `scheduleMedicationPickup` tool
2. "I've scheduled your pickup. Confirmation number: PU1754069521030"

## 🔧 Troubleshooting

### Server Won't Start
- Check if port 3000 is available
- Verify all dependencies installed: `npm install`

### API Calls Fail
- Ensure server is running: `curl http://localhost:3000/health`
- Check server logs for errors

### No Voice Responses
- Set `OPENAI_API_KEY` in `.env` file
- Verify API key has access to GPT-4

## 🚀 Next Steps

1. **Development**: Use simulation mode for testing
2. **Production**: Add real API keys for full functionality
3. **Customization**: Add more pharmacies to `data/pharmacies.json`
4. **Integration**: Use REST API endpoints in your applications

## 💡 Pro Tips

- Use `node src/test-direct.js` for quick component testing
- Monitor `data/call_logs.json` to see call history
- The simulation mode is perfect for development and demos
- All pharmacy responses are realistic and help test the full workflow

---

🎉 **Your pharmacy voice agent is ready to help patients check medication availability!**