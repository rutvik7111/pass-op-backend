import mongoose from "mongoose";

const themeSchema = new mongoose.Schema({
    theme: String,
    userId: String
})

const Theme = mongoose.model("Theme", themeSchema)
export default Theme