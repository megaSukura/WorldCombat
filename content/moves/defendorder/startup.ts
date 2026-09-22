// 甲壳：一段可见的窗口，承载共享身份 world_combat:status/defendorder。
// 防御与特防等级写在公共能力阶梯上，但**由活着的甲虫数量决定**：本单元 skill.ts 定期核对（或被清掉时立即核对）
// 有多少手下还活着，按数量增减等级；窗口走完或被清除时召来/收回一整批。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:defendorder_guard")
    .beneficial()
    .color(0xF2C14E)
    .tag("world_combat:status/defendorder")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
