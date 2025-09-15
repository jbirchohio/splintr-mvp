import cloudinary from '@/lib/cloudinary'
import { createServerClient } from '@/lib/supabase'

export type EffectParams = {
  effects?: {
    sepia?: number
    grayscale?: number
    vignette?: number
    brightness?: number
    contrast?: number
    blur?: number
    cartoonify?: boolean
  }
  textOverlay?: {
    text: string
    font?: string
    size?: number
    color?: string
    x?: number
    y?: number
  }
  stickerOverlays?: Array<{
    stickerCode: string
    width?: number
    height?: number
    x?: number
    y?: number
  }>
}

export class VideoTransformService {
  private async importSourceIfNeeded(originalPublicId?: string, sourceUrl?: string): Promise<string> {
    if (originalPublicId && originalPublicId.length > 0) return originalPublicId
    if (!sourceUrl) throw new Error('Missing source for transform')
    // Upload remote URL into Cloudinary to obtain a public_id we can derive from
    const upload = await cloudinary.uploader.upload(sourceUrl, {
      resource_type: 'video',
      folder: 'splintr/videos',
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    } as any)
    return upload.public_id
  }
  private buildTransformation(params: EffectParams, stickerPublicIds: Record<string,string>) {
    const t: any = {}
    const transforms: any[] = []

    if (params.effects) {
      const e = params.effects
      if (e.sepia) transforms.push({ effect: `sepia:${e.sepia}` })
      if (e.grayscale) transforms.push({ effect: 'grayscale' })
      if (e.vignette) transforms.push({ effect: `vignette:${e.vignette}` })
      if (e.brightness) transforms.push({ effect: `brightness:${e.brightness}` })
      if (e.contrast) transforms.push({ effect: `contrast:${e.contrast}` })
      if (e.blur) transforms.push({ effect: `blur:${e.blur}` })
      if (e.cartoonify) transforms.push({ effect: 'cartoonify' })
    }

    if (params.textOverlay?.text) {
      const o = params.textOverlay
      transforms.push({
        overlay: { font_family: o.font || 'Arial', font_size: o.size || 36, text: o.text },
        color: o.color || '#FFFFFF',
        gravity: 'north_west',
        x: o.x ?? 20,
        y: o.y ?? 20,
      })
    }

    for (const s of params.stickerOverlays || []) {
      const pid = stickerPublicIds[s.stickerCode]
      if (!pid) continue
      transforms.push({
        overlay: pid,
        width: s.width || 200,
        height: s.height || 200,
        gravity: 'north_west',
        x: s.x ?? 20,
        y: s.y ?? 20,
        flags: 'layer_apply',
      })
    }

    // Ensure we export video format
    transforms.push({ format: 'mp4' })
    return transforms
  }

  async applyToPublicId(originalPublicId: string, params: EffectParams): Promise<{ derivedPublicId: string; url: string }> {
    // Load stickers public ids
    const supabase = createServerClient()
    const stickersMap: Record<string, string> = {}
    const stickerCodes = (params.stickerOverlays || []).map(s => s.stickerCode)
    if (stickerCodes.length) {
      const { data } = await supabase
        .from('stickers')
        .select('code, public_id')
        .in('code', stickerCodes)
        .eq('is_active', true)
      for (const s of data || []) {
        stickersMap[s.code] = s.public_id
      }
    }

    const transformation = this.buildTransformation(params, stickersMap)
    const derivedPublicId = `${originalPublicId}_derived_${Date.now()}`
    // Create derived asset via explicit eager transformation
    await cloudinary.uploader.explicit(originalPublicId, {
      type: 'upload',
      resource_type: 'video',
      eager: transformation,
      eager_async: false,
      public_id: derivedPublicId
    } as any)

    const url = cloudinary.url(derivedPublicId, { resource_type: 'video', secure: true })
    return { derivedPublicId, url }
  }

  async apply({ originalPublicId, sourceUrl, params }: { originalPublicId?: string; sourceUrl?: string; params: EffectParams }) {
    const baseId = await this.importSourceIfNeeded(originalPublicId, sourceUrl)
    return this.applyToPublicId(baseId, params)
  }
}

export const videoTransformService = new VideoTransformService()
