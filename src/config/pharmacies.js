import { pharmacyDataManager } from '../utils/localStorage.js';

// Initialize default pharmacy data if local storage is empty
const defaultPharmacies = [
  {
    id: "cvs_main_st",
    name: "CVS Pharmacy - Main Street",
    phone: "+1234567890",
    address: "123 Main St, Anytown, USA",
    zipCode: "12345",
    hours: "8:00 AM - 10:00 PM",
    specialty: "general",
    inventory: {}
  },
  {
    id: "walgreens_oak_ave",
    name: "Walgreens - Oak Avenue",
    phone: "+1234567891", 
    address: "456 Oak Ave, Anytown, USA",
    zipCode: "12345",
    hours: "7:00 AM - 11:00 PM",
    specialty: "general",
    inventory: {}
  },
  {
    id: "specialty_pharmacy",
    name: "Specialty Care Pharmacy",
    phone: "+1234567892",
    address: "789 Medical Dr, Anytown, USA",
    zipCode: "12346", 
    hours: "9:00 AM - 6:00 PM",
    specialty: "specialty_medications",
    inventory: {}
  },
  {
    id: "compounding_pharmacy",
    name: "Custom Compounding Pharmacy",
    phone: "+1234567893",
    address: "321 Health Blvd, Anytown, USA",
    zipCode: "12345",
    hours: "8:00 AM - 8:00 PM", 
    specialty: "compounding",
    inventory: {}
  }
];

// Initialize pharmacy data on startup
async function initializePharmacyData() {
  const existingPharmacies = await pharmacyDataManager.getAllPharmacies();
  
  if (existingPharmacies.length === 0) {
    console.log('Initializing default pharmacy data...');
    for (const pharmacy of defaultPharmacies) {
      await pharmacyDataManager.savePharmacy(pharmacy);
    }
  }
}

// Call initialization
initializePharmacyData().catch(console.error);

export async function findPharmaciesByLocation(zipCode, medicationType = "general") {
  return await pharmacyDataManager.findPharmaciesByLocation(zipCode, medicationType);
}

export async function getPharmacyById(id) {
  return await pharmacyDataManager.getPharmacyById(id);
}

export async function getAllPharmacies() {
  return await pharmacyDataManager.getAllPharmacies();
}

export async function addPharmacy(pharmacyData) {
  return await pharmacyDataManager.savePharmacy(pharmacyData);
}

export async function updatePharmacyInventory(pharmacyId, medicationName, availability) {
  return await pharmacyDataManager.updatePharmacyAvailability(pharmacyId, medicationName, availability);
}