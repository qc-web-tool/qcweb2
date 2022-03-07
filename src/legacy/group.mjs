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

import { InvalidValue } from './invalid-value.mjs'

/**
 * @desc
 * The {@link Group} class is a class for groups.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Group {
  /**
   * @desc
   * The constructor function of the {@link Group} class.
   *
   * @param {Array} g
   * An array containing one or more group elements, otherwise the constructor
   * returns an instance of {@link InvaldValue}.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (g) {
    if (!Array.isArray(g) || g.length === 0) {
      return new InvalidValue(` (in Group constructor)
        \`g\` must be an array containing one or more group elements.`)
    }
    /**
     * @desc
     * The {@link Group#_g} stores all the group elements of `this` group.
     *
     * Users should not change this property directly.
     *
     * @type {Array}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._g = g
  }

  /**
   * @desc
   * The {@link Group#order} is the number of the group elements of `this`
   * group.
   *
   * @type {number}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get order () {
    return this._g.length
  }

  /**
   * @desc
   * The {@link Group.genOrbit} method returns an object with `orbit`, `orbitGIds`
   * and `gOrbitId` properties.
   *
   * The `orbit` is an array containing the elements of the orbit generated
   * from a given object `x`.
   *
   * The `orbitGIds` is an array containing arrays of the indices of
   * the group elements. The array at index `i` contains the indices of the
   * group elements which transform `x` to `i`-th element of the orbit.
   *
   * The `gOrbitId` is an array containing the indices of the elements of
   * the orbit. The index at index `i` is the index of the element of the orbit
   * which is generated by the `i`-th group element.
   *
   * @param {Object} x
   * An object from which orbit is generated.
   *
   * @param {Function} applyFunc
   * A function which takes `x` and an element of `this` group as parameters
   * and returns an element of `orbit`.
   *
   * @param {Function} eqFunc
   * A function which takes two elements of `orbit` as parameters
   * and returns `true` if the two elements are considered to be equal
   * and `false` otherwise.
   *
   * @return {Object}
   * An object with `orbit`, `orbitGIds` and `gOrbitId` properties.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  genOrbit (x, applyFunc, eqFunc) {
    const orbit = []
    const orbitGIds = []
    const gOrbitId = []
    this._g.forEach((gi, i) => {
      const xi = applyFunc(x, gi)
      if (orbit.every((xj, j) => {
        if (!eqFunc(xi, xj)) {
          return true
        } else {
          gOrbitId.push(j)
          orbitGIds[j].push(i)
          return false
        }
      })) {
        gOrbitId.push(orbit.length)
        orbit.push(xi)
        orbitGIds.push([i])
      }
    })
    return {
      orbit: orbit,
      orbitGIds: orbitGIds,
      gOrbitId: gOrbitId }
  }

  /**
   * @desc
   * The {@link Group.removeDuplicates} returns a new array containing the
   * nonduplicate elements in the given array `g`.
   *
   * @param {Array} g
   * An array containing group elements.
   *
   * @param {Function} eqFunc
   * A function which takes a two elements of `g` as parameters and returns
   * `true` if the two elements are considered to be equal and `false`
   * otherwise.
   *
   * @return {Array|Error}
   * An array containing nonduplicate group elements on successful exit, or an
   * {@link InvalidValue}.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  static removeDuplicates (g, eqFunc) {
    if (!(g instanceof Array)) {
      return new InvalidValue(` (in Group.removeDuplicates)
        \`g\` must be an array.`)
    }
    return g.reduce((arr, gi) => {
      if (arr.every(gj => {
        return !eqFunc(gj, gi)
      })) {
        arr.push(gi)
      }
      return arr
    }, [])
  }

  /**
   * @desc
   * The {@link Group.genElements} generates all the group elements from the
   * given `generators`.
   *
   * @param {object} identity
   * The identity element of the group to be generated.
   *
   * @param {Array} generators
   * An array containing generators.
   *
   * @param {mulFunc}
   * A function which takes a generator and a group element as parameters and
   * returns the product of the two elements.
   *
   * @param {Function} eqFunc
   * A function which takes a generated element and a group element as
   * parameters and returns `true` if the two elements are considered to be
   * equal and `false` otherwise.
   *
   * @param {number} max
   * Stops if the number of group elements exceeds `max`. In that case, an
   * instance of {@link InvalidValue} is returned.
   *
   * @return {Array|Error}
   * An array containing generated group elements on successful exit, or an
   * {@link InvalidValue}.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  static genElements (identity, generators, mulFunc, eqFunc, max) {
    if (!(generators instanceof Array)) {
      return new InvalidValue(` (in Group.genElements)
        \`generators\` must be an array.`)
    }
    if (!Number.isInteger(max) || max < 1) {
      return new InvalidValue(` (in Group.genElements)
        \`max\` must be a positive (non-zero) integer.`)
    }
    const g = [identity]
    let i = 0
    let j = 0
    const n = generators.length
    while (g.length <= max) {
      if (i === n) {
        j += 1
        i = 0
      }
      if (j === g.length) {
        break
      }
      const gi = generators[i]
      const gj = g[j]
      const gk = mulFunc(gi, gj)
      if (g.every(gl => !eqFunc(gk, gl))) {
        g.push(gk)
      }
      i += 1
    }
    if (g.length > max) {
      return new InvalidValue(` (in Group.genElements)
        The number of group elements excceds \`max\`.`)
    }
    return g
  }
}

/* @license-end */
