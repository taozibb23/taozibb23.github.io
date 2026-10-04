---
title: 第一次给战队仓库提 PR:从 clone 到 CI 绿
description: 接手空仓的第一步不是写算法,而是让仓库能被构建、被 CI 看见:package.xml、分支模型、SSH 推送、colcon 验证,再到小步提交开 PR。
pubDate: 2026-10-01
tags: [ROS2, Git, 团队协作, 战队实战]
---

> 素材来自我向战队仓库 `foray_auto_aim` 提交的第一个 PR(`chore: 初始化 ROS 2 包骨架`)。

## 一、背景:为什么第一个 PR 是"骨架"而不是功能

我接手的 `foray_auto_aim` 是一个**空仓**(只有 README / plan / tree / decision 这些文档)。

一开始我以为可以直接写算法,结果第一步就卡住:**`colcon build` 报 `0 packages`**——因为 ROS 2 里**「包 = 一个目录 + `package.xml`」**,没有它,`colcon` 根本不认识这个目录。

更隐蔽的是 CI:仓库的 `ci.yml` 里写着「探测是否存在 `package.xml`,不存在就**跳过** ROS 2 构建」。

也就是说,**没有 `package.xml`,你后面推的所有代码都不会被编译、不会被测试**。

所以我给自己定的第一个 PR 是:**让这个仓能被编译、被 CI 看见**——一行算法都不写。

## 二、前置:让 Git 能推代码

```bash
# ① 身份(提交记录里会显示这个名字)
git config --global user.name  "你的姓名"
git config --global user.email "你的邮箱"

# ② SSH key(push 用;HTTPS 克隆能读,但推不上去)
ssh-keygen -t ed25519 -C "你的邮箱"
cat ~/.ssh/id_ed25519.pub        # 复制 → GitHub → Settings → SSH and GPG keys

# ③ 验证
ssh -T git@github.com            # 出现 "Hi <用户名>!" 就成功

# ④ 把远端换成 SSH
git remote set-url origin git@github.com:<组织>/<仓库>.git
```

> ⚠️ 踩坑:我第一次用 HTTPS 克隆,`git push` 直接失败——**读和写是两套认证**。

## 三、流程(7 步)

```bash
# 1. 克隆(工作区惯例:<ws>/src/<包名>)
mkdir -p ~/work/foray_ws/src && cd ~/work/foray_ws/src
git clone https://github.com/<组织>/<仓库>.git
cd <仓库>
git remote -v                    # 有输出 = 这是"正本"

# 2. 切到开发分支(不是 main!)
git checkout dev

# 3. 从 dev 切出自己的功能分支
git checkout -b feat/build-skeleton

# 4. 写文件(package.xml / CMakeLists.txt / .clang-format)

# 5. 本地验证
cd ~/work/foray_ws && colcon build          # 必须在工作区根目录跑!
colcon test --packages-select <包名>

# 6. 小步提交
git status                                  # 先看改了哪些文件
git add .clang-format package.xml CMakeLists.txt
git diff --staged                           # 提交前最后看一眼
git commit -m "chore: 初始化 ROS 2 包骨架"

# 7. 推送 + 开 PR
git push -u origin feat/build-skeleton      # 第一次要 -u
# GitHub 网页 → Compare & pull request → ⚠️ base 选 dev
```

## 四、三个值得记的点

1. **base 分支选 dev**:开 PR 时 GitHub 默认 base 是 main,选错了合并方向就全错——提交之前多看一眼。
2. **colcon 在工作区根目录跑**:在包目录里跑不报错,但产物结构不对,后面 `source install/setup.bash` 会找不到。
3. **CI 绿才算完**:本地 build 过不等于 CI 过,CI 用的依赖和干净环境会暴露本地装了但没写进 `package.xml` 的依赖。

## 五、小结

第一个 PR 没有一行算法,但它让之后的每一行算法都能被构建、被测试、被 review。**先修路,再跑车。**
