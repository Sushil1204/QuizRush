import { mkdir, copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = resolve(here, '../bank/question-bank.json')
const destination = resolve(here, '../dist/bank/question-bank.json')

await mkdir(dirname(destination), { recursive: true })
await copyFile(source, destination)
