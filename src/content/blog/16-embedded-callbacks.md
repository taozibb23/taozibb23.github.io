---
title: 嵌入式 C 与 C++ 封装的回调函数
description: 函数指针怎么当回调、std::function 加 std::bind 好在哪、嵌入式的定时器和串口回调怎么落地——C 与 C++ 两种写法对照。
pubDate: 2026-08-13
tags: [C++, 嵌入式, 回调函数]
csdn: https://blog.csdn.net/2604_96052374/article/details/163717885
---

## 嵌入式与C++项目封装里的回调函数

### 什么是回调函数？

回调函数，简单说就是：**在某个特定事件发生的时候，会被自动调用的函数**。

比如在嵌入式里：

- 一个引脚默认上拉，是高电平。
- 当外界输入低电平时，引脚捕获到电平跳变，就会触发一个回调函数。
- 如果你在回调函数里写“点亮LED”的逻辑，就实现了引脚变化控制灯亮。

又比如：
- 外部中断触发
- 定时器时间到了
- 串口收到数据

这些事件发生的时候，芯片需要处理数据，但**你不知道什么时候会来**。所以就把处理函数提前注册进去，等待触发。

### 嵌入式里的回调注册

```c
void my_function(void) {
    // 这是我的处理代码
}

// 把 my_function 的地址注册给芯片
register_interrupt_handler(my_function);
```

当对应事件发生时，芯片就会自动调用 my_function。

### 函数指针是什么？

我们知道，指针是存储一个变量地址的东西。比如：

int x = 5;

int *p = &x;  // p 存储了 x 的地址

那么函数指针，就是存储函数地址的变量。

```c
void my_function(int value){
    printf("%d\n", value);
}
```

如果我们把 my_function 的地址存到一个变量里，之后就可以通过这个变量来调用它。

在 C 里，声明一个指向“接收int参数、返回void”的函数指针，可以这样写：

```c
typedef void (*callback_t)(int);
```

void：函数的返回类型，这里是空。

(int)：函数接收一个 int 参数。

callback_t：这个指针类型的名字。

*：说明它是一个指针。

所以合起来就是：callback_t 是一个指向“接收int、返回void”函数的指针类型。

### GPIO回调

```c
#include <stdio.h>

// 定义一个处理函数
void gpio_change(int pin) {
    printf("GPIO %d changed\n", pin);
}

// 定义一个指向函数的指针变量
void (*callback_ptr)(int);

// 注册函数：接收一个函数指针，存储到全局变量
void GPIO_set_callback(void (*cb)(int)) {
    callback_ptr = cb;
}

// 检测函数：模拟检测到了哪一个引脚
void GPIO_PIN_detect(void) {
    int pin = 10;
    if (callback_ptr != NULL) {
        callback_ptr(pin);  // 调用回调函数
    }
}

int main() {
    GPIO_set_callback(gpio_change);  // 注册处理函数
    GPIO_PIN_detect();               // 检测到变化，回调触发
    return 0;
}
```

void (*callback_ptr)(int);：定义一个函数指针变量，指向“参数为int、返回类型为void”的函数。

GPIO_set_callback：接收一个函数地址，保存到全局变量中。

GPIO_PIN_detect：模拟检测到GPIO变化，检查回调指针是否为空，然后调用它。

因为 callback_ptr 在注册时被赋值为 gpio_change，所以：

```c
callback_ptr(pin);
等价于：
gpio_change(pin);
```

```text
你写的处理函数:  gpio_change(int)
        ↑
        | 地址
注册函数:   GPIO_set_callback(gpio_change)
        |
        v
全局变量:   callback_ptr = gpio_change

检测时:
GPIO_PIN_detect() -> 检查callback_ptr非空 -> callback_ptr(10)
        |
        v
相当于调用 gpio_change(10)
```
