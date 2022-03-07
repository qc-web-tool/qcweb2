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

import {
  SSGID_BIT_LENGTH,
  DATA_TEXTURE_WIDTH,
  DATA_TEXTURE_WIDTH_BIT_LENGTH,
  TYPEID_OD,
  HIGHLIGHT_UNIFORM_BLOCK_LAYOUT
} from './constants.js'

const GEN_OD_INSTANCES_3D_VS = `#version 300 es
layout(location = 0) in int vId;
layout(location = 1) in uint odIdSSGId;
layout(location = 2) in vec3 rOD0;
layout(location = 3) in vec3 rOD1;
layout(location = 4) in vec3 rOD2;
layout(location = 5) in vec3 rOD3;
uniform sampler2D odColourRadius;
${HIGHLIGHT_UNIFORM_BLOCK_LAYOUT}
out vec3 vPosition;
out vec4 vColour;
flat out uvec4 vInfo;
void main() {
  vec3 v[4] = vec3[4](rOD0, rOD1, rOD2, rOD3);
  vPosition = v[vId];
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  uint id = odId * 2u;
  vColour = texelFetch(odColourRadius, ivec2(
    id % ${DATA_TEXTURE_WIDTH}u,
    id >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0);
  vInfo = uvec4(${TYPEID_OD}u, odIdSSGId, 0u, 0u);
  vColour.a *= odBaseOpacity;
  if ((vInfo & highlightMask) != (highlightRef & highlightMask)) {
    vColour *= unhighlightColourFactor;
  }
}`

const GEN_OD_INSTANCES_2D_VS = `#version 300 es
layout(location = 0) in int vId;
layout(location = 1) in uint odIdSSGId;
layout(location = 2) in vec2 rOD0;
layout(location = 3) in vec2 rOD1;
layout(location = 4) in vec2 rOD2;
uniform sampler2D odColourRadius;
${HIGHLIGHT_UNIFORM_BLOCK_LAYOUT}
out vec3 vPosition;
out vec4 vColour;
flat out uvec4 vInfo;
void main() {
  vec2 v[3] = vec2[3](rOD0, rOD1, rOD2);
  vPosition = vec3(v[vId], 0.0);
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  uint id = odId * 2u;
  vColour = texelFetch(odColourRadius, ivec2(
    id % ${DATA_TEXTURE_WIDTH}u,
    id >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0);
  vInfo = uvec4(${TYPEID_OD}u, odIdSSGId, 0u, 0u);
  vColour.a *= odBaseOpacity;
  if ((vInfo & highlightMask) != (highlightRef & highlightMask)) {
    vColour *= unhighlightColourFactor;
  }
}`

const GEN_OD_INSTANCES_1D_VS = `#version 300 es
layout(location = 0) in int vId;
layout(location = 1) in uint odIdSSGId;
layout(location = 2) in float rOD0;
layout(location = 3) in float rOD1;
uniform sampler2D odColourRadius;
${HIGHLIGHT_UNIFORM_BLOCK_LAYOUT}
out vec3 vPosition;
out vec4 vColour;
flat out uvec4 vInfo;
void main() {
  float v[2] = float[2](rOD0, rOD1);
  vPosition = vec3(v[vId], 0.0, 0.0);
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  uint id = odId * 2u;
  vColour = texelFetch(odColourRadius, ivec2(
    id % ${DATA_TEXTURE_WIDTH}u,
    id >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0);
  vInfo = uvec4(${TYPEID_OD}u, odIdSSGId, 0u, 0u);
  vColour.a *= odBaseOpacity;
  if ((vInfo & highlightMask) != (highlightRef & highlightMask)) {
    vColour *= unhighlightColourFactor;
  }
}`

const GEN_OD_INSTANCES_0D_VS = `#version 300 es
layout(location = 0) in int vId;
layout(location = 1) in uint odIdSSGId;
uniform sampler2D odColourRadius;
${HIGHLIGHT_UNIFORM_BLOCK_LAYOUT}
out vec3 vPosition;
out vec4 vColour;
flat out uvec4 vInfo;
void main() {
  vPosition = vec3(0.0);
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  uint id = odId * 2u;
  vColour = texelFetch(odColourRadius, ivec2(
    id % ${DATA_TEXTURE_WIDTH}u,
    id >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0);
  vInfo = uvec4(${TYPEID_OD}u, odIdSSGId, 0u, 0u);
  vColour.a *= odBaseOpacity;
  if ((vInfo & highlightMask) != (highlightRef & highlightMask)) {
    vColour *= unhighlightColourFactor;
  }
}`

export const GEN_OD_INSTANCES_VS = [
  GEN_OD_INSTANCES_0D_VS,
  GEN_OD_INSTANCES_1D_VS,
  GEN_OD_INSTANCES_2D_VS,
  GEN_OD_INSTANCES_3D_VS
]

export const GEN_OD_INSTANCES_TF_VARYINGS = ['vPosition', 'vColour', 'vInfo']

/* @license-end */
