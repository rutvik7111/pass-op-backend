import mongoose from "mongoose";

const passwordSchema = new mongoose.Schema({
    site: String,
    password: String,
    username: String,
    userId: String,
    iv: String
})

const Password = mongoose.model("Password", passwordSchema)
export default Password