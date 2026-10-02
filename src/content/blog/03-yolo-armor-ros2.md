---
title: 把 YOLO 装甲板检测接进 ROS2:从单机程序到图像话题
description: 把 C++ 推理管线包成 ROS2 Humble 节点:节点骨架、cv_bridge 发布图像话题、RViz2 验证,以及用 ldd / readelf 定位 libonnxruntime SONAME 问题的完整过程。
pubDate: 2026-09-14
tags: [ROS2, 部署, C++]
csdn: https://blog.csdn.net/2604_96052374/article/details/165356050
---

> 环境:Ubuntu 22.04 / ROS2 Humble / onnxruntime(CPU)/ OpenCV 4.5.4

上一个博客我们完成了 C++ onnxruntime 的全部流程:预处理、解码、NMS、画框,再到输出视频。

这一期我们要引入 ROS2 系统来学习:对于单机的模式,我们收发消息很局限;在机器人或者上位机的时候,我们有很多设备需要收发消息,单机模式要维护、要添加新设备、要改逻辑代码,都会很麻烦,同时通信也是非常麻烦的一个问题。ROS2 的出现解决了这个问题。

机器人是多模块的协作系统:相机的视觉,后面发展可能有触觉,统称为感知系统,到检测、决策、控制,每一个部分都是一个节点,各个模块都需要串联起来通信,要做到**可解耦、可替换、可复用**,这样维护和质量都可以保证。在工程上,我觉得**成本、质量**这两个非常重要,而 ROS2 这个系统就可以减少很多维护成本。

## 一、ROS2 的最小概念

**节点 node**

节点就是在 ROS2 里面能够独立收发消息的、有自己名字的计算单元。有了节点我们才能利用节点收发信息,一个程序可以有多个节点。后面的 RViz2 也是一个节点,它订阅了消息才能显示出来。

我自己的比喻:**节点 = 快递员**(能收能发、有工号),**话题 = 驿站**(有名字/地址),**消息 = 包裹**(有格式和内容)。不用一对一送货上门,发到驿站,谁需要谁来取,很方便。RViz2 就是"另一个快递员",它到 `/armor_image` 这个驿站去取包裹(图像)来显示。

**话题 topic**

字符串 `"/armor_image"` 可以理解成一个驿站的名字,或者驿站地址。

**消息 message**

类型 `sensor_msgs::msg::Image` + 内容,说明信封的格式和内容。

**发布 publish**

`pub->publish(*bridge.toImageMsg())` —— 把信封投进去。

**订阅 subscribe**

在终端先查看 topic 发布的 hz,再进入 RViz2 里面去新增 topic,把消息取出来查看。

**cv_bridge**

作为一个翻译官,把 OpenCV 图片的信息转化成 ROS2 的图像消息。

## 二、节点代码骨架(5 部分)

```cpp
int main(int argc, char** argv) {
    rclcpp::init(argc, argv);                                  // ① 启动 ROS2
    auto node = rclcpp::Node::make_shared("armor_yolo_node");   // ② 建节点
    auto pub = node->create_publisher<sensor_msgs::msg::Image>(
        "/armor_image", 10);                                   // ③ 建发布者(话题+队列)
    // ④ 主循环(读帧 → 处理 → 发布)
    while (rclcpp::ok() && cap.read(frame)) { /* ... */ }
    rclcpp::shutdown();                                        // ⑤ 收尾关停
    return 0;
}
```

- `rclcpp::init`:初始化、启动 ROS2
- 建立节点:节点就是在 ROS2 里能独立收发消息、有自己名字的计算单元
- 建立发布者:也就是把接收信件的接收口打开,`<>` 里面决定驿站里可以装什么类型的东西;**话题的名字就写在建立发布者的这个函数里**
- 主循环:正常的干活处理逻辑。`rclcpp::ok()` 可以让你通过 Ctrl+C 退出——但不是直接退出,而是 Ctrl+C 触发了一个 **SIGINT 信号**去通知 rclcpp,rclcpp 收到 SIGINT 的时候 `ok()` 才变成 false,循环才结束(这样能优雅收尾,而不是被强杀)
- `shutdown`:ROS2 关闭、收工、释放资源

**队列长度 10**:发布者的驿站容量。当订阅者来不及处理的时候,可以缓存 10 条;满了就把旧的丢掉(默认行为)。队列太小 → 缓存少、延迟低,但容易丢;队列太大 → 抗突发,但延迟高。

## 三、六个封装好的处理函数

我个人觉得封装函数还是挺有讲究的:在一大个处理逻辑里面拆分流程、分模块处理,函数要清晰明了,一个函数解决一个问题,还要可复用、减少代码冗余——**优美的代码,我的梦啊**。

| 函数 | 干什么 | 输入 → 输出 |
|---|---|---|
| `makeLetterbox` | 把图片等比缩放,补上 114 的灰边 | 入 `img` → 出标准 640 画布,并用 `&` 带出 `scale` |
| `toTensor` | 交换色序(变成后续需要的 RGB)、除 255 归一化、按色序分册 | 入画布 → 出打包好的 3 张 640×640 |
| `decode` | 读取 8400 份档案,筛选出规定的 conf | 入 `const float* p`(输出数字带起点)+ `int64_t total`(8400)→ 出 `std::vector<Det>`(conf 达标的候选列表) |
| `iou` | 计算两个框的重合度 | 入 `const Det& a, const Det& b` → 出 `float`(0~1) |
| `nmsTopK` | 每一簇只留最好的两个 | 入 `const vector<Det>&`(前提:已按 conf 降序)→ 出 `vector<int>`(保留下标) |
| `draw` | 把缩放后算出来的坐标按原比例还原,再绘制图框 | 入 `cv::Mat& img, const vector<Det>&, const vector<int>&, float scale` → 出 `void`(直接改图) |

**几个要点**:

- `scale` 从 `makeLetterbox` 计算后出来,一直贯穿到后面的 `draw`
- `Ort::Session` 只需要打开一次模型:每次重新打开都要花时间,打开了一直用,用完再关闭就好
- **为什么发布的是 `frame` 而不是 `canvas`**:`canvas` 是给模型看的 640 灰边图片;但是给别人、给下游的时候,需要的是原先的分辨率、没有灰色边界的图片,而 `draw` 是还原之后画的,所以发布在 `frame` 上面
- **`env/session/cap/writer/pub/node` 全程存活**:它们写在 `while` 外面,只构造一次,程序结束时才销毁;而 `frame/canvas/input/outputs/dets/kept/scale` 是每帧重建的——因为每一帧的数据都不一样,不重建就会拿到上一帧的旧结果

## 四、p、d、dets

- `p` 是把视频变成 frame 给模型之后,模型输出的那一串数字。`p` 是 **26×8400 = 218400 个输出数字的起点地址**;模型输出的一串数字用于后面判断,conf 是其中 14 个类别分取出最大值的产物
- `p` 就是一个指针,指向模型输出数据的第一位的地址
- `d` 是**一个候选的卡片**:填着 conf、类号、框、4 个角点;循环所有候选,取得模型觉得好的候选——只有通过 conf 门槛的候选才建卡片,建完放进 `dets`
- 理解了 `p` 的含义,就知道上一节 `p[k * total + i]` 的含义了
- `p` 是指针的话,`p[2]` 就是从 `p` 起偏移 2 个位置,也就是第三个元素

三者的关系整合起来就是:`p` 从模型那里拿出数据,`d` 暂时存一个数据、判断是否合格,合格的才放到 `dets` 里面。

## 五、C++ 的一些语法

- `->` 通过指针调用函数:`指针->函数()` 等价于 `(*pub).publish(...)`,`pub` 是 `make_shared` 出来的智能指针
- `*` 解引用:`p` 是地址的话,那就打开地址里面的东西 → `*p`
- 优美的 lambda:`[](const Det& a, const Det& b){ return a.conf > b.conf; }`

## 六、结合 ROS 和判断流程的逻辑图

```text
读一帧
 ├─1 预处理:makeLetterbox(frame, scale) → toTensor
 ├─2 推理  :CreateTensor → session.Run
 ├─3 后处理:decode → sort → nmsTopK
 ├─4 画框  :draw(frame, dets, kept, scale)
 └─5 发布  :cv_bridge 打包 → pub->publish
```

## 七、实测效果

当我用 ROS2 纯转发视频的时候有 **20Hz**,但是接入推理之后,直接下降到了**几 Hz**——利用 CPU 推理太慢了(这个瓶颈在后面会解决,后面的博客会出一期)。

RViz2 出现绿框的时候直接爽炸了:YOLO 推理画框跟 OpenCV 比没有那么稳定,但是识别的也挺快的,旋转的装甲板都能识别出来,感觉跟加了卡尔曼一样。

## 八、作者踩的坑:libonnxruntime.so.1: cannot open shared object file

同样的找不到路径:动态库的小名,在运行的时候找不到路径;**编译可以找得到库,但是运行的时候不一定找得到库,不能对等**。

**现象**:一开始跑得好好的,但是接入 ROS2 后呢就报错:

```text
ros2 run armor_pkg armor_yolo_node
/home/user/ros2_ws/install/armor_pkg/lib/armor_pkg/armor_yolo_node: error while
loading shared libraries: libonnxruntime.so.1: cannot open shared object file
[ros2run]: Process exited with failure 127
```

第一反应应该是"没装这个库吗",但是我记得装了,看文件夹里面也有。

**然后我开始定位**:

1. 我想是编译期间还是运行期间?编译已经通过了 → 那就是运行的问题
2. 差别在哪里呢?自己写的时候是用 g++ 编译运行的,手写了告诉它库在哪里;但是 colcon 和 CMake 出来的可执行文件默认没有带上这个
3. 给出假设:可能是安装的时候缺少了 path,或者需要一条动态库的软链接

**验证**(这两条命令能一眼定案):

```bash
ldd ./install/armor_pkg/lib/armor_pkg/armor_yolo_node | grep onnx
readelf -d ./install/armor_pkg/lib/armor_pkg/armor_yolo_node | grep -i rpath
```

- 第一条看到 `libonnxruntime.so.1 => not found`
- 第二条没有输出(没有 rpath)

**修复**:

```bash
# 临时:当前终端指路
export LD_LIBRARY_PATH=/home/user/yolo_env/lib/python3.10/site-packages/onnxruntime/capi:$LD_LIBRARY_PATH
```

```cmake
# 永久:CMake 里给目标加 rpath
set_target_properties(armor_yolo_node PROPERTIES
  BUILD_WITH_INSTALL_RPATH TRUE
  INSTALL_RPATH "/home/user/yolo_env/lib/python3.10/site-packages/onnxruntime/capi")
```

另外最后还补了一条动态库的软链接:`ln -s libonnxruntime.so.1.23.2 libonnxruntime.so.1`

**经验**:编译期能找到 ≠ 运行期能找到。看到 `cannot open shared object file` 就用 `ldd` 先看一眼,基本能立刻定位。

**顺便记一下"怎么向 AI 求助"**(这个很重要,而不是全部丢给 AI 看):

1. 你的目的是什么、要做什么、要实现什么目标
2. 报错的原文
3. 首先要说自己做了什么、层次定位在哪个区间出的问题、结果咋了
4. 自己的判断是哪个范围,给 AI 一个范围(而不是让它从零猜)

## 九、小结与下一篇

这一篇把单机的 C++ 推理管线接进了 ROS2:节点骨架、发布带框图像话题、RViz2 可视化,以及"运行期找不到库"这个经典坑的完整定位过程。

下一篇:**相机标定**——打印棋盘格 → `cv::calibrateCamera` → 内参/畸变系数 → `undistort` 验证,之后把输入从"视频文件"换成"相机帧/相机话题"。
