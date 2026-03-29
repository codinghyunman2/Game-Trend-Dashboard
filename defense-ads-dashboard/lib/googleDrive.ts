import { google } from 'googleapis'
import { Readable } from 'stream'

function getCredentials(): object {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set')
  try {
    return JSON.parse(raw)
  } catch {
    // Try base64-encoded
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
}

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

/** Find or create a subfolder inside a parent folder */
async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string
): Promise<string> {
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  if (res.data.files?.length) {
    return res.data.files[0].id!
  }
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  })
  return created.data.id!
}

export interface UploadedFile {
  fileName: string
  viewUrl: string
  fileId: string
}

/**
 * Upload card news PNG images to Google Drive.
 * Creates a date-named subfolder inside GOOGLE_DRIVE_FOLDER_ID.
 *
 * @param images  Array of { buffer, fileName }
 * @param date    Date string used as subfolder name (e.g. "2026-03-29")
 */
export async function uploadCardNewsImages(
  images: { buffer: Buffer; fileName: string }[],
  date: string
): Promise<UploadedFile[]> {
  const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!parentFolderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set')

  const drive = getDriveClient()
  const folderName = `카드뉴스_${date}`
  const folderId = await getOrCreateFolder(drive, folderName, parentFolderId)

  const results = await Promise.all(
    images.map(async ({ buffer, fileName }) => {
      const file = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
          mimeType: 'image/png',
        },
        media: {
          mimeType: 'image/png',
          body: Readable.from(buffer),
        },
        fields: 'id,webViewLink',
        supportsAllDrives: true,
      })

      const fileId = file.data.id!

      // Make publicly viewable (anyone with the link)
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true,
      })

      return {
        fileName,
        fileId,
        viewUrl: file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      }
    })
  )

  return results
}
