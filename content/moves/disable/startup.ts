// 定身法的“定身钉”载体：一个真实有害 MobEffect。共享身份是 world_combat:status/disable，
// 消费方用 CombatStatus.has(world, actor, "disable") 按身份读取，不依赖这个 id。
// 行为（被点名的招式不能提交）写在本单元 skill.ts 的共享动作策略里，效果本身不逐刻做什么。
StartupEvents.registry("mob_effect", event => event.create("world_combat:disable_lock")
    .harmful()
    .color(0xE86A3C)
    .tag("world_combat:status/disable")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
