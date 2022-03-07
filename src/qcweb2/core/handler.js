/**
 * @source: https://www.npmjs.com/package/@kkitahara/qc-tools
 * @license magnet:?xt=urn:btih:8e4f440f4c65981c5bf93c76d35135ba5064d8b7&dn=apache-2.0.txt Apache-2.0
 */

/**
 * Copyright 2019 Koichi Kitahara
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { QCWeb2Core } from './core.js'

const context = new WeakMap()

export class QCWeb2CoreHandler {
  constructor (
    canvas,
    store,
    overlayPanelSelector,
    quasicrystalSelector,
    overlayPanelSetData,
    subscribers
  ) {
    const ctx = new QCWeb2Core(
      canvas,
      store,
      overlayPanelSelector,
      quasicrystalSelector,
      overlayPanelSetData,
      subscribers
    )
    context.set(this, ctx)
    this.onMouseDown = e => ctx.onMouseDown(e)
    this.onMouseUp = e => ctx.onMouseUp(e)
    this.onMouseMove = e => ctx.onMouseMove(e)
    this.onMouseLeave = e => ctx.onMouseLeave(e)
    this.onMouseEnter = e => ctx.onMouseEnter(e)
    this.onDoubleClick = e => ctx.onDoubleClick(e)
    this.onWheel = e => ctx.onWheel(e)
  }

  destructor () {
    const ctx = context.get(this)
    ctx.destructor()
    context.delete(this)
  }

  toggleShowAtoms () {
    const ctx = context.get(this)
    ctx.toggleShowAtoms()
  }

  toggleShowAsymBonds () {
    const ctx = context.get(this)
    ctx.toggleShowAsymBonds()
  }

  toggleShowBonds () {
    const ctx = context.get(this)
    ctx.toggleShowBonds()
  }

  toggleShowVertices () {
    const ctx = context.get(this)
    ctx.toggleShowVertices()
  }

  toggleShowEdges () {
    const ctx = context.get(this)
    ctx.toggleShowEdges()
  }

  toggleShowFaces () {
    const ctx = context.get(this)
    ctx.toggleShowFaces()
  }

  toggleShowODs () {
    const ctx = context.get(this)
    ctx.toggleShowODs()
  }

  toggleCameraProjectionMode () {
    const ctx = context.get(this)
    ctx.toggleCameraProjectionMode()
  }

  toggleHighlightMaskType () {
    const ctx = context.get(this)
    ctx.toggleHighlightMaskType()
  }

  toggleHighlightMaskOD () {
    const ctx = context.get(this)
    ctx.toggleHighlightMaskOD()
  }

  toggleHighlightMaskSSG () {
    const ctx = context.get(this)
    ctx.toggleHighlightMaskSSG()
  }

  toggleHighlightMaskLatt () {
    const ctx = context.get(this)
    ctx.toggleHighlightMaskLatt()
  }

  resetOrigin () {
    const ctx = context.get(this)
    ctx.resetOrigin()
  }

  setCameraPar () {
    const ctx = context.get(this)
    ctx.setCameraPar()
  }

  setCameraPerp () {
    const ctx = context.get(this)
    ctx.setCameraPerp()
  }

  setODBaseOpacity () {
    const ctx = context.get(this)
    ctx.setODBaseOpacity()
  }
}

/* @license-end */
