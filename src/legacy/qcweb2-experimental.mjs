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
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { SplittablePanel } from './splittable-panel.mjs'
import { Light } from './qcweb2-light.mjs'
import { Camera } from './qcweb2-camera.mjs'
import { genHalfOctahedron } from './qcweb2-gen-half-octahedron.mjs'
// import { genSphere } from './qcweb2-gen-sphere.mjs'
// import { genIcosahedron } from './qcweb2-gen-icosahedron.mjs'
import { genCylinder } from './qcweb2-gen-cylinder.mjs'
import {
  // unitRegSimplex,
  inormalise,
  cross3,
  rotateV3 } from './qcweb2-linalg.mjs'
import { xFractGenerator2 } from './x-fract-generator.mjs'

const rnum = new RealAlgebra()
const lnum = new LinearAlgebra(rnum)

const TOL_CUT = 0.00001 // 32 / 2 ** 23

const DATA_TEXTURE_WIDTH_BIT_LENGTH = 11
const DATA_TEXTURE_WIDTH = 2 ** DATA_TEXTURE_WIDTH_BIT_LENGTH

const SSGID_BIT_LENGTH = 8
const MAX_SSG_COUNT = 2 ** SSGID_BIT_LENGTH

const ODID_BIT_LENGTH = 24
const MAX_OD_COUNT = 2 ** ODID_BIT_LENGTH
const INVALID_ODID = MAX_OD_COUNT - 1

const TYPEID_NONE = 0
const TYPEID_OD = 1
const TYPEID_ATOM = 2
const TYPE_TEXT = ['None', 'Occupation domain', 'Atom']

const MAX_SSG_TEXTURE_WIDTH = Math.min(3 * MAX_SSG_COUNT, 2048)

const CUT_TEXTURE_WIDTH_BIT_LENGTH = 8
const CUT_TEXTURE_WIDTH = 2 ** CUT_TEXTURE_WIDTH_BIT_LENGTH
const MAX_RFRACTLATT_COUNT = CUT_TEXTURE_WIDTH ** 2

const SSG_TEXTURE_UNIT = 0
const OD_COLOUR_RADIUS_TEXTURE_UNIT = 1
const CUT_TEXTURE_UNIT = 2

const CARTN_TRANSFORM_UNIFORM_BINDING = 0
const HIGHLIGHT_UNIFORM_BINDING = 1

function genHighlightMask (typeId, odId, ssgId, rFract) {
  return [
    typeId ? ~0 : 0,
    (odId ? (MAX_OD_COUNT - 1) << SSGID_BIT_LENGTH : 0) |
    (ssgId ? (MAX_SSG_COUNT - 1) : 0),
    rFract ? ~0 : 0, rFract ? ~0 : 0]
}

const mousedownedCache = new WeakMap()
const mouseenterCache = new WeakMap()
const mouseenterShiftCache = new WeakMap()
const mouseendCache = new WeakMap()
const mouseendShiftCache = new WeakMap()
const mousemovedCache = new WeakMap()
const mousemovedShiftCache = new WeakMap()
const dblclickedCache = new WeakMap()
const wheeledCache = new WeakMap()
const activePanel = new WeakMap()

function mousedowned (evt) {
  if (evt.buttons === 1) {
    const panel = this.panelAt(...this.canvasCoordOf(evt.clientX, evt.clientY),
      this.ui.separatorDetectWidth)
    if (panel) {
      activePanel.set(this, panel)
      if (evt.shiftKey) {
        evt.currentTarget.addEventListener(
          'mousemove', mousemovedShiftCache.get(this))
        evt.currentTarget.addEventListener(
          'mouseup', mouseendShiftCache.get(this))
        evt.currentTarget.addEventListener(
          'mouseenter', mouseenterShiftCache.get(this))
      } else {
        evt.currentTarget.addEventListener(
          'mousemove', mousemovedCache.get(this))
        evt.currentTarget.addEventListener(
          'mouseup', mouseendCache.get(this))
        evt.currentTarget.addEventListener(
          'mouseenter', mouseenterCache.get(this))
      }
      evt.currentTarget.removeEventListener(
        'mousedown', mousedownedCache.get(this))
      evt.preventDefault()
    }
  }
}

function mouseenter (evt) {
  if (evt.buttons !== 1 || evt.shiftKey) {
    mouseendCache.get(this)(evt)
  }
}

function mouseenterShift (evt) {
  if (evt.buttons !== 1 || !evt.shiftKey) {
    mouseendShiftCache.get(this)(evt)
  }
}

function mouseend (evt) {
  evt.currentTarget.addEventListener('mousedown', mousedownedCache.get(this))
  evt.currentTarget.removeEventListener('mouseup', mouseendCache.get(this))
  evt.currentTarget.removeEventListener('mouseenter', mouseenterCache.get(this))
  evt.currentTarget.removeEventListener('mousemove', mousemovedCache.get(this))
  activePanel.delete(this)
}

function mouseendShift (evt) {
  evt.currentTarget.addEventListener('mousedown', mousedownedCache.get(this))
  evt.currentTarget.removeEventListener('mouseup', mouseendShiftCache.get(this))
  evt.currentTarget.removeEventListener(
    'mouseenter', mouseenterShiftCache.get(this))
  evt.currentTarget.removeEventListener(
    'mousemove', mousemovedShiftCache.get(this))
  activePanel.delete(this)
}

function mousemoved (evt) {
  const panel = activePanel.get(this)
  if (!panel.isVSplitted && !panel.isSplitted) {
    if (evt.movementX !== 0 || evt.movementY !== 0) {
      const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
      const movement = [evt.movementX, -evt.movementY, 0]
      const th = camera.rotFactor * Math.hypot(movement[0], movement[1])
      const viewTrans = lnum.transpose(camera.viewMat())
      const normal = lnum.$(...inormalise(cross3([0, 0, 1], movement)), 0)
      const ax = lnum.$(...lnum.mmul(viewTrans, normal).slice(0, 3))
      const v1 = lnum.sub(camera.position, camera.lookAt)
      const rot = rotateV3(-th, ax)
      const v2 = lnum.mmul(rot, v1)
      camera.position = lnum.add(camera.lookAt, v2)
      camera.upDir = lnum.mmul(rot, camera.upDir)
      this.needUpdate = true
    }
  }
}

function mousemovedShift (evt) {
  const panel = activePanel.get(this)
  if (panel.isVSplitted) {
    const [x] = this.canvasCoordOf(evt.clientX, evt.clientY)
    panel.vsplit(Math.round(x))
    this.needUpdate = true
    if (!panel.isVSplitted) {
      mouseendShiftCache.get(this)(evt)
    }
  } else if (panel.isSplitted) {
    const [, y] = this.canvasCoordOf(evt.clientX, evt.clientY)
    panel.split(Math.round(y))
    this.needUpdate = true
    if (!panel.isSplitted) {
      mouseendShiftCache.get(this)(evt)
    }
  } else {
    if (evt.movementX !== 0 || evt.movementY !== 0) {
      const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
      const qc = this.qc
      const factor = camera.distance * camera.moveFactor
      const movement = lnum.ismul([evt.movementX, -evt.movementY, 0, 0],
        factor)
      const viewTrans = lnum.transpose(camera.viewMat())
      const v = lnum.mmul(viewTrans, movement).slice(0, 3)
      if (panel.target.isPar) {
        const vFract = lnum.mmul(qc.bParCartn, v.slice(0, qc.dimPar))
        qc._originFract = lnum.sub(qc._originFract, vFract).map(
          x => x - Math.floor(x))
      } else if (qc.dimPerp > 0) {
        const vFract = lnum.mmul(qc.bPerpCartn, v.slice(0, qc.dimPerp))
        qc._originFract = lnum.add(qc._originFract, vFract).map(
          x => x - Math.floor(x))
      }
      this.needGenRFractLatt = true
      this.needUpdateCartnTransform = true
      this.needUpdate = true
    }
  }
}

function dblclicked (evt) {
  const [x, y] = this.canvasCoordOf(evt.clientX, evt.clientY)
  const panel = this.panelAt(x, y)
  const target = this.getInfoAt(x, y)
  if (target) {
    if (evt.shiftKey) {
      if (target.type === TYPE_TEXT[TYPEID_ATOM] ||
        target.type === TYPE_TEXT[TYPEID_OD]
      ) {
        if (target.atomicSurfaceLabel) {
          const odId = this.ods
            .map(({ atomicSurfaceLabel }, i) => [atomicSurfaceLabel, i])
            .filter(([label]) => label === target.atomicSurfaceLabel)[0][1]
          this.highlightRef = [0, odId << SSGID_BIT_LENGTH, 0, 0]
          this.highlightMask = genHighlightMask(false, true, false, false)
          this.needUpdateHighlight = true
          this.needUpdate = true
        }
      } else if (target.type === TYPE_TEXT[TYPEID_NONE]) {
        this.highlightMask = genHighlightMask(false, false, false, false)
        this.needUpdateHighlight = true
        this.needUpdate = true
      }
    } else {
      if (target.type === TYPE_TEXT[TYPEID_ATOM] && target.atomicSurfaceLabel) {
        const qc = this.qc
        const atomSiteLabel = qc._atomicSurface[target.atomicSurfaceLabel]
          .occDomainAsym.atomSiteLabel
        const symAtomSite = qc.ssgNoPhasonSymAtomSite(atomSiteLabel)
        const eqvPosId = symAtomSite.symopEqvPosId[target.ssgId]
        const rFractSite = symAtomSite.eqvPos[eqvPosId]
        const v = lnum.isub(
          lnum.add(target.rFractLatt.slice(0, qc.dim), rFractSite),
          qc._originFract)
        if (panel.target.isPar) {
          const vParCartn = lnum.mmul(qc.aParCartn, v)
          const vFract = lnum.mmul(qc.bParCartn, vParCartn)
          qc._originFract = lnum.add(qc._originFract, vFract).map(
            x => x - Math.floor(x))
        } else {
          const vPerpCartn = lnum.mmul(qc.aPerpCartn, v)
          const vFract = lnum.mmul(qc.bPerpCartn, vPerpCartn)
          qc._originFract = lnum.add(qc._originFract, vFract).map(
            x => x - Math.floor(x))
        }
        this.needGenRFractLatt = true
        this.needUpdateCartnTransform = true
        this.needUpdate = true
      } else if (target.type === TYPE_TEXT[TYPEID_NONE]) {
        const qc = this.qc
        const vFract = [...new Array(qc.dim)].map(
          x => (Math.random() - 0.5) * 1e-5)
        qc._originFract = lnum.add(qc._originFract, vFract).map(
          x => x - Math.floor(x))
        this.needGenRFractLatt = true
        this.needUpdateCartnTransform = true
        this.needUpdate = true
      }
    }
  }
}

function wheeled (evt) {
  const panel = this.panelAt(...this.canvasCoordOf(evt.clientX, evt.clientY))
  if (panel) {
    if (evt.ctrlKey) {
      const currentRCutParCartn = this.rCutParCartn
      const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
      const factor = Math.exp(-camera.zoomFactor * evt.deltaY)
      this.rCutParCartn = Math.min(this.rCutParCartnMax,
        currentRCutParCartn * factor)
      this.needUpdateHighlight = true
      this.needUpdate = true
    } else if (evt.shiftKey) {
      const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
      const qc = this.qc
      const factor = -camera.distance * camera.moveFactor
      const movement = [0, 0, factor * evt.deltaY, 0]
      const viewTrans = lnum.transpose(camera.viewMat())
      const v = lnum.mmul(viewTrans, movement).slice(0, 3)
      if (panel.target.isPar) {
        const vFract = lnum.mmul(qc.bParCartn, v.slice(0, qc.dimPar))
        qc._originFract = lnum.sub(qc._originFract, vFract).map(
          x => x - Math.floor(x))
      } else if (qc.dimPerp > 0) {
        const vFract = lnum.mmul(qc.bPerpCartn, v.slice(0, qc.dimPerp))
        qc._originFract = lnum.sub(qc._originFract, vFract).map(
          x => x - Math.floor(x))
      }
      this.needGenRFractLatt = true
      this.needUpdateCartnTransform = true
      this.needUpdate = true
    } else {
      const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
      let v = lnum.sub(camera.position, camera.lookAt)
      const factor = Math.exp(camera.zoomFactor * evt.deltaY)
      const norm = Math.hypot(v[0], v[1], v[2])
      const dist = Math.min(Math.max(norm * factor, camera.distMin),
        camera.distMax)
      v = lnum.ismul(inormalise(v), dist)
      camera.position = lnum.add(camera.lookAt, v)
      this.needUpdate = true
    }
  }
}

const FILL_BG_WHITE_VS = `#version 300 es
const vec4 xxyy = vec4(-1.0, 1.0, -1.0, 1.0);
const int ixy[12] = int[](0, 3, 0, 2, 1, 3, 1, 2, 1, 3, 0, 2);
void main() {
  int i = gl_VertexID * 2;
  int j = i + 1;
  gl_Position = vec4(xxyy[ixy[i]], xxyy[ixy[j]], 1.0, 1.0);
}`

const FILL_BG_WHITE_FS = `#version 300 es
precision highp float;
layout(location = 0) out vec4 outColour;
void main() {
  gl_FragDepth = 1.0;
  outColour = vec4(1.0, 1.0, 1.0, 1.0);
}`

const PREP_ODFRAG_3D_VS = `#version 300 es
layout(location = 0) in uint odId;
layout(location = 1) in vec3 rOD0;
layout(location = 2) in vec3 rOD1;
layout(location = 3) in vec3 rOD2;
layout(location = 4) in vec3 rOD3;
layout(location = 5) in uint ssgId;
uniform highp sampler2D ssg;
flat out uint vODIdSSGId;
out vec3 vBOD0;
out vec3 vBOD1;
out vec3 vBOD2;
out vec3 vROD0;
out vec3 vROD1;
out vec3 vROD2;
out vec3 vROD3;
void main() {
  uint id = ssgId * 3u;
  mat3 gPerp;
  gPerp[0] = texelFetch(ssg, ivec2(id, 1), 0).xyz;
  gPerp[1] = texelFetch(ssg, ivec2(id + 1u, 1), 0).xyz;
  gPerp[2] = texelFetch(ssg, ivec2(id + 2u, 1), 0).xyz;
  vec3 v[4] = vec3[4](rOD0 * gPerp, rOD1 * gPerp, rOD2 * gPerp, rOD3 * gPerp);
  bool flag = dot(cross(v[1] - v[0], v[2] - v[0]), v[3] - v[0]) > 0.0;
  vROD0 = flag ? v[0] : v[1];
  vROD1 = flag ? v[1] : v[0];
  vROD2 = v[2];
  vROD3 = v[3];
  mat3 bOD = inverse(mat3(vROD1 - vROD0, vROD2 - vROD0, vROD3 - vROD0));
  vBOD0 = bOD[0];
  vBOD1 = bOD[1];
  vBOD2 = bOD[2];
  vODIdSSGId = odId << ${SSGID_BIT_LENGTH}u | ssgId;
}`

const PREP_ODFRAG_3D_TF_VARYINGS = [
  'vODIdSSGId',
  'vBOD0',
  'vBOD1',
  'vBOD2',
  'vROD0',
  'vROD1',
  'vROD2',
  'vROD3']

const PREP_ODFRAG_2D_VS = `#version 300 es
layout(location = 0) in uint odId;
layout(location = 1) in vec2 rOD0;
layout(location = 2) in vec2 rOD1;
layout(location = 3) in vec2 rOD2;
layout(location = 4) in uint ssgId;
uniform highp sampler2D ssg;
flat out uint vODIdSSGId;
out vec2 vBOD0;
out vec2 vBOD1;
out vec2 vROD0;
out vec2 vROD1;
out vec2 vROD2;
void main() {
  uint id = ssgId * 3u;
  mat2 gPerp;
  gPerp[0] = texelFetch(ssg, ivec2(id, 1), 0).xy;
  gPerp[1] = texelFetch(ssg, ivec2(id + 1u, 1), 0).xy;
  vROD0 = rOD0 * gPerp;
  vROD1 = rOD1 * gPerp;
  vROD2 = rOD2 * gPerp;
  mat2 bOD = inverse(mat2(vROD1 - vROD0, vROD2 - vROD0));
  vBOD0 = bOD[0];
  vBOD1 = bOD[1];
  vODIdSSGId = odId << ${SSGID_BIT_LENGTH}u | ssgId;
}`

const PREP_ODFRAG_2D_TF_VARYINGS = [
  'vODIdSSGId',
  'vBOD0',
  'vBOD1',
  'vROD0',
  'vROD1',
  'vROD2']

const PREP_ODFRAG_1D_VS = `#version 300 es
layout(location = 0) in uint odId;
layout(location = 1) in float rOD0;
layout(location = 2) in float rOD1;
layout(location = 3) in uint ssgId;
uniform highp sampler2D ssg;
flat out uint vODIdSSGId;
out float vBOD0;
out float vROD0;
out float vROD1;
void main() {
  uint id = ssgId * 3u;
  float gPerp = texelFetch(ssg, ivec2(id, 1), 0).x;
  vROD0 = rOD0 * gPerp;
  vROD1 = rOD1 * gPerp;
  vBOD0 = 1.0 / (vROD1 - vROD0);
  vODIdSSGId = odId << ${SSGID_BIT_LENGTH}u | ssgId;
}`

const PREP_ODFRAG_1D_TF_VARYINGS = [
  'vODIdSSGId',
  'vBOD0',
  'vROD0',
  'vROD1']

const PREP_ODFRAG_0D_VS = `#version 300 es
layout(location = 0) in uint odId;
layout(location = 1) in uint ssgId;
flat out uint vODIdSSGId;
void main() {
  vODIdSSGId = odId << ${SSGID_BIT_LENGTH}u | ssgId;
}`

const PREP_ODFRAG_0D_TF_VARYINGS = [
  'vODIdSSGId']

const PREP_ODFRAG_VS = [
  PREP_ODFRAG_0D_VS, PREP_ODFRAG_1D_VS, PREP_ODFRAG_2D_VS, PREP_ODFRAG_3D_VS]

const PREP_ODFRAG_TF_VARYINGS = [
  PREP_ODFRAG_0D_TF_VARYINGS, PREP_ODFRAG_1D_TF_VARYINGS,
  PREP_ODFRAG_2D_TF_VARYINGS, PREP_ODFRAG_3D_TF_VARYINGS]

const GEN_OD_INSTANCE_3D_VS = `#version 300 es
layout(location = 0) in int vId;
layout(location = 1) in uint odIdSSGId;
layout(location = 2) in vec3 rOD0;
layout(location = 3) in vec3 rOD1;
layout(location = 4) in vec3 rOD2;
layout(location = 5) in vec3 rOD3;
uniform sampler2D odColourRadius;
layout(std140) uniform Highlight {
  float rCutParCartn;
  float baseRadius;
  vec4 unhighlightColourRadiusFactor;
  uvec4 highlightRef;
  uvec4 highlightMask;
};
out vec3 vPosition;
out vec4 vColour;
flat out uvec4 vInfo;
void main() {
  vec3 v[4] = vec3[4](rOD0, rOD1, rOD2, rOD3);
  vPosition = v[vId];
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  vColour = vec4(texelFetch(odColourRadius, ivec2(
    odId % ${DATA_TEXTURE_WIDTH}u,
    odId >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0).rgb, 0.7);
  vInfo = uvec4(${TYPEID_OD}u, odIdSSGId, 0u, 0u);
  if ((vInfo & highlightMask) != (highlightRef & highlightMask)) {
    vColour *= unhighlightColourRadiusFactor;
  }
}`

const GEN_OD_INSTANCE_2D_VS = `#version 300 es
layout(location = 0) in int vId;
layout(location = 1) in uint odIdSSGId;
layout(location = 2) in vec2 rOD0;
layout(location = 3) in vec2 rOD1;
layout(location = 4) in vec2 rOD2;
uniform sampler2D odColourRadius;
layout(std140) uniform Highlight {
  float rCutParCartn;
  float baseRadius;
  vec4 unhighlightColourRadiusFactor;
  uvec4 highlightRef;
  uvec4 highlightMask;
};
out vec3 vPosition;
out vec4 vColour;
flat out uvec4 vInfo;
void main() {
  vec2 v[3] = vec2[3](rOD0, rOD1, rOD2);
  vPosition = vec3(v[vId], 0.0);
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  vColour = vec4(texelFetch(odColourRadius, ivec2(
    odId % ${DATA_TEXTURE_WIDTH}u,
    odId >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0).rgb, 0.7);
  vInfo = uvec4(${TYPEID_OD}u, odIdSSGId, 0u, 0u);
  if ((vInfo & highlightMask) != (highlightRef & highlightMask)) {
    vColour *= unhighlightColourRadiusFactor;
  }
}`

const GEN_OD_INSTANCE_1D_VS = `#version 300 es
layout(location = 0) in int vId;
layout(location = 1) in uint odIdSSGId;
layout(location = 2) in float rOD0;
layout(location = 3) in float rOD1;
uniform sampler2D odColourRadius;
layout(std140) uniform Highlight {
  float rCutParCartn;
  float baseRadius;
  vec4 unhighlightColourRadiusFactor;
  uvec4 highlightRef;
  uvec4 highlightMask;
};
out vec3 vPosition;
out vec4 vColour;
flat out uvec4 vInfo;
void main() {
  float v[2] = float[2](rOD0, rOD1);
  vPosition = vec3(v[vId], 0.0, 0.0);
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  vColour = vec4(texelFetch(odColourRadius, ivec2(
    odId % ${DATA_TEXTURE_WIDTH}u,
    odId >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0).rgb, 0.7);
  uvec4 vInfo = uvec4(${TYPEID_OD}u, odIdSSGId, 0u, 0u);
  if ((vInfo & highlightMask) != (highlightRef & highlightMask)) {
    vColour *= unhighlightColourRadiusFactor;
  }
}`

const GEN_OD_INSTANCE_0D_VS = `#version 300 es
layout(location = 0) in int vId;
layout(location = 1) in uint odIdSSGId;
uniform sampler2D odColourRadius;
layout(std140) uniform Highlight {
  float rCutParCartn;
  float baseRadius;
  vec4 unhighlightColourRadiusFactor;
  uvec4 highlightRef;
  uvec4 highlightMask;
};
out vec3 vPosition;
out vec4 vColour;
flat out uvec4 vInfo;
void main() {
  vPosition = vec3(0.0);
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  vColour = vec4(texelFetch(odColourRadius, ivec2(
    odId % ${DATA_TEXTURE_WIDTH}u,
    odId >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0).rgb, 0.7);
  uvec4 vInfo = uvec4(${TYPEID_OD}u, odIdSSGId, 0u, 0u);
  if ((vInfo & highlightMask) != (highlightRef & highlightMask)) {
    vColour *= unhighlightColourRadiusFactor;
  }
}`

const GEN_OD_INSTANCE_VS = [
  GEN_OD_INSTANCE_0D_VS, GEN_OD_INSTANCE_1D_VS, GEN_OD_INSTANCE_2D_VS,
  GEN_OD_INSTANCE_3D_VS]

const GEN_OD_INSTANCE_TF_VARYINGS = ['vPosition', 'vColour', 'vInfo']

const DRAW_ODFRAGS_VS = `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec4 colour;
layout(location = 2) in vec3 rParCartn;
layout(location = 3) in vec3 rPerpCartn;
layout(location = 4) in vec4 atomColourRadius;
uniform mat4 vmat, pmat, vmatPerp;
out vec3 vPosition;
out vec4 vColour;
void main() {
  gl_PointSize = 2.0;
  gl_Position = vec4(position - rPerpCartn, 0.0) * vmatPerp + 
    vec4(rParCartn, 1.0) * vmat;
  vPosition = gl_Position.xyz;
  gl_Position *= pmat;
  vColour = colour;
  if (atomColourRadius.a == 0.0) {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
}`

const DRAW_ODFRAGS_INFO_VS = `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in uvec4 info;
layout(location = 2) in vec3 rParCartn;
layout(location = 3) in vec3 rPerpCartn;
uniform mat4 vmat, pmat, vmatPerp;
flat out uvec4 vColour;
void main() {
  gl_PointSize = 2.0;
  gl_Position = (vec4(position - rPerpCartn, 0.0) * vmatPerp
    + vec4(rParCartn, 1.0) * vmat) * pmat;
  vColour = info;
}`

const PROJ_VS = `#version 300 es
layout(location = 0) in lowp ivec3 rFractLatt123;
layout(location = 1) in lowp ivec3 rFractLatt456;
layout(location = 2) in vec3 rFractSite123;
layout(location = 3) in vec3 rFractSite456;
layout(std140) uniform CartnTransform {
  mat3 aParCartn123;
  mat3 aParCartn456;
  mat3 aPerpCartn123;
  mat3 aPerpCartn456;
  vec3 originFract123;
  vec3 originFract456;
};
flat out uvec2 vRFractLattId;
out vec3 vRParCartn;
out vec3 vRPerpCartn;
void main() {
  vec3 rFract123 = vec3(rFractLatt123) + rFractSite123 - originFract123;
  vec3 rFract456 = vec3(rFractLatt456) + rFractSite456 - originFract456;
  vRParCartn = rFract123 * aParCartn123 + rFract456 * aParCartn456;
  vRPerpCartn = -(rFract123 * aPerpCartn123 + rFract456 * aPerpCartn456);
  uvec3 rFractLatt123u = uvec3(ivec3(rFractLatt123) + 128);
  uvec3 rFractLatt456u = uvec3(ivec3(rFractLatt456) + 128);
  vRFractLattId = uvec2(
    rFractLatt123u[0] << 24u | rFractLatt123u[1] << 16u |
    rFractLatt123u[2] << 8u | rFractLatt456u[0],
    rFractLatt456u[1] << 24u | rFractLatt456u[2] << 16u);
}`

const CUT_3D_VS = `#version 300 es
layout(location = 0) in vec3 rPerpCartn;
layout(location = 1) in uint odIdSSGId;
layout(location = 2) in vec3 bOD0;
layout(location = 3) in vec3 bOD1;
layout(location = 4) in vec3 bOD2;
layout(location = 5) in vec3 rOD0;
flat out uvec4 vColour;
void main() {
  mat3 bOD = mat3(bOD0, bOD1, bOD2);
  vec3 v = bOD * (rPerpCartn - rOD0);
  if (
    v.x + v.y + v.z <= 1.0 + ${TOL_CUT} &&
    all(greaterThanEqual(v, vec3(-${TOL_CUT})))
  ) {
    gl_Position = vec4(
      (vec2(gl_VertexID % ${CUT_TEXTURE_WIDTH},
        gl_VertexID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}) * 2.0 + 1.0)
        / float(${CUT_TEXTURE_WIDTH}) - 1.0,
      0.0, 1.0);
  } else {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
  gl_PointSize = 1.0;
  vColour = uvec4(odIdSSGId, 0u, 0u, 0u);
}`

const CUT_2D_VS = `#version 300 es
layout(location = 0) in vec3 rPerpCartn;
layout(location = 1) in uint odIdSSGId;
layout(location = 2) in vec2 bOD0;
layout(location = 3) in vec2 bOD1;
layout(location = 4) in vec2 rOD0;
flat out uvec4 vColour;
void main() {
  mat2 bOD = mat2(bOD0, bOD1);
  vec2 v = bOD * (rPerpCartn.xy - rOD0);
  if (
    v.x + v.y <= 1.0 + ${TOL_CUT} &&
    all(greaterThanEqual(v, vec2(-${TOL_CUT})))
  ) {
    gl_Position = vec4(
      (vec2(gl_VertexID % ${CUT_TEXTURE_WIDTH},
        gl_VertexID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}) * 2.0 + 1.0)
        / float(${CUT_TEXTURE_WIDTH}) - 1.0,
      0.0, 1.0);
  } else {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
  gl_PointSize = 1.0;
  vColour = uvec4(odIdSSGId, 0u, 0u, 0u);
}`

const CUT_1D_VS = `#version 300 es
layout(location = 0) in vec3 rPerpCartn;
layout(location = 1) in uint odIdSSGId;
layout(location = 2) in float bOD0;
layout(location = 3) in float rOD0;
flat out uvec4 vColour;
void main() {
  float v = bOD0 * (rPerpCartn.x - rOD0);
  if (v <= 1.0 + ${TOL_CUT} && v >= float(-${TOL_CUT})) {
    gl_Position = vec4(
      (vec2(gl_VertexID % ${CUT_TEXTURE_WIDTH},
        gl_VertexID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}) * 2.0 + 1.0)
        / float(${CUT_TEXTURE_WIDTH}) - 1.0,
      0.0, 1.0);
  } else {
    gl_Position = vec4(vec3(1.0), 0.0);
  }
  gl_PointSize = 1.0;
  vColour = uvec4(odIdSSGId, 0u, 0u, 0u);
}`

const CUT_0D_VS = `#version 300 es
layout(location = 0) in vec3 rPerpCartn;
layout(location = 1) in uint odIdSSGId;
flat out uvec4 vColour;
void main() {
  gl_Position = vec4(
    (vec2(gl_VertexID % ${CUT_TEXTURE_WIDTH},
      gl_VertexID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}) * 2.0 + 1.0)
      / float(${CUT_TEXTURE_WIDTH}) - 1.0,
    0.0, 1.0);
  gl_PointSize = 1.0;
  vColour = uvec4(odIdSSGId, 0u, 0u, 0u);
}`

const CUT_VS = [CUT_0D_VS, CUT_1D_VS, CUT_2D_VS, CUT_3D_VS]

const COLOUR_ATOMS_VS = `#version 300 es
layout(location = 0) in uvec2 rFractLattId;
layout(location = 1) in vec3 rParCartn;
uniform highp usampler2D cut;
uniform sampler2D odColourRadius;
layout(std140) uniform Highlight {
  float rCutParCartn;
  float baseRadius;
  vec4 unhighlightColourRadiusFactor;
  uvec4 highlightRef;
  uvec4 highlightMask;
};
out vec4 vColourRadius;
flat out uvec4 vInfo;
void main() {
  uint odIdSSGId = texelFetch(cut, ivec2(
    gl_VertexID % ${CUT_TEXTURE_WIDTH},
    gl_VertexID >> ${CUT_TEXTURE_WIDTH_BIT_LENGTH}), 0).r;
  uint odId = odIdSSGId >> ${SSGID_BIT_LENGTH}u;
  if (odId != ${INVALID_ODID}u) {
    vColourRadius = texelFetch(odColourRadius, ivec2(
      odId % ${DATA_TEXTURE_WIDTH}u,
      odId >> ${DATA_TEXTURE_WIDTH_BIT_LENGTH}), 0);
    vColourRadius.a *= baseRadius;
  } else {
    vColourRadius = vec4(0.0, 0.0, 0.0, 0.0);
  }
  if (length(rParCartn) >= rCutParCartn) {
    vColourRadius.a = 0.0;
  }
  vInfo = uvec4(${TYPEID_ATOM}u, odIdSSGId, rFractLattId);
  if ((vInfo & highlightMask) != (highlightRef & highlightMask)) {
    vColourRadius *= unhighlightColourRadiusFactor;
  }
}`

const DRAW_ATOMS_VS = `#version 300 es
layout(location = 0) in vec3 sphPosition;
layout(location = 1) in vec3 position;
layout(location = 2) in vec4 colourRadius;
uniform mat4 vmat, pmat;
out vec3 vNormal;
out vec4 vColour;
void main() {
  gl_Position = (vec4(position, 1.0) * vmat + vec4(colourRadius.a * sphPosition,
    0.0)) * pmat;
  vNormal = sphPosition;
  vColour = vec4(colourRadius.rgb, 1.0);
}`

const DRAW_ATOMS_INFO_VS = `#version 300 es
layout(location = 0) in vec3 sphPosition;
layout(location = 1) in vec3 position;
layout(location = 2) in vec4 colourRadius;
layout(location = 3) in uvec4 info;
uniform mat4 vmat, pmat;
flat out uvec4 vColour;
void main() {
  gl_Position = (vec4(position, 1.0) * vmat + vec4(colourRadius.a * sphPosition,
    0.0)) * pmat;
  vColour = info;
}`

/*
const DRAW_ATOMS_VS = `#version 300 es
layout (location = 0) in vec3 sphPosition;
layout (location = 1) in vec3 position;
layout (location = 2) in vec4 colourRadius;
uniform mat4 vmat, vpmat;
uniform vec3 originOffset;
out vec3 vNormal;
out vec4 vColour;
void main() {
  gl_Position = vec4(position + originOffset + colourRadius.a * sphPosition,
    1.0) * vpmat;
  vNormal = normalize((vec4(sphPosition, 0.0) * vmat).xyz);
  vColour = vec4(colourRadius.rgb, 1.0);
}`
*/

const DRAW_BONDS_VS = `#version 300 es
layout (location = 0) in vec3 cylPosition;
layout (location = 1) in vec3 cylNormal;
layout (location = 2) in vec3 position1;
layout (location = 3) in vec3 position2;
layout (location = 4) in float radius;
layout (location = 5) in vec3 colour1;
layout (location = 6) in vec3 colour2;
uniform int halfVCount;
uniform mat4 vmat, vpmat;
uniform vec3 originOffset;
out vec3 vNormal;
out vec4 vColour;
bool first;
vec3 dr;
float len, csth, snth, csph, snph;
mat4 mmat;
void main() {
  first = gl_VertexID < halfVCount;
  dr = position2 - position1;
  len = sqrt(dot(dr, dr));
  dr /= len;
  csth = dr.z;
  snth = sqrt(dot(dr.xy, dr.xy));
  csph = (snth == 0.0)? 1.0: dr.x / snth;
  snph = (snth == 0.0)? 0.0: dr.y / snth;
  mmat[0] = vec4(csph * csth, snph * csth, -snth, 0.0);
  mmat[1] = vec4(-snph, csph, 0.0, 0.0);
  mmat[2] = vec4(csph * snth, snph * snth, csth, 0.0);
  mmat[3] = vec4(position1, 1.0);
  gl_Position = vec4(vec3(radius * cylPosition.xy, len * cylPosition.z)
    + originOffset, 1.0) * mmat * vpmat;
  vNormal = normalize((vec4(cylNormal, 0.0) * mmat * vmat).xyz);
  vColour = vec4(first? colour1: colour2, 1.0);
}`

const DRAW_FLATFACES_VS = `#version 300 es
layout (location = 0) in vec3 position;
layout (location = 1) in vec4 colour;
uniform mat4 vmat, vpmat;
uniform vec3 originOffset;
out vec3 vPosition;
out vec4 vColour;
void main() {
  gl_Position = vec4(position + originOffset, 1.0) * vpmat;
  vPosition = (vec4(position, 1.0) * vmat).xyz;
  vColour = colour;
}`

const DRAW_LINES_VS = `#version 300 es
layout (location = 0) in vec3 position;
layout (location = 1) in vec4 colour;
uniform mat4 vpmat;
uniform vec3 originOffset;
out vec4 vColour;
void main() {
  gl_Position = vec4(position + originOffset, 1.0) * vpmat;
  vColour = colour;
}`

const DUMMY_FS = `#version 300 es
void main() {
  discard;
}`

const SIMPLE_FS = `#version 300 es
precision highp float;
in vec4 vColour;
layout(location = 0) out vec4 outColour;
void main() {
  outColour = vColour;
}`

const SIMPLE_UINT_FS = `#version 300 es
precision highp int;
flat in uvec4 vColour;
layout(location = 0) out uvec4 outColour;
void main() {
  outColour = vColour;
}`

const DRAW_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec4 vColour;
uniform vec3 directionalLightDir;
uniform vec3 ambientLightColour;
uniform float reflectivity;
layout (location = 0) out vec4 outColour;
void main() {
  vec3 normal = normalize(vNormal);
  vec3 normalLightDir = -normalize(directionalLightDir);
  float cos = dot(normal, normalLightDir);
  outColour = vec4(
    1.5 * vColour.xyz * ((1.0 - reflectivity) * max(cos, 0.0)
    + (1.0 - abs(cos)) * ambientLightColour)
    + reflectivity * vec3(pow(clamp(dot(normal,
    normalize(normalLightDir + vec3(0, 0, 1))), 0.0, 1.0), 5.0)), vColour.a);
  // if (normal.z < 0.4) {
  //   outColour = vec4(vec3(0.0), 1.0);
  // }
}`

const DRAW_FLAT_FS = `#version 300 es
precision highp float;
in vec3 vPosition;
in vec4 vColour;
uniform vec3 directionalLightDir;
uniform vec3 ambientLightColour;
uniform float reflectivity;
layout (location = 0) out vec4 outColour;
void main() {
  vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
  vec3 normalLightDir = -normalize(directionalLightDir);
  float cos = dot(normal, normalLightDir);
  outColour = vec4(
    1.5 * vColour.xyz * ((1.0 - reflectivity) * max(cos, 0.0)
    + (1.0 - abs(cos)) * ambientLightColour)
    + reflectivity * vec3(pow(clamp(dot(normal,
    normalize(normalLightDir + vec3(0, 0, 1))), 0.0, 1.0), 5.0)), vColour.a);
}`

export class QCWeb2Experimental {
  constructor (canvas, qc, {
    nSubOctahedron = 7,
    nphCylinder = 13,
    rCutParCartnMax = 7.0,
    rCutParCartnInit = rCutParCartnMax,
    baseRadius = 0.3,
    unhighlightColourRadiusFactor = [0.1, 0.1, 0.1, 0.1],
    highlightRef = [0, 0, 0, 0],
    highlightMask = genHighlightMask(false, false, false, false),
    colourRadiusTable = {}
  } = {}) {
    this.qc = qc
    if (qc.dimPerp > 3) {
      throw Error('dimPerp > 3 not supported')
    }
    this.rCutParCartnMax = rCutParCartnMax
    this.rCutParCartn = rCutParCartnInit
    this.baseRadius = baseRadius
    this.unhighlightColourRadiusFactor = unhighlightColourRadiusFactor
    this.highlightRef = highlightRef
    this.highlightMask = highlightMask
    this.colourRadiusTable = colourRadiusTable
    this.gl = canvas.getContext('webgl2', { antialias: false })
    this.rootPanel = SplittablePanel.fromWebGLContext(this.gl)
    this.setPanelTarget(this.rootPanel)
    this.light = new Light({
      directionalDir: [-0.3, -0.7, -0.5],
      ambientColour: [0.5, 0.5, 0.5] })
    this.cameraPar = new Camera()
    this.cameraPar.orthographic = false
    this.cameraPerp = new Camera()
    this.cameraPerp.orthographic = false
    this.createFramebuffers()
    // vertex shaders
    this.vsFillBGWhite = this.compileVertexShader(FILL_BG_WHITE_VS)
    this.vsDrawAtoms = this.compileVertexShader(DRAW_ATOMS_VS)
    this.vsDrawAtomsInfo = this.compileVertexShader(DRAW_ATOMS_INFO_VS)
    this.vsDrawBonds = this.compileVertexShader(DRAW_BONDS_VS)
    this.vsDrawFaces = this.compileVertexShader(DRAW_FLATFACES_VS)
    this.vsDrawLines = this.compileVertexShader(DRAW_LINES_VS)
    this.vsProj = this.compileVertexShader(PROJ_VS)
    this.vsColourAtoms = this.compileVertexShader(COLOUR_ATOMS_VS)
    this.vsPrepODFrag = this.compileVertexShader(PREP_ODFRAG_VS[qc.dimPerp])
    this.vsGenODInstance = this.compileVertexShader(
      GEN_OD_INSTANCE_VS[qc.dimPerp])
    this.vsDrawODFrags = this.compileVertexShader(DRAW_ODFRAGS_VS)
    this.vsDrawODFragsInfo = this.compileVertexShader(DRAW_ODFRAGS_INFO_VS)
    this.vsCut = this.compileVertexShader(CUT_VS[qc.dimPerp])
    // fragment shaders
    this.fsFillBGWhite = this.compileFragmentShader(FILL_BG_WHITE_FS)
    this.fsDraw = this.compileFragmentShader(DRAW_FS)
    this.fsDrawFlat = this.compileFragmentShader(DRAW_FLAT_FS)
    this.fsSimple = this.compileFragmentShader(SIMPLE_FS)
    this.fsSimpleUint = this.compileFragmentShader(SIMPLE_UINT_FS)
    this.fsDummy = this.compileFragmentShader(DUMMY_FS)
    // programs
    this.prgFillBGWhite = this.createProgram(this.vsFillBGWhite,
      this.fsFillBGWhite)
    this.prgDrawAtoms = this.createProgram(this.vsDrawAtoms, this.fsDraw)
    this.prgDrawAtomsInfo = this.createProgram(this.vsDrawAtomsInfo,
      this.fsSimpleUint)
    this.prgDrawBonds = this.createProgram(this.vsDrawBonds, this.fsDraw)
    this.prgDrawFaces = this.createProgram(this.vsDrawFaces, this.fsDrawFlat)
    this.prgDrawLines = this.createProgram(this.vsDrawLines, this.fsSimple)
    this.prgProj = this.createProgram(this.vsProj, this.fsDummy, {
      tfVaryings: ['vRFractLattId', 'vRParCartn', 'vRPerpCartn'],
      tfBuffMode: this.gl.INTERLEAVED_ATTRIBS,
      uboBlockBindings: [
        {
          blockName: 'CartnTransform',
          blockBinding: CARTN_TRANSFORM_UNIFORM_BINDING
        }
      ] })
    this.prgColourAtoms = this.createProgram(this.vsColourAtoms, this.fsDummy, {
      tfVaryings: ['vColourRadius', 'vInfo'],
      tfBuffMode: this.gl.INTERLEAVED_ATTRIBS,
      uboBlockBindings: [
        {
          blockName: 'Highlight',
          blockBinding: HIGHLIGHT_UNIFORM_BINDING
        }
      ] })
    this.prgCut = this.createProgram(this.vsCut, this.fsSimpleUint)
    this.prgGenODInstance = this.createProgram(this.vsGenODInstance,
      this.fsDummy, {
        tfVaryings: GEN_OD_INSTANCE_TF_VARYINGS,
        tfBuffMode: this.gl.INTERLEAVED_ATTRIBS,
        uboBlockBindings: [
          {
            blockName: 'Highlight',
            blockBinding: HIGHLIGHT_UNIFORM_BINDING
          }
        ] })
    this.prgDrawODFrags = this.createProgram(this.vsDrawODFrags,
      this.fsDrawFlat)
    this.prgDrawODFragsInfo = this.createProgram(this.vsDrawODFragsInfo,
      this.fsSimpleUint)
    this.prgPrepODFrag = this.createProgram(this.vsPrepODFrag, this.fsDummy, {
      tfVaryings: PREP_ODFRAG_TF_VARYINGS[qc.dimPerp],
      tfBuffMode: this.gl.INTERLEAVED_ATTRIBS })
    this.initSphere(genHalfOctahedron(nSubOctahedron))
    // this.initSphere(genIcosahedron(nsubIcosahedron))
    // this.initSphere(genSphere(11, 22))
    this.initCylinder(genCylinder(nphCylinder))
    this.initODFragVId(qc.dimPerp)
    this.initVboDummy()
    this.initCartnTransformUniform()
    this.initHighlightUniform()
    this.initSSGTexture()
    // console.time()
    this.initODData()
    // console.timeEnd()
    this.initODColourRadiusTexture()
    this.updateGenRFractLatt()
    // console.time()
    // this.updateGenRFractLattNew()
    // console.timeEnd()
    this.initProjAndCut()
    // info for interactive tools
    this.needUpdate = true
    // test
    this.needGenRFractLatt = true
    this.generatingRFractLatt = false
    this.needUpdateCartnTransform = true
    this.needUpdateHighlight = true
    this.needUpdateODColourRadius = true
    this.ui = {
      showAtoms: true,
      showODs: true,
      showODsOnlyAsym: false,
      separatorDetectWidth: 3,
      separatorColour: [0, 0, 0, 1]
    }
  }

  update () {
    if (this.needUpdate) {
      this.needUpdate = false
      const gl = this.gl
      // console.log(gl.getParameter(gl.RED_BITS), gl.getParameter(gl.GREEN_BITS), gl.getParameter(gl.BLUE_BITS), gl.getParameter(gl.ALPHA_BITS), gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, gl.getParameter(gl.SAMPLE_BUFFERS), gl.getParameter(gl.SAMPLES), gl.getParameter(gl.MAX_SAMPLES))
      if (this.needUpdateODColourRadius) {
        this.needUpdateODColourRadius = false
        this.updateODColourRadiusTexture()
      }
      if (this.needUpdateCartnTransform) {
        this.needUpdateCartnTransform = false
        this.updateCartnTransformUniform()
      }
      if (this.needUpdateHighlight) {
        this.needUpdateHighlight = false
        this.updateHighlightUniform()
      }
      if (this.needGenRFractLatt && !this.generatingRFractLatt) {
        this.needGenRFractLatt = false
        this.generatingRFractLatt = true
        for (let i = 0, n = this.atomSites.length; i < n; i += 1) {
          const atomSite = this.atomSites[i]
          for (let j = 0, m = atomSite.eqvPos.length; j < m; j += 1) {
            this.genRFractLatt(i, j)
          }
        }
        this.generatingRFractLatt = false
        this.needUpdate = true
      }

      // assign panels
      this.parPanels = []
      for (const atomSite of this.atomSites) {
        for (const pos of atomSite.eqvPos) {
          pos.perpPanels = []
        }
      }
      for (const panel of this.rootPanel) {
        const target = panel.target
        if (target.isPar) {
          this.parPanels.push(panel)
        } else {
          this.atomSites[target.atomSiteId]
            .eqvPos[target.eqvPosId]
            .perpPanels.push(panel)
        }
      }
      // clear info
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbInfo)
      gl.clearBufferuiv(gl.COLOR, 0,
        [0, INVALID_ODID << SSGID_BIT_LENGTH, 0, 0])
      gl.clearBufferfv(gl.DEPTH, 0, [1.0])
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
      // main
      this.clearFramebuffer(this.fbMain)
      for (let i = 0, n = this.atomSites.length; i < n; i += 1) {
        const atomSite = this.atomSites[i]
        for (let j = 0, m = atomSite.eqvPos.length; j < m; j += 1) {
          const pos = atomSite.eqvPos[j]

          this.genODInstance(i, j)
          this.projAndCut(i, j)

          for (const panel of this.parPanels) {
            if (this.ui.showAtoms) {
              this.drawAtoms(panel, pos.vaoDrawAtomsPar,
                pos.rFractLattCache.length / 6)
              this.drawAtomsInfo(panel, pos.vaoDrawAtomsInfoPar,
                pos.rFractLattCache.length / 6)
            }
            // this.drawODFrags(panel, pos.vaoDrawODFragsPar, pos.odFrags.num,
            //   pos.rFractLattCache.length / 6)
            // this.drawODFragsInfo(panel, pos.vaoDrawODFragsInfoPar,
            //   pos.odFrags.num, pos.rFractLattCache.length / 6)
          }

          for (const panel of pos.perpPanels) {
            if (this.ui.showAtoms) {
              this.drawAtoms(panel, pos.vaoDrawAtomsPerp,
                pos.rFractLattCache.length / 6)
              this.drawAtomsInfo(panel, pos.vaoDrawAtomsInfoPerp,
                pos.rFractLattCache.length / 6, panel)
            }
            if (this.ui.showODs) {
              const num = pos.odFrags.num /
                (this.ui.showODsOnlyAsym ? atomSite.siteSymOrder : 1)
              this.drawODFrags(panel, pos.vaoDrawODFragsPerp, num)
              this.drawODFragsInfo(panel, pos.vaoDrawODFragsInfoPerp, num)
            }
          }
        }
      }
      gl.useProgram(this.prgFillBGWhite)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbMain)
      gl.viewport(0, 0, this.rootPanel.width, this.rootPanel.height)
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.GREATER)
      gl.colorMask(false, false, false, true)
      gl.depthMask(false)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      gl.depthMask(true)
      gl.colorMask(true, true, true, true)
      gl.depthFunc(gl.LESS)
      gl.disable(gl.DEPTH_TEST)
      gl.useProgram(null)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
      this.clearFramebuffer(null)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbMain)
      gl.readBuffer(gl.COLOR_ATTACHMENT0)
      gl.blitFramebuffer(0, 0, this.rootPanel.width, this.rootPanel.height, 0,
        0, this.rootPanel.width, this.rootPanel.height, gl.COLOR_BUFFER_BIT,
        gl.LINEAR)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
      // draw borders of panels
      gl.clearColor(...this.ui.separatorColour)
      gl.enable(gl.SCISSOR_TEST)
      for (
        const separator of
        this.rootPanel.separators(this.ui.separatorDetectWidth)
      ) {
        gl.scissor(separator.x, separator.y, separator.width, separator.height)
        gl.clear(gl.COLOR_BUFFER_BIT)
      }
      gl.disable(gl.SCISSOR_TEST)
    }
    if (!this.once) {
      this.once = true
    }
  }

  canvasCoordOf (clientX, clientY) {
    const gl = this.gl
    const canvas = gl.canvas
    const clientRect = canvas.getBoundingClientRect()
    // adapt css-transform?
    // remove scroll-bars?
    const style = window.getComputedStyle(canvas)
    const pl = parseInt(style.getPropertyValue('padding-left'), 10)
    const pr = parseInt(style.getPropertyValue('padding-right'), 10)
    const pt = parseInt(style.getPropertyValue('padding-top'), 10)
    const pb = parseInt(style.getPropertyValue('padding-bottom'), 10)
    const bl = parseInt(style.getPropertyValue('border-left-width'), 10)
    const bt = parseInt(style.getPropertyValue('border-top-width'), 10)
    // console.log(pl, pr, pt, pb, bl, br, bt, bb, clientRect, canvas.clientWidth)
    const x = (clientX - (clientRect.left + pl + bl)) *
      gl.drawingBufferWidth / (canvas.clientWidth - pl - pr)
    const y = gl.drawingBufferHeight *
      (1 - (clientY - (clientRect.top + pt + bt)) /
      (canvas.clientHeight - pt - pb)) - 1
    return [x, y]
  }

  clientSizeOf (panel) {
    const gl = this.gl
    const canvas = gl.canvas
    const style = window.getComputedStyle(canvas)
    const pl = parseInt(style.getPropertyValue('padding-left'), 10)
    const pr = parseInt(style.getPropertyValue('padding-right'), 10)
    const pt = parseInt(style.getPropertyValue('padding-top'), 10)
    const pb = parseInt(style.getPropertyValue('padding-bottom'), 10)
    const panelClientWidth = panel.width / gl.drawingBufferWidth *
      (canvas.clientWidth - pl - pr)
    const panelClientHeight = panel.height / gl.drawingBufferHeight *
      (canvas.clientHeight - pt - pb)
    return [panelClientWidth, panelClientHeight]
  }

  panelAt (x, y, separatorDetectWidth = 0) {
    return this.rootPanel.panelAt(x, y, separatorDetectWidth)
  }

  // TODO: check if the specified atom site of eqvPosId exists or not?
  setPanelTarget (panel, atomSiteId, eqvPosId = 0) {
    panel.target = {
      isPar: atomSiteId === undefined,
      atomSiteId: atomSiteId,
      eqvPosId: eqvPosId }
  }

  clearFramebuffer (fb = null) {
    const gl = this.gl
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb)
    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1.0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
  }

  /*
  drawAtoms (panel) {
    const [vao, numAtoms] = (() => {
      if (panel.target.isPar) {
        return [this.vaoAtomsPar, this.numAtoms]
      } else {
        const atomSite = this.atomSites[panel.target.atomSiteId]
        const eqvPos = atomSite.eqvPos[panel.target.eqvPosId]
        return [eqvPos.vaoAtomsPerp, eqvPos.numAtoms]
      }
    })()
    if (numAtoms <= 0) {
      return
    }
    const gl = this.gl
    const prg = this.prgDrawAtoms
    const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
    const light = this.light
    const vmat = camera.viewMat()
    const aspectRatio = this.aspectRatioOf(panel)
    const pmat = camera.projectionMat(aspectRatio)
    gl.useProgram(prg)
    gl.viewport(panel.x, panel.y, panel.width, panel.height)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vmat'), false,
      new Float32Array(vmat))
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'pmat'), false,
      new Float32Array(pmat))
    gl.uniform3fv(gl.getUniformLocation(prg, 'directionalLightDir'),
      new Float32Array(light.directionalDir))
    gl.uniform3fv(gl.getUniformLocation(prg, 'ambientLightColour'),
      new Float32Array(light.ambientColour))
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.5)
    gl.bindVertexArray(vao)
    gl.drawElementsInstanced(gl.TRIANGLE_STRIP, this.lenIboSphere,
      gl.UNSIGNED_INT, 0, numAtoms)
    gl.bindVertexArray(null)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.useProgram(null)
  }
  */

  /*
  drawAtoms (panel) {
    const gl = this.gl
    const prg = this.prgDrawAtoms
    const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
    const light = this.light
    const vmat = camera.viewMat()
    const aspectRatio = this.aspectRatioOf(panel)
    const pmat = camera.projectionMat(aspectRatio)
    const vpmat = lnum.mmul(pmat, vmat)
    gl.useProgram(prg)
    gl.viewport(panel.x, panel.y, panel.width, panel.height)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vmat'), false,
      new Float32Array(vmat))
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vpmat'), false,
      new Float32Array(vpmat))
    gl.uniform3fv(gl.getUniformLocation(prg, 'directionalLightDir'),
      new Float32Array(light.directionalDir))
    gl.uniform3fv(gl.getUniformLocation(prg, 'ambientLightColour'),
      new Float32Array(light.ambientColour))
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.5)
    //
    for (const model of panel.model) {
      if (model.draw && model.drawAtoms && model.vaoDrawAtoms) {
        gl.bindVertexArray(model.vaoDrawAtoms)
        gl.drawElementsInstanced(gl.TRIANGLE_STRIP, this.lenIboSphere,
          gl.UNSIGNED_INT, 0, model.natoms)
        gl.bindVertexArray(null)
      }
    }
    //
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.useProgram(null)
  }

  drawBonds (panel) {
    const gl = this.gl
    const prg = this.prgDrawBonds
    const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
    const light = this.light
    const vmat = camera.viewMat()
    const aspectRatio = this.aspectRatioOf(panel)
    const pmat = camera.projectionMat(aspectRatio)
    const vpmat = lnum.mmul(pmat, vmat)
    gl.useProgram(prg)
    gl.viewport(panel.x, panel.y, panel.width, panel.height)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.uniform1i(gl.getUniformLocation(prg, 'halfVCount'),
      this.halfVCountCylinder)
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vmat'), false,
      new Float32Array(vmat))
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vpmat'), false,
      new Float32Array(vpmat))
    gl.uniform3fv(gl.getUniformLocation(prg, 'directionalLightDir'),
      new Float32Array(light.directionalDir))
    gl.uniform3fv(gl.getUniformLocation(prg, 'ambientLightColour'),
      new Float32Array(light.ambientColour))
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.5)
    //
    for (const model of panel.model) {
      if (model.draw && model.drawBonds && model.vaoDrawBonds) {
        gl.bindVertexArray(model.vaoDrawBonds)
        gl.drawElementsInstanced(gl.TRIANGLE_STRIP, this.lenIboCylinder,
          gl.UNSIGNED_INT, 0, model.nbonds)
        gl.bindVertexArray(null)
      }
    }
    //
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.useProgram(null)
  }

  drawFaces (panel) {
    const gl = this.gl
    const prg = this.prgDrawFaces
    const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
    const light = this.light
    const vmat = camera.viewMat()
    const aspectRatio = this.aspectRatioOf(panel)
    const pmat = camera.projectionMat(aspectRatio)
    const vpmat = lnum.mmul(pmat, vmat)
    gl.useProgram(prg)
    gl.viewport(panel.x, panel.y, panel.width, panel.height)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vmat'), false,
      new Float32Array(vmat))
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vpmat'), false,
      new Float32Array(vpmat))
    gl.uniform3fv(gl.getUniformLocation(prg, 'directionalLightDir'),
      new Float32Array(light.directionalDir))
    gl.uniform3fv(gl.getUniformLocation(prg, 'ambientLightColour'),
      new Float32Array(light.ambientColour))
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.5)
    //
    for (const model of panel.model) {
      if (model.draw && model.drawFaces && model.vaoDrawFaces) {
        gl.bindVertexArray(model.vaoDrawFaces)
        gl.drawArrays(gl.TRIANGLES, 0, model.nfaces * 3)
        gl.bindVertexArray(null)
      }
    }
    //
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.disable(gl.DEPTH_TEST)
    gl.useProgram(null)
  }

  drawLines (panel) {
    const gl = this.gl
    const prg = this.prgDrawLines
    const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
    const vmat = camera.viewMat()
    const aspectRatio = this.aspectRatioOf(panel)
    const pmat = camera.projectionMat(aspectRatio)
    const vpmat = lnum.mmul(pmat, vmat)
    gl.useProgram(prg)
    gl.viewport(panel.x, panel.y, panel.width, panel.height)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vpmat'), false,
      new Float32Array(vpmat))
    for (const model of panel.model) {
      if (model.draw && model.drawLines && model.vaoDrawLines) {
        gl.bindVertexArray(model.vaoDrawLines)
        gl.drawArrays(gl.LINES, 0, model.nlines * 2)
        gl.bindVertexArray(null)
      }
    }
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.disable(gl.DEPTH_TEST)
    gl.useProgram(null)
  }

  createVaoDrawAtoms (model) {
    const gl = this.gl
    model.vaoDrawAtoms = gl.createVertexArray()
    gl.bindVertexArray(model.vaoDrawAtoms)
    gl.enableVertexAttribArray(0)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboSphere)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iboSphere)
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboAtomPos)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 12, 0)
    gl.vertexAttribDivisor(1, 1)
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboAtomColourRadius)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 16, 0)
    gl.vertexAttribDivisor(2, 1)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  createVaoDrawBonds (model) {
    const gl = this.gl
    model.vaoDrawBonds = gl.createVertexArray()
    gl.bindVertexArray(model.vaoDrawBonds)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboCylinder)
    gl.enableVertexAttribArray(0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iboCylinder)
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboBonds)
    gl.enableVertexAttribArray(2)
    gl.enableVertexAttribArray(3)
    gl.enableVertexAttribArray(4)
    gl.enableVertexAttribArray(5)
    gl.enableVertexAttribArray(6)
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 52, 0)
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 52, 12)
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 52, 24)
    gl.vertexAttribPointer(5, 3, gl.FLOAT, false, 52, 28)
    gl.vertexAttribPointer(6, 3, gl.FLOAT, false, 52, 40)
    gl.vertexAttribDivisor(2, 1)
    gl.vertexAttribDivisor(3, 1)
    gl.vertexAttribDivisor(4, 1)
    gl.vertexAttribDivisor(5, 1)
    gl.vertexAttribDivisor(6, 1)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  createVaoDrawFaces (model) {
    const gl = this.gl
    model.vaoDrawFaces = gl.createVertexArray()
    gl.bindVertexArray(model.vaoDrawFaces)
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboFaces)
    gl.enableVertexAttribArray(0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0)
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  createVaoDrawLines (model) {
    const gl = this.gl
    model.vaoDrawLines = gl.createVertexArray()
    gl.bindVertexArray(model.vaoDrawLines)
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboLines)
    gl.enableVertexAttribArray(0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0)
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }
  */

  initCartnTransformUniform () {
    const gl = this.gl
    this.uboCartnTransform = this.createBufferSize(gl.UNIFORM_BUFFER, 224,
      gl.DYNAMIC_DRAW)
    gl.bindBufferBase(gl.UNIFORM_BUFFER, CARTN_TRANSFORM_UNIFORM_BINDING,
      this.uboCartnTransform)
  }

  finalCartnTransformUniform () {
    const gl = this.gl
    gl.bindBufferBase(gl.UNIFORM_BUFFER, CARTN_TRANSFORM_UNIFORM_BINDING,
      null)
    gl.deleteBuffer(this.uboCartnTransform)
  }

  updateCartnTransformUniform () {
    const gl = this.gl
    const qc = this.qc
    const dim = qc.dim
    const dimPar = qc.dimPar
    const dimPerp = qc.dimPerp
    if (dimPar > 3) {
      throw Error(`unsupported dimPar: ${dimPar}`)
    } else if (dimPerp > 3) {
      throw Error(`unsupported dimPerp: ${dimPerp}`)
    }
    const arr = new Float32Array(56)
    for (let i = 0; i < dimPar; i += 1) {
      const start = dim * i
      const end = dim * i + Math.min(dim, 3)
      arr.set(qc.aParCartn.slice(start, end), i * 4)
    }
    for (let i = 0; i < dimPar; i += 1) {
      const start = dim * i + Math.min(dim, 3)
      const end = dim * i + Math.min(dim, 6)
      arr.set(qc.aParCartn.slice(start, end), 12 + i * 4)
    }
    for (let i = 0; i < dimPerp; i += 1) {
      const start = dim * i
      const end = dim * i + Math.min(dim, 3)
      arr.set(qc.aPerpCartn.slice(start, end), 24 + i * 4)
    }
    for (let i = 0; i < dimPerp; i += 1) {
      const start = dim * i + Math.min(dim, 3)
      const end = dim * i + Math.min(dim, 6)
      arr.set(qc.aPerpCartn.slice(start, end), 36 + i * 4)
    }
    arr.set(qc._originFract.slice(0, Math.min(dim, 3)), 48)
    arr.set(qc._originFract.slice(Math.min(dim, 3), Math.min(dim, 6)), 52)
    this.updateBuffer(gl.UNIFORM_BUFFER, this.uboCartnTransform, 0, arr)
  }

  initHighlightUniform () {
    const gl = this.gl
    this.uboHighlight = this.createBufferSize(gl.UNIFORM_BUFFER, 64,
      gl.DYNAMIC_DRAW)
    gl.bindBufferBase(gl.UNIFORM_BUFFER, HIGHLIGHT_UNIFORM_BINDING,
      this.uboHighlight)
  }

  finalHighlightUniform () {
    const gl = this.gl
    gl.bindBufferBase(gl.UNIFORM_BUFFER, HIGHLIGHT_UNIFORM_BINDING, null)
    gl.deleteBuffer(this.uboHighlight)
  }

  updateHighlightUniform () {
    const gl = this.gl
    const arr = new DataView(new ArrayBuffer(64))
    const float32View = new Float32Array(arr.buffer)
    const uint32View = new Uint32Array(arr.buffer)
    float32View.set([this.rCutParCartn, this.baseRadius], 0)
    float32View.set(this.unhighlightColourRadiusFactor, 4)
    uint32View.set([...this.highlightRef, ...this.highlightMask], 8)
    this.updateBuffer(gl.UNIFORM_BUFFER, this.uboHighlight, 0, arr)
  }

  initSSGTexture () {
    const gl = this.gl
    const qc = this.qc
    const dimPar = qc.dimPar
    const dimPerp = qc.dimPerp
    const ssgParCartn = qc.ssgParCartnNoPhason
    const ssgPerpCartn = qc.ssgPerpCartnNoPhason
    const ssgOrder = ssgParCartn.order
    const width = ssgOrder * 3
    if (width > MAX_SSG_TEXTURE_WIDTH) {
      throw Error('(initSSGTexture) width > MAX_SSG_TEXTURE_WIDTH')
    }
    this.texSSG = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0 + SSG_TEXTURE_UNIT)
    gl.bindTexture(gl.TEXTURE_2D, this.texSSG)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, width, 2)
    const offset = width * 4
    const arr = new Float32Array(offset * 2)
    for (let i = 0; i < ssgOrder; i += 1) {
      const gi = ssgParCartn.symop[i]
      const rot = [1, 0, 0, 0, 1, 0, 0, 0, 1].map((x, k) => {
        const i = Math.floor(k / 3)
        const j = k % 3
        if (i < dimPar && j < dimPar) {
          return gi.rot[i * dimPar + j]
        } else {
          return x
        }
      })
      const trans = [0, 0, 0].map((x, i) => {
        if (i < dimPar) {
          return gi.trans[i]
        } else {
          return x
        }
      })
      arr[i * 12] = rot[0]
      arr[i * 12 + 1] = rot[1]
      arr[i * 12 + 2] = rot[2]
      arr[i * 12 + 3] = trans[0]
      arr[i * 12 + 4] = rot[3]
      arr[i * 12 + 5] = rot[4]
      arr[i * 12 + 6] = rot[5]
      arr[i * 12 + 7] = trans[1]
      arr[i * 12 + 8] = rot[6]
      arr[i * 12 + 9] = rot[7]
      arr[i * 12 + 10] = rot[8]
      arr[i * 12 + 11] = trans[2]
    }
    for (let i = 0; i < ssgOrder; i += 1) {
      const gi = ssgPerpCartn.symop[i]
      const rot = [1, 0, 0, 0, 1, 0, 0, 0, 1].map((x, k) => {
        const i = Math.floor(k / 3)
        const j = k % 3
        if (i < dimPerp && j < dimPerp) {
          return gi.rot[i * dimPerp + j]
        } else {
          return x
        }
      })
      const trans = [0, 0, 0].map((x, i) => {
        if (i < dimPerp) {
          return gi.trans[i]
        } else {
          return x
        }
      })
      arr[offset + i * 12] = rot[0]
      arr[offset + i * 12 + 1] = rot[1]
      arr[offset + i * 12 + 2] = rot[2]
      arr[offset + i * 12 + 3] = trans[0]
      arr[offset + i * 12 + 4] = rot[3]
      arr[offset + i * 12 + 5] = rot[4]
      arr[offset + i * 12 + 6] = rot[5]
      arr[offset + i * 12 + 7] = trans[1]
      arr[offset + i * 12 + 8] = rot[6]
      arr[offset + i * 12 + 9] = rot[7]
      arr[offset + i * 12 + 10] = rot[8]
      arr[offset + i * 12 + 11] = trans[2]
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, 2, gl.RGBA, gl.FLOAT, arr)
  }

  finalSSGTexture () {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + SSG_TEXTURE_UNIT)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.deleteTexture(this.texSSG)
  }

  initODData () {
    const gl = this.gl
    const qc = this.qc
    const dimPerp = qc.dimPerp
    if (dimPerp > 3) {
      throw Error('dimPerp > 3 not supported')
    }

    //
    // const urSimplex = unitRegSimplex(dimPerp)
    // const ursBasis = urSimplex.slice(1).reduce((arr, v) => {
    //   arr.push(...lnum.sub(v, urSimplex[0]))
    //   return arr
    // }, [])
    // const ursOriginFract = lnum.solve(lnum.lup(ursBasis), urSimplex[0])
    // const ursBasisMinus = lnum.neg(ursBasis)
    // const ssgPerpCartn = qc.ssgPerpCartnNoPhason
    // const ssgPerpCartnRotLUP = ssgPerpCartn.symop.map(g => lnum.lup(g.rot))
    // const bPerpCartnRot = ssgPerpCartn.symop.map(
    //   g => lnum.mmul(qc.bPerpCartn, g.rot))
    //

    const odFragsAsym = []
    const rFractSiteData = []
    const eqvPosSSGIdData = []
    const ods = []
    let odFragCount = 0
    let odFragCountSiteMax = 0
    const atomSites = qc.getAtomSiteEntries().map(([siteLabel]) => {
      let rPerpCartnMax = 0
      const odFragsAsymStart = odFragsAsym.length
      qc.getAtomicSurfaceEntriesAtAtomSite(siteLabel)
        .forEach(([asLabel, as]) => {
          const odId = ods.length
          const simplexes = as.occDomainAsym.polytope.genSimplexes()
          for (const simplex of simplexes) {
            for (const v of simplex) {
              rPerpCartnMax = Math.max(rPerpCartnMax, lnum.abs(v))
            }

            //
            // const sBasis = lnum.$(...simplex.slice(1).reduce((arr, v) => {
            //   arr.push(...lnum.sub(v, simplex[0]))
            //   return arr
            // }, [])).setDim(dimPerp, dimPerp)
            // const v0 = lnum.isub(lnum.mmul(sBasis, ursOriginFract), simplex[0])
            // const m0 = lnum.solve(ursBasisMinus, lnum.ilup(sBasis))
            //   .setDim(dimPerp, dimPerp)
            //

            odFragsAsym.push({
              id: odId,
              //
              // m0: m0,
              // v0: v0,
              //
              simplex: simplex })
          }
          ods.push({ atomicSurfaceLabel: asLabel })
        })
      const odFragsSiteAsym = ({
        start: odFragsAsymStart,
        end: odFragsAsym.length,
        num: odFragsAsym.length - odFragsAsymStart })

      const symAtomSite = qc.ssgNoPhasonSymAtomSite(siteLabel)
      const siteSymOrder = symAtomSite.eqvPosSymopIds[0].length
      const eqvPos = symAtomSite.eqvPos.map((rFractSite, i) => {
        const rFractSiteStart = rFractSiteData.length
        const rFractSiteEmbed = [0, 0, 0, 0, 0, 0].map(
          (x, i) => i < rFractSite.length ? rFractSite[i] : x)
        rFractSiteData.push(rFractSiteEmbed)
        const eqvPosiSymopIds = symAtomSite.eqvPosSymopIds[i]
        const odFragsStart = odFragCount
        odFragCount += odFragsSiteAsym.num * siteSymOrder
        const eqvPosSSGIdStart = eqvPosSSGIdData.length
        eqvPosSSGIdData.push(...eqvPosiSymopIds)

        //
        // const asymUnits = eqvPosiSymopIds.map(ssgId => {
        //   const start = odFragsSiteAsym.start
        //   const end = odFragsSiteAsym.end
        //   const odFrags = odFragsAsym.slice(start, end).map(odFrag => {
        //     const vPerp = lnum.mmul(bPerpCartnRot[ssgId], odFrag.v0)
        //     const mPerp = lnum.solve(odFrag.m0, ssgPerpCartnRotLUP[ssgId])
        //     return { mPerp: mPerp, vPerp: vPerp }
        //   })
        //   return odFrags
        // })
        //

        odFragCountSiteMax = Math.max(odFragCount - odFragsStart,
          odFragCountSiteMax)

        return {
          rFractLattCache: [],
          rFractSiteStart: rFractSiteStart,
          rFractSite: rFractSite,
          odFrags: {
            start: odFragsStart,
            end: odFragCount,
            num: odFragCount - odFragsStart },
          //
          // asymUnits: asymUnits,
          //
          ssgIdStart: eqvPosSSGIdStart,
          vaoGenODInstance: gl.createVertexArray(),
          vaoDrawODFragsPar: gl.createVertexArray(),
          vaoDrawODFragsInfoPar: gl.createVertexArray(),
          vaoDrawODFragsPerp: gl.createVertexArray(),
          vaoDrawODFragsInfoPerp: gl.createVertexArray() }
      })

      return {
        label: siteLabel,
        siteSymOrder: siteSymOrder,
        odFragsAsym: odFragsSiteAsym,
        rPerpCartnMax: rPerpCartnMax,
        eqvPos: eqvPos }
    })
    if (ods.length > MAX_OD_COUNT) {
      throw Error('ods.length > MAX_OD_COUNT')
    }
    // set data
    {
      const arr = new Float32Array(rFractSiteData.length * 6)
      for (let i = 0, n = rFractSiteData.length; i < n; i += 1) {
        arr.set([...rFractSiteData[i]], i * 6)
      }
      this.vboRFractSite = this.createBufferData(gl.ARRAY_BUFFER, arr,
        gl.STATIC_DRAW)
    }
    this.vboSiteSSGId = this.createBufferData(gl.ARRAY_BUFFER,
      new Uint8Array(eqvPosSSGIdData), gl.STATIC_DRAW)
    this.vboODFrag = this.createBufferSize(gl.ARRAY_BUFFER, odFragCount *
      this.vboODFragStride(dimPerp), gl.STATIC_COPY)
    this.vboODInstance = this.createBufferSize(gl.ARRAY_BUFFER,
      odFragCountSiteMax * this.numODFragVIds * 11 * 4, gl.DYNAMIC_COPY)

    // prepare OD fragments
    {
      const stride = this.vboODFragAsymStride(dimPerp)
      const arr = new DataView(new ArrayBuffer(odFragsAsym.length * stride))
      const view1 = new Uint16Array(arr.buffer)
      const view2 = dimPerp > 0 ? new Float32Array(arr.buffer, 4) : null
      switch (dimPerp) {
        case 0:
          view1.set(odFragsAsym.map(odFrag => odFrag.id), 0)
          break
        case 1:
          for (let i = 0, n = odFragsAsym.length; i < n; i += 1) {
            const odFrag = odFragsAsym[i]
            view1.set([odFrag.id], i * 6)
            view2.set(odFrag.simplex[0], i * 3)
            view2.set(odFrag.simplex[1], i * 3 + 1)
          }
          break
        case 2:
          for (let i = 0, n = odFragsAsym.length; i < n; i += 1) {
            const odFrag = odFragsAsym[i]
            view1.set([odFrag.id], i * 14)
            view2.set(odFrag.simplex[0], i * 7)
            view2.set(odFrag.simplex[1], i * 7 + 2)
            view2.set(odFrag.simplex[2], i * 7 + 4)
          }
          break
        case 3:
          for (let i = 0, n = odFragsAsym.length; i < n; i += 1) {
            const odFrag = odFragsAsym[i]
            view1.set([odFrag.id], i * 26)
            view2.set(odFrag.simplex[0], i * 13)
            view2.set(odFrag.simplex[1], i * 13 + 3)
            view2.set(odFrag.simplex[2], i * 13 + 6)
            view2.set(odFrag.simplex[3], i * 13 + 9)
          }
          break
        default:
          throw Error(`unsupported dimPerp: ${dimPerp}`)
      }
      const vboODFragAsym = this.createBufferData(gl.ARRAY_BUFFER, arr,
        gl.STREAM_DRAW)
      const vao = gl.createVertexArray()
      gl.useProgram(this.prgPrepODFrag)
      gl.enable(gl.RASTERIZER_DISCARD)
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vboODFrag)
      gl.beginTransformFeedback(gl.POINTS)
      for (const atomSite of atomSites) {
        const siteSymOrder = atomSite.siteSymOrder
        const odFragAsymStart = atomSite.odFragsAsym.start
        const numODFragsAsym = atomSite.odFragsAsym.num
        if (numODFragsAsym > 0) {
          for (const pos of atomSite.eqvPos) {
            this.initVaoPrepODFrags(dimPerp, vao, vboODFragAsym,
              odFragAsymStart, this.vboSiteSSGId, pos.ssgIdStart)
            gl.bindVertexArray(vao)
            gl.drawArraysInstanced(gl.POINTS, 0, numODFragsAsym, siteSymOrder)
          }
        }
      }
      gl.endTransformFeedback()
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
      gl.disable(gl.RASTERIZER_DISCARD)
      gl.useProgram(null)
      gl.bindVertexArray(null)
      gl.deleteVertexArray(vao)
      gl.deleteBuffer(vboODFragAsym)
    }
    // init vao
    for (const atomSite of atomSites) {
      for (const pos of atomSite.eqvPos) {
        this.initVaoGenODInstance(dimPerp, pos.vaoGenODInstance, this.vboODFrag,
          pos.odFrags.start)
        this.initVaoDrawODFrags(pos.vaoDrawODFragsPerp, this.vboDummyProj,
          this.vboDummyAtom)
        this.initVaoDrawODFragsInfo(pos.vaoDrawODFragsInfoPerp,
          this.vboDummyProj, this.vboDummyAtom)
      }
    }
    this.atomSites = atomSites
    this.ods = ods
  }

  finalODData () {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + OD_COLOUR_RADIUS_TEXTURE_UNIT)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.deleteTexture(this.texODColourRadius)
    gl.deleteBuffer(this.vboODFrag)
    gl.deleteBuffer(this.vboSiteSSGId)
    this.atomSites.forEach(
      ({ eqvPos }) => eqvPos.forEach(pos => {
        // pos.atomStart = 0
        // pos.numAtoms = 0
        gl.deleteVertexArray(pos.vaoDrawODFrags)
        // gl.deleteVertexArray(pos.vaoAtoms)
      }))
    // this.finalProjAndCut()
  }

  /*
  initODColourRadiusTexture () {
    const gl = this.gl
    const ods = this.ods
    const width = DATA_TEXTURE_WIDTH
    const height = Math.ceil(ods.length / width)
    if (height > width) {
      throw Error('(initODColourRadiusTexture) height > width')
    }
    this.texODColourRadius = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0 + OD_COLOUR_RADIUS_TEXTURE_UNIT)
    gl.bindTexture(gl.TEXTURE_2D, this.texODColourRadius)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height)
  }

  updateODColourRadiusTexture () {
    const gl = this.gl
    const ods = this.ods
    const width = DATA_TEXTURE_WIDTH
    const height = Math.ceil(ods.length / width)
    gl.activeTexture(gl.TEXTURE0 + OD_COLOUR_RADIUS_TEXTURE_UNIT)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA,
      gl.UNSIGNED_BYTE, ods.reduce((arr, od, i) => {
        const colourRadius = this.colourRadiusTable[od.atomicSurfaceLabel] ||
          [0, 0, 0, 255]
        arr.set(colourRadius, i * 4)
        return arr
      }, new Uint8Array(width * height * 4)))
  }
  */

  vboODFragAsymStride (dimPerp) {
    switch (dimPerp) {
      case 0:
        return 2
      case 1:
        return 12
      case 2:
        return 28
      case 3:
        return 52
    }
  }

  initVaoPrepODFrags (
    dimPerp, vao, vboODFragAsym, odFragAsymStart, vboSiteSSGId, siteSSGIdStart
  ) {
    const gl = this.gl
    const stride = this.vboODFragAsymStride(dimPerp)
    const baseOffset = stride * odFragAsymStart
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, vboODFragAsym)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_SHORT, stride, baseOffset)
    if (dimPerp > 0) {
      for (let i = 0; i <= dimPerp; i += 1) {
        const index = i + 1
        const offset = baseOffset + (1 + i * dimPerp) * 4
        gl.enableVertexAttribArray(index)
        gl.vertexAttribPointer(index, dimPerp, gl.FLOAT, false, stride, offset)
      }
    }
    {
      const index = dimPerp === 0 ? 1 : dimPerp + 2
      gl.bindBuffer(gl.ARRAY_BUFFER, vboSiteSSGId)
      gl.enableVertexAttribArray(index)
      gl.vertexAttribDivisor(index, 1)
      gl.vertexAttribIPointer(index, 1, gl.UNSIGNED_BYTE, 1, siteSSGIdStart)
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  vboODFragStride (dimPerp) {
    switch (dimPerp) {
      case 0:
        return 4
      case 1:
        return 16
      case 2:
        return 44
      case 3:
        return 88
    }
  }

  initVaoGenODInstance (dimPerp, vao, vboODFrag, odFragStart) {
    const gl = this.gl
    const stride = this.vboODFragStride(dimPerp)
    const baseOffset = stride * odFragStart
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboODFragVId)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribIPointer(0, 1, gl.BYTE, 1, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, vboODFrag)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribDivisor(1, 1)
    gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_INT, stride, baseOffset)
    if (dimPerp > 0) {
      const baseOffset2 = baseOffset + stride - dimPerp * (dimPerp + 1) * 4
      for (let i = 0; i <= dimPerp; i += 1) {
        const index = i + 2
        const offset = baseOffset2 + i * dimPerp * 4
        gl.enableVertexAttribArray(index)
        gl.vertexAttribDivisor(index, 1)
        gl.vertexAttribPointer(index, dimPerp, gl.FLOAT, false, stride, offset)
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  genODInstance (atomSiteId, eqvPosId) {
    const atomSite = this.atomSites[atomSiteId]
    const pos = atomSite.eqvPos[eqvPosId]
    const numODFrags = pos.odFrags.num
    if (numODFrags <= 0) {
      return
    }
    const vao = pos.vaoGenODInstance
    const gl = this.gl
    const prg = this.prgGenODInstance
    gl.useProgram(prg)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.uniform1i(gl.getUniformLocation(prg, 'odColourRadius'),
      OD_COLOUR_RADIUS_TEXTURE_UNIT)
    gl.bindVertexArray(vao)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vboODInstance)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArraysInstanced(gl.POINTS, 0, this.numODFragVIds, numODFrags)
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.bindVertexArray(null)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.useProgram(null)
  }

  initVaoDrawODFrags (vao, vboProj, vboAtom) {
    const gl = this.gl
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboODInstance)
    gl.enableVertexAttribArray(0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 44, 0)
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 44, 12)
    gl.bindBuffer(gl.ARRAY_BUFFER, vboProj)
    gl.enableVertexAttribArray(2)
    gl.enableVertexAttribArray(3)
    gl.vertexAttribDivisor(2, 1)
    gl.vertexAttribDivisor(3, 1)
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 32, 8)
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 32, 20)
    gl.bindBuffer(gl.ARRAY_BUFFER, vboAtom)
    gl.enableVertexAttribArray(4)
    gl.vertexAttribDivisor(4, 1)
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 32, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  initVaoDrawODFragsInfo (vao, vboProj, vboAtom) {
    const gl = this.gl
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboODInstance)
    gl.enableVertexAttribArray(0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 44, 0)
    gl.vertexAttribIPointer(1, 4, gl.UNSIGNED_INT, 44, 28)
    gl.bindBuffer(gl.ARRAY_BUFFER, vboProj)
    gl.enableVertexAttribArray(2)
    gl.enableVertexAttribArray(3)
    gl.vertexAttribDivisor(2, 1)
    gl.vertexAttribDivisor(3, 1)
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 32, 8)
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 32, 20)
    gl.bindBuffer(gl.ARRAY_BUFFER, vboAtom)
    gl.enableVertexAttribArray(4)
    gl.vertexAttribDivisor(4, 1)
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 32, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  drawODFrags (panel, vao, numODFrags, numAtoms = 1) {
    if (numODFrags <= 0) {
      return
    }
    const gl = this.gl
    const dimPerp = this.qc.dimPerp
    const prg = this.prgDrawODFrags
    const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
    const light = this.light
    const vmat = camera.viewMat()
    const vmatPerp = panel.target.isPar ? this.cameraPerp.viewMat() : vmat
    const clientSize = this.clientSizeOf(panel)
    const pmat = camera.projectionMat(...clientSize)
    gl.useProgram(prg)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbMain)
    gl.viewport(panel.x, panel.y, panel.width, panel.height)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vmat'), false,
      new Float32Array(vmat))
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'pmat'), false,
      new Float32Array(pmat))
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vmatPerp'), false,
      new Float32Array(vmatPerp))
    gl.uniform3fv(gl.getUniformLocation(prg, 'directionalLightDir'),
      new Float32Array(light.directionalDir))
    gl.uniform3fv(gl.getUniformLocation(prg, 'ambientLightColour'),
      new Float32Array(light.ambientColour))
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.8)
    gl.bindVertexArray(vao)
    if (dimPerp === 3) {
      gl.enable(gl.CULL_FACE)
    }
    if (dimPerp === 1) {
      gl.lineWidth(3.0)
    }
    gl.drawArraysInstanced(this.drawODFragsMode, 0, this.numODFragVIds *
      numODFrags, numAtoms)
    if (dimPerp === 3) {
      gl.disable(gl.CULL_FACE)
    }
    gl.bindVertexArray(null)
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  drawODFragsInfo (panel, vao, numODFrags, numAtoms = 1) {
    if (numODFrags <= 0) {
      return
    }
    const gl = this.gl
    const dimPerp = this.qc.dimPerp
    const prg = this.prgDrawODFragsInfo
    const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
    const vmat = camera.viewMat()
    const vmatPerp = panel.target.isPar ? this.cameraPerp.viewMat() : vmat
    const clientSize = this.clientSizeOf(panel)
    const pmat = camera.projectionMat(...clientSize)
    gl.useProgram(prg)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbInfo)
    gl.viewport(panel.x, panel.y, panel.width, panel.height)
    gl.enable(gl.DEPTH_TEST)
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vmat'), false,
      new Float32Array(vmat))
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'pmat'), false,
      new Float32Array(pmat))
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vmatPerp'), false,
      new Float32Array(vmatPerp))
    gl.bindVertexArray(vao)
    if (dimPerp === 3) {
      gl.enable(gl.CULL_FACE)
    }
    if (dimPerp === 1) {
      gl.lineWidth(3.0)
    }
    gl.drawArraysInstanced(this.drawODFragsMode, 0, this.numODFragVIds *
      numODFrags, numAtoms)
    if (dimPerp === 3) {
      gl.disable(gl.CULL_FACE)
    }
    gl.bindVertexArray(null)
    gl.disable(gl.DEPTH_TEST)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  updateGenRFractLattNew () {
    const qc = this.qc
    const rCutParCartn = this.rCutParCartnMax
    const mPar = lnum.sdiv(qc.aParCartn, rCutParCartn)
    for (const atomSite of this.atomSites) {
      for (const pos of atomSite.eqvPos) {
        for (const asymUnit of pos.asymUnits) {
          for (const odFrag of asymUnit) {
            const mPerp = lnum.mmul(odFrag.mPerp, qc.aPerpCartn)
            odFrag.rFractLattGenerator = xFractGenerator2(mPar, mPerp)
          }
        }
      }
    }
  }

  updateGenRFractLatt () {
    const qc = this.qc
    const rCutParCartn = this.rCutParCartnMax
    const mPar = lnum.sdiv(qc.aParCartn, rCutParCartn)
    for (const atomSite of this.atomSites) {
      const rCutPerpCartn = atomSite.rPerpCartnMax
      if (rCutPerpCartn > 0 || qc.dimPerp === 0) {
        const mPerp = lnum.sdiv(qc.aPerpCartn, rCutPerpCartn)
        atomSite.rFractLattGenerator = xFractGenerator2(mPar, mPerp)
      }
    }
  }

  genRFractLattNew (atomSiteId, eqvPosId) {
    const qc = this.qc
    const dim = qc.dim
    const originFract = qc._originFract
    const atomSite = this.atomSites[atomSiteId]
    const pos = atomSite.eqvPos[eqvPosId]
    const rFractSite = pos.rFractSite
    const v0 = lnum.sub(rFractSite, originFract)
    const arr = []
    for (const asymUnit of pos.asymUnits) {
      for (const odFrag of asymUnit) {
        console.time('aaa')
        const v = lnum.add(v0, odFrag.vPerp)
        console.timeLog('aaa')
        for (const rFractLatt of odFrag.rFractLattGenerator(v)) {
          const rFractLattEmbed = [0, 0, 0, 0, 0, 0].map(
            (x, i) => i < dim ? rFractLatt[i] : x)
          arr.push(rFractLattEmbed)
        }
        console.timeEnd('aaa')
      }
    }
    // console.log(arr.length)
    return arr
  }

  genRFractLatt (atomSiteId, eqvPosId) {
    const qc = this.qc
    const dim = qc.dim
    const originFract = qc._originFract
    const atomSite = this.atomSites[atomSiteId]
    const pos = atomSite.eqvPos[eqvPosId]
    const rFractLattGenerator = atomSite.rFractLattGenerator
    const arr = []
    if (rFractLattGenerator) {
      const rFractSite = pos.rFractSite
      const v = lnum.sub(rFractSite, originFract)
      for (const rFractLatt of rFractLattGenerator(v)) {
        const rFractLattEmbed = [0, 0, 0, 0, 0, 0].map(
          (x, i) => i < dim ? rFractLatt[i] : x)
        arr.push(...rFractLattEmbed)
      }
      pos.rFractLattCache = arr
    }
    // console.log(arr.length)
    return arr
  }

  initProjAndCut () {
    const gl = this.gl
    const dimPerp = this.qc.dimPerp
    this.vboRFractLatt = this.createBufferSize(gl.ARRAY_BUFFER,
      MAX_RFRACTLATT_COUNT * 6, gl.DYNAMIC_DRAW)
    this.vboProj = this.createBufferSize(gl.ARRAY_BUFFER,
      MAX_RFRACTLATT_COUNT * 8 * 4, gl.DYNAMIC_COPY)
    this.vboAtom = this.createBufferSize(gl.ARRAY_BUFFER,
      MAX_RFRACTLATT_COUNT * 8 * 4, gl.DYNAMIC_COPY)
    const width = CUT_TEXTURE_WIDTH
    this.texCut = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0 + CUT_TEXTURE_UNIT)
    gl.bindTexture(gl.TEXTURE_2D, this.texCut)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32UI, width, width)
    this.fbCut = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbCut)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D,
      this.texCut, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    for (const atomSite of this.atomSites) {
      for (const pos of atomSite.eqvPos) {
        // proj
        {
          pos.vaoProj = gl.createVertexArray()
          gl.bindVertexArray(pos.vaoProj)
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vboRFractLatt)
          gl.enableVertexAttribArray(0)
          gl.enableVertexAttribArray(1)
          gl.vertexAttribIPointer(0, 3, gl.BYTE, 6, 0)
          gl.vertexAttribIPointer(1, 3, gl.BYTE, 6, 3)
          const offset = pos.rFractSiteStart * 24
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vboRFractSite)
          gl.enableVertexAttribArray(2)
          gl.enableVertexAttribArray(3)
          gl.vertexAttribDivisor(2, 1)
          gl.vertexAttribDivisor(3, 1)
          gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 24, offset)
          gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 24, offset + 12)
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        // cut
        {
          pos.vaoCut = gl.createVertexArray()
          gl.bindVertexArray(pos.vaoCut)
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vboProj)
          gl.enableVertexAttribArray(0)
          gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 20)
          const stride = this.vboODFragStride(dimPerp)
          const baseOffset = stride * pos.odFrags.start
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vboODFrag)
          gl.enableVertexAttribArray(1)
          gl.vertexAttribDivisor(1, 1)
          gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_INT, stride, baseOffset)
          if (dimPerp > 0) {
            const baseOffset2 = baseOffset + 4
            for (let i = 0; i <= dimPerp; i += 1) {
              const index = i + 2
              const offset = baseOffset2 + i * dimPerp * 4
              gl.enableVertexAttribArray(index)
              gl.vertexAttribDivisor(index, 1)
              gl.vertexAttribPointer(index, dimPerp, gl.FLOAT, false, stride,
                offset)
            }
          }
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        // colour
        pos.vaoColourAtoms = gl.createVertexArray()
        gl.bindVertexArray(pos.vaoColourAtoms)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboProj)
        gl.enableVertexAttribArray(0)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribIPointer(0, 2, gl.UNSIGNED_INT, 32, 0)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)

        // atoms experimental ...
        // par
        pos.vaoDrawAtomsPar = gl.createVertexArray()
        gl.bindVertexArray(pos.vaoDrawAtomsPar)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iboSphere)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboSphere)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboProj)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribDivisor(1, 1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboAtom)
        gl.enableVertexAttribArray(2)
        gl.vertexAttribDivisor(2, 1)
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
        // par info
        pos.vaoDrawAtomsInfoPar = gl.createVertexArray()
        gl.bindVertexArray(pos.vaoDrawAtomsInfoPar)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iboSphere)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboSphere)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboProj)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribDivisor(1, 1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboAtom)
        gl.enableVertexAttribArray(2)
        gl.enableVertexAttribArray(3)
        gl.vertexAttribDivisor(2, 1)
        gl.vertexAttribDivisor(3, 1)
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0)
        gl.vertexAttribIPointer(3, 4, gl.UNSIGNED_INT, 32, 16)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
        // perp
        pos.vaoDrawAtomsPerp = gl.createVertexArray()
        gl.bindVertexArray(pos.vaoDrawAtomsPerp)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iboSphere)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboSphere)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboProj)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribDivisor(1, 1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 20)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboAtom)
        gl.enableVertexAttribArray(2)
        gl.vertexAttribDivisor(2, 1)
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
        // perp info
        pos.vaoDrawAtomsInfoPerp = gl.createVertexArray()
        gl.bindVertexArray(pos.vaoDrawAtomsInfoPerp)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iboSphere)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboSphere)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboProj)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribDivisor(1, 1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 20)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboAtom)
        gl.enableVertexAttribArray(2)
        gl.enableVertexAttribArray(3)
        gl.vertexAttribDivisor(2, 1)
        gl.vertexAttribDivisor(3, 1)
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0)
        gl.vertexAttribIPointer(3, 4, gl.UNSIGNED_INT, 32, 16)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)
        // ... atoms experimental

        this.initVaoDrawODFrags(pos.vaoDrawODFragsPar, this.vboProj,
          this.vboAtom)
        this.initVaoDrawODFragsInfo(pos.vaoDrawODFragsInfoPar, this.vboProj,
          this.vboAtom)

        gl.bindVertexArray(null)
      }
    }
  }

  projAndCut (atomSiteId, eqvPosId) {
    const atomSite = this.atomSites[atomSiteId]
    const pos = atomSite.eqvPos[eqvPosId]
    const numODFrags = pos.odFrags.num
    if (numODFrags <= 0) {
      return
    }
    const numRFractLatt = pos.rFractLattCache.length / 6
    if (numRFractLatt <= 0) {
      return
    }
    const gl = this.gl
    // proj
    this.updateBuffer(gl.ARRAY_BUFFER, this.vboRFractLatt, 0,
      new Int8Array(pos.rFractLattCache))
    gl.useProgram(this.prgProj)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(pos.vaoProj)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vboProj)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArraysInstanced(gl.POINTS, 0, numRFractLatt, 1)
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.disable(gl.RASTERIZER_DISCARD)
    // cut
    gl.useProgram(this.prgCut)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbCut)
    gl.viewport(0, 0, CUT_TEXTURE_WIDTH, CUT_TEXTURE_WIDTH)
    gl.clearBufferuiv(gl.COLOR, 0, [INVALID_ODID << SSGID_BIT_LENGTH, 0, 0, 0])
    gl.bindVertexArray(pos.vaoCut)
    gl.drawArraysInstanced(gl.POINTS, 0, numRFractLatt, numODFrags)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    // colour atoms
    gl.useProgram(this.prgColourAtoms)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.uniform1i(gl.getUniformLocation(this.prgColourAtoms, 'odColourRadius'),
      OD_COLOUR_RADIUS_TEXTURE_UNIT)
    gl.uniform1i(gl.getUniformLocation(this.prgColourAtoms, 'cut'),
      CUT_TEXTURE_UNIT)
    gl.bindVertexArray(pos.vaoColourAtoms)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vboAtom)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArrays(gl.POINTS, 0, numRFractLatt)
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  drawAtoms (panel, vao, numAtoms) {
    if (numAtoms <= 0) {
      return
    }
    const gl = this.gl
    const prg = this.prgDrawAtoms
    const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
    const light = this.light
    const vmat = camera.viewMat()
    const clientSize = this.clientSizeOf(panel)
    const pmat = camera.projectionMat(...clientSize)
    gl.useProgram(prg)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbMain)
    gl.viewport(panel.x, panel.y, panel.width, panel.height)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vmat'), false,
      new Float32Array(vmat))
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'pmat'), false,
      new Float32Array(pmat))
    gl.uniform3fv(gl.getUniformLocation(prg, 'directionalLightDir'),
      new Float32Array(light.directionalDir))
    gl.uniform3fv(gl.getUniformLocation(prg, 'ambientLightColour'),
      new Float32Array(light.ambientColour))
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.5)
    gl.bindVertexArray(vao)
    gl.drawElementsInstanced(gl.TRIANGLE_STRIP, this.lenIboSphere,
      gl.UNSIGNED_INT, 0, numAtoms)
    gl.bindVertexArray(null)
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  drawAtomsInfo (panel, vao, numAtoms) {
    if (numAtoms <= 0) {
      return
    }
    const gl = this.gl
    const prg = this.prgDrawAtomsInfo
    const camera = panel.target.isPar ? this.cameraPar : this.cameraPerp
    const vmat = camera.viewMat()
    const clientSize = this.clientSizeOf(panel)
    const pmat = camera.projectionMat(...clientSize)
    gl.useProgram(prg)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbInfo)
    gl.viewport(panel.x, panel.y, panel.width, panel.height)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'vmat'), false,
      new Float32Array(vmat))
    gl.uniformMatrix4fv(gl.getUniformLocation(prg, 'pmat'), false,
      new Float32Array(pmat))
    gl.bindVertexArray(vao)
    gl.drawElementsInstanced(gl.TRIANGLE_STRIP, this.lenIboSphere,
      gl.UNSIGNED_INT, 0, numAtoms)
    gl.bindVertexArray(null)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  /*
  finalProjAndCut () {
    const gl = this.gl
    gl.deleteTransformFeedback(this.tfProjAndCut)
    gl.deleteBuffer(this.vboProjAndCut)
    gl.deleteBuffer(this.vboAtom)
    gl.deleteVertexArray(this.vaoProjAndCut)
    this.numAtoms = 0
  }
  */

  initSphere (sphere) {
    const gl = this.gl
    this.vboSphere = this.createBufferData(gl.ARRAY_BUFFER,
      new Float32Array(sphere.v), gl.STATIC_DRAW)
    this.iboSphere = this.createBufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(sphere.i), gl.STATIC_DRAW)
    this.lenIboSphere = sphere.i.length
  }

  finalSphere () {
    const gl = this.gl
    gl.deleteBuffer(this.vboSphere)
    gl.deleteBuffer(this.iboSphere)
  }

  initCylinder (cylinder) {
    const gl = this.gl
    this.vboCylinder = this.createBufferData(gl.ARRAY_BUFFER,
      new Float32Array(cylinder.vn), gl.STATIC_DRAW)
    this.iboCylinder = this.createBufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(cylinder.i), gl.STATIC_DRAW)
    this.lenIboCylinder = cylinder.i.length
    this.halfVCountCylinder = cylinder.halfVCount
  }

  finalCylinder () {
    const gl = this.gl
    gl.deleteBuffer(this.vboCylinder)
    gl.deleteBuffer(this.iboCylinder)
  }

  initODFragVId (dimPerp) {
    const gl = this.gl
    switch (dimPerp) {
      case 0:
        this.vboODFragVId = this.createBufferData(gl.ARRAY_BUFFER,
          new Int8Array([0]), gl.STATIC_DRAW)
        this.drawODFragsMode = gl.POINTS
        this.numODFragVIds = 1
        break
      case 1:
        this.vboODFragVId = this.createBufferData(gl.ARRAY_BUFFER,
          new Int8Array([0, 1]), gl.STATIC_DRAW)
        this.drawODFragsMode = gl.LINES
        this.numODFragVIds = 2
        break
      case 2:
        this.vboODFragVId = this.createBufferData(gl.ARRAY_BUFFER,
          new Int8Array([0, 1, 2]), gl.STATIC_DRAW)
        this.drawODFragsMode = gl.TRIANGLES
        this.numODFragVIds = 3
        break
      case 3:
        this.vboODFragVId = this.createBufferData(gl.ARRAY_BUFFER,
          new Int8Array([0, 0, 1, 2, 3, 0, 1, 1]), gl.STATIC_DRAW)
        this.drawODFragsMode = gl.TRIANGLE_STRIP
        this.numODFragVIds = 8
        break
      default:
        throw Error(`unsupported dimperp: ${dimPerp}`)
    }
  }

  finalODFragVId () {
    const gl = this.gl
    gl.deleteBuffer(this.vboODFragVId)
  }

  initVboDummy () {
    const gl = this.gl
    this.vboDummyProj = this.createBufferData(gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]), gl.STATIC_DRAW)
    this.vboDummyAtom = this.createBufferData(gl.ARRAY_BUFFER,
      new Float32Array([0.0, 0.0, 0.0, 1.0, 0, 0, 0, 0]), gl.STATIC_DRAW)
  }

  finalVboDummy () {
    const gl = this.gl
    gl.deleteBuffer(this.vboDummyProj)
    gl.deleteBuffer(this.vboDummyAtom)
  }

  createBufferData (target, data, usage) {
    const gl = this.gl
    if (gl) {
      const buf = gl.createBuffer()
      gl.bindBuffer(target, buf)
      gl.bufferData(target, data, usage)
      gl.bindBuffer(target, null)
      return buf
    }
  }

  createBufferSize (target, size, usage) {
    const gl = this.gl
    const buf = gl.createBuffer()
    gl.bindBuffer(target, buf)
    gl.bufferData(target, size, usage)
    gl.bindBuffer(target, null)
    return buf
  }

  updateBuffer (target, buf, offset, data, srcOffset = 0, length = 0) {
    const gl = this.gl
    gl.bindBuffer(target, buf)
    gl.bufferSubData(target, offset, data, srcOffset, length)
    gl.bindBuffer(target, null)
  }

  createFramebuffers () {
    const gl = this.gl
    const attachment = [gl.COLOR_ATTACHMENT0]
    const samples = gl.getParameter(gl.MAX_SAMPLES)
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    this.fbMain = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbMain)
    gl.drawBuffers(attachment)
    this.depthMain = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthMain)
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples,
      gl.DEPTH_COMPONENT24, width, height)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER, this.depthMain)
    const n = attachment.length
    this.renderbuffer = []
    for (let i = 0; i < n; i += 1) {
      this.renderbuffer.push(gl.createRenderbuffer())
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer[i])
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8,
        width, height)
      gl.bindRenderbuffer(gl.RENDERBUFFER, null)
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment[i],
        gl.RENDERBUFFER, this.renderbuffer[i])
    }
    // fb-info
    this.fbInfo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbInfo)
    gl.drawBuffers([gl.COLOR_ATTACHMENT0])
    this.rbInfo = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbInfo)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA32UI, width, height)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.RENDERBUFFER, this.rbInfo)
    this.depthInfo = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthInfo)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER, this.depthInfo)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    // this.framebufferStorageSize = width * height * (4 * n + 3)
  }

  deleteFramebuffers () {
    const gl = this.gl
    gl.deleteFramebuffer(this.fbMain)
    gl.deleteFramebuffer(this.fbInfo)
    gl.deleteRenderbuffer(this.depthMain)
    gl.deleteRenderbuffer(this.depthInfo)
    for (const renderbuffer of this.renderbuffer) {
      gl.deleteRenderbuffer(renderbuffer)
    }
    gl.deleteRenderbuffer(this.rbInfo)
    this.renderbuffer = null
    // this.framebufferStorageSize = 0
  }

  compileVertexShader (vsSrc) {
    const gl = this.gl
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vsSrc)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.warn('Failed to compile vertex shader')
      console.warn(gl.getShaderInfoLog(vs))
    }
    return vs
  }

  compileFragmentShader (fsSrc) {
    const gl = this.gl
    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fsSrc)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.warn('Failed to compile fragment shader')
      console.warn(gl.getShaderInfoLog(fs))
    }
    return fs
  }

  createProgram (
    vs, fs, { tfVaryings, tfBuffMode, uboBlockBindings = [] } = {}
  ) {
    const gl = this.gl
    const prg = gl.createProgram()
    gl.attachShader(prg, vs)
    gl.attachShader(prg, fs)
    if (tfVaryings) {
      gl.transformFeedbackVaryings(prg, tfVaryings, tfBuffMode)
    }
    gl.linkProgram(prg)
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
      console.warn('Failed to link program')
      console.warn(gl.getProgramInfoLog(prg))
    }
    for (const { blockName, blockBinding } of uboBlockBindings) {
      gl.uniformBlockBinding(prg, gl.getUniformBlockIndex(prg, blockName),
        blockBinding)
    }
    return prg
  }

  getInfoAt (x, y) {
    if (this.panelAt(x, y)) {
      const gl = this.gl
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbInfo)
      gl.readBuffer(gl.COLOR_ATTACHMENT0)
      const info = new Uint32Array(4)
      this.gl.readPixels(x, y, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, info)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
      const type = TYPE_TEXT[info[0]]
      const odId = info[1] >>> SSGID_BIT_LENGTH
      const ssgId = info[1] % MAX_SSG_COUNT
      const rFractLatt = [
        (info[2] >>> 24 & 255) - 128,
        (info[2] >>> 16 & 255) - 128,
        (info[2] >>> 8 & 255) - 128,
        (info[2] & 255) - 128,
        (info[3] >>> 24 & 255) - 128,
        (info[3] >>> 16 & 255) - 128]
      const flag = odId !== INVALID_ODID
      const atomicSurfaceLabel = flag ? this.ods[odId].atomicSurfaceLabel : ''
      return {
        type: type,
        atomicSurfaceLabel: atomicSurfaceLabel,
        ssgId: ssgId,
        rFractLatt: rFractLatt }
    }
  }

  setMouseEvent () {
    if (!mousedownedCache.has(this)) {
      const downedFunc = mousedowned.bind(this)
      const dblclickedFunc = dblclicked.bind(this)
      mousedownedCache.set(this, downedFunc)
      mouseenterCache.set(this, mouseenter.bind(this))
      mouseenterShiftCache.set(this, mouseenterShift.bind(this))
      mouseendCache.set(this, mouseend.bind(this))
      mouseendShiftCache.set(this, mouseendShift.bind(this))
      mousemovedCache.set(this, mousemoved.bind(this))
      mousemovedShiftCache.set(this, mousemovedShift.bind(this))
      dblclickedCache.set(this, dblclickedFunc)
      this.gl.canvas.addEventListener('mousedown', downedFunc)
      this.gl.canvas.addEventListener('dblclick', dblclickedFunc)
    }
  }

  removeMouseEvent () {
    if (mousedownedCache.has(this)) {
      this.gl.canvas.removeEventListener(
        'mousedown', mousedownedCache.get(this))
      mousedownedCache.delete(this)
      this.gl.canvas.removeEventListener(
        'mouseenter', mouseenterCache.get(this))
      mouseenterCache.delete(this)
      this.gl.canvas.removeEventListener(
        'mouseenter', mouseenterShiftCache.get(this))
      mouseenterShiftCache.delete(this)
      this.gl.canvas.removeEventListener(
        'mouseup', mouseendCache.get(this))
      mouseendCache.delete(this)
      this.gl.canvas.removeEventListener(
        'mouseup', mouseendShiftCache.get(this))
      mouseendShiftCache.delete(this)
      this.gl.canvas.removeEventListener(
        'mousemove', mousemovedCache.get(this))
      mousemovedCache.delete(this)
      this.gl.canvas.removeEventListener(
        'mousemove', mousemovedShiftCache.get(this))
      mousemovedShiftCache.delete(this)
      this.gl.canvas.removeEventListener(
        'dblclick', dblclickedCache.get(this))
      dblclickedCache.delete(this)
    }
  }

  setWheelEvent () {
    if (!wheeledCache.has(this)) {
      const func = wheeled.bind(this)
      wheeledCache.set(this, func)
      this.gl.canvas.addEventListener('wheel', func, { passive: true })
    }
  }

  removeWheelEvent () {
    if (wheeledCache.has(this)) {
      this.gl.canvas.removeEventListener('wheel', wheeledCache.get(this))
      wheeledCache.delete(this)
    }
  }
}

/* @license-end */
