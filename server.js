import crypto from 'crypto'
import dotenv from "dotenv"; // Import dotenv
dotenv.config(); // Load environment variables
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import Password from './models/Password.js'
import Theme from './models/Theme.js';
import { clerkMiddleware } from '@clerk/express'
import { requireAuth, getAuth } from '@clerk/express'

const app = express()
const port = process.env.PORT || 3000;

const secretKey = process.env.SECRET_KEY;  // Loaded from .env

app.use(express.json())
app.use(cors({
    origin: 'https://pass-op-phi.vercel.app',  // ✅ Allow only your frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.options('*', cors());  // ✅ Explicitly handle preflight requests
app.use(express.json());
app.use(clerkMiddleware())

await mongoose.connect(process.env.MONGODB_URI)

app.get('/api/get-passwords', requireAuth(), async (req, res) => {
    const { userId } = getAuth(req)
    let passwords = await Password.find({ userId: userId })

    passwords = passwords.map(pswd => {
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), Buffer.from(pswd.iv, 'hex'));
        let decrypted = decipher.update(pswd.password, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return { ...pswd.toObject(), password: decrypted }
    })

    res.json(passwords)
})

app.post('/api/add-password', requireAuth(), async (req, res) => {
    const { userId } = getAuth(req)
    const iv = crypto.randomBytes(16);  // AES requires 16 bytes for the IV
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
    let encrypted = cipher.update(req.body.password, 'utf8', 'hex');
    encrypted += cipher.final('hex'); // encrypted password

    const password = await Password.create({ ...req.body, password: encrypted, userId, iv: iv.toString('hex') })
    res.send("Added.")
})

app.put('/api/update-password', requireAuth(), async (req, res) => {
    const passwordToBeEdited = await Password.findOne({ _id: req.body._id })

    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), Buffer.from(passwordToBeEdited.iv, 'hex'));
    let encrypted = cipher.update(req.body.password, 'utf8', 'hex');
    encrypted += cipher.final('hex'); // encrypted password

    const password = await Password.findOneAndUpdate({ _id: req.body._id }, { ...req.body, password: encrypted })
    res.send("Updated.")
})

app.delete('/api/delete-password', requireAuth(), async (req, res) => {
    const password = await Password.deleteOne({ _id: req.body._id })
    res.send("Deleted.")
})

app.get('/api/get-theme', requireAuth(), async (req, res) => {
    const { userId } = getAuth(req)
    let theme = await Theme.findOne({ userId: userId })
    if (!theme) {
        theme = await Theme.create({ theme: "light", userId: userId })
    }
    res.json(theme)
})

app.post('/api/set-theme', requireAuth(), async (req, res) => {
    const { userId } = getAuth(req)
    const themeExist = await Theme.findOne({ userId: userId })
    if (themeExist) {
        const theme = await Theme.findOneAndUpdate({ userId: userId }, { theme: req.body.theme })
    } else {
        const theme = await Theme.create({ theme: req.body.theme, userId: userId })
    }
    res.send("Theme saved.")
})

app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening on port ${port}`)
})