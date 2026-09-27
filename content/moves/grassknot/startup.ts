// 打草结的缠绊载体：借共享身份 world_combat:status/tripped，行为（短 root、临时掉速窗口）由 skill.ts 通过世界入口施加。
// 掉速不写死在效果属性里，避免再次与自带移速修饰相乘；总减速按本招自己的 tripStages 公开计算、到期归还。
StartupEvents.registry("mob_effect", event => event.create("world_combat:grassknot_snare")
    .harmful()
    .color(0x6FA34A)
    .tag("world_combat:status/tripped")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
