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

import { Group } from './group.mjs'
import { SpaceGroupSymop } from './space-group-symop.mjs'
import { InvalidValue } from './invalid-value.mjs'

/**
 * @desc
 * The {@link SpaceGroup} class is a class for space groups.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class SpaceGroup extends Group {
  /**
   * @desc
   * The constructor function of the {@link SpaceGroup} class.
   *
   * @param {SpaceGroupSymop[]} g
   * An array containing one or more space-group symmetry operations, otherwise
   * the constructor returns an instance of {@link InvaldValue}. `g` must not
   * contain any lattice periodic translations. The identity operation must be
   * the first element.
   *
   * @version 1.0.0
   * @since 1.0.0
   *
   * @example
   * import { SpaceGroup, SpaceGroupSymop, InvalidValue }
   *   from '@kkitahara/qc-tools'
   *
   * // non symop paramter
   * let g = new SpaceGroupSymop(
   *   [1, 0, 0, 1], [0, 0])
   * new SpaceGroup([null]) instanceof InvalidValue // true
   * new SpaceGroup([g, null]) instanceof InvalidValue // true
   *
   * // inconsistent dim
   * let g2 = new SpaceGroupSymop(
   *   [1], [0])
   * new SpaceGroup([g, g2]) instanceof InvalidValue // true
   */
  constructor (g) {
    super(g)
    if (!(g[0] instanceof SpaceGroupSymop)) {
      return new InvalidValue(` (in SpaceGroup constructor)
        All the elements of \`g\` must be instances of \`SpaceGroupSymops\`.`)
    }
    const dim = g[0].dim
    if (g.slice(1).some(
      gi => !(gi instanceof SpaceGroupSymop) || gi.dim !== dim
    )) {
      return new InvalidValue(` (in SpaceGroup constructor)
        All the elements of \`g\` must be instances of \`SpaceGroupSymops\` of
        the same dimension.`)
    }
  }

  /**
   * @desc
   * The {@link SpaceGroup#dim} is the dimension to which `this` space group
   * conforms.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get dim () {
    return this._g[0].dim
  }

  /**
   * @desc
   * The {@link SpaceGroup#symop} is an array containing all the symmetry
   * operations (excluding lattice periodic translations) of `this` space group.
   *
   * Users should not change the contents of the returned value.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get symop () {
    return this._g
  }

  /**
   * @desc
   * The {@link SpaceGroup#copy} method returns a copy of `this` space group.
   *
   * @param {LinearAlgebra} lalg
   * An instance of {@link LinearAlgebra}.
   *
   * @return {SpaceGroup}
   * A copy of `this`.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  copy (lalg) {
    return new SpaceGroup(this._g.map(gi => gi.copy(lalg)))
  }

  /**
   * @desc
   * The {@link SpaceGroup#genStar} method is functionally equivalent to the
   * {@link Group#genOrbit} method, but the names of the properties of the
   * returned object are different.
   *
   * @param {Object} x
   * An object from which star is generated.
   *
   * @param {Function} applyFunc
   * A function which takes `x` and an element of `this` group as parameters
   * and returns an element of `star`.
   *
   * @param {Function} eqFunc
   * A function which takes two elements of `star` as parameters
   * and returns `true` if the two elements are considered to be equal
   * and `false` otherwise.
   *
   * @return {Object}
   * An object with `star`, `starSymopIds` and `symopStarId` properties.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  genStar (x, applyFunc, eqFunc) {
    const obj = this.genOrbit(x, applyFunc, eqFunc)
    return {
      star: obj.orbit,
      starSymopIds: obj.orbitGIds,
      symopStarId: obj.gOrbitId }
  }
}

/* @license-end */
