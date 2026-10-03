/**
 * 全站身份配置 —— 改名字、加链接只需要改这一个文件
 */
export const SITE = {
  /** 作者名(想用真名就改这里) */
  author: 'taozibb',
  /** 站点标题 */
  title: 'taozibb 的博客',
  /** 副标题 / 一句话定位 */
  tagline: '从像素到毫米 —— 机器人视觉工程落地手记',
  /** SEO 用描述 */
  description:
    '机器人视觉 / 感知 / 算法部署方向的技术博客:YOLO 训练、ONNX 部署、ROS2 集成、相机标定、PnP 测距、卡尔曼滤波,记录每一步的实测数据与踩坑。',
  /** 一句话自我介绍(首页 hero) */
  intro: '把视觉算法跑通、部署到真实机器人上——每一个数字都可溯源。',

  social: {
    github: 'https://github.com/taozibb23',
    csdn: 'https://blog.csdn.net/2604_96052374',
    /** 邮箱改成你自己的;不用就留空字符串,页面上会自动隐藏 */
    email: '',
  },
} as const;
