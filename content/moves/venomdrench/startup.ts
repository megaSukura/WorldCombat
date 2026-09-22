// 被淋透：毒液陷阱的印记，只承载共享身份 world_combat:status/drenched。
// 三项能力等级本身由 NativeEffects.boost 写入公共能力阶梯，由本单元 skill.ts 在泼中时结算；
// 这个印记只负责「这个人刚被毒液黏过」的可见身份与图标，别的作者以后可以用同一个 tag 消费。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:venomdrench_drench")
    .harmful()
    .color(0x9A5CC8)
    .tag("world_combat:status/drenched")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
