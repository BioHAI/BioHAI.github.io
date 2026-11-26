# 研究资料整理记录

核对日期：2026-11-26。原始仓库版本：`c06a810`。本次未创建 commit，也未 push。

## 内容来源

- 近期论文目录：[曾湘祥教授湖南大学主页](https://csee.hnu.edu.cn/people/zengxiangxiang)。收录该页 2025、2026 年段落的 31 篇论文，与原站 22 篇记录去重后共 50 篇。
- 人员：保留原站 49 位成员及学生分组、入学年份。四位导师的简介、职称、研究方向、公开头像与招生信息均按当前官方主页更新，学生毕业状态未做推测。
- Research：按导师当前主页整理 15 项公开资助项目，标明周期和来源；原站历史项目与荣誉折叠保留。Openings 已改用当前招生信息，不再沿用原站的 2025 年名额。
- 视觉参考：[NCS Paper Figure Gallery](https://daydayup-xq.github.io/ncs-paper-figure-gallery/?discipline=ai-comp&sort=tier)。借鉴浅色画廊、标签、筛选及主图阅读方式，使用独立的响应式设计。

## 需要区分的记录

1. **TRACE** 和 **Expert-Inspired Multi-Agent Coordination**：教师主页在 2026 年段落中写作 AAAI 2025；以 [TRACE 的 AAAI 记录](https://ojs.aaai.org/index.php/AAAI/article/view/36971) 和 [MAMO 的 AAAI 记录](https://ojs.aaai.org/index.php/AAAI/article/view/40757) 为准，使用 **2026**。
2. **KGExplainer**：以作者 [ICLR 2025 官方代码仓库](https://github.com/xiaomingaaa/KGExplainer) 的正式版本标题 “Towards Synergistic Path-based Explanations for Knowledge Graph Completion: Exploration and Evaluation” 展示；教师主页列的是较早预印本标题。
3. **M²PO**：采用 [ACL 正式论文记录](https://aclanthology.org/2026.acl-long.469/) 的名称，补全教师主页中省略的上标。
4. **Unlocking diverse molecular binding modes using latent feature sampling**：期刊及年份按教师主页收录；当前原文入口及 Figure 1 来自作者 [Research Square 预印本](https://doi.org/10.21203/rs.3.rs-9511630/v1)，未假设一个未查得的 Nature DOI。
5. **SurfFlow**：会议年份按教师主页的 KDD 2025 记录；图像来自作者 2026 年上传的 [arXiv 版本](https://arxiv.org/abs/2601.04506)。
6. 作者顺序在可核对时以论文 / 正式记录修正，包括 SafeDrug、MAMO、AgentFold、LLaPA 和 ChemDual。

## 主图与缺口

47 篇记录已有真实封面，其中包括原站 21 个沿用封面及本次 26 个新获取封面；SketchMol 使用新核实的正式 Figure 1 替换原图。具体逐图来源见 `assets/data/figure-sources.json`。L²aCo 和 KGExplainer 使用作者官方代码仓库中的方法图；S²VM 使用正式论文 Figure 2。其他新封面使用 Figure 1。

以下 3 篇未取得可可靠核对的主图，继续保留在完整论文列表，首页画廊不展示虚构或错配封面：

- PI-EDG（NeurIPS 2026）：题目、作者与会议依据教师主页，尚未定位可靠的公开原文和主图。
- Physics-Informed Self-Supervised Learning on Efficient Electron-Density Images for Organic Material Property Prediction（ICML 2026）：同上。
- Self-supervised learning in drug discovery（2025）：正式 [DOI](https://doi.org/10.1007/s11432-024-4453-4) 已核实；公开出版页面未提供可核对的正文主图。

保留原作者及出版方版权，不使用 AI 生成图替代论文主图。所有新增封面随站点本地加载，不依赖论文站点图片热链。

## 导师、招生与指标更新

- [宋勃升官方主页](https://csee.hnu.edu.cn/people/songbosheng)：当前职称为教授；2027 年硕士、博士尚有名额，长期欢迎本科生参加科研。
- [刘元盛官方主页](https://csee.hnu.edu.cn/people/liuyuansheng)：当前职称为副教授、博士生导师；每年招收硕士 2 名，2027 年招收博士 1 名。
- [刘益萍官方主页](https://csee.hnu.edu.cn/people/liuyiping)：当前职称为教授；补充国家高层次青年人才、2026–2028 年青年项目（B 类）、当前研究方向及长期招生计划。保留学校邮箱并增加主页列出的 Gmail。
- [曾湘祥官方主页](https://csee.hnu.edu.cn/people/zengxiangxiang)：招生说明采用当前世界模型、空间智能、多模态方向和联合培养安排；主页未给出固定年度名额，因此不填写推测名额。

栏目统一使用 “Professors / 导师”，每张卡片按实际职称分别展示 Distinguished Professor、Professor 或 Associate Professor。

CCF 分类按 [CCF 人工智能目录](https://www.ccf.org.cn/Academic_Evaluation/AI/) 和 [数据库 / 数据挖掘 / 内容检索目录](https://www.ccf.org.cn/Academic_Evaluation/DM_CS/) 核对。EMNLP 标为 CCF-B；未从该目录定位的 ICLR 不强行添加等级。

IF 使用出版社公布的指标，明确标注指标年份，不与论文发表年份混用：

| 期刊 | JIF | 指标年份 | 官方来源 |
| --- | --- | --- | --- |
| Nature Machine Intelligence | 29.8 | 2025 | https://www.nature.com/natmachintell/journal-impact |
| Nature Communications | 18.1 | 2025 | https://www.nature.com/ncomms/journal-impact |
| Nature Protocols | 18.4 | 2025 | https://www.nature.com/nprot/journal-impact |

标签及引用数据保存在 `assets/data/venue-metrics.json` 和论文记录的 `quality` 字段。

湖南大学标识使用[大学官网](https://www.hnu.edu.cn/)的原版白色标识（`images/logo.png`、`images/foot-logo.png`），未重绘校徽。Manrope 和 Noto Sans SC 来自 Google Fonts 官方开源字体库，保留 OFL 许可；中文字体仅生成覆盖当前站点文字的 WOFF2 子集。
