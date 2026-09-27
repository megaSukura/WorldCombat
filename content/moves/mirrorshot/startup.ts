// 镜光射击的残光载体。
//
// `world_combat:mirrorshot_dazzle` 带共享身份 `world_combat:status/glared`（本单元发明：被镜面闪光晃到）
// 与家族的伞身份 `world_combat:status/aim_impaired`（和闪光、泼沙、烟幕、浊流同一族：打不准），别的作者
// 以后可用 `CombatStatus.has(world, actor, "glared")` 或 `"aim_impaired"` 消费它。不镜像成 Cobblemon 原生异常。
// 原生「有时降低命中」的落点：宝可梦那一层由 skill.ts 用 NativeEffects.boostWindow(..., "accuracy", -n)
// 绑在这个载体上，落到原生命中等级；其他战斗者落到同一套共享命中阶梯。载体结束或清除即收回这一份。
// 不额外挂攻击属性修饰：本招的削弱就是有限期的命中下降。启动脚本不引用服务端库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mirrorshot_dazzle")
    .harmful()
    .color(0xE8F4FF)
    .tag("world_combat:status/glared")
    .tag("world_combat:status/aim_impaired")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
