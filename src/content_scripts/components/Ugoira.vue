<template>
  <div>
    <ptk-button
      :type="zipButton.type"
      @click="zipButtonClickHandle"
    >{{ zipButton.text + (zipButton.saved ? ' ✔️' : '') }}</ptk-button>
    <template v-if="ready">
      <ptk-button
        v-for="(button, type) in generatorButtons"
        :key="type"
        @click="generateButtonClickHandle(type)"
      >{{ button.text + (button.saved ? ' ✔️' : '') }}</ptk-button>
    </template>
  </div>
</template>

<script>
import Button from "@/content_scripts/components/Button"
import formatName from "@/modules/Util/formatName"
import {
  permissions as browserPermissions,
  downloads as browserDownloads
} from "@/content_scripts/Browser"
import Browser from '@/modules/Browser/Browser'
import downloadFileMixin from "@/content_scripts/mixins/downloadFileMixin"
import DownloadRecordPort from '@/modules/Ports/DownloadRecordPort/RendererPort'

export default {
  mixins: [
    downloadFileMixin
  ],

  components: {
    "ptk-button": Button
  },

  props: {
    tool: Object
  },

  data() {
    return {
      zipButton: {
        type: '',
        saved: false,
        blob: null,
        text: 'Preparing'
      },

      ready: false,

      generatorButtons: {
        gif: {},

        apng: {},

        webm: {}
      },

      forceDownload: false
    }
  },

  beforeMount() {
    /**
     * Inital generator buttons props
     */
    Object.keys(this.generatorButtons).forEach(type => {
      this.$set(this.generatorButtons, type, {
        type: '',
        blob: null,

        /**
         * 0: not start
         * 1: generated
         * 2: generating
         * 4: generate failed
         */
        status: 0,
        saved: false,
        text: `Generate ${type.toUpperCase()}`
      });
    });

    /**
     * Add listener to download resource progress event
     */
    this.tool.addExclusiveListener('progress', progress => {
      this.zipButton.text = `Downloading ${Math.round(progress * 100)}%`;
    });

    this.downloadRecordPort = DownloadRecordPort.getInstance();
    this.downloadRecordPort.port.onMessage.addListener(this.handleDownloadRecord);
    this.downloadRecordPort.getDownloadRecord({ id: this.tool.getId(), type: DownloadRecordPort.illustType });

    this.initTool().then(() => {
      this.ready = true;
      browser.runtime.onConnect.addListener(this.handleConnect);
    });
  },

  /**
   * In unmounted method remove the listeners that need to be removed
   */
  beforeDestroy() {
    browser.runtime.onConnect.removeListener(this.handleConnect)
    this.downloadRecordPort.port.onMessage.removeListener(this.handleDownloadRecord);
  },

  methods: {
    /**
     * @returns {Promise}
     */
    initTool() {
      /**
       * Init ugoira tool will reset the generators instance, so feel free to add listeners to gererators again
       */
      return this.tool.init().then(() => {
        this.zipButton.text = 'Save ZIP';
      }).catch(error => {
        this.zipButton.text = 'Interrupted, Click to retry';
      });
    },

    saveDownloadRecord(record) {
      this.downloadRecordPort.saveDownloadRecord({
        id: this.tool.getId(),
        type: DownloadRecordPort.illustType,
        record
      });
    },

    allowDownload(isSaved) {
      if (isSaved && this.browserItems.askDownloadSavedWork && !this.forceDownload) {
        if (window.confirm(this.tl('_this_item_may_has_been_saved'))) {
          this.forceDownload = true;
        } else {
          return false;
        }
      }

      return true;
    },

    zipButtonClickHandle() {
      if (!this.allowDownload(this.zipButton.saved)) {
        return;
      }

      if (this.zipButton.saved === -1) {
        this.initTool();
      } else if (this.tool.isReady()) {
        this.zipButton.type = 'success';

        this.downloadFile(this.tool.zipBlob, this.getFilename() + '.zip', {
          folder: this.getSubfolder(this.browserItems.ugoiraRelativeLocation, this.tool.context),
          statType: 'ugoira',
        });

        this.saveDownloadRecord({
          zip: 1
        });

        this.zipButton.saved = true;
      }
    },

    saveFile(blob, type) {
      this.downloadFile(blob, this.getFilename() + '.' + type, {
        folder: this.getSubfolder(this.browserItems.ugoiraRelativeLocation, this.tool.context),
        statType: 'ugoira'
      });

      this.generatorButtons[type].saved = 1;

      let data = {};
      data[type] = 1;

      this.saveDownloadRecord(data);
    },

    generateButtonClickHandle(type) {
      /**
       * This is a reference of the one generator button of the component's generatorButtons prop
       */
      let button = this.generatorButtons[type];

      if (button.status === 0 || button.status === 4) {
        /**
         * Create the generator with the type argument
         */
        let generator = this.tool.makeGenerator(type);

        if (this.browserItems.enableExtend) {
          if (this.tool.context.illustDuration < this.browserItems.enableWhenUnderSeconds * 1000) {
            generator.setRepeat(Math.floor(this.browserItems.extendDuration * 1000 / this.tool.context.illustDuration) + 1);
          }
        }

        generator.addListener('data', (totalFrames, loadedFrames) => {
          /**
           * Update the generator button status
           */
          button.status = 2;
          button.text = `Preparing ${Math.floor(loadedFrames / totalFrames * 100)}%`;
        });

        /**
         * Add the listener to the generator's generating progress event
         */
        generator.addListener('progress', progress => {
          // update text
          button.text = `Generating ${Math.round(progress * 100)}%`;
        });

        /**
         * Add the listener to the generator's finish event
         */
        generator.addListener('finish', blob => {
          /**
           * Update status, text and style type
           */
          button.status = 1;
          button.text = 'Save ' + type.toUpperCase();
          button.type = 'success';
          button.blob = blob;

          this.saveFile(blob, type);
        });

        /**
         * Start generate target file
         */
        generator.generate();
      } else if (button.status === 1) {
        this.saveFile(button.blob, type);
      } else if (button.status === 2) {
        alert('Generating, please wait.');
      }
    },

    getFilename() {
      return formatName(this.browserItems.ugoiraRenameFormat, this.tool.context, this.tool.context.illustId)
    },

    isBrowser(browser) {
      var regex = new RegExp(browser, 'i');

      return regex.test(navigator.userAgent);
    },

    handleDownloadRecord(message, port) {
      if (message.channel === DownloadRecordPort.portName + ':get-download-record' && message.error === undefined) {
        if (message.data.zip === 1) this.zipButton.saved = true;
        if (message.data.gif === 1) this.generatorButtons.gif.saved = true;
        if (message.data.apng === 1) this.generatorButtons.apng.saved = true;
        if (message.data.webm === 1) this.generatorButtons.webm.saved = true;
      }
    },

    handleConnect(port) {
      let self = this;

      if (port.name === 'popup') {
        port.onMessage.addListener((message, sender, sendResponse) => {
          if (message.type === 'fetch-info') {
            port.postMessage({
              info: self.tool.context
            })
          }
        })
      }
    }
  }
}
</script>
