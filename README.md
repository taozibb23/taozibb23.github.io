# taozibb 的个人博客

机器人视觉 / 感知 / 算法部署方向的技术博客。用 [Astro](https://astro.build) 构建,部署在 GitHub Pages。

**线上地址**:<https://taozibb23.github.io>

## 目录结构

```
blog/
├── astro.config.mjs          # 站点配置(site / base / 代码高亮主题)
├── public/
│   └── images/blog/          # 文章配图(文章里用 /images/blog/xxx.png 引用)
└── src/
    ├── config.ts             # ⭐ 站点身份:作者名、简介、GitHub/CSDN 链接,改这里
    ├── content/
    │   └── blog/             # ⭐ 文章目录:每篇一个 .md 文件
    ├── layouts/Base.astro    # 整站骨架(顶栏 / 页脚 / 主题切换)
    ├── components/           # 文章卡片、日期
    └── pages/                # 首页 / 博客列表 / 文章页 / 项目 / 关于 / RSS / 404
```

## 写一篇新文章

在 `src/content/blog/` 下新建一个 `.md` 文件,头部写这些(frontmatter):

```markdown
---
title: 文章标题
description: 一两句话摘要,会显示在列表卡片和搜索引擎里
pubDate: 2026-10-02
tags: [C++, ROS2]
# 可选:
# updated: 2026-10-05            修改过就写更新日期
# csdn: https://blog.csdn.net/…  已同步到 CSDN 就贴原文链接,页面会显示互链
# draft: true                    草稿:本地 npm run dev 能预览,build 时不会发布
---

正文从这里开始,标准 Markdown,图片放 public/images/blog/ 然后写 ![说明](/images/blog/xxx.png)。
```

保存后本地 `npm run dev` 就能实时看到;推送到 main 自动发布。**文件名就是链接**,例如
`01-8400-cards-to-box.md` → `https://…/blog/01-8400-cards-to-box/`,起了就别随便改名(外链会断)。

## 本地开发

```bash
npm install       # 第一次
npm run dev       # 开发预览,默认 http://localhost:4321
npm run build     # 产出静态文件到 dist/
npm run preview   # 本地预览 build 产物
```

## 部署(已配置完成)

本仓库部署在用户站 **https://taozibb23.github.io**(仓库名 `taozibb23.github.io`)。

- 推送到 `main` 分支 → GitHub Actions 自动构建并发布(`.github/workflows/deploy.yml`)
- 首次部署由 workflow 里的 `configure-pages(enablement: true)` 自动启用 Pages,无需手动设置
- 部署状态看仓库 Actions 页;线上验证:`curl -s -o /dev/null -w "%{http_code}" https://taozibb23.github.io/`
- ⚠️ 提交身份:仓库级已配置为匿名(`taozibb23` + noreply 邮箱),**不要**改成全局真名身份提交
- 改名/迁移到项目站的办法见 `AI_HANDOFF.md` 第 5 节

## 简历上怎么写这一行

> 个人博客(自建):Astro + TypeScript 静态站,CI/CD 自动部署至 GitHub Pages;内容为机器人视觉系列技术文章(训练/部署/标定/滤波/排错),与 CSDN 双向导流。

这一行同时证明了:前端工程能力、Linux/Node 工具链、Git 工作流、持续输出的技术写作——对"工程落地"岗位都是加分信号。

##  TODO(自己排期)

- [ ] 把 `04-camera-calibration` 里的标定照片换成更多批次对比图
- [ ] 07 篇补"跟住率阈值扫描"数据后去掉草稿标注
- [ ] 首页加演示 GIF(等 `out.mp4` 压缩后转成 GIF 入库)
- [ ] CSDN 六篇文章末尾加"本文同步发布于我的个人博客"反链(手动,每篇 1 分钟)
