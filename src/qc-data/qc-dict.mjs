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

import { MultiKeyMap } from './dependencies.mjs'
import {
  evaluatedItem,
  defaultItem,
  selectDataItem
} from './methods.mjs'
import { lnum, newMatrix, identity } from './linalg.mjs'
import { toCanonicalCaseFold } from '@kkitahara/unicode-tools'

const newDimension = (...dimItems) => {
  if (
    dimItems.length === 0 ||
    dimItems.some(dim =>
      dim.alert ||
      !Number.isInteger(dim.value) ||
      dim.value < 0
    )
  ) {
    return false
  } else {
    return dimItems.map(dim => dim.value)
  }
}

const currentRow = (loopCat, packet) => {
  const index = loopCat.indexOf(packet)
  return index === -1 ? false : index
}

export const qcDict = new MultiKeyMap([
  [
    ['Categories'],
    new Set([
      'cell',
      // 'superspace_group',
      'superspace_group_symop',
      'atom_site',
      // 'model_site',
      'asym_bond',
      'geom_bond',
      'cluster_vertex',
      'cluster_edge',
      'cluster_face',
      'occupation_domain'
    ])
  ], [
    ['cell', false],
    new MultiKeyMap([
      [['definition', 'class'], 'set'],
      [
        ['Items'],
        new Set([
          'parallel_space_dimension',
          'perpendicular_space_dimension',
          'superspace_dimension',
          'basis_parallel_no_strain',
          'basis_perpendicular_no_strain',
          'origin_fract',
          'linear_phason_strain_matrix',
          'basis_no_strain',
          'reciprocal_basis_no_strain',
          'reciprocal_basis_perpendicular_no_strain',
          'basis_parallel',
          'basis_perpendicular',
          'basis',
          'reciprocal_basis'
        ])
      ]
    ])
  ], [
    ['superspace_group', false],
    new MultiKeyMap([
      [['definition', 'class'], 'set'],
      [
        ['Items'],
        new Set([
          'multiplicity',
          'multiplication_table_symop_id'
        ])
      ]
    ])
  ], [
    ['superspace_group_symop', false],
    new MultiKeyMap([
      [['definition', 'class'], 'loop'],
      [
        ['Items'],
        new Set([
          'id',
          'r',
          't',
          'r_perpendicular_no_strain',
          't_perpendicular_no_strain'
        ])
      ]
    ])
  ], [
    ['atom_site', false],
    new MultiKeyMap([
      [['definition', 'class'], 'loop'],
      [
        ['Items'],
        new Set([
          'label',
          'fract_coord'
        ])
      ], [
        ['method', 'Validation'],
        {
          function: (target, def, deps, dict, data) => {
            if (target.value === null) {
              return ''
            }
            const set = new Set()
            for (const packet of target.value) {
              const label = selectDataItem(
                dict, data, 'occupation_domain', 'label', packet
              )
              const folded = toCanonicalCaseFold(label.value)
              if (set.has(folded)) {
                const str = folded === null
                  ? '?'
                  : folded === false
                    ? '.'
                    : folded
                return `Alert A: labels are not unique (e.g. ${str}).`
              } else {
                set.add(folded)
              }
            }
            return ''
          },
          dependencies: [] // should be ['atom_site', 'label'], but will cause infinite loop
        }
      ]
    ])
  ], [
    ['model_site', false],
    new MultiKeyMap([
      [['definition', 'class'], 'loop'],
      [
        ['Items'],
        new Set([
          'label',
          'symop_id',
          'fract_coord'
        ])
      ], [
        ['method', 'Evaluation'],
        {
          function: (deps, def, dict, data) => {
            const [
              { alert },
              { value: labels },
              { value: fractCoords },
              { value: r },
              { value: t },
              { value: ssgId }
            ] = deps
            const ssgOrder = r.length
            if (alert || ssgOrder === 0) {
              return evaluatedItem([])
            }
            const modelSite = []
            for (let i = 0, n = labels.length; i < n; i += 1) {
              const label = labels[i].value
              const p = fractCoords[i].value
              const eqvPos = []
              for (let j = 0; j < ssgOrder; j += 1) {
                const rj = r[j].value
                const tj = t[j].value
                const idj = ssgId[j].value
                const pj = p && rj && tj
                  ? lnum.iadd(lnum.mmul(rj, p), tj)
                  : false
                if (eqvPos.every(({ p: pk }, k) => {
                  if ((!pj && !pk) || lnum.isInteger(lnum.sub(pj, pk))) {
                    eqvPos[k].symop.push(idj)
                    return false
                  }
                  return true
                })) {
                  eqvPos.push({ p: pj, symop: [idj] })
                }
              }
              modelSite.push(
                ...eqvPos.map(
                  eqvPosI => {
                    return new Map([
                      ['label', evaluatedItem(label)],
                      ['symop_id', evaluatedItem(eqvPosI.symop)],
                      ['fract_coord', evaluatedItem(eqvPosI.p)]
                    ])
                  }
                )
              )
            }
            return evaluatedItem(modelSite)
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label'],
            ['atom_site', 'fract_coord'],
            ['superspace_group_symop', 'r'],
            ['superspace_group_symop', 't'],
            ['superspace_group_symop', 'id']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: model_site may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['asym_bond', false],
    new MultiKeyMap([
      [['definition', 'class'], 'loop'],
      [
        ['Items'],
        new Set([
          'atom_site_label_1',
          'symop_id_1',
          'cell_translation_1',
          'atom_site_label_2',
          'symop_id_2',
          'cell_translation_2'
        ])
      ]
    ])
  ], [
    ['geom_bond', false],
    new MultiKeyMap([
      [['definition', 'class'], 'loop'],
      [
        ['Items'],
        new Set([
          'atom_site_label_1',
          'symop_id_1',
          'cell_translation_1',
          'atom_site_label_2',
          'symop_id_2',
          'cell_translation_2'
        ])
      ]
    ])
  ], [
    ['cluster_vertex', false],
    new MultiKeyMap([
      [['definition', 'class'], 'loop'],
      [
        ['Items'],
        new Set([
          'atom_site_label',
          'symop_id',
          'cell_translation',
          'atom_site_label_1',
          'symop_id_1',
          'cell_translation_1'
        ])
      ]
    ])
  ], [
    ['cluster_edge', false],
    new MultiKeyMap([
      [['definition', 'class'], 'loop'],
      [
        ['Items'],
        new Set([
          'atom_site_label',
          'symop_id',
          'cell_translation',
          'atom_site_label_1',
          'symop_id_1',
          'cell_translation_1',
          'atom_site_label_2',
          'symop_id_2',
          'cell_translation_2'
        ])
      ]
    ])
  ], [
    ['cluster_face', false],
    new MultiKeyMap([
      [['definition', 'class'], 'loop'],
      [
        ['Items'],
        new Set([
          'atom_site_label',
          'symop_id',
          'cell_translation',
          'atom_site_label_1',
          'symop_id_1',
          'cell_translation_1',
          'atom_site_label_2',
          'symop_id_2',
          'cell_translation_2',
          'atom_site_label_3',
          'symop_id_3',
          'cell_translation_3'
        ])
      ]
    ])
  ], [
    ['occupation_domain', false],
    new MultiKeyMap([
      [['definition', 'class'], 'loop'],
      [
        ['Items'],
        new Set([
          'label',
          'atom_site_label',
          // 'polytope_asymmetric_unit',
          'display_colour',
          'display_opacity',
          'display_radius'
        ])
      ], [
        ['method', 'Validation'],
        {
          function: (target, def, deps, dict, data) => {
            if (target.value === null) {
              return ''
            }
            const set = new Set()
            for (const packet of target.value) {
              const label = selectDataItem(
                dict, data, 'occupation_domain', 'label', packet
              )
              const folded = toCanonicalCaseFold(label.value)
              if (set.has(folded)) {
                const str =
                  folded === null
                    ? '?'
                    : folded === false
                      ? '.'
                      : folded
                return `Alert A: labels are not unique (e.g. ${str}).`
              } else {
                set.add(folded)
              }
            }
            return ''
          },
          dependencies: [] // should be ['occupation_domain', 'label'], but will cause infinite loop
        }
      ]
    ])
  ], [
    ['cell', 'parallel_space_dimension'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [['enumeration', 'range'], [1, 3]],
      [['enumeration', 'default'], defaultItem(3)]
    ])
  ], [
    ['cell', 'perpendicular_space_dimension'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [['enumeration', 'range'], [0, 3]],
      [['enumeration', 'default'], defaultItem(0)]
    ])
  ], [
    ['cell', 'superspace_dimension'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Evaluation'],
        {
          function: deps => {
            const [{ value: dimPar }, { value: dimPerp }] = deps
            return evaluatedItem(dimPar + dimPerp)
          },
          dependencies: [
            ['cell', 'parallel_space_dimension'],
            ['cell', 'perpendicular_space_dimension']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: superspace_dimension may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['cell', 'basis_parallel_no_strain'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dimPar, dim] = deps
            const dimension = newDimension(dimPar, dim)
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'parallel_space_dimension'],
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cell', 'basis_perpendicular_no_strain'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dimPerp, dim] = deps
            const dimension = newDimension(dimPerp, dim)
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'perpendicular_space_dimension'],
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cell', 'basis_no_strain'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension = newDimension(dim, dim)
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ], [
        ['method', 'Evaluation'],
        {
          function: (deps, def) => {
            const [
              { value: aParNoStrain },
              { value: aPerpNoStrain }
            ] = deps
            const dimension = def.get(['type', 'dimension'])
            const a = newMatrix(dimension, aParNoStrain.concat(aPerpNoStrain))
            return evaluatedItem(a)
          },
          dependencies: [
            ['cell', 'basis_parallel_no_strain'],
            ['cell', 'basis_perpendicular_no_strain']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: basis_no_strain may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['cell', 'reciprocal_basis_no_strain'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension = newDimension(dim, dim)
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ], [
        ['method', 'Evaluation'],
        {
          function: (deps, def) => {
            const [
              { value: aNoStrain }
            ] = deps
            const dimension = def.get(['type', 'dimension'])
            const aLU = lnum.lup(aNoStrain)
            let bNoStrain
            if (aLU.length > 0 && aLU[0] === 0) {
              // singular
              bNoStrain = newMatrix(dimension)
            } else {
              bNoStrain = lnum.isolve(aLU, identity(dimension[0]))
            }
            return evaluatedItem(bNoStrain)
          },
          dependencies: [
            ['cell', 'basis_no_strain']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: reciprocal_basis_no_strain may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['cell', 'reciprocal_basis_perpendicular_no_strain'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim, dimPerp] = deps
            const dimension = newDimension(dim, dimPerp)
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension'],
            ['cell', 'perpendicular_space_dimension']
          ]
        }
      ], [
        ['method', 'Evaluation'],
        {
          function: (deps, def) => {
            const [
              { value: bNoStrain }
            ] = deps
            const dimension = def.get(['type', 'dimension'])
            const colStart = dimension[0] - dimension[1]
            const bPerpNoStrain = newMatrix(
              dimension,
              bNoStrain.filter((x, i) => i % dimension[0] >= colStart)
            )
            return evaluatedItem(bPerpNoStrain)
          },
          dependencies: [
            ['cell', 'reciprocal_basis_no_strain']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: reciprocal_basis_perpendicular_no_strain may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['cell', 'origin_fract'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension = newDimension(dim)
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cell', 'linear_phason_strain_matrix'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dimPerp, dimPar] = deps
            const dimension = newDimension(dimPerp, dimPar)
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'perpendicular_space_dimension'],
            ['cell', 'parallel_space_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cell', 'basis_parallel'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dimPar, dim] = deps
            const dimension = newDimension(dimPar, dim)
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension]
            ])
          },
          dependencies: [
            ['cell', 'parallel_space_dimension'],
            ['cell', 'superspace_dimension']
          ]
        }
      ], [
        ['method', 'Evaluation'],
        {
          function: deps => {
            const [{ value: aParNoStrain }] = deps
            return evaluatedItem(aParNoStrain)
          },
          dependencies: [
            ['cell', 'basis_parallel_no_strain']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: basis_parallel may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['cell', 'basis_perpendicular'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dimPerp, dim] = deps
            const dimension = newDimension(dimPerp, dim)
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension]
            ])
          },
          dependencies: [
            ['cell', 'perpendicular_space_dimension'],
            ['cell', 'superspace_dimension']
          ]
        }
      ], [
        ['method', 'Evaluation'],
        {
          function: deps => {
            const [
              { value: aParNoStrain },
              { value: aPerpNoStrain },
              { value: phsMat }
            ] = deps
            const aPerp = lnum.iadd(
              lnum.mmul(phsMat, aParNoStrain), aPerpNoStrain
            )
            return evaluatedItem(aPerp)
          },
          dependencies: [
            ['cell', 'basis_parallel_no_strain'],
            ['cell', 'basis_perpendicular_no_strain'],
            ['cell', 'linear_phason_strain_matrix']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: basis_perpendicular may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['cell', 'basis'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension = newDimension(dim, dim)
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ], [
        ['method', 'Evaluation'],
        {
          function: (deps, def) => {
            const [
              { value: aPar },
              { value: aPerp }
            ] = deps
            const dimension = def.get(['type', 'dimension'])
            const a = newMatrix(dimension, aPar.concat(aPerp))
            return evaluatedItem(a)
          },
          dependencies: [
            ['cell', 'basis_parallel'],
            ['cell', 'basis_perpendicular']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: basis may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['cell', 'reciprocal_basis'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension = newDimension(dim, dim)
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ], [
        ['method', 'Evaluation'],
        {
          function: (deps, def) => {
            const [
              { value: a }
            ] = deps
            const dimension = def.get(['type', 'dimension'])
            const aLU = lnum.lup(a)
            let b
            if (aLU.length > 0 && aLU[0] === 0) {
              // singular
              b = newMatrix(dimension)
            } else {
              b = lnum.isolve(aLU, identity(dimension[0]))
            }
            return evaluatedItem(b)
          },
          dependencies: [
            ['cell', 'basis']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: reciprocal_basis may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['superspace_group', 'multiplicity'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Evaluation'],
        {
          function: (deps, def) => {
            const [
              { value: symops }
            ] = deps
            return evaluatedItem(symops.length)
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      // ], [
      //   ['method', 'Validation'],
      //   {
      //     function: () => 'Throw: multiplicity may not be assigned.',
      //     dependencies: []
      //   }
      ]
    ])
  ], [
    ['superspace_group', 'multiplication_table_symop_id'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [mult] = deps
            const dimension = newDimension(mult, mult)
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['superspace_group', 'multiplicity']
          ]
        }
      ], [
        ['method', 'Evaluation'],
        {
          function: (deps, def) => {
            const [
              { value: r },
              { value: t },
              { value: ssgId }
            ] = deps
            const dimension = def.get(['type', 'dimension'])
            const mult = dimension[0]
            const arr = []
            for (let i = 0; i < mult; i += 1) {
              for (let j = 0; j < mult; j += 1) {
                const rij = lnum.mmul(r[i].value, r[j].value)
                const tij =
                  lnum.add(lnum.mmul(r[i].value, t[j].value), t[i].value)
                let found = false
                for (let k = 0; k < mult; k += 1) {
                  if (
                    lnum.eq(rij, r[k].value) &&
                    lnum.isInteger(lnum.sub(tij, t[k].value))
                  ) {
                    found = true
                    arr.push(ssgId[k].value)
                    break
                  }
                }
                if (!found) {
                  return evaluatedItem(false)
                }
              }
            }
            return evaluatedItem(newMatrix(dimension, arr))
          },
          dependencies: [
            ['superspace_group_symop', 'r'],
            ['superspace_group_symop', 't'],
            ['superspace_group_symop', 'id']
          ]
        }
      // ], [
      //   ['method', 'Validation'],
      //   {
      //     function: () => 'Throw: multiplication_table_symop_id may not be assigned.',
      //     dependencies: []
      //   }
      ]
    ])
  ], [
    ['superspace_group_symop', 'id'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [['enumeration', 'range'], [1, Infinity]],
      [
        ['method', 'Evaluation'],
        {
          function: (deps, def, dict, data, currentPacket) => {
            const [{ value: ssgSymop }] = deps
            const index = currentRow(ssgSymop, currentPacket)
            if (index === false) {
              return evaluatedItem(false)
            } else {
              return evaluatedItem(index + 1)
            }
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: id may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['superspace_group_symop', 'r'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension = newDimension(dim, dim)
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['superspace_group_symop', 't'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension = newDimension(dim)
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['superspace_group_symop', 'r_perpendicular_no_strain'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dimPerp] = deps
            const dimension = newDimension(dimPerp, dimPerp)
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'perpendicular_space_dimension']
          ]
        }
      ], [
        ['method', 'Evaluation'],
        {
          function: deps => {
            const [
              { value: r },
              { value: aPerpNoStrain },
              { value: bPerpNoStrain }
            ] = deps
            const rPerpNoStrain = lnum.mmul(
              lnum.mmul(aPerpNoStrain, r), bPerpNoStrain
            )
            return evaluatedItem(rPerpNoStrain)
          },
          dependencies: [
            ['superspace_group_symop', 'r'],
            ['cell', 'basis_perpendicular_no_strain'],
            ['cell', 'reciprocal_basis_perpendicular_no_strain']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: r_perpendicular_no_strain may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['superspace_group_symop', 't_perpendicular_no_strain'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dimPerp] = deps
            const dimension = newDimension(dimPerp)
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'perpendicular_space_dimension']
          ]
        }
      ], [
        ['method', 'Evaluation'],
        {
          function: deps => {
            const [
              { value: t },
              { value: aPerpNoStrain }
            ] = deps
            const tPerpNoStrain = lnum.mmul(aPerpNoStrain, t)
            return evaluatedItem(tPerpNoStrain)
          },
          dependencies: [
            ['superspace_group_symop', 't'],
            ['cell', 'basis_perpendicular_no_strain']
          ]
        }
      ], [
        ['method', 'Validation'],
        {
          function: () => 'Throw: t_perpendicular_no_strain may not be assigned.',
          dependencies: []
        }
      ]
    ])
  ], [
    ['atom_site', 'label'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code']
    ])
  ], [
    ['atom_site', 'fract_coord'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['model_site', 'label'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code']
    ])
  ], [
    ['model_site', 'symop_id'],
    new MultiKeyMap([
      [['type', 'container'], 'list'],
      [['type', 'contents'], 'integer'],
      [['type', 'dimension'], []]
    ])
  ], [
    ['model_site', 'fract_coord'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'real'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['asym_bond', 'atom_site_label_1'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['asym_bond', 'symop_id_1'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['asym_bond', 'cell_translation_1'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['asym_bond', 'atom_site_label_2'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['asym_bond', 'symop_id_2'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['asym_bond', 'cell_translation_2'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['geom_bond', 'atom_site_label_1'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['geom_bond', 'symop_id_1'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['geom_bond', 'cell_translation_1'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['geom_bond', 'atom_site_label_2'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['geom_bond', 'symop_id_2'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['geom_bond', 'cell_translation_2'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cluster_vertex', 'atom_site_label'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['cluster_vertex', 'symop_id'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['cluster_vertex', 'cell_translation'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cluster_vertex', 'atom_site_label_1'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['cluster_vertex', 'symop_id_1'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['cluster_vertex', 'cell_translation_1'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cluster_edge', 'atom_site_label'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['cluster_edge', 'symop_id'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['cluster_edge', 'cell_translation'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cluster_edge', 'atom_site_label_1'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['cluster_edge', 'symop_id_1'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['cluster_edge', 'cell_translation_1'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cluster_edge', 'atom_site_label_2'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['cluster_edge', 'symop_id_2'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['cluster_edge', 'cell_translation_2'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'atom_site_label'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'symop_id'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'cell_translation'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'atom_site_label_1'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'symop_id_1'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'cell_translation_1'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'atom_site_label_2'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'symop_id_2'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'cell_translation_2'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'atom_site_label_3'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false],
            ['atom_site', 'label']
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'symop_id_3'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: ssgSymops }] = deps
            const enumSetState = []
            if (ssgSymops) {
              enumSetState.push(
                ...ssgSymops.map(
                  packet => selectDataItem(
                    dict, data, 'superspace_group_symop', 'id', packet
                  ).value
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['superspace_group_symop', false]
          ]
        }
      ]
    ])
  ], [
    ['cluster_face', 'cell_translation_3'],
    new MultiKeyMap([
      [['type', 'container'], 'matrix'],
      [['type', 'contents'], 'integer'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr) => {
            const [dim] = deps
            const dimension =
              (!dim.alert && Number.isFinite(dim.value))
                ? [dim.value]
                : false
            const enumDefault = defaultItem(newMatrix(dimension))
            return new MultiKeyMap([
              ...attr,
              [['type', 'dimension'], dimension],
              [['enumeration', 'default'], enumDefault]
            ])
          },
          dependencies: [
            ['cell', 'superspace_dimension']
          ]
        }
      ]
    ])
  ], [
    ['occupation_domain', 'label'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code']
    ])
  ], [
    ['occupation_domain', 'atom_site_label'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'code'],
      [
        ['method', 'Definition'],
        {
          function: (deps, attr, dict, data) => {
            const [{ value: atomSites }] = deps
            const enumSetState = []
            if (atomSites) {
              enumSetState.push(
                ...atomSites.map(
                  packet => toCanonicalCaseFold(selectDataItem(
                    dict, data, 'atom_site', 'label', packet
                  ).value)
                )
              )
            }
            return new MultiKeyMap([
              ...attr,
              [['enumeration_set', 'state'], enumSetState]
            ])
          },
          dependencies: [
            ['atom_site', false]
          ]
        }
      ]
    ])
  ], [
    ['occupation_domain', 'polytope_asymmetric_unit'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'polytope']
    ])
  ], [
    ['occupation_domain', 'simplices_asymmetric_unit'],
    new MultiKeyMap([
      [['type', 'container'], 'list'],
      [['type', 'contents'], 'array']
    ])
  ], [
    ['occupation_domain', 'display_colour'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'colour'],
      [['enumeration', 'default'], defaultItem('#000000')]
    ])
  ], [
    ['occupation_domain', 'display_opacity'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'real'],
      [['enumeration', 'default'], defaultItem(1.0)]
    ])
  ], [
    ['occupation_domain', 'display_radius'],
    new MultiKeyMap([
      [['type', 'container'], 'single'],
      [['type', 'contents'], 'real'],
      [['enumeration', 'default'], defaultItem(1.0)]
    ])
  ]
])

export const qcEmptyData = new Map()

/* @license-end */
