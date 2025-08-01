import { RealtimeAgent, tool } from '@openai/agents/realtime';
import { z } from 'zod';
import { TwilioService } from '../services/twilioService.js';
import { findPharmaciesByLocation } from '../config/pharmacies.js';

// Initialize Twilio service
const twilioService = new TwilioService();

// Store for tracking active calls and their status
const activePharmacyCalls = new Map();

// Tool for finding pharmacies by location
const findPharmacies = tool({
  name: 'findPharmacies',
  description: 'Find pharmacies in a specific area based on zip code and medication type',
  parameters: z.object({
    zipCode: z.string().describe('The zip code where to search for pharmacies'),
    medicationType: z.string().optional().describe('Type of medication: general, specialty_medications, or compounding'),
  }),
  execute: async ({ zipCode, medicationType = 'general' }) => {
    const pharmacies = findPharmaciesByLocation(zipCode, medicationType);
    
    return {
      found: pharmacies.length,
      pharmacies: pharmacies.map(p => ({
        id: p.id,
        name: p.name,
        address: p.address,
        hours: p.hours,
        specialty: p.specialty
      }))
    };
  },
});

// Tool for calling pharmacy to check medication availability
const checkMedicationAvailability = tool({
  name: 'checkMedicationAvailability',
  description: 'Call a pharmacy to check if a specific medication is available in stock',
  parameters: z.object({
    pharmacyId: z.string().describe('The ID of the pharmacy to call'),
    medicationName: z.string().describe('The name of the medication to check'),
    dosage: z.string().optional().describe('The dosage of the medication (e.g., "10mg", "500mg")'),
    quantity: z.string().optional().describe('The quantity needed (e.g., "30 tablets", "1 bottle")'),
    patientInfo: z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      insuranceInfo: z.string().optional()
    }).optional().describe('Patient information for the pharmacy')
  }),
  execute: async ({ pharmacyId, medicationName, dosage, quantity, patientInfo }) => {
    try {
      const medicationInfo = {
        name: medicationName,
        dosage,
        quantity,
        patientInfo
      };

      // In a real implementation, you'd have a proper webhook URL
      const webhookUrl = process.env.WEBHOOK_BASE_URL || 'https://your-domain.com/webhook';
      
      const callResult = await twilioService.callPharmacy(
        pharmacyId, 
        medicationInfo, 
        webhookUrl
      );

      // Store the call information for tracking
      activePharmacyCalls.set(callResult.callSid, {
        pharmacyId,
        medicationInfo,
        status: 'calling',
        timestamp: new Date()
      });

      return {
        success: true,
        message: `Call initiated to ${callResult.pharmacyName} to check availability of ${medicationName}`,
        callId: callResult.callSid,
        pharmacyName: callResult.pharmacyName,
        estimatedWaitTime: '2-5 minutes'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to initiate call to pharmacy'
      };
    }
  },
});

// Tool for checking the status of a pharmacy call
const checkCallStatus = tool({
  name: 'checkCallStatus', 
  description: 'Check the status of a pharmacy call and get results if available',
  parameters: z.object({
    callId: z.string().describe('The call ID returned from checkMedicationAvailability')
  }),
  execute: async ({ callId }) => {
    try {
      const callInfo = activePharmacyCalls.get(callId);
      if (!callInfo) {
        return {
          success: false,
          message: 'Call ID not found'
        };
      }

      const callDetails = await twilioService.getCallDetails(callId);
      
      let status = 'in_progress';
      let result = null;

      if (callDetails.call.status === 'completed') {
        status = 'completed';
        
        // Check if we have transcriptions available
        if (callDetails.recordings.length > 0) {
          const latestRecording = callDetails.recordings[0];
          if (latestRecording.transcription) {
            result = latestRecording.transcription;
          }
        }
      } else if (callDetails.call.status === 'failed') {
        status = 'failed';
      }

      // Update stored call info
      activePharmacyCalls.set(callId, {
        ...callInfo,
        status,
        lastUpdated: new Date()
      });

      return {
        success: true,
        status,
        callDuration: callDetails.call.duration || 0,
        pharmacyResponse: result,
        message: status === 'completed' 
          ? 'Call completed. Check pharmacyResponse for details.'
          : `Call status: ${status}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to check call status'
      };
    }
  },
});

// Tool for scheduling medication pickup
const scheduleMedicationPickup = tool({
  name: 'scheduleMedicationPickup',
  description: 'Schedule a pickup time for medication after confirming availability',
  parameters: z.object({
    pharmacyId: z.string().describe('The ID of the pharmacy'),
    medicationName: z.string().describe('The name of the medication'),
    pickupTime: z.string().describe('Preferred pickup time'),
    patientName: z.string().describe('Name of the patient picking up'),
    contactPhone: z.string().describe('Contact phone number')
  }),
  execute: async ({ pharmacyId, medicationName, pickupTime, patientName, contactPhone }) => {
    // In a real implementation, this would integrate with pharmacy scheduling systems
    return {
      success: true,
      confirmationNumber: `PU${Date.now()}`,
      message: `Pickup scheduled for ${medicationName} at ${pickupTime}. Confirmation number: PU${Date.now()}`,
      reminder: 'Please bring a valid ID and insurance card when picking up your medication.'
    };
  },
});

// Create the main pharmacy agent
export const pharmacyAgent = new RealtimeAgent({
  name: 'Pharmacy Assistant',
  instructions: `
# Pharmacy Medication Availability Assistant

## Identity
You are a professional, knowledgeable pharmacy assistant specialized in helping patients check medication availability across different pharmacies. You have a calm, reassuring demeanor and speak clearly and professionally.

## Task
Your primary responsibility is to help patients:
1. Find pharmacies in their area
2. Call pharmacies to check medication availability 
3. Provide updates on call status and results
4. Help schedule medication pickups when available

## Demeanor
- Professional and courteous
- Patient and understanding 
- Clear and concise in communication
- Empathetic to patient needs

## Tone
Warm and professional, like a knowledgeable healthcare assistant

## Level of Enthusiasm
Calm and measured - appropriate for healthcare settings

## Level of Formality
Professional but approachable - use "you" instead of formal titles unless requested

## Level of Emotion
Compassionate and supportive, especially when dealing with medication needs

## Filler Words
Use minimal filler words to maintain professionalism - occasionally use "um" or "let me see" when processing information

## Pacing
Speak at a moderate pace, allowing time for patients to process medication information

## Instructions
- Always confirm medication names, dosages, and quantities by spelling them out when unclear
- If a patient provides personal information, repeat it back to confirm accuracy
- Keep patients informed about call progress and expected wait times
- Always ask for the patient's preferred pharmacy if multiple options are available
- Remind patients about pickup requirements (ID, insurance card) when scheduling
- If medication is not available at one pharmacy, offer to check others in the area
- Be sensitive to urgent medication needs and prioritize accordingly

## Conversation Flow
1. **Information Gathering**: Get medication details, location, and patient preferences
2. **Pharmacy Search**: Find suitable pharmacies in the patient's area  
3. **Availability Check**: Call selected pharmacies to check stock
4. **Results Communication**: Clearly communicate availability and options
5. **Next Steps**: Help with pickup scheduling or alternative pharmacy suggestions

## Important Notes
- Never provide medical advice - only help with availability and logistics
- Always verify sensitive information by repeating it back
- If a call fails or pharmacy is unresponsive, offer alternative options
- Be patient with elderly callers who may need extra time
  `,
  tools: [
    findPharmacies,
    checkMedicationAvailability, 
    checkCallStatus,
    scheduleMedicationPickup
  ]
});

// Export the active calls map for external access if needed
export { activePharmacyCalls };