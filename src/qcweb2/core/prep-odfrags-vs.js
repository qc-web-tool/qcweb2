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

import { SSGID_BIT_LENGTH } from './constants.js'

const PREP_ODFRAGS_3D_VS = `#version 300 es
layout(location = 0) in uint odId;
layout(location = 1) in vec3 rOD0;
layout(location = 2) in vec3 rOD1;
layout(location = 3) in vec3 rOD2;
layout(location = 4) in vec3 rOD3;
layout(location = 5) in uint ssgId;
uniform highp sampler2D ssg;
flat out uint vODIdSSGId;
out vec3 vBOD0;
out vec3 vBOD1;
out vec3 vBOD2;
out vec3 vROD0;
out vec3 vROD1;
out vec3 vROD2;
out vec3 vROD3;
void main() {
  uint id = ssgId * 3u;
  mat3 gPerp;
  gPerp[0] = texelFetch(ssg, ivec2(id, 1), 0).xyz;
  gPerp[1] = texelFetch(ssg, ivec2(id + 1u, 1), 0).xyz;
  gPerp[2] = texelFetch(ssg, ivec2(id + 2u, 1), 0).xyz;
  vec3 v[4] = vec3[4](rOD0 * gPerp, rOD1 * gPerp, rOD2 * gPerp, rOD3 * gPerp);
  bool flag = dot(cross(v[1] - v[0], v[2] - v[0]), v[3] - v[0]) > 0.0;
  vROD0 = flag ? v[0] : v[1];
  vROD1 = flag ? v[1] : v[0];
  vROD2 = v[2];
  vROD3 = v[3];
  mat3 bOD = inverse(mat3(vROD1 - vROD0, vROD2 - vROD0, vROD3 - vROD0));
  vBOD0 = bOD[0];
  vBOD1 = bOD[1];
  vBOD2 = bOD[2];
  vODIdSSGId = odId << ${SSGID_BIT_LENGTH}u | ssgId;
}`

const PREP_ODFRAGS_3D_TF_VARYINGS = [
  'vODIdSSGId',
  'vBOD0',
  'vBOD1',
  'vBOD2',
  'vROD0',
  'vROD1',
  'vROD2',
  'vROD3'
]

const PREP_ODFRAGS_2D_VS = `#version 300 es
layout(location = 0) in uint odId;
layout(location = 1) in vec2 rOD0;
layout(location = 2) in vec2 rOD1;
layout(location = 3) in vec2 rOD2;
layout(location = 4) in uint ssgId;
uniform highp sampler2D ssg;
flat out uint vODIdSSGId;
out vec2 vBOD0;
out vec2 vBOD1;
out vec2 vROD0;
out vec2 vROD1;
out vec2 vROD2;
void main() {
  uint id = ssgId * 3u;
  mat2 gPerp;
  gPerp[0] = texelFetch(ssg, ivec2(id, 1), 0).xy;
  gPerp[1] = texelFetch(ssg, ivec2(id + 1u, 1), 0).xy;
  vROD0 = rOD0 * gPerp;
  vROD1 = rOD1 * gPerp;
  vROD2 = rOD2 * gPerp;
  mat2 bOD = inverse(mat2(vROD1 - vROD0, vROD2 - vROD0));
  vBOD0 = bOD[0];
  vBOD1 = bOD[1];
  vODIdSSGId = odId << ${SSGID_BIT_LENGTH}u | ssgId;
}`

const PREP_ODFRAGS_2D_TF_VARYINGS = [
  'vODIdSSGId',
  'vBOD0',
  'vBOD1',
  'vROD0',
  'vROD1',
  'vROD2'
]

const PREP_ODFRAGS_1D_VS = `#version 300 es
layout(location = 0) in uint odId;
layout(location = 1) in float rOD0;
layout(location = 2) in float rOD1;
layout(location = 3) in uint ssgId;
uniform highp sampler2D ssg;
flat out uint vODIdSSGId;
out float vBOD0;
out float vROD0;
out float vROD1;
void main() {
  uint id = ssgId * 3u;
  float gPerp = texelFetch(ssg, ivec2(id, 1), 0).x;
  vROD0 = rOD0 * gPerp;
  vROD1 = rOD1 * gPerp;
  vBOD0 = 1.0 / (vROD1 - vROD0);
  vODIdSSGId = odId << ${SSGID_BIT_LENGTH}u | ssgId;
}`

const PREP_ODFRAGS_1D_TF_VARYINGS = [
  'vODIdSSGId',
  'vBOD0',
  'vROD0',
  'vROD1'
]

const PREP_ODFRAGS_0D_VS = `#version 300 es
layout(location = 0) in uint odId;
layout(location = 1) in uint ssgId;
flat out uint vODIdSSGId;
void main() {
  vODIdSSGId = odId << ${SSGID_BIT_LENGTH}u | ssgId;
}`

const PREP_ODFRAGS_0D_TF_VARYINGS = [
  'vODIdSSGId'
]

export const PREP_ODFRAGS_VS = [
  PREP_ODFRAGS_0D_VS,
  PREP_ODFRAGS_1D_VS,
  PREP_ODFRAGS_2D_VS,
  PREP_ODFRAGS_3D_VS
]

export const PREP_ODFRAGS_TF_VARYINGS = [
  PREP_ODFRAGS_0D_TF_VARYINGS,
  PREP_ODFRAGS_1D_TF_VARYINGS,
  PREP_ODFRAGS_2D_TF_VARYINGS,
  PREP_ODFRAGS_3D_TF_VARYINGS
]

/* @license-end */
