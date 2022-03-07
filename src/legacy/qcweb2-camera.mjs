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

import { RealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { inormalise, rtp3, rotateV3 } from './qcweb2-linalg.mjs'

const rnum = new RealAlgebra()
const lnum = new LinearAlgebra(rnum)

export class Camera {
  constructor () {
    this.refWidth = 512
    this.position = [0, 0, 50]
    this.lookAt = [0, 0, 0]
    this.upDir = [0, 1, 0]
    this.fov = 0.3
    this.distMin = 5
    this.distMax = 100
    // this.near = 0.01
    // this.far = 100
    this.orthographic = true
    this.rotFactor = 0.02
    this.moveFactor = 0.0005
    this.zoomFactor = 0.005
  }

  set position (position) {
    if (Array.isArray(position) && position.length === 3) {
      this._position = lnum.copy(position)
    }
  }

  get position () {
    return lnum.copy(this._position)
  }

  set lookAt (lookAt) {
    if (Array.isArray(lookAt) && lookAt.length === 3) {
      this._lookAt = lnum.copy(lookAt)
    }
  }

  get lookAt () {
    return lnum.copy(this._lookAt)
  }

  set upDir (upDir) {
    if (Array.isArray(upDir) && upDir.length === 3 && !lnum.isZero(upDir)) {
      this._upDir = inormalise(lnum.copy(upDir))
    }
  }

  get upDir () {
    return lnum.copy(this._upDir)
  }

  get distance () {
    return lnum.abs(lnum.sub(this.position, this.lookAt))
  }

  get near () {
    return this.distance * 0.01
  }

  get far () {
    return this.distance * 1.99
  }

  viewMat () {
    const mPos = lnum.neg(this.position)
    const rtp = rtp3(lnum.add(this.lookAt, mPos))
    const a = rotateV3(-rtp.p, [0, 0, 1])
    const b = rotateV3(-rtp.t + Math.PI, [0, 1, 0])
    const c = lnum.mmul(b, a)
    const u = lnum.mmul(c, this.upDir)
    const rot = lnum.mmul(rotateV3(Math.atan2(u[0], u[1]), [0, 0, 1]), c)
    const trans = lnum.mmul(rot, mPos)
    return lnum.$(
      ...rot.slice(0, 3), trans[0],
      ...rot.slice(3, 6), trans[1],
      ...rot.slice(6, 9), trans[2],
      0, 0, 0, 1).setDim(4, 4)
  }

  projectionMat (targetWidth, targetHeight) {
    if (this.orthographic) {
      return this.orthographicMat(targetWidth, targetHeight)
    } else {
      return this.pseudoPerspectiveMat(targetWidth, targetHeight)
    }
  }

  orthographicMat (targetWidth, targetHeight) {
    const aspectRatio = targetWidth / targetHeight
    const width = 2 * Math.tan(this.fov / 2) * this.distance *
      targetWidth / this.refWidth
    const height = width / aspectRatio
    const far = this.far
    const near = this.near
    const farMinusNear = this.far - this.near
    return lnum.$(
      2 / width, 0, 0, 0,
      0, 2 / height, 0, 0,
      0, 0, -2 / farMinusNear, -(far + near) / farMinusNear,
      0, 0, 0, 1).setDim(4, 4)
  }

  pseudoPerspectiveMat (targetWidth, targetHeight) {
    const aspectRatio = targetWidth / targetHeight
    const far = this.far
    const near = this.near
    const farMinusNear = far - near
    const a = Math.tan(this.fov / 2) * targetWidth / this.refWidth
    return lnum.$(
      1 / a, 0, 0, 0,
      0, aspectRatio / a, 0, 0,
      0, 0, -2 / farMinusNear, -(far + near) / farMinusNear,
      0, 0, -1, 0).setDim(4, 4)
  }
}

/* @license-end */
