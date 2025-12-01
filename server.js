import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import connectDB from './db/db.js'

import User from './models/User.js'
import Trip from './models/Trip.js'
import Route from './models/Route.js'
import Blacklist from './models/BlackList.js'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000
const SUPER_SECRET_KEY = process.env.SUPER_SECRET_KEY

// --- MIDDLEWARES ---

async function checkToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) return res.status(401).json({ message: 'Acesso negado!' })

    const isBlacklisted = await Blacklist.findOne({ token })
    if (isBlacklisted) {
        return res.status(401).json({ message: 'Token invalidado (Logout realizado)' })
    }

    try {
        const secret = process.env.SUPER_SECRET_KEY
        const decoded = jwt.verify(token, secret)
        req.userId = decoded.userId
        next()
    } catch (error) {
        res.status(400).json({ message: 'Token inválido!' })
    }
}

async function checkTripStatus(req, res, next) {
  try {
    const userId = req.userId
    // Verifica se já tem viagem ATIVA ou PENDENTE
    const anyActiveTrip = await Trip.findOne({ 
      user: userId, 
      status: { $in: ['active', 'pending'] } 
    })
    
    if(anyActiveTrip) {
        return res.status(409).json({ // 409 Conflict
            erro: 'Usuário já possui uma corrida ativa ou pendente' 
        })
    }
    next()
  } catch (error) {
    res.status(500).json({ message: 'Erro ao verificar status' })
  }
}

// --- CONEXÃO ---
try {
  await connectDB()
} catch (error) {
  console.error('Error connecting to MongoDB:', error)
}

// --- ROTAS DE USUÁRIO ---

app.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body
    
    if (await User.findOne({ email })) {
        return res.status(400).json({ error: 'Email já cadastrado' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    const newUser = new User({
      firstName, lastName, email,
      password: hashedPassword,
      balance: 50 // Bônus inicial
    })
    
    await newUser.save()
    const token = jwt.sign({ userId: newUser._id }, SUPER_SECRET_KEY, { expiresIn: '1h' })

    res.status(201).json({ 
        message: 'User registered successfully',
        token, 
        user: {
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            balance: newUser.balance
        }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }
    
    const token = jwt.sign({ userId: user._id }, SUPER_SECRET_KEY, { expiresIn: '1h' })
    
    res.json({ 
        token,
        user: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            balance: user.balance
        }
    })
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' })
  }
})

app.post('/logout', checkToken, async (req, res) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    await Blacklist.create({ token })
    res.status(200).json({ message: "Deslogado com sucesso" })
})

app.get('/profile', checkToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
})

// --- ROTAS DE VIAGEM ---

app.post('/rota', checkToken, async (req, res) => {
  try {
    const { origem, destino, distanciaValue, duracaoValue } = req.body
    const km = distanciaValue / 1000
    const valorCalculado = parseFloat((km * 2.0).toFixed(2))
    const duracaoMinutos = Math.ceil(duracaoValue / 60)

    const newRoute = await Route.create({
        addressStartTrip: origem,
        addressEndTrip: destino,
        duration: duracaoMinutos,
        price: valorCalculado
    })

    res.status(201).json({
      sucesso: true,
      mensagem: 'Rota calculada e salva!',
      dados: {
        routeId: newRoute._id,
        preco: valorCalculado,
        distanciaKm: km.toFixed(1),
        duracaoMin: duracaoMinutos
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CRIAR VIAGEM (Cliente)
app.post('/viagens', checkToken, checkTripStatus, async (req, res) => {
  try {
    const { routeId } = req.body
    if(!routeId) return res.status(400).json({ erro: "Rota obrigatória" })

    const route = await Route.findById(routeId)
    if(!route) return res.status(404).json({ erro: "Rota não encontrada" })
      
    const userId = req.userId
    const user = await User.findById(userId)
    
    // VERIFICAÇÃO DE SALDO (CRÍTICO)
    if(user.balance < route.price) {
        return res.status(402).json({ erro: "Saldo insuficiente" })
    }

    const newTrip = await Trip.create({
        user: userId,
        route: routeId,
        price: route.price,
        status: 'pending'
    })

    // DEDUÇÃO DO SALDO
    user.trips.push(newTrip._id)
    user.balance = parseFloat(user.balance) - parseFloat(route.price) 
    await user.save()

    res.status(201).json({
      sucesso: true,
      mensagem: "Viagem criada",
      trip: newTrip
    })
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
})

// LISTAR VIAGENS (Para o Motorista ver as pendentes)
app.get('/viagens', async (req, res) => {
  try {
    const { status } = req.query
    const filter = status ? { status } : {}
    
    const trips = await Trip.find(filter)
        .populate('user')
        .populate('route')
        .sort({ date: -1 })
        
    res.status(200).json(trips)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DETALHE DA VIAGEM (Polling)
app.get('/viagens/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: 'ID inválido' })

    const trip = await Trip.findById(id).populate('route')
    if (!trip) return res.status(404).json({ erro: 'Viagem não encontrada' })

    res.status(200).json(trip)
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
})

// ---------------------------------------------------------
// ROTA DO MOTORISTA (Sem Token) - Aceitar / Finalizar / Cancelar
// ---------------------------------------------------------
app.patch('/viagens/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if(!status) return res.status(400).json({ erro: "Status obrigatório" })

    // 1. Busca a viagem
    const trip = await Trip.findById(id)
    if (!trip) return res.status(404).json({ erro: 'Viagem não encontrada' })

    // Trava de segurança
    if (trip.status === 'completed' || trip.status === 'canceled') {
        return res.status(400).json({ erro: 'Viagem já finalizada ou cancelada.' })
    }

    // --- CORREÇÃO DO REEMBOLSO (MOTORISTA CANCELOU) ---
    if (status === 'canceled') {
        console.log(`[REEMBOLSO] Motorista cancelou a viagem ${id}`)
        
        const user = await User.findById(trip.user)
        if (user) {
            const saldoAntigo = parseFloat(user.balance)
            const valorReembolso = parseFloat(trip.price)
            
            // Soma garantindo que são números
            user.balance = saldoAntigo + valorReembolso
            
            await user.save()
            console.log(`[SUCESSO] Saldo atualizado de ${saldoAntigo} para ${user.balance}`)
        } else {
            console.error(`[ERRO] Usuário dono da viagem não encontrado!`)
        }
    }

    // 2. Atualiza status da viagem
    trip.status = status
    await trip.save()

    res.json({ sucesso: true, trip })

  } catch (error) {
    console.error("Erro na rota do motorista:", error)
    res.status(500).json({ erro: error.message })
  }
})

// ---------------------------------------------------------
// ROTA DO CLIENTE (Com Token) - Cancelar
// ---------------------------------------------------------
app.patch('/viagens/:id/cancelar', checkToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    const trip = await Trip.findOne({ _id: id, user: userId })
    if (!trip) return res.status(404).json({ erro: 'Viagem não encontrada.' })

    // Trava: Cliente não pode cancelar se motorista já aceitou
    if (trip.status === 'active') {
        return res.status(409).json({ erro: 'Motorista já a caminho. Cancelamento bloqueado.' })
    }

    if (trip.status === 'completed' || trip.status === 'canceled') {
        return res.status(400).json({ erro: 'Viagem já finalizada.' })
    }

    // --- CORREÇÃO DO REEMBOLSO (CLIENTE CANCELOU) ---
    console.log(`[REEMBOLSO] Cliente cancelando viagem ${id}`)
    
    const user = await User.findById(userId)
    const saldoAntigo = parseFloat(user.balance)
    const valorReembolso = parseFloat(trip.price)

    user.balance = saldoAntigo + valorReembolso
    await user.save()
    
    console.log(`[SUCESSO] Saldo estornado. De: ${saldoAntigo} Para: ${user.balance}`)

    // Atualiza viagem
    trip.status = 'canceled'
    await trip.save()

    res.status(200).json({ 
        sucesso: true, 
        message: 'Viagem cancelada e valor estornado.',
        novoSaldo: user.balance 
    })

  } catch (error) {
    console.error("Erro no cancelamento do cliente:", error)
    res.status(500).json({ erro: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})