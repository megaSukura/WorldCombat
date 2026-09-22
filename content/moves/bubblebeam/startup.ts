// 泡沫光线的泡沫载体。
//
// `world_combat:bubblebeam_foam` 带共享身份 `world_combat:status/foamed`——这是本单元发明的概念：
// 「身上黏着一层泡沫」。别的作者以后用 `CombatStatus.has(world, actor, "foamed")` 就能读它（例如设计一记
// 「拍掉泡沫、造成额外伤害」的招）。带 `world_combat:status/identity_only`：只借身份，行为由本单元写。
// 原生「有时降低速度」的落点是能力等级（skill.ts 里 NativeEffects.boost 掉速度），这个效果只负责
// 「被泡沫黏住」这件看得见、读得到的事；不镜像成 Cobblemon 原生异常。
StartupEvents.registry("mob_effect", event => event.create("world_combat:bubblebeam_foam")
    .harmful()
    .color(0x8FE0F0)
    .tag("world_combat:status/foamed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
