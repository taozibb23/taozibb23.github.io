# taozibb 的博客

我的个人博客:机器人视觉 / 感知 / 算法部署方向的工程记录。线上地址:[taozibb23.github.io](https://taozibb23.github.io)

- **写什么**:YOLO 训练 → ONNX 导出 → C++ 推理 → ROS2 集成 → 相机标定 → PnP 测距这条链路上的每一步——怎么跑通、踩了什么坑、测出哪些数。写在这里的每个数字都能追溯到文件或命令,包括做砸的部分:怎么定位、怎么归因。
- **怎么做**:Astro 静态站,文章就是 `src/content/blog/` 里的 Markdown 文件;推送到 `main`,GitHub Actions 自动构建并发布到 GitHub Pages。
- **和 CSDN 的关系**:深度内容两边同步发布(我的 [CSDN 主页](https://blog.csdn.net/2604_96052374)),文章页附有原文互链。

## 目录结构

```
blog/
├── astro.config.mjs          # 站点配置(site / base / 代码高亮主题)
├── public/
│   └── images/blog/          # 文章配图(正文里用 /images/blog/xxx.png 引用)
└── src/
    ├── config.ts             # 站点身份:作者名、简介、GitHub/CSDN 链接
    ├── content/
    │   └── blog/             # 文章目录:每篇一个 .md 文件
    ├── layouts/Base.astro    # 整站骨架(顶栏 / 页脚 / 主题切换)
    ├── components/           # 文章卡片、日期
    └── pages/                # 首页 / 博客列表 / 文章页 / 项目 / 关于 / RSS / 404
```

## 发一篇新文章

往 `src/content/blog/` 放一个 `.md` 文件,头部写这些(frontmatter):

```markdown
---
title: 文章标题
description: 一两句话摘要,会显示在列表卡片和搜索引擎里
pubDate: 2026-10-02
tags: [C++, ROS2]
# 可选:
# updated: 2026-10-05            内容修订过就记一笔
# csdn: https://blog.csdn.net/…  已同步到 CSDN 就贴原文链接,页面会显示互链
# draft: true                    草稿:本地 npm run dev 能预览,构建时不会发布
---

正文从这里开始,标准 Markdown。图片放 public/images/blog/,正文里写 ![说明](/images/blog/xxx.png)。
```

文件名就是永久链接(如 `01-8400-cards-to-box.md` → `/blog/01-8400-cards-to-box/`),发布之后不再改名,避免外链失效。保存后本地 `npm run dev` 实时预览,推送到 `main` 自动发布。

## 本地开发

```bash
npm install       # 第一次
npm run dev       # 开发预览,默认 http://localhost:4321
npm run build     # 产出静态文件到 dist/
npm run preview   # 本地预览 build 产物
```

## 部署

推送到 `main` 分支即自动发布(`.github/workflows/deploy.yml`):build → deploy-pages。首次部署由 workflow 里的 `configure-pages(enablement: true)` 自动启用 Pages,不需要手动设置。

- 部署状态看仓库 Actions 页;线上验证:`curl -s -o /dev/null -w "%{http_code}" https://taozibb23.github.io/`
- 回滚用 `git revert <commit>` 再推送,不改写历史

改站的约定、内容纪律和常见任务清单写在 [AI_HANDOFF.md](AI_HANDOFF.md)。

## 近期计划

- [ ] CSDN 已发的六篇文章末尾加"同步发布于个人博客"的反链
- [ ] 演示视频压缩转 GIF,放进仓库 README 和首页
- [ ] 标定篇补充更多批次的对比照片
