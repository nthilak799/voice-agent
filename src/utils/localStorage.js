import fs from 'fs/promises';
import path from 'path';

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = './data';
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Generic function to read JSON file
async function readJsonFile(filePath, defaultValue = {}) {
  await ensureDataDirectory();
  
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default value
      return defaultValue;
    }
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
}

// Generic function to write JSON file
async function writeJsonFile(filePath, data) {
  await ensureDataDirectory();
  
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

// Call logs management
export class CallLogsManager {
  constructor() {
    this.filePath = process.env.CALL_LOGS_FILE || './data/call_logs.json';
  }

  async getAllCalls() {
    return await readJsonFile(this.filePath, []);
  }

  async saveCall(callData) {
    const calls = await this.getAllCalls();
    const newCall = {
      id: callData.callSid || `call_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...callData
    };
    
    calls.push(newCall);
    const success = await writeJsonFile(this.filePath, calls);
    return success ? newCall : null;
  }

  async updateCall(callId, updateData) {
    const calls = await this.getAllCalls();
    const callIndex = calls.findIndex(call => call.id === callId);
    
    if (callIndex === -1) {
      return null;
    }

    calls[callIndex] = {
      ...calls[callIndex],
      ...updateData,
      lastUpdated: new Date().toISOString()
    };

    const success = await writeJsonFile(this.filePath, calls);
    return success ? calls[callIndex] : null;
  }

  async getCallById(callId) {
    const calls = await this.getAllCalls();
    return calls.find(call => call.id === callId) || null;
  }

  async getCallsByStatus(status) {
    const calls = await this.getAllCalls();
    return calls.filter(call => call.status === status);
  }

  async deleteOldCalls(daysOld = 30) {
    const calls = await this.getAllCalls();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const recentCalls = calls.filter(call => {
      const callDate = new Date(call.timestamp);
      return callDate > cutoffDate;
    });

    await writeJsonFile(this.filePath, recentCalls);
    return calls.length - recentCalls.length; // Return number of deleted calls
  }
}

// Pharmacy data management
export class PharmacyDataManager {
  constructor() {
    this.filePath = process.env.PHARMACY_DATA_FILE || './data/pharmacies.json';
  }

  async getAllPharmacies() {
    return await readJsonFile(this.filePath, []);
  }

  async savePharmacy(pharmacyData) {
    const pharmacies = await this.getAllPharmacies();
    const newPharmacy = {
      id: pharmacyData.id || `pharmacy_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...pharmacyData
    };

    // Check if pharmacy already exists
    const existingIndex = pharmacies.findIndex(p => p.id === newPharmacy.id);
    if (existingIndex !== -1) {
      pharmacies[existingIndex] = { ...pharmacies[existingIndex], ...newPharmacy };
    } else {
      pharmacies.push(newPharmacy);
    }

    const success = await writeJsonFile(this.filePath, pharmacies);
    return success ? newPharmacy : null;
  }

  async getPharmacyById(pharmacyId) {
    const pharmacies = await this.getAllPharmacies();
    return pharmacies.find(p => p.id === pharmacyId) || null;
  }

  async findPharmaciesByLocation(zipCode, medicationType = 'general') {
    const pharmacies = await this.getAllPharmacies();
    
    // Simple filtering by specialty - in a real app this would include geographic filtering
    return pharmacies.filter(pharmacy => 
      (pharmacy.specialty === medicationType || pharmacy.specialty === 'general') &&
      (pharmacy.zipCode === zipCode || !pharmacy.zipCode) // If no zipCode specified, include all
    );
  }

  async updatePharmacyAvailability(pharmacyId, medicationName, availability) {
    const pharmacies = await this.getAllPharmacies();
    const pharmacyIndex = pharmacies.findIndex(p => p.id === pharmacyId);
    
    if (pharmacyIndex === -1) {
      return null;
    }

    if (!pharmacies[pharmacyIndex].inventory) {
      pharmacies[pharmacyIndex].inventory = {};
    }

    pharmacies[pharmacyIndex].inventory[medicationName.toLowerCase()] = {
      available: availability.available,
      quantity: availability.quantity || 'unknown',
      lastChecked: new Date().toISOString(),
      price: availability.price || null
    };

    const success = await writeJsonFile(this.filePath, pharmacies);
    return success ? pharmacies[pharmacyIndex] : null;
  }
}

// Export instances
export const callLogsManager = new CallLogsManager();
export const pharmacyDataManager = new PharmacyDataManager();