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
 * The {@link AtomicSurface} class is a class for atomic surfaces of
 * quasicrystals.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class AtomicSurface {
  /**
   * @desc
   * The constructor function of the {@link AtomicSurface} class.
   *
   * @param {string} atomTypeSymbol
   * The atom-type symbol of the atomic surface to be constructed.
   *
   * @param {number} occupancy
   * The occupancy of the atomic surface to be constructed.
   *
   * @param {Matrix} adTensorBeta
   * Atomic displacement tensor beta (represented in a fractional coordinate
   * system.
   *
   * @param {OccupationDomain} occDomainAsym
   * An asymmetric unit of the occupation domain which represent the shape and
   * the position of the atomic surface to be constructed.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (
    atomTypeSymbol,
    occupancy,
    adTensorBeta,
    occDomainAsym,
    displayColour,
    displayOpacity,
    displayRadius
  ) {
    this.atomTypeSymbol = atomTypeSymbol
    this.occupancy = occupancy
    this.adTensorBeta = adTensorBeta
    this.occDomainAsym = occDomainAsym
    this.displayColour = displayColour
    this.displayOpacity = displayOpacity
    this.displayRadius = displayRadius
  }

  /**
   * @desc
   * The {@link AtomicSurface#dim} is the total dimension (parallel plus
   * perpendicular) to which `this` atomic surface conforms.
   *
   * @type {number}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get dim () {
    return this.adTensorBeta.getDim()[0]
  }

  /**
   * @desc
   * The {@link AtomicSurface#dimPerp} is the dimension of the perpendicular
   * space to which `this` atomic surface conforms.
   *
   * @type {number}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get dimPerp () {
    return this.occDomainAsym.dimPerp
  }

  get atomSiteLabel () {
    return this.occDomainAsym.atomSiteLabel
  }

  occupancyFactor () {
    return this.occupancy
  }

  atomicDisplacementFactor (lnum, qFract) {
    const adTensorBeta = this.adTensorBeta
    return Math.exp(lnum.dot(lnum.neg(qFract), lnum.mmul(adTensorBeta, qFract)))
  }

  /**
   * @desc
   * The {@link AtomicSurface#geometricalFormFactor} calculates the geometrical
   * form factor of the asymmetric unit of the occupation domain of `this`
   * atomic surface for the given *q* vector `qPerpCartn`.
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
    return this.occDomainAsym.geometricalFormFactor(pnum, qPerpCartn)
  }
}

/* @license-end */
