/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'

class PreviewModeToolsMenu extends LitElement {
  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.url = null
    this.datKey = null
  }

  async init (params) {
    this.url = params.url
    this.datKey = await bg.datArchive.resolveName(this.url)
    this.hasChanges = (await bg.archives.diffLocalSyncPathListing(this.datKey, {compareContent: true, shallow: true})).length > 0
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    const changesCls = classMap({
      'menu-item': true,
      disabled: !this.hasChanges
    })
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="menu-item" @click=${this.onClickGotoLive}>
          <i class="fas fa-broadcast-tower"></i>
          Go to latest published
        </div>
        <div class="menu-item" @click=${this.onClickGotoPreview}>
          <i class="fas fa-laptop-code"></i>
          Go to preview
        </div>
        <hr>
        <div class="${changesCls}" @click=${this.onClickGotoReview}>
          <i class="fas fa-tasks"></i>
          Review changes
        </div>
        <div class="${changesCls}" @click=${this.onClickCommit}>
          <i class="fas fa-check"></i>
          Commit all changes
        </div>
      </div>
    `
  }

  // events
  // =

  onClickGotoPreview () {
    bg.views.loadURL('active', changeHostname(this.url, `${this.datKey}+preview`))
    bg.shellMenus.close()
  }

  onClickGotoLive () {
    bg.views.loadURL('active', changeHostname(this.url, `${this.datKey}`))
    bg.shellMenus.close()
  }

  onClickGotoReview () {
    bg.views.loadURL('active', `beaker://editor/dat://${this.datKey}`)
    bg.shellMenus.close()
  }

  async onClickCommit () {
    var url = this.url
    var datKey = this.datKey

    if (!confirm('Commit all changes?')) {
      bg.shellMenus.close()
      return
    }

    var currentDiff = await bg.archives.diffLocalSyncPathListing(datKey, {compareContent: true, shallow: true})
    var paths = fileDiffsToPaths(currentDiff)
    await bg.archives.publishLocalSyncPathListing(datKey, {shallow: false, paths})

    bg.shellMenus.close()
    bg.views.loadURL('active', url) // reload the page
  }
}
PreviewModeToolsMenu.styles = [commonCSS, css`
.wrapper {
  padding: 4px 0;
}
`]

customElements.define('preview-mode-tools-menu', PreviewModeToolsMenu)

function fileDiffsToPaths (filediff) {
  return filediff.map(d => {
    if (d.type === 'dir') return d.path + '/' // indicate that this is a folder
    return d.path
  })
}

function changeHostname (url, newHostname) {
  try {
    var urlp = new URL(url)
    urlp.hostname = newHostname
    return urlp.toString()
  } catch (e) {
    return url
  }
}