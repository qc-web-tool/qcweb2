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
  TOL_CUT,
  CUT_TEXTURE_WIDTH,
  CUT_TEXTURE_WIDTH_BIT_LENGTH,
  SSGID_BIT_LENGTH,
  INVALID_ODID,
  DATA_TEXTURE_WIDTH,
  DATA_TEXTURE_WIDTH_BIT_LENGTH,
  TYPEID_NONE,
  TYPEID_ATOM,
  CARTN_TRANSFORM_UNIFORM_BLOCK_LAYOUT,
  HIGHLIGHT_UNIFORM_BLOCK_LAYOUT
} from './constants.js'

export const PROJ_VS = `#version 300 es
layout(location = 0) in lowp ivec3 rFractLatt123;
layout(location = 1) in lowp ivec3 rFractLatt456;
layout(location = 2) in vec3 rFractSite123;
layout(location = 3) in vec3 rFractSite456;
${CARTN_TRANSFORM_UNIFORM_BLOCK_LAYOUT}
flat out uvec2 vRFractLattId;
out vec3 vRParCartn;
out vec3 vRPerpCartn;
void main() {
  vec3 rFract123 = vec3(rFractLatt123) + rFractSite123 - originFract123;
  vec3 rFract456 = vec3(rFractLatt456) + rFractSite456 - originFract456;
  vRParCartn = rFract123 * aParCartn123 + rFract456 * aParCartn456;
  vRPerpCartn = -(rFract123 * aPerpCartn123 + rFract456 * aPerpCartn456);
  uvec3 rFractLatt123u = uvec3(ivec3(rFractLatt123) + 128);
  uvec3 rFractLatt456u = uvec3(ivec3(rFractLatt456) + 128);
  vRFractLattId = uvec2(
    rFractLatt123u[0] << 24u | rFractLatt123u[1] << 16u |
    rFractLatt123u[2] << 8u | rFractLatt456u[0],
    rFractLatt456u[1] << 24u | rFractLatt456u[2] << 16u);
}`

const CUT_3D_VS = `#version 300 es
layout(location = 0) in vec3 rPerpCartn;
layout(location = 1) in vec3 displacementPerpCartn;
layout(location = 2) in uint odIdSSGId;
layout(location = 3) in vec3 bOD0;
layout(location = 4) in vec3 bOD1;
layout(location = 5) in vec3 bOD2;
layout(location = 6) in vec3 rOD0;
flat out uvec4 vColour;
void main() {
  mat3 bOD = mat3(bOD0, bOD1, bOD2);
  vec3 v = bOD * (rPerpCartn + displacementPerpCartn - rOD0);
  if (
    v.x + v.y + v.z <= 1.0 + ${TOL_CUT} &&
    all(greaterThanEqual(v, vec3(-${TOL_CUT})))
  ) {
    gl_Position = vec4(
      (vec2(gl_VertexID % ${CUT_TEXTURE_WIDTH},
        gl_VertexID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}) * 2.0 + 1.0)
        / float(${CUT_TEXTURE_WIDTH}) - 1.0,
      0.0, 1.0);
  } else {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
  gl_PointSize = 1.0;
  vColour = uvec4(odIdSSGId, 0u, 0u, 0u);
}`

const CUT_2D_VS = `#version 300 es
layout(location = 0) in vec3 rPerpCartn;
layout(location = 1) in vec3 displacementPerpCartn;
layout(location = 2) in uint odIdSSGId;
layout(location = 3) in vec2 bOD0;
layout(location = 4) in vec2 bOD1;
layout(location = 5) in vec2 rOD0;
flat out uvec4 vColour;
void main() {
  mat2 bOD = mat2(bOD0, bOD1);
  vec2 v = bOD * (rPerpCartn.xy + displacementPerpCartn.xy - rOD0);
  if (
    v.x + v.y <= 1.0 + ${TOL_CUT} &&
    all(greaterThanEqual(v, vec2(-${TOL_CUT})))
  ) {
    gl_Position = vec4(
      (vec2(gl_VertexID % ${CUT_TEXTURE_WIDTH},
        gl_VertexID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}) * 2.0 + 1.0)
        / float(${CUT_TEXTURE_WIDTH}) - 1.0,
      0.0, 1.0);
  } else {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
  gl_PointSize = 1.0;
  vColour = uvec4(odIdSSGId, 0u, 0u, 0u);
}`

const CUT_1D_VS = `#version 300 es
layout(location = 0) in vec3 rPerpCartn;
layout(location = 1) in vec3 displacementPerpCartn;
layout(location = 2) in uint odIdSSGId;
layout(location = 3) in float bOD0;
layout(location = 4) in float rOD0;
flat out uvec4 vColour;
void main() {
  float v = bOD0 * (rPerpCartn.x + displacementPerpCartn.x - rOD0);
  if (v <= 1.0 + ${TOL_CUT} && v >= float(-${TOL_CUT})) {
    gl_Position = vec4(
      (vec2(gl_VertexID % ${CUT_TEXTURE_WIDTH},
        gl_VertexID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}) * 2.0 + 1.0)
        / float(${CUT_TEXTURE_WIDTH}) - 1.0,
      0.0, 1.0);
  } else {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
  gl_PointSize = 1.0;
  vColour = uvec4(odIdSSGId, 0u, 0u, 0u);
}`

const CUT_0D_VS = `#version 300 es
layout(location = 0) in vec3 rPerpCartn;
layout(location = 1) in vec3 displacementPerpCartn;
layout(location = 2) in uint odIdSSGId;
flat out uvec4 vColour;
void main() {
  gl_Position = vec4(
    (vec2(gl_VertexID % ${CUT_TEXTURE_WIDTH},
      gl_VertexID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}) * 2.0 + 1.0)
      / float(${CUT_TEXTURE_WIDTH}) - 1.0,
    0.0, 1.0);
  gl_PointSize = 1.0;
  vColour = uvec4(odIdSSGId, 0u, 0u, 0u);
}`

export const CUT_VS = [CUT_0D_VS, CUT_1D_VS, CUT_2D_VS, CUT_3D_VS]

export const COLOUR_ATOMS_VS = `#version 300 es
layout(location = 0) in uvec2 rFractLattId;
layout(location = 1) in vec3 rParCartn;
uniform highp usampler2DArray cut;
uniform sampler2D odColourRadius;
${HIGHLIGHT_UNIFORM_BLOCK_LAYOUT}
out vec4 vColour;
out vec4 vRadius;
flat out uvec4 vInfo;
void main() {
  uint odIdSSGId = texelFetch(cut, ivec3(
    gl_VertexID % ${CUT_TEXTURE_WIDTH},
    gl_VertexID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}, 0), 0).r;
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  vInfo = uvec4(${TYPEID_ATOM}u, odIdSSGId, rFractLattId);
  if (odId != ${INVALID_ODID}u && length(rParCartn) < rCutParCartn) {
    uint id = odId * 2u;
    vColour = texelFetch(odColourRadius, ivec2(
      id % ${DATA_TEXTURE_WIDTH}u,
      id >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0);
    id += 1u;
    vRadius = texelFetch(odColourRadius, ivec2(
      id % ${DATA_TEXTURE_WIDTH}u,
      id >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0);
    vRadius.r *= baseRadius;
  } else {
    vColour = vec4(0.0, 0.0, 0.0, 0.0);
    vRadius = vec4(0.0, 0.0, 0.0, 0.0);
    vInfo[0] = ${TYPEID_NONE}u;
  }
  if ((vInfo & highlightMask) != (highlightRef & highlightMask)) {
    vColour *= unhighlightColourFactor;
    vRadius *= unhighlightRadiusFactor;
  }
}`

export const MASK_DISPLACEMENTS_VS = `#version 300 es
layout(location = 0) in uint displacementId;
layout(location = 1) in vec3 displacement;
layout(location = 2) in uvec4 info;
uniform highp usampler2DArray cut;
uniform sampler2D odColourRadius;
${HIGHLIGHT_UNIFORM_BLOCK_LAYOUT}
out vec4 vDisplacementOccupancy;
out vec4 vTargetColour;
out vec4 vTargetRadius;
void main() {
  uint odIdSSGId = texelFetch(cut, ivec3(
    gl_InstanceID % ${CUT_TEXTURE_WIDTH},
    gl_InstanceID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}, displacementId), 0).r;
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  vDisplacementOccupancy = vec4(displacement, 0.0);
  if (odId != ${INVALID_ODID}u) {
    vDisplacementOccupancy.a = 1.0;
    uint id = odId * 2u;
    vTargetColour = texelFetch(odColourRadius, ivec2(
      id % ${DATA_TEXTURE_WIDTH}u,
      id >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0);
    id += 1u;
    vTargetRadius = texelFetch(odColourRadius, ivec2(
      id % ${DATA_TEXTURE_WIDTH}u,
      id >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0);
    vTargetRadius.r *= baseRadius;
  }
  if ((info & highlightMask) != (highlightRef & highlightMask)) {
    vTargetColour *= unhighlightColourFactor;
    vTargetRadius *= unhighlightRadiusFactor;
  }
}`

/* @license-end */
