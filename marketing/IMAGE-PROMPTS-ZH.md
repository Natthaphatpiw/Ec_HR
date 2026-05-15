# EC AIHR — 营销图片提示词(中文)

适用于 Facebook 广告、微信视频号、小红书、领英、LINE OA 的图片提示词库。
**每张图都包含图内文字(in-image typography)**,让观众在 10 秒内回答 5 个问题:

1. 这是什么 SaaS? 2. 解决什么问题? 3. 用了之后哪里更好? 4. 系统长什么样? 5. 下一步该做什么?

---

## 核心规则

| 项目 | 规则 |
|---|---|
| 图内语言 | 简体中文(可附小号英文标签) |
| 字体 | Sans-serif。标题 semi-bold,正文 regular |
| 禁止 | 任何 emoji、卡通风、过度渐变、俗套素材 |
| 品牌色 | 深蓝 `#0F172A`、橙色 `#FB923C`、白色 `#FFFFFF`、翠绿 `#059669` |
| 比例 | 1:1(1080×1080)、4:5(1080×1350)、9:16(1080×1920)、16:9(1920×1080) |
| 标题字数 | ≤ 12 字,2 秒可读 |
| 副标题 | 1–2 行,简短解释功能/收益,要有"哇"的瞬间 |
| 推荐工具 | **Ideogram 2.0** 或 **DALL·E 3**(中文字体渲染最准),其次 Midjourney v6+、Flux 1.1 Pro |

> 关键:选择字体渲染能力强的模型。Ideogram + DALL·E 3 渲染中文方块字
> 远比 Midjourney 清晰准确。

---

## 模板 A — 产品截图 + 大结论(最常用)

### 组合结构(每个提示词都套这个布局)

```
[顶部 18%]   主标题(≤12 字) + 小橙色品类标签
[中部 60%]   手机/截图 mockup 为主角,居中放
[环绕 mockup]  3 个功能 callout 卡片,用细橙色虚线连接到手机
[底部 15%]   CTA 胶囊按钮 + 小标语 + URL
[角落]       "EC AIHR" 品牌标 + 极小字"Powered by LINE OA"
```

### A1 — 首页广告:"请假、加班、打卡 — 全在 LINE 里"

```
A premium B2B SaaS marketing graphic in the style of Pipedrive / Notion /
Linear product ads. 1080×1080 square format.

LAYOUT (top to bottom):
- TOP BAND (18%): Clean white background. Render this Simplified Chinese
  headline in BOLD large sans-serif (PingFang SC or Source Han Sans),
  color navy #0F172A, perfectly legible Chinese characters:
    "请假、加班、打卡 — 全在 LINE 里"
  Above the headline, a small orange pill chip with white text:
    "HR SaaS · 运行于 LINE"

- MIDDLE 60%: Center a photorealistic iPhone mockup tilted 5° right,
  showing a LIFF leave-request form (navy header, orange submit
  button, Simplified Chinese labels). Soft realistic shadow under it.

- AROUND THE PHONE: Three callout cards, each connected to the phone
  with a thin orange dashed line.
    Top-left card (small line-art clock icon):
      "30 秒提交"
    Right card (small thumbs-up outline):
      "主管在 LINE 一键批准"
    Bottom-left card (small sparkle icon):
      "AI 24 小时回答 HR 问题"

- BOTTOM (15%): A solid orange pill button with white text:
    "免费试用 30 天"
  Below in small navy text: "无需下载 App · 5 分钟上线"
  Bottom-right corner: small navy text "EC AIHR".

STYLE: Clean, minimal, premium B2B SaaS. Strict palette: navy #0F172A,
orange #FB923C, white. NO EMOJI, NO PEOPLE. Render all Simplified Chinese
characters with perfect strokes — absolutely no garbled or mismatched
characters. 8K, sharp focus.
```

**配文:**
> 还在用 Excel 和私人微信群追踪员工请假吗?
> EC AIHR 把整套 HR 流程搬进团队天天打开的 LINE。
> 请假、加班、打卡、工资条、排班 + AI 助手 — 每月 $100 起。
> 30 天免费试用,无需绑卡。

---

## 模板 B — 前后对比分屏

### B1 — "告别 Excel 混乱,迎接清晰"

```
A high-conversion SaaS Facebook ad, 1200×628 horizontal format.

LAYOUT:
- TOP BAND (15%): Center-aligned Simplified Chinese headline in bold
  navy: "告别 Excel 混乱,迎接清晰"
  Below in smaller gray text: "好系统、易流程 — 轻轻一点,搞定"

- MIDDLE 70%: Vertical split into two equal halves divided by a thin
  vertical orange line.

  LEFT HALF — labeled "之前" in a small red pill at top-left:
  Top-down photograph of a chaotic desk: scattered Chinese Excel
  printouts stacked unevenly, sticky notes with handwritten Chinese
  (请假/加班/迟到), an old paper attendance log, a coffee stain.
  Desaturated colors, slight yellow tint.

  RIGHT HALF — labeled "之后" in a small emerald pill at top-left:
  Clean white desk with ONE smartphone showing a LIFF dashboard
  (navy header, orange KPI cards). Beside the phone: a small succulent
  plant and a single white coffee cup. Bright, organized, full color,
  soft natural light.

- BOTTOM (15%): Orange pill button "观看 60 秒演示 →" + tiny gray text
  "linforgehr.com · 每月 $100 起 · 免费试用 30 天"

STYLE: Strong visual contrast left vs right. Photorealistic both sides.
NO EMOJI, NO PEOPLE. All Simplified Chinese text rendered perfectly,
sharp characters. 8K.
```

---

## 模板 C — 三步流程

### C1 — "三步上线"

```
A clean infographic-style SaaS marketing image, 1080×1350 portrait.

LAYOUT:
- TOP 12%: Simplified Chinese headline centered: "三步上线 — 5 分钟完成"
  Color navy. Below in tiny gray: "无需下载 App · 无需培训"

- MIDDLE 70%: Three vertical step blocks separated by thin orange arrows.

  STEP 1 — circular icon (monoline QR code, orange stroke) + Chinese:
    "1. 扫码加 LINE 公众号"
    Sub: "员工打开 LINE 扫码一次即可"

  STEP 2 — circular icon (monoline chat + sparkle, orange stroke):
    "2. LIFF 内填表"
    Sub: "姓名、部门、岗位、证件照 — 4 步,90 秒"

  STEP 3 — circular icon (monoline check + factory, orange stroke):
    "3. HR 审核 → 立即可用"
    Sub: "员工在 LINE 收到确认卡"

- BOTTOM 18%: A small phone mockup peeking from bottom-right showing
  the registration success screen. Orange pill button "邀请团队入驻 →"
  + tiny navy text "support@linforgehr.com"

STYLE: Editorial infographic. Background: warm cream-white #FAFAF7.
Icons: monoline orange #FB923C strokes. Text in navy. NO EMOJI, NO
PEOPLE. All Simplified Chinese text rendered with correct strokes. 8K.
```

---

## 模板 D — 数据驱动

### D1 — "HR 文书工作减少 70%"

```
A bold typographic "metric hero" SaaS ad, 1080×1080 square.

LAYOUT:
- HERO CENTER: A MASSIVE orange number "70%" in a custom serif/display
  font, taking up 40% of canvas height, color #FB923C with subtle
  inner shadow.
- Above the number: a small orange pill chip "真实客户成效"
- Below the number (in navy): "首月 HR 文书工作减少"
- Around the number: 3 floating proof cards in an arc:
    Top-left:    "请假 → 3 秒提交"      (small phone outline icon)
    Top-right:   "审批 → 一键完成"      (small thumbs-up icon)
    Bottom:      "AI 中英泰三语回答"    (small sparkle icon)
  Each card has a thin navy border, white background.
- BOTTOM 12%: Orange pill button "查看案例研究 →" + tiny gray text
  "汽车零部件工厂 · 120 名员工 · 6 个月跟踪"

STYLE: Bold typographic poster, in the style of Stripe / Linear metric
ads. White background with subtle orange radial glow behind the number.
NO EMOJI, NO PEOPLE. Render all Chinese text with perfect strokes. 8K.
```

---

## 模板 E — 功能卡片(4 格 / 6 格)

### E1 — "6 大功能,1 个 LINE 公众号"

```
A SaaS feature-showcase ad, 1080×1080 square.

LAYOUT:
- TOP 15%: Bold navy Chinese headline: "6 大 HR 功能 — 1 个 LINE 公众号"
  Below in small gray: "无需下载 App,无需新登录,LINE 即用"

- MIDDLE 70%: A 3×2 grid of feature cards. Each card: white background,
  thin navy-100 border, soft shadow. Each contains a monoline orange
  icon (40px), a bold Chinese label, and a one-line gray sub-text:

    Card 1: icon "calendar-clock" — "请假申请"   / "实时查看剩余额度"
    Card 2: icon "timer"          — "加班申请"   / "自动计算加班费"
    Card 3: icon "receipt"        — "工资条"     / "可查每月历史"
    Card 4: icon "calendar-grid"  — "排班"       / "拖拽式周表"
    Card 5: icon "map-pin"        — "打卡"       / "GPS + IP + 自拍"
    Card 6: icon "sparkles"       — "AI 助手"    / "支持中英泰三语"

- BOTTOM 15%: Orange pill button "查看全部 6 项演示" + tiny text
  "每月 $100 起 · 免费试用 30 天 · linforgehr.com"

STYLE: Notion / Linear feature-page aesthetic. Background: off-white
#F8FAFC. Cards evenly spaced with generous whitespace. NO EMOJI, NO
PEOPLE. Chinese typography crisp and precise. 8K.
```

---

## 模板 F — 人物角色(对号入座)

### F1 — "HR 不该每天回答同样的问题"

```
A persona-driven SaaS ad, 1080×1350 portrait.

LAYOUT:
- TOP 15%: Bold navy Chinese headline:
    "HR 不该每天回答同样的问题。"

- MIDDLE 60%: Composition split.
  LEFT (40%): A stylized monoline portrait of an exhausted East Asian
  female HR officer (early 30s, professional blouse). Around her, 4
  chat-bubble outlines float with Simplified Chinese text inside:
    "我还剩几天年假?"
    "上个月的工资条能补一份吗?"
    "我的加班批了没?"
    "我忘记打卡了怎么办?"
  Drawn entirely in monoline navy strokes on white background.

  RIGHT (60%): A photorealistic phone mockup showing the EC AIHR
  chat screen answering the same questions in Simplified Chinese, with
  a green check badge floating top-right. Soft orange glow halo.

- BOTTOM 25%: Three small benefit pills in a horizontal row:
    "24 小时不间断" · "中英泰三语" · "实时数据"
  Below: orange pill button "让 AI 代为回答 →"

STYLE: Editorial illustration on the left + product photography on the
right. Mood: empathetic but solution-forward. Navy and orange only.
NO EMOJI. Chinese text precise. 8K.
```

---

## 模板 G — 对比表

### G1 — "Excel vs EC AIHR"

```
A SaaS comparison ad, 1080×1080 square, designed like a clean SaaS
landing-page comparison table.

LAYOUT:
- TOP 12%: Bold navy Chinese headline:
    "为什么团队放弃 Excel 选择 EC AIHR"

- MIDDLE 75%: A two-column comparison table with rounded corners.

  LEFT COLUMN — header "Excel / 手工" with small gray X icon, gray BG:
    "手动录入 · 容易出错"
    "无任何提醒"
    "查询历史困难"
    "无审计日志"
    "新员工要重新培训"

  RIGHT COLUMN — header "EC AIHR" with small emerald check icon,
  navy background, white text:
    "LINE 内 30 秒提交"
    "Flex 卡片实时提醒"
    "每个操作都有审计日志"
    "员工都已经会用 LINE"
    "AI 24 小时回答 HR 问题"

  Alternate row shading for readability.

- BOTTOM 13%: Orange pill button "开始 30 天免费试用 →" + tiny text
  "无需绑卡 · 免费迁移 Excel 数据"

STYLE: Linear / Notion comparison-table aesthetic. Crisp, minimal,
typography-forward. NO EMOJI, NO PEOPLE. Chinese text precise. 8K.
```

---

## 高转化主标语(用作图内 headline)

| # | Hook | 表达什么 |
|---|---|---|
| H1 | "请假、加班、打卡 — 全在 LINE 里" | 零摩擦 |
| H2 | "告别 Excel 混乱,迎接清晰" | 痛点解决 |
| H3 | "全套 HR + AI 助手 — 每月 $100 起" | 价格钩子 |
| H4 | "5 分钟上线,零培训成本" | 上手速度 |
| H5 | "懂中文的 HR AI,这才是真懂你" | AI/本地化 |
| H6 | "GPS + IP + 自拍 — 三重防代打" | 反作弊 |
| H7 | "HR 文书工作首月减少 70%" | 数据证明 |
| H8 | "拖拽式排班 — 自己 + 团队都能管" | 排班体验 |
| H9 | "好系统、易流程 — 轻轻一点,搞定" | Slogan |
| H10 | "加 LINE 公众号 — 整套 HR 立即打开" | 入职话术 |

---

## 副标语(必须有"哇"的瞬间)

| # | Sub | 配合 Hook |
|---|---|---|
| S1 | "由 HR 专家 + AI 工程师联合打造,适配东南亚" | H1, H3 |
| S2 | "0 部署费 · 0 培训成本 · 随时取消" | H3, H4 |
| S3 | "Geofence + IP 白名单 + 人脸照片 — 三重锁定,杜绝代打" | H6 |
| S4 | "实时读取数据库 · 3 秒回答任何 HR 问题" | H5 |
| S5 | "工厂、办公室、餐厅通用 · 现场和远程都行" | H1, H2 |
| S6 | "Excel 时间 -80% · 追问请假电话 -95%" | H7 |
| S7 | "30 天免费试用 · 无需绑卡 · 月度账单" | H3 |

---

## CTA 按钮

- **主要**: "免费试用 30 天 →"(橙色背景,白字)
- **次要**: "观看 60 秒演示 →"(透明背景,navy 边框)
- **销售型**: "通过 LINE 联系销售 →"(emerald 背景,白字)
- **紧迫感**: "每月 $100 起 · 年付立省 20%"(白底,navy 字)

---

## 投放节奏

| 周 | 模板 | 主标语 | 目标 |
|---|---|---|---|
| 1 | A(产品 + 结论) | H1 / H3 | 触达 |
| 2 | B(前后对比)   | H2     | 痛点 |
| 3 | D(数据 hero)  | H7     | 转化 |
| 4 | C(三步流程)   | H4 / H10 | 上手说服 |
| 5 | F(人物角色)   | H5     | 决策者 |
| 6 | E(功能网格)   | H8 / H10 | 再营销 |
| 7 | G(对比表)     | H2 / H9 | 收口 |

每 60 天换一组素材,避免广告疲劳。
