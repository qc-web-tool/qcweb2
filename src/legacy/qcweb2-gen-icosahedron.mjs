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
import { inormalise, cross3, rotateV3 } from './qcweb2-linalg.mjs'

const rnum = new RealAlgebra()
const lnum = new LinearAlgebra(rnum)

function interpolateDirection (v0, v1, v2, nsub, isub, jsub) {
  const ax1 = inormalise(cross3(v0, v1))
  const ax2 = inormalise(cross3(v0, v2))
  const th1 = Math.acos(lnum.dot(v0, v1))
  const th2 = Math.acos(lnum.dot(v0, v2))
  const v1i = lnum.mmul(rotateV3(th1 * isub / nsub, ax1), v0)
  const v2i = lnum.mmul(rotateV3(th2 * isub / nsub, ax2), v0)
  const ax3 = inormalise(cross3(v1i, v2i))
  const th3 = Math.acos(lnum.dot(v1i, v2i))
  return lnum.mmul(rotateV3(th3 * jsub / isub, ax3), v1i)
}

export function genIcosahedron (nsub) {
  // numerical only
  const t = (1 + Math.sqrt(5)) / 2
  const norm = Math.sqrt(t + 2)
  const vv = [
    [0, -1 / norm, -t / norm],
    [0, 1 / norm, -t / norm],
    [t / norm, 0, -1 / norm],
    [1 / norm, -t / norm, 0],
    [-1 / norm, -t / norm, 0],
    [-t / norm, 0, -1 / norm],
    [-1 / norm, t / norm, 0],
    [1 / norm, t / norm, 0],
    [t / norm, 0, 1 / norm],
    [0, -1 / norm, t / norm],
    [-t / norm, 0, 1 / norm],
    [0, 1 / norm, t / norm]]
  const v = []
  const id = []
  // vertices
  v.push(...vv[0])
  for (let isub = 1; isub <= nsub; isub += 1) {
    for (let i = 1; i <= 5; i += 1) {
      const ip1 = i + 1
      for (let jsub = 0; jsub < isub; jsub += 1) {
        if (i < 5) {
          v.push(...interpolateDirection(
            vv[0], vv[i], vv[ip1], nsub, isub, jsub))
        } else {
          v.push(...interpolateDirection(vv[0], vv[5], vv[1], nsub, isub, jsub))
        }
      }
    }
  }
  for (let isub = 1; isub <= nsub; isub += 1) {
    const n = nsub - isub
    for (let i = 6; i <= 10; i += 1) {
      let ip1
      let im5
      let im4
      if (i !== 10) {
        ip1 = i + 1
        im5 = i - 5
        im4 = i - 4
      }
      for (let jsub = 0; jsub < n; jsub += 1) {
        if (i !== 10) {
          v.push(...interpolateDirection(
            vv[i], vv[im5], vv[im4], nsub, n, jsub))
        } else {
          v.push(...interpolateDirection(vv[10], vv[5], vv[1], nsub, n, jsub))
        }
      }
      for (let jsub = 0; jsub < isub; jsub += 1) {
        if (i !== 10) {
          v.push(...interpolateDirection(
            vv[im4], vv[i], vv[ip1], nsub, isub, jsub))
        } else {
          v.push(...interpolateDirection(
            vv[1], vv[10], vv[6], nsub, isub, jsub))
        }
      }
    }
  }
  for (let isub = 1; isub < nsub; isub += 1) {
    const n = nsub - isub
    for (let i = 6; i <= 10; i += 1) {
      let ip1
      if (i !== 10) {
        ip1 = i + 1
      }
      for (let jsub = 0; jsub < n; jsub += 1) {
        if (i !== 10) {
          v.push(...interpolateDirection(vv[11], vv[i], vv[ip1], nsub, n, jsub))
        } else {
          v.push(...interpolateDirection(vv[11], vv[10], vv[6], nsub, n, jsub))
        }
      }
    }
  }
  v.push(...vv[11])
  // indices
  id.push(1)
  for (let i = 1; i <= 5; i += 1) {
    id.push(i, 0)
  }
  id.push(1)
  {
    let j = 1
    for (let isub = 2; isub <= nsub; isub += 1) {
      const isubm1 = isub - 1
      const j0 = j
      const i0 = j + isubm1 * 5
      let i = i0
      for (; j < i0; j += 1) {
        if ((j - j0) % isubm1 === 0) {
          id.push(j, i)
          i += 1
        }
        id.push(j, i)
        i += 1
      }
      id.push(j0, i0)
    }
    for (let isub = 1; isub <= nsub; isub += 1) {
      const j0 = j
      const i0 = j + 5 * nsub
      let i = i0
      for (; j < i0; j += 1) {
        id.push(j, i)
        i += 1
      }
      id.push(j0, i0)
    }
    for (let isub = 1; isub < nsub; isub += 1) {
      const n = nsub - isub + 1
      const j0 = j
      const i0 = j + n * 5
      let i = i0
      id.push(j0)
      for (j = j0 + 1; j < i0; j += 1) {
        id.push(i, j)
        if ((j - j0) % n !== 0) {
          i += 1
        }
      }
      id.push(i0, j0, i0)
    }
    {
      const j0 = j
      const i0 = j0 + 5
      for (; j < i0; j += 1) {
        id.push(j, i0)
      }
      id.push(j0, j0)
    }
  }
  return { v: v, i: id }
}

/* @license-end */
