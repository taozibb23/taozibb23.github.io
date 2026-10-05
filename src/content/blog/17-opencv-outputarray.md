---
title: OpenCV OutputArray 机制:为什么 boxPoints 传空 vector 会崩
description: cv::boxPoints 传空 vector 直接崩溃:顺着源码看 OutputArray 的 create/getMat 机制,搞懂 OpenCV 输出参数到底要什么。
pubDate: 2026-09-05
tags: [OpenCV, C++, 源码追踪]
csdn: https://blog.csdn.net/2604_96052374/article/details/164398520
---

## 问题现象

当时调用 cv::boxPoints(rRect, emptyVector)，程序直接崩溃，报错是：

```cpp
d == 2 && (sizes[0] == 1 || sizes[1] == 1 ...)
```

函数原型是 void cv::boxPoints(RotatedRect box, OutputArray points)。

我一开始的想法是：创建一个 vector 来作为接收，也就是放在 OutputArray points 数组嘛，那就 vector 这样接受参数。后面就报错了。

**当时我觉得 vector<> 很万能，可以接收很多种类的参数**。在调用 cv::boxPoints(rRect, …) 的时候，后面是一个返回值，但是是 vector<> 类型的，当时运行就好像是报错了

一开始我就用蹩脚英语查，看看报错信息，看到是类型错误的问题，然后就问 AI，让 AI 帮我翻译报错，然后到最后才知道是返回值的类型错误。

## 源码追踪

查找源码，大概是这样的逻辑骨架：

```cpp
void cv::boxPoints( RotatedRect box, OutputArray _pts )
{
    _pts.create( Size(2, 4), CV_32F );   // "给我准备一个 4行×2列、float 单通道的容器"
    Point2f* pt = _pts.getMat().ptr<Point2f>();
    box.points( pt );                     // 往里写 4 个顶点 (x, y)
}
```

可见这里 create 了一个 4 行 2 列的单通道容器。

## 原因

报错的逻辑就是：d 维度，维度是 2 维度的，并且必须满足行或者列是一行或者一列。

boxPoints 的输出 OutputArray 要表示 box 的四个点的位置，而 vector 的逻辑就是只能说一行多少个数或者一列多少个数。

当然你可能想到 vector 这个方法了。这里直接说清：**findContours 的 contours 参数就是 `vector<vector<Point>>`**，OpenCV 对它有**专门**的 STD_VECTOR_VECTOR 处理路径，但 boxPoints 不是和这两个一个判断逻辑这里不说～

里面的判断逻辑是这样的：

```cpp
if (k == MAT) {                        // 你传的是 cv::Mat
    m.create(d, sizes, type);          // 任意维度、任意形状都接得住
}
else if (k == STD_VECTOR || ...) {     // 你传的是 std::vector<T>  ← 你在这
    CV_Assert( d == 2 && (sizes[0] == 1 || sizes[1] == 1 ...) );  // ★ 你撞的就是这行
    // 过了才继续：校验类型 → resize vector → 包一个 Mat 视图
}
else if (k == STD_VECTOR_VECTOR) { ... }   //
```

`vector<vector<Point>>`，有其他的判断逻辑在这里先不说啦～

总的来说，boxPoints 的输出是 4×2 的格式，vector 是一维的，Mat 可以是多维度的，所以用 Mat。

## 解决

别用 vector 接，改用 cv::Mat：

```cpp
cv::RotatedRect rRect = cv::minAreaRect(contours);
cv::Mat pts;                           // 用 Mat
cv::boxPoints(rRect, pts);             // 4×2 的 CV_32FC1
```

// 如果后面非要转 vector，自己再转（遍历 Mat 逐行取即可）

## 经验

这次知道的不单单boxPoints 有。而是凡是 OpenCV 函数参数带 OutputArray 的，输出优先用 cv::Mat 或明确形状的容器

| 函数 | OutputArray 参数 | 推荐输出类型 |
|---|---|---|
| cv::boxPoints | points | cv::Mat（4×2） |
| cv::findContours | contours | vector&lt;vector&lt;Point&gt;&gt;（特例，有专门路径） |
| cv::convexHull | hull | cv::Mat 或 vector（一维，可以） |
| cv::calcHist | hist | cv::Mat |

**所以大部分都用 Mat 就可以啦～除了 contours 之外**

可迁移的结论：

```
OutputArray 内部会根据你传的实际类型（Mat / vector / vector<vector>）走不同的分支。
std::vector<T> 只能表示一维数据（1×N 或 N×1）。
如果函数内部 create 的是二维及以上结构，必须用 cv::Mat。
std::vector<std::vector<T>> 有专门路径（STD_VECTOR_VECTOR），仅适用于特定函数（比如 findContours），不要想随便用vector mat才是比较万能的
```

记住当你看到 OutputArray这个输出参数的时候，先查一下函数输出的维度是多少。二维及以上 → 上 Mat；一维 → vector 可以；vector → 只有官方文档明确支持的函数才能用。
