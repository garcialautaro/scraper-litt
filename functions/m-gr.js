//!--------------------------- SCRAPER MUJERES GALPON DE ROPA ---------------------------

const { google } = require('googleapis');
const { Builder, By } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');

async function scrapeAndWriteToGoogleSheet(numeroMaximoOprimidos = 5) {

  let marcas;
  let categorias;


  try {
    marcas = require('../marcas.js');
    categorias = require('../categorias.js');
    
  } catch (error) {
    console.error('Error al leer los archivos JSON:', error);
    return;
  }

  let browser;
  try {
    // Configurar el navegador Chromium
    const options = new Options().headless();

    browser = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    const page = await browser;
    // Configurar credenciales de autenticación de Google Sheets
    const creds = require('../scraper-394114-3a481838b02c.js');
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });


    // ID del archivo de Google Sheets que deseas modificar
    const spreadsheetId = '1gR31cn7JY5GGrrD9LpdJvVOI3B1btYjm5MjN0HqXnOk';

    // Navega a una página web
    await page.get('https://www.galponderopa.com/mujer');

    // Función asíncrona recursiva para esperar hasta que se cumpla la condición
    let numeroOprimidos = 1;

    // Define la función para esperar un tiempo dado en milisegundos
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitForCondition() {
      try {
        const spanElement = await page.findElement(By.className('vtex-search-result-3-x-showingProductsCount b'));
        const text = await spanElement.getText();
        const [current, total] = text.split(' de ');
        if (current !== total) {
          if (numeroOprimidos > numeroMaximoOprimidos) {
            console.error('----------------Dejo de oprimir el botón----------------');
            return;
          }
          const button = await page.findElement(By.className('vtex-button bw1 ba fw5 v-mid relative pa0 lh-solid br2 min-h-small t-action--small bg-action-primary b--action-primary c-on-action-primary hover-bg-action-primary hover-b--action-primary hover-c-on-action-primary pointer'));
          await button.click();
          console.log("----------------Oprimo botón por " + numeroOprimidos + " vez----------------");
          numeroOprimidos += 1;

          // Esperar 3 segundos después de cada clic utilizando la función sleep
          await sleep(3000);

          // Llamada recursiva para verificar nuevamente la condición
          await waitForCondition();
        }
      } catch (error) {
        // Si ocurre una excepción, simplemente sal del ciclo y continúa con el resto del proceso
        console.error('----------------Dejo de oprimir el botón----------------');
        return;
      }
    }

    // Esperar hasta que se cumpla la condición
    await waitForCondition();

    // Encuentra los elementos por su clase
    const superElements = await page.findElements(By.className('vtex-product-summary-2-x-clearLink vtex-product-summary-2-x-clearLink--product-summary h-100 flex flex-column'));

    // Objeto para agrupar los datos por categoría
    const dataByCategory = {};

    for (const element of superElements) {
      try {
        const nameElement = await element.findElement(By.className('vtex-product-summary-2-x-productBrand vtex-product-summary-2-x-brandName t-body'));
        let name = await nameElement.getText();
        name = name.toUpperCase();

        let categoryBase = 'SIN';
        for (const marca of marcas) {
          if (name.includes(marca)) {
            categoryBase = 'CON';
            break;
          }
        }

        let category = 'SIN-CATEGORIA';
        for (const [key, value] of Object.entries(categorias)) {
          if (name.includes(key)) {
            category = `${value}-${categoryBase}`;
            break;
          }
        }

        // Obtener el precio del elemento
        let priceText = '';
        let priceNumber = 0;

        try {
          const priceContainerElement = await element.findElement(By.className('vtex-product-price-1-x-currencyContainer'));
          const priceElements = await priceContainerElement.findElements(By.tagName('span'));
          for (const priceElement of priceElements) {
            priceText += await priceElement.getText();
          }

          // Modificar el elemento priceText para que sea un número
          priceText = priceText.replace(/\$/g, '').replace(/\./g, '').replace(/,00$/g, '');
          priceNumber = parseFloat(priceText);
        } catch {
          priceNumber = 0;
        }

        // Obtener el enlace del elemento
        const link = await element.getAttribute('href');

        // Agrupar los datos por categoría
        if (!dataByCategory[category]) {
          dataByCategory[category] = [];
        }
        dataByCategory[category].push([name, priceNumber, link]);
      } catch {
        continue;
      }
    }

    // Configurar el cliente de la API de Google Sheets
    const sheets = google.sheets({ version: 'v4', auth });

    // Borrar todos los datos en las hojas de Google Sheets antes de cargar los nuevos datos
    for (const category in dataByCategory) {
      try {
        await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${category}!A:A`,
        });
      } catch (error) {
        // Si ocurre un error, la hoja no existe y se crea
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

      // Borrar los datos existentes en la hoja
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${category}!A:D`,
      });
    }

    // Escribir los datos en las hojas de Google Sheets por categoría
    for (const category in dataByCategory) {
      const dataToWrite = dataByCategory[category];

      if (dataToWrite.length > 0) {
        // Obtener la última fila ocupada en la hoja de Google Sheets
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${category}!A:A`,
        });
        const lastRow = response.data.values ? response.data.values.length + 1 : 1;

        // Definir el rango donde se escribirán los datos
        const range = `${category}!A${lastRow}`;

        // Datos que deseas escribir en las celdas
        const resource = {
          values: dataToWrite,
        };

        // Actualizar los datos en el archivo de Google Sheets mediante una sola petición
        const writeResponse = await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          resource,
        });
        console.log('Datos actualizados:', writeResponse.data);
      } else {
        console.log(`No se encontraron datos para escribir en la hoja de Google Sheets (${category}).`);
      }
    }
    return true;
  } catch (error) {
    console.error('Ocurrió un error en la función principal:', error);
    return false;
  } finally {
    if (browser) {
      await browser.quit();
    }
  }
}

// Ejecuta la función principal
// scrapeAndWriteToGoogleSheet();

module.exports = scrapeAndWriteToGoogleSheet;