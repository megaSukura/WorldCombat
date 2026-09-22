// 气场之翼的余韵载体。
//
// `world_combat:esperwing_aura` 带共享身份 `world_combat:status/esperwing`：别的单元以后可以按身份消费它。
// 带 `world_combat:status/identity_only`：只借身份，行为全由本单元读写——提速等级由 NativeEffects.boost
// 写入公共能力阶梯，这个窗口只是「刚振过翅」的可见读法，也是 AI 不重复施放的判据。
// 不镜像成 Cobblemon 原生异常；它不是一个异常状态，只是气场余韵。
StartupEvents.registry("mob_effect", event => event.create("world_combat:esperwing_aura")
    .beneficial()
    .color(0xE8A8F0)
    .tag("world_combat:status/esperwing")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
