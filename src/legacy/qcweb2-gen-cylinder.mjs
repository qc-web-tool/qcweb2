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

export function genCylinder (nph) {
  // numerical only
  const vn = []
  const id = []
  const dph = -2 * Math.PI / nph
  const c = []
  const s = []
  for (let i = 0; i < nph; i += 1) {
    const ph = i * dph
    c.push(Math.cos(ph))
    s.push(Math.sin(ph))
  }
  // (vertex, normal vector) tuples
  vn.push(0, 0, 0)
  vn.push(0, 0, -1)
  for (let i = 0; i < nph; i += 1) {
    vn.push(c[i], s[i], 0)
    vn.push(0, 0, -1)
  }
  for (let i = 0; i < nph; i += 1) {
    const ci = c[i]
    const si = s[i]
    vn.push(ci, si, 0)
    vn.push(ci, si, 0)
  }
  for (let i = 0; i < nph; i += 1) {
    const ci = c[i]
    const si = s[i]
    vn.push(ci, si, 0.5)
    vn.push(ci, si, 0)
  }
  const halfVCount = vn.length / 6
  for (let i = 0; i < nph; i += 1) {
    const ci = c[i]
    const si = s[i]
    vn.push(ci, si, 0.5)
    vn.push(ci, si, 0)
  }
  for (let i = 0; i < nph; i += 1) {
    const ci = c[i]
    const si = s[i]
    vn.push(ci, si, 1)
    vn.push(ci, si, 0)
  }
  for (let i = 0; i < nph; i += 1) {
    vn.push(c[i], s[i], 1)
    vn.push(0, 0, 1)
  }
  vn.push(0, 0, 1)
  vn.push(0, 0, 1)
  // indices
  id.push(1)
  for (let i = 1; i <= nph; i += 1) {
    id.push(i, 0)
  }
  {
    let j0 = 1
    let i0
    for (let j = 0; j < 6; j += 1) {
      id.push(j0)
      i0 = j0
      j0 = i0 + nph
      for (let i = 0; i < nph; i += 1) {
        id.push(i0 + i, j0 = i)
      }
      id.push(i0)
    }
    id.push(i0)
  }
  return { vn: vn, i: id, halfVCount: halfVCount }
}

/* @license-end */
