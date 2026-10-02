---
title: 训练一个关键点模型,从何下手?YOLO26-pose 装甲板实战
description: 从数据集格式、冒烟测试到读训练日志:6732 张图训练 100 epoch,框 mAP50 0.842、角点 0.675,再导出 ONNX 验证无损。
pubDate: 2026-09-12
tags: [YOLO, 训练, ultralytics]
csdn: https://blog.csdn.net/2604_96052374/article/details/165122893
---

> 环境:Ubuntu 22.04 / RTX 4060 Laptop(8G 显存)/ ultralytics 8.4.142 / torch 2.14.0+cu130

有没有想过自己训练一个关键点的模型,但不知道从何处下手?今天就来教会你。

## 1. 数据集是什么样子的

打开我电脑的数据集:

```yaml
path: /home/user/vision_learn/视觉考核参考/XJTLU_2023_Keypoints_ALL  # 数据集根目录(必须改成自己电脑里面自己数据集的路径,不要照抄作者的……不然就报错找不到路径)
train: images/train   # 训练图目录,相对路径,在 images 下面的 train
val: images/val       # 验证图目录

names:                # 14 个类别,顺序决定"类号"
  0: B1
  1: B2
  ...
  5: BO               # 前哨站
  6: BS               # 哨兵
  7: R1
  ...
  13: RS
```

这里是决定类号码的地方,在上一篇文章提及的 14,就对应这里的 14 个类别,在 `names` 下。

`names` 的顺序决定了**类号**(B1=0 … RS=13);模型输出里该类分数所在的**行 = 4 + 类号**——别把"行号顺序"和"names 顺序"搞反了,4+14+8 这个数字结构里,其中的 14 就体现在这里。

```yaml
kpt_shape: [4, 2]     # 4 个角点,每个点 2 个值(x, y)
```

一开始从网上下载的预训练版本是 COCO 的,也就是已经训练过识别人的各个部位的预训练模型,它的关键点就是 `[17, 3]`,多了一个可见性。

```yaml
kpt_names:
  0: left_top         # 左上
  1: left_bottom      # 左下
  2: right_bottom     # 右下
  3: right_top        # 右上
```

这里决定了角点的顺序,也就是 4+14+8 里最后的 8;**顺序弄错了,后面的 PnP 就会错**。

下面打开任意一个 `labels/train/*.txt`:

```text
0  0.45230 0.86760 0.09718 0.07058  0.40442 0.84841 0.49863 0.84665 0.49786 0.88179 0.40595 0.89058
│  └────── 中心 x, y ──────┘ └─ 宽, 高 ──┘ └────────── 4 个角点的 (x,y) ──────────┘
└ 类号(0 = B1)
```

标签里面的所有数字都是 0~1 的,**包括宽和高都是 0~1 的**;但是像素的宽高是图片自己的属性,不存在标签文件里面。

这里其实有**两行**,一行可以是一个类型的目标。这里左上角的 0 说明它是前面 names 定义好的 B1 类别,说明 **names 的顺序是决定了类号的,行号的顺序并不是 names 的顺序,别搞反了**。

我们的规模是 train 4224 张照片(训练集)、val 2508 张(验证集),一共加起来有 6732 张。

第一次看到标签我都蒙了,要么都是数字要么是代号,后面才知道可以在 `names:` 下面清晰看到——在 `dataset.yaml` 里面有清晰的说明。

## 2. 训练环境

- 单独建立 venv 的环境,不污染系统环境
- 使用本地模型来进行配置文件的训练,没有下载 COCO 的预训练权重,又不需要担心 GitHub 的科学上网很慢,感谢清华大学镜像源!!!

```bash
python3 -m venv ~/yolo_env && source ~/yolo_env/bin/activate
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
pip install --timeout 120 ultralytics
```

第一次 install,Python 的包源直接卡爆了,因为下载的时候有默认的 timeout,只要超过就是报错超时了;这样就要重新换一个源去下载,或者检查一下网络。

## 3. 训练命令

训练的时候我们先拿一点点进行测试,看能不能跑起来,测试会不会报错——**提前解决,别到时候训练跑了一晚上还是报错**:

```bash
# 冒烟小测试:只取 5% 数据、1 个 epoch
yolo pose train model=<yolo26-pose.yaml> data=<dataset.yaml> epochs=1 imgsz=320 batch=8 device=cpu fraction=0.05
```

冒烟小测试之后再来进行正式训练(后台自动跑,加上显示日志;`batch=-1` 程序自己测试显存可以装得下多少):

```bash
nohup yolo pose train model=<yolo26-pose.yaml> data=<dataset.yaml> \
  epochs=100 imgsz=640 batch=-1 device=0 name=armor_yolo26 > armor_yolo26.log 2>&1 &
```

> ⚠️ 注意:同一条训练命令**别粘贴 2 次**,不要以为没反应就再训练,两个训练同时进行会抢显存,最后让电脑直接死机。
> 跑前先查找进程:`pgrep -af yolo`

如果中途断了(关机/断电/报错),不用从头来:

```bash
yolo pose train resume=True
```

## 4. 读训练日志

日志特别多,一整个屏幕都是英文,但不是全都需要看,匹配到字符串往下看就行。

**① 检查前面的**

```text
Ultralytics 8.4.142 🚀 Python-3.10.12 torch-2.14.0+cu130 CUDA:0 (NVIDIA GeForce RTX 4060 Laptop GPU, 7806MiB)
```

看是不是 `CUDA:0` + 显卡的名字,如果不是的话可能就会显示 CPU,CPU 训练很慢,要去检查显卡的驱动有没有安装。

**② 模型会自动适应你的配置**

```text
Overriding model.yaml kpt_shape=[17, 3] with kpt_shape=[4, 2]
Overriding model.yaml nc=80 with nc=14
```

翻译成人话就是:一开始是 17 个点、3 个参数,改成了 4 个点、2 个参数;原来的 80 个类别改成了 14 个装甲板的类别。

**③ 数据扫描**

```text
train: Scanning .../labels/train.cache... 4224 images, 0 backgrounds, 0 corrupt
val:   Scanning .../labels/val.cache...   2508 images, 0 backgrounds, 0 corrupt
Using 4224 train, 2508 val images for fraction=1.0 at imgsz=640
```

扫描一下看看数据集有没有其他问题:`0 corrupt` 就是没有坏的图片,数量也是和以前一致的,说明我们的路径写得没问题了、yaml 也写对了。

**④ 训练中**

```text
    Epoch    GPU_mem   box_loss  pose_loss  kobj_loss   cls_loss    l1_loss   rle_loss  Instances       Size
    1/100      1.71G      4.083      6.495          0      13.86    0.01343      228.8         45        640  384/384
  100/100      2.37G      1.264     0.8603          0     0.7401   0.003852      1.037         13        640  384/384
```

看 loss 参数:

1. `box_loss` 说的是框框相差了多少,从原来的 4.083 变成了 1.264
2. `pose_loss` 看角点相差多少,从 6.50 到 0.86,也下降了
3. `kobj_loss` 我们这次任务没有用上
4. **batch(批次)**就是一次喂给模型多少张图片,`batch=-1` 就是让模型自己计算,大概是 11 张一批次

**一个 epoch(轮)**要 4224 张图片全部过一遍,但是是**分 384 个批次**去进行的;`384/384` 不是除法,而是进度条,说明 384 个批次全部跑完了。

`Instances=45` 说明我这一批次有 45 个标注的目标,不是 45 张图片的意思。

`kobj = keypoint objectness`,关键点"有无"的损失(当时我直接查 AI 才知道它是正常的,我自己不知道是什么)。

**⑤ 验证表格:也就是模型对于 val 的考试分数**

```text
                 Class     Images  Instances      Box(P          R      mAP50  mAP50-95)     Pose(P          R      mAP50  mAP50-95)
                   all       2508       3225       0.85       0.76      0.842      0.559      0.744      0.662      0.675       0.61
                    B1        228        313      0.936      0.703       0.87      0.531      0.738      0.558      0.618      0.588
                    B2        249        362      0.872      0.834      0.916      0.582      0.851      0.815      0.888      0.853
                    B3        194        246      0.715       0.74      0.792      0.582      0.576      0.598      0.589      0.518
                    R1        167        225      0.871      0.569       0.73      0.434      0.855      0.564       0.71      0.661
```

把这个表格划分成两块:一块是 **Box**,考核的内容是框框;一块是 **Pose**,考核的内容就是角点。

这里又要重复一下上一篇文章的内容:**P 精确率**还有 **R 召回率**。

- P 指的是我们报出来里面对的比例,解决有没有**误报**的问题
- R 指的是我们在所有真的装甲板里面抓到了多少个,解决有没有**漏报**的问题

后面有两个最终的成绩来说明:

- **mAP50** 说的是只要我们的框框和人工标注的框框重合过半了,就可以算你对了
- **mAP50-95** 说的是 IoU 门槛取 0.50、0.55、0.60……0.95 共 10 档,每档算一次 AP,再取平均

我们可以看数据进行比较,比如 B2 的角点 mAP50-95 的分数很高,0.853 了;B1 的话只有 0.588,我们就可以推测:有些类别的装甲板模型学得很好,有一些学得比较差,这些类别就可以加一些样本,在下一次训练的时候。

从这个成绩表格我们就可以知道了——训练本就是一轮复习的习题册,涵盖老师给的知识点;模型啊,就像我们的小镇做题家拼命做,我们没有好的数据集就相当于没有好的教育资源,有的人出生就在罗马,本身数据集就好,甚至可能知道 val 的东西,哎～

训练集合太多,就比如学生做很多同样子的题目,都知道"全是三长一短就选短"这种歪门邪道的规律,这就会导致作业的错题数还在减小,但考试的分数不再上涨甚至下降,就是开始背答案、找歪门的规律了——这是因为练得太多了,不一定是训练集合太多的问题,还可能是数据太单一的问题。这给称为**过拟合**。

验证集合也就是**密封的高考卷子**,学生绝对不能看到,看到了高考分数就没意义了。

## 5. 调节阈值

用刚刚训练好的模型跑测试的视频,看看测试结果,我们只修改置信度:

```bash
yolo pose predict model=runs/pose/armor_yolo26/weights/best.pt source=armors_yolo_test.mp4 conf=0.25 save=True
yolo pose predict model=runs/pose/armor_yolo26/weights/best.pt source=armors_yolo_test.mp4 conf=0.1  save=True
```

我们从 conf 还有前面的 P、R 可以了解到:**conf 可以说是一个 P/R 的旋钮**来调节。

conf 大的话就是精确拉高;conf 调低的话就是召回的多,可以说是"宁可杀错也不可以放过"。

## 6. 导出 ONNX,并且看看有没有坏掉

```bash
yolo export model=runs/pose/armor_yolo26/weights/best.pt format=onnx imgsz=640
```

产物是 `.onnx` 后缀的。`.pt` 文件只有 ultralytics 自己可以看得懂,部署到 C++ 的时候要采取一些通用的格式,和上一篇文章说的统一格式和数据一样。

怎么说明导出的没有坏掉呢?用 ultralytics 加载 `.onnx`,如果效果和 `.pt` 的一模一样,那么就没有坏掉:

```bash
pip install onnxruntime -i https://pypi.tuna.tsinghua.edu.cn/simple
yolo pose predict model=runs/pose/armor_yolo26/weights/best.onnx device=cpu \
  source=armors_yolo_test.mp4 conf=0.25 save=True
```

> ⚠️ 坑:onnxruntime 的 GPU 版要求 CUDA12 全家桶(cublas/cufft/curand/cusolver/cusparse)+ cuDNN9,而 torch 自带的是 CUDA13 的库,版本只差一个数字就找不到库了,最后止损用 `device=cpu` 验证,效果一致。

## 7. 作者犯的错

1. NVIDIA 的驱动没有安装,直接报错了,GPU 训练弄不了,还要记得重启
2. 同一个训练的命令粘贴了 2 遍,直接电脑死机冒烟
3. CUDA 版本差一个数字就找不到库
4. pip 换清华大学的源会更快
5. 代码的坑(变量遮蔽、死循环、没重编译、看图被旧图骗)在上一节

## 8. 小结

从 6732 张图、100 个 epoch,到框 mAP50 0.842 / mAP50-95 0.559、角点 mAP50 0.675 / mAP50-95 0.61 的模型;再到 ONNX 导出、C++ 推理落地——**"训练 → 导出 → 部署"整条链路打通了**。

下一篇:把模型的输出真正变成机器人能用的东西——坐标还账回原图、跑视频流、接进 ROS2 节点,再往上是 EKF 滤波与 PnP 姿态解算。
