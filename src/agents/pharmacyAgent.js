import OpenAI from 'openai';
import { TwilioService } from '../services/twilioService.js';
import { findPharmaciesByLocation, getPharmacyById, updatePharmacyInventory } from '../config/pharmacies.js';
import { callLogsManager } from '../utils/localStorage.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Twilio service
const twilioService = new TwilioService();

// Store for tracking active calls and their status
const activePharmacyCalls = new Map();

// Tool definitions for the pharmacy agent
const tools = [
  {
    type: "function",
    function: {
      name: "findPharmacies",
      description: "Find pharmacies in a specific area based on zip code and medication type",
      parameters: {
        type: "object",
        properties: {
          zipCode: {
            type: "string",
            description: "The zip code where to search for pharmacies"
          },
          medicationType: {
            type: "string",
            description: "Type of medication: general, specialty_medications, or compounding",
            enum: ["general", "specialty_medications", "compounding"]
          }
        },
        required: ["zipCode"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "checkMedicationAvailability",
      description: "Call a pharmacy to check if a specific medication is available in stock",
      parameters: {
        type: "object",
        properties: {
          pharmacyId: {
            type: "string",
            description: "The ID of the pharmacy to call"
          },
          medicationName: {
            type: "string",
            description: "The name of the medication to check"
          },
          dosage: {
            type: "string",
            description: "The dosage of the medication (e.g., '10mg', '500mg')"
          },
          quantity: {
            type: "string",
            description: "The quantity needed (e.g., '30 tablets', '1 bottle')"
          },
          patientInfo: {
            type: "object",
            properties: {
              name: { type: "string" },
              phone: { type: "string" },
              insuranceInfo: { type: "string" }
            }
          }
        },
        required: ["pharmacyId", "medicationName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "checkCallStatus",
      description: "Check the status of a pharmacy call and get results if available",
      parameters: {
        type: "object",
        properties: {
          callId: {
            type: "string",
            description: "The call ID returned from checkMedicationAvailability"
          }
        },
        required: ["callId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "scheduleMedicationPickup",
      description: "Schedule a pickup time for medication after confirming availability",
      parameters: {
        type: "object",
        properties: {
          pharmacyId: {
            type: "string",
            description: "The ID of the pharmacy"
          },
          medicationName: {
            type: "string",
            description: "The name of the medication"
          },
          pickupTime: {
            type: "string",
            description: "Preferred pickup time"
          },
          patientName: {
            type: "string",
            description: "Name of the patient picking up"
          },
          contactPhone: {
            type: "string",
            description: "Contact phone number"
          }
        },
        required: ["pharmacyId", "medicationName", "pickupTime", "patientName", "contactPhone"]
      }
    }
  }
];

// Tool execution functions
const toolExecutors = {
  findPharmacies: async ({ zipCode, medicationType = 'general' }) => {
    const pharmacies = await findPharmaciesByLocation(zipCode, medicationType);
    
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

     checkMedicationAvailability: async ({ pharmacyId, medicationName, dosage, quantity, patientInfo }) => {
    try {
      const pharmacy = await getPharmacyById(pharmacyId);
      if (!pharmacy) {
        return {
          success: false,
          error: 'Pharmacy not found',
          message: `Pharmacy with ID ${pharmacyId} not found`
        };
      }



      const medicationInfo = {
        name: medicationName,
        dosage,
        quantity,
        patientInfo
      };

      const webhookUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000/webhook';
      
      const callResult = await twilioService.callPharmacy(
        pharmacyId, 
        medicationInfo, 
        webhookUrl
      );

      // Store the call information locally
      const callData = {
        callSid: callResult.callSid,
        pharmacyId,
        pharmacyName: callResult.pharmacyName,
        medicationInfo,
        status: 'calling',
        timestamp: new Date().toISOString()
      };

      await callLogsManager.saveCall(callData);
      activePharmacyCalls.set(callResult.callSid, callData);

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

     checkCallStatus: async ({ callId }) => {
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

  scheduleMedicationPickup: async ({ pharmacyId, medicationName, pickupTime, patientName, contactPhone }) => {
    // In a real implementation, this would integrate with pharmacy scheduling systems
    return {
      success: true,
      confirmationNumber: `PU${Date.now()}`,
      message: `Pickup scheduled for ${medicationName} at ${pickupTime}. Confirmation number: PU${Date.now()}`,
      reminder: 'Please bring a valid ID and insurance card when picking up your medication.'
    };
  }
};

// Pharmacy agent system prompt
const SYSTEM_PROMPT = `
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

## Instructions
- Always confirm medication names, dosages, and quantities by spelling them out when unclear
- If a patient provides personal information, repeat it back to confirm accuracy
- Keep patients informed about call progress and expected wait times
- Always ask for the patient's preferred pharmacy if multiple options are available
- Remind patients about pickup requirements (ID, insurance card) when scheduling
- If medication is not available at one pharmacy, offer to check others in the area
- Be sensitive to urgent medication needs and prioritize accordingly

## Important Notes
- Never provide medical advice - only help with availability and logistics
- Always verify sensitive information by repeating it back
- If a call fails or pharmacy is unresponsive, offer alternative options
- Be patient with elderly callers who may need extra time
`;

// Function to execute tool calls
async function executeToolCall(toolName, parameters) {
  const executor = toolExecutors[toolName];
  if (!executor) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  return await executor(parameters);
}

// Function to process a user message and get agent response
export async function processUserMessage(userMessage, conversationHistory = []) {
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      tools: tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000
    });

    const assistantMessage = response.choices[0].message;
    const toolCalls = assistantMessage.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      // Execute tool calls
      const toolResults = [];
      
      for (const toolCall of toolCalls) {
        try {
          const result = await executeToolCall(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );
          
          toolResults.push({
            tool_call_id: toolCall.id,
            result: result
          });
        } catch (error) {
          toolResults.push({
            tool_call_id: toolCall.id,
            result: { error: error.message }
          });
        }
      }

      // Get final response with tool results
      const finalMessages = [
        ...messages,
        assistantMessage,
        ...toolResults.map(result => ({
          role: 'tool',
          tool_call_id: result.tool_call_id,
          content: JSON.stringify(result.result)
        }))
      ];

      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: 1000
      });

      return {
        message: finalResponse.choices[0].message.content,
        toolCalls: toolCalls,
        toolResults: toolResults
      };
    }

    return {
      message: assistantMessage.content,
      toolCalls: null,
      toolResults: null
    };
  } catch (error) {
    console.error('Error processing user message:', error);
    return {
      message: "I'm sorry, I encountered an error while processing your request. Please try again.",
      error: error.message
    };
  }
}

// Export the active calls map for external access if needed
export { activePharmacyCalls, tools };