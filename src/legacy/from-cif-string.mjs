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

import { RealAlgebra } from '@kkitahara/real-algebra'
import { DEFAULT_EPS } from './constants.mjs'
import { Quasicrystal } from './quasicrystal.mjs'
import { AtomType } from './atom-type.mjs'
import { AtomicSurface } from './atomic-surface.mjs'
import { OccupationDomain } from './occupation-domain.mjs'
import { CIF, Dict } from '@kkitahara/cif-tools'

// This is an ad hoc implementation only for qcweb2 functionality.
// Currently, only limited tags are read from
// CIF files which are conforming to the DDL1 cif_core dictionary.

function getLengthA (cifBlock, dict) {
  const tag = '_cell_length_a'
  const length = CIF.getDataValue(cifBlock, tag)
  return Dict.translate(dict, tag, length[0]).value
}

function getLengthB (cifBlock, dict) {
  const tag = '_cell_length_b'
  const length = CIF.getDataValue(cifBlock, tag)
  return Dict.translate(dict, tag, length[0]).value
}

function getLengthC (cifBlock, dict) {
  const tag = '_cell_length_c'
  const length = CIF.getDataValue(cifBlock, tag)
  return Dict.translate(dict, tag, length[0]).value
}

function getAngleAlpha (cifBlock, dict) {
  const tag = '_cell_angle_alpha'
  const angle = CIF.getDataValue(cifBlock, tag)
  return Dict.translate(dict, tag, angle[0]).value * Math.PI / 180
}

function getAngleBeta (cifBlock, dict) {
  const tag = '_cell_angle_beta'
  const angle = CIF.getDataValue(cifBlock, tag)
  return Dict.translate(dict, tag, angle[0]).value * Math.PI / 180
}

function getAngleGamma (cifBlock, dict) {
  const tag = '_cell_angle_gamma'
  const angle = CIF.getDataValue(cifBlock, tag)
  return Dict.translate(dict, tag, angle[0]).value * Math.PI / 180
}

function getRecipAngleGamma (cifBlock, dict) {
  const tag = '_cell_reciprocal_angle_gamma'
  const angle = CIF.getDataValue(cifBlock, tag)
  if (angle.length === 1) {
    return Dict.translate(dict, tag, angle[0]).value * Math.PI / 180
  } else {
    const angleAlpha = getAngleAlpha(cifBlock, dict)
    const angleBeta = getAngleBeta(cifBlock, dict)
    const angleGamma = getAngleGamma(cifBlock, dict)
    return Math.acos(Math.cos(angleAlpha) * Math.cos(angleBeta) -
      Math.cos(angleGamma)) / Math.sin(angleAlpha) / Math.sin(angleBeta)
  }
}

function getCartnTransformMat11 (cifBlock, dict) {
  const tag = '_atom_sites_Cartn_tran_matrix_11'
  const mat11 = CIF.getDataValue(cifBlock, tag)
  if (mat11.length === 1) {
    return Dict.translate(dict, tag, mat11[0])
  } else {
    const lengthA = getLengthA(cifBlock, dict)
    const angleBeta = getAngleBeta(cifBlock, dict)
    const recipAngleGamma = getRecipAngleGamma(cifBlock, dict)
    return lengthA * Math.sin(angleBeta) * Math.sin(recipAngleGamma)
  }
}

function getCartnTransformMat12 (cifBlock, dict) {
  const tag = '_atom_sites_Cartn_tran_matrix_12'
  const mat12 = CIF.getDataValue(cifBlock, tag)
  if (mat12.length === 1) {
    return Dict.translate(dict, tag, mat12[0])
  } else {
    return 0
  }
}

function getCartnTransformMat13 (cifBlock, dict) {
  const tag = '_atom_sites_Cartn_tran_matrix_13'
  const mat13 = CIF.getDataValue(cifBlock, tag)
  if (mat13.length === 1) {
    return Dict.translate(dict, tag, mat13[0])
  } else {
    return 0
  }
}

function getCartnTransformMat21 (cifBlock, dict) {
  const tag = '_atom_sites_Cartn_tran_matrix_21'
  let mat21 = CIF.getDataValue(cifBlock, tag)
  if (mat21.length === 1) {
    return Dict.translate(dict, tag, mat21[0])
  } else {
    const lengthA = getLengthA(cifBlock, dict)
    const angleBeta = getAngleBeta(cifBlock, dict)
    const recipAngleGamma = getRecipAngleGamma(cifBlock, dict)
    return -lengthA * Math.sin(angleBeta) * Math.cos(recipAngleGamma)
  }
}

function getCartnTransformMat22 (cifBlock, dict) {
  const tag = '_atom_sites_Cartn_tran_matrix_22'
  let mat22 = CIF.getDataValue(cifBlock, tag)
  if (mat22.length === 1) {
    return Dict.translate(dict, tag, mat22[0])
  } else {
    const lengthB = getLengthB(cifBlock, dict)
    const angleAlpha = getAngleAlpha(cifBlock, dict)
    return lengthB * Math.sin(angleAlpha)
  }
}

function getCartnTransformMat23 (cifBlock, dict) {
  const tag = '_atom_sites_Cartn_tran_matrix_23'
  let mat23 = CIF.getDataValue(cifBlock, tag)
  if (mat23.length === 1) {
    return Dict.translate(dict, tag, mat23[0])
  } else {
    return 0
  }
}

function getCartnTransformMat31 (cifBlock, dict) {
  const tag = '_atom_sites_Cartn_tran_matrix_31'
  let mat31 = CIF.getDataValue(cifBlock, tag)
  if (mat31.length === 1) {
    return Dict.translate(dict, tag, mat31[0])
  } else {
    const lengthA = getLengthA(cifBlock, dict)
    const angleBeta = getAngleBeta(cifBlock, dict)
    return lengthA * Math.cos(angleBeta)
  }
}

function getCartnTransformMat32 (cifBlock, dict) {
  const tag = '_atom_sites_Cartn_tran_matrix_32'
  let mat32 = CIF.getDataValue(cifBlock, tag)
  if (mat32.length === 1) {
    return Dict.translate(dict, tag, mat32[0])
  } else {
    const lengthB = getLengthB(cifBlock, dict)
    const angleAlpha = getAngleAlpha(cifBlock, dict)
    return lengthB * Math.cos(angleAlpha)
  }
}

function getCartnTransformMat33 (cifBlock, dict) {
  const tag = '_atom_sites_Cartn_tran_matrix_33'
  let mat33 = CIF.getDataValue(cifBlock, tag)
  if (mat33.length === 1) {
    return Dict.translate(dict, tag, mat33[0])
  } else {
    return getLengthC(cifBlock, dict)
  }
}

function getAParCartn (cifBlock, dict) {
  const mat11 = getCartnTransformMat11(cifBlock, dict)
  const mat12 = getCartnTransformMat12(cifBlock, dict)
  const mat13 = getCartnTransformMat13(cifBlock, dict)
  const mat21 = getCartnTransformMat21(cifBlock, dict)
  const mat22 = getCartnTransformMat22(cifBlock, dict)
  const mat23 = getCartnTransformMat23(cifBlock, dict)
  const mat31 = getCartnTransformMat31(cifBlock, dict)
  const mat32 = getCartnTransformMat32(cifBlock, dict)
  const mat33 = getCartnTransformMat33(cifBlock, dict)
  return [mat11, mat12, mat13, mat21, mat22, mat23, mat31, mat32, mat33]
}

function translateSymop (str) {
  const rot = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  const trans = [0, 0, 0]
  let axis = 0
  let sign = 1
  let inum = 0
  let m
  let n
  for (let i = 0; i < str.length; i += 1) {
    const c = str[i]
    switch (c) {
      case ' ':
        continue
      case ',':
        axis += 1
        inum = 0
        sign = 1
        break
      case '+':
        sign = 1
        break
      case '-':
        sign = -1
        break
      case 'x':
        rot[axis * 3] = sign
        break
      case 'y':
        rot[axis * 3 + 1] = sign
        break
      case 'z':
        rot[axis * 3 + 2] = sign
        break
      default:
        switch (inum) {
          case 0:
            m = Number(c)
            break
          case 1:
            if (c !== '/') {
              throw Error('illegal num in symmetry xyz')
            }
            break
          case 2:
            n = Number(c)
            if (n === 5) {
              throw Error('illegal translation in symmetry xyz')
            }
            trans[axis] = sign * m / n
            trans[axis] -= Math.floor(trans[axis])
            sign = 1
            break
        }
        inum += 1
    }
  }
  return { rot: rot, trans: trans }
}

function getSGFractSymop (cifBlock, dict) {
  const tag = '_space_group_symop_operation_xyz'
  let symopXYZ = CIF.getDataValue(cifBlock, tag)
  if (symopXYZ.length === 0) {
    symopXYZ = CIF.getDataValue(cifBlock, '_symmetry_equiv_pos_as_xyz')
  }
  if (symopXYZ.length === 0) {
    symopXYZ = ['x,y,z']
  }
  return symopXYZ
}

function getAtomSites (cifBlock, dict) {
  const labels = CIF.getDataValue(cifBlock, '_atom_site_label')
  const typeSymbols = CIF.getDataValue(cifBlock, '_atom_site_type_symbol')
  const fractXs = CIF.getDataValue(cifBlock, '_atom_site_fract_x')
  const fractYs = CIF.getDataValue(cifBlock, '_atom_site_fract_y')
  const fractZs = CIF.getDataValue(cifBlock, '_atom_site_fract_z')
  if (
    labels.length === typeSymbols.length &&
    labels.length === fractXs.length &&
    labels.length === fractYs.length &&
    labels.length === fractZs.length
  ) {
    return labels.map((label, i) => {
      return {
        label: label,
        typeSymbol: typeSymbols[i],
        fractXYZ: [
          Dict.translate(dict, '_atom_site_fract_x', fractXs[i]).value,
          Dict.translate(dict, '_atom_site_fract_y', fractYs[i]).value,
          Dict.translate(dict, '_atom_site_fract_z', fractZs[i]).value ] }
    })
  } else {
    return []
  }
}

export function fromCIFString (cifString, blockCode, eps = DEFAULT_EPS) {
  const cif = CIF.fromCIFString(cifString)
  blockCode = blockCode || CIF.getBlockCodes(cif)[0]
  const cifBlock = CIF.getBlock(cif, blockCode)
  const dict = Dict.getConformDicts(cif)[blockCode]
  const rnum = new RealAlgebra(eps)
  const dim = 3
  const aParCartn = getAParCartn(cifBlock, dict)
  const aPerpCartn = []
  const qc = new Quasicrystal(rnum, dim, aParCartn, aPerpCartn, eps)
  const sgFractSymopXYZ = getSGFractSymop(cifBlock, dict)
  const sgFract = qc.genSGFractFromGenerators(sgFractSymopXYZ.map(str => {
    const symop = translateSymop(str)
    return qc.genSGSymop(symop.rot, symop.trans)
  }))
  const p0d = qc._pnum
  qc.setSSGFractNoPhason(sgFract)
  const atomSites = getAtomSites(cifBlock, dict)
  const atomTypeSymbols = new Set()
  for (const atomSite of atomSites) {
    qc.setAtomSite(atomSite.label, atomSite.fractXYZ)
    atomTypeSymbols.add(atomSite.typeSymbol)
    const dummyBeta = qc.genADTensorBetaNoPhasonFromUCartn(
      [0, 0, 0, 0, 0, 0, 0, 0, 0])
    const od = p0d.hypercube()
    const as = new AtomicSurface(atomSite.typeSymbol, 1.0, dummyBeta,
      new OccupationDomain(atomSite.label, od))
    qc.setAtomicSurface(atomSite.label, as)
  }
  for (const atomTypeSymbol of atomTypeSymbols) {
    const dummyAtomType = new AtomType([], [])
    qc.setAtomType(atomTypeSymbol, dummyAtomType)
  }
  return qc
}

/* @license-end */
