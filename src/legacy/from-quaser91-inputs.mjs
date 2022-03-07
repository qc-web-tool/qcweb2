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

// Structural information of a quasicrystal is read from input files
// for the QUASER91 (A program for QUASicrystal Elementary Refinement
// written by Dr. Akiji Yamamoto).
// This is an ad hoc implementation only for qcweb2 functionality.

class LineReader {
  constructor (str) {
    this.lines = str.split(/\r?\n|\r/)
    this.currentLine = -1
    this.line = ''
    this.lastIndex = 0
  }

  nextLine () {
    this.currentLine += 1
    if (this.currentLine >= this.lines.length) {
      throw Error(`
        No more line.
      `)
    }
    this.line = this.lines[this.currentLine]
    this.lastIndex = 0
  }

  readString (prefix, count = 1, newLine = false, rdStr = true) {
    if (newLine) {
      this.nextLine()
    }
    {
      const re = new RegExp('.*?' + prefix, 'y')
      re.lastIndex = this.lastIndex
      const result = re.exec(this.line)
      if (result === null) {
        throw Error(`
          The prefix ${prefix} not found.
        `)
      }
      this.lastIndex = re.lastIndex
    }
    const values = []
    {
      const re = rdStr ? / *('.*?')/y : / *([^ ,]*)[ ,]?/y
      re.lastIndex = this.lastIndex
      for (let i = 0; i < count; i += 1) {
        const result = re.exec(this.line)
        if (result === null || result[1] === '') {
          throw Error(`
            Not enough values given for ${prefix}.
          `)
        }
        values.push(result[1])
      }
      this.lastIndex = re.lastIndex
    }
    return values
  }

  readInt (prefix, count = 1, newLine = false) {
    const strValues = this.readString(prefix, count, newLine, false)
    const re = /^[+-]?[0-9]*.$/
    const values = strValues.map(str => {
      if (!re.test(str)) {
        throw Error(`
          A read value is not an integer.
        `)
      }
      return parseInt(str)
    })
    return values
  }

  readReal (prefix, count = 1, newLine = false) {
    const strValues = this.readString(prefix, count, newLine, false)
    const re = /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eEdD][+-]?[0-9]+)?$/
    const values = strValues.map(str => {
      if (!re.test(str)) {
        throw Error(`
          A read value is not an real number.
        `)
      }
      return parseFloat(str)
    })
    return values
  }
}

export function fromQuaser91Inputs (
  qcdString, flnm3String = '', flnm4String = '', eps = DEFAULT_EPS
) {
  const rnum = new RealAlgebra(eps)
  const lr = new LineReader(qcdString)
  const data = {}
  data.job = lr.readInt('job=', 1, true)[0]
  data.ids = lr.readInt('ids=', 1)[0]
  data.mthd = lr.readInt('mthd=', data.ids)
  data.isys = lr.readInt('isys=', 1)[0]
  data.ihkg = lr.readInt('ihkg=', 1)[0]
  data.hmax = lr.readInt('hmax=', 1)[0]
  console.log(data)
  data.mthdData = []
  let iPowder = 0
  for (let i = 0; i < data.ids; i += 1) {
    if (data.mthd[i] === 0) {
      // subroutine rdpwdata in QUASER91
      iPowder += 1
      const pwData = {}
      pwData.hd = lr.readInt('ih=', 6, true)
      pwData.xray = lr.readString('xray=', 1, true)[0]
      pwData.ibkgr = lr.readInt('backgr=', 1)[0]
      if (pwData.xray === 'tn') {
        pwData.wavl = lr.readReal('wavl=', 1)[0]
      } else {
        pwData.wavl = 0 // dummy
      }
      pwData.qmin = lr.readReal('qmin=', 1, true)[0]
      pwData.qmax = lr.readReal('qmax=', 1)[0]
      pwData.qint = lr.readReal('qint=', 1)[0]
      pwData.istep = Math.max(lr.readInt('istep=', 1)[0], 1)
      pwData.nrange = lr.readInt('nrange=', 1)[0]
      pwData.ixax = lr.readInt('ixax=', 1)[0]
      pwData.iyax = lr.readInt('iyax=', 1)[0]
      pwData.ilp = lr.readInt('ilp=', 1)[0]
      pwData.rmaxi = lr.readReal('rmaxi=', 1)[0]
      pwData.nstp = lr.readInt('nst=', 1)[0]
      if (pwData.ilp === 3) {
        pwData.alpha = lr.readReal('alpha=', 1)
      }
      pwData.qint *= pwData.istep
      if (![0, 1, -1, 2, 3, 4].includes(pwData.ilp)) {
        throw Error(`
          ilp must be 0, 1, -1, 2, 3, or 4.
        `)
      }
      if (pwData.xray === 'tf' && pwData.ixax === 1) {
        throw Error(`
          ixax must be 0 if xray is 'tf'.
        `)
      }
      if (pwData.iyax !== 1 && pwData.iyax !== 2) {
        throw Error(`
          iyax must be 1 or 2 (linear or log scale).
        `)
      }
      if (pwData.rmaxi === 0.0) {
        pwData.rmaxi = 1.0
      }
      pwData.usrmn = []
      pwData.usrmx = []
      if (pwData.nrange === 0) {
        pwData.usrmn.push(pwData.qmin)
        pwData.usrmx.push(pwData.qmax)
        pwData.nrange = 1
      } else {
        for (let j = 0; j < pwData.nrange; j += 1) {
          let usrmnj = lr.readReal('usrmn=', 1, true)[0]
          let usrmxj = lr.readReal('usrmn=', 1)[0]
          if (usrmnj <= pwData.qmin) {
            usrmnj = pwData.qmin
          }
          if (usrmxj > pwData.qmax || usrmxj === 0.0) {
            usrmxj = pwData.qmax
          }
          pwData.usrmn.push(usrmnj)
          pwData.usrmx.push(usrmxj)
        }
      }
      // todo?: set ndata
      pwData.thbmd = lr.readReal('thbm=', 1, true)[0] * Math.PI / 180
      if (pwData.ilp === 2) {
        pwData.fid = lr.readReal('fi=', 1)[0] * Math.PI / 180
      }
      pwData.lenx = lr.readReal('lenx=', 1, true)[0]
      pwData.leny = lr.readReal('leny=', 1)[0]
      pwData.vscl = lr.readReal('vscl=', 1)[0]
      pwData.delta = lr.readReal('delta=', 1)[0]
      pwData.pb = lr.readReal('pb=', 13, true)
      if (pwData.ibkgr === 1) {
        if (
          pwData.pb[8] === 0.0 ||
          pwData.pb[10] === 0.0 ||
          pwData.pb[12] === 0.0
        ) {
          throw Error(`
            pb[8], pb[10] and pb[12] must not be zero.
          `)
        }
      }
      if (pwData.xray !== 'tf') {
        pwData.as = lr.readReal('as=', 1, true)[0]
        pwData.uvw = lr.readReal('uv=', 2, true)
        pwData.gamma = lr.readReal('gamma=', 1, true)[0]
        pwData.hwhm = lr.readReal('hwhm=', 4, true)
      } else {
        pwData.pp = []
        pwData.pp.push(...lr.readReal('sij=', 4, true))
        pwData.pp.push(...lr.readReal('gij=', 4, true))
        pwData.pp.push(...lr.readReal('ri=', 2, true))
      }
      pwData.pg = lr.readReal('pg=', 1, true)[0]
      pwData.sgm = lr.readReal('sgm=', 1, true)[0]
      pwData.p1 = lr.readReal('p1=', 1, true)[0]
      pwData.p2 = lr.readReal('p2=', 1)[0]
      if (pwData.xray !== 'tf') {
        pwData.zpw = lr.readReal('zps=', 1, true)[0]
        if (pwData.xray === 'tn') {
          pwData.cp = [0.0, lr.readReal('c1=', 1, true)[0], 0.0]
        } else {
          pwData.cp = [0.0, 1.0, 0.0]
        }
        pwData.biar = lr.readReal('bia=', 1, true)[0]
      } else {
        pwData.cp = []
        pwData.cp.push(lr.readReal('c0=', 1, true)[0])
        pwData.cp.push(lr.readReal('c1=', 1)[0])
        pwData.cp.push(lr.readReal('c2=', 1)[0])
        pwData.biar = lr.readReal('bia=', 1, true)[0]
      }
      pwData.flnm0 = lr.readString('flnm0=', 1, true)[0]
      data.mthdData.push(pwData)
    } else if (data.mthd[i] === 1) {
      // subroutine rdscdata in QUASER91
      const scData = {}
      if (data.ihkg === 1) {
        scData.xray = lr.readString('xray=', 1, true)[0]
        scData.qmin = lr.readReal('qmin=', 1, true)[0]
        scData.qmin = lr.readReal('qmin=', 1)[0]
        scData.rmaxi = lr.readReal('rmaxi=', 1)[0]
        scData.nstp = lr.readInt('nst=', 1)[0]
      } else if (data.ihkg === 0) {
        // subroutine rdiob0 in QUASER91
        scData.fnsig = lr.readReal('fnsig=', 1, true)[0]
        scData.fminc = lr.readReal('fminc=', 1)[0]
        scData.wg0 = lr.readReal('wg0=', 1)[0]
        scData.nst = lr.readInt('nst=', 1)[0]
        scData.itrv = lr.readInt('itrv=', 1)[0]
        scData.isext = lr.readInt('isext=', 1)[0]
        if (scData.isext !== 0) {
          scData.imthd = lr.readInt('imthd=', 1)[0]
          // The next if is always true.
          // It seems a typo. What intended may be scData.imthd === 1.
          if (data.mthd[i] === 1) {
            scData.mu = lr.readReal('mu=', 1)[0]
          }
        }
        scData.iorf = lr.readInt('iorf=', 1, true)[0]
        scData.fmt = lr.readString('format=', 1)[0]
        scData.iavrg = lr.readInt('iavrg=', 1)[0]
        scData.pb = []
        scData.pb.push(lr.readReal('scl=', 1, true)[0])
        if (Math.abs(scData.isext) === 1) {
          scData.pb.push(lr.readReal('ads=', 1)[0])
          scData.pb.push(lr.readReal('ama=', 1)[0])
        } else if (Math.abs(scData.isext) === 2) {
          scData.pb.push(lr.readReal('ads=', 1)[0])
          scData.pb.push(lr.readReal('adsa=', 1)[0])
          scData.pb.push(lr.readReal('ama=', 1)[0])
        }
        scData.biar = lr.readReal('bia=', 1, true)[0]
        if (scData.isext !== 0) {
          // subroutine rdextc in QUASER91
          scData.nbf = lr.readInt('nbf=', 1, true)[0]
          scData.mp = lr.readInt('mp=', 1)[0]
          scData.mq = lr.readInt('mq=', 1)[0]
          scData.mr = lr.readInt('mr=', 1)[0]
          scData.icm = lr.readInt('icm=', 1)[0]
          if (scData.nbf !== -1 && scData.nbf !== 1 && scData.nbf < 4) {
            throw Error(`
              nbf must be -1, 1 or larger then 3.
            `)
          }
          if (scData.mp * scData.mq * scData.mr > 1000) {
            throw Error(`
              mp * mq * mr must not be larger than 1000.
            `)
          }
          scData.aa = []
          scData.bb = []
          scData.cc = []
          scData.ff = []
          for (let j = 0, n = Math.abs(scData.nbf); j < n; j += 1) {
            scData.aa.push(lr.readReal('aa=', 1, true)[0])
            scData.bb.push(lr.readReal('bb=', 1)[0])
            scData.cc.push(lr.readReal('cc=', 1)[0])
            scData.ff.push(lr.readReal('ff=', 1)[0])
          }
          if (scData.nbf === 1) {
            scData.aa[0] = (1 / scData.aa[0]) ** 2
            scData.bb[0] = (1 / scData.bb[0]) ** 2
            scData.cc[0] = (1 / scData.cc[0]) ** 2
            scData.ff[0] = scData.ff[0] ** 2
          } else if (scData.nbf === -1) {
            scData.aa[0] = (1 / scData.aa[0]) ** 2
            scData.bb[0] = (1 / scData.bb[0]) ** 2
            scData.ff[0] = scData.ff[0] ** 2
          }
          scData.wv = lr.readReal('wv=', 1, true)[0]
          scData.abc0 = lr.readReal('abc0=', 1)[0]
          scData.bth = lr.readReal('bth=', 1)[0]
          scData.amag = lr.readReal('amag=', 1)[0]
          if (scData.icm === 0) {
            scData.cm = lr.readReal('cm=', 9, true)
            //
          } else if (scData.icm === 1) {
            scData.cm = lr.readReal('cm=', 9, true)
            //
          } else if (scData.icm === 2) {
            scData.euang1 = lr.readReal('euang1=', 3)
            //
          }
          scData.om = lr.readReal('om=', 9, true)
        }
      }
      data.mthdData.push(scData)
    }
    console.log(data.mthdData[i])
  }
  if (iPowder > 0) {
    // subroutine rdpwdata1 in QUASER91
    data.lgr = lr.readString('lgr=', 1, true)[0]
    data.riccut = lr.readReal('riccut=', 1, true)[0]
    if (data.riccut === 0.0) {
      data.riccut = 0.001
    }
    data.ldev = lr.readInt('ldev=', 1, true)[0]
    data.nlp = lr.readInt('nlp=', 1, true)[0]
    data.il = []
    data.cl = []
    data.icn = []
    for (let i = 0; i < data.nlp; i += 1) {
      lr.nextLine()
      data.il.push(parseInt(lr.line.slice(0, 2)))
      data.cl.push(parseFloat(lr.line.slice(2, 11)))
      data.icn.push(lr.line.slice(11, 12))
    }
  } else if (data.ihkg === 1) {
    data.lgr = lr.readString('lgr=', 1, true)[0]
  }
  data.flnm1 = []
  for (let i = 0; i < data.ids; i += 1) {
    data.flnm1.push(lr.readString('flnm1=', 1, true)[0])
  }
  data.flnm2 = lr.readString('flnm2=', 1, true)[0]
  // subroutine fls in QUASER91
  // * subroutine qcdff1 in QUASER91
  data.inpm = lr.readInt('inpm=', 1, true)[0]
  data.title = lr.readString('title=', 1, true)[0]
  data.al = lr.readReal('a=', 1, true)[0]
  if (data.isys >= 3) { // decagonal, octagonal or dodecagonal
    data.cl = lr.readReal('c=', 1)[0]
  }
  data.eps1 = lr.readReal('eps1=', 1)[0]
  data.eps2 = lr.readReal('eps2=', 1)[0]
  data.eps3 = lr.readReal('eps3=', 1)[0]
  data.eps4 = lr.readReal('eps4=', 1)[0]
  data.eps5 = lr.readReal('eps5=', 1)[0]
  data.eps6 = lr.readReal('eps6=', 1)[0]
  data.na = lr.readInt('na=', 1, true)[0]
  data.npod = lr.readInt('npod=', 1)[0]
  if (data.inpm === 0) {
    data.flnm3 = lr.readString('flnm3=', 1, true)[0]
    data.flnm4 = lr.readString('flnm4=', 1, true)[0]
  }
  const lr3 = data.inpm === 0 ? new LineReader(flnm3String) : lr
  const lr4 = data.inpm === 0 ? new LineReader(flnm4String) : lr
  // * * subroutine rdsymo in QUASER91
  data.nsymo = lr3.readInt('nsymo=', 1, true)[0]
  data.icent = lr3.readInt('icent=', 1)[0]
  data.brv = lr3.readString('brv=', 1)[0]
  lr3.nextLine()
  data.symopCode = []
  data.rot = []
  data.trans = []
  for (let i = 0; i < data.nsymo; i += 1) {
    lr3.nextLine()
    const symcode = lr3.line
    const sym = symcode.slice(0, 30).split(',')
    if (sym.length !== 6) {
      throw Error(`
        Incorrect symmetry operation: ${symcode}
      `)
    }
    const r = new Array(36).fill(0)
    const t = new Array(6).fill(0)
    for (let j = 0; j < 6; j += 1) {
      if (/[+-]?x/.test(sym[j])) {
        if (/-x/.test(sym[j])) {
          r[j * 6] = -1
        } else {
          r[j * 6] = 1
        }
      }
      if (/[+-]?y/.test(sym[j])) {
        if (/-y/.test(sym[j])) {
          r[j * 6 + 1] = -1
        } else {
          r[j * 6 + 1] = 1
        }
      }
      if (/[+-]?z/.test(sym[j])) {
        if (/-z/.test(sym[j])) {
          r[j * 6 + 2] = -1
        } else {
          r[j * 6 + 2] = 1
        }
      }
      if (/[+-]?t/.test(sym[j])) {
        if (/-t/.test(sym[j])) {
          r[j * 6 + 3] = -1
        } else {
          r[j * 6 + 3] = 1
        }
      }
      if (/[+-]?u/.test(sym[j])) {
        if (/-u/.test(sym[j])) {
          r[j * 6 + 4] = -1
        } else {
          r[j * 6 + 4] = 1
        }
      }
      if (/[+-]?v/.test(sym[j])) {
        if (/-v/.test(sym[j])) {
          r[j * 6 + 5] = -1
        } else {
          r[j * 6 + 5] = 1
        }
      }
      if (/\//.test(sym[j])) {
        const result = /(-?[0-9])\/([0-9])/.exec(sym[j])
        t[j] = result[1] / result[2]
      }
    }
    data.symopCode.push(lr3.line)
    data.rot.push(r)
    data.trans.push(t)
  }

  // generate all symops

  // * * subroutine rdpod in QUASER91
  data.ods = []
  for (let i = 0; i < data.npod; i += 1) {
    const nd = data.isys !== 5 ? 6 : 7
    const odData = {}
    odData.n = lr3.readInt('', 1, true)[0]
    odData.nej0 = lr3.readInt('', 1)[0]
    odData.ityp = lr3.readInt('', 1)[0]
    odData.str = lr3.readString('', 1)[0]
    odData.ej0 = []
    for (let j = 0; j < odData.nej0; j += 1) {
      odData.ej0.push(lr3.readReal('ej=', nd, true))
    }
    odData.nth0 = lr3.readInt('nth=', 1, true)
    odData.mej0 = []
    for (let j = 0; j < odData.nth0; j += 1) {
      if (data.isys <= 2) {
        odData.mej0.push(lr3.readInt('', 3))
      } else {
        odData.mej0.push(lr3.readInt('', 2))
      }
    }
    odData.iaslct0 = []
    lr3.nextLine()
    for (let j = 0, n = data.nsymo * (data.icent + 1); j < n; j += 1) {
      if (j === 60) {
        lr3.nextLine()
      }
      odData.iaslct0.push(parseInt(lr3.line.slice(j % 60, j % 60 + 1)))
    }
    console.log(odData)
  }
  console.log(data)

  // return qc
}

/* @license-end */
