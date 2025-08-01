import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pharmacyAgent } from './agents/pharmacyAgent.js';
import webhookHandler from './server/webhookHandler.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'pharmacy-voice-agent'
  });
});

// Webhook endpoints for Twilio
app.use('/webhook', webhookHandler);

// API endpoint to get call logs (for debugging/monitoring)
app.get('/api/calls', async (req, res) => {
  try {
    const { callLogsManager } = await import('./utils/localStorage.js');
    const calls = await callLogsManager.getAllCalls();
    res.json(calls);
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// API endpoint to get specific call details
app.get('/api/calls/:callId', async (req, res) => {
  try {
    const { callLogsManager } = await import('./utils/localStorage.js');
    const call = await callLogsManager.getCallById(req.params.callId);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    res.json(call);
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({ error: 'Failed to fetch call details' });
  }
});

// API endpoint to get pharmacy directory
app.get('/api/pharmacies', async (req, res) => {
  try {
    const { getAllPharmacies } = await import('./config/pharmacies.js');
    const pharmacies = await getAllPharmacies();
    res.json(pharmacies);
  } catch (error) {
    console.error('Error fetching pharmacies:', error);
    res.status(500).json({ error: 'Failed to fetch pharmacies' });
  }
});

// API endpoint to add a new pharmacy
app.post('/api/pharmacies', async (req, res) => {
  try {
    const { addPharmacy } = await import('./config/pharmacies.js');
    const pharmacy = await addPharmacy(req.body);
    
    if (pharmacy) {
      res.status(201).json(pharmacy);
    } else {
      res.status(400).json({ error: 'Failed to add pharmacy' });
    }
  } catch (error) {
    console.error('Error adding pharmacy:', error);
    res.status(500).json({ error: 'Failed to add pharmacy' });
  }
});

// WebSocket endpoint for real-time voice agent communication
app.get('/voice-agent', (req, res) => {
  // This would typically upgrade to WebSocket for real-time communication
  // For now, we'll provide connection information
  res.json({
    message: 'Voice agent endpoint',
    agent: pharmacyAgent.name,
    instructions: 'Connect via WebSocket or WebRTC for real-time communication',
    tools: pharmacyAgent.tools?.map(tool => tool.name) || []
  });
});

// Test endpoint to simulate a pharmacy call (for development)
app.post('/api/test/call-pharmacy', async (req, res) => {
  const { pharmacyId, medicationName, dosage, quantity } = req.body;
  
  if (!pharmacyId || !medicationName) {
    return res.status(400).json({ 
      error: 'Missing required fields: pharmacyId and medicationName' 
    });
  }

  try {
    // Simulate calling the pharmacy tool
    const checkMedicationTool = pharmacyAgent.tools?.find(
      tool => tool.name === 'checkMedicationAvailability'
    );

    if (checkMedicationTool) {
      const result = await checkMedicationTool.execute({
        pharmacyId,
        medicationName,
        dosage,
        quantity
      });
      
      res.json(result);
    } else {
      res.status(500).json({ error: 'Medication availability tool not found' });
    }
  } catch (error) {
    console.error('Error testing pharmacy call:', error);
    res.status(500).json({ error: 'Failed to test pharmacy call' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Pharmacy Voice Agent Server running on port ${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
  console.log(`🏥 Pharmacies API: http://localhost:${port}/api/pharmacies`);
  console.log(`📞 Call logs API: http://localhost:${port}/api/calls`);
  console.log(`🎙️  Voice agent: http://localhost:${port}/voice-agent`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/api/test/call-pharmacy`);
  
  // Initialize pharmacy data
  import('./config/pharmacies.js').then(() => {
    console.log('✅ Pharmacy data initialized');
  }).catch(console.error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

export default app;