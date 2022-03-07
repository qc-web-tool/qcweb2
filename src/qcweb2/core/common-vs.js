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

export const FILL_VIEWPORT_FAR_VS = `#version 300 es
const vec4 xxyy = vec4(-1.0, 1.0, -1.0, 1.0);
const int ixy[12] = int[](0, 3, 0, 2, 1, 3, 1, 2, 1, 3, 0, 2);
void main() {
  int i = gl_VertexID * 2;
  int j = i + 1;
  gl_Position = vec4(xxyy[ixy[i]], xxyy[ixy[j]], 1.0, 1.0);
}`

/* @license-end */
