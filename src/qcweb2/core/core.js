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

import { createSelector } from 'reselect'

import { selectDataItem } from '../../qc-data/methods.mjs'

import { genHalfOctahedron } from './gen-half-octahedron.js'
import { genCylinder } from './gen-cylinder.js'

import {
  createVertexShaderDebug as createVertexShader,
  createFragmentShaderDebug as createFragmentShader,
  createProgramDebug as createProgram,
  createBuffer,
  updateBuffer,
  createUniformBuffer
} from './utils.js'

import {
  ENVIRONMENT_UNIFORM_BLOCK_BINDING,
  ENVIRONMENT_UNIFORM_BUFFER_SIZE,
  ENVIRONMENT_UNIFORM_BINDING_POINT_INDEX,
  CARTN_TRANSFORM_UNIFORM_BLOCK_BINDING,
  CARTN_TRANSFORM_UNIFORM_BUFFER_SIZE,
  CARTN_TRANSFORM_UNIFORM_BINDING_POINT_INDEX,
  HIGHLIGHT_UNIFORM_BLOCK_BINDING,
  HIGHLIGHT_UNIFORM_BUFFER_SIZE,
  HIGHLIGHT_UNIFORM_BINDING_POINT_INDEX,
  SSG_TEXTURE_UNIT,
  MAX_SSG_COUNT,
  MAX_SSG_TEXTURE_WIDTH,
  OD_COLOUR_RADIUS_TEXTURE_UNIT,
  MAX_OD_COUNT,
  DATA_TEXTURE_WIDTH,
  SSGID_BIT_LENGTH,
  MAX_RFRACTLATT_COUNT,
  CUT_TEXTURE_UNIT,
  CUT_TEXTURE_WIDTH,
  INVALID_ODID,
  ODID_BIT,
  SSGID_BIT,
  TYPE_TEXT,
  TYPEID_NONE,
  TYPEID_ATOM,
  TYPEID_OD
} from './constants.js'

import { FILL_VIEWPORT_FAR_VS } from './common-vs.js'
import {
  DRAW_ATOMS_VS,
  DRAW_ATOMS_INFO_VS,
  DRAW_HALF_BONDS_VS,
  DRAW_HALF_BONDS_INFO_VS,
  DRAW_CLUSTER_VERTICES_VS,
  DRAW_CLUSTER_VERTICES_INFO_VS,
  DRAW_CLUSTER_EDGES_VS,
  DRAW_CLUSTER_EDGES_INFO_VS,
  DRAW_CLUSTER_FACES_VS,
  DRAW_CLUSTER_FACES_INFO_VS,
  // DRAW_FLAT_LINES_VS,
  DRAW_ODFRAGS_VS,
  DRAW_ODFRAGS_INFO_VS
} from './qcweb2-objs-vs.js'
import {
  PROJ_VS,
  CUT_VS,
  COLOUR_ATOMS_VS,
  MASK_DISPLACEMENTS_VS
} from './proj-and-cut-vs.js'
import { PREP_ODFRAGS_VS, PREP_ODFRAGS_TF_VARYINGS } from './prep-odfrags-vs.js'
import {
  GEN_OD_INSTANCES_VS, GEN_OD_INSTANCES_TF_VARYINGS
} from './gen-od-instances-vs.js'
import {
  SIMPLE_FS,
  SIMPLE_FS_DUMMY_POSITION,
  SIMPLE_UINT_FS,
  NORMAL_FS,
  FLAT_FS,
  WHITE_FS,
  DUMMY_FS
} from './common-fs.js'

import { lnum } from './linalg.js'
// ad hoc ...
import { Camera } from '../../legacy/qcweb2-camera.mjs'
import { inormalise, cross3, rotateV3 } from '../../legacy/qcweb2-linalg.mjs'
import { xFractGenerator2 } from '../../legacy/x-fract-generator.mjs'
// ... ad hoc

const genHighlightRefBit = (
  { typeId, odId, ssgId, lattFractCoord }, lattOffset
) => {
  lattOffset = lattOffset || [0, 0, 0, 0, 0, 0]
  const offset = [0, 0, 0, 0, 0, 0].map(
    (x, i) => i < lattOffset.length
      ? lattOffset[i]
      : x
  )
  if (lattFractCoord) {
    lattFractCoord = lattFractCoord.map(
      (x, i) => {
        x = x - offset[i]
        if (Math.abs(x) >= 128) {
          x = -128
        }
        return x + 128
      }
    )
  }
  return [
    typeId,
    odId << SSGID_BIT_LENGTH & ODID_BIT |
    ssgId - 1 & SSGID_BIT, // ssgId -> ssgInternalId
    lattFractCoord
      ? lattFractCoord[0] << 24 |
        lattFractCoord[1] << 16 |
        lattFractCoord[2] << 8 |
        lattFractCoord[3]
      : 0,
    lattFractCoord
      ? lattFractCoord[4] << 24 |
        lattFractCoord[5] << 16
      : 0
  ]
}

const genHighlightMaskBit = ({ type, od, ssg, latt }) => {
  return [
    type ? ~0 : 0,
    (od ? ODID_BIT : 0) |
    (ssg ? SSGID_BIT : 0),
    latt ? ~0 : 0,
    latt ? ~0 : 0
  ]
}

const NOT_READY = 0
const NSUB_OCTAHEDRON = 7
const NPHI_CYLINDER = 15
const CLEAR_INFO = genHighlightRefBit({
  typeId: TYPEID_NONE,
  odId: INVALID_ODID,
  ssgId: 0,
  lattFractCoord: null
})
const VBO_ODFRAG_ASYM_STRIDE = [2, 12, 28, 52]
const VBO_ODFRAG_STRIDE = [4, 16, 44, 88]
const ODFRAG_VID_START = [0, 1, 1, 0]
const NUM_ODFRAG_VIDS = [1, 2, 3, 8]
const DRAW_ODFRAG_MODE = ['POINTS', 'LINES', 'TRIANGLES', 'TRIANGLE_STRIP']

const genViewportsFromPanel = function * (panel, left, bottom, right, top) {
  if (panel.splitX) {
    const splitX = panel.splitX * (right - left) + left
    yield * genViewportsFromPanel(panel.subpanel1, left, bottom, splitX, top)
    yield * genViewportsFromPanel(panel.subpanel2, splitX, bottom, right, top)
  } else if (panel.splitY) {
    const splitY = top - panel.splitY * (top - bottom)
    yield * genViewportsFromPanel(panel.subpanel1, left, splitY, right, top)
    yield * genViewportsFromPanel(panel.subpanel2, left, bottom, right, splitY)
  } else {
    const x = Math.round(left)
    const y = Math.round(bottom)
    const width = Math.round(right) - x
    const height = Math.round(top) - y
    yield { ...panel, x, y, width, height }
  }
}

const clientSizeOf = (gl, viewport) => {
  const canvas = gl.canvas
  const clientWidth = canvas.clientWidth
  const clientHeight = canvas.clientHeight
  // the following codes should be used if padding may be non-zero
  // const style = window.getComputedStyle(canvas)
  // const pl = parseInt(style.getPropertyValue('padding-left'), 10)
  // const pr = parseInt(style.getPropertyValue('padding-right'), 10)
  // const pt = parseInt(style.getPropertyValue('padding-top'), 10)
  // const pb = parseInt(style.getPropertyValue('padding-bottom'), 10)
  // clientWidth -= (pl + pr)
  // clientHeight -= (pt + pb)
  const viewportClientWidth = viewport.width / gl.drawingBufferWidth *
    clientWidth
  const viewportClientHeight = viewport.height / gl.drawingBufferHeight *
    clientHeight
  return [viewportClientWidth, viewportClientHeight]
}

const canvasCoordOf = (gl, [clientX, clientY]) => {
  const canvas = gl.canvas
  const clientWidth = canvas.clientWidth
  const clientHeight = canvas.clientHeight
  const clientRect = canvas.getBoundingClientRect()
  // currently, padding, etc. are not considered
  let x = (clientX - clientRect.left) / clientWidth * gl.drawingBufferWidth
  x = Math.max(Math.min(Math.floor(x), gl.drawingBufferWidth - 1), 0)
  let y = (1 - (clientY - clientRect.top) / clientHeight) *
    gl.drawingBufferHeight - 1
  y = Math.max(Math.min(Math.floor(y), gl.drawingBufferHeight - 1), 0)
  return { x, y }
}

export class QCWeb2Core {
  constructor (
    canvas,
    store,
    overlayPanelSelector,
    quasicrystalSelector,
    overlayPanelSetData,
    subscribers = {}
  ) {
    const gl = this.gl = canvas.getContext('webgl2')
    if (gl) {
      this.store = store
      this.overlayPanelSelector = overlayPanelSelector
      this.quasicrystalSelector = quasicrystalSelector
      this.overlayPanelSetData = overlayPanelSetData
      this.subscribers = subscribers
      this.onLost = e => {
        console.log('context lost')
        e.preventDefault()
        if (this.requestId !== 0) {
          window.cancelAnimationFrame(this.requestId)
          this.requestId = 0
        }
      }
      this.onRestored = e => {
        console.log('context restored')
        this.initialise()
      }
      canvas.addEventListener('webglcontextlost', this.onLost, false)
      canvas.addEventListener('webglcontextrestored', this.onRestored, false)
      this.initialise()

      // test for lose context
      // const ext = gl.getExtension('WEBGL_lose_context')
      // window.setInterval(() => {
      //   ext.loseContext()
      //   window.setTimeout(() => ext.restoreContext(), 3000)
      // }, 20000)
    }
  }

  destructor () {
    const gl = this.gl
    if (gl) {
      const canvas = gl.canvas
      canvas.removeEventListener('webglcontextlost', this.onLost, false)
      canvas.removeEventListener('webglcontextrestored', this.onRestored, false)
      this.onLost = null
      this.onRestored = null
      this.update = null
      if (this.requestId !== 0) {
        window.cancelAnimationFrame(this.requestId)
        this.requestId = 0
      }
      this.finalise()
      this.store = null
      this.gl = null
    }
  }

  initialise () {
    this.initialiseResources()
    this.initialiseUpdater()
    this.initialiseUI()
    this.requestId = window.requestAnimationFrame(this.update)
    this.prev = window.performance.now()
    this.frameCount = 0
  }

  finalise () {
    this.finaliseUpdater()
    this.finaliseResources()
  }

  initialiseResources () {
    this.initialiseVertexShaders()
    this.initialiseFragmentShaders()
    this.initialisePrograms()
    this.initialiseFramebuffers()
    this.initialiseUniformBuffers()
    this.initialiseVertexBuffers()
    this.initialiseTextures()
  }

  finaliseResources () {
    this.finalisePrograms()
    this.finaliseVertexShaders()
    this.finaliseFragmentShaders()
    this.finaliseFramebuffers()
    this.finaliseUniformBuffers()
    this.finaliseVertexBuffers()
    this.finaliseTextures()
  }

  initialiseVertexShaders () {
    const gl = this.gl
    const vs = this.vs = {}
    vs.fillViewportFar = createVertexShader(gl, FILL_VIEWPORT_FAR_VS)
    vs.drawAtoms = createVertexShader(gl, DRAW_ATOMS_VS)
    vs.drawAtomsInfo = createVertexShader(gl, DRAW_ATOMS_INFO_VS)
    vs.drawHalfBonds = createVertexShader(gl, DRAW_HALF_BONDS_VS)
    vs.drawHalfBondsInfo = createVertexShader(gl, DRAW_HALF_BONDS_INFO_VS)
    vs.drawVertices = createVertexShader(gl, DRAW_CLUSTER_VERTICES_VS)
    vs.drawVerticesInfo = createVertexShader(gl, DRAW_CLUSTER_VERTICES_INFO_VS)
    vs.drawEdges = createVertexShader(gl, DRAW_CLUSTER_EDGES_VS)
    vs.drawEdgesInfo = createVertexShader(gl, DRAW_CLUSTER_EDGES_INFO_VS)
    vs.drawFaces = createVertexShader(gl, DRAW_CLUSTER_FACES_VS)
    vs.drawFacesInfo = createVertexShader(gl, DRAW_CLUSTER_FACES_INFO_VS)
    // vs.drawLines = createVertexShader(gl, DRAW_LINES_VS)
    vs.drawODFrags = createVertexShader(gl, DRAW_ODFRAGS_VS)
    vs.drawODFragsInfo = createVertexShader(gl, DRAW_ODFRAGS_INFO_VS)
    vs.proj = createVertexShader(gl, PROJ_VS)
    vs.colourAtoms = createVertexShader(gl, COLOUR_ATOMS_VS)
    vs.cut = CUT_VS.map(src => createVertexShader(gl, src))
    vs.maskDisplacements = createVertexShader(gl, MASK_DISPLACEMENTS_VS)
    vs.prepODFrags = PREP_ODFRAGS_VS.map(src => createVertexShader(gl, src))
    vs.genODInstances = GEN_OD_INSTANCES_VS.map(
      src => createVertexShader(gl, src)
    )
  }

  finaliseVertexShaders () {
    const gl = this.gl
    for (const vs of Object.values(this.vs)) {
      if (Array.isArray(vs)) {
        for (const vsi of vs) {
          gl.deleteShader(vsi)
        }
      } else {
        gl.deleteShader(vs)
      }
    }
  }

  initialiseFragmentShaders () {
    const gl = this.gl
    const fs = this.fs = {}
    fs.simple = createFragmentShader(gl, SIMPLE_FS)
    fs.simpleDummyPosition = createFragmentShader(gl, SIMPLE_FS_DUMMY_POSITION)
    fs.simpleUint = createFragmentShader(gl, SIMPLE_UINT_FS)
    fs.normal = createFragmentShader(gl, NORMAL_FS)
    fs.flat = createFragmentShader(gl, FLAT_FS)
    fs.white = createFragmentShader(gl, WHITE_FS)
    fs.dummy = createFragmentShader(gl, DUMMY_FS)
  }

  finaliseFragmentShaders () {
    const gl = this.gl
    for (const fs of Object.values(this.fs)) {
      gl.deleteShader(fs)
    }
  }

  initialisePrograms () {
    const gl = this.gl
    const vs = this.vs
    const fs = this.fs
    const prg = this.prg = {}
    prg.fillBGWhite = createProgram(gl, vs.fillViewportFar, fs.white)
    prg.drawAtoms = createProgram(
      gl, vs.drawAtoms, fs.normal,
      { uboBlockBindings: [ENVIRONMENT_UNIFORM_BLOCK_BINDING] }
    )
    prg.drawAtomsInfo = createProgram(
      gl, vs.drawAtomsInfo, fs.simpleUint
    )
    prg.drawHalfBonds = createProgram(
      gl, vs.drawHalfBonds, fs.normal,
      { uboBlockBindings: [ENVIRONMENT_UNIFORM_BLOCK_BINDING] }
    )
    prg.drawHalfBondsInfo = createProgram(
      gl, vs.drawHalfBondsInfo, fs.simpleUint
    )
    prg.drawVertices = createProgram(
      gl, vs.drawVertices, fs.normal,
      { uboBlockBindings: [ENVIRONMENT_UNIFORM_BLOCK_BINDING] }
    )
    prg.drawVerticesInfo = createProgram(
      gl, vs.drawVerticesInfo, fs.simpleUint
    )
    prg.drawEdges = createProgram(
      gl, vs.drawEdges, fs.normal,
      { uboBlockBindings: [ENVIRONMENT_UNIFORM_BLOCK_BINDING] }
    )
    prg.drawEdgesInfo = createProgram(
      gl, vs.drawEdgesInfo, fs.simpleUint
    )
    prg.drawFaces = createProgram(
      gl, vs.drawFaces, fs.flat,
      { uboBlockBindings: [ENVIRONMENT_UNIFORM_BLOCK_BINDING] }
    )
    prg.drawFacesInfo = createProgram(
      gl, vs.drawFacesInfo, fs.simpleUint
    )
    // prg.drawLines = createProgram(gl, vs.drawLines, fs.simple)
    prg.proj = createProgram(
      gl, vs.proj, fs.dummy,
      {
        tfVaryings: ['vRFractLattId', 'vRParCartn', 'vRPerpCartn'],
        tfBuffMode: gl.INTERLEAVED_ATTRIBS,
        uboBlockBindings: [CARTN_TRANSFORM_UNIFORM_BLOCK_BINDING]
      }
    )
    prg.colourAtoms = createProgram(
      gl, vs.colourAtoms, fs.dummy,
      {
        tfVaryings: ['vColour', 'vRadius', 'vInfo'],
        tfBuffMode: gl.INTERLEAVED_ATTRIBS,
        uboBlockBindings: [HIGHLIGHT_UNIFORM_BLOCK_BINDING]
      }
    )
    gl.useProgram(prg.colourAtoms)
    gl.uniform1i(
      gl.getUniformLocation(prg.colourAtoms, 'odColourRadius'),
      OD_COLOUR_RADIUS_TEXTURE_UNIT
    )
    gl.uniform1i(
      gl.getUniformLocation(prg.colourAtoms, 'cut'), CUT_TEXTURE_UNIT
    )
    gl.useProgram(null)
    prg.cut = vs.cut.map(vsi => createProgram(gl, vsi, fs.simpleUint))
    prg.maskDisplacements = createProgram(
      gl, vs.maskDisplacements, fs.dummy,
      {
        tfVaryings: [
          'vDisplacementOccupancy', 'vTargetColour', 'vTargetRadius'
        ],
        tfBuffMode: gl.INTERLEAVED_ATTRIBS,
        uboBlockBindings: [HIGHLIGHT_UNIFORM_BLOCK_BINDING]
      }
    )
    gl.useProgram(prg.maskDisplacements)
    gl.uniform1i(
      gl.getUniformLocation(prg.maskDisplacements, 'odColourRadius'),
      OD_COLOUR_RADIUS_TEXTURE_UNIT
    )
    gl.uniform1i(
      gl.getUniformLocation(prg.maskDisplacements, 'cut'), CUT_TEXTURE_UNIT
    )
    gl.useProgram(null)
    prg.genODInstances = vs.genODInstances.map(vsi => createProgram(
      gl, vsi, fs.dummy,
      {
        tfVaryings: GEN_OD_INSTANCES_TF_VARYINGS,
        tfBuffMode: gl.INTERLEAVED_ATTRIBS,
        uboBlockBindings: [HIGHLIGHT_UNIFORM_BLOCK_BINDING]
      }
    ))
    for (const p of prg.genODInstances) {
      gl.useProgram(p)
      gl.uniform1i(
        gl.getUniformLocation(p, 'odColourRadius'),
        OD_COLOUR_RADIUS_TEXTURE_UNIT
      )
      gl.useProgram(null)
    }
    prg.drawODFrags = [
      fs.simpleDummyPosition, fs.simpleDummyPosition, fs.flat, fs.flat
    ].map(
      (fs, dimPerp) => createProgram(
        gl, vs.drawODFrags, fs,
        dimPerp >= 2
          ? { uboBlockBindings: [ENVIRONMENT_UNIFORM_BLOCK_BINDING] }
          : undefined
      )
    )
    prg.drawODFragsInfo = createProgram(
      gl, vs.drawODFragsInfo, fs.simpleUint
    )
    prg.prepODFrags = vs.prepODFrags.map((vsi, i) => createProgram(
      gl, vsi, fs.dummy,
      {
        tfVaryings: PREP_ODFRAGS_TF_VARYINGS[i],
        tfBuffMode: gl.INTERLEAVED_ATTRIBS
      }
    ))
  }

  finalisePrograms () {
    const gl = this.gl
    for (const prg of Object.values(this.prg)) {
      if (Array.isArray(prg)) {
        for (const prgi of prg) {
          gl.deleteProgram(prgi)
        }
      } else {
        gl.deleteProgram(prg)
      }
    }
  }

  initialiseFramebuffers () {
    const gl = this.gl
    this.fbo = {}
    this.rbo = {}
    this.pbo = {}
    this.sync = {}
    // info
    {
      const fbo = this.fbo.info = gl.createFramebuffer()
      const rboColour = this.rbo.infoColour = gl.createRenderbuffer()
      const rboDepth = this.rbo.infoDepth = gl.createRenderbuffer()
      this.pbo.info = createBuffer(
        gl, gl.PIXEL_PACK_BUFFER, 16, gl.DYNAMIC_READ
      )
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.drawBuffers([gl.COLOR_ATTACHMENT0])
      gl.readBuffer(gl.COLOR_ATTACHMENT0)
      gl.bindRenderbuffer(gl.RENDERBUFFER, rboColour)
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA32UI, 1, 1)
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
        gl.RENDERBUFFER, rboColour)
      gl.bindRenderbuffer(gl.RENDERBUFFER, rboDepth)
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, 1, 1)
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER, rboDepth)
      gl.bindRenderbuffer(gl.RENDERBUFFER, null)
      // fbo and pbo are kept bound
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fbo)
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo.info)
      this.infoODLabels = null
      this.sync.info = null
    }
  }

  finaliseFramebuffers () {
    const gl = this.gl
    for (const fbo of this.fbo) {
      gl.deleteFramebuffer(fbo)
    }
    for (const rbo of this.rbo) {
      gl.deleteRenderbuffer(rbo)
    }
    for (const pbo of this.pbo) {
      gl.deleteBuffer(pbo)
    }
  }

  initialiseUniformBuffers () {
    const gl = this.gl
    const ubo = this.ubo = {}
    ubo.environment = createUniformBuffer(
      gl, ENVIRONMENT_UNIFORM_BUFFER_SIZE, gl.DYNAMIC_DRAW,
      ENVIRONMENT_UNIFORM_BINDING_POINT_INDEX
    )
    ubo.cartnTransform = createUniformBuffer(
      gl, CARTN_TRANSFORM_UNIFORM_BUFFER_SIZE, gl.DYNAMIC_DRAW,
      CARTN_TRANSFORM_UNIFORM_BINDING_POINT_INDEX
    )
    ubo.highlight = createUniformBuffer(
      gl, HIGHLIGHT_UNIFORM_BUFFER_SIZE, gl.DYNAMIC_DRAW,
      HIGHLIGHT_UNIFORM_BINDING_POINT_INDEX
    )
  }

  finaliseUniformBuffers () {
    const gl = this.gl
    for (const ubo of Object.values(this.ubo)) {
      gl.deleteBuffer(ubo)
    }
  }

  initialiseVertexBuffers () {
    const gl = this.gl
    this.vbo = {}
    this.ibo = {}
    this.vao = {}
    // sphere
    {
      const sphere = genHalfOctahedron(NSUB_OCTAHEDRON)
      this.vbo.sphere = createBuffer(
        gl, gl.ARRAY_BUFFER, new Float32Array(sphere.v), gl.STATIC_DRAW
      )
      // !!! Uint32 no need ???
      this.ibo.sphere = createBuffer(
        gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(sphere.i), gl.STATIC_DRAW
      )
      this.vCountSphere = sphere.i.length
    }
    // cylinder
    {
      const cylinder = genCylinder(NPHI_CYLINDER)
      this.vbo.cylinder = createBuffer(
        gl, gl.ARRAY_BUFFER, new Float32Array(cylinder.vn), gl.STATIC_DRAW
      )
      // !!! Uint32 no need ???
      this.ibo.cylinder = createBuffer(
        gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(cylinder.i), gl.STATIC_DRAW
      )
      this.vCountCylinder = cylinder.i.length
    }
    // site ssg id
    this.vbo.siteSSGId = gl.createBuffer()
    this.vboSiteSSGIdSize = 0
    // fract_coord site
    this.vbo.siteFractCoord = gl.createBuffer()
    this.vboSiteFractCoordSize = 0
    // od fragment asym
    this.vbo.odFragAsym = gl.createBuffer()
    this.vboODFragAsymSize = 0
    // od fragment
    this.vbo.odFrag = gl.createBuffer()
    this.vboODFragSize = 0
    // od fragment vid
    this.vbo.odFragVId = createBuffer(
      gl,
      gl.ARRAY_BUFFER,
      new Int8Array([0, 0, 1, 2, 3, 0, 1, 1]),
      gl.STATIC_DRAW
    )
    // od instance
    this.vbo.odInstance = gl.createBuffer()
    this.vboODInstanceSize = 0
    // fract coords
    this.vbo.lattFractCoord = createBuffer(
      gl, gl.ARRAY_BUFFER, MAX_RFRACTLATT_COUNT * 6, gl.DYNAMIC_DRAW
    )
    // proj
    this.vbo.proj = createBuffer(
      gl, gl.ARRAY_BUFFER, MAX_RFRACTLATT_COUNT * 8 * 4, gl.DYNAMIC_COPY
    )
    // proj dummy
    this.vbo.projDummy = createBuffer(
      gl,
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]),
      gl.STATIC_DRAW
    )
    // atom
    this.vbo.atom = createBuffer(
      gl, gl.ARRAY_BUFFER, MAX_RFRACTLATT_COUNT * 12 * 4, gl.DYNAMIC_COPY
    )
    // atom dummy
    this.vbo.atomDummy = createBuffer(
      gl,
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]),
      gl.STATIC_DRAW
    )
    // bond etc.
    this.vbo.bondetc = createBuffer(
      gl, gl.ARRAY_BUFFER, MAX_RFRACTLATT_COUNT * 36 * 4, gl.DYNAMIC_COPY
    )
    // face vid
    this.vbo.faceVId = createBuffer(
      gl,
      gl.ARRAY_BUFFER,
      new Int8Array([0, 1, 2]),
      gl.STATIC_DRAW
    )
    // displacement
    this.vbo.displacement = gl.createBuffer()
    this.vboDisplacementSize = 0
    // asym bond displacement
    this.vbo.asymBondDisplacement = gl.createBuffer()
    this.vboAsymBondDisplacementSize = 0
    // bond displacement
    this.vbo.bondDisplacement = gl.createBuffer()
    this.vboBondDisplacementSize = 0
    // vertex displacement
    this.vbo.vertexDisplacement = gl.createBuffer()
    this.vboVertexDisplacementSize = 0
    // edge displacement
    this.vbo.edgeDisplacement = gl.createBuffer()
    this.vboEdgeDisplacementSize = 0
    // face displacement
    this.vbo.faceDisplacement = gl.createBuffer()
    this.vboFaceDisplacementSize = 0
    // vao colour atoms
    {
      const vao = this.vao.colourAtoms = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribIPointer(0, 2, gl.UNSIGNED_INT, 32, 0)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao mask asym bonds
    {
      const vao = this.vao.maskAsymBonds = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.asymBondDisplacement)
      gl.enableVertexAttribArray(0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_BYTE, 28, 0)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 4)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribIPointer(2, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao mask bonds
    {
      const vao = this.vao.maskBonds = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.bondDisplacement)
      gl.enableVertexAttribArray(0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_BYTE, 28, 0)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 4)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribIPointer(2, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao mask vertices
    {
      const vao = this.vao.maskVertices = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.vertexDisplacement)
      gl.enableVertexAttribArray(0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_BYTE, 16, 0)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 16, 4)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribIPointer(2, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao mask edges
    {
      const vao = this.vao.maskEdges = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.edgeDisplacement)
      gl.enableVertexAttribArray(0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_BYTE, 16, 0)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 16, 4)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribIPointer(2, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao mask faces
    {
      const vao = this.vao.maskFaces = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.faceDisplacement)
      gl.enableVertexAttribArray(0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_BYTE, 16, 0)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 16, 4)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribIPointer(2, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao draw odfrags (only perp)
    {
      const vao = this.vao.drawODFrags = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.odInstance)
      gl.enableVertexAttribArray(0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 44, 0)
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 44, 12)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.displacement)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 12, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao draw odfrags info (only perp)
    {
      const vao = this.vao.drawODFragsInfo = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.odInstance)
      gl.enableVertexAttribArray(0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 44, 0)
      gl.vertexAttribIPointer(1, 4, gl.UNSIGNED_INT, 44, 28)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.displacement)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 12, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // atoms experimental ...
    // vao draw atoms par
    {
      const vao = this.vao.drawAtomsPar = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.sphere)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.sphere)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribDivisor(1, 1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.enableVertexAttribArray(3)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 0)
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, 16)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao draw atoms info par
    {
      const vao = this.vao.drawAtomsInfoPar = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.sphere)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.sphere)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribDivisor(1, 1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.enableVertexAttribArray(3)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 16)
      gl.vertexAttribIPointer(3, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao draw atoms perp
    {
      const vao = this.vao.drawAtomsPerp = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.sphere)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.sphere)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribDivisor(1, 1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 20)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.enableVertexAttribArray(3)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 0)
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, 16)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao draw atoms info perp
    {
      const vao = this.vao.drawAtomsInfoPerp = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.sphere)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.sphere)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribDivisor(1, 1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 20)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.enableVertexAttribArray(3)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 16)
      gl.vertexAttribIPointer(3, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // ... atoms experimental
    // bonds experimental ...
    // vao draw bonds (only par)
    {
      const vao = this.vao.drawHalfBonds = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.cylinder)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.cylinder)
      gl.enableVertexAttribArray(0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(3)
      gl.enableVertexAttribArray(4)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribDivisor(4, 1)
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, 0)
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 48, 16)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.bondetc)
      gl.enableVertexAttribArray(5)
      gl.enableVertexAttribArray(6)
      gl.vertexAttribDivisor(5, 1)
      gl.vertexAttribDivisor(6, 1)
      gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 48, 0)
      gl.vertexAttribPointer(6, 4, gl.FLOAT, false, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao draw bonds info (only par)
    {
      const vao = this.vao.drawHalfBondsInfo = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.cylinder)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.cylinder)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribDivisor(1, 1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.enableVertexAttribArray(3)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 16)
      gl.vertexAttribIPointer(3, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.bondetc)
      gl.enableVertexAttribArray(4)
      gl.enableVertexAttribArray(5)
      gl.vertexAttribDivisor(4, 1)
      gl.vertexAttribDivisor(5, 1)
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 48, 0)
      gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // ... bonds experimental
    // vertices experimental ...
    // vao draw vertices (only par)
    {
      const vao = this.vao.drawVertices = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.sphere)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.sphere)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribDivisor(1, 1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribIPointer(2, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.bondetc)
      gl.enableVertexAttribArray(3)
      gl.enableVertexAttribArray(4)
      gl.enableVertexAttribArray(5)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribDivisor(4, 1)
      gl.vertexAttribDivisor(5, 1)
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, 0)
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 48, 16)
      gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao draw vertices info (only par)
    {
      const vao = this.vao.drawVerticesInfo = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.sphere)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.sphere)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribDivisor(1, 1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribIPointer(2, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.bondetc)
      gl.enableVertexAttribArray(3)
      gl.enableVertexAttribArray(4)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribDivisor(4, 1)
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, 0)
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // ... vertices experimental
    // edges experimental ...
    // vao draw edges (only par)
    {
      const vao = this.vao.drawEdges = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.cylinder)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.cylinder)
      gl.enableVertexAttribArray(0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(3)
      gl.enableVertexAttribArray(4)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribDivisor(4, 1)
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, 0)
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 48, 16)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.bondetc)
      gl.enableVertexAttribArray(5)
      gl.enableVertexAttribArray(6)
      gl.vertexAttribDivisor(5, 1)
      gl.vertexAttribDivisor(6, 1)
      gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 96, 0)
      gl.vertexAttribPointer(6, 4, gl.FLOAT, false, 96, 48)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao draw edges info (only par)
    {
      const vao = this.vao.drawEdgesInfo = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.cylinder)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.cylinder)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribDivisor(1, 1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.enableVertexAttribArray(3)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 16)
      gl.vertexAttribIPointer(3, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.bondetc)
      gl.enableVertexAttribArray(4)
      gl.enableVertexAttribArray(5)
      gl.vertexAttribDivisor(4, 1)
      gl.vertexAttribDivisor(5, 1)
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 96, 0)
      gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 96, 48)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // ... edges experimental
    // faces experimental ...
    // vao draw faces (only par)
    {
      const vao = this.vao.drawFaces = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.faceVId)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribIPointer(0, 1, gl.BYTE, 1, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribDivisor(1, 1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.bondetc)
      gl.enableVertexAttribArray(3)
      gl.enableVertexAttribArray(4)
      gl.enableVertexAttribArray(5)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribDivisor(4, 1)
      gl.vertexAttribDivisor(5, 1)
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 144, 0)
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 144, 48)
      gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 144, 96)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // vao draw faces info (only par)
    {
      const vao = this.vao.drawFacesInfo = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.faceVId)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribIPointer(0, 1, gl.BYTE, 1, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribDivisor(1, 1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 8)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.atom)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribDivisor(2, 1)
      gl.vertexAttribIPointer(2, 4, gl.UNSIGNED_INT, 48, 32)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.bondetc)
      gl.enableVertexAttribArray(3)
      gl.enableVertexAttribArray(4)
      gl.enableVertexAttribArray(5)
      gl.vertexAttribDivisor(3, 1)
      gl.vertexAttribDivisor(4, 1)
      gl.vertexAttribDivisor(5, 1)
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 144, 0)
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 144, 48)
      gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 144, 96)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }
    // ... faces experimental
    gl.bindVertexArray(null)
  }

  finaliseVertexBuffers () {
    const gl = this.gl
    for (const vao of Object.values(this.vao)) {
      gl.deleteVertexArray(vao)
    }
    for (const vbo of Object.values(this.vbo)) {
      gl.deleteBuffer(vbo)
    }
    for (const ibo of Object.values(this.ibo)) {
      gl.deleteBuffer(ibo)
    }
  }

  initialiseTextures () {
    const gl = this.gl
    this.tex = {}
    this.fbTex = {}
    // ssg
    {
      const ssg = this.tex.ssg = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + SSG_TEXTURE_UNIT)
      gl.bindTexture(gl.TEXTURE_2D, ssg)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, MAX_SSG_TEXTURE_WIDTH, 2)
    }
    // od-colour-radius
    {
      const odColourRadius = this.tex.odColourRadius = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + OD_COLOUR_RADIUS_TEXTURE_UNIT)
      gl.bindTexture(gl.TEXTURE_2D, odColourRadius)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      this.odColourRadiusTextureHeight = 0
    }
    // cut
    {
      const texCut = this.tex.cut = gl.createTexture()
      const width = CUT_TEXTURE_WIDTH
      const depth = this.texCutDepth = 1
      gl.activeTexture(gl.TEXTURE0 + CUT_TEXTURE_UNIT)
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texCut)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.R32UI, width, width, depth)
      const fbCut = this.fbTex.cut = gl.createFramebuffer()
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbCut)
      gl.framebufferTextureLayer(
        gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texCut, 0, 0
      )
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    }
  }

  finaliseTextures () {
    const gl = this.gl
    for (const fbTex of this.fbTex) {
      gl.deleteFramebuffer(fbTex)
    }
    for (const tex of Object.values(this.tex)) {
      gl.deleteTexture(tex)
    }
  }

  initialiseUpdater () {
    this.lastUpdateFailed = true
    this.lastContext = null
    this.lastInfo = null
    this.atomSites = []
    this.mapODIdToAtomSiteId = []
    this.deltaOFract = null
    this.deltaOFractOffset = null
    this.rCutParCartn = 3.0
    this.rCutParCartnMin = 1e-3
    this.rCutParCartnMax = 30.0
    this.baseRadius = 0.3
    this.odBaseOpacity = 0.5
    // ad hoc ...
    this.unhighlightColourFactor = [0.2, 0.2, 0.2, 0.2]
    this.unhighlightRadiusFactor = [0.2, 0.2, 0.2, 0.2]
    this.highlightRef = {
      typeId: TYPEID_NONE,
      type: TYPE_TEXT[TYPEID_NONE],
      odId: INVALID_ODID,
      odLabel: '',
      ssgId: 0,
      lattFractCoord: null
    }
    this.highlightMask = {
      type: false,
      od: false,
      ssg: false,
      latt: false
    }
    // ... ad hoc
    // ad hoc ...
    this.cameraPar = new Camera()
    this.cameraPar.orthographic = false
    this.cameraPerp = new Camera()
    this.cameraPerp.orthographic = false
    if (this.subscribers.cameraOrthographic) {
      this.subscribers.cameraOrthographic(this.cameraPar.orthographic)
    }
    // ... ad hoc

    const selectState = ctx => ctx.state
    const selectCanvasSize = createSelector(
      [
        () => this.gl,
        () => this.gl.canvas,
        () => this.gl.canvas.clientWidth,
        () => this.gl.canvas.clientHeight
      ],
      (gl, canvas, clientWidth, clientHeight) => {
        // the following codes should be used if padding may be non-zero
        // const style = window.getComputedStyle(canvas)
        // const pl = parseInt(style.getPropertyValue('padding-left'), 10)
        // const pr = parseInt(style.getPropertyValue('padding-right'), 10)
        // const pt = parseInt(style.getPropertyValue('padding-top'), 10)
        // const pb = parseInt(style.getPropertyValue('padding-bottom'), 10)
        // clientWidth -= (pl + pr)
        // clientHeight -= (pt + pb)
        canvas.width = clientWidth // - pl - pr
        canvas.height = clientHeight // - pt - pb
        return [gl.drawingBufferWidth, gl.drawingBufferHeight]
      }
    )
    const selectWidth = createSelector(
      [selectCanvasSize], canvasSize => canvasSize[0]
    )
    const selectHeight = createSelector(
      [selectCanvasSize], canvasSize => canvasSize[1]
    )
    const selectOverlayPanel = createSelector(
      [selectState], this.overlayPanelSelector
    )
    const selectViewports = createSelector(
      [selectOverlayPanel, selectWidth, selectHeight],
      (overlayPanel, width, height) => Array.from(
        genViewportsFromPanel(overlayPanel.rootPanel, 0, 0, width, height)
      )
    )
    const selectCurrentPosition = createSelector(
      [
        () => this.gl,
        () => this.ui.clientMousePosition
      ],
      canvasCoordOf
    )
    const selectDragStartPosition = createSelector(
      [
        () => this.gl,
        () => this.ui.clientDragStartPosition
      ],
      (gl, clientPosition) => clientPosition
        ? canvasCoordOf(gl, clientPosition)
        : undefined
    )
    const selectQuasicrystal = createSelector(
      [selectState], this.quasicrystalSelector
    )
    const selectDict = createSelector(
      [selectQuasicrystal],
      qc => qc.dictionary
    )
    const selectData = createSelector(
      [selectQuasicrystal],
      qc => qc.data
    )
    const createDataItemSelector = (catId, objId) => {
      const itemSelector = createSelector(
        [selectDict, selectData],
        (dict, data) => selectDataItem(dict, data, catId, objId).value
      )
      return (deps, res) => createSelector([itemSelector, ...deps], res)
    }
    const filterMatrix = matrix => matrix && matrix.every(Number.isFinite)
      ? matrix : false
    const filterIntegerMatrix = matrix =>
      matrix && matrix.every(Number.isInteger)
        ? matrix : false
    const filterMatrixArray = arr => {
      if (arr) {
        arr = arr.map(x => x.value)
        if (arr.every(filterMatrix)) {
          return arr
        }
      }
      return false
    }
    const filterIntegerMatrixArray = arr => {
      if (arr) {
        arr = arr.map(x => x.value)
        if (arr.every(filterIntegerMatrix)) {
          return arr
        }
      }
      return false
    }
    const filterNumberArray = arr => {
      if (arr) {
        arr = arr.map(x => x.value)
        if (arr.every(Number.isFinite)) {
          return arr
        }
      }
      return false
    }
    const filterIntegerArray = arr => {
      if (arr) {
        arr = arr.map(x => x.value)
        if (arr.every(Number.isInteger)) {
          return arr
        }
      }
      return false
    }
    const filterIntegerListArray = arr => {
      if (arr) {
        arr = arr.map(x => x.value)
        if (arr.every(
          list => Array.isArray(list) && list.every(Number.isInteger)
        )) {
          return arr
        }
      }
      return false
    }
    const filterStringArray = arr => {
      if (arr) {
        arr = arr.map(x => x.value)
        if (arr.every(str => str)) {
          return arr
        }
      }
      return false
    }
    const filterUniqueStringArray = arr => {
      if (arr) {
        arr = arr.map(x => x.value)
        const set = new Set()
        for (const str of arr) {
          if (!str || set.has(str)) {
            return false
          }
          set.add(str)
        }
        return arr
      }
      return false
    }
    const filterArray = arr => {
      if (arr) {
        arr = arr.map(x => x.value)
        if (arr.every(x => x)) {
          return arr
        }
      }
      return false
    }
    const selectDimPar = createDataItemSelector(
      'cell', 'parallel_space_dimension'
    )([], dim => Number.isInteger(dim) && dim >= 1 && dim <= 3 ? dim : false)
    const selectDimPerp = createDataItemSelector(
      'cell', 'perpendicular_space_dimension'
    )([], dim => Number.isInteger(dim) && dim >= 0 && dim <= 3 ? dim : false)
    const selectAParCartn = createDataItemSelector(
      'cell', 'basis_parallel'
    )([], filterMatrix)
    const selectAPerpCartn = createDataItemSelector(
      'cell', 'basis_perpendicular'
    )([], filterMatrix)
    const selectOFract = createDataItemSelector(
      'cell', 'origin_fract'
    )([], filterMatrix)
    const selectBCartn = createDataItemSelector(
      'cell', 'reciprocal_basis'
    )([], filterMatrix)
    const selectSSGMultiplicity = createDataItemSelector(
      'superspace_group', 'multiplicity'
    )([], mult => Number.isInteger(mult) && mult >= 1 ? mult : false)
    const selectSSGMultiplicationTableSymopIds = createDataItemSelector(
      'superspace_group', 'multiplication_table_symop_id'
    )([], filterIntegerMatrix)
    const selectSSGIds = createDataItemSelector(
      'superspace_group_symop', 'id'
    )([], filterUniqueStringArray)
    const selectR = createDataItemSelector(
      'superspace_group_symop', 'r'
    )([], filterIntegerMatrixArray)
    const selectRPerpNoStrain = createDataItemSelector(
      'superspace_group_symop', 'r_perpendicular_no_strain'
    )([], filterMatrixArray)
    const selectTPerpNoStrain = createDataItemSelector(
      'superspace_group_symop', 't_perpendicular_no_strain'
    )([], filterMatrixArray)
    const selectODDispColours = createDataItemSelector(
      'occupation_domain', 'display_colour'
    )([], filterArray)
    const selectODDispOpacities = createDataItemSelector(
      'occupation_domain', 'display_opacity'
    )([], filterNumberArray)
    const selectODDispRadii = createDataItemSelector(
      'occupation_domain', 'display_radius'
    )([], filterNumberArray)
    const selectAtomSiteLabels = createDataItemSelector(
      'atom_site', 'label'
    )([], filterUniqueStringArray)
    const selectModelSiteLabels = createDataItemSelector(
      'model_site', 'label'
    )([], filterStringArray)
    const selectModelSiteSymopIds = createDataItemSelector(
      'model_site', 'symop_id'
    )([], filterIntegerListArray)
    const selectModelSiteFractCoords = createDataItemSelector(
      'model_site', 'fract_coord'
    )([], filterMatrixArray)
    const selectAsymBondSiteLabels1 = createDataItemSelector(
      'asym_bond', 'atom_site_label_1'
    )([], filterStringArray)
    const selectAsymBondSymopIds1 = createDataItemSelector(
      'asym_bond', 'symop_id_1'
    )([], filterIntegerArray)
    const selectAsymBondCellTranslations1 = createDataItemSelector(
      'asym_bond', 'cell_translation_1'
    )([], filterIntegerMatrixArray)
    const selectAsymBondSiteLabels2 = createDataItemSelector(
      'asym_bond', 'atom_site_label_2'
    )([], filterStringArray)
    const selectAsymBondSymopIds2 = createDataItemSelector(
      'asym_bond', 'symop_id_2'
    )([], filterIntegerArray)
    const selectAsymBondCellTranslations2 = createDataItemSelector(
      'asym_bond', 'cell_translation_2'
    )([], filterIntegerMatrixArray)
    const selectGeomBondSiteLabels1 = createDataItemSelector(
      'geom_bond', 'atom_site_label_1'
    )([], filterStringArray)
    const selectGeomBondSymopIds1 = createDataItemSelector(
      'geom_bond', 'symop_id_1'
    )([], filterIntegerArray)
    const selectGeomBondCellTranslations1 = createDataItemSelector(
      'geom_bond', 'cell_translation_1'
    )([], filterIntegerMatrixArray)
    const selectGeomBondSiteLabels2 = createDataItemSelector(
      'geom_bond', 'atom_site_label_2'
    )([], filterStringArray)
    const selectGeomBondSymopIds2 = createDataItemSelector(
      'geom_bond', 'symop_id_2'
    )([], filterIntegerArray)
    const selectGeomBondCellTranslations2 = createDataItemSelector(
      'geom_bond', 'cell_translation_2'
    )([], filterIntegerMatrixArray)
    const selectClusterVertexSiteLabels = createDataItemSelector(
      'cluster_vertex', 'atom_site_label'
    )([], filterStringArray)
    const selectClusterVertexSymopIds = createDataItemSelector(
      'cluster_vertex', 'symop_id'
    )([], filterIntegerArray)
    const selectClusterVertexCellTranslations = createDataItemSelector(
      'cluster_vertex', 'cell_translation'
    )([], filterIntegerMatrixArray)
    const selectClusterVertexSiteLabels1 = createDataItemSelector(
      'cluster_vertex', 'atom_site_label_1'
    )([], filterStringArray)
    const selectClusterVertexSymopIds1 = createDataItemSelector(
      'cluster_vertex', 'symop_id_1'
    )([], filterIntegerArray)
    const selectClusterVertexCellTranslations1 = createDataItemSelector(
      'cluster_vertex', 'cell_translation_1'
    )([], filterIntegerMatrixArray)
    const selectClusterEdgeSiteLabels = createDataItemSelector(
      'cluster_edge', 'atom_site_label'
    )([], filterStringArray)
    const selectClusterEdgeSymopIds = createDataItemSelector(
      'cluster_edge', 'symop_id'
    )([], filterIntegerArray)
    const selectClusterEdgeCellTranslations = createDataItemSelector(
      'cluster_edge', 'cell_translation'
    )([], filterIntegerMatrixArray)
    const selectClusterEdgeSiteLabels1 = createDataItemSelector(
      'cluster_edge', 'atom_site_label_1'
    )([], filterStringArray)
    const selectClusterEdgeSymopIds1 = createDataItemSelector(
      'cluster_edge', 'symop_id_1'
    )([], filterIntegerArray)
    const selectClusterEdgeCellTranslations1 = createDataItemSelector(
      'cluster_edge', 'cell_translation_1'
    )([], filterIntegerMatrixArray)
    const selectClusterEdgeSiteLabels2 = createDataItemSelector(
      'cluster_edge', 'atom_site_label_2'
    )([], filterStringArray)
    const selectClusterEdgeSymopIds2 = createDataItemSelector(
      'cluster_edge', 'symop_id_2'
    )([], filterIntegerArray)
    const selectClusterEdgeCellTranslations2 = createDataItemSelector(
      'cluster_edge', 'cell_translation_2'
    )([], filterIntegerMatrixArray)
    const selectClusterFaceSiteLabels = createDataItemSelector(
      'cluster_face', 'atom_site_label'
    )([], filterStringArray)
    const selectClusterFaceSymopIds = createDataItemSelector(
      'cluster_face', 'symop_id'
    )([], filterIntegerArray)
    const selectClusterFaceCellTranslations = createDataItemSelector(
      'cluster_face', 'cell_translation'
    )([], filterIntegerMatrixArray)
    const selectClusterFaceSiteLabels1 = createDataItemSelector(
      'cluster_face', 'atom_site_label_1'
    )([], filterStringArray)
    const selectClusterFaceSymopIds1 = createDataItemSelector(
      'cluster_face', 'symop_id_1'
    )([], filterIntegerArray)
    const selectClusterFaceCellTranslations1 = createDataItemSelector(
      'cluster_face', 'cell_translation_1'
    )([], filterIntegerMatrixArray)
    const selectClusterFaceSiteLabels2 = createDataItemSelector(
      'cluster_face', 'atom_site_label_2'
    )([], filterStringArray)
    const selectClusterFaceSymopIds2 = createDataItemSelector(
      'cluster_face', 'symop_id_2'
    )([], filterIntegerArray)
    const selectClusterFaceCellTranslations2 = createDataItemSelector(
      'cluster_face', 'cell_translation_2'
    )([], filterIntegerMatrixArray)
    const selectClusterFaceSiteLabels3 = createDataItemSelector(
      'cluster_face', 'atom_site_label_3'
    )([], filterStringArray)
    const selectClusterFaceSymopIds3 = createDataItemSelector(
      'cluster_face', 'symop_id_3'
    )([], filterIntegerArray)
    const selectClusterFaceCellTranslations3 = createDataItemSelector(
      'cluster_face', 'cell_translation_3'
    )([], filterIntegerMatrixArray)
    const selectODLabels = createDataItemSelector(
      'occupation_domain', 'label'
    )([], filterUniqueStringArray)
    const selectODSiteLabels = createDataItemSelector(
      'occupation_domain', 'atom_site_label'
    )([], filterStringArray)
    const selectODAsymPolytopes = createDataItemSelector(
      'occupation_domain', 'polytope_asymmetric_unit'
    )([], filterArray)

    const selectOFractPlusDelta = createSelector(
      [() => this.deltaOFract, selectOFract],
      (deltaOFract, oFract) => {
        if (deltaOFract && oFract && deltaOFract.length === oFract.length) {
          return lnum.add(oFract, deltaOFract)
        }
        return oFract
      }
    )

    const updateEnvironmentUniform = createSelector(
      [],
      () => {
        const gl = this.gl
        const arr =
          new DataView(new ArrayBuffer(ENVIRONMENT_UNIFORM_BUFFER_SIZE))
        const float32view = new Float32Array(arr.buffer)
        // ad hoc ...
        const directionalLightDir = [-0.3, -0.7, -0.5]
        const ambientLightColour = [0.5, 0.5, 0.5]
        // ... ad hoc
        float32view.set(directionalLightDir, 0)
        float32view.set(ambientLightColour, 4)
        updateBuffer(gl, gl.UNIFORM_BUFFER, this.ubo.environment, 0, arr)
        return this.requestId
      }
    )
    const updateHighlightUniform = createSelector(
      [
        () => this.rCutParCartn,
        () => this.baseRadius,
        () => this.odBaseOpacity,
        () => this.unhighlightColourFactor,
        () => this.unhighlightRadiusFactor,
        () => this.deltaOFractOffset,
        () => this.highlightRef,
        () => this.highlightMask
      ],
      (
        rCutParCartn,
        baseRadius,
        odBaseOpacity,
        unhighlightColourFactor,
        unhighlightRadiusFactor,
        deltaOFractOffset,
        highlightRef,
        highlightMask
      ) => {
        const gl = this.gl
        const arr = new DataView(new ArrayBuffer(HIGHLIGHT_UNIFORM_BUFFER_SIZE))
        const float32View = new Float32Array(arr.buffer)
        const uint32View = new Uint32Array(arr.buffer)
        float32View.set([rCutParCartn, baseRadius, odBaseOpacity], 0)
        float32View.set(unhighlightColourFactor, 4)
        float32View.set(unhighlightRadiusFactor, 8)
        uint32View.set([
          ...genHighlightRefBit(highlightRef, deltaOFractOffset),
          ...genHighlightMaskBit(highlightMask)
        ], 12)
        updateBuffer(gl, gl.UNIFORM_BUFFER, this.ubo.highlight, 0, arr)
        if (this.subscribers.highlightRefString) {
          this.subscribers.highlightRefString({
            type: this.highlightRef.type,
            odLabel: this.highlightRef.odLabel || '.',
            ssgId: this.highlightRef.ssgId.toString(),
            lattFractCoord: this.highlightRef.lattFractCoord === null
              ? '.'
              : lnum.$(...this.highlightRef.lattFractCoord).toString()
          })
        }
        if (this.subscribers.highlightMask) {
          this.subscribers.highlightMask(this.highlightMask)
        }
        return this.requestId
      }
    )
    const updateCartnTransformUniform = createSelector(
      [
        selectAParCartn,
        selectAPerpCartn,
        selectOFractPlusDelta
      ],
      (aParCartn, aPerpCartn, oFract) => {
        if (!aParCartn || !aPerpCartn || !oFract) {
          return NOT_READY
        }
        if (CARTN_TRANSFORM_UNIFORM_BUFFER_SIZE !== 56 * 4) {
          throw Error(`Debug info: buffer size mismatch.`)
        }
        const dim = oFract.length
        const dimPar = aParCartn.getDim()[0]
        const dimPerp = aPerpCartn.getDim()[0]
        const arr = new Float32Array(56)
        const end1 = Math.min(dim, 3)
        const end2 = Math.min(dim, 6)
        for (let i = 0; i < dimPar; i += 1) {
          const ii = i * dim
          arr.set(aParCartn.slice(ii, ii + end1), i * 4)
        }
        for (let i = 0; i < dimPar; i += 1) {
          const ii = i * dim
          arr.set(aParCartn.slice(ii + end1, ii + end2), i * 4 + 12)
        }
        for (let i = 0; i < dimPerp; i += 1) {
          const ii = i * dim
          arr.set(aPerpCartn.slice(ii, ii + end1), i * 4 + 24)
        }
        for (let i = 0; i < dimPerp; i += 1) {
          const ii = i * dim
          arr.set(aPerpCartn.slice(ii + end1, ii + end2), i * 4 + 36)
        }
        arr.set(oFract.slice(0, end1), 48)
        arr.set(oFract.slice(end1, end2), 52)
        const gl = this.gl
        updateBuffer(gl, gl.UNIFORM_BUFFER, this.ubo.cartnTransform, 0, arr)
        return this.requestId
      }
    )
    const updateSSGTexture = createSelector(
      [
        selectSSGIds,
        selectRPerpNoStrain,
        selectTPerpNoStrain
      ],
      (ssgIds, rPerp, tPerp) => {
        if (!ssgIds || !rPerp || !tPerp) {
          return NOT_READY
        }
        const order = rPerp.length
        if (order === 0) {
          return NOT_READY
        }
        if (order > MAX_SSG_COUNT) {
          return NOT_READY
        }
        if (order * 3 > MAX_SSG_TEXTURE_WIDTH) {
          return NOT_READY
        }
        const width = MAX_SSG_TEXTURE_WIDTH
        const offset = width * 4
        const dimPerp = tPerp[0].length
        const arr = new Float32Array(offset * 2)
        for (let i = 0; i < order; i += 1) {
          const is = ssgIds[i] - 1 // original to internal id
          const rot = [1, 0, 0, 0, 1, 0, 0, 0, 1].map((x, k) => {
            const i = Math.floor(k / 3)
            const j = k % 3
            if (i < dimPerp && j < dimPerp) {
              return rPerp[is][i * dimPerp + j]
            } else {
              return x
            }
          })
          const trans = [0, 0, 0].map((x, i) => i < dimPerp ? tPerp[is][i] : x)
          arr[offset + is * 12] = rot[0]
          arr[offset + is * 12 + 1] = rot[1]
          arr[offset + is * 12 + 2] = rot[2]
          arr[offset + is * 12 + 3] = trans[0]
          arr[offset + is * 12 + 4] = rot[3]
          arr[offset + is * 12 + 5] = rot[4]
          arr[offset + is * 12 + 6] = rot[5]
          arr[offset + is * 12 + 7] = trans[1]
          arr[offset + is * 12 + 8] = rot[6]
          arr[offset + is * 12 + 9] = rot[7]
          arr[offset + is * 12 + 10] = rot[8]
          arr[offset + is * 12 + 11] = trans[2]
        }
        const gl = this.gl
        gl.activeTexture(gl.TEXTURE0 + SSG_TEXTURE_UNIT)
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, 2, gl.RGBA, gl.FLOAT,
          arr)
        return this.requestId
      }
    )
    const updateODColourRadiusTexture = createSelector(
      [
        selectODLabels,
        selectODDispColours,
        selectODDispOpacities,
        selectODDispRadii
      ],
      (labels, colours, opacities, radii) => {
        if (!labels || !colours || !opacities || !radii) {
          return NOT_READY
        }
        const n = labels.length
        if (
          colours.length !== n ||
          opacities.length !== n ||
          radii.length !== n ||
          n > MAX_OD_COUNT
        ) {
          return NOT_READY
        }
        const width = DATA_TEXTURE_WIDTH
        const height = Math.ceil(2 * n / width)
        if (height === 0) {
          return NOT_READY
        }
        const arr = new Float32Array(width * height * 4)
        for (let i = 0; i < n; i += 1) {
          const colour = colours[i]
          const red = parseInt(colour.substring(1, 3), 16) / 255
          const green = parseInt(colour.substring(3, 5), 16) / 255
          const blue = parseInt(colour.substring(5, 7), 16) / 255
          const opacity = opacities[i]
          const radius = radii[i]
          arr.set([red, green, blue, opacity, radius], i * 8)
        }
        const gl = this.gl
        gl.activeTexture(gl.TEXTURE0 + OD_COLOUR_RADIUS_TEXTURE_UNIT)
        if (height > this.odColourRadiusTextureHeight) {
          this.odColourRadiusTextureHeight = height
          gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height)
        }
        gl.texSubImage2D(
          gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.FLOAT, arr
        )
        return this.requestId
      }
    )
    const updateAtomSites = createSelector(
      [
        selectAtomSiteLabels,
        selectModelSiteLabels,
        selectModelSiteSymopIds,
        selectModelSiteFractCoords
      ], (
        atomSiteLabels,
        modelSiteLabels,
        modelSiteSymopIds,
        modelSiteFractCoords
      ) => {
        if (
          !atomSiteLabels ||
          !modelSiteLabels ||
          !modelSiteSymopIds ||
          !modelSiteFractCoords
        ) {
          return NOT_READY
        }
        const gl = this.gl
        // clean up
        for (const atomSite of this.atomSites) {
          for (const vao of atomSite.vaoGenODInstance) {
            if (vao) {
              gl.deleteVertexArray(vao)
            }
          }
          for (const vao of atomSite.vaoProj) {
            if (vao) {
              gl.deleteVertexArray(vao)
            }
          }
          for (const eqvPosVaoCut of atomSite.eqvPositionsVaoCut) {
            for (const vao of eqvPosVaoCut) {
              if (vao) {
                gl.deleteVertexArray(vao)
              }
            }
          }
        }
        const atomSites = this.atomSites = []
        const eqvPosSSGIdData = []
        const siteFractCoordData = []
        for (let i = 0; i < atomSiteLabels.length; i += 1) {
          const siteLabel = atomSiteLabels[i]
          const modelSiteIds = modelSiteLabels
            .map((label, id) => [label, id])
            .filter(([label]) => label === siteLabel)
            .map(([, id]) => id)
          const numEqvPositions = modelSiteIds.length
          const eqvPosSSGIds = modelSiteIds.map(id => modelSiteSymopIds[id])
          const siteSymOrder = eqvPosSSGIds[0].length
          const ssgIdStart = eqvPosSSGIdData.length
          const eqvPosSSGIdsFlat = eqvPosSSGIds.flat()
          eqvPosSSGIdData.push(...eqvPosSSGIdsFlat)
          const mapSSGInternalIdToEqvPosId =
            Array.from(eqvPosSSGIdsFlat, () => 0)
          for (let j = 0; j < eqvPosSSGIds.length; j += 1) {
            for (const ssgId of eqvPosSSGIds[j]) {
              mapSSGInternalIdToEqvPosId[ssgId - 1] = j // internal id
            }
          }
          const eqvPosFractCoords = modelSiteIds.map(
            id => modelSiteFractCoords[id]
          )
          const eqvPosFractCoordsEmbed = eqvPosFractCoords.map(
            fractCoord => [0, 0, 0, 0, 0, 0].map(
              (x, i) => i < fractCoord.length ? fractCoord[i] : x
            )
          )
          const siteFractCoordStart = siteFractCoordData.length
          siteFractCoordData.push(...eqvPosFractCoordsEmbed)
          atomSites.push({
            label: siteLabel,
            eqvPosFractCoords: eqvPosFractCoords,
            mapSSGInternalIdToEqvPosId: mapSSGInternalIdToEqvPosId,
            siteSymOrder: siteSymOrder,
            ssgIdStart: ssgIdStart,
            numEqvPositions: numEqvPositions,
            fractCoordStart: siteFractCoordStart,
            lattFractCoordGenerator: null,
            lattFractCoordCache:
              Array.from({ length: numEqvPositions }, () => []),
            odFragsAsym: null,
            odFrags: null,
            rPerpCartnMax: 0,
            vaoGenODInstance: [],
            vaoProj: [],
            eqvPositionsVaoCut:
              Array.from({ length: numEqvPositions }, () => []),
            eqvPositionsDisplacementData: [],
            eqvPositionsBondData: [],
            eqvPositionsVertexData: [],
            eqvPositionsEdgeData: [],
            eqvPositionsFaceData: []
          })
        }
        if (eqvPosSSGIdData.legnth === 0 || siteFractCoordData.length === 0) {
          return NOT_READY
        }
        // vbo siteSSGId
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.siteSSGId)
          const size = eqvPosSSGIdData.length
          if (this.vboSiteSSGIdSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW)
            this.vboSiteSSGIdSize = size
          }
          // conversion to internal id
          const arr = new Uint8Array(eqvPosSSGIdData.map(id => id - 1))
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr)
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        // vbo siteFractCoord
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.siteFractCoord)
          const size = siteFractCoordData.length * 24
          if (this.vboSiteFractCoordSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW)
            this.vboSiteFractCoordSize = size
          }
          const arr = new Float32Array(siteFractCoordData.flat())
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr)
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        // vao proj
        for (const atomSite of atomSites) {
          const siteFractCoordStart = atomSite.fractCoordStart
          for (let i = 0, n = atomSite.numEqvPositions; i < n; i += 1) {
            if (atomSite.vaoProj[i]) {
              gl.deleteVertexArray(atomSite.vaoProj[i])
            }
            const vao = atomSite.vaoProj[i] = gl.createVertexArray()
            gl.bindVertexArray(vao)
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.lattFractCoord)
            gl.enableVertexAttribArray(0)
            gl.enableVertexAttribArray(1)
            gl.vertexAttribIPointer(0, 3, gl.BYTE, 6, 0)
            gl.vertexAttribIPointer(1, 3, gl.BYTE, 6, 3)
            const offset = (siteFractCoordStart + i) * 24
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.siteFractCoord)
            gl.enableVertexAttribArray(2)
            gl.enableVertexAttribArray(3)
            gl.vertexAttribDivisor(2, 1)
            gl.vertexAttribDivisor(3, 1)
            gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 24, offset)
            gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 24, offset + 12)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
          }
        }
        gl.bindVertexArray(null)
        return this.requestId
      }
    )
    const updateDisplacements = createSelector(
      [
        selectAsymBondSiteLabels1,
        selectAsymBondSymopIds1,
        selectAsymBondCellTranslations1,
        selectAsymBondSiteLabels2,
        selectAsymBondSymopIds2,
        selectAsymBondCellTranslations2,
        selectGeomBondSiteLabels1,
        selectGeomBondSymopIds1,
        selectGeomBondCellTranslations1,
        selectGeomBondSiteLabels2,
        selectGeomBondSymopIds2,
        selectGeomBondCellTranslations2,
        selectClusterVertexSiteLabels,
        selectClusterVertexSymopIds,
        selectClusterVertexCellTranslations,
        selectClusterVertexSiteLabels1,
        selectClusterVertexSymopIds1,
        selectClusterVertexCellTranslations1,
        selectClusterEdgeSiteLabels,
        selectClusterEdgeSymopIds,
        selectClusterEdgeCellTranslations,
        selectClusterEdgeSiteLabels1,
        selectClusterEdgeSymopIds1,
        selectClusterEdgeCellTranslations1,
        selectClusterEdgeSiteLabels2,
        selectClusterEdgeSymopIds2,
        selectClusterEdgeCellTranslations2,
        selectClusterFaceSiteLabels,
        selectClusterFaceSymopIds,
        selectClusterFaceCellTranslations,
        selectClusterFaceSiteLabels1,
        selectClusterFaceSymopIds1,
        selectClusterFaceCellTranslations1,
        selectClusterFaceSiteLabels2,
        selectClusterFaceSymopIds2,
        selectClusterFaceCellTranslations2,
        selectClusterFaceSiteLabels3,
        selectClusterFaceSymopIds3,
        selectClusterFaceCellTranslations3,
        selectSSGMultiplicity,
        selectSSGMultiplicationTableSymopIds,
        selectR,
        selectAParCartn,
        selectAPerpCartn,
        updateAtomSites
      ], (
        asymBondSiteLabels1,
        asymBondSymopIds1,
        asymBondCellTranslations1,
        asymBondSiteLabels2,
        asymBondSymopIds2,
        asymBondCellTranslations2,
        bondSiteLabels1,
        bondSymopIds1,
        bondCellTranslations1,
        bondSiteLabels2,
        bondSymopIds2,
        bondCellTranslations2,
        vertexSiteLabels,
        vertexSymopIds,
        vertexCellTranslations,
        vertexSiteLabels1,
        vertexSymopIds1,
        vertexCellTranslations1,
        edgeSiteLabels,
        edgeSymopIds,
        edgeCellTranslations,
        edgeSiteLabels1,
        edgeSymopIds1,
        edgeCellTranslations1,
        edgeSiteLabels2,
        edgeSymopIds2,
        edgeCellTranslations2,
        faceSiteLabels,
        faceSymopIds,
        faceCellTranslations,
        faceSiteLabels1,
        faceSymopIds1,
        faceCellTranslations1,
        faceSiteLabels2,
        faceSymopIds2,
        faceCellTranslations2,
        faceSiteLabels3,
        faceSymopIds3,
        faceCellTranslations3,
        ssgMult,
        ssgMultTableSymopIds,
        ssgR,
        aParCartn,
        aPerpCartn,
        ...updates
      ) => {
        if (
          !asymBondSiteLabels1 ||
          !asymBondSymopIds1 ||
          !asymBondCellTranslations1 ||
          !asymBondSiteLabels2 ||
          !asymBondSymopIds2 ||
          !asymBondCellTranslations2 ||
          !bondSiteLabels1 ||
          !bondSymopIds1 ||
          !bondCellTranslations1 ||
          !bondSiteLabels2 ||
          !bondSymopIds2 ||
          !bondCellTranslations2 ||
          !vertexSiteLabels ||
          !vertexSymopIds ||
          !vertexCellTranslations ||
          !vertexSiteLabels1 ||
          !vertexSymopIds1 ||
          !vertexCellTranslations1 ||
          !edgeSiteLabels ||
          !edgeSymopIds ||
          !edgeCellTranslations ||
          !edgeSiteLabels1 ||
          !edgeSymopIds1 ||
          !edgeCellTranslations1 ||
          !edgeSiteLabels2 ||
          !edgeSymopIds2 ||
          !edgeCellTranslations2 ||
          !faceSiteLabels ||
          !faceSymopIds ||
          !faceCellTranslations ||
          !faceSiteLabels1 ||
          !faceSymopIds1 ||
          !faceCellTranslations1 ||
          !faceSiteLabels2 ||
          !faceSymopIds2 ||
          !faceCellTranslations2 ||
          !faceSiteLabels3 ||
          !faceSymopIds3 ||
          !faceCellTranslations3 ||
          !ssgMult ||
          !ssgMultTableSymopIds ||
          !ssgR ||
          !aParCartn ||
          !aPerpCartn ||
          updates.some(x => x === NOT_READY)
        ) {
          return NOT_READY
        }
        const dim = aParCartn.getDim()[1]
        const displacementData = []
        const asymBondDispIdData = []
        const asymBondDispGlobalIdData = []
        const bondDispIdData = []
        const bondDispGlobalIdData = []
        const vertexDispIdData = []
        const vertexDispGlobalIdData = []
        const edgeDispIdData = []
        const edgeDispGlobalIdData = []
        const faceDispIdData = []
        const faceDispGlobalIdData = []
        let maxEqvPosDispCount = 0
        for (const [atomSiteId, atomSite] of this.atomSites.entries()) {
          const siteLabel = atomSite.label
          const eqvPosFractCoords = atomSite.eqvPosFractCoords
          const mapSSGInternalIdToEqvPosId = atomSite.mapSSGInternalIdToEqvPosId
          const atomSiteDisplacements = eqvPosFractCoords.map(
            () => [lnum.$(...Array.from({ length: dim }, () => 0))]
          )
          const atomSiteDisplacementTargetAtomSiteIds = eqvPosFractCoords.map(
            () => [atomSiteId]
          )
          // prepare for asymmetric bonds
          const atomSiteAsymBonds = eqvPosFractCoords.map(x => [])
          {
            const bond1Ids = asymBondSiteLabels1
              .map((label, id) => [label, id])
              .filter(([label]) => label === siteLabel)
              .map(([, id]) => id)
            const bond2Ids = asymBondSiteLabels2
              .map((label, id) => [label, id])
              .filter(([label]) => label === siteLabel)
              .map(([, id]) => id)
            const targetAtomSiteLabels = [
              ...bond1Ids.map(id => asymBondSiteLabels2[id]),
              ...bond2Ids.map(id => asymBondSiteLabels1[id])
            ]
            const targetAtomSiteIds = targetAtomSiteLabels.map(
              label => this.atomSites
                .map((x, id) => [x.label, id])
                .filter(([xLabel]) => xLabel === label)
                .map(([, id]) => id)[0]
            )
            const internalSSGIds = [
              ...bond1Ids.map(id => asymBondSymopIds1[id] - 1),
              ...bond2Ids.map(id => asymBondSymopIds2[id] - 1)
            ]
            const targetInternalSSGIds = [
              ...bond1Ids.map(id => asymBondSymopIds2[id] - 1),
              ...bond2Ids.map(id => asymBondSymopIds1[id] - 1)
            ]
            const siteFractCoords = internalSSGIds.map(
              id => eqvPosFractCoords[mapSSGInternalIdToEqvPosId[id]]
            )
            const targetSiteFractCoords = targetInternalSSGIds.map(
              (id, i) => {
                const targetAtomSite = this.atomSites[targetAtomSiteIds[i]]
                const targetMapSSGInternalIdToEqvPosId =
                  targetAtomSite.mapSSGInternalIdToEqvPosId
                const targetEqvPosFractCoords = targetAtomSite.eqvPosFractCoords
                return targetEqvPosFractCoords[
                  targetMapSSGInternalIdToEqvPosId[id]
                ]
              }
            )
            const relCellTranslations = [
              ...bond1Ids.map(id => lnum.sub(
                asymBondCellTranslations2[id],
                asymBondCellTranslations1[id]
              )),
              ...bond2Ids.map(id => lnum.sub(
                asymBondCellTranslations1[id],
                asymBondCellTranslations2[id]
              ))
            ]
            const displacementsAsym = relCellTranslations.map(
              (x, i) => lnum.add(x,
                lnum.sub(targetSiteFractCoords[i], siteFractCoords[i])
              )
            )
            for (let i = 0, n = targetAtomSiteLabels.length; i < n; i += 1) {
              const targetAtomSiteId = targetAtomSiteIds[i]
              const targetAtomSite = this.atomSites[targetAtomSiteId]
              const targetMapSSGInternalIdToEqvPosId =
                targetAtomSite.mapSSGInternalIdToEqvPosId
              const ssgId = internalSSGIds[i]
              const targetSSGId = targetInternalSSGIds[i]
              const eqvPosId = mapSSGInternalIdToEqvPosId[ssgId]
              const targetEqvPosId =
                targetMapSSGInternalIdToEqvPosId[targetSSGId]
              const disp = displacementsAsym[i]
              let dispId
              if (atomSiteDisplacements[eqvPosId].every((x, xId) => {
                if (lnum.eq(disp, x)) {
                  dispId = xId
                  return false
                }
                return true
              })) {
                dispId = atomSiteDisplacements[eqvPosId].length
                atomSiteDisplacements[eqvPosId].push(disp)
                atomSiteDisplacementTargetAtomSiteIds[eqvPosId]
                  .push(targetAtomSiteId)
              }
              const eqvPosBonds = atomSiteAsymBonds[eqvPosId]
              if (eqvPosBonds.every(
                (x, xId) =>
                  dispId !== x.displacementId ||
                  targetAtomSiteId !== x.targetAtomSiteId ||
                  targetEqvPosId !== x.targetEqvPosId
              )) {
                eqvPosBonds.push({
                  displacementId: dispId,
                  targetAtomSiteId,
                  targetEqvPosId
                })
              }
            }
          }
          // prepare for bonds
          const atomSiteBonds = eqvPosFractCoords.map(x => [])
          {
            const bond1Ids = bondSiteLabels1
              .map((label, id) => [label, id])
              .filter(([label]) => label === siteLabel)
              .map(([, id]) => id)
            const bond2Ids = bondSiteLabels2
              .map((label, id) => [label, id])
              .filter(([label]) => label === siteLabel)
              .map(([, id]) => id)
            const targetAtomSiteLabels = [
              ...bond1Ids.map(id => bondSiteLabels2[id]),
              ...bond2Ids.map(id => bondSiteLabels1[id])
            ]
            const targetAtomSiteIds = targetAtomSiteLabels.map(
              label => this.atomSites
                .map((x, id) => [x.label, id])
                .filter(([xLabel]) => xLabel === label)
                .map(([, id]) => id)[0]
            )
            const internalSSGIds = [
              ...bond1Ids.map(id => bondSymopIds1[id] - 1),
              ...bond2Ids.map(id => bondSymopIds2[id] - 1)
            ]
            const targetInternalSSGIds = [
              ...bond1Ids.map(id => bondSymopIds2[id] - 1),
              ...bond2Ids.map(id => bondSymopIds1[id] - 1)
            ]
            const siteFractCoords = internalSSGIds.map(
              id => eqvPosFractCoords[mapSSGInternalIdToEqvPosId[id]]
            )
            const targetSiteFractCoords = targetInternalSSGIds.map(
              (id, i) => {
                const targetAtomSite = this.atomSites[targetAtomSiteIds[i]]
                const targetMapSSGInternalIdToEqvPosId =
                  targetAtomSite.mapSSGInternalIdToEqvPosId
                const targetEqvPosFractCoords = targetAtomSite.eqvPosFractCoords
                return targetEqvPosFractCoords[
                  targetMapSSGInternalIdToEqvPosId[id]
                ]
              }
            )
            const relCellTranslations = [
              ...bond1Ids.map(id =>
                lnum.sub(bondCellTranslations2[id], bondCellTranslations1[id])
              ),
              ...bond2Ids.map(id =>
                lnum.sub(bondCellTranslations1[id], bondCellTranslations2[id])
              )
            ]
            const displacementsAsym = relCellTranslations.map(
              (x, i) => lnum.add(x,
                lnum.sub(targetSiteFractCoords[i], siteFractCoords[i])
              )
            )
            for (let i = 0, n = targetAtomSiteLabels.length; i < n; i += 1) {
              const targetAtomSiteId = targetAtomSiteIds[i]
              const targetAtomSite = this.atomSites[targetAtomSiteId]
              const targetMapSSGInternalIdToEqvPosId =
                targetAtomSite.mapSSGInternalIdToEqvPosId
              const displacementAsym = displacementsAsym[i]
              const ssgIdAsym = internalSSGIds[i]
              const targetSSGIdAsym = targetInternalSSGIds[i]
              for (const [id, g] of ssgR.entries()) {
                const ssgId = ssgMultTableSymopIds[ssgMult * id + ssgIdAsym] - 1
                const targetSSGId =
                  ssgMultTableSymopIds[ssgMult * id + targetSSGIdAsym] - 1
                const eqvPosId = mapSSGInternalIdToEqvPosId[ssgId]
                const targetEqvPosId =
                  targetMapSSGInternalIdToEqvPosId[targetSSGId]
                const disp = lnum.mmul(g, displacementAsym)
                let dispId
                if (atomSiteDisplacements[eqvPosId].every((x, xId) => {
                  if (lnum.eq(disp, x)) {
                    dispId = xId
                    return false
                  }
                  return true
                })) {
                  dispId = atomSiteDisplacements[eqvPosId].length
                  atomSiteDisplacements[eqvPosId].push(disp)
                  atomSiteDisplacementTargetAtomSiteIds[eqvPosId]
                    .push(targetAtomSiteId)
                }
                const eqvPosBonds = atomSiteBonds[eqvPosId]
                if (eqvPosBonds.every(
                  (x, xId) =>
                    dispId !== x.displacementId ||
                    targetAtomSiteId !== x.targetAtomSiteId ||
                    targetEqvPosId !== x.targetEqvPosId
                )) {
                  eqvPosBonds.push({
                    displacementId: dispId,
                    targetAtomSiteId,
                    targetEqvPosId
                  })
                }
              }
            }
          }
          // prepare for vertices
          const atomSiteVertices = eqvPosFractCoords.map(x => [])
          {
            const vertexIds = vertexSiteLabels
              .map((label, id) => [label, id])
              .filter(([label]) => label === siteLabel)
              .map(([, id]) => id)
            const target1AtomSiteLabels =
              vertexIds.map(id => vertexSiteLabels1[id])
            const target1AtomSiteIds = target1AtomSiteLabels.map(
              label => this.atomSites
                .map((x, id) => [x.label, id])
                .filter(([xLabel]) => xLabel === label)
                .map(([, id]) => id)[0]
            )
            const internalSSGIds = vertexIds.map(id => vertexSymopIds[id] - 1)
            const target1InternalSSGIds =
              vertexIds.map(id => vertexSymopIds1[id] - 1)
            const siteFractCoords = internalSSGIds.map(
              id => eqvPosFractCoords[mapSSGInternalIdToEqvPosId[id]]
            )
            const target1SiteFractCoords = target1InternalSSGIds.map(
              (id, i) => {
                const targetAtomSite = this.atomSites[target1AtomSiteIds[i]]
                const targetMapSSGInternalIdToEqvPosId =
                  targetAtomSite.mapSSGInternalIdToEqvPosId
                const targetEqvPosFractCoords = targetAtomSite.eqvPosFractCoords
                return targetEqvPosFractCoords[
                  targetMapSSGInternalIdToEqvPosId[id]
                ]
              }
            )
            const relCellTranslations1 = vertexIds.map(id =>
              lnum.sub(vertexCellTranslations1[id], vertexCellTranslations[id])
            )
            const displacementsAsym1 = relCellTranslations1.map(
              (x, i) => lnum.add(x,
                lnum.sub(target1SiteFractCoords[i], siteFractCoords[i])
              )
            )
            for (let i = 0, n = vertexIds.length; i < n; i += 1) {
              const target1AtomSiteId = target1AtomSiteIds[i]
              const target1AtomSite = this.atomSites[target1AtomSiteId]
              const target1MapSSGInternalIdToEqvPosId =
                target1AtomSite.mapSSGInternalIdToEqvPosId
              const displacementAsym1 = displacementsAsym1[i]
              const ssgIdAsym = internalSSGIds[i]
              const target1SSGIdAsym = target1InternalSSGIds[i]
              for (const [id, g] of ssgR.entries()) {
                const ssgId = ssgMultTableSymopIds[ssgMult * id + ssgIdAsym] - 1
                const target1SSGId =
                  ssgMultTableSymopIds[ssgMult * id + target1SSGIdAsym] - 1
                const eqvPosId = mapSSGInternalIdToEqvPosId[ssgId]
                const target1EqvPosId =
                  target1MapSSGInternalIdToEqvPosId[target1SSGId]
                const disp1 = lnum.mmul(g, displacementAsym1)
                let dispId1
                if (atomSiteDisplacements[eqvPosId].every((x, xId) => {
                  if (lnum.eq(disp1, x)) {
                    dispId1 = xId
                    return false
                  }
                  return true
                })) {
                  dispId1 = atomSiteDisplacements[eqvPosId].length
                  atomSiteDisplacements[eqvPosId].push(disp1)
                  atomSiteDisplacementTargetAtomSiteIds[eqvPosId]
                    .push(target1AtomSiteId)
                }
                const eqvPosVertices = atomSiteVertices[eqvPosId]
                if (eqvPosVertices.every(
                  (x, xId) =>
                    dispId1 !== x.displacementId1 ||
                    target1AtomSiteId !== x.target1AtomSiteId ||
                    target1EqvPosId !== x.target1EqvPosId
                )) {
                  eqvPosVertices.push({
                    displacementId1: dispId1,
                    target1AtomSiteId,
                    target1EqvPosId
                  })
                }
              }
            }
          }
          // prepare for edges
          const atomSiteEdges = eqvPosFractCoords.map(x => [])
          {
            const edgeIds = edgeSiteLabels
              .map((label, id) => [label, id])
              .filter(([label]) => label === siteLabel)
              .map(([, id]) => id)
            const target1AtomSiteLabels = edgeIds.map(id => edgeSiteLabels1[id])
            const target2AtomSiteLabels = edgeIds.map(id => edgeSiteLabels2[id])
            const target1AtomSiteIds = target1AtomSiteLabels.map(
              label => this.atomSites
                .map((x, id) => [x.label, id])
                .filter(([xLabel]) => xLabel === label)
                .map(([, id]) => id)[0]
            )
            const target2AtomSiteIds = target2AtomSiteLabels.map(
              label => this.atomSites
                .map((x, id) => [x.label, id])
                .filter(([xLabel]) => xLabel === label)
                .map(([, id]) => id)[0]
            )
            const internalSSGIds = edgeIds.map(id => edgeSymopIds[id] - 1)
            const target1InternalSSGIds =
              edgeIds.map(id => edgeSymopIds1[id] - 1)
            const target2InternalSSGIds =
              edgeIds.map(id => edgeSymopIds2[id] - 1)
            const siteFractCoords = internalSSGIds.map(
              id => eqvPosFractCoords[mapSSGInternalIdToEqvPosId[id]]
            )
            const target1SiteFractCoords = target1InternalSSGIds.map(
              (id, i) => {
                const targetAtomSite = this.atomSites[target1AtomSiteIds[i]]
                const targetMapSSGInternalIdToEqvPosId =
                  targetAtomSite.mapSSGInternalIdToEqvPosId
                const targetEqvPosFractCoords = targetAtomSite.eqvPosFractCoords
                return targetEqvPosFractCoords[
                  targetMapSSGInternalIdToEqvPosId[id]
                ]
              }
            )
            const target2SiteFractCoords = target2InternalSSGIds.map(
              (id, i) => {
                const targetAtomSite = this.atomSites[target2AtomSiteIds[i]]
                const targetMapSSGInternalIdToEqvPosId =
                  targetAtomSite.mapSSGInternalIdToEqvPosId
                const targetEqvPosFractCoords = targetAtomSite.eqvPosFractCoords
                return targetEqvPosFractCoords[
                  targetMapSSGInternalIdToEqvPosId[id]
                ]
              }
            )
            const relCellTranslations1 = edgeIds.map(id =>
              lnum.sub(edgeCellTranslations1[id], edgeCellTranslations[id])
            )
            const relCellTranslations2 = edgeIds.map(id =>
              lnum.sub(edgeCellTranslations2[id], edgeCellTranslations[id])
            )
            const displacementsAsym1 = relCellTranslations1.map(
              (x, i) => lnum.add(x,
                lnum.sub(target1SiteFractCoords[i], siteFractCoords[i])
              )
            )
            const displacementsAsym2 = relCellTranslations2.map(
              (x, i) => lnum.add(x,
                lnum.sub(target2SiteFractCoords[i], siteFractCoords[i])
              )
            )
            for (let i = 0, n = edgeIds.length; i < n; i += 1) {
              const target1AtomSiteId = target1AtomSiteIds[i]
              const target2AtomSiteId = target2AtomSiteIds[i]
              const target1AtomSite = this.atomSites[target1AtomSiteId]
              const target2AtomSite = this.atomSites[target2AtomSiteId]
              const target1MapSSGInternalIdToEqvPosId =
                target1AtomSite.mapSSGInternalIdToEqvPosId
              const target2MapSSGInternalIdToEqvPosId =
                target2AtomSite.mapSSGInternalIdToEqvPosId
              const displacementAsym1 = displacementsAsym1[i]
              const displacementAsym2 = displacementsAsym2[i]
              const ssgIdAsym = internalSSGIds[i]
              const target1SSGIdAsym = target1InternalSSGIds[i]
              const target2SSGIdAsym = target2InternalSSGIds[i]
              for (const [id, g] of ssgR.entries()) {
                const ssgId = ssgMultTableSymopIds[ssgMult * id + ssgIdAsym] - 1
                const target1SSGId =
                  ssgMultTableSymopIds[ssgMult * id + target1SSGIdAsym] - 1
                const target2SSGId =
                  ssgMultTableSymopIds[ssgMult * id + target2SSGIdAsym] - 1
                const eqvPosId = mapSSGInternalIdToEqvPosId[ssgId]
                const target1EqvPosId =
                  target1MapSSGInternalIdToEqvPosId[target1SSGId]
                const target2EqvPosId =
                  target2MapSSGInternalIdToEqvPosId[target2SSGId]
                const disp1 = lnum.mmul(g, displacementAsym1)
                const disp2 = lnum.mmul(g, displacementAsym2)
                let dispId1
                if (atomSiteDisplacements[eqvPosId].every((x, xId) => {
                  if (lnum.eq(disp1, x)) {
                    dispId1 = xId
                    return false
                  }
                  return true
                })) {
                  dispId1 = atomSiteDisplacements[eqvPosId].length
                  atomSiteDisplacements[eqvPosId].push(disp1)
                  atomSiteDisplacementTargetAtomSiteIds[eqvPosId]
                    .push(target1AtomSiteId)
                }
                let dispId2
                if (atomSiteDisplacements[eqvPosId].every((x, xId) => {
                  if (lnum.eq(disp2, x)) {
                    dispId2 = xId
                    return false
                  }
                  return true
                })) {
                  dispId2 = atomSiteDisplacements[eqvPosId].length
                  atomSiteDisplacements[eqvPosId].push(disp2)
                  atomSiteDisplacementTargetAtomSiteIds[eqvPosId]
                    .push(target2AtomSiteId)
                }

                const eqvPosEdges = atomSiteEdges[eqvPosId]
                if (eqvPosEdges.every(
                  (x, xId) => (
                    dispId1 !== x.displacementId1 ||
                    target1AtomSiteId !== x.target1AtomSiteId ||
                    target1EqvPosId !== x.target1EqvPosId ||
                    dispId2 !== x.displacementId2 ||
                    target2AtomSiteId !== x.target2AtomSiteId ||
                    target2EqvPosId !== x.target2EqvPosId
                  ) && (
                    dispId2 !== x.displacementId1 ||
                    target2AtomSiteId !== x.target1AtomSiteId ||
                    target2EqvPosId !== x.target1EqvPosId ||
                    dispId1 !== x.displacementId2 ||
                    target1AtomSiteId !== x.target2AtomSiteId ||
                    target1EqvPosId !== x.target2EqvPosId
                  )
                )) {
                  eqvPosEdges.push({
                    displacementId1: dispId1,
                    displacementId2: dispId2,
                    target1AtomSiteId,
                    target2AtomSiteId,
                    target1EqvPosId,
                    target2EqvPosId
                  })
                }
              }
            }
          }
          // prepare for faces
          const atomSiteFaces = eqvPosFractCoords.map(x => [])
          {
            const faceIds = faceSiteLabels
              .map((label, id) => [label, id])
              .filter(([label]) => label === siteLabel)
              .map(([, id]) => id)
            const target1AtomSiteLabels = faceIds.map(id => faceSiteLabels1[id])
            const target2AtomSiteLabels = faceIds.map(id => faceSiteLabels2[id])
            const target3AtomSiteLabels = faceIds.map(id => faceSiteLabels3[id])
            const target1AtomSiteIds = target1AtomSiteLabels.map(
              label => this.atomSites
                .map((x, id) => [x.label, id])
                .filter(([xLabel]) => xLabel === label)
                .map(([, id]) => id)[0]
            )
            const target2AtomSiteIds = target2AtomSiteLabels.map(
              label => this.atomSites
                .map((x, id) => [x.label, id])
                .filter(([xLabel]) => xLabel === label)
                .map(([, id]) => id)[0]
            )
            const target3AtomSiteIds = target3AtomSiteLabels.map(
              label => this.atomSites
                .map((x, id) => [x.label, id])
                .filter(([xLabel]) => xLabel === label)
                .map(([, id]) => id)[0]
            )
            const internalSSGIds = faceIds.map(id => faceSymopIds[id] - 1)
            const target1InternalSSGIds =
              faceIds.map(id => faceSymopIds1[id] - 1)
            const target2InternalSSGIds =
              faceIds.map(id => faceSymopIds2[id] - 1)
            const target3InternalSSGIds =
              faceIds.map(id => faceSymopIds3[id] - 1)
            const siteFractCoords = internalSSGIds.map(
              id => eqvPosFractCoords[mapSSGInternalIdToEqvPosId[id]]
            )
            const target1SiteFractCoords = target1InternalSSGIds.map(
              (id, i) => {
                const targetAtomSite = this.atomSites[target1AtomSiteIds[i]]
                const targetMapSSGInternalIdToEqvPosId =
                  targetAtomSite.mapSSGInternalIdToEqvPosId
                const targetEqvPosFractCoords = targetAtomSite.eqvPosFractCoords
                return targetEqvPosFractCoords[
                  targetMapSSGInternalIdToEqvPosId[id]
                ]
              }
            )
            const target2SiteFractCoords = target2InternalSSGIds.map(
              (id, i) => {
                const targetAtomSite = this.atomSites[target2AtomSiteIds[i]]
                const targetMapSSGInternalIdToEqvPosId =
                  targetAtomSite.mapSSGInternalIdToEqvPosId
                const targetEqvPosFractCoords = targetAtomSite.eqvPosFractCoords
                return targetEqvPosFractCoords[
                  targetMapSSGInternalIdToEqvPosId[id]
                ]
              }
            )
            const target3SiteFractCoords = target3InternalSSGIds.map(
              (id, i) => {
                const targetAtomSite = this.atomSites[target3AtomSiteIds[i]]
                const targetMapSSGInternalIdToEqvPosId =
                  targetAtomSite.mapSSGInternalIdToEqvPosId
                const targetEqvPosFractCoords = targetAtomSite.eqvPosFractCoords
                return targetEqvPosFractCoords[
                  targetMapSSGInternalIdToEqvPosId[id]
                ]
              }
            )
            const relCellTranslations1 = faceIds.map(id =>
              lnum.sub(faceCellTranslations1[id], faceCellTranslations[id])
            )
            const relCellTranslations2 = faceIds.map(id =>
              lnum.sub(faceCellTranslations2[id], faceCellTranslations[id])
            )
            const relCellTranslations3 = faceIds.map(id =>
              lnum.sub(faceCellTranslations3[id], faceCellTranslations[id])
            )
            const displacementsAsym1 = relCellTranslations1.map(
              (x, i) => lnum.add(x,
                lnum.sub(target1SiteFractCoords[i], siteFractCoords[i])
              )
            )
            const displacementsAsym2 = relCellTranslations2.map(
              (x, i) => lnum.add(x,
                lnum.sub(target2SiteFractCoords[i], siteFractCoords[i])
              )
            )
            const displacementsAsym3 = relCellTranslations3.map(
              (x, i) => lnum.add(x,
                lnum.sub(target3SiteFractCoords[i], siteFractCoords[i])
              )
            )
            for (let i = 0, n = faceIds.length; i < n; i += 1) {
              const target1AtomSiteId = target1AtomSiteIds[i]
              const target2AtomSiteId = target2AtomSiteIds[i]
              const target3AtomSiteId = target3AtomSiteIds[i]
              const target1AtomSite = this.atomSites[target1AtomSiteId]
              const target2AtomSite = this.atomSites[target2AtomSiteId]
              const target3AtomSite = this.atomSites[target3AtomSiteId]
              const target1MapSSGInternalIdToEqvPosId =
                target1AtomSite.mapSSGInternalIdToEqvPosId
              const target2MapSSGInternalIdToEqvPosId =
                target2AtomSite.mapSSGInternalIdToEqvPosId
              const target3MapSSGInternalIdToEqvPosId =
                target3AtomSite.mapSSGInternalIdToEqvPosId
              const displacementAsym1 = displacementsAsym1[i]
              const displacementAsym2 = displacementsAsym2[i]
              const displacementAsym3 = displacementsAsym3[i]
              const ssgIdAsym = internalSSGIds[i]
              const target1SSGIdAsym = target1InternalSSGIds[i]
              const target2SSGIdAsym = target2InternalSSGIds[i]
              const target3SSGIdAsym = target3InternalSSGIds[i]
              for (const [id, g] of ssgR.entries()) {
                const ssgId = ssgMultTableSymopIds[ssgMult * id + ssgIdAsym] - 1
                const target1SSGId =
                  ssgMultTableSymopIds[ssgMult * id + target1SSGIdAsym] - 1
                const target2SSGId =
                  ssgMultTableSymopIds[ssgMult * id + target2SSGIdAsym] - 1
                const target3SSGId =
                  ssgMultTableSymopIds[ssgMult * id + target3SSGIdAsym] - 1
                const eqvPosId = mapSSGInternalIdToEqvPosId[ssgId]
                const target1EqvPosId =
                  target1MapSSGInternalIdToEqvPosId[target1SSGId]
                const target2EqvPosId =
                  target2MapSSGInternalIdToEqvPosId[target2SSGId]
                const target3EqvPosId =
                  target3MapSSGInternalIdToEqvPosId[target3SSGId]
                const disp1 = lnum.mmul(g, displacementAsym1)
                const disp2 = lnum.mmul(g, displacementAsym2)
                const disp3 = lnum.mmul(g, displacementAsym3)
                let dispId1
                if (atomSiteDisplacements[eqvPosId].every((x, xId) => {
                  if (lnum.eq(disp1, x)) {
                    dispId1 = xId
                    return false
                  }
                  return true
                })) {
                  dispId1 = atomSiteDisplacements[eqvPosId].length
                  atomSiteDisplacements[eqvPosId].push(disp1)
                  atomSiteDisplacementTargetAtomSiteIds[eqvPosId]
                    .push(target1AtomSiteId)
                }
                let dispId2
                if (atomSiteDisplacements[eqvPosId].every((x, xId) => {
                  if (lnum.eq(disp2, x)) {
                    dispId2 = xId
                    return false
                  }
                  return true
                })) {
                  dispId2 = atomSiteDisplacements[eqvPosId].length
                  atomSiteDisplacements[eqvPosId].push(disp2)
                  atomSiteDisplacementTargetAtomSiteIds[eqvPosId]
                    .push(target2AtomSiteId)
                }
                let dispId3
                if (atomSiteDisplacements[eqvPosId].every((x, xId) => {
                  if (lnum.eq(disp3, x)) {
                    dispId3 = xId
                    return false
                  }
                  return true
                })) {
                  dispId3 = atomSiteDisplacements[eqvPosId].length
                  atomSiteDisplacements[eqvPosId].push(disp3)
                  atomSiteDisplacementTargetAtomSiteIds[eqvPosId]
                    .push(target3AtomSiteId)
                }
                const eqvPosFaces = atomSiteFaces[eqvPosId]
                if (eqvPosFaces.every(
                  (x, xId) => (
                    dispId1 !== x.displacementId1 ||
                    target1AtomSiteId !== x.target1AtomSiteId ||
                    target1EqvPosId !== x.target1EqvPosId ||
                    dispId2 !== x.displacementId2 ||
                    target2AtomSiteId !== x.target2AtomSiteId ||
                    target2EqvPosId !== x.target2EqvPosId ||
                    dispId3 !== x.displacementId3 ||
                    target3AtomSiteId !== x.target3AtomSiteId ||
                    target3EqvPosId !== x.target3EqvPosId
                  ) && (
                    dispId2 !== x.displacementId1 ||
                    target2AtomSiteId !== x.target1AtomSiteId ||
                    target2EqvPosId !== x.target1EqvPosId ||
                    dispId3 !== x.displacementId2 ||
                    target3AtomSiteId !== x.target2AtomSiteId ||
                    target3EqvPosId !== x.target2EqvPosId ||
                    dispId1 !== x.displacementId3 ||
                    target1AtomSiteId !== x.target3AtomSiteId ||
                    target1EqvPosId !== x.target3EqvPosId
                  ) && (
                    dispId3 !== x.displacementId1 ||
                    target3AtomSiteId !== x.target1AtomSiteId ||
                    target3EqvPosId !== x.target1EqvPosId ||
                    dispId1 !== x.displacementId2 ||
                    target1AtomSiteId !== x.target2AtomSiteId ||
                    target1EqvPosId !== x.target2EqvPosId ||
                    dispId2 !== x.displacementId3 ||
                    target2AtomSiteId !== x.target3AtomSiteId ||
                    target2EqvPosId !== x.target3EqvPosId
                  ) && (
                    dispId1 !== x.displacementId1 ||
                    target1AtomSiteId !== x.target1AtomSiteId ||
                    target1EqvPosId !== x.target1EqvPosId ||
                    dispId3 !== x.displacementId2 ||
                    target3AtomSiteId !== x.target2AtomSiteId ||
                    target3EqvPosId !== x.target2EqvPosId ||
                    dispId2 !== x.displacementId3 ||
                    target2AtomSiteId !== x.target3AtomSiteId ||
                    target2EqvPosId !== x.target3EqvPosId
                  ) && (
                    dispId2 !== x.displacementId1 ||
                    target2AtomSiteId !== x.target1AtomSiteId ||
                    target2EqvPosId !== x.target1EqvPosId ||
                    dispId1 !== x.displacementId2 ||
                    target1AtomSiteId !== x.target2AtomSiteId ||
                    target1EqvPosId !== x.target2EqvPosId ||
                    dispId3 !== x.displacementId3 ||
                    target3AtomSiteId !== x.target3AtomSiteId ||
                    target3EqvPosId !== x.target3EqvPosId
                  ) && (
                    dispId3 !== x.displacementId1 ||
                    target3AtomSiteId !== x.target1AtomSiteId ||
                    target3EqvPosId !== x.target1EqvPosId ||
                    dispId2 !== x.displacementId2 ||
                    target2AtomSiteId !== x.target2AtomSiteId ||
                    target2EqvPosId !== x.target2EqvPosId ||
                    dispId1 !== x.displacementId3 ||
                    target1AtomSiteId !== x.target3AtomSiteId ||
                    target1EqvPosId !== x.target3EqvPosId
                  )
                )) {
                  eqvPosFaces.push({
                    displacementId1: dispId1,
                    displacementId2: dispId2,
                    displacementId3: dispId3,
                    target1AtomSiteId,
                    target2AtomSiteId,
                    target3AtomSiteId,
                    target1EqvPosId,
                    target2EqvPosId,
                    target3EqvPosId
                  })
                }
              }
            }
          }
          const eqvPositionsDisplacementData = []
          for (
            const [eqvPosId, eqvPosDisplacements]
            of atomSiteDisplacements.entries()
          ) {
            eqvPositionsDisplacementData.push({
              start: displacementData.length,
              targetAtomSiteIds:
                atomSiteDisplacementTargetAtomSiteIds[eqvPosId]
            })
            displacementData.push(...eqvPosDisplacements)
            maxEqvPosDispCount =
              Math.max(maxEqvPosDispCount, eqvPosDisplacements.length)
          }
          const eqvPositionsAsymBondData = []
          for (const [eqvPosId, eqvPosBonds] of atomSiteAsymBonds.entries()) {
            const offset = eqvPositionsDisplacementData[eqvPosId].start
            eqvPositionsAsymBondData.push({
              start: asymBondDispIdData.length,
              end: asymBondDispIdData.length + eqvPosBonds.length,
              dispIdOffset: offset,
              eqvPosBonds
            })
            asymBondDispIdData.push(...eqvPosBonds.map(
              x => [x.displacementId]
            ))
            asymBondDispGlobalIdData.push(...eqvPosBonds.map(
              x => [x.displacementId + offset]
            ))
          }
          const eqvPositionsBondData = []
          for (const [eqvPosId, eqvPosBonds] of atomSiteBonds.entries()) {
            const offset = eqvPositionsDisplacementData[eqvPosId].start
            eqvPositionsBondData.push({
              start: bondDispIdData.length,
              end: bondDispIdData.length + eqvPosBonds.length,
              dispIdOffset: offset,
              eqvPosBonds
            })
            bondDispIdData.push(...eqvPosBonds.map(
              x => [x.displacementId]
            ))
            bondDispGlobalIdData.push(...eqvPosBonds.map(
              x => [x.displacementId + offset]
            ))
          }
          const eqvPositionsVertexData = []
          for (const [eqvPosId, eqvPosVertices] of atomSiteVertices.entries()) {
            eqvPositionsVertexData.push({
              start: vertexDispIdData.length,
              end: vertexDispIdData.length + eqvPosVertices.length
            })
            vertexDispIdData.push(...eqvPosVertices.map(
              x => [x.displacementId1]
            ))
            const offset = eqvPositionsDisplacementData[eqvPosId].start
            vertexDispGlobalIdData.push(...eqvPosVertices.map(
              x => [x.displacementId1 + offset]
            ))
          }
          const eqvPositionsEdgeData = []
          for (const [eqvPosId, eqvPosEdges] of atomSiteEdges.entries()) {
            eqvPositionsEdgeData.push({
              start: edgeDispIdData.length,
              end: edgeDispIdData.length + eqvPosEdges.length
            })
            edgeDispIdData.push(...eqvPosEdges.map(
              x => [x.displacementId1, x.displacementId2]
            ))
            const offset = eqvPositionsDisplacementData[eqvPosId].start
            edgeDispGlobalIdData.push(...eqvPosEdges.map(
              x => [x.displacementId1 + offset, x.displacementId2 + offset]
            ))
          }
          const eqvPositionsFaceData = []
          for (const [eqvPosId, eqvPosFaces] of atomSiteFaces.entries()) {
            eqvPositionsFaceData.push({
              start: faceDispIdData.length,
              end: faceDispIdData.length + eqvPosFaces.length
            })
            faceDispIdData.push(...eqvPosFaces.map(
              x => [x.displacementId1, x.displacementId2, x.displacementId3]
            ))
            const offset = eqvPositionsDisplacementData[eqvPosId].start
            faceDispGlobalIdData.push(...eqvPosFaces.map(
              x => [
                x.displacementId1 + offset,
                x.displacementId2 + offset,
                x.displacementId3 + offset
              ]
            ))
          }
          atomSite.eqvPositionsDisplacementData = eqvPositionsDisplacementData
          atomSite.eqvPositionsAsymBondData = eqvPositionsAsymBondData
          atomSite.eqvPositionsBondData = eqvPositionsBondData
          atomSite.eqvPositionsVertexData = eqvPositionsVertexData
          atomSite.eqvPositionsEdgeData = eqvPositionsEdgeData
          atomSite.eqvPositionsFaceData = eqvPositionsFaceData
        }
        if (maxEqvPosDispCount > 255) {
          return NOT_READY
        }
        const gl = this.gl
        // tex cut
        {
          const width = CUT_TEXTURE_WIDTH
          const depth = maxEqvPosDispCount
          if (this.texCutDepth < depth) {
            gl.deleteTexture(this.tex.cut)
            const texCut = this.tex.cut = gl.createTexture()
            gl.activeTexture(gl.TEXTURE0 + CUT_TEXTURE_UNIT)
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, texCut)
            gl.texParameteri(
              gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST
            )
            gl.texParameteri(
              gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST
            )
            gl.texStorage3D(
              gl.TEXTURE_2D_ARRAY, 1, gl.R32UI, width, width, depth
            )
            this.texCutDepth = depth
          }
        }
        // vbo displacement
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.displacement)
          const size = displacementData.length *
            3 * // max perpendicular-space dimension
            4 // bytes per element
          if (this.vboDisplacementSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW)
            this.vboDisplacementSize = size
          }
          const arr = new Float32Array(size / 4)
          const baseOffset = 3
          for (const [i, disp] of displacementData.entries()) {
            const offset = i * baseOffset
            arr.set(lnum.ineg(lnum.mmul(aPerpCartn, disp)), offset)
          }
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr)
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        // vbo asym bond displacement
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.asymBondDisplacement)
          const size = asymBondDispIdData.length *
            7 * // 1 times (max superspace dimension + id)
            4 // bytes per element
          if (this.vboAsymBondDisplacementSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW)
            this.vboAsymBondDisplacementSize = size
          }
          const arr = new DataView(new ArrayBuffer(size))
          const ui8 = new Uint8Array(arr.buffer)
          const f32 = new Float32Array(arr.buffer)
          for (const [i, [id1]] of asymBondDispIdData.entries()) {
            const disp1 = displacementData[asymBondDispGlobalIdData[i][0]]
            ui8.set([id1], i * 28)
            f32.set(lnum.mmul(aParCartn, disp1), i * 7 + 1)
            f32.set(lnum.ineg(lnum.mmul(aPerpCartn, disp1)), i * 7 + 4)
          }
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr)
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        // vbo bond displacement
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.bondDisplacement)
          const size = bondDispIdData.length *
            7 * // 1 times (max superspace dimension + id)
            4 // bytes per element
          if (this.vboBondDisplacementSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW)
            this.vboBondDisplacementSize = size
          }
          const arr = new DataView(new ArrayBuffer(size))
          const ui8 = new Uint8Array(arr.buffer)
          const f32 = new Float32Array(arr.buffer)
          for (const [i, [id1]] of bondDispIdData.entries()) {
            const disp1 = displacementData[bondDispGlobalIdData[i][0]]
            ui8.set([id1], i * 28)
            f32.set(lnum.mmul(aParCartn, disp1), i * 7 + 1)
            f32.set(lnum.ineg(lnum.mmul(aPerpCartn, disp1)), i * 7 + 4)
          }
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr)
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        // vbo vertex displacement
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.vertexDisplacement)
          const size = vertexDispIdData.length *
            4 * // 1 times (max parallel-space dimension + id)
            4 // bytes per element
          if (this.vboVertexDisplacementSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW)
            this.vboVertexDisplacementSize = size
          }
          const arr = new DataView(new ArrayBuffer(size))
          const ui8 = new Uint8Array(arr.buffer)
          const f32 = new Float32Array(arr.buffer)
          for (const [i, [id1]] of vertexDispIdData.entries()) {
            const disp1 = displacementData[vertexDispGlobalIdData[i][0]]
            ui8.set([id1], i * 16)
            f32.set(lnum.mmul(aParCartn, disp1), i * 4 + 1)
          }
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr)
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        // vbo edge displacement
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.edgeDisplacement)
          const size = edgeDispIdData.length *
            8 * // 2 times (max parallel-space dimension + id)
            4 // bytes per element
          if (this.vboEdgeDisplacementSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW)
            this.vboEdgeDisplacementSize = size
          }
          const arr = new DataView(new ArrayBuffer(size))
          const ui8 = new Uint8Array(arr.buffer)
          const f32 = new Float32Array(arr.buffer)
          for (const [i, [id1, id2]] of edgeDispIdData.entries()) {
            const disp1 = displacementData[edgeDispGlobalIdData[i][0]]
            const disp2 = displacementData[edgeDispGlobalIdData[i][1]]
            ui8.set([id1], i * 32)
            f32.set(lnum.mmul(aParCartn, disp1), i * 8 + 1)
            ui8.set([id2], i * 32 + 16)
            f32.set(lnum.mmul(aParCartn, disp2), i * 8 + 5)
          }
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr)
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        // vbo face displacement
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.faceDisplacement)
          const size = faceDispIdData.length *
            12 * // 3 times (max parallel-space dimension + id)
            4 // byte per element
          if (this.vboFaceDisplacementSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW)
            this.vboFaceDisplacementSize = size
          }
          const arr = new DataView(new ArrayBuffer(size))
          const ui8 = new Uint8Array(arr.buffer)
          const f32 = new Float32Array(arr.buffer)
          for (const [i, [id1, id2, id3]] of faceDispIdData.entries()) {
            const disp1 = displacementData[faceDispGlobalIdData[i][0]]
            const disp2 = displacementData[faceDispGlobalIdData[i][1]]
            const disp3 = displacementData[faceDispGlobalIdData[i][2]]
            ui8.set([id1], i * 48)
            f32.set(lnum.mmul(aParCartn, disp1), i * 12 + 1)
            ui8.set([id2], i * 48 + 16)
            f32.set(lnum.mmul(aParCartn, disp2), i * 12 + 5)
            ui8.set([id3], i * 48 + 32)
            f32.set(lnum.mmul(aParCartn, disp3), i * 12 + 9)
          }
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr)
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        return this.requestId
      }
    )
    const updateODData = createSelector(
      [
        selectDimPerp,
        selectODSiteLabels,
        selectODAsymPolytopes,
        updateAtomSites
      ], (
        dimPerp,
        odSiteLabels,
        odAsymPolytopes,
        ...updates
      ) => {
        if (
          dimPerp === false ||
          !odSiteLabels ||
          !odAsymPolytopes ||
          updates.some(x => x === NOT_READY)
        ) {
          return NOT_READY
        }
        if (odSiteLabels.length > MAX_OD_COUNT) {
          return NOT_READY
        }
        const gl = this.gl
        const mapODIdToAtomSiteId = this.mapODIdToAtomSiteId =
          Array.from(odSiteLabels, () => -1)
        const atomSites = this.atomSites
        const odFragsAsym = []
        let odFragCount = 0
        let odFragCountSiteMax = 0
        for (let i = 0; i < atomSites.length; i += 1) {
          const atomSite = atomSites[i]
          const siteLabel = atomSite.label
          const siteSymOrder = atomSite.siteSymOrder
          const numEqvPositions = atomSite.numEqvPositions
          const odIds = odSiteLabels
            .map((label, id) => [label, id])
            .filter(([label]) => label === siteLabel)
            .map(([, id]) => id)
          for (const id of odIds) {
            mapODIdToAtomSiteId[id] = i
          }
          const odFragsAsymStart = odFragsAsym.length
          const polytopes = odIds.map(id => [id, odAsymPolytopes[id]])
          let rPerpCartnMax = 0
          for (const [id, polytope] of polytopes) {
            const simplexes = polytope.genSimplexes()
            for (const simplex of simplexes) {
              for (const v of simplex) {
                rPerpCartnMax = Math.max(rPerpCartnMax, lnum.abs(v))
              }
              odFragsAsym.push({ id, simplex })
            }
          }
          const odFragsAsymEnd = odFragsAsym.length
          const odFragsSiteAsym = {
            start: odFragsAsymStart,
            end: odFragsAsymEnd,
            num: odFragsAsymEnd - odFragsAsymStart
          }
          const odFragsStart = odFragCount
          const odFragCountSite = odFragsSiteAsym.num * siteSymOrder *
            numEqvPositions
          odFragCount += odFragCountSite
          odFragCountSiteMax = Math.max(odFragCountSiteMax, odFragCountSite)
          const odFragsSite = {
            start: odFragsStart,
            end: odFragCount,
            num: odFragCount - odFragsStart
          }
          // store
          atomSite.odFragsAsym = odFragsSiteAsym
          atomSite.odFrags = odFragsSite
          atomSite.rPerpCartnMax = rPerpCartnMax
        }
        if (odFragsAsym.length === 0) {
          return NOT_READY
        }
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.odFragAsym)
          const size =
            odFragsAsym.length * VBO_ODFRAG_ASYM_STRIDE[dimPerp]
          if (this.vboODFragAsymSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW)
            this.vboODFragAsymSize = size
          }
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.odFrag)
          const size = odFragCount * VBO_ODFRAG_STRIDE[dimPerp]
          if (this.vboODFragSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_COPY)
            this.vboODFragSize = size
          }
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.odInstance)
          const size =
            odFragCountSiteMax * NUM_ODFRAG_VIDS[dimPerp] * 11 * 4
          if (this.vboODInstanceSize < size) {
            gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_COPY)
            this.vboODInstanceSize = size
          }
          gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }
        // prepare OD fragments
        {
          const stride = VBO_ODFRAG_ASYM_STRIDE[dimPerp]
          const arr = new DataView(
            new ArrayBuffer(odFragsAsym.length * stride)
          )
          const view1 = new Uint16Array(arr.buffer)
          const view2 = dimPerp > 0 ? new Float32Array(arr.buffer, 4) : null
          switch (dimPerp) {
            case 0: {
              view1.set(odFragsAsym.map(odFrag => odFrag.id), 0)
              break
            }
            case 1: {
              for (let i = 0, n = odFragsAsym.length; i < n; i += 1) {
                const odFrag = odFragsAsym[i]
                view1.set([odFrag.id], i * 6)
                view2.set(odFrag.simplex[0], i * 3)
                view2.set(odFrag.simplex[1], i * 3 + 1)
              }
              break
            }
            case 2: {
              for (let i = 0, n = odFragsAsym.length; i < n; i += 1) {
                const odFrag = odFragsAsym[i]
                view1.set([odFrag.id], i * 14)
                view2.set(odFrag.simplex[0], i * 7)
                view2.set(odFrag.simplex[1], i * 7 + 2)
                view2.set(odFrag.simplex[2], i * 7 + 4)
              }
              break
            }
            case 3: {
              for (let i = 0, n = odFragsAsym.length; i < n; i += 1) {
                const odFrag = odFragsAsym[i]
                view1.set([odFrag.id], i * 26)
                view2.set(odFrag.simplex[0], i * 13)
                view2.set(odFrag.simplex[1], i * 13 + 3)
                view2.set(odFrag.simplex[2], i * 13 + 6)
                view2.set(odFrag.simplex[3], i * 13 + 9)
              }
              break
            }
            default: {
              throw Error(`Debug info: unsupported dimPerp: ${dimPerp}`)
            }
          }
          updateBuffer(gl, gl.ARRAY_BUFFER, this.vbo.odFragAsym, 0, arr)
          const vao = gl.createVertexArray()
          gl.bindVertexArray(vao)
          gl.useProgram(this.prg.prepODFrags[dimPerp])
          gl.enable(gl.RASTERIZER_DISCARD)
          gl.bindBufferBase(
            gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vbo.odFrag
          )
          gl.beginTransformFeedback(gl.POINTS)
          for (const atomSite of atomSites) {
            const siteSymOrder = atomSite.siteSymOrder
            const odFragsAsymStart = atomSite.odFragsAsym.start
            const numODFragsAsym = atomSite.odFragsAsym.num
            if (numODFragsAsym > 0) {
              for (let i = 0, n = atomSite.numEqvPositions; i < n; i += 1) {
                const siteSSGIdStart = atomSite.ssgIdStart + i * siteSymOrder
                const baseOffset = stride * odFragsAsymStart
                gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.odFragAsym)
                gl.enableVertexAttribArray(0)
                gl.vertexAttribIPointer(
                  0, 1, gl.UNSIGNED_SHORT, stride, baseOffset
                )
                if (dimPerp > 0) {
                  for (let j = 0; j <= dimPerp; j += 1) {
                    const index = j + 1
                    const offset = baseOffset + (1 + j * dimPerp) * 4
                    gl.enableVertexAttribArray(index)
                    gl.vertexAttribPointer(
                      index, dimPerp, gl.FLOAT, false, stride, offset
                    )
                  }
                }
                {
                  const index = dimPerp === 0 ? 1 : dimPerp + 2
                  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.siteSSGId)
                  gl.enableVertexAttribArray(index)
                  gl.vertexAttribDivisor(index, 1)
                  gl.vertexAttribIPointer(
                    index, 1, gl.UNSIGNED_BYTE, 1, siteSSGIdStart
                  )
                }
                gl.bindBuffer(gl.ARRAY_BUFFER, null)
                gl.drawArraysInstanced(
                  gl.POINTS, 0, numODFragsAsym, siteSymOrder
                )
              }
            }
          }
          gl.endTransformFeedback()
          gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
          gl.disable(gl.RASTERIZER_DISCARD)
          gl.useProgram(null)
          gl.bindVertexArray(null)
          gl.deleteVertexArray(vao)
        }
        // init vao
        for (const atomSite of atomSites) {
          // vao odfrags
          const odFragsStart = atomSite.odFrags.start
          const numODFragsAsym = atomSite.odFragsAsym.num
          const siteSymOrder = atomSite.siteSymOrder
          const numODFrags = numODFragsAsym * siteSymOrder
          for (let i = 0, n = atomSite.numEqvPositions; i < n; i += 1) {
            const odFragsStartI = odFragsStart + i * numODFrags
            if (atomSite.vaoGenODInstance[i]) {
              gl.deleteVertexArray(atomSite.vaoGenODInstance[i])
            }
            const vao = atomSite.vaoGenODInstance[i] = gl.createVertexArray()
            const stride = VBO_ODFRAG_STRIDE[dimPerp]
            const baseOffset = stride * odFragsStartI
            gl.bindVertexArray(vao)
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.odFragVId)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribIPointer(0, 1, gl.BYTE, 1, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.odFrag)
            gl.enableVertexAttribArray(1)
            gl.vertexAttribDivisor(1, 1)
            gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_INT, stride, baseOffset)
            if (dimPerp > 0) {
              const baseOffset2 =
                baseOffset + stride - dimPerp * (dimPerp + 1) * 4
              for (let j = 0; j <= dimPerp; j += 1) {
                const index = j + 2
                const offset = baseOffset2 + j * dimPerp * 4
                gl.enableVertexAttribArray(index)
                gl.vertexAttribDivisor(index, 1)
                gl.vertexAttribPointer(
                  index, dimPerp, gl.FLOAT, false, stride, offset
                )
              }
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
          }
        }
        gl.bindVertexArray(null)
        return this.requestId
      }
    )
    const updateVaoCut = createSelector(
      [
        selectDimPerp,
        updateAtomSites,
        updateDisplacements,
        updateODData
      ],
      (dimPerp, ...updates) => {
        if (
          dimPerp === false ||
          updates.some(x => x === NOT_READY)
        ) {
          return NOT_READY
        }
        const gl = this.gl
        const atomSites = this.atomSites
        for (const atomSite of atomSites) {
          // vao cut
          for (
            const [eqvPosId, eqvPosDispData]
            of atomSite.eqvPositionsDisplacementData.entries()
          ) {
            for (const vao of atomSite.eqvPositionsVaoCut[eqvPosId]) {
              gl.deleteVertexArray(vao)
            }
            atomSite.eqvPositionsVaoCut[eqvPosId] = []
            for (
              const [dispId, targetAtomSiteId]
              of eqvPosDispData.targetAtomSiteIds.entries()
            ) {
              const vao =
                atomSite.eqvPositionsVaoCut[eqvPosId][dispId] =
                gl.createVertexArray()
              const targetAtomSite = atomSites[targetAtomSiteId]
              const odFragsStart = targetAtomSite.odFrags.start
              const numODFragsAsym = targetAtomSite.odFragsAsym.num
              const siteSymOrder = targetAtomSite.siteSymOrder
              const numODFrags = numODFragsAsym * siteSymOrder
              const odFragsStartI = odFragsStart + eqvPosId * numODFrags
              gl.bindVertexArray(vao)
              gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.proj)
              gl.enableVertexAttribArray(0)
              gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 20)
              {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.displacement)
                gl.enableVertexAttribArray(1)
                gl.vertexAttribDivisor(1, numODFrags)
                const offset = 12 * (eqvPosDispData.start + dispId)
                gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 12, offset)
              }
              const stride = VBO_ODFRAG_STRIDE[dimPerp]
              const baseOffset = stride * odFragsStartI
              gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.odFrag)
              gl.enableVertexAttribArray(2)
              gl.vertexAttribDivisor(2, 1)
              gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_INT, stride, baseOffset)
              if (dimPerp > 0) {
                const baseOffset2 = baseOffset + 4
                for (let i = 0; i <= dimPerp; i += 1) {
                  const index = i + 3
                  const offset = baseOffset2 + i * dimPerp * 4
                  gl.enableVertexAttribArray(index)
                  gl.vertexAttribDivisor(index, 1)
                  gl.vertexAttribPointer(
                    index, dimPerp, gl.FLOAT, false, stride, offset
                  )
                }
              }
            }
          }
        }
        gl.bindVertexArray(null)
        return this.requestId
      }
    )
    const updateLattFractCoordGenerator = createSelector(
      [
        () => this.rCutParCartn,
        selectDimPerp,
        selectAParCartn,
        selectAPerpCartn,
        updateAtomSites,
        updateODData // for atomSite.rPerpCartnMax
      ],
      (rCutParCartn, dimPerp, aParCartn, aPerpCartn, ...updates) => {
        if (
          dimPerp === false ||
          !aParCartn ||
          !aPerpCartn ||
          updates.some(x => x === NOT_READY)
        ) {
          return NOT_READY
        }
        // ad hoc ...
        const mPar = lnum.sdiv(aParCartn, rCutParCartn)
        for (const atomSite of this.atomSites) {
          const rCutPerpCartn = atomSite.rPerpCartnMax
          if (rCutPerpCartn > 0 || dimPerp === 0) {
            const mPerp = lnum.sdiv(aPerpCartn, rCutPerpCartn)
            atomSite.lattFractCoordGenerator = xFractGenerator2(mPar, mPerp)
          }
        }
        return this.requestId
      }
    )
    const updateLattFractCoord = createSelector(
      [
        selectOFractPlusDelta,
        updateAtomSites,
        updateLattFractCoordGenerator
      ],
      (oFract, ...updates) => {
        if (!oFract || updates.some(x => x === NOT_READY)) {
          return NOT_READY
        }
        const dim = oFract.length
        const embed = [0, 0, 0, 0, 0, 0]
        for (const atomSite of this.atomSites) {
          const generator = atomSite.lattFractCoordGenerator
          for (let i = 0, n = atomSite.numEqvPositions; i < n; i += 1) {
            if (generator) {
              const siteFractCoord = atomSite.eqvPosFractCoords[i]
              const v = lnum.sub(siteFractCoord, oFract)
              const arr = []
              for (const lattFractCoord of generator(v)) {
                for (let j = 0; j < dim; j += 1) {
                  embed[j] = lattFractCoord[j]
                }
                arr.push(...embed)
              }
              atomSite.lattFractCoordCache[i] = arr
            } else {
              atomSite.lattFractCoordCache[i] = []
            }
          }
        }
        return this.requestId
      }
    )
    const detectUIUpdate = () =>
      this.ui.dragX ||
      this.ui.dragY ||
      this.ui.shiftDragX ||
      this.ui.shiftDragY ||
      this.ui.wheelDeltaY ||
      this.ui.shiftWheelDeltaY ||
      this.ui.ctrlWheelDeltaY ||
      // this.ui.doubleClicked ||
      this.ui.shiftDoubleClicked ||
      this.ui.ctrlShiftDoubleClicked ||
      this.ui.ctrlAltDoubleClicked
        ? this.requestId
        : false
    const updateUI = createSelector(
      [
        selectWidth,
        selectHeight,
        selectViewports,
        selectCurrentPosition,
        selectDragStartPosition,
        selectDimPar,
        selectDimPerp,
        selectAParCartn,
        selectAPerpCartn,
        selectBCartn,
        selectOFract,
        detectUIUpdate
      ],
      (
        width,
        height,
        viewports,
        currentPosition,
        dragStartPosition = currentPosition,
        dimPar,
        dimPerp,
        aParCartn,
        aPerpCartn,
        bCartn,
        oFract,
        uiUpdate
      ) => {
        if (
          this.lastUpdateFailed ||
          dimPar === false ||
          dimPerp === false ||
          !aParCartn ||
          !aPerpCartn ||
          !bCartn ||
          !oFract ||
          !uiUpdate
        ) {
          return NOT_READY
        }
        const dim = dimPar + dimPerp
        const currentViewport = viewports.filter(
          viewport =>
            currentPosition.x >= viewport.x &&
            currentPosition.x < viewport.x + viewport.width &&
            currentPosition.y >= viewport.y &&
            currentPosition.y < viewport.y + viewport.height
        )[0]
        const dragStartViewport = viewports.filter(
          viewport =>
            dragStartPosition.x >= viewport.x &&
            dragStartPosition.x < viewport.x + viewport.width &&
            dragStartPosition.y >= viewport.y &&
            dragStartPosition.y < viewport.y + viewport.height
        )[0]
        if (!currentViewport || !dragStartViewport) {
          return NOT_READY
        }
        const currentIsPerpendicular =
          ((currentViewport.data || {}).target || {}).isPerpendicular
        const currentCamera = currentIsPerpendicular
          ? this.cameraPerp
          : this.cameraPar
        const dragStartIsPerpendicular =
          ((dragStartViewport.data || {}).target || {}).isPerpendicular
        const dragStartCamera = dragStartIsPerpendicular
          ? this.cameraPerp
          : this.cameraPar
        if (currentViewport !== dragStartViewport) {
          this.ui.dragging = false
        }
        if (this.ui.dragX !== 0 || this.ui.dragY !== 0) {
          const movement = [this.ui.dragX, -this.ui.dragY, 0]
          const th = dragStartCamera.rotFactor * Math.hypot(...movement)
          const viewTrans = lnum.transpose(dragStartCamera.viewMat())
          const normal = lnum.$(...inormalise(cross3([0, 0, 1], movement)), 0)
          const ax = lnum.$(...lnum.mmul(viewTrans, normal).slice(0, 3))
          const v1 = lnum.sub(dragStartCamera.position, dragStartCamera.lookAt)
          const rot = rotateV3(-th, ax)
          const v2 = lnum.mmul(rot, v1)
          dragStartCamera.position = lnum.add(dragStartCamera.lookAt, v2)
          dragStartCamera.upDir = lnum.mmul(rot, dragStartCamera.upDir)
        }
        if (this.ui.wheelDeltaY !== 0) {
          const deltaY = this.ui.wheelDeltaY
          let v = lnum.sub(currentCamera.position, currentCamera.lookAt)
          const factor = Math.exp(currentCamera.zoomFactor * deltaY)
          const norm = Math.hypot(...v)
          const dist = Math.min(Math.max(norm * factor, currentCamera.distMin),
            currentCamera.distMax)
          v = lnum.ismul(inormalise(v), dist)
          currentCamera.position = lnum.add(currentCamera.lookAt, v)
        }
        if (
          this.ui.shiftDragX !== 0 ||
          this.ui.shiftDragY !== 0 ||
          this.ui.shiftWheelDeltaY !== 0
        ) {
          const factor = dragStartCamera.distance * dragStartCamera.moveFactor
          const movement = lnum.ismul([
            this.ui.shiftDragX,
            -this.ui.shiftDragY,
            this.ui.shiftWheelDeltaY,
            0
          ], factor)
          const viewTrans = lnum.transpose(dragStartCamera.viewMat())
          const v = lnum.mmul(viewTrans, movement).slice(0, 3)
          if (currentIsPerpendicular) {
            const vFract = lnum.mmul(
              bCartn,
              Array.from({ length: dimPar }, () => 0).concat(
                v.slice(0, dimPerp)
              )
            )
            if (!this.deltaOFract || this.deltaOFract.length !== dim) {
              this.deltaOFract = lnum.$(...Array.from({ length: dim }, () => 0))
              this.deltaOFractOffset =
                lnum.$(...Array.from({ length: dim }, () => 0))
            }
            const next = lnum.add(this.deltaOFract, vFract)
            const offset = next.map(x => Math.floor(x))
            this.deltaOFract = lnum.sub(next, offset)
            this.deltaOFractOffset = lnum.$(
              ...lnum.add(this.deltaOFractOffset, offset).map(x => x & ~0)
            ).setDim(dim)
          } else {
            const vFract = lnum.mmul(
              bCartn,
              v.slice(0, dimPar).concat(
                Array.from({ length: dimPerp }, () => 0)
              )
            )
            if (!this.deltaOFract || this.deltaOFract.length !== dim) {
              this.deltaOFract = lnum.$(...Array.from({ length: dim }, () => 0))
              this.deltaOFractOffset =
                lnum.$(...Array.from({ length: dim }, () => 0))
            }
            const next = lnum.sub(this.deltaOFract, vFract)
            const offset = next.map(x => Math.floor(x))
            this.deltaOFract = lnum.sub(next, offset)
            this.deltaOFractOffset = lnum.$(
              ...lnum.add(this.deltaOFractOffset, offset).map(x => x & ~0)
            ).setDim(dim)
          }
        }
        if (this.ui.ctrlWheelDeltaY !== 0) {
          const factor = Math.exp(
            -currentCamera.zoomFactor * this.ui.ctrlWheelDeltaY
          )
          this.rCutParCartn = Math.max(
            this.rCutParCartnMin,
            Math.min(this.rCutParCartnMax, this.rCutParCartn * factor)
          )
        }
        if (
          this.ui.shiftDoubleClicked ||
          this.ui.ctrlShiftDoubleClicked ||
          this.ui.ctrlAltDoubleClicked
        ) {
          this.readBackInfo(true)
        }
        if (this.lastInfo) {
          if (this.ui.shiftDoubleClicked) {
            if (this.lastInfo.typeId === TYPEID_NONE) {
              const vFract = Array.from(
                { length: dim }, () => (Math.random() - 0.5) * 1e-3
              )
              if (!this.deltaOFract || this.deltaOFract.length !== dim) {
                this.deltaOFract =
                  lnum.$(...Array.from({ length: dim }, () => 0))
                this.deltaOFractOffset =
                  lnum.$(...Array.from({ length: dim }, () => 0))
              }
              const next = lnum.add(this.deltaOFract, vFract)
              const offset = next.map(x => Math.floor(x))
              this.deltaOFract = lnum.sub(next, offset)
              this.deltaOFractOffset = lnum.$(
                ...lnum.add(this.deltaOFractOffset, offset).map(x => x & ~0)
              ).setDim(dim)
            } else if (
              this.lastInfo.typeId === TYPEID_ATOM &&
              this.lastInfo.odLabel &&
              Number.isInteger(this.mapODIdToAtomSiteId[this.lastInfo.odId]) &&
              this.mapODIdToAtomSiteId[this.lastInfo.odId] >= 0
            ) {
              const atomSiteId = this.mapODIdToAtomSiteId[this.lastInfo.odId]
              const atomSite = this.atomSites[atomSiteId]
              const eqvPosId =
                atomSite.mapSSGInternalIdToEqvPosId[this.lastInfo.ssgInternalId]
              const siteFractCoord = atomSite.eqvPosFractCoords[eqvPosId]
              const lattFractCoord = this.lastInfo.lattFractCoord
              if (!this.deltaOFract || this.deltaOFract.length !== dim) {
                this.deltaOFract =
                  lnum.$(...Array.from({ length: dim }, () => 0))
                this.deltaOFractOffset =
                  lnum.$(...Array.from({ length: dim }, () => 0))
              }
              const v = lnum.isub(
                lnum.add(lattFractCoord.slice(0, dim), siteFractCoord),
                lnum.add(
                  lnum.add(oFract, this.deltaOFract), this.deltaOFractOffset
                )
              )
              let vFract
              if (currentIsPerpendicular) {
                const vPerpCartn = lnum.mmul(aPerpCartn, v)
                vFract = lnum.mmul(
                  bCartn,
                  Array.from({ length: dimPar }, () => 0).concat(vPerpCartn)
                )
              } else {
                const vParCartn = lnum.mmul(aParCartn, v)
                vFract = lnum.mmul(
                  bCartn,
                  vParCartn.concat(Array.from({ length: dimPerp }, () => 0))
                )
              }
              const next = lnum.add(this.deltaOFract, vFract)
              const offset = next.map(x => Math.floor(x))
              this.deltaOFract = lnum.sub(next, offset)
              this.deltaOFractOffset = lnum.$(
                ...lnum.add(this.deltaOFractOffset, offset).map(x => x & ~0)
              ).setDim(dim)
            }
          }
          if (this.ui.ctrlShiftDoubleClicked) {
            switch (this.lastInfo.typeId) {
              case TYPEID_NONE: {
                this.highlightMask = {
                  type: false,
                  od: false,
                  ssg: false,
                  latt: false
                }
                break
              }
              case TYPEID_OD: {
                this.highlightMask = {
                  ...this.highlightMask,
                  type: true,
                  od: true,
                  ssg: true
                }
                this.highlightRef = {
                  typeId: this.lastInfo.typeId,
                  type: this.lastInfo.type,
                  odId: this.lastInfo.odId,
                  odLabel: this.lastInfo.odLabel,
                  ssgId: this.lastInfo.ssgId,
                  lattFractCoord: this.lastInfo.lattFractCoord
                }
                break
              }
              case TYPEID_ATOM: {
                this.highlightMask = {
                  ...this.highlightMask,
                  type: true,
                  od: true,
                  ssg: true,
                  latt: true
                }
                this.highlightRef = {
                  typeId: this.lastInfo.typeId,
                  type: this.lastInfo.type,
                  odId: this.lastInfo.odId,
                  odLabel: this.lastInfo.odLabel,
                  ssgId: this.lastInfo.ssgId,
                  lattFractCoord: this.lastInfo.lattFractCoord
                }
                break
              }
            }
          }
          if (this.ui.ctrlAltDoubleClicked) {
            const setAt = [
              (currentViewport.x + currentViewport.width / 2) / width,
              1 - (currentViewport.y + currentViewport.height / 2) / height
            ]
            if (currentIsPerpendicular) {
              const data = { target: { isPerpendicular: false } }
              this.store.dispatch(this.overlayPanelSetData(setAt, data))
            } else {
              switch (this.lastInfo.typeId) {
                case TYPEID_ATOM: {
                  const atomSiteId =
                    this.mapODIdToAtomSiteId[this.lastInfo.odId]
                  const atomSite = this.atomSites[atomSiteId]
                  const eqvPosId = atomSite
                    .mapSSGInternalIdToEqvPosId[this.lastInfo.ssgInternalId]
                  const data = {
                    target: {
                      isPerpendicular: true,
                      atomSiteId,
                      eqvPosId
                    }
                  }
                  this.store.dispatch(this.overlayPanelSetData(setAt, data))
                }
              }
            }
          }
        }
        return this.requestId
      }
    )
    const updateCanvas = createSelector(
      [
        selectViewports,
        selectCurrentPosition,
        selectDimPerp,
        selectODLabels,
        () => this.ui.showAtoms,
        () => this.ui.showAsymBonds,
        () => this.ui.showBonds,
        () => this.ui.showVertices,
        () => this.ui.showEdges,
        () => this.ui.showFaces,
        () => this.ui.showODs,
        detectUIUpdate,
        updateEnvironmentUniform,
        updateHighlightUniform,
        updateCartnTransformUniform,
        updateSSGTexture,
        updateODColourRadiusTexture,
        updateAtomSites,
        updateDisplacements,
        updateODData,
        updateVaoCut,
        updateLattFractCoord,
        () => this.cameraPar.orthographic
      ],
      (
        viewports,
        currentPosition,
        dimPerp,
        odLabels,
        showAtoms,
        showAsymBonds,
        showBonds,
        showVertices,
        showEdges,
        showFaces,
        showODs,
        uiUpdate,
        ...updates
      ) => {
        if (
          dimPerp === false ||
          !odLabels ||
          updates.some(x => x === NOT_READY)
        ) {
          return NOT_READY
        }
        // console.warn('bbb', odLabels.length, updates)
        const gl = this.gl
        this.clearMainFramebuffer()
        this.clearInfoFramebuffer()

        const viewportsPar = viewports.filter(
          viewport => !((viewport.data || {}).target || {}).isPerpendicular
        )
        for (const [atomSiteId, atomSite] of this.atomSites.entries()) {
          for (
            let eqvPosId = 0; eqvPosId < atomSite.numEqvPositions; eqvPosId += 1
          ) {
            const numAtoms = atomSite.lattFractCoordCache[eqvPosId].length / 6
            const numODFrags = atomSite.odFragsAsym.num * atomSite.siteSymOrder
            const viewportsPerp = viewports.filter(
              viewport => {
                const target = (viewport.data || {}).target || {}
                return target.atomSiteId === atomSiteId &&
                  target.eqvPosId === eqvPosId
              }
            )
            if (showODs) {
              this.genODInstances(dimPerp, atomSiteId, eqvPosId)
            }
            if (viewportsPar.length > 0 || viewportsPerp.length > 0) {
              if (
                showAtoms ||
                showAsymBonds ||
                showBonds ||
                showVertices ||
                showEdges ||
                showFaces
              ) {
                this.projAndCut(dimPerp, atomSiteId, eqvPosId)
              }
              for (const viewport of viewportsPar) {
                // draw external space
                if (showAtoms) {
                  this.drawAtoms(
                    viewport, false, this.vao.drawAtomsPar, numAtoms
                  )
                  this.drawAtomsInfo(
                    viewport,
                    currentPosition,
                    false,
                    this.vao.drawAtomsInfoPar,
                    numAtoms
                  )
                }
              }
              if (
                showAsymBonds ||
                showBonds ||
                showVertices ||
                showEdges ||
                showFaces
              ) {
                this.prepareDisplacements(dimPerp, atomSiteId, eqvPosId)
              }
              if (showAsymBonds) {
                const bondData = atomSite.eqvPositionsAsymBondData[eqvPosId]
                for (let i = bondData.start; i < bondData.end; i += 1) {
                  this.maskAsymBonds(dimPerp, atomSiteId, eqvPosId, i)
                  for (const viewport of viewportsPar) {
                    this.drawHalfBonds(
                      viewport, this.vao.drawHalfBonds, numAtoms
                    )
                    this.drawHalfBondsInfo(
                      viewport,
                      currentPosition,
                      this.vao.drawHalfBondsInfo,
                      numAtoms
                    )
                  }
                }
              }
              if (showBonds) {
                const bondData = atomSite.eqvPositionsBondData[eqvPosId]
                for (let i = bondData.start; i < bondData.end; i += 1) {
                  this.maskBonds(dimPerp, atomSiteId, eqvPosId, i)
                  for (const viewport of viewportsPar) {
                    this.drawHalfBonds(
                      viewport, this.vao.drawHalfBonds, numAtoms
                    )
                    this.drawHalfBondsInfo(
                      viewport,
                      currentPosition,
                      this.vao.drawHalfBondsInfo,
                      numAtoms
                    )
                  }
                }
              }
              if (showVertices) {
                const vertexData = atomSite.eqvPositionsVertexData[eqvPosId]
                for (let i = vertexData.start; i < vertexData.end; i += 1) {
                  this.maskVertices(dimPerp, atomSiteId, eqvPosId, i)
                  for (const viewport of viewportsPar) {
                    this.drawVertices(viewport, this.vao.drawVertices, numAtoms)
                    this.drawVerticesInfo(
                      viewport,
                      currentPosition,
                      this.vao.drawVerticesInfo,
                      numAtoms
                    )
                  }
                }
              }
              if (showEdges) {
                const edgeData = atomSite.eqvPositionsEdgeData[eqvPosId]
                for (let i = edgeData.start; i < edgeData.end; i += 1) {
                  this.maskEdges(dimPerp, atomSiteId, eqvPosId, i)
                  for (const viewport of viewportsPar) {
                    this.drawEdges(viewport, this.vao.drawEdges, numAtoms)
                    this.drawEdgesInfo(
                      viewport,
                      currentPosition,
                      this.vao.drawEdgesInfo,
                      numAtoms
                    )
                  }
                }
              }
              if (showFaces) {
                const faceData = atomSite.eqvPositionsFaceData[eqvPosId]
                for (let i = faceData.start; i < faceData.end; i += 1) {
                  this.maskFaces(dimPerp, atomSiteId, eqvPosId, i)
                  for (const viewport of viewportsPar) {
                    this.drawFaces(viewport, this.vao.drawFaces, numAtoms)
                    this.drawFacesInfo(
                      viewport,
                      currentPosition,
                      this.vao.drawFacesInfo,
                      numAtoms
                    )
                  }
                }
              }
              for (const viewport of viewportsPerp) {
                // draw internal space
                if (showAtoms) {
                  this.drawAtoms(
                    viewport, true, this.vao.drawAtomsPerp, numAtoms
                  )
                  this.drawAtomsInfo(
                    viewport,
                    currentPosition,
                    true,
                    this.vao.drawAtomsInfoPerp,
                    numAtoms
                  )
                }
                if (showODs) {
                  this.drawODFrags(
                    dimPerp,
                    viewport,
                    this.vao.drawODFrags,
                    numODFrags
                  )
                  this.drawODFragsInfo(
                    dimPerp,
                    viewport,
                    currentPosition,
                    this.vao.drawODFragsInfo,
                    numODFrags
                  )
                }
              }
            }
            if (showAsymBonds && showODs) {
              const bondData = atomSite.eqvPositionsAsymBondData[eqvPosId]
              const dispIdOffset = bondData.dispIdOffset
              for (
                const { displacementId, targetAtomSiteId, targetEqvPosId }
                of bondData.eqvPosBonds
              ) {
                const dispId = displacementId + dispIdOffset
                const targetViewports = viewports.filter(
                  viewport => {
                    const target = (viewport.data || {}).target || {}
                    return target.atomSiteId === targetAtomSiteId &&
                      target.eqvPosId === targetEqvPosId
                  }
                )
                for (const viewport of targetViewports) {
                  this.drawODFrags(
                    dimPerp,
                    viewport,
                    this.vao.drawODFrags,
                    numODFrags,
                    dispId
                  )
                  this.drawODFragsInfo(
                    dimPerp,
                    viewport,
                    currentPosition,
                    this.vao.drawODFragsInfo,
                    numODFrags,
                    dispId
                  )
                }
              }
            }
          }
        }
        // copy info
        if (!this.sync.info) {
          gl.readPixels(0, 0, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, 0)
          this.sync.info = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
          this.infoODLabels = odLabels
        }
        // require if gl.SAMPLE_ALPHA_TO_COVERAGE is used
        this.resetAlpha()
        return this.requestId
      }
    )
    this.update = () => {
      const gl = this.gl
      if (
        !this.sync.info ||
        gl.clientWaitSync(this.sync.info, 0, 0) === gl.ALREADY_SIGNALED
      ) {
        this.readBackInfo()
        if (this.lastContext) {
          updateUI({ ...this.lastContext })
        }
        this.lastContext = { state: this.store.getState() }
        this.lastUpdateFailed = updateCanvas(this.lastContext) === NOT_READY
        this.resetTemporaryUIInfo()
        this.requestId = window.requestAnimationFrame(this.update)
        const prev = this.prev
        const now = window.performance.now()
        const diff = (now - prev) / 1000
        this.frameCount += 1
        if (diff >= 1) {
          const fps = Math.floor(this.frameCount / diff)
          this.prev = now
          this.frameCount = 0
          if (this.subscribers.fps) {
            this.subscribers.fps(fps)
          }
        }
      } else {
        this.requestId = window.requestAnimationFrame(this.update)
      }
    }
  }

  finaliseUpdater () {
    const gl = this.gl
    this.update = null
    for (const atomSite of this.atomSites) {
      for (const vao of atomSite.vaoGenODInstance) {
        if (vao) {
          gl.deleteVertexArray(vao)
        }
      }
      for (const vao of atomSite.vaoProj) {
        if (vao) {
          gl.deleteVertexArray(vao)
        }
      }
      for (const eqvPosVaoCut of atomSite.eqvPositionsVaoCut) {
        for (const vao of eqvPosVaoCut) {
          if (vao) {
            gl.deleteVertexArray(vao)
          }
        }
      }
    }
  }

  clearMainFramebuffer () {
    const gl = this.gl
    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1.0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  }

  clearInfoFramebuffer () {
    const gl = this.gl
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo.info)
    gl.clearBufferuiv(gl.COLOR, 0, CLEAR_INFO)
    gl.clearBufferfv(gl.DEPTH, 0, [1.0])
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
  }

  resetAlpha () {
    const gl = this.gl
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    gl.useProgram(this.prg.fillBGWhite)
    gl.viewport(0, 0, width, height)
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
  }

  readBackInfo (sync = false) {
    const gl = this.gl
    if (
      this.sync.info &&
      (
        sync ||
        gl.clientWaitSync(this.sync.info, 0, 0) === gl.ALREADY_SIGNALED
      )
    ) {
      gl.deleteSync(this.sync.info)
      this.sync.info = null
      const info = new Uint32Array(4)
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, info)
      const odLabels = this.infoODLabels
      const typeId = info[0]
      const type = TYPE_TEXT[info[0]]
      const odId = info[1] >>> SSGID_BIT_LENGTH
      const odLabel = odId !== INVALID_ODID ? odLabels[odId] : ''
      const ssgInternalId = info[1] % MAX_SSG_COUNT
      const ssgId = ssgInternalId + 1
      const lattFractCoordId = [info[2], info[3]]
      const offset = this.deltaOFractOffset
        ? [0, 0, 0, 0, 0, 0].map(
          (x, i) => i < this.deltaOFractOffset.length
            ? this.deltaOFractOffset[i]
            : x
        )
        : [0, 0, 0, 0, 0, 0]
      let lattFractCoord = [
        (info[2] >>> 24 & 255) - 128,
        (info[2] >>> 16 & 255) - 128,
        (info[2] >>> 8 & 255) - 128,
        (info[2] & 255) - 128,
        (info[3] >>> 24 & 255) - 128,
        (info[3] >>> 16 & 255) - 128
      ]
      if (lattFractCoord[0] === -128) {
        lattFractCoord = null
      } else {
        lattFractCoord = lattFractCoord.map((x, i) => x + offset[i])
      }
      this.lastInfo = {
        typeId,
        odId,
        ssgInternalId,
        lattFractCoordId,
        type,
        odLabel,
        ssgId,
        lattFractCoord
      }
      if (this.subscribers.infoString) {
        this.subscribers.infoString({
          type,
          odLabel: odLabel || '.',
          ssgId: ssgId.toString(),
          lattFractCoord: lattFractCoord === null
            ? '.'
            : lnum.$(...lattFractCoord).toString()
        })
      }
    }
  }

  genODInstances (dimPerp, atomSiteId, eqvPosId) {
    const atomSite = this.atomSites[atomSiteId]
    const numODFrags = atomSite.odFragsAsym.num * atomSite.siteSymOrder
    if (numODFrags <= 0) {
      return
    }
    const vao = atomSite.vaoGenODInstance[eqvPosId]
    const vbo = this.vbo.odInstance
    const gl = this.gl
    const prg = this.prg.genODInstances[dimPerp]
    gl.useProgram(prg)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(vao)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, vbo)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArraysInstanced(
      gl.POINTS, ODFRAG_VID_START[dimPerp], NUM_ODFRAG_VIDS[dimPerp], numODFrags
    )
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.bindVertexArray(null)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.useProgram(null)
  }

  projAndCut (dimPerp, atomSiteId, eqvPosId) {
    const atomSite = this.atomSites[atomSiteId]
    const numODFrags = atomSite.odFragsAsym.num * atomSite.siteSymOrder
    if (numODFrags <= 0) {
      return
    }
    const numLattFractCoords = atomSite.lattFractCoordCache[eqvPosId].length / 6
    if (numLattFractCoords <= 0) {
      return
    }
    const gl = this.gl
    // proj
    updateBuffer(
      gl, gl.ARRAY_BUFFER, this.vbo.lattFractCoord, 0,
      new Int8Array(atomSite.lattFractCoordCache[eqvPosId])
    )
    gl.useProgram(this.prg.proj)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(atomSite.vaoProj[eqvPosId])
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vbo.proj)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArraysInstanced(gl.POINTS, 0, numLattFractCoords, 1)
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.disable(gl.RASTERIZER_DISCARD)
    // cut
    gl.useProgram(this.prg.cut[dimPerp])
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbTex.cut)
    gl.framebufferTextureLayer(
      gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.tex.cut, 0, 0
    )
    gl.viewport(0, 0, CUT_TEXTURE_WIDTH, CUT_TEXTURE_WIDTH)
    gl.clearBufferuiv(gl.COLOR, 0, [INVALID_ODID << SSGID_BIT_LENGTH, 0, 0, 0])
    gl.bindVertexArray(atomSite.eqvPositionsVaoCut[eqvPosId][0])
    gl.drawArraysInstanced(gl.POINTS, 0, numLattFractCoords, numODFrags)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    // colour atoms
    gl.useProgram(this.prg.colourAtoms)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(this.vao.colourAtoms)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vbo.atom)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArrays(gl.POINTS, 0, numLattFractCoords)
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  prepareDisplacements (dimPerp, atomSiteId, eqvPosId) {
    const gl = this.gl
    const atomSite = this.atomSites[atomSiteId]
    const numLattFractCoords = atomSite.lattFractCoordCache[eqvPosId].length / 6
    if (numLattFractCoords <= 0) {
      return
    }
    gl.useProgram(this.prg.cut[dimPerp])
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbTex.cut)
    gl.viewport(0, 0, CUT_TEXTURE_WIDTH, CUT_TEXTURE_WIDTH)
    for (
      const [dispId, targetAtomSiteId]
      of atomSite.eqvPositionsDisplacementData[eqvPosId]
        .targetAtomSiteIds.entries()
    ) {
      if (dispId === 0) {
        // dispId === 0 is for 'no displacement'
        continue
      }
      const targetAtomSite = this.atomSites[targetAtomSiteId]
      const numODFrags = targetAtomSite.odFragsAsym.num *
        targetAtomSite.siteSymOrder
      gl.framebufferTextureLayer(
        gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.tex.cut, 0, dispId
      )
      gl.clearBufferuiv(
        gl.COLOR, 0, [INVALID_ODID << SSGID_BIT_LENGTH, 0, 0, 0]
      )
      if (numODFrags > 0) {
        gl.bindVertexArray(atomSite.eqvPositionsVaoCut[eqvPosId][dispId])
        gl.drawArraysInstanced(gl.POINTS, 0, numLattFractCoords, numODFrags)
      }
    }
    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  // only perp
  drawODFrags (dimPerp, viewport, vao, numODFrags, dispId = 0) {
    if (numODFrags <= 0) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawODFrags[dimPerp]
    // ad hoc ...
    const camera = this.cameraPerp
    const vmat = camera.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat = camera.projectionMat(...clientSize)
    // ... ad hoc
    gl.useProgram(prg)
    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.displacement)
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 12, dispId * 12)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    // ad hoc ...
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.8)
    // ... ad hoc
    if (dimPerp === 3) {
      gl.enable(gl.CULL_FACE)
    } else if (dimPerp === 1) {
      gl.lineWidth(5.0)
    }
    gl.drawArraysInstanced(
      gl[DRAW_ODFRAG_MODE[dimPerp]], 0, NUM_ODFRAG_VIDS[dimPerp] * numODFrags, 1
    )
    if (dimPerp === 3) {
      gl.disable(gl.CULL_FACE)
    }
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  // only perp
  drawODFragsInfo (
    dimPerp, viewport, infoPosition, vao, numODFrags, dispId = 0
  ) {
    if (
      numODFrags <= 0 ||
      infoPosition.x < viewport.x ||
      infoPosition.x >= viewport.x + viewport.width ||
      infoPosition.y < viewport.y ||
      infoPosition.y >= viewport.y + viewport.height
    ) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawODFragsInfo
    // ad hoc ...
    const camera = this.cameraPerp
    const vmat = camera.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat0 = camera.projectionMat(...clientSize)
    const pmat = lnum.mmul(
      lnum.$(
        viewport.width, 0, 0,
        (viewport.width - 2 * (infoPosition.x - viewport.x) - 1),
        0, viewport.height, 0,
        (viewport.height - 2 * (infoPosition.y - viewport.y) - 1),
        0, 0, 1, 0,
        0, 0, 0, 1
      ).setDim(4, 4),
      pmat0
    )
    // ... ad hoc
    gl.useProgram(prg)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo.info)
    gl.viewport(0, 0, 1, 1)
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.displacement)
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 12, dispId * 12)
    gl.enable(gl.DEPTH_TEST)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    if (dimPerp === 3) {
      gl.enable(gl.CULL_FACE)
    } else if (dimPerp === 1) {
      gl.lineWidth(5.0)
    }
    gl.drawArraysInstanced(
      gl[DRAW_ODFRAG_MODE[dimPerp]], 0, NUM_ODFRAG_VIDS[dimPerp] * numODFrags, 1
    )
    if (dimPerp === 3) {
      gl.disable(gl.CULL_FACE)
    }
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  drawAtoms (viewport, isPerpendicular, vao, numAtoms) {
    if (numAtoms <= 0) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawAtoms
    // ad hoc ...
    const camera = isPerpendicular ? this.cameraPerp : this.cameraPar
    const vmat = camera.viewMat()
    const vmatPerp = isPerpendicular ? vmat : this.cameraPerp.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat = camera.projectionMat(...clientSize)
    // ... ad hoc
    gl.useProgram(prg)
    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
    gl.bindVertexArray(vao)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.enable(gl.CULL_FACE)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmatPerp'), false, new Float32Array(vmatPerp)
    )
    // ad hoc ...
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.5)
    // ... ad hoc
    gl.drawElementsInstanced(
      gl.TRIANGLE_STRIP, this.vCountSphere, gl.UNSIGNED_INT, 0, numAtoms
    )
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  drawAtomsInfo (viewport, infoPosition, isPerpendicular, vao, numAtoms) {
    if (
      numAtoms <= 0 ||
      infoPosition.x < viewport.x ||
      infoPosition.x >= viewport.x + viewport.width ||
      infoPosition.y < viewport.y ||
      infoPosition.y >= viewport.y + viewport.height
    ) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawAtomsInfo
    // ad hoc ...
    const camera = isPerpendicular ? this.cameraPerp : this.cameraPar
    const vmat = camera.viewMat()
    const vmatPerp = isPerpendicular ? vmat : this.cameraPerp.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat0 = camera.projectionMat(...clientSize)
    const pmat = lnum.mmul(
      lnum.$(
        viewport.width, 0, 0,
        (viewport.width - 2 * (infoPosition.x - viewport.x) - 1),
        0, viewport.height, 0,
        (viewport.height - 2 * (infoPosition.y - viewport.y) - 1),
        0, 0, 1, 0,
        0, 0, 0, 1
      ).setDim(4, 4),
      pmat0
    )
    // ... ad hoc
    gl.useProgram(prg)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo.info)
    gl.viewport(0, 0, 1, 1)
    gl.bindVertexArray(vao)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmatPerp'), false, new Float32Array(vmatPerp)
    )
    gl.drawElementsInstanced(
      gl.TRIANGLE_STRIP, this.vCountSphere, gl.UNSIGNED_INT, 0, numAtoms
    )
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  maskAsymBonds (dimPerp, atomSiteId, eqvPosId, first) {
    const atomSite = this.atomSites[atomSiteId]
    const numLattFractCoords = atomSite.lattFractCoordCache[eqvPosId].length / 6
    const gl = this.gl
    gl.useProgram(this.prg.maskDisplacements)
    gl.bindVertexArray(this.vao.maskAsymBonds)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vbo.bondetc)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArraysInstanced(gl.POINTS, first, 1, numLattFractCoords)
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  maskBonds (dimPerp, atomSiteId, eqvPosId, first) {
    const atomSite = this.atomSites[atomSiteId]
    const numLattFractCoords = atomSite.lattFractCoordCache[eqvPosId].length / 6
    const gl = this.gl
    gl.useProgram(this.prg.maskDisplacements)
    gl.bindVertexArray(this.vao.maskBonds)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vbo.bondetc)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArraysInstanced(gl.POINTS, first, 1, numLattFractCoords)
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  // only parallel
  drawHalfBonds (viewport, vao, numAtoms) {
    if (numAtoms <= 0) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawHalfBonds
    // ad hoc ...
    const camera = this.cameraPar
    const vmat = camera.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat = camera.projectionMat(...clientSize)
    // ... ad hoc
    gl.useProgram(prg)
    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
    gl.bindVertexArray(vao)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.enable(gl.CULL_FACE)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    // ad hoc ...
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.5)
    // ... ad hoc
    gl.drawElementsInstanced(
      gl.TRIANGLE_STRIP, this.vCountCylinder, gl.UNSIGNED_INT, 0, numAtoms
    )
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  // only parallel
  drawHalfBondsInfo (viewport, infoPosition, vao, numAtoms) {
    if (
      numAtoms <= 0 ||
      infoPosition.x < viewport.x ||
      infoPosition.x >= viewport.x + viewport.width ||
      infoPosition.y < viewport.y ||
      infoPosition.y >= viewport.y + viewport.height
    ) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawHalfBondsInfo
    // ad hoc ...
    const camera = this.cameraPar
    const vmat = camera.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat0 = camera.projectionMat(...clientSize)
    const pmat = lnum.mmul(
      lnum.$(
        viewport.width, 0, 0,
        (viewport.width - 2 * (infoPosition.x - viewport.x) - 1),
        0, viewport.height, 0,
        (viewport.height - 2 * (infoPosition.y - viewport.y) - 1),
        0, 0, 1, 0,
        0, 0, 0, 1
      ).setDim(4, 4),
      pmat0
    )
    // ... ad hoc
    gl.useProgram(prg)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo.info)
    gl.viewport(0, 0, 1, 1)
    gl.bindVertexArray(vao)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    gl.drawElementsInstanced(
      gl.TRIANGLE_STRIP, this.vCountCylinder, gl.UNSIGNED_INT, 0, numAtoms
    )
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  maskVertices (dimPerp, atomSiteId, eqvPosId, first) {
    const atomSite = this.atomSites[atomSiteId]
    const numLattFractCoords = atomSite.lattFractCoordCache[eqvPosId].length / 6
    const gl = this.gl
    gl.useProgram(this.prg.maskDisplacements)
    gl.bindVertexArray(this.vao.maskVertices)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vbo.bondetc)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArraysInstanced(gl.POINTS, first, 1, numLattFractCoords)
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  // only parallel
  drawVertices (viewport, vao, numAtoms) {
    if (numAtoms <= 0) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawVertices
    // ad hoc ...
    const camera = this.cameraPar
    const vmat = camera.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat = camera.projectionMat(...clientSize)
    // ... ad hoc
    gl.useProgram(prg)
    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
    gl.bindVertexArray(vao)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.enable(gl.CULL_FACE)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    // ad hoc ...
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.5)
    // ... ad hoc
    gl.drawElementsInstanced(
      gl.TRIANGLE_STRIP, this.vCountSphere, gl.UNSIGNED_INT, 0, numAtoms
    )
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  // only parallel
  drawVerticesInfo (viewport, infoPosition, vao, numAtoms) {
    if (
      numAtoms <= 0 ||
      infoPosition.x < viewport.x ||
      infoPosition.x >= viewport.x + viewport.width ||
      infoPosition.y < viewport.y ||
      infoPosition.y >= viewport.y + viewport.height
    ) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawVerticesInfo
    // ad hoc ...
    const camera = this.cameraPar
    const vmat = camera.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat0 = camera.projectionMat(...clientSize)
    const pmat = lnum.mmul(
      lnum.$(
        viewport.width, 0, 0,
        (viewport.width - 2 * (infoPosition.x - viewport.x) - 1),
        0, viewport.height, 0,
        (viewport.height - 2 * (infoPosition.y - viewport.y) - 1),
        0, 0, 1, 0,
        0, 0, 0, 1
      ).setDim(4, 4),
      pmat0
    )
    // ... ad hoc
    gl.useProgram(prg)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo.info)
    gl.viewport(0, 0, 1, 1)
    gl.bindVertexArray(vao)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    gl.drawElementsInstanced(
      gl.TRIANGLE_STRIP, this.vCountCylinder, gl.UNSIGNED_INT, 0, numAtoms
    )
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  maskEdges (dimPerp, atomSiteId, eqvPosId, first) {
    const atomSite = this.atomSites[atomSiteId]
    const numLattFractCoords = atomSite.lattFractCoordCache[eqvPosId].length / 6
    const gl = this.gl
    gl.useProgram(this.prg.maskDisplacements)
    gl.bindVertexArray(this.vao.maskEdges)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vbo.bondetc)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArraysInstanced(gl.POINTS, 2 * first, 2, numLattFractCoords)
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  // only parallel
  drawEdges (viewport, vao, numAtoms) {
    if (numAtoms <= 0) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawEdges
    // ad hoc ...
    const camera = this.cameraPar
    const vmat = camera.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat = camera.projectionMat(...clientSize)
    // ... ad hoc
    gl.useProgram(prg)
    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
    gl.bindVertexArray(vao)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.enable(gl.CULL_FACE)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    // ad hoc ...
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.5)
    // ... ad hoc
    gl.drawElementsInstanced(
      gl.TRIANGLE_STRIP, this.vCountCylinder, gl.UNSIGNED_INT, 0, numAtoms
    )
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  // only parallel
  drawEdgesInfo (viewport, infoPosition, vao, numAtoms) {
    if (
      numAtoms <= 0 ||
      infoPosition.x < viewport.x ||
      infoPosition.x >= viewport.x + viewport.width ||
      infoPosition.y < viewport.y ||
      infoPosition.y >= viewport.y + viewport.height
    ) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawEdgesInfo
    // ad hoc ...
    const camera = this.cameraPar
    const vmat = camera.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat0 = camera.projectionMat(...clientSize)
    const pmat = lnum.mmul(
      lnum.$(
        viewport.width, 0, 0,
        (viewport.width - 2 * (infoPosition.x - viewport.x) - 1),
        0, viewport.height, 0,
        (viewport.height - 2 * (infoPosition.y - viewport.y) - 1),
        0, 0, 1, 0,
        0, 0, 0, 1
      ).setDim(4, 4),
      pmat0
    )
    // ... ad hoc
    gl.useProgram(prg)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo.info)
    gl.viewport(0, 0, 1, 1)
    gl.bindVertexArray(vao)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    gl.drawElementsInstanced(
      gl.TRIANGLE_STRIP, this.vCountCylinder, gl.UNSIGNED_INT, 0, numAtoms
    )
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  maskFaces (dimPerp, atomSiteId, eqvPosId, first) {
    const atomSite = this.atomSites[atomSiteId]
    const numLattFractCoords = atomSite.lattFractCoordCache[eqvPosId].length / 6
    const gl = this.gl
    gl.useProgram(this.prg.maskDisplacements)
    gl.bindVertexArray(this.vao.maskFaces)
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vbo.bondetc)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArraysInstanced(gl.POINTS, 3 * first, 3, numLattFractCoords)
    gl.endTransformFeedback()
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  // only parallel
  drawFaces (viewport, vao, numAtoms) {
    if (numAtoms <= 0) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawFaces
    // ad hoc ...
    const camera = this.cameraPar
    const vmat = camera.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat = camera.projectionMat(...clientSize)
    // ... ad hoc
    gl.useProgram(prg)
    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
    gl.bindVertexArray(vao)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    // ad hoc ...
    gl.uniform1f(gl.getUniformLocation(prg, 'reflectivity'), 0.5)
    // ... ad hoc
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, numAtoms)
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.useProgram(null)
  }

  // only parallel
  drawFacesInfo (viewport, infoPosition, vao, numAtoms) {
    if (
      numAtoms <= 0 ||
      infoPosition.x < viewport.x ||
      infoPosition.x >= viewport.x + viewport.width ||
      infoPosition.y < viewport.y ||
      infoPosition.y >= viewport.y + viewport.height
    ) {
      return
    }
    const gl = this.gl
    const prg = this.prg.drawFacesInfo
    // ad hoc ...
    const camera = this.cameraPar
    const vmat = camera.viewMat()
    const clientSize = clientSizeOf(gl, viewport)
    const pmat0 = camera.projectionMat(...clientSize)
    const pmat = lnum.mmul(
      lnum.$(
        viewport.width, 0, 0,
        (viewport.width - 2 * (infoPosition.x - viewport.x) - 1),
        0, viewport.height, 0,
        (viewport.height - 2 * (infoPosition.y - viewport.y) - 1),
        0, 0, 1, 0,
        0, 0, 0, 1
      ).setDim(4, 4),
      pmat0
    )
    // ... ad hoc
    gl.useProgram(prg)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo.info)
    gl.viewport(0, 0, 1, 1)
    gl.bindVertexArray(vao)
    gl.enable(gl.DEPTH_TEST)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'vmat'), false, new Float32Array(vmat)
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(prg, 'pmat'), false, new Float32Array(pmat)
    )
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, numAtoms)
    gl.disable(gl.DEPTH_TEST)
    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.useProgram(null)
  }

  initialiseUI () {
    this.ui = {}
    this.ui.showAtoms = true
    if (this.subscribers.showAtoms) {
      this.subscribers.showAtoms(this.ui.showAtoms)
    }
    this.ui.showAsymBonds = true
    if (this.subscribers.showAsymBonds) {
      this.subscribers.showAsymBonds(this.ui.showAsymBonds)
    }
    this.ui.showBonds = true
    if (this.subscribers.showBonds) {
      this.subscribers.showBonds(this.ui.showBonds)
    }
    this.ui.showVertices = true
    if (this.subscribers.showVertices) {
      this.subscribers.showVertices(this.ui.showVertices)
    }
    this.ui.showEdges = true
    if (this.subscribers.showEdges) {
      this.subscribers.showEdges(this.ui.showEdges)
    }
    this.ui.showFaces = true
    if (this.subscribers.showFaces) {
      this.subscribers.showFaces(this.ui.showFaces)
    }
    this.ui.showODs = true
    if (this.subscribers.showODs) {
      this.subscribers.showODs(this.ui.showODs)
    }
    this.ui.clientMousePosition = [0, 0]
    this.ui.clientDragStartPosition = null
    this.ui.dragging = false
    this.resetTemporaryUIInfo()
  }

  resetTemporaryUIInfo () {
    if (this.ui.clientDragStartPosition && !this.ui.dragging) {
      this.ui.clientDragStartPosition = null
    }
    this.ui.dragX = 0
    this.ui.dragY = 0
    this.ui.shiftDragX = 0
    this.ui.shiftDragY = 0
    this.ui.wheelDeltaY = 0
    this.ui.shiftWheelDeltaY = 0
    this.ui.ctrlWheelDeltaY = 0
    // this.ui.doubleClicked = false
    this.ui.shiftDoubleClicked = false
    this.ui.ctrlShiftDoubleClicked = false
    this.ui.ctrlAltDoubleClicked = false
  }

  onMouseDown (e) {
    if (!this.ui.clientDragStartPosition) {
      this.ui.clientDragStartPosition = [e.clientX, e.clientY]
      this.ui.dragging = true
    }
    e.preventDefault()
  }

  onMouseUp (e) {
    if (this.ui.dragging) {
      this.ui.dragging = false
    }
  }

  onMouseMove (e) {
    this.ui.clientMousePosition = [e.clientX, e.clientY]
    if (this.ui.dragging) {
      if (e.shiftKey) {
        this.ui.shiftDragX += e.movementX
        this.ui.shiftDragY += e.movementY
      } else {
        this.ui.dragX += e.movementX
        this.ui.dragY += e.movementY
      }
    }
  }

  onMouseEnter (e) {
    this.ui.clientMousePosition = [e.clientX, e.clientY]
  }

  onMouseLeave (e) {
    this.ui.clientMousePosition = [e.clientX, e.clientY]
    if (this.ui.dragging) {
      if (e.shiftKey) {
        this.ui.shiftDragX += e.movementX
        this.ui.shiftDragY += e.movementY
      } else {
        this.ui.dragX += e.movementX
        this.ui.dragY += e.movementY
      }
      this.ui.dragging = false
    }
  }

  onDoubleClick (e) {
    if (e.ctrlKey && !e.altKey && e.shiftKey) {
      this.ui.ctrlShiftDoubleClicked = true
    } else if (!e.ctrlKey && !e.altKey && e.shiftKey) {
      this.ui.shiftDoubleClicked = true
    } else if (e.ctrlKey && e.altKey && !e.shiftKey) {
      this.ui.ctrlAltDoubleClicked = true
    } else {
      // this.ui.doubleClicked = true
    }
    e.preventDefault()
  }

  onWheel (e) {
    if (e.shiftKey) {
      this.ui.shiftWheelDeltaY += e.deltaY
    } else if (e.ctrlKey) {
      this.ui.ctrlWheelDeltaY += e.deltaY
    } else {
      this.ui.wheelDeltaY += e.deltaY
    }
  }

  toggleShowAtoms () {
    this.ui.showAtoms = !this.ui.showAtoms
    if (this.subscribers.showAtoms) {
      this.subscribers.showAtoms(this.ui.showAtoms)
    }
  }

  toggleShowAsymBonds () {
    this.ui.showAsymBonds = !this.ui.showAsymBonds
    if (this.subscribers.showAsymBonds) {
      this.subscribers.showAsymBonds(this.ui.showAsymBonds)
    }
  }

  toggleShowBonds () {
    this.ui.showBonds = !this.ui.showBonds
    if (this.subscribers.showBonds) {
      this.subscribers.showBonds(this.ui.showBonds)
    }
  }

  toggleShowVertices () {
    this.ui.showVertices = !this.ui.showVertices
    if (this.subscribers.showVertices) {
      this.subscribers.showVertices(this.ui.showVertices)
    }
  }

  toggleShowEdges () {
    this.ui.showEdges = !this.ui.showEdges
    if (this.subscribers.showEdges) {
      this.subscribers.showEdges(this.ui.showEdges)
    }
  }

  toggleShowFaces () {
    this.ui.showFaces = !this.ui.showFaces
    if (this.subscribers.showFaces) {
      this.subscribers.showFaces(this.ui.showFaces)
    }
  }

  toggleShowODs () {
    this.ui.showODs = !this.ui.showODs
    if (this.subscribers.showODs) {
      this.subscribers.showODs(this.ui.showODs)
    }
  }

  toggleCameraProjectionMode () {
    this.cameraPar.orthographic = !this.cameraPar.orthographic
    this.cameraPerp.orthographic = this.cameraPar.orthographic
    if (this.subscribers.cameraOrthographic) {
      this.subscribers.cameraOrthographic(this.cameraPar.orthographic)
    }
  }

  toggleHighlightMaskType () {
    this.highlightMask = {
      ...this.highlightMask,
      type: !this.highlightMask.type
    }
  }

  toggleHighlightMaskOD () {
    this.highlightMask = {
      ...this.highlightMask,
      od: !this.highlightMask.od
    }
  }

  toggleHighlightMaskSSG () {
    this.highlightMask = {
      ...this.highlightMask,
      ssg: !this.highlightMask.ssg
    }
  }

  toggleHighlightMaskLatt () {
    this.highlightMask = {
      ...this.highlightMask,
      latt: !this.highlightMask.latt
    }
  }

  resetOrigin () {
    this.deltaOFract = null
    this.deltaOFractOffset = null
  }

  setCameraPar () {
    const str = window.prompt(
      'Please input position and updir of the parallel camera',
      JSON.stringify({
        position: this.cameraPar.position.slice(),
        upDir: this.cameraPar.upDir.slice()
      })
    )
    const cameraPar = JSON.parse(str || '{}')
    if (cameraPar) {
      this.cameraPar.position = cameraPar.position
      this.cameraPar.upDir = cameraPar.upDir
    }
  }

  setCameraPerp () {
    const str = window.prompt(
      'Please input position and updir of the perpendicular camera',
      JSON.stringify({
        position: this.cameraPerp.position.slice(),
        upDir: this.cameraPerp.upDir.slice()
      })
    )
    const cameraPerp = JSON.parse(str || '{}')
    if (cameraPerp) {
      this.cameraPerp.position = cameraPerp.position
      this.cameraPerp.upDir = cameraPerp.upDir
    }
  }

  setODBaseOpacity () {
    const str = window.prompt(
      'Please input base opacity of ODs',
      this.odBaseOpacity.toString()
    )
    const odBaseOpacity = parseFloat(str)
    if (Number.isFinite(odBaseOpacity)) {
      this.odBaseOpacity = odBaseOpacity
    }
  }
}

/* @license-end */
