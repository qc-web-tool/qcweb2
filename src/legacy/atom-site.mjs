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
 * The {@link AtomSite} class is a class for atom sites.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class AtomSite {
  /**
   * @desc
   * The constructor function of the {@link AtomSite} class.
   *
   * Users should not use this constructor directly.
   * Use {@link Quasicrystal#genAtomSite} method instead.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (posFract) {
    /**
     * @desc
     * The {@link AtomSite#_posFract} is the position of `this` atom site in a
     * fractional coordinate system.
     *
     * @type {Matrix}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._posFract = posFract
  }

  /**
   * @desc
   * The {@link AtomSite#dim} is the dimension to which `this` atom site
   * conforms.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get dim () {
    return this._posFract.length
  }

  /**
   * The {@link AtomSite#posFract} is the getter for the
   * {@link AtomSite#_posFract}.
   *
   * Users should not change the contents of the returned value.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get posFract () {
    return this._posFract
  }
}

/* @license-end */
