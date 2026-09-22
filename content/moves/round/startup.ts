// 轮唱的「余韵」凭据：共享身份 world_combat:status/round。只借身份，行为（接唱时威力翻倍）写在本单元
// parameters.ts 的公式里；任何内容都能按身份问到「这个人身上正带着轮唱」。
StartupEvents.registry("mob_effect", event => event.create("world_combat:round_carol")
    .beneficial()
    .color(0xE8C86A)
    .tag("world_combat:status/round")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
