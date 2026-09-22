// 特性互换的对调窗口：一个只承载共享身份 world_combat:status/skillswap 的可见标记，标出「换来的特性还在」的这段时间。
// 真正的特性覆盖由共享 NativeModifiers 的 ability 层承担（skill.ts 提交后写入两侧），标记只负责读数与 AI 节流。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:skillswap_shift").category("neutral").color(0xC24AE8)
        .tag("world_combat:status/skillswap").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
