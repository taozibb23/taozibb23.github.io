---
title: 从初学者的视角领会 C++ 构造函数初始化列表
description: 初始化列表和函数体里赋值到底差在哪、必须用初始化列表的三种情况、顺序陷阱——用可运行的例子说清楚。
pubDate: 2026-08-08
tags: [C++, 构造函数, 入门教学]
csdn: https://blog.csdn.net/2604_96052374/article/details/163569061
---

## C++ 构造函数初始化列表

首先我们要引入一个类，类的作用顾名思义，就是在一个东西里面放相关的函数和参数，就比如：

```cpp
class Dog {         // 类：定义了狗狗的行为
public:
    void bark() { std::cout << "汪汪汪\n"; }
};

int main() {
    Dog dog1;    // dog1 是 Dog 类型的对象(实例化)
    dog1.bark();  // 调用这个 dog 对象的方法，就是 Dog 这个类里面的函数
    return 0;
}
```

类里面还可以储存属性，把类理解成一个工具包这个工具包是一个量产的，对于修理一个特定款式的汽车需要的工具，当然这个量产的工具箱就不能修完还要额外加一些其他的工具（这里把他当作一个模板也就是量产的），总的来说类是一个模板，实例化的对象就是根据模板创造的具体实例，当然你也可以针对一个物品进行特定的设计的一个类，可以让代码更加简洁更加优美没那么冗余。

```cpp
class Dog {
public:
    std::string name;               // 加入一个成员变量，狗狗的名字
    void bark() { std::cout << name << ":汪汪\n"; }
};

int main() {
    Dog dog1;
    dog1.name = "桃子味的狗";  // 输出成员变量
    dog1.bark();
    return 0;
}
```

我们可以把类想象为一个制造汽车的图纸，成员函数和成员变量是图纸里面对于零件的描述，对象就是我们把这样的图纸制造出来的实车，构造函数就是在汽车出厂之前的零件装配，在创建对象的时候自动执行的函数，用来初始化对象。

```cpp
class Dog {
public:
    std::string name;
    // 构造函数：参数为 dogName
    Dog(std::string dogname) {
        name = dogname;
    }
    void bark() { std::cout << name << "汪汪汪\n" << std::endl; }
};

int main() {
    Dog mydog("桃子味的狗"); // 实例化的同时还传参初始化，也可以理解为一种类模板的定制
    mydog.bark();
    return 0;
}
```

这一种在类里面的构造函数体内赋值的方法，还有一种叫做初始化列表的方法更加优雅。

那么为什么优雅呢？我举一个例子，如果类的成员是 const，创建对象创建完了就不能改变了。再有一个说法：有些成员必须在对象创建的时候就初始化，不能先创建对象再来去赋值。

```cpp
class Cat {
public:
    const std::string species;
    Cat(std::string s) : species(s) {}
};   // 对应 const 成员不能先实例化再赋值

name = dogName  // 直接在函数主体{}之前用 : name(dogName) 来起到相同的作用

class Dog {
public:
    std::string name;
    // 初始化的写法
    Dog(std::string dogName) : name(dogName) {
        // 函数体里面没有东西
    }
};
```

下面我们来解释一下 Dog(std::string dogName) : name(dogName) {}

Dog(std::string dogName)：构造函数，接收一个 string 类型的参数，内部用 dogName 来代替，也可以说是内部的临时名字。
这个冒号是说明后面是初始化列表的意思。

name(dogName) 的意思是用 dogName 来初始化成员变量 name。dogName 是传入来的值，name 是类里面或者说实例化对象里面的成员变量。
