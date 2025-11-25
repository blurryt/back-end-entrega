import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const connectDB = async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('MongoDB Memory Server conectado com sucesso!');
  
  return mongod;
};

export default connectDB;