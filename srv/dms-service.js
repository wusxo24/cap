const cds = require('@sap/cds')
const crypto = require('crypto')

module.exports = cds.service.impl(async function () {
  const { Documents, Versions, Files, Logs } = this.entities

  const getUserId = (req) => req.user?.id || 'anonymous'

  const log = async (tx, { action, status, detail, docID, verID, userId }) => {
    await tx.run(INSERT.into(Logs).entries({
      action, status, detail,
      docID: docID || null,
      verID: verID || null,
      userId: userId || null
    }))
  }

  // USER sees only own docs; ADMIN/SUPER_ADMIN see all
  this.before('READ', Documents, (req) => {
    const isAdmin = req.user?.is?.('ADMIN') || req.user?.is?.('SUPER_ADMIN')
    if (!isAdmin) req.query.where({ ownerId: getUserId(req) })
  })

  // Auto-fill owner on create
  this.before('CREATE', Documents, (req) => {
    const userId = getUserId(req)
    req.data.ownerId = req.data.ownerId || userId
    req.data.lastActionBy = userId
    req.data.status = req.data.status || 'A'
  })

  // -------------------------
  // UploadVersion (2-step)
  // 1) Call action -> creates Version + File row
  // 2) Client uploads bytes to: PUT Files(<fileID>)/content
  // -------------------------
  this.on('UploadVersion', async (req) => {
    const tx = cds.tx(req)
    const userId = getUserId(req)
    const { docID, fileName, mimeType, md5, conflictMode } = req.data

    const doc = await tx.run(SELECT.one.from(Documents).where({ ID: docID }))
    if (!doc) req.reject(404, 'Document not found')

    const isAdmin = req.user?.is?.('ADMIN') || req.user?.is?.('SUPER_ADMIN')
    if (!isAdmin && doc.ownerId !== userId) req.reject(403, 'Not allowed')

    const activeVers = await tx.run(
      SELECT.from(Versions).where({ document_ID: docID, status: 'A' })
    )

    const dup = activeVers.find(v =>
      v.fileName === fileName &&
      v.mimeType === mimeType &&
      v.md5 === md5
    )

    const maxVer = activeVers.reduce((m, v) => Math.max(m, v.verNo || 0), 0)
    const nextVerNo = maxVer + 1

    let finalFileName = fileName

    if (dup) {
      if (conflictMode === 'RENAME') {
        finalFileName = appendRename(fileName)
      } else if (conflictMode === 'KEEP_BOTH') {
        // keep name, new version anyway
      } else if (conflictMode === 'OVERWRITE') {
        await tx.run(UPDATE(Versions).set({ status: 'D' }).where({ ID: dup.ID }))
        await log(tx, {
          action: 'OVERWRITE', status: 'S',
          detail: 'Old version soft-deleted due to overwrite',
          docID, verID: dup.ID, userId
        })
      } else {
        req.reject(400, 'Invalid conflictMode. Use RENAME | KEEP_BOTH | OVERWRITE')
      }
    }

    // Create a Files row (empty content for now). Client will PUT the content later.
    const fileID = cds.utils.uuid()
    await tx.run(INSERT.into(Files).entries({
      ID: fileID,
      mimeType,
      fileName: finalFileName,
      md5,
      sizeBytes: 0
    }))

    // Create the Version row linked to fileID
    const verID = cds.utils.uuid()
    await tx.run(INSERT.into(Versions).entries({
      ID: verID,
      document_ID: docID,
      verNo: nextVerNo,
      fileName: finalFileName,
      mimeType,
      md5,
      sizeBytes: 0,
      status: 'A',
      actionBy: userId,
      file_ID: fileID
    }))

    await tx.run(UPDATE(Documents).set({
      status: 'A',
      lastActionBy: userId
    }).where({ ID: docID }))

    await log(tx, {
      action: 'UPLOAD', status: 'S',
      detail: `Version created (upload bytes via Files(${fileID})/content)`,
      docID, verID, userId
    })

    return tx.run(SELECT.one.from(Versions).where({ ID: verID }))
  })

  this.on('DeleteVersion', async (req) => {
    const tx = cds.tx(req)
    const userId = getUserId(req)
    const isAdmin = req.user?.is?.('ADMIN') || req.user?.is?.('SUPER_ADMIN')
    if (!isAdmin) req.reject(403, 'Admin only')

    const { verID } = req.data
    const ver = await tx.run(SELECT.one.from(Versions).where({ ID: verID }))
    if (!ver) req.reject(404, 'Version not found')

    await tx.run(UPDATE(Versions).set({ status: 'D' }).where({ ID: verID }))

    // If no active versions remain -> document D
    const remain = await tx.run(
      SELECT.one.from(Versions).where({ document_ID: ver.document_ID, status: 'A' })
    )
    if (!remain) {
      await tx.run(UPDATE(Documents).set({ status: 'D', lastActionBy: userId })
        .where({ ID: ver.document_ID }))
    }

    await log(tx, { action: 'DELETE', status: 'S', detail: 'Version soft-deleted', docID: ver.document_ID, verID, userId })
    return true
  })

  this.on('RestoreVersion', async (req) => {
    const tx = cds.tx(req)
    const userId = getUserId(req)
    const isAdmin = req.user?.is?.('ADMIN') || req.user?.is?.('SUPER_ADMIN')
    if (!isAdmin) req.reject(403, 'Admin only')

    const { verID } = req.data
    const ver = await tx.run(SELECT.one.from(Versions).where({ ID: verID }))
    if (!ver) req.reject(404, 'Version not found')

    await tx.run(UPDATE(Versions).set({ status: 'A' }).where({ ID: verID }))
    await tx.run(UPDATE(Documents).set({ status: 'A', lastActionBy: userId })
      .where({ ID: ver.document_ID }))

    await log(tx, { action: 'RESTORE', status: 'S', detail: 'Version restored', docID: ver.document_ID, verID, userId })
    return true
  })

  this.on('DeleteDocument', async (req) => {
    const tx = cds.tx(req)
    const userId = getUserId(req)
    const isAdmin = req.user?.is?.('ADMIN') || req.user?.is?.('SUPER_ADMIN')
    if (!isAdmin) req.reject(403, 'Admin only')

    const { docID } = req.data
    const doc = await tx.run(SELECT.one.from(Documents).where({ ID: docID }))
    if (!doc) req.reject(404, 'Document not found')

    await tx.run(UPDATE(Documents).set({ status: 'D', lastActionBy: userId }).where({ ID: docID }))
    await tx.run(UPDATE(Versions).set({ status: 'D' }).where({ document_ID: docID }))

    await log(tx, { action: 'DELETE', status: 'S', detail: 'Document soft-deleted', docID, userId })
    return true
  })

  // When file bytes are uploaded/changed, compute size + md5 and sync to Versions
  this.after(['CREATE', 'UPDATE'], Files, async (data, req) => {
    const tx = cds.tx(req)
    const userId = getUserId(req)

    if (!data?.content) return

    const buf = Buffer.isBuffer(data.content) ? data.content : Buffer.from(data.content)
    const sizeBytes = buf.length
    const md5 = data.md5 || crypto.createHash('md5').update(buf).digest('hex')

    await tx.run(UPDATE(Files).set({ sizeBytes, md5 }).where({ ID: data.ID }))

    const ver = await tx.run(SELECT.one.from(Versions).where({ file_ID: data.ID }))
    if (ver) {
      await tx.run(UPDATE(Versions).set({ sizeBytes, md5 }).where({ ID: ver.ID }))
      await log(tx, {
        action: 'UPLOAD', status: 'S',
        detail: `Binary stored (${sizeBytes} bytes)`,
        docID: ver.document_ID, verID: ver.ID, userId
      })
    }
  })
})

function appendRename(fileName) {
  const idx = fileName.lastIndexOf('.')
  if (idx <= 0) return `${fileName} (1)`
  const base = fileName.slice(0, idx)
  const ext = fileName.slice(idx)
  return `${base} (1)${ext}`
}
