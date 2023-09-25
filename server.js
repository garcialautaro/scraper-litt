const express = require('express');
const path = require('path');
const scraperFunctionHgr = require('./functions/h-gr');
const scraperFunctionMgr = require('./functions/m-gr');
const scraperFunctionHlu = require('./functions/h-lu');
const scraperFunctionMlu = require('./functions/m-lu');
const scraperFunctionHml = require('./functions/h-ml');
const scraperFunctionMml = require('./functions/m-ml');

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});


app.get('/h-gr', async (req, res) => {
    try {
        const number = req.query.number ? req.query.number : 5;
        const success = await scraperFunctionHgr(number);  
        if (success) {
            res.status(200).send('Scraper ejecutado con éxito');
        }
        else {
            res.status(500).send('Error al ejecutar el scraper');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al ejecutar el scraper');
    }
});

app.get('/m-gr', async (req, res) => {
    try {
        const number = req.query.number ? req.query.number : 5;
        const success = await scraperFunctionMgr(number);  
        if (success) {
            res.status(200).send('Scraper ejecutado con éxito');
        }
        else {
            res.status(500).send('Error al ejecutar el scraper');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al ejecutar el scraper');
    }
});

app.get('/h-lu', async (req, res) => {
    try {
        const number = req.query.number ? req.query.number : 5;
        const success = await scraperFunctionHlu(number);  
        if (success) {
            res.status(200).send('Scraper ejecutado con éxito');
        }
        else {
            res.status(500).send('Error al ejecutar el scraper');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al ejecutar el scraper');
    }
});

app.get('/m-lu', async (req, res) => {
    try {
        const number = req.query.number ? req.query.number : 5;
        const success = await scraperFunctionMlu(number);  
        if (success) {
            res.status(200).send('Scraper ejecutado con éxito');
        }
        else {
            res.status(500).send('Error al ejecutar el scraper');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al ejecutar el scraper');
    }
});

app.get('/h-ml', async (req, res) => {
    try {
        const number = req.query.number ? req.query.number : 5;
        const success = await scraperFunctionHml(number);  
        if (success) {
            res.status(200).send('Scraper ejecutado con éxito');
        }
        else {
            res.status(500).send('Error al ejecutar el scraper');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al ejecutar el scraper');
    }
});

app.get('/m-ml', async (req, res) => {
    try {
        const number = req.query.number ? req.query.number : 5;
        const success = await scraperFunctionMml(number);  
        if (success) {
            res.status(200).send('Scraper ejecutado con éxito');
        }
        else {
            res.status(500).send('Error al ejecutar el scraper');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al ejecutar el scraper');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
