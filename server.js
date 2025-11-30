import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

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
    
  } catch (error) {
    res.status(400).json({ message: 'Token inválido!' })
  }
}

try {
  await connectDB()
} catch (error) {
  console.error('Error connecting to MongoDB:', error)
}

app.get('/users', async (req, res) => {
  try {
    const trips = await User.find({})
    res.status(200).json(trips)
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar viagens: " + error.message })
  }
})

app.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body
    
    if (await User.findOne({ email })) {
        return res.status(400).json({ error: 'Email já cadastrado' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      balance: 50
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
    res.status(500).json({ error: 'Error registering user: ' + error.message })
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

app.post('/rota', checkToken, async (req, res) => {
  try {
    const { origem, destino, distanciaValue, duracaoValue } = req.body

    const km = distanciaValue / 1000
    
    const valorCalculado = parseFloat((km * 2.0).toFixed(2))

    const duracaoMinutos = Math.round(duracaoValue / 60)

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
    res.status(500).json({ error: "Erro ao calcular rota: " + error.message })
  }
})

app.get('/rotas', checkToken, async (req, res) => {
  try {
     const rotas = await Route.find({})
     res.status(200).json(rotas)
  } catch (error) {
     res.status(500).json({ error: error.message })
  }
})

app.get('/viagens', async (req, res) => {
  try {
    const query = req.query
    let trips;

    if (query.status) {
      trips = await Trip.find({status: query.status})
      .populate('user')
      .populate('route')
      .sort({ date: -1 })
    } else {
      trips = await Trip.find({}).populate('user').populate('route').sort({ date: -1 })
    }
    res.status(200).json(trips)
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar viagens: " + error.message })
  }
})

app.post('/viagens', checkToken, async (req, res) => {
  try {
    const { routeId } = req.body

    if(!routeId) {
        return res.status(400).json({ erro: "Usuário e Rota são obrigatórios" })
    }

    const userId = req.userId

    const route = await Route.findById(routeId)
    if(!route) return res.status(404).json({ erro: "Rota não encontrada" })

    const user = await User.findById(userId)
    if(user.balance < route.price) {
        return res.status(402).json({ erro: "Saldo insuficiente" })
    }

    const newTrip = await Trip.create({
        user: userId,
        route: routeId,
        price: route.price,
        status: 'pending'
    })

    user.trips.push(newTrip._id)
    
    user.balance -= route.price 
    
    await user.save()

    res.status(201).json({
      sucesso: true,
      mensagem: "Viagem confirmada com sucesso!",
      trip: newTrip
    })

  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
})

app.post('/logout', checkToken, async (req, res) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    await Blacklist.create({ token })

    res.status(200).json({ message: "Deslogado com sucesso" })
})

app.get('/viagens/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const trip = await Trip.findById(id).populate('route')
    
    if (!trip) {
      return res.status(404).json({ erro: 'Viagem não encontrada' })
    }

    res.status(200).json(trip)
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
})

app.patch('/viagens/:id', async (req, res) => {
  try {
  
    const id = req.params.id;

    const { status } = req.body;

    const trip_updated = await Trip.updateOne({_id: id}, {$set: {status}})

    if (trip_updated.modifiedCount > 0) {
        res.json({trip_updated});
    } else {
        res.status(404).json({Erro:'Viagem não encontrada!'})
    }

  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar viagens: " + error.message })
  }
})

app.get('/profile', checkToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    
    if (!user) {
      return res.status(404).json({ erro: 'Usuário não encontrado' })
    }

    res.json(user)
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
})




// app.patch('/viagens/:id/aceitar', async (req, res) => {
//   try {
//     const { id } = req.params
//     const { driverName, driverCar } = req.body

//     const trip = await Trip.findByIdAndUpdate(
//       id,
//       { 
//         status: 'active',
//       },
//       { new: true }
//     )

//     if (!trip) return res.status(404).json({ erro: 'Viagem não encontrada' })

//     res.status(200).json({ sucesso: true, trip })
//   } catch (error) {
//     res.status(500).json({ erro: error.message })
//   }
// })

// app.patch('/viagens/:id/cancelar', checkToken, async (req, res) => {
//   try {
//     const { id } = req.params
//     const userId = req.userId

//     const trip = await Trip.findOne({ _id: id, user: userId })

//     if (!trip) {
//       return res.status(404).json({ erro: 'Viagem não encontrada.' })
//     }

//     if (trip.status === 'completed' || trip.status === 'active') {
//         return res.status(400).json({ erro: 'Não é possível cancelar uma viagem em andamento.' })
//     }

//     trip.status = 'canceled'
//     await trip.save()

//     res.status(200).json({ sucesso: true, message: 'Viagem cancelada.' })
//   } catch (error) {
//     res.status(500).json({ erro: error.message })
//   }
// })

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})