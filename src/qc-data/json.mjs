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

import { MultiKeyMap } from './dependencies.mjs'
import { rnum, lnum } from './linalg.mjs'
import { Quasicrystal } from '../legacy/quasicrystal.mjs'

const lnumReviver = lnum.reviver

export const replacer = function (key, value) {
  const type = Object.prototype.toString.call(value)
  switch (type) {
    case '[object Map]':
    case '[object MultiKeyMap]': {
      return { TYPE: type, ENTRIES: [...value] }
    }
  }
  return value
}

export const reviver = function (key, value) {
  if (value && typeof value === 'object' && value.TYPE) {
    switch (value.TYPE) {
      case '[object Map]': {
        return new Map(value.ENTRIES)
      }
      case '[object MultiKeyMap]': {
        return new MultiKeyMap(value.ENTRIES)
      }
    }
  }
  return lnumReviver(key, value)
}

// Known bug:
//   NaN is serialised into null,
//   and then if it is parsed into a number, it becomes 0.

export const legacyQCReviver = Quasicrystal.reviver(rnum, rnum.eps)

/* @license-end */
