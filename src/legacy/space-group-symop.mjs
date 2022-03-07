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

/**
 * @desc
 * The {@link SpaceGroupSymop} class is a class for space-group symmetry
 * operations. An operation has a rotation matrix `R` and a translation vector
 * `t`. An equivalent position `v'` is generated from a given position `v` as
 * `v' = R v + t`.
 *
 * @version
 * 1.0.0
 *
 * @since
 * 1.0.0
 */
export class SpaceGroupSymop {
  /**
   * @desc
   * The constructor function of the {@link SpaceGroupSymop} class.
   * Users should not use this constructor directly.
   * Use {@link Quasicrystal#genSGSymop} method instead.
   *
   * @param {Matrix} rot
   * A rotation matrix.
   *
   * @param {Matrix} trans
   * A translation vector.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (rot, trans) {
    /**
     * @desc
     * The {@link SpaceGroupSymop#_rot} is the rotation matrix of `this`
     * space-group symmetry operation.
     *
     * Users should not change this property directly.
     *
     * @type {Matrix}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._rot = rot
    /**
     * @desc
     * The {@link SpaceGroupSymop#_trans} is the translation vector of `this`
     * space-group symmetry operation.
     *
     * Users should not change this property directly.
     *
     * @type {Matrix}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._trans = trans
  }

  /**
   * @desc
   * The {@link SpaceGroupSymop#dim} is the dimension to which `this` space-group
   * symmetry operaion conforms.
   *
   * @type {number}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get dim () {
    return this._trans.length
  }

  /**
   * @desc
   * The {@link SpaceGroupSymop#rot} is the rotation matrix of `this` space-group
   * symmetry operation.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get rot () {
    return this._rot
  }

  /**
   * @desc
   * The {@link SpaceGroupSymop#trans} is the translation vector of `this`
   * space-group symmetry operation.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get trans () {
    return this._trans
  }

  /**
   * @desc
   * The {@link SpaceGroupSymop#copy} method returns a copy of `this`
   * space-group symmetry operation.
   *
   * @param {LinearAlgebra} lalg
   * An instance of {@link LinearAlgebra}.
   *
   * @return {SpaceGroupSymop}
   * A copy of `this`.
   *
   * @version 1.0.0
   * @since 1.0.0
   *
   * @example
   * import { ExactRealAlgebra as RealAlgebra } from '@kkitahara/real-algebra'
   * import { LinearAlgebra } from '@kkitahara/linear-algebra'
   * import { SpaceGroupSymop } from '@kkitahara/qc-tools'
   * let r = new RealAlgebra()
   * let l = new LinearAlgebra(r)
   *
   * let rot = [0, 1, 1, 0]
   * let trans = [0, 0]
   * let g = new SpaceGroupSymop(rot, trans, l)
   * let g2 = g.copy(l)
   * g.rot === g2.rot // false
   * g.trans === g2.trans // false
   * g.rot[0] === g2.rot[0] // false
   * g.trans[0] === g2.trans[0] // false
   * l.eq(g.rot, g2.rot) // true
   * l.eq(g.trans, g2.trans) // true
   */
  copy (lalg) {
    const rot = lalg.copy(this._rot)
    const trans = lalg.copy(this._trans)
    return new SpaceGroupSymop(rot, trans)
  }

  /**
   * @desc
   * The {@link SpaceGroupSymop.identity} creates a new instance of
   * {@link SpaceGroupSymop} which represents the identity operation in the given
   * dimension `dim`.
   *
   * @param {LinearAlgebra} lalg
   * An instance of {@link LinearAlgebra}.
   *
   * @param {number} dim
   * A dimension (positive integer).
   *
   * @return {SpaceGroupSymop}
   * An instance of {@link SpaceGroupSymop} representing the identity operation.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  static identity (lalg, dim) {
    const dimp1 = dim + 1
    const rot = lalg.$(
      ...[...new Array(dim * dim)].map((x, i) => i % dimp1 === 0 ? 1 : 0)
    ).setDim(dim, dim)
    const trans = lalg.$(...new Array(dim).fill(0))
    return new SpaceGroupSymop(rot, trans)
  }
}

/* @license-end */
