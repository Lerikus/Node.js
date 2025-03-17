import http from 'http'
import { promises as fs } from 'fs'

const PORT = 3000
const COUNTER = 'counter.txt'

// citanie hodnoty zo suboru
async function readCounter() {
  try {
    const data = await fs.readFile(COUNTER, 'utf-8')
    return parseInt(data.trim(), 10)
  } catch (error) {
    if (error.code === 'ENOENT') {
      // subor neexistuje, vytvorime ho a nastavime na 0
      await fs.writeFile(COUNTER, '0')
      return 0
    }
    throw error
  }
}

// zapis hodnoty do souboru
async function writeCounter(value) {
  await fs.writeFile(COUNTER, value.toString())
  return value
}

// modifikace hodnoty podle operace
async function modifyCounter(operation) {
  const currentValue = await readCounter()
  let newValue
  
  if (operation === 'increase') {
    newValue = currentValue + 1
  } else if (operation === 'decrease') {
    newValue = currentValue - 1
  } else {
    return currentValue
  }
  
  if (operation !== 'read') {
    await writeCounter(newValue)
  }
  
  return operation !== 'read' ? newValue : currentValue
}

// server
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const path = url.pathname
    
    res.setHeader('Content-Type', 'text/plain')
    
    if (path === '/increase') {
      await modifyCounter('increase')
      res.statusCode = 200
      res.write('Counter increased')
      res.end()
    } else if (path === '/decrease') {
      await modifyCounter('decrease')
      res.statusCode = 200
      res.write('Counter decreased')
      res.end()
    } else if (path === '/read') {
      const value = await modifyCounter('read')
      res.statusCode = 200
      res.write(value.toString())
      res.end()
    } else {
      // ine requesty
      res.statusCode = 404
      res.write('Not Found')
      res.end()
    }
  } catch (error) {
    console.error('Server error:', error)
    res.statusCode = 500
    res.write('Internal Server Error')
    res.end()
  }
});

// pustenie servera
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}/`)
});