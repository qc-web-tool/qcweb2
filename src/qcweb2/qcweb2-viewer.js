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

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useStore } from 'react-redux'
import {
  SplittablePanelRootCreator,
  VSplitButton,
  HSplitButton,
  setDataCreator
} from './splittable-panel.js'
import { QCWeb2CoreHandler } from './core/handler.js'

// class names
const VIEWER_CLASS_NAME = 'viewer'
const VIEWER_CONTROL_CLASS_NAME = 'viewer-control'
const CANVAS_CLASS_NAME = 'canvas'
const ON_CLASS_NAME = 'on'
const FPS_CLASS_NAME = 'fps'
const CAMERA_IS_ORTHOGRAPHIC_CLASS_NAME = 'camera-is-orthographic'

const SwitchBox = ({
  className,
  title,
  on,
  value,
  onValue,
  onClick
}) => useMemo(
  () => React.createElement(
    'div',
    {
      className: [
        className,
        on ? ON_CLASS_NAME : ''
      ].join(' '),
      title,
      onClick
    },
    on ? onValue : value
  ),
  [className, on, value, onValue, onClick]
)

export const QCWeb2ViewerCreator = (
  overlayPanelSelector,
  overlayPanelActionPrefix,
  quasicrystalSelector
) => {
  const OverlayPanel = SplittablePanelRootCreator(
    overlayPanelSelector, overlayPanelActionPrefix
  )
  const overlayPanelSetData = setDataCreator(overlayPanelActionPrefix)
  const QCWeb2Viewer = () => {
    const store = useStore()
    const qcweb2CoreHandler = useRef(null)
    const [fps, setFps] = useState(0)
    const [cameraIsOrthographic, setCameraIsOrthographic] = useState(false)
    const [info, setInfo] = useState('')
    const [highlightRef, setHighlightRef] = useState('')
    const [highlightMask, setHighlightMask] = useState(false)
    const [showAtoms, setShowAtoms] = useState(true)
    const [showAsymBonds, setShowAsymBonds] = useState(true)
    const [showBonds, setShowBonds] = useState(true)
    const [showVertices, setShowVertices] = useState(true)
    const [showEdges, setShowEdges] = useState(true)
    const [showFaces, setShowFaces] = useState(true)
    const [showODs, setShowODs] = useState(true)
    const refCanvas = useCallback(
      canvas => {
        if (canvas !== null) {
          qcweb2CoreHandler.current = new QCWeb2CoreHandler(
            canvas,
            store,
            overlayPanelSelector,
            quasicrystalSelector,
            overlayPanelSetData,
            {
              fps: fps => setFps(fps),
              showAtoms: showAtoms => setShowAtoms(showAtoms),
              showAsymBonds: showAsymBonds => setShowAsymBonds(showAsymBonds),
              showBonds: showBonds => setShowBonds(showBonds),
              showVertices: showVertices => setShowVertices(showVertices),
              showEdges: showEdges => setShowEdges(showEdges),
              showFaces: showFaces => setShowFaces(showFaces),
              showODs: showODs => setShowODs(showODs),
              cameraOrthographic:
                orthographic => setCameraIsOrthographic(orthographic),
              infoString: info => setInfo(info),
              highlightRefString: highlightRef => setHighlightRef(highlightRef),
              highlightMask: highlightMask => setHighlightMask(highlightMask)
            }
          )
        } else if (qcweb2CoreHandler.current) {
          qcweb2CoreHandler.current.destructor()
          qcweb2CoreHandler.current = null
        }
      },
      []
    )
    const qcweb2Canvas = useMemo(
      () => React.createElement(
        'canvas',
        {
          ref: refCanvas,
          className: CANVAS_CLASS_NAME,
          onMouseDown: e =>
            qcweb2CoreHandler.current &&
            qcweb2CoreHandler.current.onMouseDown(e),
          onMouseUp: e =>
            qcweb2CoreHandler.current &&
            qcweb2CoreHandler.current.onMouseUp(e),
          onMouseMove: e =>
            qcweb2CoreHandler.current &&
            qcweb2CoreHandler.current.onMouseMove(e),
          onMouseLeave: e =>
            qcweb2CoreHandler.current &&
            qcweb2CoreHandler.current.onMouseLeave(e),
          onMouseEnter: e =>
            qcweb2CoreHandler.current &&
            qcweb2CoreHandler.current.onMouseEnter(e),
          onDoubleClick: e =>
            qcweb2CoreHandler.current &&
            qcweb2CoreHandler.current.onDoubleClick(e),
          onWheel: e =>
            qcweb2CoreHandler.current &&
            qcweb2CoreHandler.current.onWheel(e)
        },
        'The HTML <canvas> element is not supported.'
      ),
      []
    )
    const main = useMemo(
      () => React.createElement(OverlayPanel, null, qcweb2Canvas),
      []
    )
    const control = useMemo(
      () => React.createElement(
        'div',
        { className: VIEWER_CONTROL_CLASS_NAME },
        React.createElement(VSplitButton),
        React.createElement(HSplitButton),
        React.createElement(
          SwitchBox,
          {
            className: 'show-atoms',
            title: 'show atoms',
            on: showAtoms,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleShowAtoms()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'show-asym-bonds',
            title: 'show asym bonds',
            on: showAsymBonds,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleShowAsymBonds()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'show-bonds',
            title: 'show bonds',
            on: showBonds,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleShowBonds()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'show-vertices',
            title: 'show cluster vertices',
            on: showVertices,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleShowVertices()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'show-edges',
            title: 'show cluster edges',
            on: showEdges,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleShowEdges()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'show-faces',
            title: 'show cluster faces',
            on: showFaces,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleShowFaces()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'show-ods',
            title: 'show occupation domains',
            on: showODs,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleShowODs()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: CAMERA_IS_ORTHOGRAPHIC_CLASS_NAME,
            title: 'toggle projection mode',
            on: cameraIsOrthographic,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleCameraProjectionMode()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'reset-origin',
            title: 'reset origin',
            on: true,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.resetOrigin()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'camera-par',
            title: 'set parallel camera',
            on: true,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.setCameraPar()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'camera-perp',
            title: 'set perpendicular camera',
            on: true,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.setCameraPerp()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'od-base-opacity',
            title: 'set od base opacity',
            on: true,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.setODBaseOpacity()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'info-type',
            title: 'info: type',
            on: highlightMask.type,
            value: info.type,
            onValue: highlightRef.type,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleHighlightMaskType()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'info-od',
            title: 'info: od',
            on: highlightMask.od,
            value: info.odLabel,
            onValue: highlightRef.odLabel,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleHighlightMaskOD()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'info-ssg',
            title: 'info: ssg',
            on: highlightMask.ssg,
            value: info.ssgId,
            onValue: highlightRef.ssgId,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleHighlightMaskSSG()
          }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'info-latt',
            title: 'info: lattice',
            on: highlightMask.latt,
            value: info.lattFractCoord,
            onValue: highlightRef.lattFractCoord,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.toggleHighlightMaskLatt()
          }
        ),
        React.createElement(
          SwitchBox, { className: FPS_CLASS_NAME, value: fps }
        ),
        React.createElement(
          SwitchBox,
          {
            className: 'show-help',
            title: 'show help',
            on: true,
            onClick: () =>
              qcweb2CoreHandler.current &&
              qcweb2CoreHandler.current.showHelp()
          }
        )
      ),
      [
        fps,
        cameraIsOrthographic,
        info,
        highlightRef,
        highlightMask,
        showAtoms,
        showAsymBonds,
        showBonds,
        showVertices,
        showEdges,
        showFaces,
        showODs
      ]
    )
    return useMemo(
      () => React.createElement(
        'div',
        { className: VIEWER_CLASS_NAME },
        main,
        control
      ),
      [control]
    )
  }
  return QCWeb2Viewer
}

/* @license-end */
