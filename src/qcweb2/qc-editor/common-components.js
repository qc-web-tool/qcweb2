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

import React, { useCallback, useMemo, useState } from 'react'
import { newMatrix } from '../../qc-data/linalg.mjs'

export const ALERT_TEXT_CLASS_NAME = 'alert-text'

export const DeferredInput = (props) => {
  const { value, valueToString, stringToValue, onChange, options } = props
  const [isFocused, setIsFocused] = useState(false)
  const str = useMemo(
    () => valueToString ? valueToString(value) : value,
    [value, valueToString]
  )
  const onFocus = useCallback(
    e => {
      e.currentTarget.select()
      setIsFocused(true)
    },
    []
  )
  const onBlur = useCallback(
    e => {
      setIsFocused(false)
      const nextValue = stringToValue
        ? stringToValue(e.currentTarget.value)
        : e.currentTarget.value
      const nextStr = valueToString ? valueToString(nextValue) : nextValue
      if (nextStr !== str) {
        onChange && onChange(nextValue)
      }
    },
    [str, stringToValue, valueToString, onChange]
  )
  const onKeyDown = useCallback(
    e => {
      if (e.key === 'Enter') {
        const nextValue = stringToValue
          ? stringToValue(e.currentTarget.value)
          : e.currentTarget.value
        const nextStr = valueToString ? valueToString(nextValue) : nextValue
        if (nextStr === str) {
          onChange && onChange(nextValue)
        }
        e.currentTarget.blur()
      }
    },
    [str, stringToValue, valueToString, onChange]
  )
  return useMemo(
    () => React.createElement(
      'input',
      {
        ...options,
        onFocus,
        onBlur,
        onKeyDown,
        onChange: null,
        value: isFocused ? null : str
      }
    ),
    [str, isFocused, onBlur, options]
  )
}

const MatrixRowInput = (props) => {
  const { value, valueToString, stringToValue, onChange, options } = props
  return useMemo(
    () => React.createElement(
      'tr',
      null,
      value.map(
        (element, j) => React.createElement(
          'td',
          null,
          React.createElement(
            DeferredInput,
            {
              value: element,
              valueToString,
              stringToValue,
              onChange: nextValue => {
                const next = value.slice()
                next[j] = nextValue
                onChange(next)
              },
              options
            }
          )
        )
      )
    ),
    [value, valueToString, stringToValue, onChange, options]
  )
}

export const VectorInput = (props) => {
  const { value, valueToString, stringToValue, onChange, options } = props
  const dim = [value.getDim()[0]]
  return useMemo(
    () => React.createElement(
      'table',
      null,
      value.map(
        (element, i) => React.createElement(
          'tr',
          null,
          React.createElement(
            'td',
            null,
            React.createElement(
              DeferredInput,
              {
                value: element,
                valueToString,
                stringToValue,
                onChange: nextValue => {
                  const next = value.slice()
                  next[i] = nextValue
                  onChange(newMatrix(dim, next))
                },
                options
              }
            )
          )
        )
      )
    ),
    [value, valueToString, stringToValue, onChange, options]
  )
}

// onChange: ([e, j]) => ...
export const MatrixInput = (props) => {
  const { value, valueToString, stringToValue, onChange, options } = props
  const [dim0, dim1] = value.getDim()
  return useMemo(
    () => React.createElement(
      'table',
      null,
      Array(dim0).fill(null).map(
        (row, i) => {
          const start = i * dim1
          return React.createElement(
            MatrixRowInput,
            {
              value: value.slice(start, start + dim1),
              valueToString,
              stringToValue,
              onChange: nextRow => {
                const next = value.slice()
                for (let j = 0; j < dim1; j += 1) {
                  next[start + j] = nextRow[j]
                }
                onChange(newMatrix([dim0, dim1], next))
              },
              options
            }
          )
        }
      )
    ),
    [value, valueToString, stringToValue, onChange, options]
  )
}

export const ColourInput = (props) => {
  const { value, valueToString, stringToValue, onChange, options } = props
  const _onChange = useCallback(
    e => {
      const value = stringToValue
        ? stringToValue(e.currentTarget.value)
        : e.currentTarget.value
      onChange && onChange(value)
    },
    [stringToValue, onChange]
  )
  const str = useMemo(
    () => valueToString(value),
    [value, valueToString]
  )
  return useMemo(
    () => React.createElement(
      'input',
      {
        ...options,
        type: 'color',
        onChange: _onChange,
        value: str
      }
    ),
    [str, _onChange, options]
  )
}

/* @license-end */
