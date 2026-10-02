---
title: 从 8400 张卡片到画出一个框:C++ 跑通 YOLO 姿态模型
description: 把训练好的 YOLO26-pose 装甲板模型导出 ONNX,用 C++ + onnxruntime 实现"预处理 → 推理 → 解码 → 去重 → 画框"全流程,记录输出张量 (1,26,8400) 的解码方法与踩坑。
pubDate: 2026-09-11
tags: [C++, ONNX, 部署]
csdn: https://blog.csdn.net/2604_96052374/article/details/164992742
---

> 环境:Ubuntu 22.04 / OpenCV 4.5.4 / onnxruntime 1.23.2(CPU 推理)/ RTX 4060 Laptop(训练用)

## 一、引入背景

在传统的 OpenCV 存在许多缺点,像是严格的导师,必须要每一道题目都做对、每一个逻辑都通过合适才能进入老师的法眼,所以大多数的学生(也就是装甲板)都不能通过老师的考试,成为我们世俗中优秀的学生——不单单指的是装甲板,还有我们。

于是有了 YOLO 的检测,它可以尽可能地发现一些有潜能的学生,而不是用一堆死板的八股文来束缚你们,从而 OpenCV 严格的导师只需要检测最重要的部分,而不是"死板的"条条框框。

> 注:并不是说 OpenCV 落后的意思,在 OpenCV 的阈值法里面鲁棒性太差了,这里只做一个类比,没有别的意思。

因为是跑在机器人上位机等等上面,所以用 C++ 是主流的部署方式。

`.pt` 文件只有 ultralytics 才能读懂,`.onnx` 是通用格式——**转化通用格式这一点需要一直注意,后面会提及很多次**。

轻则报错,重的根本很难排查出原因,就比如以前排查角度的 `armor.angle` 的那一次报错,也是很棘手的。

## 二、输入:模型吃什么样的图

我们输入一个张量——不需要管为什么叫做张量,把它想成一个"打包"的意思就可以了:

```text
{ 1 张图片, 3 个通道, 640 x 640 }
```

因为需要把图片打包成模型们统一的照片,所以才进行以下的预处理阶段。同时有很多情况是**遵循一致性原则**的。

### letterbox:等比缩放到 640×640 以内,小于 640 就用 114 补齐灰边

这也是统一性原则——训练是这个大小训练,那么部署也是。

```cpp
// 等比缩放 + 灰边,返回 640x640 的画布(预处理和画图共用同一张)
cv::Mat makeLetterbox(const cv::Mat& img, float& scaleOut) {
    const float scale = std::min((float)kInputSize / img.cols,
                                 (float)kInputSize / img.rows);   // 取小的,保证整图装得下
    scaleOut = scale;                                          // 还账时要用这个倍数
    cv::Mat resized;
    cv::resize(img, resized, cv::Size(cvRound(img.cols * scale),
                                      cvRound(img.rows * scale)));
    cv::Mat canvas(kInputSize, kInputSize, CV_8UC3,
                   cv::Scalar(kPadValue, kPadValue, kPadValue)); // 灰边 114
    resized.copyTo(canvas(cv::Rect(0, 0, resized.cols, resized.rows)));
    return canvas;
}
```

### BGR → RGB 转化也是同理的(一致性原则)

### HWC 转化成 CHW 是一个重点

说的是一个图片由 3 个颜色组成,也就是 3 原色组成的,但是机器不能同时识别,因为这是 3 个颜色的底片重合起来才组成的真实图片形成的样子,机器看不懂,机器只会学习其中的规律,当然只能一个颜色一个颜色地看,所以要把一张图片拆开,拆成 3 个底色、3 张图片,分别是 RGB 的颜色,再给机器进行学习。

> 专业的说法就叫做:**卷积是按照通道的面来进行计算的**,在这里是 3 个面,分成 3 个面就更加符合框架的规定,读写也更加高效。

```cpp
// BGR->RGB + 除以 255 + HWC->CHW(按颜色分三册)
std::vector<float> toTensor(const cv::Mat& bgrCanvas) {
    cv::Mat rgb;
    cv::cvtColor(bgrCanvas, rgb, cv::COLOR_BGR2RGB);

    std::vector<float> input(3 * kInputSize * kInputSize);
    for (int c = 0; c < 3; ++c)              // c = 第几本册子(0红 1绿 2蓝)
        for (int y = 0; y < kInputSize; ++y)
            for (int x = 0; x < kInputSize; ++x)
                input[c * kInputSize * kInputSize + y * kInputSize + x]
                    = rgb.at<cv::Vec3b>(y, x)[c] / kNormScale;
    return input;
}
```

### 最后除以 255 归一化

为了统一尺度,也使得推理和训练的数据值保持一致,最后统一除以 255,观察 0~1 的变化更加可观。

## 三、输出:26 × 8400 到底怎么读

好奇 8400 怎么来的?首先我列出:

```text
8400 = 80 x 80 + 40 x 40 + 20 x 20
```

因为我们识别的时候就把一张图片划分成像素点集合。比如一个图片输入是 640×640 的话,我们按照一个像素点为单位那就很细化分类了,训练起来会很久,我的破电脑也跑不动。

于是就出现了划分的方法,按照大、中、小的形式来划分,分别对应 20、40、80。因为按照较少的像素划分的话,得出来的信息更大,所以是 80。

那么为什么这样分呢?检测/机器学习的过程,把一张图片分成不同尺度的判断,这里主要是为了**不漏掉大、中、小的目标尺寸**。

这样相当于训练了 3 次(**并不是**),只是一份主干的训练有 3 个尺度的判断规则,或者说 3 个摄像头,可以识别这个物体在不同尺度下的样子,识别出来,很巧妙的想法。

### 还有为什么是 26 × 8400 呢?26 是哪里来的?

```text
26 = 4 + 14 + 8
```

下面来解释:

| 行号(从 0 开始数) | 内容 | 说明 |
|---|---|---|
| 0 ~ 3 | `cx, cy, w, h` | 框:中心 x、中心 y、宽、高 |
| 4 ~ 17 | 14 个装甲板类别的分数 | 分数范围是 0~1,数字越大说明把握越大(置信度 conf) |
| 18 ~ 25 | 8 个角点坐标 | 分别是左上、左下、右下、右上(逆时针),每个点有 xy,所以是 4×2 |

**类号 = 行号 − 4**(因为前面 4 行是框)。

### 那到时候怎么取出呢?

按照目前的逻辑,它像是一个矩阵,也就是 26 行 8400 列。放在程序里面我们需要它变成 vector 类型的格式(`vector<int>` 那种),把一个矩阵变成一行的数据,也就是把每一行往前面排、排成一长串。

很抽象,但是看这个解法——取第 k 行第 i 列的写法:

```cpp
// p 是那串数字的起点,total = 8400
p[k * total + i]
```

`k * total` 也就是 `k * 8400`,得出到达原来的多少行;`i` 是原来的多少列数。闭上眼睛想一想就可以知道,我觉得这个很巧妙。

程序就是把逻辑概念翻译成逻辑语言,再翻译成伪代码的语言,最后变成代码。

## 四、解码:读卡 + 筛卡

前面我们知道了 26 × 8400 的结构,到了现在我们要读取里面的数据并且筛选出来。代码是选择里面的 14 个类别的置信度来筛选的。

### P 和 R 的"性格按钮"

- **P(精确率)**:报出来的东西里面,真的对的比例就是 → 关注**误报**
- **R(召回率)**:真实存在的板子里面,我抓到了多少个 → 关注**漏报**

如果 conf 调低,R 上升,漏的少了,但是 P 小;同理可得,conf 高,P 高,但是漏掉的多了很多。

### 代码要实现 2 层循环(为什么是 2 层?)

调用的逻辑和上面的输出一样,用 `p[(4+k)*total + i]` 来调用。

> 3 层的循环是在 `toTensor` 里面;解码是获得 conf 的,也就是知道是 14 类别里面的哪一个,然后解开看(哨位 i × 类别 k)。

```cpp
// 解码:读 8400 张卡,筛出候选
std::vector<Det> decode(const float* p, int64_t total) {
    std::vector<Det> dets;
    for (int64_t i = 0; i < total; ++i) {                 // 哨位 i
        float best = 0.f; int bestCls = -1;
        for (int k = 0; k < kNumClasses; ++k) {           // 类别 k
            const float score = p[(kClassRow0 + k) * total + i];
            if (score > best) { best = score; bestCls = k; }
        }
        if (best < kConfThr) { continue; }                // 把握不够 → 丢掉
        Det d;
        d.conf = best; d.cls = bestCls;
        d.cx = p[0 * total + i]; d.cy = p[1 * total + i];
        d.w  = p[2 * total + i]; d.h  = p[3 * total + i];
        for (int k = 0; k < kKptRows; ++k)
            d.kpts[k] = p[(kKptRow0 + k) * total + i];
        dets.push_back(d);
    }
    return dets;
}
```

conf 调节信心:conf 越小的话,通过的候选者就更加多了(召回多了,误报也多了);越大的话(精确度高了,但是漏报的越多)。这是一个值得权衡的点。

## 五、去重复:IoU 与 NMS

因为有大、中、小 3 层的筛选哨兵来判断,学习给我们的结果里,多个识别组给我们的可能是同一类别的板子,需要用 IoU 来判断是不是同一个。太多重复的会影响后面的判断,太多重复的(也就是 IoU 重合度高的)会影响判断。

**与 conf 是相反的**:首先 IoU 不是筛选,只是判断是否指向同一个方向的意思,也就是是否同簇的意思。

我的选择是:经过排序之后再选择 top2。在一群数据集合中只选择 2 个就行,这样既保存了一定的样本,又起到筛选作用。如果只有一个的话样本太少了,我觉得 2~3 个左右最好——**需要预留几个给到 OpenCV 来进行筛选**。

```cpp
// IoU:两个框的重合度(0~1)
float iou(const Det& a, const Det& b) {
    const float ax1 = a.cx - a.w/2, ay1 = a.cy - a.h/2;
    const float ax2 = a.cx + a.w/2, ay2 = a.cy + a.h/2;
    const float bx1 = b.cx - b.w/2, by1 = b.cy - b.h/2;
    const float bx2 = b.cx + b.w/2, by2 = b.cy + b.h/2;
    const float ix1 = std::max(ax1, bx1), iy1 = std::max(ay1, by1);
    const float ix2 = std::min(ax2, bx2), iy2 = std::min(ay2, by2);
    const float iw = std::max(0.f, ix2 - ix1), ih = std::max(0.f, iy2 - iy1);
    const float inter = iw * ih;
    const float uni = (ax2-ax1)*(ay2-ay1) + (bx2-bx1)*(by2-by1) - inter;
    return (uni > 0.f) ? inter / uni : 0.f;
}

// NMS(宽松版):每簇最多留 kKeepTop 个候选(dets 已按 conf 降序)
std::vector<int> nmsTopK(const std::vector<Det>& dets) {
    std::vector<int> kept;
    for (size_t i = 0; i < dets.size(); ++i) {
        int sameCluster = 0;
        for (int idx : kept)
            if (iou(dets[i], dets[idx]) > kIouThr) { ++sameCluster; }
        if (sameCluster < kKeepTop) { kept.push_back((int)i); }
    }
    return kept;
}
```

> 记一条结论:**IoU 阈值方向和 conf 相反**——IoU 是"超过阈值就删除",所以阈值越高越少删、留得越多。

## 六、工程化:把代码拆成模块

数据流向是:

```text
makeLetterbox → toTensor → 模型 → decode → sort/nmsTopK → draw
```

每一次重构代码的时候都要想清楚:分模块的输入什么、输出是什么、函数起到什么作用、需要完成什么具体逻辑。

使代码更加简洁和更容易理解,不会有冗余的感觉。

## 七、作者自己遇到的问题(踩坑合集)

1. 在 **onnxruntime 推理**的时候,要求需要安装 CUDA12 全部;训练的 torch 自带的 13,版本只是差了一个数字,就找不到库了,直接。

2. 报错 `libonnxruntime.so.1` 找不到,是因为有 SONAME 小名。动态库里面内部登记的一个小名叫做 SONAME,比如 `libonnxruntime.so.1`,程序运行时只认小名;而文件夹里实际只有全名 `libonnxruntime.so.1.23.2` → 报 `cannot open shared object file`。
   解法:给小名建立软链接:

```bash
ln -s libonnxruntime.so.1.23.2 libonnxruntime.so.1
```

3. C++ 头文件的引用报错问题,以及学会了读日志、报错自行修复 bug 和问题。

4. **变量遮蔽**的问题:内层循环声明了多一个同名字的变量,导致把外层的 `i` 遮蔽了。

```cpp
for (size_t i = 0; i < n; i++) {        // 外层 i
    // ...
    for (size_t i = 0; i < n; i++) {    // 内层又声明 i → 遮蔽
        kept.push_back(i);              // 被重复添加
    }
}
```

5. **死循环**:在运行程序的时候,终端运行了但是迟迟没有返回结果,可能是卡在程序里面有个死循环了。

```cpp
// 凶手长这样:自增写错 + 结尾多一个分号 = 空循环体
for (size_t j = i + 1; j < dets.size(); i++);
```

6. 静态编译产物没有重新编译,或者没删除掉旧的结果,排查半天没发现。

7. 重构代码的时候**只改变结构,不改变行为逻辑**!!!

```bash
rm -f draw && g++ ...   # 强制重编译,避免旧二进制骗你
```

8. 看图片、还有显示出来的图片(imshow)会欺骗你,可能是旧的编译产物,需要打印出来终端进行判断。

## 八、小结与下一篇预告

这一篇从"模型输出 8400 张卡片"讲到"在图上画出一个框":预处理、输出布局、解码筛选、IoU 去重、工程化拆分,以及一路上的坑。

下一篇写**训练**:从零训练 YOLO26-pose 装甲板模型(14 类 / 4 角点),怎么读训练日志里的 loss / P / R / mAP,怎么调 conf,怎么导出 ONNX,以及部署时踩的坑合集。
