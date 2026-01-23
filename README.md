# DeepThink - Multi-Agent Reasoning Engine

基于 LangGraph 的多智能体推理引擎，提供 OpenAI 兼容 API，支持第三方 AI 客户端直接调用。

## 特性

- 多专家协作推理（Planner → Experts → Critic → Reviewer → Synthesizer）
- OpenAI 兼容 API（`/v1/chat/completions`、`/v1/models`）
- 支持多种上游 LLM Provider（OpenAI、Anthropic、Google、DeepSeek、xAI、Mistral）
- Web 管理界面配置模型与密钥
- 加密存储上游 API Key（服务端 Fernet 加密）
- 实时推理过程可视化（WebSocket）

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
git clone https://github.com/your-repo/deepthink.git
cd deepthink
```

### 2. 配置环境变量

在根目录创建 `.env` 文件：

```bash
# ============================================
# 必需配置
# ============================================

# 管理员密钥（用于 Web 管理界面操作模型/凭据）
ADMIN_API_KEY=your-admin-api-key-here

# 凭据加密密钥（用于加密存储上游 API Key，至少 32 字符）
CREDENTIALS_ENC_KEY=your-32-character-encryption-key!

# ============================================
# 推荐配置
# ============================================

# 应用访问密钥（第三方客户端调用 /v1/chat/completions 时需要）
# 留空则不启用鉴权（不推荐生产环境）
APP_API_KEY=your-app-api-key-here

# ============================================
# 可选：直接配置上游 Provider Key（传统方式）
# 也可以在 Web 管理界面通过 Credentials 功能配置
# ============================================

GOOGLE_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
XAI_API_KEY=
MISTRAL_API_KEY=

# 可选：自定义 OpenAI 兼容端点
OPENAI_BASE_URL=

# 可选：Tavily API（启用 Web 搜索功能）
TAVILY_API_KEY=

# ============================================
# 服务配置
# ============================================

# 后端服务
API_HOST=0.0.0.0
API_PORT=8080

# CORS（允许的前端域名，逗号分隔）
CORS_ALLOW_ORIGINS=http://localhost:3000

# Base URL 白名单（防止 SSRF，逗号分隔）
BASE_URL_ALLOWLIST=https://api.openai.com,https://api.anthropic.com,https://api.deepseek.com,https://generativelanguage.googleapis.com,https://api.x.ai,https://api.mistral.ai

# 数据持久化目录（Docker 环境）
DATA_DIR=/app/data
```

### 3. 启动服务

```bash
docker-compose up -d
```

服务启动后：
- **Web 管理界面**: http://localhost:3000
- **API 端点**: http://localhost:8080

### 4. 配置模型（Web 管理界面）

1. 打开 http://localhost:3000，点击右上角 Settings
2. 在 **Model Registry** 区块输入 `ADMIN_API_KEY`
3. 创建 Credential（上游 Provider 的 API Key）
4. 创建 Model（绑定 Credential）

### 5. 第三方客户端调用

使用任何 OpenAI 兼容客户端：

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_APP_API_KEY" \
  -d '{
    "model": "your-registered-model-id",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

或使用 OpenAI SDK：

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="YOUR_APP_API_KEY"
)

response = client.chat.completions.create(
    model="your-registered-model-id",
    messages=[{"role": "user", "content": "Hello"}]
)
```

## API 参考

### 公开端点

| 端点 | 方法 | 说明 | 鉴权 |
|------|------|------|------|
| `/health` | GET | 健康检查 | 无 |
| `/v1/models` | GET | 列出可用模型 | APP_API_KEY（可选） |
| `/v1/chat/completions` | POST | 聊天补全（OpenAI 兼容） | APP_API_KEY（可选） |
| `/ws/chat` | WebSocket | 实时推理状态流 | APP_API_KEY（可选） |
| `/deepthink/invoke` | POST | 直接调用 LangGraph | APP_API_KEY（可选） |

### 管理端点（需要 ADMIN_API_KEY）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/admin/credentials` | GET | 列出凭据（密钥脱敏） |
| `/admin/credentials` | POST | 创建凭据 |
| `/admin/credentials/{id}` | PUT | 更新凭据 |
| `/admin/credentials/{id}` | DELETE | 删除凭据（软删除） |
| `/admin/models` | GET | 列出所有模型 |
| `/admin/models` | POST | 创建模型 |
| `/admin/models/{id}` | PUT | 更新模型 |
| `/admin/models/{id}` | DELETE | 删除模型 |

### 请求示例

**创建凭据：**
```bash
curl -X POST http://localhost:8080/admin/credentials \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_API_KEY" \
  -d '{
    "provider": "openai",
    "name": "OpenAI Production",
    "api_key": "sk-..."
  }'
# 返回: {"id": "cred_xxxxx"}
```

**创建模型：**
```bash
curl -X POST http://localhost:8080/admin/models \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_API_KEY" \
  -d '{
    "id": "dt-gpt-4o",
    "display_name": "GPT-4o via DeepThink",
    "provider": "openai",
    "upstream_model": "gpt-4o",
    "credential_id": "cred_xxxxx",
    "enabled": true
  }'
```

## 数据持久化

以下文件存储在 `DATA_DIR`（默认 `/app/data`）：

| 文件 | 说明 |
|------|------|
| `model_registry.json` | 模型注册表 |
| `credentials.json` | 加密的凭据存储 |

**备份建议**：定期备份 `DATA_DIR` 目录及 `CREDENTIALS_ENC_KEY`（密钥丢失将无法解密凭据）。

## 安全说明

1. **上游 API Key 加密存储**：使用 Fernet（AES-128-CBC + HMAC）加密，密钥永不返回明文
2. **SSRF 防护**：`base_url` 经过白名单校验，阻止内网/localhost 访问
3. **双层鉴权**：
   - `ADMIN_API_KEY`：管理操作
   - `APP_API_KEY`：推理调用
4. **CORS 限制**：仅允许配置的 origin 访问管理接口

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

### 测试

```bash
cd deepthink-backend
pytest
```

## 许可证

MIT License
