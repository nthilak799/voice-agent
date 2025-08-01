# Pharmacy Voice Agent

A voice agent that can call pharmacies to check medication availability using OpenAI's Realtime API and Twilio for phone calls.

## Features

- 🎙️ **Voice Interface**: Speech-to-speech interaction using OpenAI Realtime API
- 📞 **Pharmacy Calling**: Automated calls to pharmacies to check medication availability
- 🏥 **Local Pharmacy Directory**: File-based pharmacy database (no external database required)
- 📋 **Call Logging**: Track all pharmacy calls and responses locally
- 🔍 **Availability Parsing**: Automatic parsing of pharmacy responses for medication availability
- 📅 **Pickup Scheduling**: Help patients schedule medication pickups

## Architecture

This voice agent uses the **speech-to-speech architecture** with OpenAI's Realtime API for natural, low-latency conversations. The agent can:

1. Listen to patient requests for medication availability
2. Find nearby pharmacies based on location and medication type
3. Call pharmacies using Twilio to check stock
4. Parse pharmacy responses and update local inventory
5. Help schedule medication pickups

## Prerequisites

- Node.js 18+ 
- OpenAI API key with Realtime API access
- Twilio account with phone number (for making pharmacy calls)

## Setup

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd pharmacy-voice-agent
npm install
```

2. **Environment Configuration:**
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Twilio Configuration for Phone Calls
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Server Configuration
PORT=3000
NODE_ENV=development
WEBHOOK_BASE_URL=http://localhost:3000/webhook

# Local Storage Paths (no database needed)
CALL_LOGS_FILE=./data/call_logs.json
PHARMACY_DATA_FILE=./data/pharmacies.json
```

3. **Start the server:**
```bash
npm start
```

The server will start on `http://localhost:3000` and automatically create the `data/` directory with initial pharmacy data.

## Usage

### Voice Agent Integration

The voice agent is designed to be integrated with the OpenAI Agents SDK:

```javascript
import { pharmacyAgent } from './src/agents/pharmacyAgent.js';

// The agent is pre-configured with tools for:
// - Finding pharmacies by location
// - Calling pharmacies for availability checks
// - Checking call status and results
// - Scheduling medication pickups
```

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Pharmacy Management
```bash
# Get all pharmacies
GET /api/pharmacies

# Add a new pharmacy
POST /api/pharmacies
{
  "name": "New Pharmacy",
  "phone": "+1234567890",
  "address": "123 Main St",
  "zipCode": "12345",
  "hours": "9:00 AM - 9:00 PM",
  "specialty": "general"
}
```

#### Call Management
```bash
# Get all call logs
GET /api/calls

# Get specific call details
GET /api/calls/:callId
```

#### Testing
```bash
# Test pharmacy calling functionality
POST /api/test/call-pharmacy
{
  "pharmacyId": "cvs_main_st",
  "medicationName": "Lisinopril",
  "dosage": "10mg",
  "quantity": "30 tablets"
}
```

### Voice Agent Tools

The pharmacy agent comes with these built-in tools:

1. **findPharmacies**: Find pharmacies by zip code and medication type
2. **checkMedicationAvailability**: Call pharmacies to check medication stock
3. **checkCallStatus**: Monitor ongoing pharmacy calls
4. **scheduleMedicationPickup**: Schedule pickup appointments

### Typical Conversation Flow

1. **Patient**: "I need to check if CVS has my blood pressure medication in stock"
2. **Agent**: Uses `findPharmacies` to locate CVS locations
3. **Agent**: Uses `checkMedicationAvailability` to call the pharmacy
4. **Agent**: "I'm calling CVS now to check availability. This may take 2-5 minutes..."
5. **Agent**: Uses `checkCallStatus` to monitor the call
6. **Agent**: "CVS confirmed they have Lisinopril 10mg in stock. Would you like me to schedule a pickup?"
7. **Agent**: Uses `scheduleMedicationPickup` if requested

## Local Data Storage

The system uses JSON files for local storage:

### Pharmacy Data (`data/pharmacies.json`)
```json
[
  {
    "id": "cvs_main_st",
    "name": "CVS Pharmacy - Main Street", 
    "phone": "+1234567890",
    "address": "123 Main St, Anytown, USA",
    "zipCode": "12345",
    "hours": "8:00 AM - 10:00 PM",
    "specialty": "general",
    "inventory": {
      "lisinopril": {
        "available": true,
        "quantity": "50+ tablets",
        "lastChecked": "2024-01-01T12:00:00Z",
        "price": 15.99
      }
    }
  }
]
```

### Call Logs (`data/call_logs.json`)
```json
[
  {
    "id": "call_1234567890",
    "callSid": "CA1234567890abcdef",
    "pharmacyId": "cvs_main_st", 
    "pharmacyName": "CVS Pharmacy - Main Street",
    "medicationInfo": {
      "name": "Lisinopril",
      "dosage": "10mg",
      "quantity": "30 tablets"
    },
    "status": "completed",
    "timestamp": "2024-01-01T12:00:00Z",
    "transcription": "Yes, we have Lisinopril 10mg in stock...",
    "availabilityInfo": {
      "available": true,
      "confidence": "high",
      "quantity": "50+ tablets"
    }
  }
]
```

## Webhook Endpoints

For Twilio integration, the following webhooks are available:

- `POST /webhook/status` - Call status updates
- `POST /webhook/recording` - Call recording notifications
- `POST /webhook/transcription-callback` - Transcription results
- `POST /webhook/call-pharmacy` - TwiML for pharmacy calls

## Development

### Adding New Pharmacies

You can add pharmacies via the API or by directly editing `data/pharmacies.json`:

```bash
curl -X POST http://localhost:3000/api/pharmacies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local Pharmacy",
    "phone": "+1555123456",
    "address": "456 Oak St",
    "zipCode": "12345",
    "specialty": "general"
  }'
```

### Extending the Agent

To add new tools to the pharmacy agent:

```javascript
import { tool } from '@openai/agents/realtime';
import { z } from 'zod';

const newTool = tool({
  name: 'newTool',
  description: 'Description of what this tool does',
  parameters: z.object({
    param1: z.string().describe('Parameter description')
  }),
  execute: async ({ param1 }) => {
    // Tool implementation
    return { success: true };
  },
});

// Add to pharmacyAgent tools array
```

## Error Handling

The system includes comprehensive error handling:

- **Call failures**: Automatically retry or suggest alternative pharmacies
- **Transcription errors**: Fallback to manual processing
- **Network issues**: Graceful degradation with error messages
- **Data persistence**: Automatic recovery from file system errors

## Security Considerations

- **API Keys**: Store in environment variables, never commit to code
- **Phone Numbers**: Validate and sanitize all phone number inputs
- **Call Recording**: Recordings include sensitive patient information
- **Local Storage**: Secure file system permissions for data directory

## Limitations

- **Local Storage**: Not suitable for high-volume production use
- **Simple NLP**: Basic keyword matching for pharmacy responses
- **No Authentication**: Production deployment needs authentication
- **Single Server**: No clustering or load balancing

## Production Deployment

For production use, consider:

1. **Database**: Replace JSON files with proper database
2. **Authentication**: Add user authentication and authorization
3. **Monitoring**: Implement comprehensive logging and monitoring
4. **Scaling**: Use container orchestration and load balancing
5. **Security**: Add HTTPS, input validation, and rate limiting

## License

MIT License - see LICENSE file for details
