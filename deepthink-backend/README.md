# DeepThink Backend

基于 LangGraph 的多智能体推理引擎后端。

## 部署

使用根目录的 docker-compose：

```bash
cd ..
docker-compose up -d
```

API 地址: http://localhost:8080

## API

OpenAI 兼容:

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "deepthink", "messages": [{"role": "user", "content": "Hello"}]}'
```

## 架构

```
Planner → Experts → Critic → Reviewer → Synthesizer
              ↑__________________________|
```
