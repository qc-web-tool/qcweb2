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

export const TOL_CUT = 0.00001 // 32 / 2 ** 23

export const DATA_TEXTURE_WIDTH_BIT_LENGTH = 11
export const DATA_TEXTURE_WIDTH = 2 ** DATA_TEXTURE_WIDTH_BIT_LENGTH

export const SSGID_BIT_LENGTH = 8
export const MAX_SSG_COUNT = 2 ** SSGID_BIT_LENGTH
export const SSGID_BIT = MAX_SSG_COUNT - 1

export const ODID_BIT_LENGTH = 24
export const MAX_OD_COUNT = 2 ** ODID_BIT_LENGTH
export const ODID_BIT = MAX_OD_COUNT - 1 << SSGID_BIT_LENGTH
export const INVALID_ODID = MAX_OD_COUNT - 1

export const TYPEID_NONE = 0
export const TYPEID_OD = 1
export const TYPEID_ATOM = 2
export const TYPE_TEXT = ['None', 'Occupation domain', 'Atom', 'Bond']

export const SSG_TEXTURE_WIDTH_BIT_LENGTH = 11
export const SSG_TEXTURE_WIDTH = 2 ** SSG_TEXTURE_WIDTH_BIT_LENGTH
export const MAX_SSG_TEXTURE_WIDTH = 3 * MAX_SSG_COUNT // <= 2048 is assumed

export const CUT_TEXTURE_WIDTH_BIT_LENGTH = 8
export const CUT_TEXTURE_WIDTH = 2 ** CUT_TEXTURE_WIDTH_BIT_LENGTH
export const MAX_RFRACTLATT_COUNT = CUT_TEXTURE_WIDTH ** 2

export const SSG_TEXTURE_UNIT = 0
export const OD_COLOUR_RADIUS_TEXTURE_UNIT = 1
export const CUT_TEXTURE_UNIT = 2

export const ENVIRONMENT_UNIFORM_BINDING_POINT_INDEX = 0
export const CARTN_TRANSFORM_UNIFORM_BINDING_POINT_INDEX = 1
export const HIGHLIGHT_UNIFORM_BINDING_POINT_INDEX = 2

const ENVIRONMENT_UNIFORM_BLOCK_NAME = 'Environment'
export const ENVIRONMENT_UNIFORM_BLOCK_LAYOUT =
`layout(std140) uniform ${ENVIRONMENT_UNIFORM_BLOCK_NAME} {
  vec3 directionalLightDir;
  vec3 ambientLightColour;
};`
export const ENVIRONMENT_UNIFORM_BUFFER_SIZE = 32
export const ENVIRONMENT_UNIFORM_BLOCK_BINDING = {
  blockName: ENVIRONMENT_UNIFORM_BLOCK_NAME,
  bindingPointIndex: ENVIRONMENT_UNIFORM_BINDING_POINT_INDEX
}

const CARTN_TRANSFORM_UNIFORM_BLOCK_NAME = 'CartnTransform'
export const CARTN_TRANSFORM_UNIFORM_BLOCK_LAYOUT =
`layout(std140) uniform ${CARTN_TRANSFORM_UNIFORM_BLOCK_NAME} {
  mat3 aParCartn123;
  mat3 aParCartn456;
  mat3 aPerpCartn123;
  mat3 aPerpCartn456;
  vec3 originFract123;
  vec3 originFract456;
};`
export const CARTN_TRANSFORM_UNIFORM_BUFFER_SIZE = 224
export const CARTN_TRANSFORM_UNIFORM_BLOCK_BINDING = {
  blockName: CARTN_TRANSFORM_UNIFORM_BLOCK_NAME,
  bindingPointIndex: CARTN_TRANSFORM_UNIFORM_BINDING_POINT_INDEX
}

const HIGHLIGHT_UNIFORM_BLOCK_NAME = 'Highlight'
export const HIGHLIGHT_UNIFORM_BLOCK_LAYOUT =
`layout(std140) uniform ${HIGHLIGHT_UNIFORM_BLOCK_NAME} {
  float rCutParCartn;
  float baseRadius;
  float odBaseOpacity;
  vec4 unhighlightColourFactor;
  vec4 unhighlightRadiusFactor;
  uvec4 highlightRef;
  uvec4 highlightMask;
};`
export const HIGHLIGHT_UNIFORM_BUFFER_SIZE = 80
export const HIGHLIGHT_UNIFORM_BLOCK_BINDING = {
  blockName: HIGHLIGHT_UNIFORM_BLOCK_NAME,
  bindingPointIndex: HIGHLIGHT_UNIFORM_BINDING_POINT_INDEX
}

/* @license-end */
