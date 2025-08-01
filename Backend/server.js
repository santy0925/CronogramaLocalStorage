const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // tu contraseña si tienes una
  database: 'gestor_equipos'
});

// Obtener todos los equipos
app.get('/equipos', (req, res) => {
  db.query('SELECT * FROM equipos', (err, equipos) => {
    if (err) return res.status(500).json(err);
    db.query('SELECT * FROM integrantes', (err, integrantes) => {
      if (err) return res.status(500).json(err);
      res.json({ equipos, integrantes });
    });
  });
});

// Agregar equipo
app.post('/equipos', (req, res) => {
  const { nombre, personas, dias, oficina, fecha, integrantes } = req.body;
  const diasJSON = JSON.stringify(dias);
  db.query('INSERT INTO equipos (nombre, personas, dias, oficina, fecha) VALUES (?, ?, ?, ?, ?)',
    [nombre, personas, diasJSON, oficina, fecha],
    (err, result) => {
      if (err) return res.status(500).json(err);
      const equipoId = result.insertId;
      if (integrantes && integrantes.length > 0) {
        const values = integrantes.map(nombre => [nombre, equipoId]);
        db.query('INSERT INTO integrantes (nombre, equipo_id) VALUES ?', [values], (err2) => {
          if (err2) return res.status(500).json(err2);
          res.sendStatus(200);
        });
      } else {
        res.sendStatus(200);
      }
    });
});

// Editar equipo
app.put('/equipos/:id', (req, res) => {
  const { nombre, personas, dias, oficina, fecha, integrantes } = req.body;
  const id = req.params.id;
  const diasJSON = JSON.stringify(dias);
  db.query('UPDATE equipos SET nombre=?, personas=?, dias=?, oficina=?, fecha=? WHERE id=?',
    [nombre, personas, diasJSON, oficina, fecha, id],
    (err) => {
      if (err) return res.status(500).json(err);
      db.query('DELETE FROM integrantes WHERE equipo_id=?', [id], (err2) => {
        if (err2) return res.status(500).json(err2);
        if (integrantes && integrantes.length > 0) {
          const values = integrantes.map(nombre => [nombre, id]);
          db.query('INSERT INTO integrantes (nombre, equipo_id) VALUES ?', [values], (err3) => {
            if (err3) return res.status(500).json(err3);
            res.sendStatus(200);
          });
        } else {
          res.sendStatus(200);
        }
      });
    });
});

// Eliminar equipo
app.delete('/equipos/:id', (req, res) => {
  db.query('DELETE FROM equipos WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.sendStatus(200);
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
