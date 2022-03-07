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

import { SET_CATEGORY_DATA, RESET_QC_DATA } from './actions.mjs'
import { selectDefinition, selectDataItem } from './methods.mjs'
import { qcDict, qcEmptyData } from './qc-dict.mjs'

const initialState = {
  dictionary: qcDict,
  data: qcEmptyData
}

export const quasicrystal = (state = initialState, action = {}) => {
  switch (action.type) {
    case RESET_QC_DATA: {
      return {
        ...state,
        data: action.payload.data
      }
    }
    case SET_CATEGORY_DATA: {
      const dict = state.dictionary
      if (!dict) {
        return state
      }
      const data = state.data
      const payload = action.payload
      const catId = payload.categoryId
      const packet = payload.packet
      const catDef = selectDefinition(dict, data, catId)
      const catClass = catDef.get(['definition', 'class'])
      switch (catClass) {
        case 'loop': {
          const index = payload.index
          const cat = selectDataItem(dict, data, catId).value
          let nextCat
          if (Number.isInteger(index) && index >= 0 && index < cat.length) {
            if (packet === null) {
              // remove a packet
              nextCat = cat.filter((x, i) => i !== index)
            } else {
              // update a packet
              nextCat = cat.map(
                (x, i) => i === index ? new Map([...x, ...packet]) : x
              )
            }
          } else {
            // treated as a new packet
            if (packet === null) {
              // remove the new packet?, ignore
              return state
            } else {
              // add a packet
              nextCat = cat.concat(packet)
            }
          }
          return {
            ...state,
            data: new Map([...data, [catId, nextCat]])
          }
        }
        case 'set': {
          const cat = selectDataItem(dict, data, catId).value
          const nextCat = new Map([...cat, ...packet])
          return {
            ...state,
            data: new Map([...data, [catId, nextCat]])
          }
        }
        default: {
          // ignore categories other than 'set' and 'loop'
          return state
        }
      }
    }
    default: {
      return state
    }
  }
}

/* @license-end */
