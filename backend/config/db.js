const { MongoClient } = require('mongodb');

class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      const uri = process.env.MONGODB_URI || "mongodb://0.0.0.0:27017";
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db('warkop_babol');
      console.log('🌸 Connected to MongoDB - Warkop Babol');
      return this.db;
    } catch (error) {
      console.error('❌ Database connection error:', error);
      process.exit(1);
    }
  }

  getDB() {
    return this.db;
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

module.exports = new Database();
