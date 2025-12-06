import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Service for generating unique reference IDs with prefixes
 * Format: PREFIX + number (e.g., IN01, IN02, AD01, etc.)
 */
class ReferenceIdService {
  /**
   * Generate next reference ID for a given type
   * @param {string} type - The form type (incident, assetDamage, dailyOccurrence, cctvCheck)
   * @returns {Promise<string>} The generated reference ID
   */
  async generateReferenceId(type) {
    const config = this.getTypeConfig(type);

    try {
      // Use a transaction to ensure atomicity
      const referenceId = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', config.counterName);
        const counterDoc = await transaction.get(counterRef);

        let nextNumber = 1;

        if (counterDoc.exists()) {
          nextNumber = (counterDoc.data().current || 0) + 1;
          transaction.update(counterRef, { current: nextNumber });
        } else {
          // Initialize counter if it doesn't exist
          transaction.set(counterRef, { current: nextNumber });
        }

        // Format the number with leading zeros
        const formattedNumber = String(nextNumber).padStart(config.digits, '0');
        return `${config.prefix}${formattedNumber}`;
      });

      return referenceId;
    } catch (error) {
      console.error('Failed to generate reference ID:', error);
      throw error;
    }
  }

  /**
   * Get configuration for each form type
   * @param {string} type - The form type
   * @returns {Object} Configuration object
   */
  getTypeConfig(type) {
    const configs = {
      incident: {
        prefix: 'IN',
        digits: 2,
        counterName: 'incidentReports'
      },
      assetDamage: {
        prefix: 'AD',
        digits: 2,
        counterName: 'assetDamage'
      },
      dailyOccurrence: {
        prefix: 'DO',
        digits: 2,
        counterName: 'dailyOccurrence'
      },
      cctvCheck: {
        prefix: 'CC',
        digits: 2,
        counterName: 'cctvCheck'
      }
    };

    if (!configs[type]) {
      throw new Error(`Unknown form type: ${type}`);
    }

    return configs[type];
  }

  /**
   * Get the current counter value for a form type (for testing/admin purposes)
   * @param {string} type - The form type
   * @returns {Promise<number>} Current counter value
   */
  async getCurrentCount(type) {
    try {
      const config = this.getTypeConfig(type);
      const counterRef = doc(db, 'counters', config.counterName);
      const counterDoc = await getDoc(counterRef);

      if (counterDoc.exists()) {
        return counterDoc.data().current || 0;
      }
      return 0;
    } catch (error) {
      console.error('Failed to get current count:', error);
      return 0;
    }
  }

  /**
   * Reset counter for a form type (admin use only)
   * @param {string} type - The form type
   * @param {number} value - Value to reset to (default: 0)
   */
  async resetCounter(type, value = 0) {
    try {
      const config = this.getTypeConfig(type);
      const counterRef = doc(db, 'counters', config.counterName);
      await setDoc(counterRef, { current: value });
    } catch (error) {
      console.error('Failed to reset counter:', error);
      throw error;
    }
  }
}

export const referenceIdService = new ReferenceIdService();
