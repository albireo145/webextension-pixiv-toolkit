import Vue from 'vue'
import Router from 'vue-router'
import Options from '@@/components/Options'
import UgoriaExtendDialog from '@@/components/UgoiraExtendDialog'
import RenameUgoiraDialog from '@@/components/RenameUgoiraDialog';
import RenameMangaDialog from '@@/components/RenameMangaDialog';
import RenameMangaImageDialog from '@@/components/RenameMangaImageDialog';
import ThirdParty from '@@/components/ThirdParty';
import Sponsors from '@@/components/Sponsors';
import History from '@@/components/History';
import DownloadRelativeLocationDialog from '@@/components/DownloadRelativeLocationDialog';
import Subscribes from '@@/components/Subscribes'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Options',
      component: Options,
      children: [
          {
              path: 'ugoira-extend',
              name: 'UgoiraExtend',
              component: UgoriaExtendDialog,
          }, {
              path: 'rename-ugoira',
              name: 'RenameUgoira',
              component: RenameUgoiraDialog
          }, {
              path: 'rename-manga',
              name: 'RenameManga',
              component: RenameMangaDialog
          }, {
              path: 'rename-manga-image',
              name: 'RenameMangaImage',
              component: RenameMangaImageDialog
          }, {
            path: 'download-relative-dialog',
            name: 'DownloadRelativeLocationDialog',
            component: DownloadRelativeLocationDialog
          }
      ]
    }, {
      path: '/illust-history',
      name: 'IllustHistory',
      component: () => import('@@/components/IllustHistory')
    }, {
      path: '/third-party',
      name: 'ThirdParty',
      component: ThirdParty
    }, {
      path: '/sponsors',
      name: 'Sponsors',
      component: Sponsors
    }, {
      path: '/history',
      name: 'History',
      component: History
    }, {
      path: '/subscribes',
      name: 'Subscribes',
      component: Subscribes
    }
  ]
})
