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

import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { ItemEditor } from './item-editor.js'
import { setCategoryDataCreator } from '../../qc-data/actions.mjs'

export const SetCategoryEditorCreator = (
  quasicrystalSelector = state => state,
  actionPrefix = '',
  catId
) => {
  const dictSelector =
    state => quasicrystalSelector(state).dictionary
  const dataSelector =
    state => quasicrystalSelector(state).data
  const setCategoryData = setCategoryDataCreator(actionPrefix)
  const SetCategoryEditor = () => {
    const dict = useSelector(dictSelector)
    const data = useSelector(dataSelector)
    const dictCatItems = dict.get([catId, false]).get(['Items'])
    const itemDivs = useMemo(
      () => Array.from(dictCatItems,
        objId => React.createElement(
          'div',
          { key: objId },
          objId + ': ',
          React.createElement(
            ItemEditor,
            {
              dict,
              data,
              categoryId: catId,
              objectId: objId,
              setCategoryData
            }
          )
        )
      ),
      [dict, data, catId, dictCatItems]
    )
    return useMemo(
      () => React.createElement('div', null, itemDivs),
      [itemDivs]
    )
  }
  return SetCategoryEditor
}

/* @license-end */
