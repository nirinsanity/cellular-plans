const http = require('http')
const url = require('url')
const { handler } = require('./index')

const PORT = process.env.PORT || 8787

const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true)
    const hasQuery = Object.keys(parsed.query).length > 0
    const event = { queryStringParameters: hasQuery ? parsed.query : null }

    try {
        const result = await handler(event)
        res.writeHead(result.statusCode, result.headers)
        res.end(result.body)
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
    }
})

server.listen(PORT, () => {
    console.log(`Local API listening on http://localhost:${PORT}`)
})
