// 万圣夜的幽灵外壳。一个真实的 MobEffect 让宝可梦、原版生物与玩家同样「被套上外壳」。
// 它带共享身份 world_combat:status/trickortreat（消费方用 CombatStatus.has(world, actor, "trickortreat")）。
// 行为写在本单元 skill.ts 里：提交时把目标当前属性加一条 ghost 写进 NativeModifiers 的临时属性层，
// 外壳到期或被解掉时解除该层。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:trick_shell")
    .harmful()
    .color(0xE88A3C)
    .tag("world_combat:status/trickortreat")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
