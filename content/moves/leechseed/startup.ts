// 寄生种子的载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/leechseed；逐刻抽取的行为写在本单元 skill.ts 里（读机读标记 world_combat:leech_seed_mark），
// 消费方用 CombatStatus.has(world, actor, "leechseed") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:leech_seed").harmful().color(0x6FBF3F)
        .tag("world_combat:status/leechseed").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
