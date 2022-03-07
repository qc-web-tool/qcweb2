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

import { TYPEID_NONE } from './constants.js'

export const DRAW_ATOMS_VS = `#version 300 es
layout(location = 0) in vec3 sphPosition;
layout(location = 1) in vec3 position;
layout(location = 2) in vec4 colour;
layout(location = 3) in vec4 radius;
uniform mat4 vmat, pmat;
out vec3 vNormal;
out vec4 vColour;
void main() {
  vec4 vpos = vec4(position, 1.0) * vmat;
  vec3 dir = normalize(-vpos.xyz);
  float snth = length(dir.xy);
  float csph = snth == 0.0 ? 1.0 : dir.x / snth;
  float snph = snth == 0.0 ? 0.0 : dir.y / snth;
  mat4 mmat;
  mmat[0] = vec4(csph * dir.z, -snph, dir.x, vpos.x);
  mmat[1] = vec4(snph * dir.z, csph, dir.y, vpos.y);
  mmat[2] = vec4(-snth, 0.0, dir.z, vpos.z);
  mmat[3] = vec4(0.0, 0.0, 0.0, 1.0);
  gl_Position = vec4(radius.r * sphPosition, 1.0) * mmat * pmat;
  gl_Position.z *= gl_Position.w;
  vNormal = (vec4(sphPosition, 0.0) * mmat).xyz;
  vColour = colour;
}`

export const DRAW_ATOMS_INFO_VS = `#version 300 es
layout(location = 0) in vec3 sphPosition;
layout(location = 1) in vec3 position;
layout(location = 2) in vec4 radius;
layout(location = 3) in uvec4 info;
uniform mat4 vmat, pmat;
flat out uvec4 vColour;
void main() {
  vec4 vpos = vec4(position, 1.0) * vmat;
  vec3 dir = normalize(-vpos.xyz);
  float snth = length(dir.xy);
  float csph = snth == 0.0 ? 1.0 : dir.x / snth;
  float snph = snth == 0.0 ? 0.0 : dir.y / snth;
  mat4 mmat;
  mmat[0] = vec4(csph * dir.z, -snph, dir.x, vpos.x);
  mmat[1] = vec4(snph * dir.z, csph, dir.y, vpos.y);
  mmat[2] = vec4(-snth, 0.0, dir.z, vpos.z);
  mmat[3] = vec4(0.0, 0.0, 0.0, 1.0);
  gl_Position = vec4(radius.r * sphPosition, 1.0) * mmat * pmat;
  gl_Position.z *= gl_Position.w;
  vColour = info;
}`

export const DRAW_HALF_BONDS_VS = `#version 300 es
layout(location = 0) in vec3 cylPosition;
layout(location = 1) in vec3 cylNormal;
layout(location = 2) in vec3 position;
layout(location = 3) in vec4 colour;
layout(location = 4) in vec4 radius;
layout(location = 5) in vec4 displacementOccupancy1;
layout(location = 6) in vec4 targetRadius1;
uniform mat4 vmat, pmat;
out vec3 vNormal;
out vec4 vColour;
void main() {
  vec3 dir = displacementOccupancy1.xyz;
  float len = length(dir);
  dir /= len;
  float snth = length(dir.xy);
  float csph = snth == 0.0 ? 1.0 : dir.x / snth;
  float snph = snth == 0.0 ? 0.0 : dir.y / snth;
  mat4 mmat;
  mmat[0] = vec4(csph * dir.z, -snph, dir.x, position.x);
  mmat[1] = vec4(snph * dir.z, csph, dir.y, position.y);
  mmat[2] = vec4(-snth, 0.0, dir.z, position.z);
  mmat[3] = vec4(0.0, 0.0, 0.0, 1.0);
  float cylZ = cylPosition.z * 0.5;
  float edgeRadius = (radius.r * (1.0 - cylZ) + targetRadius1.r * cylZ) * 0.3;
  gl_Position = ((vec4(cylPosition.xy * edgeRadius, cylZ * len, 1.0) * mmat) *
    vmat) * pmat;
  gl_Position.z *= gl_Position.w;
  vNormal = ((vec4(cylNormal.xy / edgeRadius, cylNormal.z * 2.0 / len, 0.0) *
    mmat) * vmat).xyz;
  vColour = colour;
  if (colour.a == 0.0 || displacementOccupancy1.a == 0.0) {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
}`

export const DRAW_HALF_BONDS_INFO_VS = `#version 300 es
layout(location = 0) in vec3 cylPosition;
layout(location = 1) in vec3 position;
layout(location = 2) in vec4 radius;
layout(location = 3) in uvec4 info;
layout(location = 4) in vec4 displacementOccupancy1;
layout(location = 5) in vec4 targetRadius1;
uniform mat4 vmat, pmat;
flat out uvec4 vColour;
void main() {
  vec3 dir = displacementOccupancy1.xyz;
  float len = length(dir);
  dir /= len;
  float snth = length(dir.xy);
  float csph = snth == 0.0 ? 1.0 : dir.x / snth;
  float snph = snth == 0.0 ? 0.0 : dir.y / snth;
  mat4 mmat;
  mmat[0] = vec4(csph * dir.z, -snph, dir.x, position.x);
  mmat[1] = vec4(snph * dir.z, csph, dir.y, position.y);
  mmat[2] = vec4(-snth, 0.0, dir.z, position.z);
  mmat[3] = vec4(0.0, 0.0, 0.0, 1.0);
  float cylZ = cylPosition.z * 0.5;
  float edgeRadius = (radius.r * (1.0 - cylZ) + targetRadius1.r * cylZ) * 0.3;
  gl_Position = ((vec4(cylPosition.xy * edgeRadius, cylZ * len, 1.0) * mmat) *
    vmat) * pmat;
  gl_Position.z *= gl_Position.w;
  vColour = info;
  if (radius.r == 0.0 || displacementOccupancy1.a == 0.0) {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
}`

export const DRAW_CLUSTER_VERTICES_VS = `#version 300 es
layout(location = 0) in vec3 sphPosition;
layout(location = 1) in vec3 position;
layout(location = 2) in uvec4 info;
layout(location = 3) in vec4 displacementOccupancy1;
layout(location = 4) in vec4 targetColour1;
layout(location = 5) in vec4 targetRadius1;
uniform mat4 vmat, pmat;
out vec3 vNormal;
out vec4 vColour;
void main() {
  vec4 vpos = vec4(position + displacementOccupancy1.xyz, 1.0) * vmat;
  vec3 dir = normalize(-vpos.xyz);
  float snth = length(dir.xy);
  float csph = snth == 0.0 ? 1.0 : dir.x / snth;
  float snph = snth == 0.0 ? 0.0 : dir.y / snth;
  mat4 mmat;
  mmat[0] = vec4(csph * dir.z, -snph, dir.x, vpos.x);
  mmat[1] = vec4(snph * dir.z, csph, dir.y, vpos.y);
  mmat[2] = vec4(-snth, 0.0, dir.z, vpos.z);
  mmat[3] = vec4(0.0, 0.0, 0.0, 1.0);
  gl_Position = vec4(targetRadius1.r * sphPosition, 1.0) * mmat * pmat;
  gl_Position.z *= gl_Position.w;
  vNormal = (vec4(sphPosition, 0.0) * mmat).xyz;
  vColour = targetColour1;
  if (info[0] == ${TYPEID_NONE}u || displacementOccupancy1.a == 0.0) {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
}`

export const DRAW_CLUSTER_VERTICES_INFO_VS = `#version 300 es
layout(location = 0) in vec3 sphPosition;
layout(location = 1) in vec3 position;
layout(location = 2) in uvec4 info;
layout(location = 3) in vec4 displacementOccupancy1;
layout(location = 4) in vec4 targetRadius1;
uniform mat4 vmat, pmat;
flat out uvec4 vColour;
void main() {
  vec4 vpos = vec4(position + displacementOccupancy1.xyz, 1.0) * vmat;
  vec3 dir = normalize(-vpos.xyz);
  float snth = length(dir.xy);
  float csph = snth == 0.0 ? 1.0 : dir.x / snth;
  float snph = snth == 0.0 ? 0.0 : dir.y / snth;
  mat4 mmat;
  mmat[0] = vec4(csph * dir.z, -snph, dir.x, vpos.x);
  mmat[1] = vec4(snph * dir.z, csph, dir.y, vpos.y);
  mmat[2] = vec4(-snth, 0.0, dir.z, vpos.z);
  mmat[3] = vec4(0.0, 0.0, 0.0, 1.0);
  gl_Position = vec4(targetRadius1.r * sphPosition, 1.0) * mmat * pmat;
  gl_Position.z *= gl_Position.w;
  vColour = info;
  if (info[0] == ${TYPEID_NONE}u || displacementOccupancy1.a == 0.0) {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
  vColour = info;
}`

export const DRAW_CLUSTER_EDGES_VS = `#version 300 es
layout(location = 0) in vec3 cylPosition;
layout(location = 1) in vec3 cylNormal;
layout(location = 2) in vec3 position;
layout(location = 3) in vec4 colour;
layout(location = 4) in vec4 radius;
layout(location = 5) in vec4 displacementOccupancy1;
layout(location = 6) in vec4 displacementOccupancy2;
uniform mat4 vmat, pmat;
out vec3 vNormal;
out vec4 vColour;
void main() {
  vec3 dir = displacementOccupancy1.xyz - displacementOccupancy2.xyz;
  float len = length(dir);
  dir /= len;
  float snth = length(dir.xy);
  float csph = snth == 0.0 ? 1.0 : dir.x / snth;
  float snph = snth == 0.0 ? 0.0 : dir.y / snth;
  vec3 origin = position + displacementOccupancy2.xyz;
  mat4 mmat;
  mmat[0] = vec4(csph * dir.z, -snph, dir.x, origin.x);
  mmat[1] = vec4(snph * dir.z, csph, dir.y, origin.y);
  mmat[2] = vec4(-snth, 0.0, dir.z, origin.z);
  mmat[3] = vec4(0.0, 0.0, 0.0, 1.0);
  float edgeRadius = radius.r * 0.3;
  gl_Position = ((vec4(cylPosition.xy * edgeRadius, cylPosition.z * len, 1.0) *
    mmat) * vmat) * pmat;
  gl_Position.z *= gl_Position.w;
  vNormal = ((vec4(cylNormal.xy / edgeRadius, cylNormal.z / len, 0.0) * mmat) *
    vmat).xyz;
  vColour = colour;
  if (
    colour.a == 0.0 ||
    displacementOccupancy1.a == 0.0 ||
    displacementOccupancy2.a == 0.0
  ) {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
}`

export const DRAW_CLUSTER_EDGES_INFO_VS = `#version 300 es
layout(location = 0) in vec3 cylPosition;
layout(location = 1) in vec3 position;
layout(location = 2) in vec4 radius;
layout(location = 3) in uvec4 info;
layout(location = 4) in vec4 displacementOccupancy1;
layout(location = 5) in vec4 displacementOccupancy2;
uniform mat4 vmat, pmat;
flat out uvec4 vColour;
void main() {
  vec3 dir = displacementOccupancy1.xyz - displacementOccupancy2.xyz;
  float len = length(dir);
  dir /= len;
  float snth = length(dir.xy);
  float csph = snth == 0.0 ? 1.0 : dir.x / snth;
  float snph = snth == 0.0 ? 0.0 : dir.y / snth;
  vec3 origin = position + displacementOccupancy2.xyz;
  mat4 mmat;
  mmat[0] = vec4(csph * dir.z, -snph, dir.x, origin.x);
  mmat[1] = vec4(snph * dir.z, csph, dir.y, origin.y);
  mmat[2] = vec4(-snth, 0.0, dir.z, origin.z);
  mmat[3] = vec4(0.0, 0.0, 0.0, 1.0);
  float edgeRadius = radius.r * 0.3;
  gl_Position = ((vec4(cylPosition.xy * edgeRadius, cylPosition.z * len, 1.0) *
    mmat) * vmat) * pmat;
  gl_Position.z *= gl_Position.w;
  vColour = info;
  if (
    radius.r == 0.0 ||
    displacementOccupancy1.a == 0.0 ||
    displacementOccupancy2.a == 0.0
  ) {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
}`

export const DRAW_CLUSTER_FACES_VS = `#version 300 es
layout(location = 0) in int vId;
layout(location = 1) in vec3 position;
layout(location = 2) in vec4 colour;
layout(location = 3) in vec4 displacementOccupancy1;
layout(location = 4) in vec4 displacementOccupancy2;
layout(location = 5) in vec4 displacementOccupancy3;
uniform mat4 vmat, pmat;
out vec3 vPosition;
out vec4 vColour;
void main() {
  vec3 v[3] = vec3[3](
    position + displacementOccupancy1.xyz,
    position + displacementOccupancy2.xyz,
    position + displacementOccupancy3.xyz
  );
  gl_Position = vec4(v[vId], 1.0) * vmat;
  vPosition = gl_Position.xyz;
  gl_Position *= pmat;
  gl_Position.z *= gl_Position.w;
  vColour = colour;
  vColour.a *= 0.8;
  if (
    colour.a == 0.0 ||
    displacementOccupancy1.a == 0.0 ||
    displacementOccupancy2.a == 0.0 ||
    displacementOccupancy3.a == 0.0
  ) {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
}`

export const DRAW_CLUSTER_FACES_INFO_VS = `#version 300 es
layout(location = 0) in int vId;
layout(location = 1) in vec3 position;
layout(location = 2) in uvec4 info;
layout(location = 3) in vec4 displacementOccupancy1;
layout(location = 4) in vec4 displacementOccupancy2;
layout(location = 5) in vec4 displacementOccupancy3;
uniform mat4 vmat, pmat;
flat out uvec4 vColour;
void main() {
  vec3 v[3] = vec3[3](
    position + displacementOccupancy1.xyz,
    position + displacementOccupancy2.xyz,
    position + displacementOccupancy3.xyz
  );
  gl_Position = vec4(v[vId], 1.0) * vmat * pmat;
  gl_Position.z *= gl_Position.w;
  vColour = info;
  if (
    info[0] == ${TYPEID_NONE}u ||
    displacementOccupancy1.a == 0.0 ||
    displacementOccupancy2.a == 0.0 ||
    displacementOccupancy3.a == 0.0
  ) {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
}`

// export const DRAW_LINES_VS = `#version 300 es
// layout(location = 0) in vec3 position;
// layout(location = 1) in vec4 colour;
// uniform mat4 vpmat;
// uniform vec3 originOffset;
// out vec4 vColour;
// void main() {
//   gl_Position = vec4(position + originOffset, 1.0) * vpmat;
//   vColour = colour;
// }`

export const DRAW_ODFRAGS_VS = `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec4 colour;
layout(location = 2) in vec3 displacement;
uniform mat4 vmat, pmat;
out vec3 vPosition;
out vec4 vColour;
void main() {
  gl_PointSize = 5.0;
  gl_Position = vec4(position + displacement, 1.0) * vmat;
  vPosition = gl_Position.xyz;
  gl_Position *= pmat;
  gl_Position.z *= gl_Position.w;
  vColour = colour;
}`

export const DRAW_ODFRAGS_INFO_VS = `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in uvec4 info;
layout(location = 2) in vec3 displacement;
uniform mat4 vmat, pmat;
flat out uvec4 vColour;
void main() {
  gl_PointSize = 5.0;
  gl_Position = vec4(position + displacement, 1.0) * vmat * pmat;
  gl_Position.z *= gl_Position.w;
  vColour = info;
}`

/* @license-end */
