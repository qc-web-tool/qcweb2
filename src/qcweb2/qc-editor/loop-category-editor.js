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
import { useSelector, useDispatch } from 'react-redux'
import { ItemEditor } from './item-editor.js'
import { ALERT_TEXT_CLASS_NAME } from './common-components.js'
import { selectDataItem } from '../../qc-data/methods.mjs'
import { setCategoryDataCreator } from '../../qc-data/actions.mjs'

export const LoopCategoryEditorCreator = (
  quasicrystalSelector = state => state,
  actionPrefix = '',
  catId
) => {
  const dictSelector =
    state => quasicrystalSelector(state).dictionary
  const dataSelector =
    state => quasicrystalSelector(state).data
  const setCategoryData = setCategoryDataCreator(actionPrefix)
  const LoopCategoryEditor = () => {
    const dispatch = useDispatch()
    const dict = useSelector(dictSelector)
    const data = useSelector(dataSelector)
    const dictCatItems = dict.get([catId, false]).get(['Items'])
    const { value: catData, alert } = useMemo(
      () => selectDataItem(dict, data, catId),
      [dict, data, catId]
    )
    const Header = useMemo(
      () => React.createElement(
        'tr',
        null,
        Array.from(dictCatItems,
          objId => React.createElement(
            'th',
            { key: objId },
            objId
          )
        ),
        React.createElement('td', null, '')
      ),
      [dictCatItems]
    )
    const trPackets = useMemo(
      () => catData.map(
        (packet, index) => React.createElement(
          'tr',
          { key: packet },
          Array.from(dictCatItems,
            objId => React.createElement(
              'td',
              { key: objId },
              React.createElement(
                ItemEditor,
                {
                  dict,
                  data,
                  categoryId: catId,
                  index,
                  objectId: objId,
                  packet,
                  setCategoryData
                }
              )
            )
          ),
          React.createElement(
            'td',
            null,
            React.createElement(
              'button',
              {
                onClick: () => {
                  dispatch(setCategoryData(catId, null, index))
                }
              },
              '\u{2212}'
            )
          )
        )
      ),
      [dispatch, dict, data, catId, dictCatItems, catData]
    )
    const Footer = useMemo(
      () => React.createElement(
        'button',
        {
          onClick: () => {
            const packet = new Map()
            dispatch(setCategoryData(catId, packet))
          }
        },
        '+'
      ),
      [dispatch, dict, data, catId]
    )
    return useMemo(
      () => React.createElement(
        'div',
        null,
        React.createElement(
          'span',
          { className: ALERT_TEXT_CLASS_NAME },
          alert
        ),
        React.createElement(
          'table',
          null,
          Header,
          trPackets
        ),
        Footer
      ),
      [alert, Header, trPackets, Footer]
    )
  }
  return LoopCategoryEditor
}

/* @license-end */
