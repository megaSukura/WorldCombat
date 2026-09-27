/**
 * 延后 / quash 的“压制”状态。
 *
 * 本单元自己的变体：带共享身份 `world_combat:status/quash` 与 identity_only，行为全由本单元写
 * （提交前拦下第一次出手、配合命中时的降速级数）。它不会自动镜像成 Cobblemon 原生异常——
 * 原作靠回合先后表达“行动最后”，即时战斗里没有对应的原生状态，所以宝可梦身上只带这一层压制。
 * 消费方用 `CombatStatus.has(world, actor, "quash")` 读。
 *
 * 载体只当计数与身份：amplifier 是剩余可拒绝次数，本身不带属性修饰。Minecraft 会把效果自身的属性修饰
 * 乘 amplifier+1，若把减速挂在它上面，1–3 次会变成 -60%/-90%/归零；因此减速固定 -30%，由 skill.ts 的
 * `MobEffects.fixedAttributes` 按载体存在与否单独投影，不随次数放大。
 */
StartupEvents.registry("mob_effect", event => event.create("world_combat:quash")
    .harmful()
    .color(0x6A4FA8)
    .tag("world_combat:status/quash")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行；减速不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
