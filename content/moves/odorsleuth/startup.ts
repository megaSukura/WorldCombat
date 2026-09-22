// 气味侦测的印记。一个真实的 MobEffect 让宝可梦、原版生物与玩家同样「被气味咬住」。
// 它借共享身份 world_combat:status/foresight（与识破共用，消费方用 CombatStatus.has(world, actor, "foresight")），
// 另带世界效果身份 world_combat:status/odorsleuth 与伞身份 world_combat:status/identified；
// 行为写在本单元 skill.ts 里：提交时照亮目标、拔掉它的正闪避，world_combat:navigate 读取印记按 drag 拖慢它，
// PokemonDamage.metadata 结算前把 ghost 摘掉。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:odorsleuth_mark")
    .harmful()
    .color(0xE8D08A)
    .tag("world_combat:status/foresight")
    .tag("world_combat:status/odorsleuth")
    .tag("world_combat:status/identified")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
