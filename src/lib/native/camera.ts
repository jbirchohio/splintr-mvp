export async function pickOrRecordVideo(): Promise<string | null> {
  try {
    // Try native camera plugin if available
    const cam = await import('@capacitor/camera')
    const { Camera, CameraResultType, CameraSource } = cam
    const result = await Camera.pickImages({}) // Camera plugin lacks direct video capture; fallback to file input
    console.warn('Camera video capture not available via plugin; falling back to file input')
  } catch {}
  return await webRecordVideo()
}

async function webRecordVideo(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    const rec = new MediaRecorder(stream)
    const chunks: BlobPart[] = []
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    const stopped = new Promise<void>(resolve => rec.onstop = () => resolve())
    rec.start()
    await new Promise(r => setTimeout(r, 5000)) // record 5s demo
    rec.stop()
    await stopped
    const blob = new Blob(chunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    return url
  } catch (e) {
    console.error('Video record failed', e)
    return null
  }
}

