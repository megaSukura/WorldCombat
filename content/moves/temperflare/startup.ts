// 豁出去的「自暴自弃」凭据：共享身份 world_combat:status/temperflare。只借身份，行为（带这股劲时这一撞
// 翻倍、命中者被点着）写在本单元 parameters.ts 与 skill.ts；任何内容都能按身份问到「这个人上一次出手打空了」。
StartupEvents.registry("mob_effect", event => event.create("world_combat:temperflare_frustration")
    .beneficial()
    .color(0xE0562A)
    .tag("world_combat:status/temperflare")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
