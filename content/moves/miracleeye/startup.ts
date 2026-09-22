// 奇迹之眼的心眼印记。一个真实的 MobEffect 让宝可梦、原版生物与玩家同样「被心眼照出」。
// 它带共享身份 world_combat:status/miracleeye（消费方用 CombatStatus.has(world, actor, "miracleeye")）与伞身份
// world_combat:status/identified；行为写在本单元 skill.ts 里：提交时照亮目标、拔掉它的正闪避、抬施法者命中，
// PokemonDamage.metadata 在伤害结算前读这层身份把 dark 摘掉。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:miracleeye_mark")
    .harmful()
    .color(0xB07CE8)
    .tag("world_combat:status/miracleeye")
    .tag("world_combat:status/identified")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
