// 看我嘛的载体：一个真实 MobEffect，对宝可梦、原版生物、玩家是同一个身份 world_combat:status/followme；
// 每隔一会儿把身边的敌人引向自己的行为写在本单元 skill.ts 里（读机读标记 world_combat:follow_me_call）。
// 消费方用 CombatStatus.has(world, actor, "followme") 按身份读取，不依赖这个 id。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:followed").category("neutral").color(0xFF9ECF)
        .tag("world_combat:status/followme").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
