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

export const rnum = new RealAlgebra(1e-10)
export const lnum = new LinearAlgebra(rnum)

export const newMatrix = (dimension, array = null) => {
  if (!dimension) {
    return false
  }
  const len = dimension.reduce((n, dim) => n * dim, 1)
  if (!Array.isArray(array)) {
    const mat = lnum.$()
    for (let i = 0; i < len; i += 1) {
      mat.push(NaN)
    }
    mat.setDim(...dimension)
    return mat
  }
  if (
    array.length !== len ||
    array.some(elem => elem === false)
  ) {
    return false
  }
  {
    const mat = lnum.$()
    for (const elm of array) {
      mat.push(typeof elm === 'number' ? elm : NaN)
    }
    mat.setDim(...dimension)
    return mat
  }
}

export const identity = n => lnum.$(
  ...Array.from(
    { length: n * n },
    (x, i) => {
      const iCol = i % n
      const iRow = (i - iCol) / n
      return iCol === iRow ? 1 : 0
    }
  )
).setDim(n, n)

/* @license-end */
