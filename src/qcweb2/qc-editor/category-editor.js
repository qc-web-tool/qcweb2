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
import { LoopCategoryEditorCreator } from './loop-category-editor.js'
import { SetCategoryEditorCreator } from './set-category-editor.js'
import { selectDefinition } from '../../qc-data/methods.mjs'

export const CategoryEditor = ({
  quasicrystalSelector,
  actionPrefix,
  categoryId,
  dict,
  data
}) => {
  const catDef = useMemo(
    () => selectDefinition(dict, data, categoryId),
    [dict, data, categoryId]
  )
  const categoryClass = catDef.get(['definition', 'class'])
  return useMemo(
    () => {
      switch (categoryClass) {
        case 'loop': {
          return React.createElement(
            LoopCategoryEditorCreator(
              quasicrystalSelector,
              actionPrefix,
              categoryId
            )
          )
        }
        case 'set': {
          return React.createElement(
            SetCategoryEditorCreator(
              quasicrystalSelector,
              actionPrefix,
              categoryId
            )
          )
        }
        default: {
          return null
        }
      }
    },
    [quasicrystalSelector, actionPrefix, categoryId, categoryClass]
  )
}

/* @license-end */
