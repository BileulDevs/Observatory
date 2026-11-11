import type { WebGLRenderer, WebGLRenderTarget } from 'three'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'

/**
 * RenderPass that also lets the active stage draw extra viewports into the same buffer, so multi-view stages
 * (catalogue thumbnails) get the same bloom, tone mapping and grain as everything else.
 */
export class StagePass extends RenderPass {
  views: ((renderer: WebGLRenderer, target: WebGLRenderTarget | null) => void) | null = null

  override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive)
    if (!this.views) return
    const target = this.renderToScreen ? null : readBuffer
    const autoClear = renderer.autoClear
    renderer.autoClear = false
    renderer.setRenderTarget(target)
    this.views(renderer, target)
    renderer.autoClear = autoClear
  }
}
