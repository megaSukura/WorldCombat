// 共享身份由原生效果保存；body.ts把当前载体投影成有碰撞检查的临时原生scale。
// 双攻等级独立写入公共能力阶梯，体型恢复只释放自己的尺寸贡献。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:grown")
    .beneficial()
    .color(0x6FBF4A)
    .tag("world_combat:status/grown")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
