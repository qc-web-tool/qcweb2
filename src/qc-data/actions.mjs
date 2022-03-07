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

// actions
export const SET_CATEGORY_DATA = 'SET_CATEGORY_DATA'
export const RESET_QC_DATA = 'RESET_QC_DATA'

// action creator creators

// If packet is null and index is a valid index,
// then the packet at index is removed from the category.
// If an invalid index is supplied, then the packet is treated as a new packet.
export const setCategoryDataCreator = (
  prefix = ''
) => (
  categoryId, packet, index
) => ({
  type: prefix + SET_CATEGORY_DATA,
  payload: {
    categoryId: categoryId.toLowerCase(),
    packet,
    index
  }
})

export const resetQCDataCreator = (
  prefix = ''
) => (
  data
) => ({
  type: prefix + RESET_QC_DATA,
  payload: { data }
})

/* @license-end */
