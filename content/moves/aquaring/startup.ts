// 水流环的载体：一个真实有益 MobEffect，对宝可梦、原版生物、玩家是同一个身份 world_combat:status/aquaring；
// 逐刻回血的行为写在本单元 skill.ts 里（读机读标记 world_combat:aqua_ring_mark），
// 消费方用 CombatStatus.has(world, actor, "aquaring") 按身份读取，不依赖这个 id。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:aqua_ring").beneficial().color(0x4FC3E8)
        .tag("world_combat:status/aquaring").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
