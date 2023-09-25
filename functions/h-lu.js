//!--------------------------- SCRAPER HOMBRES LE UTTHE ---------------------------

const { google } = require('googleapis');
const { Builder, By } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');

async function scrapeAndWriteToGoogleSheet(numeroPaginaMaximo = 5) {
  // Configurar el navegador Chromium
  const options = new Options().headless();

  const browser = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  let categorias;


  try {
    categorias = require('../categorias.js');


  } catch (error) {
    console.error('Error al leer los archivos JSON:', error);
    return;
  }

  try {
    const page = await browser;

    // Configurar credenciales de autenticación de Google Sheets
    const creds = require('../scraper-394114-3a481838b02c.js');
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });


    // ID del archivo de Google Sheets que deseas modificar
    const spreadsheetId = '1j4Ya73UlwckwBzxC69vcBg5nHQCvHDJK8Z4H9p0dIs0';

    // Navega a una página web
    await page.get('https://www.leutthe.com/new-now/Hombre/');

    // Función asíncrona recursiva para esperar hasta que se cumpla la condición
    let numeroPagina = 1;

    // Define la función para esperar un tiempo dado en milisegundos
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    let currentScrollPosition = 0;

    async function waitForCondition() {
      try {
        if (numeroPagina > numeroPaginaMaximo) {
          console.error('--------------Dejo de cargar páginas--------------');
          return;
        }

        console.log("----------------Cargo página " + numeroPagina + "----------------");
        numeroPagina += 1;

        let scrollHeight = await page.executeScript(`return document.body.scrollHeight;`);
        for (let i = currentScrollPosition; i < scrollHeight; i += 200) {
          await page.executeScript(`window.scrollTo(0, ${i});`);
          console.log("-------------------SCROLLING--------------------");
          await sleep(250);
          currentScrollPosition = i;
        }
        await sleep(3000);
        await waitForCondition();
      } catch (error) {
        console.error('Error durante el desplazamiento:', error);
        console.error('--------------Dejo de cargar páginas--------------');
        return;
      }
    }

    await waitForCondition();

    const superElements = await page.findElements(By.className('precios'));
    const dataByCategory = {};

    console.log("-------------Comienzo a categorizar-------------");

    for (const element of superElements) {
      let name = await element.getAttribute('title');
      name = name ? name.toUpperCase() : '';

      let category = 'SIN-CATEGORIA';

      for (const [key, value] of Object.entries(categorias)) {
        if (name.includes(key.toUpperCase())) {
          category = value;
          break;
        }
      }

      let priceText = '';
      let priceNumber = 0;

      try {
        priceText = await element.getText();
        priceText = priceText.replace(/\$/g, '').replace(/\./g, '').replace(/,00$/g, '');
        priceNumber = parseFloat(priceText);
      } catch (e) {
        console.error('Error al obtener el precio:', e);
        continue;
      }

      const link = await element.getAttribute('href');

      if (!dataByCategory[category]) {
        dataByCategory[category] = [];
      }
      dataByCategory[category].push([name, priceNumber, link]);
    }

    console.log("-------------Termino de categorizar-------------");

    await browser.quit();

    const sheets = google.sheets({ version: 'v4', auth });

    console.log("-------------Comienzo a escribir en Google Sheets-------------");

    for (const category in dataByCategory) {
      try {
        await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${category}!A:A`,
        });
      } catch (error) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: category,
                  },
                },
              },
            ],
          },
        });
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${category}!A:C`,
      });
    }

    for (const category in dataByCategory) {
      const dataToWrite = dataByCategory[category];

      if (dataToWrite.length > 0) {
        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${category}!A:A`,
          });
          const lastRow = response.data.values ? response.data.values.length + 1 : 1;

          const range = `${category}!A${lastRow}`;
          const resource = { values: dataToWrite };

          const writeResponse = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource,
          });
          console.log('Datos actualizados:', writeResponse.data);
        } catch (error) {
          console.error(`Error al escribir datos en la hoja ${category}:`, error);
        }
      } else {
        console.log(`No se encontraron datos para escribir en la hoja de Google Sheets (${category}).`);
      }
    }
    return true;
  } catch (error) {
    console.error('Ocurrió un error en la función principal:', error);
    return false;
  }
}

// Ejecuta la función principal
// scrapeAndWriteToGoogleSheet();

module.exports = scrapeAndWriteToGoogleSheet;