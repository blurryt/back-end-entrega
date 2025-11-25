import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from './models/User.js'
import connectDB from './db/db.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000
const SUPER_SECRET_KEY = process.env.SUPER_SECRET_KEY

// Connect to MongoDB
try {
  await connectDB()
} catch (error) {
  console.error('Error connecting to MongoDB:', error)
}

// route /register
app.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({
      first_name,
      last_name,
      email,
      password: hashedPassword
    })
    await newUser.save()
    res.status(201).json({ message: 'User registered successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' })
  }
})  


// route /login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }
    const token = jwt.sign({ userId: user._id }, SUPER_SECRET_KEY, { expiresIn: '1h' })
    res.json({ token })
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' })
  }
})



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})