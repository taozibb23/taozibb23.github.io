---
title: C++ 多线程基础入门
description: thread 怎么起、join 为什么不能忘、数据竞争怎么发生、mutex 和 lock_guard 怎么用——从零跑通的入门笔记。
pubDate: 2026-08-08
tags: [C++, 多线程, 入门教学]
csdn: https://blog.csdn.net/2604_96052374/article/details/163592952
---

## 多线程

- 多线程是什么
- std::thread 的基本用法
- join有什么用
- 线程函数带参数
- 传成员函数与对象时为什么要用指针

想象我们在写程序入口都是main函数按照流水线一样按顺序执行main的命令：

```cpp
main(){
    //任务1
    //任务2
    //任务3
    //.........
}
```

### 1. 多线程的比喻（多线程是什么）

按照任务1 → 任务2 → 任务3 → … 往下执行任务。就比如我们是一个厨师需要备菜 → 洗菜 → 切菜 → 炒菜才能完成一道菜，不能一边洗菜一边备菜或者切菜。多线程就相当于影分身之术一样“雇佣”了多一个人，在你炒菜的时候帮你备菜洗菜等等。放在更大的项目里面，main函数承担的就不是厨师，可能是整个餐厅的角色，一个餐厅也有很多任务需要同时进行来提高效率。

```cpp
main(){
    洗第一个菜（线程1）     炒菜（线程2）
              |                  |
    洗第二个菜（线程1）     炒菜（线程2）
              |                  |
    洗第三个菜（线程1）     炒菜（线程2）
              |                  |
       无任务（线程1）	   炒菜（线程2）
}
```

### 2. std::thread 最简单的用法（基本用法）

于是任务的进行就变成上面的样子，接下来我写一个简单的程序实例：

```cpp
#include <iostream>
#include <thread>

void printNumbers(){
    for(int i = 0; i <= 5; i++){
        std::cout << "子线程执行任务" << i << std::endl;
    }
}

int main(){
    // 创建一个线程名字叫做t，让这个对象t执行printNumbers任务
    std::thread t(printNumbers); // 创建任务之后就开始运行了

    //----------------
    std::cout << "主线程执行任务" << std::endl;

    // 等待子线程结束
    t.join();  // 阻塞主程序使其等待子任务执行完毕

    std::cout << "子线程结束，主线程也执行完毕，可以退出" << std::endl;
    return 0;
}
```

### 3. 为什么要 t.join()？

这里面有一个细节：t.join() 是等待子线程执行。试想主线程是洗菜，子线程是炒菜的话，我洗菜洗完了按道理主程序就要结束了，可是炒菜的子线程没执行完，这样都没完成任务就上菜，还不让子程序炒菜了。对于这样的情况，我们用了一个t.join(); 阻塞，意思是等待t线程执行结束才会继续。如果子线程没结束就退出main函数的话程序就会崩溃。

### 4. 带参数的线程函数

我们也可以让线程执行函数带参数：

```cpp
#include <iostream>
#include <thread>

void greet(const std::string& name){
    std::cout << "你好呀 " << name << std::endl;
}

int main(){
    std::thread t(greet, "peachpuppy"); // 函数名字后面加上参数
    t.join();
    return 0;
}
```

### 5. 成员函数作为线程函数

这个就是函数带参数的简单示例。下面我再来举例成员函数的调用。如果是成员函数就要：

```cpp
Puppy d;
std::thread t(&Puppy::saywww, &d);  // 相当于d.saywww()
```

&Puppy::saywww：成员函数指针，说明线程要执行哪一个类的哪一个成员函数。

&d：对象指针，说明在类的哪一个对象上面调用这个函数。

如果还有其他参数就直接往后写：

```cpp
std::thread t(&Puppy::name, &d, "peachpuppy");
```

那么可能就会有疑惑了：为什么传入成员函数和对象需要传入指针？如果传入的是Puppy，程序会自动的拷贝，也就是复制一份新的，在新的上进行后续操作并且不会影响原来的那个对象吗？传入指针是为了保证在这个子线程是操作原对象。

下面举一个例子来说明演示一下：

```cpp
class Counter{
public:
    int value = 0;
    void add(){
        for(int i = 0; i < 10; i++){
            value++;
        }
    }
};

int main(){
    Counter test;
    std::thread t1(&Counter::add, test);   // 这里传对象本身，不是指针
    t1.join();
    std::cout << "传对象本身而不是传指针：" << test.value << std::endl;
    return 0;
}
```

运行之后发现输出是0，说明是拷贝了一个新的对象没起到作用，这时候就要传入对象地址来修改原来对象的值。
