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

import { ComplexAlgebra } from '@kkitahara/complex-algebra'
import { MultiKeyWeakMap } from './multi-key-weak-map.mjs'

// caches
const _simplexesInfo = new MultiKeyWeakMap()

/**
 * @desc
 * The {@link OccupationDomain} class is a class for occupation domains of
 * quasicrystals.
 *
 * In this package, 'atomic surface' and 'occupation domain' are distinguished
 * although these are usually synonyms. An 'occupation domain' is considered to
 * be an 'atomic surface' minus any implication about chemical properties, e.g.
 * atom type.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class OccupationDomain {
  /**
   * @desc
   * The constructor function of the {@link OccupationDomain} class.
   *
   * @param {string} atomSiteLabel
   * The atom-site label of the atomic surface to be constructed.
   *
   * @param {Polytope} polytope
   * A polytope which represent the shape of the occupation domain to be
   * constructed.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (atomSiteLabel, polytope) {
    this.atomSiteLabel = atomSiteLabel
    this.polytope = polytope
  }

  /**
   * @desc
   * The {@link OccupationDomain#dimPerp} is the dimension of the perpendicular
   * space to which `this` occupation domain conforms.
   *
   * @type {number}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get dimPerp () {
    return this.polytope.dim
  }

  cutBy (palg, another) {
    if (this.atomSiteLabel === another.atomSiteLabel) {
      this.polytope = palg.sub(this.polytope, another.polytope)
    }
  }

  /**
   * @desc
   * The {@link OccupationDomain#simplexesInfo} contains the information about
   * the simplexes which represents the shape of `this` occupation domain.
   *
   * @param {PolytopeAlgebra} palg
   * An instance of {@link PolytopeAlgebra} to be used.
   *
   * @return {Object[]}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  simplexesInfo (palg) {
    const polytope = this.polytope
    let simplexesInfo = _simplexesInfo.get(palg, polytope)
    if (!simplexesInfo) {
      const dimPerp = polytope.dim
      const lalg = palg.lalg
      const ralg = lalg.salg
      const simplexes = palg.genSimplexes(polytope)
      simplexesInfo = simplexes.map(simplex => {
        const origin = simplex[0]
        const arr = simplex.slice(1).reduce((a, vi) => {
          a.push(...lalg.sub(vi, origin))
          return a
        }, [])
        const avec = lalg.itranspose(lalg.$(...arr).setDim(dimPerp, dimPerp))
        const absDet = ralg.abs(lalg.det(lalg.lup(avec)))
        return {
          origin: lalg.copy(origin),
          avec: avec,
          absDet: absDet }
      })
      _simplexesInfo.set(palg, polytope, simplexesInfo)
    }
    return simplexesInfo
  }

  /**
   * @desc
   * The {@link OccupationDomain#geometricalFormFactor} calculates the
   * geometrical form factor of `this` occupation domain for the given *q*
   * vector `qPerpCartn`.
   *
   * @param {PolytopeAlgebra} pnum
   * An instance of {@link PolytopeAlgebra} to be used. Only the numerical
   * algebra may be used.
   *
   * @param {RealNumber[]} qPerpCartn
   * The perpendicular-space component of a *q* vector represented in the
   * Cartesian coordinate system.
   *
   * @return {ComplexNumber}
   * The calculated geometrical form factor.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  geometricalFormFactor (pnum, qPerpCartn) {
    // numerical only
    const dimPerp = this.dimPerp
    const lnum = pnum.lalg
    const rnum = lnum.salg
    const cnum = new ComplexAlgebra(rnum)
    if (dimPerp === 0) {
      return cnum.$(1)
    }
    const twopi = 2 * Math.PI
    return this.simplexesInfo(pnum).reduce((g, simplex) => {
      const imPhase = twopi * lnum.dot(qPerpCartn, simplex.origin)
      // oblique coordinate system of the simplex
      const vi = lnum.ismul(lnum.mmul(qPerpCartn, simplex.avec), twopi).slice()
      for (let j = 1; j < dimPerp; j += 1) {
        vi[j - 1] -= vi[j]
      }
      let terms = []
      terms.push({ polyCoef: [cnum.$(1)], v: 0 })
      for (let j = dimPerp - 1; j >= 0; j -= 1) {
        for (let k = terms.length - 1; k >= 0; k -= 1) {
          terms[k].v += vi[j]
        }
        // integrate
        const termsNew = []
        termsNew.push({ polyCoef: [cnum.$(0)], v: 0 })
        for (let k = terms.length - 1; k >= 0; k -= 1) {
          const vk = terms[k].v
          if (rnum.isZero(vk)) {
            let polyCoef = terms[k].polyCoef
            const polyCoefNew = [cnum.$(0)]
            for (let l = 0, n = polyCoef.length; l < n; l += 1) {
              const coefNew = cnum.div(polyCoef[l], l + 1)
              polyCoefNew[0] = cnum.iadd(polyCoefNew[0], coefNew)
              polyCoefNew.push(cnum.neg(coefNew))
            }
            polyCoef = termsNew[0].polyCoef
            for (let l = 0, n = polyCoef.length; l < n; l += 1) {
              if (l === polyCoefNew.length) {
                break
              }
              polyCoef[l] = cnum.iadd(polyCoef[l], polyCoefNew[l])
            }
            for (let l = polyCoef.length; l < polyCoefNew.length; l += 1) {
              polyCoef.push(polyCoefNew[l])
            }
          } else {
            const polyCoef = terms[k].polyCoef
            const polyCoefNew = []
            for (let l = polyCoef.length - 1; l >= 0; l -= 1) {
              polyCoefNew.push(cnum.$(0))
            }
            for (let l = polyCoef.length - 1; l >= 0; l -= 1) {
              // integration by parts
              const coefNew = cnum.div(polyCoef[l], cnum.$(0, vk))
              if (l !== 0) {
                polyCoef[l - 1] =
                    cnum.isub(polyCoef[l - 1], cnum.mul(coefNew, l))
              }
              const rePhFac = Math.cos(vk)
              const imPhFac = Math.sin(vk)
              const phFac = cnum.add(rePhFac, cnum.$(0, imPhFac))
              termsNew[0].polyCoef[0] =
                  cnum.iadd(termsNew[0].polyCoef[0], cnum.mul(phFac, coefNew))
              polyCoefNew[l] = cnum.isub(polyCoefNew[l], coefNew)
            }
            termsNew.push({ polyCoef: polyCoefNew, v: vk })
          }
        }
        terms = termsNew
      }
      let factor = cnum.$(Math.cos(imPhase), Math.sin(imPhase))
      factor = cnum.imul(factor, simplex.absDet)
      return cnum.iadd(g, cnum.imul(terms.reduce((gis, term) => {
        return cnum.iadd(gis, term.polyCoef[0])
      }, cnum.$(0)), factor))
    }, cnum.$(0))
  }
}

/* @license-end */
