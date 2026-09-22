// 战吼压下的「气短」标记：只承载共享身份 world_combat:status/cowed，告诉玩家这片人还被吼得发怵。
// 攻击与特攻的等级下降由 NativeEffects.boost 写入公共能力阶梯；标记只负责可读性，别的作者可按身份消费它。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:cowed")
    .harmful()
    .color(0xC98A2B)
    .tag("world_combat:status/cowed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
