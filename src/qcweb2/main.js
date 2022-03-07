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
import ReactDOM from 'react-dom'
import { createStore } from 'redux'
import { Provider } from 'react-redux'

import { splittablePanelRoot } from './splittable-panel.js'

import { QCWeb2ViewerCreator } from './qcweb2-viewer.js'

import { quasicrystal } from '../qc-data/reducer.mjs'
import { QCEditorCreator } from './qc-editor/main.js'

// actions
export const OVERLAY_PANEL_ACTION_PREFIX = 'overlay-panel-'
export const QC_EDITOR_ACTION_PREFIX = 'qc-editor-'

// class names
const QCWEB2_CLASS_NAME = 'qcweb2'

// reducer
const initialState = {
  quasicrystal: quasicrystal(),
  overlayPanel: splittablePanelRoot()
}

export const qcweb2 = (state = initialState, action = { type: '' }) => {
  const type = action.type
  if (type.indexOf(OVERLAY_PANEL_ACTION_PREFIX) === 0) {
    const prev = state.overlayPanel
    const next = splittablePanelRoot(
      prev,
      {
        ...action,
        type: type.slice(OVERLAY_PANEL_ACTION_PREFIX.length)
      }
    )
    return prev === next ? state : { ...state, overlayPanel: next }
  } else if (type.indexOf(QC_EDITOR_ACTION_PREFIX) === 0) {
    const prev = state.quasicrystal
    const next = quasicrystal(
      prev,
      {
        ...action,
        type: type.slice(QC_EDITOR_ACTION_PREFIX.length)
      }
    )
    return prev === next ? state : { ...state, quasicrystal: next }
  } else {
    return state
  }
}

// components
const QCWeb2Viewer = QCWeb2ViewerCreator(
  state => state.overlayPanel,
  OVERLAY_PANEL_ACTION_PREFIX,
  state => state.quasicrystal
)

const QCEditor = QCEditorCreator(
  state => state.quasicrystal,
  QC_EDITOR_ACTION_PREFIX,
  OVERLAY_PANEL_ACTION_PREFIX
)

const QCWeb2 = () => {
  const Viewer = useMemo(
    () => React.createElement(QCWeb2Viewer),
    []
  )
  const Editor = useMemo(
    () => React.createElement(QCEditor),
    []
  )
  return useMemo(
    () => React.createElement(
      'div',
      { className: QCWEB2_CLASS_NAME },
      Editor,
      Viewer
    ),
    [Viewer, Editor]
  )
}

// root renderer
export const renderQCWeb2Below = (rootElement) => {
  const store = createStore(qcweb2)
  ReactDOM.render(
    React.createElement(
      Provider,
      { store },
      React.createElement(QCWeb2)
    ),
    rootElement
  )
}

/* @license-end */
