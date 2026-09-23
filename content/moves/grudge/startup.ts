// 怨念：只借共享身份 world_combat:status/grudge（与怨恨的「怀恨」同一个身份：都读作「身上带着怨」）。
// 真正的偿还（认出致命一击、确认倒下、掏空凶手那一手的 PP）写在本单元的 skill.ts，按本单元的效果 id 判定。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:grudge_watch")
    .harmful()
    .color(0x4B2E83)
    .tag("world_combat:status/grudge")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));

// 偿债印记：致命一击的普通攻击方式在十秒内被封住，可用牛奶解除。
StartupEvents.registry("mob_effect", event => event.create("world_combat:grudge_toll")
    .harmful().color(0x4B2E83).tag("world_combat:status/grudge")
    .tag("world_combat:status/identity_only").effectTick((entity: any, amplifier: number) => { }));
