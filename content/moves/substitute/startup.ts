// 替身：只借共享身份 `world_combat:status/substitute`，行为全部由招式自己写。
// beneficial 且不修改任何属性（保护靠 redirect 与替身身体，不靠属性修饰）。
StartupEvents.registry("mob_effect", event => event.create("world_combat:substitute")
    .beneficial()
    .color(0x9AA0B0)
    .tag("world_combat:status/substitute")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
