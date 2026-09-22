// 同命：命线的身份。真正的偿还（认出致命一击、确认倒下、拖走凶手）写在本单元的 skill.ts，
// 按这个 tag 读到共享身份；别的作者以后也能用 world_combat:status/destiny_bond 消费「命悬一线」。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:destiny_bond")
    .harmful()
    .color(0xC2354B)
    .tag("world_combat:status/destiny_bond")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
