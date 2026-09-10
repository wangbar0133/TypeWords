#!/usr/bin/env node
/**
 * 为静态部署生成 i18n 语言包文件。
 *
 * 背景：
 *   @nuxtjs/i18n 的 full-static 模式下，客户端会请求
 *     /_i18n/<deploymentHash>/<locale>/messages.json
 *   该路径平时由 Nitro 服务端路由提供。而 `nuxt generate` 不会预渲染它，
 *   于是静态托管（nginx / OSS / EdgeOne）下必然 404，
 *   界面就会退化成显示 i18n key 而不是文案。
 *
 * 做法：
 *   在 generate 之后运行本脚本，从产出的 JS 里解析出本次构建的 deploymentHash，
 *   再按服务端路由的返回结构 { [locale]: messages } 写出静态 JSON 文件。
 *   deploymentHash 由模块内部用 hash(Date.now()) 生成，无法在 nuxt.config 里预设，
 *   因此只能在构建后回填。
 *
 * 用法：node scripts/gen-i18n-messages.mjs   （由 scripts/build-static.sh 自动调用）
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const publicDir = join(root, '.output/public')
const nuxtDir = join(publicDir, '_nuxt')
const localesDir = join(root, 'i18n/locales')

async function resolveDeploymentHash() {
  const files = (await readdir(nuxtDir)).filter(f => f.endsWith('.js'))
  for (const file of files) {
    const src = await readFile(join(nuxtDir, file), 'utf8')
    const matched = src.match(/\/_i18n\/([A-Za-z0-9_-]{8})\//)
    if (matched) return matched[1]
  }
  return null
}

const hash = await resolveDeploymentHash()
if (!hash) {
  console.error('✖ 未能从 .output/public/_nuxt 中解析出 i18n deploymentHash')
  console.error('  静态托管的语言包无法生成，界面会退化为显示 i18n key。')
  process.exit(1)
}

const localeFiles = (await readdir(localesDir)).filter(f => f.endsWith('.json'))
if (!localeFiles.length) {
  console.error(`✖ ${localesDir} 下没有语言包文件`)
  process.exit(1)
}

for (const file of localeFiles) {
  const code = file.replace(/\.json$/, '')
  const messages = JSON.parse(await readFile(join(localesDir, file), 'utf8'))
  const dir = join(publicDir, '_i18n', hash, code)
  await mkdir(dir, { recursive: true })
  // 结构与 @nuxtjs/i18n 服务端路由一致：{ [locale]: messages }
  await writeFile(join(dir, 'messages.json'), JSON.stringify({ [code]: messages }))
}

console.log(`✔ 已生成 ${localeFiles.length} 个静态语言包 → /_i18n/${hash}/<locale>/messages.json`)
