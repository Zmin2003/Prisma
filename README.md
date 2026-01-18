<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Prisma - 深度多智能体推理引擎

基于 **Gemini 3** 的可视化深度多智能体推理引擎，支持动态规划、思维链可视化和多会话管理。

## 🌐 在线体验

- **AI Studio**: https://ai.studio/apps/drive/1JWPILJ3NT10NR4eOeGiqBi6OZuRaEszO

## ⚙️ 本地运行

**环境要求:** Node.js

1. 安装依赖：
   ```bash
   npm install
   ```
2. 配置 API Key - 在 `.env.local` 中设置 `VITE_GEMINI_API_KEY`
3. 启动开发服务器：
   ```bash
   npm run dev
   ```

## 🐳 Docker 部署

```bash
docker-compose up -d
```

---

## 🚀 优化进展 (WFS-prisma-optimization)

### 整体进度：**92% 完成** (12/13 任务)

### ✅ Phase 1: 基础修复 - **完成**

| 任务 | 描述 | 状态 |
| :--- | :--- | :---: |
| IMPL-001 | API 配置架构统一 | ✅ |
| IMPL-002 | API 配置验证机制 | ✅ |
| IMPL-003 | DeepThink 超时控制 | ✅ |
| IMPL-004 | DeepThink 重试机制 | ✅ |
| IMPL-005 | DeepThink 降级策略 | ✅ |
| IMPL-006 | 统一错误服务 | ✅ |
| IMPL-007 | 基础错误 UI | ✅ |

**里程碑：** API 配置成功率 90%+，DeepThink 推理成功率 95%+

### ✅ Phase 2: UX 优化 - **完成**

| 任务 | 描述 | 状态 |
| :--- | :--- | :---: |
| IMPL-008 | 配置向导 | ✅ |
| IMPL-009 | 首次使用引导 | ✅ |
| IMPL-010 | 增强错误处理 UI | ✅ |
| IMPL-011 | DeepThink 可视化增强 | ✅ |

**里程碑：** 配置成功率 95%+，首次使用完成率 90%+

### ⏳ Phase 3: 高级特性 - **50% 完成**

| 任务 | 描述 | 状态 |
| :--- | :--- | :---: |
| IMPL-012 | DeepThink 状态持久化 | ✅ |
| IMPL-013 | 推理历史记录与性能监控 | ⏸️ |

---

### 📊 关键改进

**稳定性提升：**
- 统一的 API 配置架构
- 全面的超时控制 (60s/30s/45s)
- 智能重试机制（指数退避）
- 4 级降级策略

**用户体验：**
- 3 步配置向导
- 交互式功能导览
- 错误边界保护
- Toast 通知系统

**高级功能：**
- 状态持久化与快照管理
- 实时可视化增强
- 超时倒计时显示
- 重试状态指示器

---

## 📄 许可证

MIT License
