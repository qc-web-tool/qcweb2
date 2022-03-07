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

export function genArrow (
  nph,
  headLengthRatio0 = 0.0,
  headRadiusRatio0 = 1.0,
  headLengthRatio1 = 4.0,
  headRadiusRatio1 = 1.5
) {
  // numerical only
  const vn = []
  const id = []
  const headFactor0 = headLengthRatio0 < 0.5 ? 1.0 : 0.5 / headLengthRatio0
  headLengthRatio0 *= headFactor0
  headRadiusRatio0 *= headFactor0
  const headFactor1 = headLengthRatio1 < 0.5 ? 1.0 : 0.5 / headLengthRatio1
  headLengthRatio1 *= headFactor1
  headRadiusRatio1 *= headFactor1
  const dph = 2 * Math.PI / nph
  const c = []
  const s = []
  for (let i = 0; i < nph; i += 1) {
    const ph = i * dph
    c.push(Math.cos(ph))
    s.push(Math.sin(ph))
  }
  const th0 = Math.atan2(headRadiusRatio0, headLengthRatio0)
  const cth0 = Math.cos(th0)
  const sth0 = Math.sin(th0)
  const th1 = Math.atan2(headRadiusRatio1, headLengthRatio1)
  const cth1 = Math.cos(th1)
  const sth1 = Math.sin(th1)
  // (vertex, normal vector) tuples
  for (let i = 0; i < nph; i += 1) {
    vn.push(0, 0, 0)
    vn.push(cth0 * c[i], cth0 * s[i], -sth0)
  }
  for (let i = 0; i < nph; i += 1) {
    const ci = c[i]
    const si = s[i]
    vn.push(headRadiusRatio0 * ci, headRadiusRatio0 * si, headLengthRatio0)
    vn.push(cth0 * ci, cth0 * si, -sth0)
  }
  for (let i = 0; i < nph; i += 1) {
    vn.push(headRadiusRatio0 * c[i], headRadiusRatio0 * s[i], headLengthRatio0)
    vn.push(0, 0, 1)
  }
  for (let i = 0; i < nph; i += 1) {
    vn.push(c[i], s[i], headLengthRatio0)
    vn.push(0, 0, 1)
  }
  for (let i = 0; i < nph; i += 1) {
    const ci = c[i]
    const si = s[i]
    vn.push(ci, si, headLengthRatio0)
    vn.push(ci, si, 0)
  }
  for (let i = 0; i < nph; i += 1) {
    const ci = c[i]
    const si = s[i]
    vn.push(ci, si, 1 - headLengthRatio1)
    vn.push(ci, si, 0)
  }
  for (let i = 0; i < nph; i += 1) {
    vn.push(c[i], s[i], 1 - headLengthRatio1)
    vn.push(0, 0, -1)
  }
  for (let i = 0; i < nph; i += 1) {
    vn.push(headRadiusRatio1 * c[i], headRadiusRatio1 * s[i],
      1 - headLengthRatio1)
    vn.push(0, 0, -1)
  }
  for (let i = 0; i < nph; i += 1) {
    const ci = c[i]
    const si = s[i]
    vn.push(headRadiusRatio1 * ci, headRadiusRatio1 * si, 1 - headLengthRatio1)
    vn.push(cth1 * ci, cth1 * si, sth1)
  }
  for (let i = 0; i < nph; i += 1) {
    vn.push(0, 0, 1)
    vn.push(cth1 * c[i], cth1 * s[i], sth1)
  }
  // indices
  let j0 = 0
  let i0
  for (let j = 0; j < 9; j += 1) {
    i0 = j0
    j0 = i0 + nph
    for (let i = 0; i < nph; i += 1) {
      id.push(i0 + i, j0 + i)
    }
    id.push(i0, j0)
  }
  id.push(j0)
  return { vn: vn, i: id }
}

/* @license-end */
