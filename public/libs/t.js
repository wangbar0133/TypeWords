// 站点统计脚本（占位）。
//
// 原版 TypeWords 在这里加载三套统计：51.la、百度统计、Umami。
// 但它们的 ID 与上报地址都指向上游作者的账号，自建部署时会把访客数据
// （访问路径、来源、设备信息等）发往第三方，因此本仓库全部关闭。
//
// 如需启用你自己的统计，取消对应注释并替换 ID / 地址即可。
// 该文件由 app/plugins/02.init.client.ts 以 /libs/t.js?t=<时间戳> 加载，
// 仅在非本地环境下执行。

// 你自己的静态资源地址（自建 libs 目录时替换）
let RESOURCE_URL = 'https://libs.typewords.cc/'

// ---------- 51.la（我要啦）----------
// ;(function () {
//   window.LA = window.LA || {
//     ids: [{ id: '你的ID', ck: '你的ID' }],
//     id: '你的ID',
//     ck: '你的ID',
//     hashMode: true,
//   }
//   const script = document.createElement('script')
//   script.src = RESOURCE_URL + '51.js'
//   document.head.appendChild(script)
// })()

// ---------- 百度统计 ----------
// var _hmt = _hmt || []
// ;(function () {
//   var hm = document.createElement('script')
//   hm.src = 'https://hm.baidu.com/hm.js?你的ID'
//   document.head.appendChild(hm)
// })()

// ---------- Umami（自建或官方 SaaS）----------
// ;(function () {
//   var umami = document.createElement('script')
//   umami.src = RESOURCE_URL + 's.js'
//   umami.setAttribute('data-website-id', '你的website-id')
//   umami.setAttribute('data-host-url', 'https://你的umami域名/')
//   umami.setAttribute('data-do-not-track', false)
//   document.head.appendChild(umami)
// })()
