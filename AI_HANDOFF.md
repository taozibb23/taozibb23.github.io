# AI 协作与维护指南

> 这份文档写给**下一个接手的 AI(或未来的我)**。目标:不依赖本次对话的任何记忆,10 分钟内能安全地改这个站、发布文章、处理部署。
> 配套文件:`README.md`(面向人类的使用说明)、`restore-notes.local.md`(本地私有,不入库)。

---

## 1. 这是什么

个人技术博客,主题:机器人视觉 / 感知 / 算法部署。Astro 5 静态站,部署在 GitHub Pages(用户站 `taozibb23.github.io`),推送到 `main` 分支即自动构建发布。

**站点的存在目的**:求职展示面。面试官从简历点进来,5 分钟内应该能确认三件事——有真实项目、有量化数据、持续输出。一切改动以这个标准衡量。

## 2. 结构地图

```
blog/
├── astro.config.mjs        # site/base/代码高亮;base 保持 '/',除非换项目站部署
├── public/
│   ├── images/blog/        # 文章配图(正文里写 /images/blog/xxx.png)
│   ├── favicon.svg
│   └── robots.txt          # 里面的域名跟着部署地址走
└── src/
    ├── config.ts           # ⭐ 全站身份:作者名、一句话定位、GitHub/CSDN 链接(改动最频繁)
    ├── content.config.ts   # frontmatter 的 zod schema(加字段先改这里)
    ├── content/blog/       # ⭐ 文章(每篇一个 .md,文件名 = 永久链接,起了别改名)
    ├── layouts/Base.astro  # 顶栏/页脚
    ├── components/         # PostCard / FormattedDate
    ├── pages/              # index(首页) / blog/ / projects / about / 404 / rss
    └── styles/global.css   # ⭐ 设计令牌在 :root 一段(纯亮色,无暗色主题)
```

> 视觉语言:Apple 风(参考 apple.com,2026-10-02 五改定稿;此前巨构/漫画涂鸦/软萌玻璃/素描线稿四版均被否)——
> #f5f5f7/白全宽分节交替(.band--gray/.band--white),超大紧字距标题(-0.03em),名字与全站不加彩色(.grad 仅兼容旧标记、同墨色),
> 毛玻璃胶囊导航,玻璃白卡 28px 圆角,蓝色药丸按钮 #0071e3,发布式大数字统计排(.cloud-row 四列+发丝线)。
> 首页博客预览 = 横向画廊(.scroller):全部文章,scroll-snap 居中对齐,卡宽 (100vw-5rem)/3 一屏三张,
> view(inline) 滚联动画做纵深阶梯强调(中 opacity1/scale1.06 → 邻 0.5/0.86 → 远 0.3/0.7,透视侧倾 ±14°/±8°),
> 侧卡 cover-flow 环绕(rotateY ±13°→0 连续插值,track 父级 perspective 1400px 供灭点);
> 鼠标拖动滑动(pointer 流 1:1 跟手,松手吸附整卡,拖动超 6px 的点击被抑制防误导航,
> 触屏走原生滑动),圆形箭头按卡宽步进(端点禁用,<900px 触屏隐藏),手机卡宽 84vw;
> 首屏苹果式精简:导语一句话、统计标签短化、区块间距收紧。
> ⚠️ 3D 命中测试坑:preserve-3d + 卡内 perspective() 会让 elementFromPoint 命中网格本身(点击失效)——
> 若复用 3D,灭点必须由父级 perspective 属性提供,禁止两者叠加。
> ⚠️ 跨浏览器:滚动驱动动画声明必须包 @supports(animation-timeline)——不支持的浏览器(Firefox/旧 Safari)
> 里无时长动画会 0s 定格末帧(整排淡框,用户实测踩坑);这些浏览器走 JS 回退(Base.astro
> bindEmphasisFallback,按与画廊中心距离套同一套阶梯,rAF 节流;测试钩子:html.sdt-off + window.__bindEmphasis)。
> ⚠️ DOMRect 没有 clientWidth 属性(元素才有)——回退函数曾因此 NaN 全空。
> ⚠️ 触摸滚动:横向滚动容器禁止设 touch-action: pan-x(会挡住从卡片区域竖向滚页)。
> ⚠️ 3D 命中测试:preserve-3d + 卡内 perspective() 会让侧卡 elementFromPoint 命中网格本身(点击失效)——
> 灭点必须由父级 perspective 属性提供,禁止 preserve-3d 与卡内 perspective() 叠加。
> 项目详情页:/projects/rm-armor-vision/ 与 /projects/rm-project/,卡片 transition:name 与详情页头同名(点击长成)。
> 分舞台转场:进博客=blog-stage 推近、进项目=projects-stage 升起、进关于=about-stage 淡放,每入口专属专场。
> 丝滑浮现:[data-reveal]/[data-reveal-group] + IntersectionObserver(html.js 门控防 FOUC),
> 浮现双向可重触发(离开视口退场、重进重播,上下滚动都有转场),ClientRouter 页面切换交叉溶解+博客卡共享元素变形,hero 滚动缩放用 CSS animation-timeline: view() 渐进增强。一致性即美感:新模块不要自造花样,沿用现有令牌。

## 3. 常见任务(5 分钟一个)

**加文章**:在 `src/content/blog/` 建 `NN-slug.md`,frontmatter 必填 `title / description / pubDate / tags`,可选 `csdn`(CSDN 原文链接)、`updated`、`draft: true`(本地可预览,构建时跳过)。图片丢 `public/images/blog/`。构建后 `git push` 即发布。

**改首页数字/文案**:`src/pages/index.astro`(hero、终端窗口、指标卡、项目卡)+ `src/config.ts`(名字、定位句)。

**换配色**:只动 `global.css` 顶部令牌段(现在没有暗色主题,是纯亮色漫画分层风)。

**⚠️ 渲染性能红线(2026-10-02 血泪教训)**:这些写法会让内嵌浏览器整页栅格化卡死(截图超时、滚动掉帧):
- `filter: drop-shadow()` —— 云朵圆角盒上用 `box-shadow` 视觉完全等价且便宜,全站已统一 box-shadow,**不要再引入 filter**
- `position: fixed` 伪元素背景层 / `background-attachment: fixed` —— 背景网点与晕染画在 body 自身的多重背景上(随文档滚动),不要改回 fixed 层
改完样式必须实际截图/滚动验证,不能只看构建通过。

**改导航/页脚链接**:`src/layouts/Base.astro`。

**本地验收三步**(改完必做,别跳过):

```bash
npm run build                                   # 1. 必须零报错
grep -rn "敏感词" src/ README.md                 # 2. 按第 4 节红线扫一遍
npm run preview                                 # 3. 起服务,浏览器过一遍主要页面(亮/暗都切一下)
```

## 4. 内容纪律(最重要的一节,违反=帮倒忙)

1. **每个数字必须可溯源**。站上出现的指标(mAP50 0.842、标定 0.48px、549 行等)来自用户的私有素材库;要新增数字,必须让用户提供出处(文件/命令),查不到就不写,不许估。
2. **措辞红线**:不写用户没有亲手做过的成果;竞赛成绩只写用户本人所属的部分;"独立设计"只用于确有其事的模块(手写 C++ 部分),视觉链路整体用"完成/搭建/部署/调优"这类工程动词。细节以用户的私有求职画像为准(本地文件,见下)。
3. **隐私边界(2026-10-02 二次调整)**:公开站**不出现**学校名与真实姓名。战队信息按用户要求**以模块链接形式出现**(projects 页与首页的"战队视觉模块"卡,链 ZQU-Foray 组织的 foray_vision / foray_auto_aim / foray_interfaces 公开仓库);历史移除记录与恢复材料在 `restore-notes.local.md`(被 .gitignore 排除)。调整边界前先问用户本人。
4. **AI 辅助的表述**:文章可以写过程和方法,不主动写"这是 AI 写的";若用户被面试追问,按画像里的诚实话术回答。不要在公开内容里替用户宣称"全部独立从零实现"。
5. 负结果(对照实验没差异、预测跑输基线)是内容特色,保留,不要"优化"掉。

## 5. Git 与部署

**提交身份(每次 clone/重装后都要确认)**:公开仓库不能暴露真名/QQ 邮箱。本仓库已设置仓库级身份:

```bash
git config user.name  "taozibb23"
git config user.email "taozibb23@users.noreply.github.com"
git config --get user.name   # 确认输出不是真名
```

**发布流程**:

```bash
npm run build          # 本地先过
git add -A && git commit -m "post: 文章标题" && git push   # main 分支,推即部署
```

部署由 `.github/workflows/deploy.yml` 接管(build → deploy-pages)。检查状态:`gh run list`(装了 gh 的话)或仓库 Actions 页;上线后直接 `curl -s -o /dev/null -w "%{http_code}" https://taozibb23.github.io/`。

**回滚**:`git revert <commit>` 再 push,不要 force-push 改写历史。

**换项目站部署**(如果将来不用用户站):`astro.config.mjs` 的 `base` 改成 `/仓库名`,`robots.txt` 的 sitemap 域名同步改。

## 6. 与 AI 协作的标准开场

新会话给 AI 的提示词模板:

```text
请先读 blog/AI_HANDOFF.md 和 blog/README.md,遵守里面的内容纪律(第 4 节)。
我的任务是:<具体任务>
约束:只改 blog/ 目录;公开内容不出现我的学校/真名/战队信息;新增数字必须我提供出处。
完成后:npm run build 验证 + grep 红线扫描 + 告诉我需要 git push 几次。
```

给 AI 的注意事项:

- 环境注意:Ubuntu 22.04,Node 22;`gh` CLI 未必可用,SSH 认证可用(`git@github.com:taozibb23/...`)
- git 只用本仓库已配置的仓库级身份提交,**不要**改全局配置
- 站点参考素材在用户本地私有目录(求职画像、博客素材库);让用户粘贴需要的内容,不要把私有路径写进公开文件
- 大改布局前先 `npm run build` 确认基线是绿的,改完再跑一次;CSS 里 `.container-prose` 靠 `margin: 0 auto` 居中,别的类**不要用 margin 简写覆盖它**(2026-10-02 修过一次这种 bug)

## 7. 当前待办

- [ ] CSDN 六篇旧文末尾加"本文同步发布于我的个人博客"反链(手动,每篇 1 分钟)
- [ ] 演示视频压缩转 GIF 后加入仓库 README 与首页
- [ ] 07 篇补"跟住率阈值扫描"数据后去掉文首草稿标注
- [ ] 用户决定是否恢复战队信息(材料在 `restore-notes.local.md`)
- [ ] 08 篇草稿(在 `drafts-local/`)按同样纪律处理后再发布
