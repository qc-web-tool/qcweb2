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

export function genHalfOctahedron (nSub) {
  // numerical only
  const vv = [
    [0, 0, 1],
    [-1, 0, 0],
    [0, -1, 0],
    [1, 0, 0],
    [0, 1, 0]]
  const v = []
  const id = []
  // vertices
  v.push(...vv[0])
  for (let iSub = 1; iSub <= nSub; iSub += 1) {
    for (let i = 1; i <= 4; i += 1) {
      const ip1 = (i % 4) + 1
      for (let jSub = 0; jSub < iSub; jSub += 1) {
        v.push(...interpolateDirection(
          vv[0], vv[i], vv[ip1], nSub, iSub, jSub))
      }
    }
  }
  // indices
  id.push(1)
  for (let i = 1; i <= 4; i += 1) {
    id.push(i, 0)
  }
  id.push(1)
  let j = 1
  let i = 5
  for (let iSub = 1; iSub < nSub; iSub += 1) {
    const j0 = j
    const i0 = i
    for (let k = 1; k <= 4; k += 1) {
      id.push(j, i)
      i += 1
      for (let jSub = 0; jSub < iSub; jSub += 1) {
        id.push(j, i)
        j += 1
        i += 1
      }
    }
    id.push(j0, i0)
  }
  id.push(j, j)
  return { v: v, i: id }
}

/* @license-end */
