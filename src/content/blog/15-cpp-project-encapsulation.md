---
title: C++ 项目封装:从原理到实践
description: 参考同济 25 赛季代码,把"为什么要把功能封装成类"讲清楚:头文件、接口设计、构造与生命周期,从原理到动手实践。
pubDate: 2026-08-12
tags: [C++, 工程实践, 项目封装]
csdn: https://blog.csdn.net/2604_96052374/article/details/163704318
---

## C++项目封装学习笔记

> 本文基于同济大学25赛季RM视觉代码进行学习。
> 

### 一、类与命名空间

我们写C++有时候开头会写 `using namespace std`，使用 `std`

命名空间，我们所用的`cout`、`endl` 等等都是在这个命名空间里面。

我们也可以自己创建一个命名空间，叫做 `io`，就像创建了一个文件夹。`io::CBoard` 就是去 `io` 里面找到 `CBoard`。同样，`class` 类也是一个小文件夹，这里默认大家都了解过了。

```cpp
#include <iostream>
#include <string>

namespace io {
    class MinCBoard
    {
    public:
        MinCBoard() {
            std::cout << "[MinCBoard] Created." << std::endl;
        }
        std::string imu_at(int timestamp) {
            return "q at " + std::to_string(timestamp) + "ms";
        }
        int mode = 0;
    };
}

int main() {
    io::MinCBoard cboard; // 这里就是在io命名空间里面找到类MinCBoard，再用这个类来创建cboard对象
    return 0;
}
```

我们都知道，类创建对象之后可以用 . 号来调用对象里面的成员函数

### 1.1 箭头符号 -> 的困惑

对于 tools::logger()->info() 这种类的调用，第一次接触会觉得很模糊，尤其是 -> 这个符号。

```cpp
#include "tools/logger.hpp"

int main() {
    tools::logger()->info("Hello from test_logger!");
    tools::logger()->info("Switch to {}", "auto_aim");
    return 0;
}
```

意思是在 tools 这个命名空间里面找到 logger 这个函数。这个函数不是 class 类里面的构造函数，而是 tools 里面的一个普通函数。因为这个函数返回的是一个指针，所以用 -> 来访问指针指向的对象的成员。

### 二、智能指针与内存管理

下面我们来举一个例子，说明为什么 logger() 返回指针。

```cpp
#include <iostream>
#include <memory>
class Logger
{
public:
    void info(const std::string &msg) {
        std::cout << "[INFO]" << msg << std::endl;
    }
};

std::shared_ptr<Logger> logger() {
    return std::make_shared<Logger>(); // 在堆上创建对象，并返回智能指针
}

int main()
{
    auto log = logger();
    log->info("Hello shared_ptr");
    auto log2 = log;
    log2->info("log2 work");
    return 0;
}
```

这里涉及到智能指针和内存管理。

我们先理解 `std::shared_ptr<Logger> logger()`：把它当作一个函数，返回一个指向 Logger 类的智能指针。auto log 就变成了指向 Logger 类型的指针，而 log 就是实例化的对象，所以用 -> 来访问指针指向的类成员。

其实这只是把普通类型实例化的对象变成了指针类型实例化的对象，访问类里面的内容的方式符号变了而已。

智能指针可以自动管理内存。平时我们初学者会出现很多空指针，还有使用完指针不销毁（内存泄漏），这是错误且危险的。

那么为什么要返回指针呢？对于 info 这样的打印日志功能，我们可能会在多个地方调用它。如果每次都复制一个对象，会浪费内存和性能。而使用智能指针（尤其是 shared_ptr）可以共享同一个对象，同时自动管理生命周期，既简洁又安全。

### 三、构造函数与初始化列表

```cpp
#include <iostream>
#include <memory>
#include <string>

class MinCBoard
{
public:
    MinCBoard(const std::string &config_path)
        : can_id_(0x100) // 初始化列表：把 can_id_ 设置成 0x100
    {
        std::cout << "[MinCBoard] constructor called, config = " << config_path << std::endl;
        std::cout << "[MinCBoard] can_id_ = 0x" << std::hex << can_id_ << std::endl;
        // std::hex 让 int 的值用十六进制表示
    }

    std::string imu_at(int timestamp) const {
        return "q at " + std::to_string(timestamp) + "ms";
    }

private:
    int can_id_;
};

int main()
{
    std::shared_ptr<MinCBoard> cboard = std::make_shared<MinCBoard>("configs/standard3.yaml");
    std::string q = cboard->imu_at(10);
    std::cout << q << std::endl;
    return 0;
}
```

#### 3.1 构造函数带参数

**MinCBoard(const std::string &config_path)** 是构造函数带参数的写法。构造函数会在创建对象的时候自动调用，也就是自动接收初始化路径的这个参数。

#### 3.2 智能指针与对象创建

`std::shared_ptr<MinCBoard> cboard = std::make_shared<MinCBoard>("configs/standard3.yaml");`

结合上面的智能指针，这里是创建一个指向 MinCBoard 类型的共享智能指针；后面是创建这个指针的同时实例化了这个对象，并且在 () 内传入了初始化所需的字符串内容。

#### 3.3 初始化列表

初始化列表就是在构造函数参数列表的后面，通过 : 来初始化成员变量。例如 : can_id_(0x100) 表示把 can_id_ 的值赋值为 0x100。

#### 3.4 const 成员函数

std::string imu_at(int timestamp) const 这里的 const 说明这个函数是只读的，不会修改对象的成员变量。这和函数参数中的 const 作用类似，都是为了增强代码的安全性和可读性。
