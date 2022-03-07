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

import { Radiation } from './radiation.mjs'

/**
 * @desc
 * The {@link XRayRadiation} class is a class for x-ray radiations.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class XRayRadiation extends Radiation {
  /**
   * @desc
   * The constructor function of the {@link XRayRadiation} class.
   *
   * @param {number} wavelength
   * A wavelength in angstroms.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (wavelength) {
    super('x-ray')
    /**
     * @desc
     * The {@link XRayRadiation#_wavelength} is the wavelength of `this` x-ray
     * radiation in angstroms.
     *
     * @type {number}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._wavelength = wavelength
  }

  /**
   * @desc
   * The {@link XRayRadiation#wavelength} is the getter for the
   * {@link XRayRadiation#_wavelength}.
   *
   * @type {number}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get wavelength () {
    return this._wavelength
  }
}

/**
 * @preserve
 * data from J. A. Bearden, Rev. Mod. Phys. 39, 78 (1967).
 */
XRayRadiation.cuKL3 = new XRayRadiation(1.540562)
XRayRadiation.cuKL2 = new XRayRadiation(1.544390)

/* @license-end */
