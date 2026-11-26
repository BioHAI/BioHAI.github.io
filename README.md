# AI4Health @ Hunan University

湖南大学 BioHAI / AI4Health 实验室网站。静态 HTML 入口、Vue 3.5.24 本地运行库、CSS 响应式布局，直接兼容 GitHub Pages；不需要安装依赖或执行前端构建。

## 本地运行

安装 Node.js 18 或更新版本后，在仓库目录运行：

```sh
npm run dev
```

打开 `http://127.0.0.1:8000/`。修改代码或数据后刷新浏览器。若端口已占用，可以直接打开现有服务，或设置 `PORT` 使用其他端口。

```sh
npm run check
```

检查论文去重、元数据、图片和页面资源路径及 JavaScript 语法。无需 `npm install`。

## 页面与维护

| 页面 | 内容 |
| --- | --- |
| `index.html` | 论文主图画廊，年份 / 方向 / 出版类型筛选、搜索、排序和分页 |
| `People.html` | 导师介绍与成员名录；学生独立按博士 / 硕士、入学年份筛选，支持姓名与邮箱搜索 |
| `Publication.html` | 按年份整理的论文条目、搜索、筛选和分页 |
| `News.html` | 研究进展、原站奖项与团队活动 |
| `Research.html` | 研究方向、项目与荣誉 |
| `Openings.html` | 导师招生计划、申请步骤与课题组培养介绍 |
| `OtherStu.html` | 原站校友去向 |

- 共享组件及交互：`assets/js/site.js`。
- 共享设计、深浅主题和响应式样式：`assets/css/site.css`。
- 浅色导航、蓝色配色、统一阅读字号、Manrope / Noto Sans SC 字体和新版专题页样式：`assets/css/blue-refresh.css`。
- Research / Openings 组件：`assets/js/lab-pages.js`；内容及来源为 `assets/data/lab-content.json`。招生名额应按导师主页逐项核对，不自动滚动年份。
- 论文数据：`assets/data/publications.json`；新增记录需使用唯一 `id`，补齐标题、年份、作者、期刊 / 会议和可核实来源。
- 成员数据：`assets/data/people.json`。类别为 `faculty`、`visiting`、`postdoc`、`phd`、`master`；保留原站入学年份，不根据年份推断毕业状态。
- 封面来源：`assets/data/figure-sources.json`；记录原图地址、原文页面，PDF 提取图另含页码与裁剪区域。所有论文均显示在首页与 Publication；缺图记录使用期刊 / 会议与年份的文字封面，找到原始 Figure 1 后自动替换。
- 静态页面标题、描述等入口模板：`tools/build-pages.cjs`。调整后运行 `npm run build:pages`；发布打包也会自动重建入口，为 CSS / JavaScript 附加内容版本号，避免浏览器缓存旧代码。

筛选条件保存在当前 URL，分享或刷新后可以恢复。主图使用原图比例完整显示；成员照片保持固定尺寸。手机端提供折叠导航、单列研究卡片和双列成员卡片。支持键盘操作、原生对话框焦点管理与减少动态效果偏好。

## 自动同步 Latest research

来源为[曾湘祥教授官方主页](https://csee.hnu.edu.cn/people/zengxiangxiang)的编号论文列表，默认同步 2025 年起的记录。日期范围、标题别名及导入上限在 `assets/data/research-sync-config.json` 配置。脚本使用 Node.js 与系统自带的 `curl`，不需要 API key 或安装 npm 依赖。

```sh
npm run sync:research:check  # 只预览变化，不写文件
npm run sync:research        # 同步本地论文数据与可定位的原始 Figure 1
npm run research:watch       # 持续运行，每 6 小时自动同步一次
npm run test:research        # 验证新增导入、去重、错误恢复和封面匹配
```

本地 watcher 需要进程保持运行；关闭后停止检查。可以通过 `SYNC_INTERVAL_HOURS` 调整间隔（1–168 小时）。如本机需要代理，使用标准的 `HTTPS_PROXY` 环境变量，不把本地代理地址写入同步脚本。

同步按标题和明确的别名去重，保留人工校正过的年份、标题、原文链接、已有封面及指标标签。新增论文先进入首页、年份筛选、搜索与分页；只在匹配到原文中的 Figure 1 时自动补图，不把网站 Logo、宣传图或相似论文的图片当作论文封面。Crossref / arXiv 匹配要求标题及作者一致，找不到原文时仍提供教师主页来源。当前已核实的 CCF 分类与带年份的 IF 从 `venue-metrics.json` 读取，不推测或自动升级指标。

教师主页不可访问、文章区结构改变或解析失败时，脚本返回失败，保留已有论文数据；GitHub 构建会中止，线上站点继续使用上一个成功版本。单次补图最多处理 12 条缺图记录，并设有时间预算；未完成的条目在下次运行继续尝试。工作流缓存保留已同步记录和封面，避免被仓库中的旧快照覆盖。同步报告在 `assets/data/research-sync-status.json`，不在页面显示维护日期。

### 线上自动更新

`.github/workflows/update-research.yml` 已准备好：每天北京时间 **08:23 左右**、手动运行或 `main` 更新时，同步论文 → 运行检查 → 打包 → 发布 GitHub Pages。同步结果进入部署产物，不创建机器人 commit，也不会推送数据改动。部署时将 GitHub Pages 发布源设置为 GitHub Actions。

首次发布时，到 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，然后运行 **Sync research and publish website**。无需额外个人访问令牌。发布包只包含 HTML、公开资源与图片，不包含 Git 仓库、工具脚本和同步缓存。

GitHub 的计划任务可能延迟；公开仓库长期无活动时，GitHub 可能停用计划任务，可在 Actions 中重新启用。配置规则见 [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)与[定时触发说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。

## 世界访客地图

所有页面的页脚前已预留世界地图区域，组件为 `assets/js/visitor-map.js`，样式为 `assets/css/visitor-map.css`，配置为 `assets/data/visitor-map.json`。

已根据用户提供的 MapMyVisitors 嵌入代码填入真实的 `d` 标识，并将 `enabled` 设置为 `true`。仅在正式域名 `biohai.github.io` 加载统计地图；正式部署后启用线上统计。在 `localhost` / `127.0.0.1` 继续仅显示本地地图预览，不加载第三方统计请求、不计入访问量。预览标记点代表湖南大学所在地，不是访客。

真实统计使用 [MapMyVisitors 官方图片嵌入](https://mapmyvisitors.com/learn/tools/add-visitor-map-html/)，复用用户脚本里的专属标识，采用官方支持的图片嵌入。以下是配置字段说明：

```json
{
  "enabled": true,
  "provider": "mapmyvisitors",
  "siteHosts": ["biohai.github.io"],
  "widgetKey": "这里填真实的 d 参数值",
  "statsUrl": "https://mapmyvisitors.com/web/这里填真实地图编号"
}
```

上面仅是字段说明，不能作为可用统计代码；实际配置文件已填入用户提供的真实 Key。用户未提供 `/web/...` 统计详情页地址，因此 `statsUrl` 暂时留空，不推测页面编号，地图也不显示错误的详情链接。以后拿到详情地址后补入即可，不影响地图计数。统计 Key 是用于网页嵌入的公开标识，不要把账户密码或管理令牌填进配置。更换正式域名时同时更新 `siteHosts` 并在服务商处配置对应网站。

本地预览、未列出的域名与无效配置不会加载追踪图片，避免测试访问混入正式数据。启用后，每个页面只加载一个地图图片，由服务商统计访问与大致地域，不与浏览器定位权限联动；短暂停留也可能计入，因此不使用滚动到页脚后才加载的懒加载方式。访问次数与独立访客的口径以服务商说明为准。正式地图请求 1200px 宽度及与站点一致的浅蓝陆地、浅色海洋配色，避免放大服务商默认的 180px 缩略图。图片加载过程中显示本地陆地轮廓，加载失败时显示错误状态，不伪造访问量。[服务商隐私说明](https://mapmyvisitors.com/b/policy)列出了 IP、浏览器与页面信息的处理方式。

预览底图为 Natural Earth 1:110m 陆地数据，不含国家边界；[数据属于公开领域](https://www.naturalearthdata.com/about/terms-of-use/)。原始数据来自 [Natural Earth 官方维护仓库](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson)，生成工具是 `tools/build-world-map.cjs`，产物为 `images/brand/world-land.svg`。

## 研究资料

2026-11-26 的资料整理见 `RESEARCH-SOURCES.md`。`tools/fetch-*.cjs`、`tools/update-publications.cjs` 和 PDF 工具为资料整理脚本，不在网站运行时执行；缓存保存在仓库外的 `../.research-cache/`。PDF 工具需要 `pdfplumber`、`pypdfium2` 和 Pillow。下载工具中的代理地址用于当前本地环境，迁移环境时请按实际网络调整。

Vue 的 MIT 许可保留在 `assets/js/vendor/VUE-LICENSE.txt`。原站模板许可及署名保留于 `LICENSE.txt`、`README.txt` 和页脚。论文图片版权归原作者及出版方所有。

`tools/optimize-images.py` 使用 Pillow 生成论文与照片的 WebP 缩略图，并写入数据的 `thumbnail` 字段；论文原图仍供放大预览。修改图片后可重新执行该脚本。

`tools/subset-chinese-font.py` 使用 FontTools 与 Brotli，从缓存的 Google Fonts 原始字体生成站内中文 WOFF2 子集；新增中文内容后可重新运行。网站预览不需要安装这些资料整理依赖。两款字体的 OFL 许可位于 `assets/fonts/`。
