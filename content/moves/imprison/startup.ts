// 封印的两个载体：领域源（施法者）与封印印记（被锁的对手）都是真实有害 MobEffect，
// 共用同一个共享身份 world_combat:status/imprison，消费方用 CombatStatus.has(world, actor, "imprison") 按身份读。
// 行为（共有招式不能使用、印记随领域重扫）写在本单元 skill.ts 的共享动作策略里。启动脚本不引用服务端共享库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:imprison_aura")
    .harmful()
    .color(0x6C7BFF)
    .tag("world_combat:status/imprison")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
StartupEvents.registry("mob_effect", event => event.create("world_combat:imprison_sealed")
    .harmful()
    .color(0xCFE8FF)
    .tag("world_combat:status/imprison")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
