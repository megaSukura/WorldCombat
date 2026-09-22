// 弹跳的凌空载体：借共享身份 world_combat:status/bounce，只带身份、行为全在 skill.ts 里。
// 挂在弹起与悬停期间，队伍栏与 /effect 能查到；落地时由 skill.ts 主动收回，其余情况按自己的时长自然结束。
StartupEvents.registry("mob_effect", event => event.create("world_combat:bounce_airborne")
    .beneficial()
    .color(0xFFD86A)
    .tag("world_combat:status/bounce")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
