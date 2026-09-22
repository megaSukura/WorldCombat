// 泡沫的泡泡载体。
//
// `world_combat:bubble_suds` 带共享身份 `world_combat:status/sudsy`（本单元发明：满身泡泡、脚底打滑）。
// 别的作者以后用 `CombatStatus.has(world, actor, "sudsy")` 就能读它。效果只借身份、不加属性修饰：
// 原生「有时降低速度」的落点由 skill.ts 用 NativeEffects.boost(..., "spe", -n) 落到共享速度等级
// （宝可梦原生速度等级，其他战斗者移动速度属性），这里不再重复扣速。不镜像成 Cobblemon 原生异常。
StartupEvents.registry("mob_effect", event => event.create("world_combat:bubble_suds")
    .harmful()
    .color(0xBFEFFF)
    .tag("world_combat:status/sudsy")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
