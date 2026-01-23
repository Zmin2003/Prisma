# DeepThink Frontend

React + Vite 前端，多智能体推理可视化界面。

## 特性

- 极简设置（仅 Model/Base URL/API Key + Web Search）
- 高性能流式输出（纯文本渲染，完成后 Markdown）
- 实时推理过程可视化（专家卡片、计时器）
- 主题切换（Light/Dark/System）
- 会话管理（本地存储）

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 部署

使用根目录的 docker-compose：

```bash
cd ..
docker-compose up -d
```

访问 http://localhost:3000

## 配置

通过环境变量配置后端地址（可选）：

```bash
VITE_BACKEND_URL=http://localhost:8080
```

## 性能优化

- 流式阶段使用纯文本，避免重复 Markdown 解析
- 计时器刷新频率 500ms
- 生产环境禁用 info/debug 日志
- sessionStorage 批量持久化
