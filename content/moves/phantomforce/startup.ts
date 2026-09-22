// 潜灵奇袭的灵界载体：借共享身份 world_combat:status/phantomforce，只带身份、行为全在 skill.ts 里。
// 消失在裂隙期间挂在施法者身上，队伍栏与 /effect 能查到；现身那一刻由 skill.ts 主动收回。
StartupEvents.registry("mob_effect", event => event.create("world_combat:phantomforce_veil")
    .beneficial()
    .color(0x6B4FA8)
    .tag("world_combat:status/phantomforce")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
