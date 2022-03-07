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

import React, { useRef, useState, useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'

// Drag & drop data formats
export const SPLITTABLE_PANEL_CONTROL = 'splittable-panel-control'

// class names
const SPLITTABLE_PANEL_CLASS_NAME = 'splittable-panel'
const SEPARATOR_CONTAINER_CLASS_NAME = 'splittable-panel-separator-container'
const VERTICAL_SEPARATOR_CLASS_NAME = 'splittable-panel-v-separator'
const HORIZONTAL_SEPARATOR_CLASS_NAME = 'splittable-panel-h-separator'
const SPLITTABLE_PANEL_CONTROL_V_SPLIT_CLASS_NAME =
  'splittable-panel-control-v-split'
const SPLITTABLE_PANEL_CONTROL_H_SPLIT_CLASS_NAME =
  'splittable-panel-control-h-split'

const initialState = { rootPanel: {} }

// actions
const V_SPLIT = 'V_SPLIT'
const H_SPLIT = 'H_SPLIT'
const SET_DATA = 'SET_DATA'
const MOVE_SEPARATOR = 'MOVE_SEPARATOR'
const RESET_PANELS = 'RESET_PANELS'

// action creator creators
export const vSplitCreator = (prefix = '') => splitAt => ({
  type: prefix + V_SPLIT,
  payload: { splitAt }
})

export const hSplitCreator = (prefix = '') => splitAt => ({
  type: prefix + H_SPLIT,
  payload: { splitAt }
})

export const setDataCreator = (prefix = '') => (setAt, data) => ({
  type: prefix + SET_DATA,
  payload: { setAt, data }
})

const moveSeparatorCreator = (prefix = '') => (id, moveTo) => ({
  type: prefix + MOVE_SEPARATOR,
  payload: { id, moveTo }
})

export const resetPanelsCreator = (prefix = '') => (state = initialState) => ({
  type: prefix + RESET_PANELS,
  payload: { state }
})

// helper functions
const getPanelById = (state, id = '', depth = 0) => {
  let subpanel
  switch (id[depth]) {
    case '_':
      subpanel = state.rootPanel
      break
    case 'L':
      subpanel = state.splitX ? state.subpanel1 : null
      break
    case 'R':
      subpanel = state.splitX ? state.subpanel2 : null
      break
    case 'T':
      subpanel = state.splitY ? state.subpanel1 : null
      break
    case 'B':
      subpanel = state.splitY ? state.subpanel2 : null
      break
    default:
      subpanel = null
  }
  if (!subpanel) {
    return null
  }
  depth += 1
  if (id.length === depth) {
    return subpanel
  }
  return getPanelById(subpanel, id, depth)
}

// reducers
const atReducer = (panel, x, y, reducer) => {
  if (panel.splitX) {
    if (x < panel.splitX) {
      x /= panel.splitX
      const prev = panel.subpanel1
      const subpanel = atReducer(prev, x, y, reducer)
      return prev === subpanel ? panel : { ...panel, subpanel1: subpanel }
    } else {
      x = (x - panel.splitX) / (1.0 - panel.splitX)
      const prev = panel.subpanel2
      const subpanel = atReducer(prev, x, y, reducer)
      return prev === subpanel ? panel : { ...panel, subpanel2: subpanel }
    }
  } else if (panel.splitY) {
    if (y < panel.splitY) {
      y /= panel.splitY
      const prev = panel.subpanel1
      const subpanel = atReducer(prev, x, y, reducer)
      return prev === subpanel ? panel : { ...panel, subpanel1: subpanel }
    } else {
      y = (y - panel.splitY) / (1.0 - panel.splitY)
      const prev = panel.subpanel2
      const subpanel = atReducer(prev, x, y, reducer)
      return prev === subpanel ? panel : { ...panel, subpanel2: subpanel }
    }
  } else {
    return reducer(panel, x, y)
  }
}

const vSplitReducer = (rootPanel, x, y) =>
  atReducer(rootPanel, x, y, (targetPanel, localX, localY) => {
    const splitX = localX
    if (splitX > 0.0 && splitX < 1.0) {
      return {
        ...targetPanel,
        splitX,
        subpanel1: targetPanel,
        subpanel2: targetPanel
      }
    } else {
      return targetPanel
    }
  })

const hSplitReducer = (rootPanel, x, y) =>
  atReducer(rootPanel, x, y, (targetPanel, localX, localY) => {
    const splitY = localY
    if (splitY > 0.0 && splitY < 1.0) {
      return {
        ...targetPanel,
        splitY,
        subpanel1: targetPanel,
        subpanel2: targetPanel
      }
    } else {
      return targetPanel
    }
  })

const setDataReducer = (rootPanel, x, y, data) =>
  atReducer(rootPanel, x, y, (targetPanel, localX, localY) => {
    const prev = targetPanel.data || {}
    if (Object.keys(data).every(key => data[key] === prev[key])) {
      return targetPanel
    } else {
      return {
        ...targetPanel,
        data: { ...prev, ...data }
      }
    }
  })

// target panel must exist
const moveSeparatorReducer = (panel, id, moveToX, moveToY, depth = 1) => {
  if (id.length === depth) {
    if (panel.splitX) {
      if (moveToX <= 0.0) {
        return panel.subpanel2
      } else if (moveToX >= 1.0) {
        return panel.subpanel1
      } else {
        return { ...panel, splitX: moveToX }
      }
    } else if (panel.splitY) {
      if (moveToY <= 0.0) {
        return panel.subpanel2
      } else if (moveToY >= 1.0) {
        return panel.subpanel1
      } else {
        return { ...panel, splitY: moveToY }
      }
    }
  }
  let subpanelKey
  switch (id[depth]) {
    case 'L':
      subpanelKey = 'subpanel1'
      moveToX /= panel.splitX
      break
    case 'T':
      subpanelKey = 'subpanel1'
      moveToY /= panel.splitY
      break
    case 'R':
      subpanelKey = 'subpanel2'
      moveToX = (moveToX - panel.splitX) / (1.0 - panel.splitX)
      break
    case 'B':
      subpanelKey = 'subpanel2'
      moveToY = (moveToY - panel.splitY) / (1.0 - panel.splitY)
      break
  }
  const prev = panel[subpanelKey]
  const subpanel = moveSeparatorReducer(prev, id, moveToX, moveToY, depth + 1)
  return subpanel === prev ? panel : { ...panel, [subpanelKey]: subpanel }
}

export const splittablePanelRoot = (
  state = initialState,
  action = { type: '' }
) => {
  switch (action.type) {
    case RESET_PANELS: {
      return {
        ...action.payload.state
      }
    }
    case V_SPLIT: {
      const [x, y] = action.payload.splitAt
      if (x > 0.0 && x < 1.0 && y > 0.0 && y < 1.0) {
        const prev = state.rootPanel
        const rootPanel = vSplitReducer(prev, x, y)
        return rootPanel === prev ? state : { ...state, rootPanel }
      } else {
        // no effect
        return state
      }
    }
    case H_SPLIT: {
      const [x, y] = action.payload.splitAt
      if (x > 0.0 && x < 1.0 && y > 0.0 && y < 1.0) {
        const prev = state.rootPanel
        const rootPanel = hSplitReducer(prev, x, y)
        return rootPanel === prev ? state : { ...state, rootPanel }
      } else {
        // no effect
        return state
      }
    }
    case SET_DATA: {
      const payload = action.payload
      const data = payload.data
      if (Object.keys(data || {}).length === 0) {
        // no effect
        return state
      }
      const [x, y] = payload.setAt
      if (x > 0.0 && x < 1.0 && y > 0.0 && y < 1.0) {
        const prev = state.rootPanel
        const rootPanel = setDataReducer(prev, x, y, data)
        return rootPanel === prev ? state : { ...state, rootPanel }
      } else {
        // no effect
        return state
      }
    }
    case MOVE_SEPARATOR: {
      const payload = action.payload
      const id = payload.id
      const target = getPanelById(state, id)
      if (target && target.subpanel1) {
        const prev = state.rootPanel
        const rootPanel = moveSeparatorReducer(prev, id, ...payload.moveTo)
        return rootPanel === prev ? state : { ...state, rootPanel }
      } else {
        // no target, or target is not splitted
        return state
      }
    }
    default: {
      return state
    }
  }
}

// components
const SplittablePanel = (
  { splitX, splitY, subpanel1, subpanel2, id, setMoveSeparatorTarget }
) => {
  const splitXPercent = useMemo(
    () => splitX ? splitX * 100 + '%' : null,
    [splitX]
  )
  const splitYPercent = useMemo(
    () => splitY ? splitY * 100 + '%' : null,
    [splitY]
  )
  const onMouseDown = useCallback(
    e => {
      setMoveSeparatorTarget(id)
      e.preventDefault()
    },
    [id, setMoveSeparatorTarget]
  )
  const SeparatorX = useMemo(
    () => React.createElement(
      'div',
      {
        className: VERTICAL_SEPARATOR_CLASS_NAME,
        onMouseDown
      }
    ),
    [onMouseDown]
  )
  const SeparatorY = useMemo(
    () => React.createElement(
      'div',
      {
        className: HORIZONTAL_SEPARATOR_CLASS_NAME,
        onMouseDown
      }
    ),
    [onMouseDown]
  )
  const VSubpanel1 = useMemo(
    () => React.createElement(
      SplittablePanel,
      {
        ...subpanel1,
        id: id + 'L',
        setMoveSeparatorTarget
      }
    ),
    [subpanel1, id, setMoveSeparatorTarget]
  )
  const VSubpanel2 = useMemo(
    () => React.createElement(
      SplittablePanel,
      {
        ...subpanel2,
        id: id + 'R',
        setMoveSeparatorTarget
      }
    ),
    [subpanel2, id, setMoveSeparatorTarget]
  )
  const HSubpanel1 = useMemo(
    () => React.createElement(
      SplittablePanel,
      {
        ...subpanel1,
        id: id + 'T',
        setMoveSeparatorTarget
      }
    ),
    [subpanel1, id, setMoveSeparatorTarget]
  )
  const HSubpanel2 = useMemo(
    () => React.createElement(
      SplittablePanel,
      {
        ...subpanel2,
        id: id + 'B',
        setMoveSeparatorTarget
      }
    ),
    [subpanel2, id, setMoveSeparatorTarget]
  )
  const VSplitPanel = useMemo(
    () => splitXPercent
      ? React.createElement(React.Fragment, null,
        React.createElement(
          'div',
          {
            className: SEPARATOR_CONTAINER_CLASS_NAME,
            style: { left: splitXPercent, width: '0%' }
          },
          SeparatorX
        ),
        React.createElement(
          'div',
          {
            className: SPLITTABLE_PANEL_CLASS_NAME,
            style: { width: splitXPercent }
          },
          VSubpanel1
        ),
        React.createElement(
          'div',
          {
            className: SPLITTABLE_PANEL_CLASS_NAME,
            style: {
              left: splitXPercent,
              width: `calc(100% - ${splitXPercent})`
            }
          },
          VSubpanel2
        )
      )
      : null,
    [splitXPercent, SeparatorX, VSubpanel1, VSubpanel2]
  )
  const HSplitPanel = useMemo(
    () => splitYPercent
      ? React.createElement(React.Fragment, null,
        React.createElement(
          'div',
          {
            className: SEPARATOR_CONTAINER_CLASS_NAME,
            style: { top: splitYPercent, height: '0%' }
          },
          SeparatorY
        ),
        React.createElement(
          'div',
          {
            className: SPLITTABLE_PANEL_CLASS_NAME,
            style: { height: splitYPercent }
          },
          HSubpanel1
        ),
        React.createElement(
          'div',
          {
            className: SPLITTABLE_PANEL_CLASS_NAME,
            style: {
              top: splitYPercent,
              height: `calc(100% - ${splitYPercent})`
            }
          },
          HSubpanel2
        )
      )
      : null,
    [splitYPercent, SeparatorY, HSubpanel1, HSubpanel2]
  )
  return splitXPercent ? VSplitPanel : splitYPercent ? HSplitPanel : null
}

export const VSplitButton = () => useMemo(
  () => React.createElement(
    'div',
    {
      className: SPLITTABLE_PANEL_CONTROL_V_SPLIT_CLASS_NAME,
      draggable: true,
      onDragStart: e => {
        e.dataTransfer.setData(SPLITTABLE_PANEL_CONTROL, V_SPLIT)
        e.dataTransfer.setData('text/plain', '')
        e.dataTransfer.effectAllowed = 'copy'
      }
    }
  ),
  []
)

export const HSplitButton = () => useMemo(
  () => React.createElement(
    'div',
    {
      className: SPLITTABLE_PANEL_CONTROL_H_SPLIT_CLASS_NAME,
      draggable: true,
      onDragStart: e => {
        e.dataTransfer.setData(SPLITTABLE_PANEL_CONTROL, H_SPLIT)
        e.dataTransfer.setData('text/plain', '')
        e.dataTransfer.effectAllowed = 'copy'
      }
    }
  ),
  []
)

const allowDrop = e => {
  if (e.dataTransfer.types[0] === SPLITTABLE_PANEL_CONTROL) {
    e.dataTransfer.dropEffect = 'copy'
    e.preventDefault()
  }
}

export const SplittablePanelRootCreator = (
  stateSelector = state => state,
  actionPrefix = ''
) => {
  const rootPanelSelector = state => stateSelector(state).rootPanel
  const vSplit = vSplitCreator(actionPrefix)
  const hSplit = hSplitCreator(actionPrefix)
  const setData = setDataCreator(actionPrefix)
  const moveSeparator = moveSeparatorCreator(actionPrefix)
  const SplittablePanelRoot = ({ children }) => {
    const rootPanel = useSelector(rootPanelSelector)
    const dispatch = useDispatch()
    const ref = useRef(null)
    const [moveSeparatorTarget, setMoveSeparatorTarget] = useState('')
    const onMouseMove = useMemo(
      () => moveSeparatorTarget
        ? e => {
          const x = e.clientX
          const y = e.clientY
          const clientRect = ref.current.getBoundingClientRect()
          const left = clientRect.left
          const right = clientRect.right
          const top = clientRect.top
          const bottom = clientRect.bottom
          const splitX = (x - left) / (right - left)
          const splitY = (y - top) / (bottom - top)
          dispatch(moveSeparator(moveSeparatorTarget, [splitX, splitY]))
        }
        : null,
      [moveSeparatorTarget, dispatch]
    )
    const onMouseUp = useMemo(
      () => onMouseMove
        ? e => {
          onMouseMove(e)
          setMoveSeparatorTarget('')
        }
        : null,
      [onMouseMove]
    )
    const onMouseLeave = useMemo(
      () => onMouseMove
        ? e => {
          onMouseMove(e)
          setMoveSeparatorTarget('')
        }
        : null,
      [onMouseMove]
    )
    const onDrop = useCallback(
      e => {
        const data = e.dataTransfer.getData(SPLITTABLE_PANEL_CONTROL)
        switch (data) {
          case V_SPLIT: {
            const x = e.clientX
            const y = e.clientY
            const clientRect = ref.current.getBoundingClientRect()
            const left = clientRect.left
            const right = clientRect.right
            const top = clientRect.top
            const bottom = clientRect.bottom
            const splitX = (x - left) / (right - left)
            const splitY = (y - top) / (bottom - top)
            dispatch(vSplit([splitX, splitY]))
            break
          }
          case H_SPLIT: {
            const x = e.clientX
            const y = e.clientY
            const clientRect = ref.current.getBoundingClientRect()
            const left = clientRect.left
            const right = clientRect.right
            const top = clientRect.top
            const bottom = clientRect.bottom
            const splitX = (x - left) / (right - left)
            const splitY = (y - top) / (bottom - top)
            dispatch(hSplit([splitX, splitY]))
            break
          }
          default: {
            const x = e.clientX
            const y = e.clientY
            const clientRect = ref.current.getBoundingClientRect()
            const left = clientRect.left
            const right = clientRect.right
            const top = clientRect.top
            const bottom = clientRect.bottom
            const setX = (x - left) / (right - left)
            const setY = (y - top) / (bottom - top)
            dispatch(setData([setX, setY], JSON.parse(data)))
            break
          }
        }
        e.preventDefault()
      },
      [dispatch]
    )
    const RootPanel = useMemo(
      () => React.createElement(
        SplittablePanel,
        {
          ...rootPanel,
          id: '_',
          setMoveSeparatorTarget
        }
      ),
      [rootPanel]
    )
    return useMemo(
      () => React.createElement(
        'div',
        {
          ref,
          className: SPLITTABLE_PANEL_CLASS_NAME,
          onMouseMove,
          onMouseUp,
          onMouseLeave,
          onDragEnter: allowDrop,
          onDragOver: allowDrop,
          onDrop
        },
        RootPanel,
        children
      ),
      [RootPanel, onMouseMove, onMouseUp, onMouseLeave, onDrop]
    )
  }
  return SplittablePanelRoot
}

/* @license-end */
