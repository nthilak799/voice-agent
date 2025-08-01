import twilio from 'twilio';
import { getPharmacyById } from '../config/pharmacies.js';

export class TwilioService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  /**
   * Initiates a call to a pharmacy for medication availability check
   * @param {string} pharmacyId - The ID of the pharmacy to call
   * @param {string} medicationInfo - Information about the medication to check
   * @param {string} webhookUrl - URL for handling call events
   * @returns {Promise<object>} Call details from Twilio
   */
  async callPharmacy(pharmacyId, medicationInfo, webhookUrl) {
    const pharmacy = getPharmacyById(pharmacyId);
    
    if (!pharmacy) {
      throw new Error(`Pharmacy with ID ${pharmacyId} not found`);
    }

    try {
      const call = await this.client.calls.create({
        to: pharmacy.phone,
        from: this.fromNumber,
        url: webhookUrl, // TwiML URL that handles the call flow
        statusCallback: `${webhookUrl}/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true, // Record the call for quality assurance
        recordingStatusCallback: `${webhookUrl}/recording`
      });

      console.log(`Call initiated to ${pharmacy.name}: ${call.sid}`);
      
      return {
        callSid: call.sid,
        pharmacyName: pharmacy.name,
        pharmacyPhone: pharmacy.phone,
        status: 'initiated',
        medicationInfo
      };
    } catch (error) {
      console.error(`Error calling pharmacy ${pharmacy.name}:`, error);
      throw error;
    }
  }

  /**
   * Generates TwiML for the pharmacy call flow
   * @param {string} medicationInfo - Information about the medication
   * @returns {string} TwiML XML
   */
  generatePharmacyCallTwiML(medicationInfo) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">
        Hello, I'm calling on behalf of a patient to check medication availability. 
        I need to verify if you have ${medicationInfo.name} in stock.
        ${medicationInfo.dosage ? `The dosage required is ${medicationInfo.dosage}.` : ''}
        ${medicationInfo.quantity ? `The quantity needed is ${medicationInfo.quantity}.` : ''}
        Can you please check your inventory and let me know the availability?
    </Say>
    <Record 
        timeout="30" 
        finishOnKey="#" 
        action="/handle-pharmacy-response" 
        method="POST"
        transcribe="true"
        transcribeCallback="/transcription-callback"
    />
    <Say voice="alice" language="en-US">
        Thank you for your time. If you need to provide additional information, 
        please call us back at the number that appeared on your caller ID.
    </Say>
</Response>`;
  }

  /**
   * Retrieves call details and recordings
   * @param {string} callSid - The Twilio call SID
   * @returns {Promise<object>} Call details including recordings
   */
  async getCallDetails(callSid) {
    try {
      const call = await this.client.calls(callSid).fetch();
      const recordings = await this.client.recordings.list({
        callSid: callSid
      });

      return {
        call,
        recordings: recordings.map(recording => ({
          sid: recording.sid,
          uri: recording.uri,
          duration: recording.duration,
          transcription: recording.transcription
        }))
      };
    } catch (error) {
      console.error(`Error fetching call details for ${callSid}:`, error);
      throw error;
    }
  }

  /**
   * Downloads and processes call transcription
   * @param {string} recordingSid - The recording SID
   * @returns {Promise<string>} Transcription text
   */
  async getTranscription(recordingSid) {
    try {
      const recording = await this.client.recordings(recordingSid).fetch();
      
      if (recording.transcription) {
        return recording.transcription;
      }
      
      // If transcription is not ready, you might need to wait or implement polling
      return null;
    } catch (error) {
      console.error(`Error fetching transcription for ${recordingSid}:`, error);
      throw error;
    }
  }
}