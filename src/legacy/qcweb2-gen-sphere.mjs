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

export function genSphere (nrow, ncol) {
  // numerical only
  const v = []
  const id = []
  const dth = Math.PI / nrow
  const dph = -2 * Math.PI / ncol
  const cph = []
  const sph = []
  for (let icol = 0; icol < ncol; icol += 1) {
    const ph = icol * dph
    cph.push(Math.cos(ph))
    sph.push(Math.sin(ph))
  }
  // vertices
  v.push(0, 0, -1)
  for (let irow = 1; irow < nrow; irow += 1) {
    const th = irow * dth
    const c = -Math.cos(th)
    const s = Math.sin(th)
    for (let icol = 0; icol < ncol; icol += 1) {
      v.push(s * cph[icol], s * sph[icol], c)
    }
  }
  v.push(0, 0, 1)
  // indices
  id.push(1)
  for (let icol = 1; icol <= ncol; icol += 1) {
    id.push(icol, 0)
  }
  id.push(1)
  {
    let i0 = 1
    let j0 = i0 + ncol
    for (let irow = 2; irow < nrow; irow += 1) {
      for (let icol = 0; icol < ncol; icol += 1) {
        id.push(i0 + icol, j0 + icol)
      }
      id.push(i0, j0)
      i0 = j0
      j0 = i0 + ncol
    }
    for (let icol = 0; icol < ncol; icol += 1) {
      id.push(i0 + icol, j0)
    }
    id.push(i0, i0)
  }
  return { v: v, i: id }
}

/* @license-end */
