# 内容与脚本库

[packs.json](packs.json)声明共享库、内容组合及构建配置。独立单元通过自己的 `unit.json` 声明身份、依赖和源码，选集负责选择。单元可以位于任意内容目录；启动注册、客户端、服务端、语言与原生资源按声明和归属装配。

`npm run build:content` 检查每个库与单元的依赖，并构建各组合。`play` 是当前正式内容，客户端入口为 `python tools/input-client.py launch --phase play --confirmed-visible-test`。`core` 与 `base` 提供基础组合，`training-compass` 用于独立饰品验证。

安装到开发实例：`npm run install:demo -- runs/my-test play`。安装后重启实例。开发回归内容位于[tests/content](../tests/content/README.md)，单独构建到 `build/test-content`。

参见[内容创作](../docs/development/content-authoring.md)、[组合约定](../docs/development/content-composition.md)和[共享脚本](../docs/development/script-libraries.md)。
