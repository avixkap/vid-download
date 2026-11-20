// E2E driver for the Tauri app over CDP (needs a build made with tauri.e2e.conf.json).
// Usage: node scripts/cdp-drive.cjs <url> [quality]   (CDP_PORT env overrides the default 9223)
const http = require('http')

const TEST_URL = process.argv[2]
const QUALITY = process.argv[3] || '360'
const PORT = process.env.CDP_PORT || '9223'
if (!TEST_URL) {
  console.error('usage: node scripts/cdp-drive.cjs <url> [quality]')
  process.exit(2)
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => resolve(JSON.parse(d)))
      })
      .on('error', reject)
  })
}

const DRIVER_JS = `(async () => {
  const log = []
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const btns = () => [...document.querySelectorAll('button')]
  const historyCount = () => {
    const h = btns().find((b) => /^History/.test(b.textContent.trim()))
    return h ? h.textContent.replace(/\\s+/g, ' ').trim() : 'NO HISTORY HEADER'
  }
  const queueRow = () => {
    const sec = [...document.querySelectorAll('section')].find((s) => /^Queue/.test(s.querySelector('h2')?.textContent.trim() || ''))
    if (!sec) return 'NO QUEUE SECTION'
    const card = sec.querySelector('.card')
    return card ? card.innerText.replace(/\\s*\\n\\s*/g, ' | ').slice(0, 160) : 'EMPTY'
  }
  const toast = () => {
    const t = [...document.querySelectorAll('p')].find((p) => /Download (complete|failed)/.test(p.textContent))
    return t ? t.textContent : '-'
  }

  log.push('START history=' + historyCount())

  const ta = document.querySelector('textarea')
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
  setter.call(ta, ${JSON.stringify(TEST_URL)})
  ta.dispatchEvent(new Event('input', { bubbles: true }))
  await sleep(300)
  btns().find((b) => b.textContent.trim() === 'Analyze').click()
  log.push('clicked Analyze')

  let dl
  for (let i = 0; i < 60 && !dl; i++) {
    await sleep(1000)
    dl = btns().find((b) => b.textContent.trim() === 'Download')
  }
  if (!dl) return log.concat('NO DOWNLOAD BUTTON: ' + document.body.innerText.slice(0, 400)).join('\\n')

  const card = dl.closest('.card')
  const q = [...card.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === ${JSON.stringify(QUALITY)}))
  if (q) {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(q, ${JSON.stringify(QUALITY)})
    q.dispatchEvent(new Event('change', { bubbles: true }))
    await sleep(200)
  }
  log.push('analyze card: ' + card.querySelector('h3').textContent + ' | quality=' + (q ? q.value : 'n/a'))

  dl.click()
  log.push('clicked Download')

  let doneAt = null
  for (let i = 1; i <= 240; i++) {
    await sleep(1000)
    log.push('t=' + String(i).padStart(3) + 's  button=[' + dl.textContent.trim() + ']  queue=[' + queueRow() + ']  ' + historyCount() + '  toast=' + toast())
    if (doneAt === null && /Done|Failed/.test(dl.textContent)) doneAt = i
    if (doneAt !== null && i - doneAt >= 2) break
  }
  return log.join('\\n')
})()`

async function main() {
  const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`)
  const page = targets.find((t) => t.type === 'page')
  if (!page) throw new Error('no page target')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const consoleErrors = []
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id
      pending.set(mid, { resolve, reject })
      ws.send(JSON.stringify({ id: mid, method, params }))
    })
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '))
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push('EXCEPTION ' + msg.params.exceptionDetails.text)
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    }
  }
  await new Promise((r) => (ws.onopen = r))
  await send('Runtime.enable')

  const res = await send('Runtime.evaluate', { expression: DRIVER_JS, awaitPromise: true, returnByValue: true })
  console.log(res.result.value ?? JSON.stringify(res))
  console.log('\nconsole errors: ' + (consoleErrors.length ? '\n  ' + consoleErrors.join('\n  ') : 'none'))
  ws.close()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
