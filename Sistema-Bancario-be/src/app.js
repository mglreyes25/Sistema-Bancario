require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// Rutas
app.use('/api/cuentas',       require('./routes/cuentas'));
app.use('/api/transacciones', require('./routes/transacciones'));
app.use('/api/estado',        require('./routes/estado'));

// Health check
app.get('/', (req, res) => res.json({ ok: true, msg: 'Banco API corriendo' }));

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

// 3001 por defecto para no chocar con Next.js (suele usar 3000)
const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`🏦 Servidor en http://localhost:${PORT}`));
