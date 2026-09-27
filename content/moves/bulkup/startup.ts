// 绷紧：一个真实有益 MobEffect，对宝可梦、原版生物、玩家是同一个身份 world_combat:status/bulkup。
// 物攻与防御等级挂在这条 surge 载体拥有的临时窗口上；载体到期、被清除或被刷新时，
// 窗口随它一起收回本次实际贡献，不再另存 mark。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:bulkup_surge")
    .beneficial()
    .color(0xE0603C)
    .tag("world_combat:status/bulkup")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
