# dsh-bilibili-upload

把视频从 DSH 上传/编辑到 B 站，底层用 [biliup](https://github.com/biliup/biliup) CLI。

## 前提

1. 安装 biliup（Windows 用 `biliupR-*-x86_64-windows.zip`，解压即用）
2. 在 biliup 目录运行一次 `biliup login`，手机扫码登录（生成 `cookies.json`）
3. 在插件配置里填 `biliupPath`（biliup 可执行文件路径），或设置 `BILIUP_PATH` 环境变量

## 工具

### `bili_upload`

| 参数 | 说明 |
|---|---|
| `video` | 视频绝对路径（必填） |
| `title` | 标题（必填，约 80 字内） |
| `desc` | 简介 |
| `tags` | 标签数组，默认用配置 |
| `cover` | 封面图绝对路径（4:3 或 16:9） |
| `tid` | 分区，默认 188（科技→计算机技术） |
| `submit` | 提交接口，默认 **web**（分区映射更准；app 会映射成 21） |
| `onlySelf` | `true`（默认）= 仅自己可见；`false` = 公开 |
| `dryRun` | 只回显命令，不上传 |

### `bili_edit`

改已上传稿件的标题/分区/标签/简介/可见性（走 B 站官方编辑接口，需要本机 cookies）。

- 审核中（state -50）会拒绝并提示稍后重试
- 改完自动回读状态

### `bili_check`

检查 biliup 路径、登录 cookie；可选传 BV 号看稿件。

## 面板

设置 → 插件 → **B 站上传**：填视频/标题/简介/标签/封面/分区，勾选可见性，一键上传；下方可改已有 BV 的标题/可见性。

路由：`/bili-upload/state`、`/bili-upload/upload`、`/bili-upload/edit`。

## 配置

```yaml
- id: bili-upload
  name: dsh-bilibili-upload
  config:
    biliupPath: 'C:\path\to\biliup.exe'
    defaultTid: 188
    defaultTags: [DeepSeek Harness, DSH, 插件]
    defaultOnlySelf: true
    defaultSubmit: web
```

## 安全

- cookie 只存本机（biliup 目录），不进仓库
- 默认仅自己可见，避免误公开
- 只用于你自己的账号，遵守 B 站投稿规范
