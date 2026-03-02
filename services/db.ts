import Dexie, { Table } from 'dexie';
import { Message, RoomSettings } from '../types';

class NexusDB extends Dexie {
  messages!: Table<Message, string>;
  rooms!: Table<RoomSettings, string>;

  constructor() {
    super('NexusP2PDB');
    (this as any).version(1).stores({
      messages: 'id, roomId, channelId, timestamp',
      rooms: 'id, name, createdAt' 
    });
  }
}

export const db = new NexusDB();

// Utility function to completely wipe the database
// This ensures privacy when the session ends or starts fresh
export const resetDatabase = async () => {
    try {
        await (db as any).delete();
        await (db as any).open();
        console.log("Session storage cleared for privacy.");
    } catch (error) {
        console.error("Failed to reset database:", error);
    }
};