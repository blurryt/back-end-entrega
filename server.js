import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

import connectDB from './db/db.js'

import User from './models/User.js'
import Trip from './models/Trip.js'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

const SUPER_SECRET_KEY = process.env.SUPER_SECRET_KEY

try {
  await connectDB()
} catch (error) {
  console.error('Error connecting to MongoDB:', error)
}


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

app.post('/rota', (req, res) => {
  const { origem, destino, distancia, duracao } = req.body
  console.log('Rota recebida:', { origem, destino, distancia, duracao })

  res.status(200).json({
    sucesso: true,
    mensagem: 'Rota recebida com sucesso!',
    dados: { origem, destino, distancia, duracao },
  })
})

app.get('/rotas', (req, res) => {
  res.json([])
})

app.get('/viagens', async (req, res) => {
  try {
    const trips = await Trip.find({}).sort({ date: -1 })
    res.status(200).json(trips)
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar viagens: " + error.message })
  }
})

app.post('/viagens', async (req, res) => {
  try {
    const {
      user, addressStartTrip, addressEndTrip
    } = req.body
    if(!user || !addressStartTrip || !addressEndTrip) return res.status(400).json({ 
      sucesso: false, 
      mensagem: "Parâmetros insuficientes."
    })

    const newTrip = await Trip.create({ user, addressStartTrip, addressEndTrip })

    res.status(201).json({
      sucesso: true,
      mensagem: "Viagem criada com sucesso",
      dados: newTrip
    })

  } catch (error) {
    res.status(500).json({ sucesso: false, error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})