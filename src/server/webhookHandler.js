import express from 'express';
import { TwilioService } from '../services/twilioService.js';
import { callLogsManager } from '../utils/localStorage.js';
import { updatePharmacyInventory } from '../config/pharmacies.js';

const router = express.Router();
const twilioService = new TwilioService();

// Handle incoming call status updates
router.post('/status', async (req, res) => {
  const { CallSid, CallStatus, From, To } = req.body;
  
  console.log(`Call ${CallSid} status: ${CallStatus}`);
  
  try {
    // Update call status in local storage
    await callLogsManager.updateCall(CallSid, {
      status: CallStatus,
      from: From,
      to: To,
      statusTimestamp: new Date().toISOString()
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error updating call status:', error);
    res.status(500).send('Error updating call status');
  }
});

// Handle pharmacy response recordings
router.post('/recording', async (req, res) => {
  const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body;
  
  console.log(`Recording received for call ${CallSid}: ${RecordingSid}`);
  
  try {
    // Update call with recording information
    await callLogsManager.updateCall(CallSid, {
      recordingSid: RecordingSid,
      recordingUrl: RecordingUrl,
      recordingDuration: RecordingDuration,
      recordingTimestamp: new Date().toISOString()
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error updating call recording:', error);
    res.status(500).send('Error updating call recording');
  }
});

// Handle pharmacy response transcription
router.post('/transcription-callback', async (req, res) => {
  const { CallSid, TranscriptionText, TranscriptionStatus } = req.body;
  
  console.log(`Transcription received for call ${CallSid}: ${TranscriptionStatus}`);
  
  try {
    if (TranscriptionStatus === 'completed' && TranscriptionText) {
      // Parse pharmacy response to extract availability information
      const availabilityInfo = parsePharmacyResponse(TranscriptionText);
      
      // Update call with transcription and parsed results
      await callLogsManager.updateCall(CallSid, {
        transcription: TranscriptionText,
        transcriptionStatus: TranscriptionStatus,
        availabilityInfo,
        transcriptionTimestamp: new Date().toISOString()
      });

      // If we can determine medication availability, update pharmacy inventory
      const callData = await callLogsManager.getCallById(CallSid);
      if (callData && availabilityInfo.medicationFound) {
        await updatePharmacyInventory(
          callData.pharmacyId, 
          callData.medicationInfo.name,
          {
            available: availabilityInfo.available,
            quantity: availabilityInfo.quantity,
            price: availabilityInfo.price
          }
        );
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing transcription:', error);
    res.status(500).send('Error processing transcription');
  }
});

// Handle pharmacy response after recording
router.post('/handle-pharmacy-response', (req, res) => {
  const { CallSid } = req.body;
  
  // Generate TwiML response
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">
        Thank you for the information. We have recorded your response and will follow up if needed.
        Have a great day!
    </Say>
    <Hangup/>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// TwiML endpoint for making pharmacy calls
router.post('/call-pharmacy', (req, res) => {
  const { medicationName, dosage, quantity } = req.query;
  
  const medicationInfo = {
    name: medicationName || 'the requested medication',
    dosage: dosage || '',
    quantity: quantity || ''
  };
  
  const twiml = twilioService.generatePharmacyCallTwiML(medicationInfo);
  
  res.type('text/xml');
  res.send(twiml);
});

// Simple function to parse pharmacy response text
function parsePharmacyResponse(transcriptionText) {
  const text = transcriptionText.toLowerCase();
  
  // Simple keyword-based parsing - in production, you'd use more sophisticated NLP
  const availabilityKeywords = {
    positive: ['yes', 'available', 'in stock', 'have it', 'we have', 'stock'],
    negative: ['no', 'not available', 'out of stock', 'don\'t have', 'unavailable'],
    partial: ['limited', 'few left', 'running low', 'small quantity']
  };

  let available = false;
  let confidence = 'low';
  let quantity = 'unknown';
  let price = null;
  let medicationFound = false;

  // Check for positive availability indicators
  if (availabilityKeywords.positive.some(keyword => text.includes(keyword))) {
    available = true;
    confidence = 'high';
    medicationFound = true;
  }
  
  // Check for negative availability indicators
  if (availabilityKeywords.negative.some(keyword => text.includes(keyword))) {
    available = false;
    confidence = 'high';
    medicationFound = true;
  }
  
  // Check for partial availability
  if (availabilityKeywords.partial.some(keyword => text.includes(keyword))) {
    available = true;
    confidence = 'medium';
    quantity = 'limited';
    medicationFound = true;
  }

  // Simple price extraction (look for dollar amounts)
  const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) {
    price = parseFloat(priceMatch[1]);
  }

  // Simple quantity extraction
  const quantityMatch = text.match(/(\d+)\s*(tablets?|pills?|bottles?|capsules?)/);
  if (quantityMatch) {
    quantity = `${quantityMatch[1]} ${quantityMatch[2]}`;
  }

  return {
    available,
    confidence,
    quantity,
    price,
    medicationFound,
    rawResponse: transcriptionText
  };
}

export default router;