// 磁铁炸弹的载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/magnetbomb；它给「钢弹吸在身上、引信在走」这件事一个物品栏可见、/effect 可查的身份。
// 每枚钢弹的引信与爆炸由本单元 skill.ts 的 world_combat:magnet_bomb_mark 持有；
// 清掉印记不会拆掉已经吸住的炸弹。消费方用 CombatStatus.has(world, actor, "magnetbomb") 按身份读取。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:magnet_bomb").harmful().color(0x9AA4AE)
        .tag("world_combat:status/magnetbomb").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
