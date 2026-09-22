// 粉尘的载体：一个真实的有害 MobEffect，宝可梦、原版生物与玩家是同一个身份 world_combat:status/powdered。
// 粉尘是否被火招引爆写在 skill.ts 的 committed 反应里；这个效果只负责物品栏可见、AI 可读与贴附画面。
// 草属性由 skill.ts 在施加前直接跳过（原生粉末免疫）。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:powdered_dust")
    .harmful()
    .color(0xE8D9A0)
    .tag("world_combat:status/powdered")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
