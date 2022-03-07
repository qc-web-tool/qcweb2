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

import { ENVIRONMENT_UNIFORM_BLOCK_LAYOUT } from './constants.js'

export const SIMPLE_FS = `#version 300 es
precision highp float;
in vec4 vColour;
layout(location = 0) out vec4 outColour;
void main() {
  outColour = vColour;
}`

export const SIMPLE_FS_DUMMY_POSITION = `#version 300 es
precision highp float;
in vec3 vPosition;
in vec4 vColour;
layout(location = 0) out vec4 outColour;
void main() {
  outColour = vColour;
}`

export const SIMPLE_UINT_FS = `#version 300 es
precision highp int;
flat in uvec4 vColour;
layout(location = 0) out uvec4 outColour;
void main() {
  outColour = vColour;
}`

// ad hoc implementation
export const NORMAL_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec4 vColour;
${ENVIRONMENT_UNIFORM_BLOCK_LAYOUT}
uniform float reflectivity;
layout(location = 0) out vec4 outColour;
void main() {
  vec3 normal = normalize(vNormal);
  vec3 normalLightDir = -normalize(directionalLightDir);
  float cos = dot(normal, normalLightDir);
  outColour = vec4(
    2.0 * vColour.xyz * ((1.0 - reflectivity) * max(cos, 0.0)
    + (1.0 - abs(cos)) * ambientLightColour)
    + reflectivity * vec3(pow(clamp(dot(normal,
    normalize(normalLightDir + vec3(0, 0, 1))), 0.0, 1.0), 5.0)), vColour.a *
    smoothstep(0.0, 1.0, 3.0 * gl_FragCoord.z));
}`

// ad hoc implementation
export const FLAT_FS = `#version 300 es
precision highp float;
in vec3 vPosition;
in vec4 vColour;
${ENVIRONMENT_UNIFORM_BLOCK_LAYOUT}
uniform float reflectivity;
layout(location = 0) out vec4 outColour;
void main() {
  vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
  vec3 normalLightDir = -normalize(directionalLightDir);
  float cos = dot(normal, normalLightDir);
  outColour = vec4(
    2.0 * vColour.xyz * ((1.0 - reflectivity) * max(cos, 0.0)
    + (1.0 - abs(cos)) * ambientLightColour)
    + reflectivity * vec3(pow(clamp(dot(normal,
    normalize(normalLightDir + vec3(0, 0, 1))), 0.0, 1.0), 5.0)), vColour.a *
    smoothstep(0.0, 1.0, 3.0 * gl_FragCoord.z));
}`

export const WHITE_FS = `#version 300 es
precision highp float;
layout(location = 0) out vec4 outColour;
void main() {
  outColour = vec4(1.0, 1.0, 1.0, 1.0);
}`

export const DUMMY_FS = `#version 300 es
void main() {
  discard;
}`

/* @license-end */
