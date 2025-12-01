import mongoose from 'mongoose';
import dotenv from "dotenv"
dotenv.config()

const uri = process.env.MONGODB_URI

const connectDB = async () => {
  const mongod = await mongoose.connect(uri);
  console.log('MongoDB Atlas conectado com sucesso!');
  
  return mongod;
};

export default connectDB;