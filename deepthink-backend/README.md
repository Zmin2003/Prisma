# DeepThink Backend

基于 LangGraph 的多智能体推理引擎后端，提供 OpenAI 兼容 API。

## 部署

使用根目录的 docker-compose：

```bash
cd ..
docker-compose up -d
```

API 地址: http://localhost:8080

## 环境变量

参考 `.env.example`，关键配置：

| 变量 | 必需 | 说明 |
|------|------|------|
| `ADMIN_API_KEY` | 是 | 管理接口鉴权 |
| `CREDENTIALS_ENC_KEY` | 是 | 凭据加密密钥（≥32字符） |
| `APP_API_KEY` | 推荐 | 推理接口鉴权 |

## API

### OpenAI 兼容

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_APP_API_KEY" \
  -d '{"model": "deepthink", "messages": [{"role": "user", "content": "Hello"}]}'
```

### 管理接口

```bash
# 创建凭据
curl -X POST http://localhost:8080/admin/credentials \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{"provider": "openai", "name": "OpenAI", "api_key": "sk-..."}'

# 创建模型
curl -X POST http://localhost:8080/admin/models \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{"id": "dt-gpt4", "display_name": "GPT-4", "provider": "openai", "upstream_model": "gpt-4o", "credential_id": "cred_xxx"}'
```

## 架构

```
Planner → Experts → Critic → Reviewer → Synthesizer
              ↑__________________________|
```

## 本地开发

```bash
pip install -e ".[dev]"
python -m deepthink
```

## 测试

```bash
pytest
```
