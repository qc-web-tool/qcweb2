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
 * The {@link AtomType} class is a class for atom types.
 *
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import {
 *   AtomType,
 *   scatCromerMannCoeffs,
 *   scatHiAngFoxCoeffs,
 *   Radiation,
 *   XRayRadiation,
 *   InvalidValue } from '@kkitahara/qc-tools'
 *
 * let cm = scatCromerMannCoeffs['Li1+']
 * let fox = scatHiAngFoxCoeffs['Li']
 * let li1p = new AtomType(cm, fox)
 * li1p._scatCromerMannCoeffs.length // 9
 * li1p._scatCromerMannCoeffs[0] // 0.696800
 * li1p._scatCromerMannCoeffs[1] // 4.62370
 * li1p._scatCromerMannCoeffs[2] // 0.788800
 * li1p._scatCromerMannCoeffs[3] // 1.95570
 * li1p._scatCromerMannCoeffs[4] // 0.341400
 * li1p._scatCromerMannCoeffs[5] // 0.631600
 * li1p._scatCromerMannCoeffs[6] // 0.156300
 * li1p._scatCromerMannCoeffs[7] // 10.0953
 * li1p._scatCromerMannCoeffs[8] // 0.016700
 * li1p._scatHiAngFoxCoeffs.length // 4
 * li1p._scatHiAngFoxCoeffs[0] // 0.89463
 * li1p._scatHiAngFoxCoeffs[1] // -2.43660
 * li1p._scatHiAngFoxCoeffs[2] // 0.232500
 * li1p._scatHiAngFoxCoeffs[3] // -0.0071949
 *
 * let o1m = new AtomType(
 *   scatCromerMannCoeffs['O1-'],
 *   scatHiAngFoxCoeffs['O'])
 * let rad = XRayRadiation.cuKL3
 * rad.wavelength // 1.540562
 * Math.abs(o1m.atomicScatteringFactor(1.5, rad) - 0.994) < 0.012 // true
 * Math.abs(o1m.atomicScatteringFactor(3.5, rad) - 0.196) < 0.196 * 0.03 // true
 * o1m.atomicScatteringFactor(-0.1, rad) instanceof InvalidValue // true
 * o1m.atomicScatteringFactor(6.1, rad) instanceof InvalidValue // true
 *
 * rad = new Radiation()
 * // invalid probe
 * o1m.atomicScatteringFactor(1.5, rad) instanceof InvalidValue // true
 */
export class AtomType {
  /**
   * @desc
   * The constructor function of the {@link AtomType} class.
   *
   * @todo add parameters for dispersion, nuclear, electron.
   *
   * @param {number[]} scatCromerMannCoeffs
   * A set of Cromer-Mann coefficients [a1, b1, a2, b2, a3, b3, a4, b4, c] to be
   * set.
   *
   * @param {number[]} scatCoeffsFox
   * A set of Fox coefficients [a0, a1, a2 * 10, a3 * 100] to be set.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (scatCromerMannCoeffs, scatHiAngFoxCoeffs) {
    /**
     * @desc
     * The {@link AtomType#_scatCromerMannCoeffs} is the set of Cromer-Mann
     * coefficients [a1, b1, a2, b2, a3, b3, a4, b4, c] for `this` atom type.
     *
     * Users should not change this property directly.
     *
     * @type {number[]}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._scatCromerMannCoeffs = scatCromerMannCoeffs
    /**
     * @desc
     * The {@link AtomType#_scatCromerMannCoeffs} is the set of Fox coefficients
     * [a0, a1, a2, a3] or `this` atom type.
     *
     * Users should not change this property directly.
     *
     * @type {number[]}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._scatHiAngFoxCoeffs = scatHiAngFoxCoeffs
    this._scatHiAngFoxCoeffs[2] /= 10
    this._scatHiAngFoxCoeffs[3] /= 100
  }

  /**
   * @desc
   * The {@link AtomType#_atomicScatteringFactor} returns the atomic scattering
   * factor of `this` atom type for the given `stol` and `rad`.
   *
   * @todo dispersion correction, nuclear scattering, electron scattering.
   *
   * @param {number} stol
   * Sin(theta) over lambda = |qParCartn| / 2.
   *
   * @param {Radiation} rad
   * The radiation for which the atomic scattering factor is to be calculated.
   *
   * @return {number|InvalidValue}
   * The value of the atomic scattering factor or an instance of
   * {@link InvalidValue} if the given condition is not supported.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  atomicScatteringFactor (stol, rad) {
    if (rad.probe === 'x-ray') {
      if (stol < 0) {
        return new InvalidValue(` (in AtomType#atomicScatteringFactor)
          A negative value of \`stol\` (${stol}) is given.`)
      } else if (stol <= 2) {
        let f = this._scatCromerMannCoeffs[8]
        const s2 = stol ** 2
        for (let i = 0; i < 8; i += 2) {
          f += this._scatCromerMannCoeffs[i] *
            Math.exp(-this._scatCromerMannCoeffs[i + 1] * s2)
        }
        return f
      } else if (stol <= 6) {
        const s = stol
        const lnf =
          this._scatHiAngFoxCoeffs[0] +
          s * (this._scatHiAngFoxCoeffs[1] +
          s * (this._scatHiAngFoxCoeffs[2] +
          s * this._scatHiAngFoxCoeffs[3]))
        return Math.exp(lnf)
      } else {
        return new InvalidValue(` (in AtomType#atomicScatteringFactor)
          An unsuported value of \`stol\` (${stol}) is given.`)
      }
    } else {
      return new InvalidValue(` (in AtomType#atomicScatteringFactor)
        An unsuported probe (${rad.probe}) is given.`)
    }
  }
}

/* @license-end */
