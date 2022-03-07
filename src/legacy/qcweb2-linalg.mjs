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

const rnum = new RealAlgebra()
const lnum = new LinearAlgebra(rnum)

export function inormalise (v0) {
  return lnum.isdiv(v0, lnum.abs(v0))
}

export function rtp3 (v) {
  const sqrtx2y2 = Math.hypot(v[0], v[1])
  return {
    r: Math.hypot(sqrtx2y2, v[2]),
    t: Math.atan2(sqrtx2y2, v[2]),
    p: Math.atan2(v[1], v[0]) }
}

export function cross3 (v0, v1) {
  return lnum.$(
    v0[1] * v1[2] - v0[2] * v1[1],
    v0[2] * v1[0] - v0[0] * v1[2],
    v0[0] * v1[1] - v0[1] * v1[0])
}

// generate a matrix which rotate CCW around v
// th: rotation angle in radian
export function rotateV3 (th, v) {
  const c = Math.cos(th)
  const s = Math.sin(th)
  const d = 1 - c
  const dv = lnum.smul(v, d)
  const sv = lnum.smul(v, s)
  const a00 = v[0] * dv[0]
  const a01 = v[0] * dv[1]
  const a02 = v[0] * dv[2]
  const a11 = v[1] * dv[1]
  const a12 = v[1] * dv[2]
  const a22 = v[2] * dv[2]
  return lnum.$(
    c + a00, -sv[2] + a01, sv[1] + a02,
    sv[2] + a01, c + a11, -sv[0] + a12,
    -sv[1] + a02, sv[0] + a12, c + a22).setDim(3, 3)
}

// generate a regular inscribed simplex of the unit hypersphere
export function unitRegSimplex (dim) {
  if (dim === 0) {
    return [[]]
  }
  const simplex = [[-1], [1]]
  let edgeLength = 2
  for (let i = 1; i < dim; i += 1) {
    const el2 = edgeLength ** 2
    const factor = 2 * Math.sqrt(el2 - 1) / el2
    const shift = 2 / el2 - 1
    for (let j = 0; j <= i; j += 1) {
      for (let k = 0; k < i; k += 1) {
        simplex[j][k] *= factor
      }
      simplex[j].push(shift)
    }
    simplex.push(new Array(i).fill(0))
    simplex[i + 1].push(1)
    edgeLength *= factor
  }
  return simplex
}

/* @license-end */
