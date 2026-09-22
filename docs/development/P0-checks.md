# P0 检查记录

**2026-09-13：P0 工程基线完成。** 招式工作按审阅意见采用轻量快照；P1 开始接入即时战斗执行。

| 检查 | 实际结果 |
| --- | --- |
| 构建 | JDK 21.0.5、Gradle 9.2.1 下构建成功，两个独立 jar 已输出到 `dist/`；固定版本及相关依赖锁已保存 |
| 核心专服 | 仅核心与通用前置完成启动，收到核心服务端启动记录；`stop` 后保存世界并正常退出 |
| 完整组合专服 | 核心、Cobblemon、Kotlin 适配及全部前置完成启动；确认领域类型可加载，`stop` 后正常退出 |
| 核心客户端 | 公共及客户端初始化完成，加载检查结束后关闭测试进程 |
| 完整组合客户端 | 修正 Kotlin 对象订阅器的静态回调问题后，公共及客户端初始化完成，加载检查结束后关闭测试进程 |
| 缺失依赖 | 分别移除核心和 Cobblemon，加载器均明确指出缺少所需 Mod 并拒绝加载 |
| 版本不匹配 | 用独立复制的测试 jar 将核心版本改为 `0.0.0-p0-fixture`，加载器明确报告适配需要 `0.1.0-dev` |
| 配置与产物 | TOML 语法、两个 jar 的身份和依赖声明、核心产物边界、文档链接及改动格式检查通过 |
| 招式与接入 | 源数据快照 931 项；实机注册日志为 936 项，差异随内容接入核对。P1 的关键接入选择及原型配置已保存 |

启动检查使用 Gradle 生成的开发配置与实际编译输出，在独立运行目录执行。正常加载日志未出现 ERROR／FATAL；客户端检查确认加载，操作手感、可读性和玩法由 P2 人工试玩判断。原始日志及本轮临时启动描述保存在本地 `build/p0-checks/`，依赖错误按具体的 `ModLoadingException` 判定。

版本配置见 [dependencies.toml](../../manifests/dependencies.toml)。已核对的发行依据：

- [Cobblemon 官方发行记录](https://modrinth.com/mod/cobblemon/version/2oL01rSF)与[官方 Maven 元数据](https://maven.impactdev.net/repository/development/com/cobblemon/neoforge/1.8.0+1.21.1/neoforge-1.8.0+1.21.1.pom)对应源码 tag 1.8.0。
- [KubeJS 官方 Maven](https://maven.latvian.dev/releases/dev/latvian/mods/kubejs-neoforge/2101.7.2-build.377/)的发行声明要求 NeoForge 至少 21.1.199、Rhino 至少 2101.2.7-build.81；当前组合已通过两端加载。
- [NeoForge 官方 MDK](https://github.com/NeoForgeMDKs/MDK-1.21.1-ModDevGradle)提供当前加载器、构建插件和 Wrapper 的参考组合。
- [Kotlin for Forge Maven](https://thedarkcolour.github.io/KotlinForForge/thedarkcolour/kotlinforforge-neoforge/5.12.0/kotlinforforge-neoforge-5.12.0.pom)提供 Kotlin 2.4.0 运行库，本项目适配编译器与之对齐；与使用 Kotlin 2.2.20 编译的 Cobblemon 本版已共同完成加载。

构建及启动方法见[开发说明](getting-started.md)。P1 优先实现[统一旧入口封锁、个体绑定和一次结算](../architecture/cobblemon-integration.md)，再串起脚本动作与收回清理。本轮原型参数为后续实现的参考配置。
