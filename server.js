require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = 10000;
const axios = require('axios');
const API_KEY = process.env.API_KEY;
const cors = require('cors');
app.use(cors());
app.use(express.json());


mongoose.connect('mongodb+srv://albaruizgutierrez:alba123@clusterexamen.qjmuh.mongodb.net/EventualDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Conectado a MongoDB'))
    .catch((err) => console.error('Error al conectar a MongoDB', err));

const eventoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    timestamp: { type: Date, required: true },
    lugar: { type: String, required: true },
    lat: { type: Number, required: false },
    lon: { type: Number, required: false },
    organizador: { type: String, required: true }, // Usamos un email
    imagen: { type: String, required: false } // URI de la imagen
});

// Crear el modelo para el evento
const Evento = mongoose.model('Evento', eventoSchema);

const uploadRoutes = require("./routes/uploads");
app.use("/api/uploads", uploadRoutes);


app.get('/eventos', async (req, res) => {
    try {
        const eventos = await Evento.find();
        res.json(eventos);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener los eventos' });
    }
});

app.post('/eventos', async (req, res) => {
    console.log('Datos recibidos:', req.body);
    const { nombre, timestamp, lugar, organizador, imagen } = req.body;

    try {
        // Llamar a Geocode Maps para convertir la dirección en coordenadas
        const respuesta = await axios.get('https://geocode.maps.co/search', {
            params: {
                q: lugar, // Dirección del evento
                api_key: API_KEY
            }
        });

        if (respuesta.data.length === 0) {
            return res.status(400).json({ error: 'Dirección no válida' });
        }

        // Extraer latitud y longitud del primer resultado
        const lat = parseFloat(respuesta.data[0].lat);
        const lon = parseFloat(respuesta.data[0].lon);

        // Crear el evento con las coordenadas obtenidas
        const evento = new Evento({
            nombre,
            timestamp,
            lugar,
            lat,
            lon,
            organizador,
            imagen: imagen || '' // Asignar una cadena vacía si no se proporciona imagen
        });

        // Guardar el evento en la base de datos
        const resultado = await evento.save();
        res.json(resultado);
    } catch (error) {
        console.error('Error al obtener las coordenadas o crear el evento:', error);
        res.status(500).json({ error: 'Error al crear el evento' });
    }
});

app.get('/eventos/:id', async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (evento) {
            res.json(evento);
        } else {
            res.status(404).json({ error: 'Evento no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener el evento' });
    }
});

app.put('/eventos/:id', async (req, res) => {
    const { nombre, timestamp, lugar, organizador, imagen } = req.body;

    try {
        // Llamar a Geocode Maps para obtener nuevas coordenadas
        const respuesta = await axios.get('https://geocode.maps.co/search', {
            params: {
                q: lugar, // Dirección del evento
                api_key: API_KEY
            }
        });

        if (respuesta.data.length === 0) {
            return res.status(400).json({ error: 'Dirección no válida' });
        }

        const lat = parseFloat(respuesta.data[0].lat);
        const lon = parseFloat(respuesta.data[0].lon);

        // Actualizar el evento con los nuevos datos y coordenadas
        const evento = await Evento.findByIdAndUpdate(req.params.id, {
            nombre,
            timestamp,
            lugar,
            lat,
            lon,
            organizador,
            imagen
        }, { new: true });

        if (evento) {
            res.json(evento);
        } else {
            res.status(404).json({ error: 'Evento no encontrado' });
        }
    } catch (err) {
        console.error('Error al modificar el evento:', err);
        res.status(500).json({ error: 'Error al modificar el evento' });
    }
});

app.delete('/eventos/:id', async (req, res) => {
    try {
        const evento = await Evento.findByIdAndDelete(req.params.id);
        if (evento) {
            res.json(evento);
        } else {
            res.status(404).json({ error: 'Evento no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar el evento' });
    }
});

app.get('/cercanos', async (req, res) => {
    try {
        const direccion = req.query.direccion;
        console.log(`Buscando eventos cerca de la dirección: ${direccion}`);
        const respuesta = await axios.get('https://geocode.maps.co/search', {
            params: {
                q: direccion,
                api_key: API_KEY
            }
        });
        if (!respuesta.data || respuesta.data.length === 0) {
            return res.status(400).json({ error: 'No se encontraron resultados para la dirección proporcionada' });
        }

        const lat = parseFloat(respuesta.data[0].lat);
        const lon = parseFloat(respuesta.data[0].lon);
        const eventos = await Evento.find({
            lat: { $gt: lat - 0.2, $lt: lat + 0.2 },
            lon: { $gt: lon - 0.2, $lt: lon + 0.2 }
        });
        console.log(`Eventos encontrados: ${eventos.length}`);
        res.json(eventos);
    } catch (err) {
        console.error('Error al obtener los eventos cercanos:', err.message, err.stack);
        res.status(500).json({ error: 'Error al obtener los eventos cercanos', details: err.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});