// 您先请的两个载体：伙伴身上的加速窗口与施法者身上的让手，都是真实 MobEffect。
// 共享身份分别是 world_combat:status/afteryou 与 world_combat:status/afteryou_yield，
// 消费方用 CombatStatus.has(world, actor, "afteryou") 按身份读。真正的加速/减速由本单元 skill.ts
// 的托管效果挂 world_combat:skill_haste 临时修饰，效果结束自动收回。启动脚本不引用服务端共享库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:afteryou_ready")
    .beneficial()
    .color(0x8FE06A)
    .tag("world_combat:status/afteryou")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
StartupEvents.registry("mob_effect", event => event.create("world_combat:afteryou_yield")
    .harmful()
    .color(0x8A93A0)
    .tag("world_combat:status/afteryou_yield")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
