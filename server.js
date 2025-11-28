// server.js
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

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

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000')
})
