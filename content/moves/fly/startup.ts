// 飞翔的凌空载体：借共享身份 world_combat:status/fly，只带身份、行为全在 skill.ts 里。
// 挂在悬停期间，队伍栏与 /effect 能查到；落地时由 skill.ts 主动收回，其余情况按自己的时长自然结束。
StartupEvents.registry("mob_effect", event => event.create("world_combat:fly_airborne")
    .beneficial()
    .color(0xF2E2B0)
    .tag("world_combat:status/fly")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
