// 凯旋：一段可见的窗口状态，只承载共享身份 world_combat:status/victorydance。
// 攻击、防御、速度等级本身由 NativeEffects.boost 写入公共能力阶梯；窗口走完时由本单元 skill.ts 从移除事件里原样收回。
// 窗口会在舞者每次命中敌人时延长（有上限），这是这招独有的「唤来胜利」。启动脚本不引用服务端共享库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:victorydance_crown")
    .beneficial()
    .color(0xFFD75A)
    .tag("world_combat:status/victorydance")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
