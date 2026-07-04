import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `Database is connected successfully!! \n host:${connect.connection.host}\n port:${connect.connection.port}\n dbname:${connect.connection.name}`,
    );
  } catch (error) {
    console.error(`error occurred while conenctiong db`, error);
    process.exit(1);
  }
};

export default connectDB;
