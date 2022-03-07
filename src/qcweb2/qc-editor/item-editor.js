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
import { useDispatch } from 'react-redux'
import { toCanonicalCaseFold } from '@kkitahara/unicode-tools'
import {
  DeferredInput,
  VectorInput,
  MatrixInput,
  ColourInput,
  ALERT_TEXT_CLASS_NAME
} from './common-components.js'
import {
  selectDefinition,
  selectDataItem,
  storedItem,
  selectValidatedDataItem
} from '../../qc-data/methods.mjs'

const ITEM_EDITOR_CLASS_NAME_PREFIX = 'item-editor-'
const InapplicableItem = () => React.createElement('span', null, '.')

export const ItemEditor = ({
  dict,
  data,
  categoryId,
  index = -1,
  objectId,
  packet = false,
  setCategoryData
}) => {
  const dispatch = useDispatch()
  const def = selectDefinition(dict, data, categoryId, objectId, packet)
  const { value, source, alert } =
    selectDataItem(dict, data, categoryId, objectId, packet)
  const container = def.get(['type', 'container'])
  const dimension = def.get(['type', 'dimension'])
  const contents = def.get(['type', 'contents'])
  const Component = useMemo(
    () => {
      switch (container) {
        case 'matrix': {
          if (dimension === false) {
            return InapplicableItem
          }
          switch (dimension.length) {
            case 1: {
              return VectorInput
            }
            case 2: {
              return MatrixInput
            }
            default: {
              return DeferredInput
            }
          }
        }
        case 'single': {
          switch (contents) {
            case 'colour': {
              return ColourInput
            }
            default: {
              return DeferredInput
            }
          }
        }
        default: {
          return DeferredInput
        }
      }
    },
    [container, dimension, contents]
  )
  const options = useMemo(
    () => {
      switch (contents) {
        case 'count':
        case 'index':
        case 'integer':
        case 'real': {
          return { type: 'text' }
        }
        case 'text': {
          return { type: 'text' }
        }
        default: {
          return {}
        }
      }
    }
  )
  const valueToString = useMemo(
    () => {
      switch (contents) {
        case 'integer':
        case 'real': {
          return value =>
            value === null
              ? '?'
              : value === false
                ? '.'
                : value.toString()
        }
        case 'colour': {
          return value =>
            (value === null || value === false)
              ? '#000000'
              : value
        }
        case 'text':
        case 'code': {
          return value => value === null ? '?' : value === false ? '.' : value
        }
        default: {
          return value => value === null ? '?' : value === false ? '.' : value
        }
      }
    },
    [contents]
  )
  const stringToValue = useMemo(
    () => {
      switch (contents) {
        case 'integer': {
          return str =>
            str === '?'
              ? null
              : str === '.'
                ? false
                : parseInt(str, 10)
        }
        case 'real': {
          return str =>
            str === '?'
              ? null
              : str === '.'
                ? false
                : parseFloat(str)
        }
        case 'colour': {
          return str => str
        }
        case 'code': {
          return str =>
            str === '?'
              ? null
              : str === '.'
                ? false
                : toCanonicalCaseFold(str)
        }
        case 'text': {
          return str =>
            str === '?'
              ? null
              : str === '.'
                ? false
                : str
        }
        default: {
          return str =>
            str === '?'
              ? null
              : str === '.'
                ? false
                : str
        }
      }
    },
    [contents]
  )
  const onChange = useMemo(
    () => nextValue => {
      const next = selectValidatedDataItem(
        storedItem(nextValue), dict, data, categoryId, objectId, packet
      )
      if (!/^Throw: /.test(next.alert)) {
        const nextPacket = new Map([...(packet || []), [objectId, next]])
        dispatch(setCategoryData(categoryId, nextPacket, index))
      }
    },
    [
      value,
      dispatch,
      setCategoryData,
      dict,
      data,
      categoryId,
      index,
      objectId,
      packet
    ]
  )
  return useMemo(
    () => React.createElement(
      'span',
      {
        className:
          ITEM_EDITOR_CLASS_NAME_PREFIX + source + (alert ? '-alert' : ''),
        title: source
      },
      React.createElement(
        Component,
        {
          options,
          value,
          source,
          valueToString,
          stringToValue,
          onChange
        }
      ),
      React.createElement(
        'span',
        { className: ALERT_TEXT_CLASS_NAME },
        alert
      )
    ),
    [
      Component,
      options,
      value,
      source,
      alert,
      valueToString,
      stringToValue,
      onChange
    ]
  )
}

/* @license-end */
