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
 * The {@link Radiation} class is a class for radiations.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Radiation {
  /**
   * @desc
   * The constructor function of the {@link Radiation} class.
   *
   * @param {string} probe
   * `'x-ray'`, `'neutron'`, `'electron'` or `'gamma'`.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (probe) {
    /**
     * @desc
     * The {@link Radiation#_probe} is either of `'x-ray'`, `'neutron'`,
     * `'electron'` or `'gamma'`.
     *
     * Users should not change this property directly.
     *
     * @type {string}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._probe = probe
  }

  /**
   * @desc
   * The {@link Radiation#probe} is the getter for the {@link Radiation#_probe}.
   *
   * @type {string}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get probe () {
    return this._probe
  }
}

/* @license-end */
