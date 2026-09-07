# Phony AI - 企业级AI电话外呼系统

## 1. 产品设计方案

### 1.1 项目概述

「Phony AI」是一款面向企业的智能AI电话外呼平台，帮助企业自动化批量通知客户订单状态，支持多语言AI语音对话、实时通话监控和数据分析。

**核心定位**：企业级AI电话外呼SaaS平台，适用于物流、电商、配送服务等需要批量客户通知的业务场景。

**整体调性**

- **配色**：深紫蓝为主色调，搭配活力橙作为强调色，传递科技感与专业信赖感
- **字体**：Inter 字体家族，现代简洁，适合数据密集型界面
- **氛围**：专业、高效、智能、可信赖
- **节奏/密度**：信息密度适中，关键数据突出，操作路径清晰

**设计宪法**

1. **精致感底线** — 视觉呈现必须达到专业产品级标准，禁止粗糙拼凑
2. **像素对齐** — 所有元素必须严格对齐到网格系统
3. **系统化圆角** — 卡片 12px、按钮 8px、标签 4px
4. **留白有节奏** — 相邻模块间距遵循递进关系 8/16/24/32/48
5. **数据可视化优先** — 关键指标使用图表和数字卡片突出展示
6. **操作反馈即时** — 所有操作在100ms内给出视觉反馈
7. **深色模式支持** — 完整适配暗黑主题，保护长时间使用者的视觉体验

---

### 1.2 模块结构与页面路由

#### 仪表盘 `/`

- **页面类型**：Dashboard
- **核心功能**：KPI概览、活动活动统计、最近活动列表、快速操作入口
- **数据维度**：总活动数、今日通话数、成功率、平均通话时长、活跃活动数
- **主要交互**：KPI卡片点击查看详情；活动列表点击跳转；快速新建按钮

#### 活动管理 `/campaigns`

- **页面类型**：列表页
- **核心功能**：活动列表展示、状态筛选、搜索、新建活动、启动/停止活动
- **数据维度**：活动名称、状态、创建时间、目标客户数、已拨打数、成功率
- **主要交互**：点击行查看详情抽屉；筛选栏；批量操作；新建活动弹窗
- **状态定义**：草稿/待启动/进行中/已暂停/已完成/已取消

#### 创建活动 `/campaigns/new`

- **页面类型**：表单页
- **核心功能**：活动信息填写、客户数据选择、AI语音代理配置、拨打设置
- **数据维度**：活动名称、描述、选择客户分组、语音代理、拨打时间窗口、重试次数
- **主要交互**：分步表单；客户选择器；时间窗口配置；预览确认

#### 活动详情 `/campaigns/:id`

- **页面类型**：详情页
- **核心功能**：活动概览、通话记录列表、实时监控、数据分析
- **数据维度**：活动信息、通话统计、客户响应列表、录音播放
- **主要交互**：Tab切换；录音播放；导出报告；编辑活动

#### 实时监控 `/monitoring`

- **页面类型**：看板
- **核心功能**：实时通话状态、活动进度、队列状态、系统负载
- **数据维度**：进行中通话、等待队列、成功率趋势、呼叫速率
- **主要交互**：WebSocket实时更新；点击通话查看详情；暂停/恢复活动

#### 客户数据 `/customers`

- **页面类型**：列表页
- **核心功能**：客户列表、数据导入、数据验证、搜索筛选
- **数据维度**：姓名、电话、订单ID、订单状态、导入时间、所属活动
- **主要交互**：Excel/CSV上传；验证结果展示；批量删除；编辑客户信息

#### 导入客户 `/customers/import`

- **页面类型**：表单页
- **核心功能**：文件上传、数据预览、字段映射、验证错误展示
- **数据维度**：上传文件、解析记录、验证状态、错误详情
- **主要交互**：拖拽上传；字段映射配置；错误下载；确认导入

#### 通话记录 `/calls`

- **页面类型**：列表页
- **核心功能**：通话记录查询、录音播放、转录查看、AI总结
- **数据维度**：客户信息、通话时间、时长、状态、转录、录音URL、AI总结
- **主要交互**：播放录音；查看转录；导出记录；筛选搜索

#### 通话详情 `/calls/:id`

- **页面类型**：详情页
- **核心功能**：通话详情、录音播放器、对话转录、AI分析
- **数据维度**：完整通话信息、逐句转录、客户情感分析、关键信息提取
- **主要交互**：录音播放控制；转录高亮；分享链接

#### AI语音代理 `/voice-agents`

- **页面类型**：列表页
- **核心功能**：语音代理管理、语音配置、对话脚本编辑
- **数据维度**：代理名称、语音类型、语言、状态、创建时间
- **主要交互**：新建代理；编辑脚本；测试语音；启用/禁用

#### 语音代理详情 `/voice-agents/:id`

- **页面类型**：表单页
- **核心功能**：代理配置、对话脚本编辑、语音参数设置
- **数据维度**：代理名称、开场白、对话流程、FAQ回答、语音参数
- **主要交互**：富文本编辑；语音试听；保存草稿；发布

#### 报表分析 `/reports`

- **页面类型**：Dashboard
- **核心功能**：活动报表、趋势分析、导出功能
- **数据维度**：按活动/时间/语言的统计报表、成功率趋势、通话时长分布
- **主要交互**：日期范围选择；图表切换；导出PDF/Excel

#### 系统设置 `/settings`

- **页面类型**：表单页
- **核心功能**：电话服务商配置、API密钥管理、通知设置、合规配置
- **数据维度**：Twilio/SIP配置、Webhook设置、通知渠道、DNC列表
- **主要交互**：表单配置；测试连接；保存设置

---

### 1.3 信息架构与导航体系

#### 整体布局

- **导航模式**：侧边栏导航（左侧固定）
- **侧边栏内容**：
  - Header：应用Logo + "Phony AI" 品牌名
  - 主导航：仪表盘、活动管理、客户数据、通话记录、AI语音代理、报表分析
  - Footer：用户头像 + 名称 + 设置入口
- **顶部栏内容**：页面标题 + 面包屑 + 全局搜索 + 通知铃铛 + 新建快捷按钮
- **内容区**：最大宽度1440px，内边距24px

#### 主导航结构

| 导航项 | 图标 | 路由 | 可见条件 |
|--------|------|------|----------|
| 仪表盘 | LayoutDashboard | / | 全部 |
| 活动管理 | PhoneCall | /campaigns | 全部 |
| 实时监控 | Activity | /monitoring | 全部 |
| 客户数据 | Users | /customers | 全部 |
| 通话记录 | History | /calls | 全部 |
| AI语音代理 | Bot | /voice-agents | Admin |
| 报表分析 | BarChart3 | /reports | 全部 |
| 系统设置 | Settings | /settings | Admin |

#### 响应式策略

- **桌面**（≥1280px）：完整侧边栏 240px + 内容区
- **平板**（768–1279px）：自动收起侧边栏为图标条 64px
- **手机**（<768px）：底部Tab导航 + 抽屉菜单

---

### 1.4 设计系统定义

#### 【视觉系统决策】

**1. 布局：L2 - 现代SaaS侧边栏**

- **侧边栏**：M2 模式，背景色 `hsl(222 47% 11%)`，宽度展开240px/收起64px
- **顶部栏**：高度64px，背景色 `hsl(0 0% 100%)` / dark `hsl(222 47% 11%)`
- **内容区**：最大宽度1440px，内边距24px
- **根背景色**：`hsl(210 40% 98%)` / dark `hsl(222 47% 7%)`

**2. 颜色**

- **主题色**：深紫蓝 Primary `hsl(250 95% 60%)`
  - Hover: `hsl(250 95% 55%)`
  - Light: `hsl(250 95% 95%)`
  - Border: `hsl(250 95% 85%)`
- **强调色**：活力橙 Accent `hsl(25 95% 55%)`
  - 用于重要操作、通知徽章、实时状态指示
- **中性色**：
  - 背景：50 `hsl(210 40% 98%)` / 100 `hsl(210 40% 96%)`
  - 文字：900 `hsl(222 47% 11%)` / 500 `hsl(215 16% 47%)`
  - 边框：200 `hsl(214 32% 91%)`
- **语义色**：
  - 成功：`hsl(142 76% 36%)`
  - 警告：`hsl(38 92% 50%)`
  - 危险：`hsl(0 84% 60%)`
  - 信息：`hsl(200 98% 45%)`

**3. 圆角：R3 - 现代柔和**

- 卡片：12px
- 按钮/输入框：8px
- 标签/徽章：4px
- 阴影级别：
  - 卡片：`0 1px 3px 0 rgb(0 0 0 / 0.1)`
  - 悬停：`0 4px 6px -1px rgb(0 0 0 / 0.1)`
  - 弹窗：`0 20px 25px -5px rgb(0 0 0 / 0.1)`

**4. 字体：F2 - Inter 家族**

- **标题**：Inter SemiBold
- **正文**：Inter Regular
- **字号层级**：
  - H1: 24px/32px
  - H2: 20px/28px
  - H3: 16px/24px
  - 正文: 14px/20px
  - 辅助: 12px/16px
  - KPI数字: 32px/40px
- **数字**：tabular-nums

**5. 图标：I2 - Lucide Icons**

- 风格：线性图标，2px描边
- 尺寸：默认16px，大图标24px

#### 【差异化说明】

- 采用深紫蓝主题色替代泛滥的蓝紫色，传递AI科技感
- 活力橙作为强调色，在深色侧边栏上形成强烈对比
- 数据卡片使用微渐变背景，提升层次感
- 实时状态使用脉冲动画，增强动态感知

#### 视觉 DNA

1. **数据可视化母题**
   - 类型：图表/数字卡片
   - 形式：圆角卡片 + 微阴影 + 渐变背景
   - 出现位置：仪表盘KPI、报表页、监控看板
   - 品牌含义：专业数据驱动决策

2. **实时状态脉冲**
   - 类型：动态指示器
   - 形式：绿色/橙色脉冲圆点
   - 出现位置：活动状态、通话中指示、在线状态
   - 品牌含义：系统活跃、实时响应

3. **深色侧边栏**
   - 类型：导航容器
   - 形式：深紫蓝背景 + 高亮活动项
   - 出现位置：全局导航
   - 品牌含义：专业、稳定、聚焦内容

#### 组件规格

- **按钮档位**：高度36px(默认)/32px(紧凑)/44px(大型)
- **输入框统一高度**：36px
- **聚焦ring**：2px主题色边框
- **表格行高**：48px
- **行hover色**：`hsl(210 40% 96%)`
- **Tag样式**：圆角4px，内边距4px 8px
- **Toast行为**：顶部居中，自动消失5秒

#### 信息密度

- **判断**：均衡
- **具体参数**：
  - 表格行高48px
  - 卡片padding 20px
  - 表单字段间距16px
  - 页面标题区margin-bottom 24px

---

### 1.5 交互模式与组件清单

#### shadcn 组件（25个）

`button`, `card`, `table`, `dialog`, `form`, `input`, `select`, `badge`, `dropdown-menu`, `tabs`, `skeleton`, `toast`, `sheet`, `alert-dialog`, `calendar`, `date-picker`, `progress`, `slider`, `switch`, `textarea`, `avatar`, `separator`, `scroll-area`, `tooltip`, `popover`

#### 第三方库

- `recharts` — 数据可视化图表
- `xlsx` — Excel文件解析
- `papaparse` — CSV文件解析
- `react-dropzone` — 文件拖拽上传

#### 特殊交互

1. **实时通话监控**：WebSocket连接，每秒更新通话状态
2. **录音播放器**：自定义音频播放器，支持播放/暂停、进度拖拽、倍速
3. **文件上传拖拽**：支持CSV/XLSX拖拽上传，实时预览解析结果
4. **数据验证反馈**：上传后立即显示验证结果，错误行可下载

---

### 1.6 状态与边界设计

#### 空状态

- **仪表盘无活动**：插画 + "暂无活动"文案 + "创建第一个活动"按钮
- **客户列表为空**：上传文件引导 + 模板下载链接
- **通话记录为空**：提示文案 + 活动选择引导

#### 加载态

- **页面加载**：骨架屏（KPI卡片 + 表格骨架）
- **按钮操作**：Spinner内嵌
- **数据提交**：按钮禁用 + 加载文字
- **文件上传**：进度条 + 百分比

#### 错误态

- **API错误**：Toast提示 + 重试按钮
- **表单验证**：字段级错误提示 + 聚焦错误字段
- **文件格式错误**：弹窗提示 + 支持格式说明

#### 空数据处理

- **表格空值**：显示"-"
- **缺失数据**：灰色提示文字"未设置"
- **加载失败**：错误提示 + 刷新按钮

---

## 2. 前端技术设计

### 2.1 技术栈

- **框架**：React 18 + TypeScript 5
- **构建**：Vite 7
- **UI库**：shadcn/ui + Tailwind CSS v3
- **路由**：React Router DOM v6
- **状态管理**：React Context + useReducer（本地状态）
- **数据获取**：自定义apiFetch hook
- **图表**：Recharts
- **文件处理**：xlsx, papaparse

### 2.2 项目结构

```
src/
├── pages/
│   ├── index.tsx              # 仪表盘
│   ├── campaigns/
│   │   ├── index.tsx          # 活动列表
│   │   ├── new.tsx            # 创建活动
│   │   └── [id].tsx           # 活动详情
│   ├── customers/
│   │   ├── index.tsx          # 客户列表
│   │   └── import.tsx         # 导入客户
│   ├── calls/
│   │   ├── index.tsx          # 通话记录
│   │   └── [id].tsx           # 通话详情
│   ├── voice-agents/
│   │   ├── index.tsx          # 语音代理列表
│   │   └── [id].tsx           # 语音代理详情
│   ├── monitoring.tsx         # 实时监控
│   ├── reports.tsx            # 报表分析
│   └── settings.tsx           # 系统设置
├── components/
│   ├── layout/
│   │   ├── AppSidebar.tsx     # 应用侧边栏
│   │   ├── AppHeader.tsx      # 顶部栏
│   │   └── AppLayout.tsx      # 布局容器
│   ├── dashboard/
│   ├── campaigns/
│   ├── customers/
│   ├── calls/
│   └── common/
├── hooks/
│   ├── use-api.ts             # API请求hook
│   ├── use-websocket.ts       # WebSocket hook
│   └── use-audio.ts           # 音频播放hook
├── lib/
│   ├── api.ts                 # API工具函数
│   └── utils.ts               # 工具函数
└── types/
    └── database.ts            # 数据库类型定义
```

### 2.3 路由配置

```typescript
const routes = [
  { path: '/', element: <Dashboard /> },
  { path: '/campaigns', element: <CampaignList /> },
  { path: '/campaigns/new', element: <CampaignNew /> },
  { path: '/campaigns/:id', element: <CampaignDetail /> },
  { path: '/customers', element: <CustomerList /> },
  { path: '/customers/import', element: <CustomerImport /> },
  { path: '/calls', element: <CallList /> },
  { path: '/calls/:id', element: <CallDetail /> },
  { path: '/voice-agents', element: <VoiceAgentList /> },
  { path: '/voice-agents/:id', element: <VoiceAgentDetail /> },
  { path: '/monitoring', element: <Monitoring /> },
  { path: '/reports', element: <Reports /> },
  { path: '/settings', element: <Settings /> },
  { path: '*', element: <NotFound /> },
];
```

---

## 3. 后端技术设计

### 3.1 技术栈

- **运行时**：Node.js + Express
- **语言**：TypeScript
- **数据库**：Supabase (PostgreSQL)
- **实时通信**：WebSocket (Socket.io)
- **文件处理**：Multer + xlsx/csv-parse

### 3.2 API设计

统一响应格式：
```typescript
// 成功
{ success: true, data: T }
// 失败
{ success: false, error: string }
```

### 3.3 路由模块

```
server/routes/
├── campaignRoutes.ts      # 活动CRUD + 启动/停止
├── customerRoutes.ts      # 客户CRUD + 导入
├── callRoutes.ts          # 通话记录 + 录音
├── voiceAgentRoutes.ts    # 语音代理管理
├── analyticsRoutes.ts     # 数据统计
├── uploadRoutes.ts        # 文件上传
└── websocketRoutes.ts     # WebSocket处理
```

---

## 4. 数据模型设计

### 4.1 表清单

| 表名（物理名） | 显示名 | 用途 |
|---|---|---|
| campaigns | 活动表 | 存储外呼活动信息 |
| customers | 客户表 | 存储客户订单数据 |
| calls | 通话记录表 | 存储每次通话详情 |
| voice_agents | 语音代理表 | 存储AI语音代理配置 |
| call_recordings | 通话录音表 | 存储录音文件信息 |
| campaign_customers | 活动客户关联表 | 关联活动与客户多对多关系 |

### 4.2 表结构详情

#### 活动表（campaigns）

用途：存储外呼活动基本信息和配置

核心字段：
- `id`: SERIAL PRIMARY KEY
- `corp_id`: VARCHAR(128) — 企业ID
- `emp_id`: VARCHAR(128) — 创建人ID
- `name`: VARCHAR(255) NOT NULL — 活动名称
- `description`: TEXT — 活动描述
- `status`: VARCHAR(50) DEFAULT 'draft' — 状态(draft/pending/running/paused/completed/cancelled)
- `voice_agent_id`: INTEGER — 关联语音代理
- `language`: VARCHAR(50) DEFAULT 'en' — 语言
- `time_window_start`: TIME — 拨打开始时间
- `time_window_end`: TIME — 拨打结束时间
- `max_retry_attempts`: INTEGER DEFAULT 3 — 最大重试次数
- `calls_per_minute`: INTEGER DEFAULT 60 — 每分钟拨打数
- `caller_id`: VARCHAR(50) — 主叫号码
- `scheduled_at`: TIMESTAMP — 计划启动时间
- `started_at`: TIMESTAMP — 实际启动时间
- `completed_at`: TIMESTAMP — 完成时间
- `is_deleted`: CHAR(1) DEFAULT 'n'
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

关联关系：外键关联 voice_agents.id

#### 客户表（customers）

用途：存储客户订单数据

核心字段：
- `id`: SERIAL PRIMARY KEY
- `corp_id`: VARCHAR(128) — 企业ID
- `emp_id`: VARCHAR(128) — 导入人ID
- `name`: VARCHAR(255) NOT NULL — 客户姓名
- `phone`: VARCHAR(50) NOT NULL — 电话号码
- `order_id`: VARCHAR(100) NOT NULL — 订单ID
- `order_status`: VARCHAR(100) NOT NULL — 订单状态
- `delivery_date`: DATE — 预计送达日期
- `courier_name`: VARCHAR(100) — 快递公司
- `tracking_number`: VARCHAR(100) — 快递单号
- `language`: VARCHAR(50) DEFAULT 'en' — 首选语言
- `city`: VARCHAR(100) — 城市
- `amount`: DECIMAL(10,2) — 订单金额
- `notes`: TEXT — 备注
- `validation_status`: VARCHAR(50) DEFAULT 'pending' — 验证状态(valid/invalid/pending)
- `validation_errors`: JSONB — 验证错误详情
- `is_deleted`: CHAR(1) DEFAULT 'n'
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

关联关系：独立表

#### 通话记录表（calls）

用途：存储每次AI电话外呼的详细记录

核心字段：
- `id`: SERIAL PRIMARY KEY
- `corp_id`: VARCHAR(128) — 企业ID
- `campaign_id`: INTEGER NOT NULL — 关联活动
- `customer_id`: INTEGER NOT NULL — 关联客户
- `phone`: VARCHAR(50) NOT NULL — 拨打号码
- `status`: VARCHAR(50) DEFAULT 'pending' — 通话状态
- `outcome`: VARCHAR(100) — 通话结果
- `started_at`: TIMESTAMP — 开始时间
- `ended_at`: TIMESTAMP — 结束时间
- `duration`: INTEGER — 通话时长(秒)
- `transcript`: TEXT — 通话转录文本
- `ai_summary`: TEXT — AI总结
- `customer_sentiment`: VARCHAR(50) — 客户情感
- `follow_up_required`: BOOLEAN DEFAULT false — 是否需要跟进
- `retry_count`: INTEGER DEFAULT 0 — 重试次数
- `recording_url`: VARCHAR(500) — 录音URL
- `is_deleted`: CHAR(1) DEFAULT 'n'
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

关联关系：外键关联 campaigns.id, customers.id

#### 语音代理表（voice_agents）

用途：存储AI语音代理配置和对话脚本

核心字段：
- `id`: SERIAL PRIMARY KEY
- `corp_id`: VARCHAR(128) — 企业ID
- `emp_id`: VARCHAR(128) — 创建人ID
- `name`: VARCHAR(255) NOT NULL — 代理名称
- `description`: TEXT — 描述
- `voice_type`: VARCHAR(50) — 声音类型(male/female)
- `voice_accent`: VARCHAR(50) — 口音
- `language`: VARCHAR(50) — 语言
- `greeting_script`: TEXT — 开场白脚本
- `main_script`: TEXT — 主对话脚本
- `faq_responses`: JSONB — FAQ回答配置
- `company_name`: VARCHAR(255) — 公司名称
- `is_active`: BOOLEAN DEFAULT true — 是否启用
- `is_deleted`: CHAR(1) DEFAULT 'n'
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

关联关系：独立表

#### 通话录音表（call_recordings）

用途：存储通话录音文件元数据

核心字段：
- `id`: SERIAL PRIMARY KEY
- `corp_id`: VARCHAR(128) — 企业ID
- `call_id`: INTEGER NOT NULL — 关联通话
- `file_name`: VARCHAR(255) — 文件名
- `file_url`: VARCHAR(500) — 文件URL
- `file_size`: INTEGER — 文件大小(字节)
- `duration`: INTEGER — 录音时长(秒)
- `format`: VARCHAR(20) — 格式(mp3/wav)
- `is_deleted`: CHAR(1) DEFAULT 'n'
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

关联关系：外键关联 calls.id

#### 活动客户关联表（campaign_customers）

用途：关联活动与客户的中间表

核心字段：
- `id`: SERIAL PRIMARY KEY
- `corp_id`: VARCHAR(128) — 企业ID
- `campaign_id`: INTEGER NOT NULL — 活动ID
- `customer_id`: INTEGER NOT NULL — 客户ID
- `call_status`: VARCHAR(50) DEFAULT 'pending' — 该客户在此活动中的呼叫状态
- `call_id`: INTEGER — 关联的通话记录ID
- `is_deleted`: CHAR(1) DEFAULT 'n'
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

关联关系：外键关联 campaigns.id, customers.id, calls.id

---

## 5. API接口协议

### 5.1 统一响应包络

成功：`{ success: true, data: T }`
失败：`{ success: false, error: string }`

### 5.2 接口清单

#### 仪表盘相关

页面路径：/

获取仪表盘数据 @NeedLogin
GET /api/dashboard
Response:
```json
{
  "success": true,
  "data": {
    "kpi": {
      "totalCampaigns": 0,
      "todayCalls": 0,
      "successRate": 0,
      "avgDuration": 0
    },
    "activeCampaigns": [],
    "recentCalls": []
  }
}
```

#### 活动管理相关

页面路径：/campaigns

获取活动列表 @NeedLogin
GET /api/campaigns?status=&page=&pageSize=
Response:
```json
{
  "success": true,
  "data": {
    "list": [{
      "id": 0,
      "name": "",
      "status": "",
      "customerCount": 0,
      "completedCalls": 0,
      "successRate": 0,
      "created_at": ""
    }],
    "total": 0
  }
}
```

创建活动 @NeedLogin
POST /api/campaigns
Request Body:
```json
{
  "name": "",
  "description": "",
  "voice_agent_id": 0,
  "language": "",
  "time_window_start": "",
  "time_window_end": "",
  "max_retry_attempts": 3,
  "calls_per_minute": 60,
  "caller_id": "",
  "customer_ids": []
}
```

启动活动 @NeedLogin
POST /api/campaigns/:id/start

停止活动 @NeedLogin
POST /api/campaigns/:id/stop

#### 客户数据相关

页面路径：/customers

获取客户列表 @NeedLogin
GET /api/customers?search=&status=&page=&pageSize=

导入客户 @NeedLogin
POST /api/customers/import
Request Body:
```json
{
  "customers": [{
    "name": "",
    "phone": "",
    "order_id": "",
    "order_status": "",
    "delivery_date": "",
    "courier_name": "",
    "tracking_number": "",
    "language": "",
    "city": "",
    "amount": 0,
    "notes": ""
  }]
}
```

验证导入数据 @NeedLogin
POST /api/customers/validate

#### 通话记录相关

页面路径：/calls

获取通话列表 @NeedLogin
GET /api/calls?campaign_id=&status=&page=&pageSize=
Response:
```json
{
  "success": true,
  "data": {
    "list": [{
      "id": 0,
      "customer": { "name": "", "phone": "", "order_id": "" },
      "campaign": { "name": "" },
      "status": "",
      "duration": 0,
      "started_at": "",
      "ai_summary": ""
    }],
    "total": 0
  }
}
```

获取通话详情 @NeedLogin
GET /api/calls/:id
Response:
```json
{
  "success": true,
  "data": {
    "id": 0,
    "customer": {},
    "campaign": {},
    "transcript": "",
    "recording_url": "",
    "ai_summary": "",
    "customer_sentiment": ""
  }
}
```

#### 语音代理相关

页面路径：/voice-agents

获取语音代理列表 @NeedLogin
GET /api/voice-agents

创建语音代理 @NeedLogin
POST /api/voice-agents
Request Body:
```json
{
  "name": "",
  "voice_type": "",
  "language": "",
  "greeting_script": "",
  "main_script": "",
  "faq_responses": {},
  "company_name": ""
}
```

#### 实时监控相关

页面路径：/monitoring

获取实时监控数据 @NeedLogin
GET /api/monitoring/live
Response:
```json
{
  "success": true,
  "data": {
    "activeCalls": 0,
    "waitingQueue": 0,
    "todayStats": {
      "total": 0,
      "completed": 0,
      "failed": 0
    },
    "campaigns": []
  }
}
```

WebSocket实时更新 @NeedLogin
WS /ws/monitoring

#### 报表分析相关

页面路径：/reports

获取活动报表 @NeedLogin
GET /api/reports/campaigns?start_date=&end_date=

导出报表 @NeedLogin
GET /api/reports/export?type=&campaign_id=

---

## 6. 业务组件清单

| 组件名 | 文件路径 | 来源 | 关联页面 | 功能说明 |
|---|---|---|---|---|
| KpiCard | src/components/dashboard/KpiCard.tsx | 自研 | 仪表盘 | KPI数字卡片展示 |
| CampaignStatusBadge | src/components/campaigns/StatusBadge.tsx | 自研 | 活动列表 | 活动状态徽章 |
| CustomerImportModal | src/components/customers/ImportModal.tsx | 自研 | 客户导入 | 文件上传+预览 |
| AudioPlayer | src/components/calls/AudioPlayer.tsx | 自研 | 通话详情 | 录音播放器 |
| LiveCallCard | src/components/monitoring/LiveCallCard.tsx | 自研 | 实时监控 | 实时通话卡片 |
| CampaignProgress | src/components/common/ProgressBar.tsx | 自研 | 活动详情 | 活动进度条 |
| DataTable | src/components/common/DataTable.tsx | 自研 | 通用 | 封装表格组件 |

---

## 7. 迭代变更记录

| 时间 | 变更类型 | 变更内容 | 变更原因 |
|---|---|---|---|
| 2026-06-23 | 初始化 | 首次生成SPEC.md | 用户需求：企业级AI电话外呼系统 |
