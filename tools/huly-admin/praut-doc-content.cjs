// Sdílený helper pro ukládání obsahu dokumentů (document:class:Document).
//
// Pole `content` dokumentu NESMÍ obsahovat HTML — musí to být MarkupBlobRef
// (ID blobu s kolaborativním obsahem v úložišti). Když se tam uloží HTML,
// collaborator hodí InvalidObjectNameError a dokument se v UI donekonečna načítá.
//
// Správný postup (vzor: HulyPrautplatform/packages/importer/src/importer/frontUploader.ts):
//   1. HTML → markup JSON (htmlToJSON + jsonToMarkup)
//   2. blobId = makeCollabJsonId(makeCollabId(class, docId, 'content'))
//   3. upload blobu přes front POST /files (Bearer workspace token)
//   4. do dokumentu uložit content: blobId
//
// Použití (docId vygeneruj předem, createDoc pak zavolej s explicitním ID):
//   const { uploadDocContent } = require('/path/to/praut-doc-content.cjs')
//   const docId = coreMod.generateId()
//   const blobId = await uploadDocContent(selected.token, docId, HTML)
//   await client.createDoc('document:class:Document', spaceId, { ..., content: blobId }, docId)
const { htmlToJSON, jsonToMarkup } = require('@hcengineering/text')
const { makeCollabId, makeCollabJsonId } = require('@hcengineering/core')

const FRONT_URL = 'https://huly.praut.cz'

async function uploadDocContent (workspaceToken, docId, html, frontUrl = FRONT_URL) {
  // Minifikace: bílé znaky mezi tagy by se v konverzi staly prázdnými
  // odstavci / položkami seznamu (artefakty v UI).
  const minified = html.replace(/>\s+</g, '><').trim()
  const markup = jsonToMarkup(htmlToJSON(minified))
  return await uploadMarkupBlob(workspaceToken, docId, markup, frontUrl)
}

// Varianta pro zdrojový Markdown (.md soubory): markdownToMarkup zachová nadpisy,
// seznamy, tabulky a kód líp než cesta přes HTML. Vrací blob ref pro `content`.
async function uploadMarkdownContent (workspaceToken, docId, markdown, frontUrl = FRONT_URL) {
  const { markdownToMarkup } = require('@hcengineering/text-markdown')
  const markup = jsonToMarkup(markdownToMarkup(markdown))
  return await uploadMarkupBlob(workspaceToken, docId, markup, frontUrl)
}

// Nahraje hotový Huly markup (JSON string) jako kolaborativní blob a vrátí jeho ref.
async function uploadMarkupBlob (workspaceToken, docId, markup, frontUrl = FRONT_URL) {
  const collabId = makeCollabId('document:class:Document', docId, 'content')
  const blobId = makeCollabJsonId(collabId)

  const form = new FormData()
  form.append('file', new Blob([Buffer.from(markup)], { type: 'application/json' }), blobId)

  const res = await fetch(new URL('/files', frontUrl).toString(), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + workspaceToken },
    body: form
  })
  if (res.status !== 200) throw new Error(`upload obsahu selhal: HTTP ${res.status} ${res.statusText}`)

  const result = JSON.parse(await res.text())
  const first = Array.isArray(result) ? result[0] : undefined
  if (first == null || first.error != null) throw new Error(`upload obsahu selhal: ${first != null ? first.error : 'prázdná odpověď'}`)
  return first.id != null ? first.id : blobId
}

// Heuristika: je hodnota `content` rozbitá (HTML místo blob ref)?
function isBrokenContent (content) {
  if (typeof content !== 'string' || content === '') return false
  return content.includes('<') || content.includes('\n') || content.length > 120
}

module.exports = { uploadDocContent, uploadMarkdownContent, isBrokenContent, FRONT_URL }
