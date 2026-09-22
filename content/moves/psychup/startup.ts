// 自我暗示：一个只承载共享身份 world_combat:status/psychup 的可见标记，告诉玩家与对手“已同调”还剩多久。
// 能力阶梯由 NativeEffects.boost 写入原生等级（其他生物落到 CombatStages），标记只负责读数与 AI 节流。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:psychup_link").beneficial().color(0xC07CFF)
        .tag("world_combat:status/psychup").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
