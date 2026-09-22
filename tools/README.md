# 工程工具

构建使用 Gradle Wrapper；当前脚本负责安装开发示例、导出专服启动描述及执行相关后台检查。用法见 [P1 示例](../docs/development/P1-use.md)与[复查方法](../docs/development/P1-checks.md)。

内容包构建与选择见[内容说明](../content/README.md)，效果协议的专服检查命令见 [P4 检查](../docs/development/P4-checks.md)。

`python tools/native-inventory.py` 读取已导出的完整专服启动依赖和 P4 专服注册结果，更新原生招式、特性及道具参考清单。先按 P4 检查说明生成 `server.json`，并运行 `full --p4-effects`。来源与清单的解释边界见[招式范围](../docs/architecture/move-scope.md)。
