# DeepThink - Multi-Agent Reasoning Engine

基于 LangGraph 的多智能体推理引擎，提供 OpenAI 兼容 API，支持第三方 AI 客户端直接调用。

## 特性

- 多专家协作推理（Planner → Experts → Critic → Reviewer → Synthesizer）
- OpenAI 兼容 API（`/v1/chat/completions`、`/v1/models`）
- 支持多种上游 LLM Provider（OpenAI、Anthropic、Google、DeepSeek、xAI、Mistral）
- 极简设置界面（仅 Model/Base URL/API Key + Web Search）
- 高性能流式输出（流式阶段纯文本渲染，完成后 Markdown）
- 实时推理过程可视化（WebSocket）
- 最大 8 轮专家迭代（质量优先）

## 架构

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Third-party   │      │    Frontend     │      │    Backend      │
│   AI Clients    │─────▶│    (React)      │─────▶│   (LangGraph)   │
│  (OpenAI SDK)   │      │    :3000        │      │     :8080       │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                                                 │
         └─────────────────────────────────────────────────┘
                        /v1/chat/completions
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Zmin2003/Prisma.git
cd Prisma
```

### 2. 配置环境变量

在根目录创建 `.env` 文件：

```bash
# 必需配置
ADMIN_API_KEY=your-admin-api-key-here
CREDENTIALS_ENC_KEY=your-32-character-encryption-key!

# 推荐配置
APP_API_KEY=your-app-api-key-here

# 可选：上游 Provider Key
GOOGLE_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=

# 可选：Web 搜索
TAVILY_API_KEY=

# 服务配置
API_HOST=0.0.0.0
API_PORT=8080
CORS_ALLOW_ORIGINS=http://localhost:3000
```

### 3. 启动服务

```bash
docker-compose up -d
```

服务启动后：
- **Web 界面**: http://localhost:3000
- **API 端点**: http://localhost:8080

### 4. 配置（极简设置）

点击右上角 Settings，只需配置：

**Upstream API (OpenAI-compatible)**
- Model: 模型 ID（留空使用后端默认）
- Base URL: API 端点（可选）
- API Key: API 密钥（可选）

**Web Search**
- Enable: 开关
- Provider: auto/tavily/duckduckgo
- Max Results: 搜索结果数

### 5. API 调用

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="YOUR_APP_API_KEY"
)

response = client.chat.completions.create(
    model="your-model-id",
    messages=[{"role": "user", "content": "Hello"}]
)
```

## 性能优化

- 流式输出使用纯文本渲染，完成后再做 Markdown/代码高亮
- 计时器刷新频率 500ms（降低 CPU 占用）
- 生产环境禁用 info/debug 日志
- sessionStorage 批量持久化（2s 间隔）

## API 参考

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/v1/models` | GET | 列出可用模型 |
| `/v1/chat/completions` | POST | 聊天补全 |
| `/ws/chat` | WebSocket | 实时推理状态流 |

## 本地开发

### 后端

```bash
cd deepthink-backend
pip install -e ".[dev]"
python -m deepthink
```

### 前端

```bash
cd deepthink
npm install
npm run dev
```

## 许可证

MIT License
