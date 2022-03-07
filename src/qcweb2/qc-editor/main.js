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

import React, { useCallback, useMemo } from 'react'
import { Tabs, TabList, Tab, TabPanel } from 'react-tabs'
import { useSelector, useDispatch } from 'react-redux'
import { toCanonicalCaseFold } from '@kkitahara/unicode-tools'
import { CategoryEditor } from './category-editor.js'
import { legacyQCReviver } from '../../qc-data/json.mjs'
// import { fromCIFString } from '../../legacy/from-cif-string.mjs'
import { storedItem } from '../../qc-data/methods.mjs'
import { resetQCDataCreator } from '../../qc-data/actions.mjs'
import { newMatrix } from '../../qc-data/linalg.mjs'
import { resetPanelsCreator } from '../splittable-panel.js'

// class names
const QC_EDITOR_CLASS_NAME = 'qc-editor'

const QCEditorMain = ({
  resetQCData,
  resetPanels
}) => {
  const dispatch = useDispatch()
  const onChange = useCallback(
    e => {
      const files = e.currentTarget.files
      if (files.length === 1) {
        const file = files[0]
        const reader = new window.FileReader()
        reader.onload = e => {
          const qc = /\.json$/.test(file.name)
            ? JSON.parse(e.target.result, legacyQCReviver)
            : /\.cif$/.test(file.name)
              ? null // fromCIFString(e.target.result)
              : null
          if (!qc) {
            return
          }
          const data = new Map()
          const dim = qc.dim
          data.set('cell', new Map([
            ['parallel_space_dimension', storedItem(qc.dimPar)],
            ['perpendicular_space_dimension', storedItem(qc.dimPerp)],
            ['basis_parallel_no_strain', storedItem(qc.aParCartn)],
            [
              'basis_perpendicular_no_strain',
              storedItem(qc.aPerpCartnNoPhason)
            ],
            ['origin_fract', storedItem(qc._originFract.setDim(dim))],
            ['linear_phason_strain_matrix', storedItem(qc._phasonMatrix)]
          ]))
          const ssgFractNoPhasonSymop = qc.ssgFractNoPhason.symop
          data.set('superspace_group_symop', ssgFractNoPhasonSymop.map(
            g => new Map([
              ['r', storedItem(g.rot)],
              ['t', storedItem(g.trans.setDim(dim))]
            ])
          ))
          const atomSites = qc.getAtomSiteEntries()
          data.set('atom_site', atomSites.map(
            ([label, site]) => new Map([
              ['label', storedItem(toCanonicalCaseFold(label))],
              ['fract_coord', storedItem(newMatrix([dim], site.posFract))]
            ])
          ))
          const ods = qc.getAtomicSurfaceEntries()
          data.set('occupation_domain', ods.map(
            ([label, od]) => new Map([
              ['label', storedItem(toCanonicalCaseFold(label))],
              [
                'atom_site_label',
                storedItem(toCanonicalCaseFold(od.atomSiteLabel))
              ], [
                'polytope_asymmetric_unit',
                storedItem(od.occDomainAsym.polytope)
              ], [
                'display_colour',
                storedItem(od.displayColour || null)
              ], [
                'display_opacity',
                storedItem(od.displayOpacity || null)
              ], [
                'display_radius',
                storedItem(od.displayRadius || null)
              ]
            ])
          ))
          const aux = qc.aux
          if (aux) {
            const overlayPanelState = aux.overlayPanelState
            if (overlayPanelState) {
              dispatch(resetPanels(overlayPanelState))
            }
            const asymBond = aux.asym_bond
            if (asymBond) {
              data.set('asym_bond', asymBond.map(
                ({
                  atom_site_label_1: atomSiteLabel1,
                  symop_id_1: symopId1,
                  cell_translation_1: cellTranslation1,
                  atom_site_label_2: atomSiteLabel2,
                  symop_id_2: symopId2,
                  cell_translation_2: cellTranslation2
                }) => new Map([
                  [
                    'atom_site_label_1',
                    storedItem(toCanonicalCaseFold(atomSiteLabel1))
                  ], [
                    'symop_id_1',
                    storedItem(symopId1)
                  ], [
                    'cell_translation_1',
                    storedItem(newMatrix([dim], cellTranslation1))
                  ], [
                    'atom_site_label_2',
                    storedItem(toCanonicalCaseFold(atomSiteLabel2))
                  ], [
                    'symop_id_2',
                    storedItem(symopId2)
                  ], [
                    'cell_translation_2',
                    storedItem(newMatrix([dim], cellTranslation2))
                  ]
                ])
              ))
            }
            const geomBond = aux.geom_bond
            if (geomBond) {
              data.set('geom_bond', geomBond.map(
                ({
                  atom_site_label_1: atomSiteLabel1,
                  symop_id_1: symopId1,
                  cell_translation_1: cellTranslation1,
                  atom_site_label_2: atomSiteLabel2,
                  symop_id_2: symopId2,
                  cell_translation_2: cellTranslation2
                }) => new Map([
                  [
                    'atom_site_label_1',
                    storedItem(toCanonicalCaseFold(atomSiteLabel1))
                  ], [
                    'symop_id_1',
                    storedItem(symopId1)
                  ], [
                    'cell_translation_1',
                    storedItem(newMatrix([dim], cellTranslation1))
                  ], [
                    'atom_site_label_2',
                    storedItem(toCanonicalCaseFold(atomSiteLabel2))
                  ], [
                    'symop_id_2',
                    storedItem(symopId2)
                  ], [
                    'cell_translation_2',
                    storedItem(newMatrix([dim], cellTranslation2))
                  ]
                ])
              ))
            }
            const clusterVertex = aux.cluster_vertex
            if (clusterVertex) {
              data.set('cluster_vertex', clusterVertex.map(
                ({
                  atom_site_label: atomSiteLabel,
                  symop_id: symopId,
                  cell_translation: cellTranslation,
                  atom_site_label_1: atomSiteLabel1,
                  symop_id_1: symopId1,
                  cell_translation_1: cellTranslation1
                }) => new Map([
                  [
                    'atom_site_label',
                    storedItem(toCanonicalCaseFold(atomSiteLabel))
                  ], [
                    'symop_id',
                    storedItem(symopId)
                  ], [
                    'cell_translation',
                    storedItem(newMatrix([dim], cellTranslation))
                  ], [
                    'atom_site_label_1',
                    storedItem(toCanonicalCaseFold(atomSiteLabel1))
                  ], [
                    'symop_id_1',
                    storedItem(symopId1)
                  ], [
                    'cell_translation_1',
                    storedItem(newMatrix([dim], cellTranslation1))
                  ]
                ])
              ))
            }
            const clusterEdge = aux.cluster_edge
            if (clusterEdge) {
              data.set('cluster_edge', clusterEdge.map(
                ({
                  atom_site_label: atomSiteLabel,
                  symop_id: symopId,
                  cell_translation: cellTranslation,
                  atom_site_label_1: atomSiteLabel1,
                  symop_id_1: symopId1,
                  cell_translation_1: cellTranslation1,
                  atom_site_label_2: atomSiteLabel2,
                  symop_id_2: symopId2,
                  cell_translation_2: cellTranslation2
                }) => new Map([
                  [
                    'atom_site_label',
                    storedItem(toCanonicalCaseFold(atomSiteLabel))
                  ], [
                    'symop_id',
                    storedItem(symopId)
                  ], [
                    'cell_translation',
                    storedItem(newMatrix([dim], cellTranslation))
                  ], [
                    'atom_site_label_1',
                    storedItem(toCanonicalCaseFold(atomSiteLabel1))
                  ], [
                    'symop_id_1',
                    storedItem(symopId1)
                  ], [
                    'cell_translation_1',
                    storedItem(newMatrix([dim], cellTranslation1))
                  ], [
                    'atom_site_label_2',
                    storedItem(toCanonicalCaseFold(atomSiteLabel2))
                  ], [
                    'symop_id_2',
                    storedItem(symopId2)
                  ], [
                    'cell_translation_2',
                    storedItem(newMatrix([dim], cellTranslation2))
                  ]
                ])
              ))
            }
            const clusterFace = aux.cluster_face
            if (clusterFace) {
              data.set('cluster_face', clusterFace.map(
                ({
                  atom_site_label: atomSiteLabel,
                  symop_id: symopId,
                  cell_translation: cellTranslation,
                  atom_site_label_1: atomSiteLabel1,
                  symop_id_1: symopId1,
                  cell_translation_1: cellTranslation1,
                  atom_site_label_2: atomSiteLabel2,
                  symop_id_2: symopId2,
                  cell_translation_2: cellTranslation2,
                  atom_site_label_3: atomSiteLabel3,
                  symop_id_3: symopId3,
                  cell_translation_3: cellTranslation3
                }) => new Map([
                  [
                    'atom_site_label',
                    storedItem(toCanonicalCaseFold(atomSiteLabel))
                  ], [
                    'symop_id',
                    storedItem(symopId)
                  ], [
                    'cell_translation',
                    storedItem(newMatrix([dim], cellTranslation))
                  ], [
                    'atom_site_label_1',
                    storedItem(toCanonicalCaseFold(atomSiteLabel1))
                  ], [
                    'symop_id_1',
                    storedItem(symopId1)
                  ], [
                    'cell_translation_1',
                    storedItem(newMatrix([dim], cellTranslation1))
                  ], [
                    'atom_site_label_2',
                    storedItem(toCanonicalCaseFold(atomSiteLabel2))
                  ], [
                    'symop_id_2',
                    storedItem(symopId2)
                  ], [
                    'cell_translation_2',
                    storedItem(newMatrix([dim], cellTranslation2))
                  ], [
                    'atom_site_label_3',
                    storedItem(toCanonicalCaseFold(atomSiteLabel3))
                  ], [
                    'symop_id_3',
                    storedItem(symopId3)
                  ], [
                    'cell_translation_3',
                    storedItem(newMatrix([dim], cellTranslation3))
                  ]
                ])
              ))
            }
          }
          dispatch(resetQCData(data))
        }
        reader.readAsText(file)
      }
    },
    [dispatch, resetQCData]
  )
  return useMemo(
    () => React.createElement(
      'div',
      null,
      React.createElement(
        'input',
        {
          type: 'file',
          accept: '.json,.cif',
          onChange
        }
      )
    ),
    [onChange]
  )
}

export const QCEditorCreator = (
  quasicrystalSelector = state => state,
  qcEditorActionPrefix = '',
  overlayPanelActionPrefix = ''
) => {
  const dictSelector =
    state => quasicrystalSelector(state).dictionary
  const dataSelector =
    state => quasicrystalSelector(state).data
  const resetQCData = resetQCDataCreator(qcEditorActionPrefix)
  const resetPanels = resetPanelsCreator(overlayPanelActionPrefix)
  const QCEditor = () => {
    const dict = useSelector(dictSelector)
    const data = useSelector(dataSelector)
    const dictCats = dict.get(['Categories'])
    const tabHeadings = useMemo(
      () => Array.from(dictCats,
        catId => React.createElement(
          Tab, { key: catId }, catId.toUpperCase()
        )
      ),
      [dictCats]
    )
    const mainPanel = useMemo(
      () => React.createElement(
        TabPanel,
        null,
        React.createElement(
          QCEditorMain,
          { resetQCData, resetPanels }
        )
      ),
      []
    )
    const tabPanels = useMemo(
      () => Array.from(dictCats,
        catId => React.createElement(
          TabPanel,
          { key: catId },
          React.createElement(
            CategoryEditor,
            {
              quasicrystalSelector,
              actionPrefix: qcEditorActionPrefix,
              categoryId: catId,
              dict,
              data
            }
          )
        )
      ),
      [dictCats, dict, data]
    )
    // visibility filter ...
    //
    // ... visibility filter
    return useMemo(
      () => React.createElement(
        Tabs,
        { className: QC_EDITOR_CLASS_NAME },
        React.createElement(
          TabList,
          null,
          React.createElement(Tab, null, '\u{2003}'),
          React.createElement(Tab, null, 'QC_EDITOR'),
          tabHeadings
        ),
        React.createElement(TabPanel),
        mainPanel,
        tabPanels
      ),
      [tabHeadings, tabPanels]
    )
  }
  return QCEditor
}

/* @license-end */
