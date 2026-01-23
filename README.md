# Prisma - DeepThink Multi-Agent Reasoning

基于 LangGraph 的多智能体推理引擎。

## 部署

```bash
docker-compose up -d
```

访问 http://localhost:3000

## 配置

在 Settings 中添加自定义模型，配置 Provider、API Key 和 Base URL。

## 架构

```
┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │
│  (React)    │     │ (LangGraph) │
│  :3000      │     │   :8080     │
└─────────────┘     └─────────────┘
```

## 许可证

MIT License
