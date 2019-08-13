<template>
  <div v-if="show" style="padding: 6px 0 0 20px;text-align:center;">
    <ptk-button
      v-for="buttonInfo in buttonsInfo"
      :key="buttonInfo.index"
      :text="buttonInfo.text"
      @click="downloadButtonClicked(buttonInfo)"></ptk-button>
  </div>
</template>

<script>
import Button from '@/content_scripts/components/Button'
import formatName from '@/modules/Util/formatName'
import downloadFileMixin from '@/content_scripts/mixins/downloadFileMixin'
import IllustTool from '@/content_scripts/illust/Illust'

export default {
  mixins: [
    downloadFileMixin
  ],

  components: {
    'ptk-button': Button
  },

  props: {
    tool: IllustTool,
  },

  data() {
    return {
      illustTool: null,
      show: false,
      chunks: [],
      buttonsInfo: {}
    }
  },

  mounted() {
    let vm = this,
        buttonsInfo = {}

    this.illustTool = this.tool

    this.illustTool.initOptions({
      splitSize: window.thisApp.browserItems.mangaPagesInChunk,
      mangaRenameFormat: window.thisApp.browserItems.mangaRenameFormat,
      mangaImageRenameFormat: window.thisApp.browserItems.mangaImageRenameFormat
    }).init()

    this.chunks = this.illustTool.chunks

    this.initDownloadButtons()

    this.show = true
  },

  methods: {
    initDownloadButtons() {
			/**
			 * @param {this}
			 */
			let vm = this,
					buttonsInfo = {}

			this.chunks.forEach((chunk, i) => {
				let isSingle = vm.illustTool.isSingle()

				buttonsInfo[i] = {
					index: i,
					text: isSingle ? 'DL Illust' : vm.getChunkTitle(chunk),
					filename: vm.illustTool.getFilename(chunk),
					downloadStatus: 0,
					chunk: chunk,
					isSingle: isSingle
				}
			})

			this.buttonsInfo = buttonsInfo
		},

		updateButtonInfo(buttonInfo, data) {
			this.$set(
				this.buttonsInfo,
				buttonInfo.index,
				Object.assign(buttonInfo, data)
			)
		},

    getChunkTitle(chunk) {
      return 'DL ' + (chunk.start) + '-' + (chunk.end)
    },

    downloadButtonClicked(buttonInfo) {
			let vm = this
			
			if (buttonInfo.downloadStatus === 0) {
        buttonInfo.downloadStatus = 1

				// If download single illust
				if (buttonInfo.isSingle) {
					let url = this.illustTool.context.pages[0].urls.original

					this.illustTool.downloadFile(url, {
						onProgress(evt) {
							vm.updateButtonInfo(buttonInfo, {
								text: 'DL ' + Math.floor(evt.loaded / evt.total) * 100 + '%'
							})
						}
					}).then(result => {
						let url = URL.createObjectURL(result.blob)
						let filename = result.targetName

						vm.downloadFile(url, filename)

						vm.updateButtonInfo(buttonInfo, {
							url: url,
							text: 'Save Illust',
							filename: filename,
							downloadStatus: 2
						})
					})
				} else {
					this.illustTool.downloadChunk(buttonInfo.chunk, {
						onItemComplete: this.updateProgress(buttonInfo),
						onItemFail: this.updateProgress(buttonInfo),
						onDone: this.onDone(buttonInfo)
					})
				}
      } else if (buttonInfo.downloadStatus === 2) {
        this.downloadFile(buttonInfo.url, buttonInfo.filename)
      }
    },

    updateProgress(buttonInfo) {
      let vm = this

      return queue => {
        let text = 'C:' + queue.complete + ' / F:' + queue.fail + ' / T:' + queue.total

        vm.$set(
          vm.buttonsInfo,
          buttonInfo.index,
          Object.assign(buttonInfo, {
            text: text
          })
        )
      }
    },

    onDone(buttonInfo) {
      let vm = this

      return blob => {
        let text = 'Save chunk ' + buttonInfo.chunk.start + '-' + buttonInfo.chunk.end

        vm.$set(
          vm.buttonsInfo,
          buttonInfo.index,
          Object.assign(buttonInfo, {
            text: text,
            url: URL.createObjectURL(blob),
            downloadStatus: 2
          })
        )

        if (thisApp.browserItems.mangaPackAndDownload) {
          vm.downloadFile(buttonInfo.url, vm.getFilename(buttonInfo.chunk))
        }
      }
    },

    getFilename(chunk) {
      return formatName(thisApp.browserItems.mangaRenameFormat, this.illustTool.context, this.illustTool.context.illustId) + '_' + chunk.start + '-' + chunk.end + '.zip'
    }
  }
}
</script>