import express from 'express'
import puppeteer from 'puppeteer'
import genericPool from 'generic-pool'

const app = express()
app.use(express.static('public'))
const server = app.listen(3000, () => console.log('Server running on port 3000'))

const browser = await puppeteer.launch()

const pagePool = genericPool.createPool({
  create: async () => await browser.newPage(),
  destroy: async (p) => { await p.close() }
}, { max: 5 })

async function generatePDF (page) {
  // URL of the express server serving the HTML
  const resp = await page.goto("http://localhost:3000/")

  console.log('Generating PDF')
  const pdf = await page.pdf()
  console.log('PDF generated')
}

async function run () {
  const page = await pagePool.acquire()
  try {
    await generatePDF(page)
  } finally {
    // Release the page back to the pool leads to `document.fonts.ready` blocking
    await pagePool.release(page)
    // Destroying the page is a workaround
    // await pagePool.destroy(page)
  }
}

await Promise.all(Array(5).fill().map(() => run()))

await pagePool.drain()
await pagePool.clear()
await browser.close()
await server.close()
